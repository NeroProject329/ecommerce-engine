import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ExportQueryInput, ListQueryInput, OrderTransitionInput, ShipmentUpdateInput } from './schemas';
import { cursorPage } from '../platform/pagination';

const allowedTransitions: Record<string, ReadonlySet<string>> = {
  PENDING_PAYMENT: new Set(['PAID', 'PAYMENT_FAILED', 'CANCELED']),
  PAID: new Set(['FULFILLING', 'REFUND_PENDING']),
  FULFILLING: new Set(['SHIPPED', 'CANCELED', 'REFUND_PENDING']),
  SHIPPED: new Set(['DELIVERED', 'REFUND_PENDING']),
  REFUND_PENDING: new Set(['PARTIALLY_REFUNDED', 'REFUNDED']),
  PARTIALLY_REFUNDED: new Set(['REFUNDED']),
};

@Injectable()
export class OperationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async summary(storeId: string) {
    const [products, publishedProducts, orders, pendingOrders, customers, imports, revenue, lowStock] = await Promise.all([
      this.prisma.client.product.count({ where: { storeId } }),
      this.prisma.client.product.count({ where: { storeId, publicationStatus: 'PUBLISHED' } }),
      this.prisma.client.order.count({ where: { storeId } }),
      this.prisma.client.order.count({ where: { storeId, status: { in: ['PENDING_PAYMENT', 'PAID', 'FULFILLING'] } } }),
      this.prisma.client.customer.count({ where: { storeId, status: 'ACTIVE' } }),
      this.prisma.client.importBatch.count({ where: { storeId, status: { in: ['RECEIVED', 'QUEUED', 'PROCESSING', 'RETRYING'] } } }),
      this.prisma.client.order.aggregate({ where: { storeId, status: { in: ['PAID', 'FULFILLING', 'SHIPPED', 'DELIVERED', 'PARTIALLY_REFUNDED'] } }, _sum: { totalCents: true } }),
      this.prisma.client.inventory.count({ where: { storeId, onHand: { lte: 5 } } }),
    ]);
    return { products, publishedProducts, orders, pendingOrders, customers, activeImports: imports, revenueCents: Number(revenue._sum.totalCents ?? 0n), lowStock };
  }

  async orders(storeId: string, query: ListQueryInput) {
    const orders = await this.prisma.client.order.findMany({
      where: { storeId, ...(query.status ? { status: query.status as never } : {}), ...(query.q ? { OR: [{ number: { contains: query.q, mode: 'insensitive' } }, { customer: { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { emailNormalized: { contains: query.q, mode: 'insensitive' } }] } }] } : {}) },
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, number: true, status: true, totalCents: true, currency: true, placedAt: true, customer: { select: { emailNormalized: true, name: true } }, _count: { select: { items: true } } },
    });
    return cursorPage(orders.map((order) => ({ ...order, totalCents: Number(order.totalCents), customer: order.customer ? { email: order.customer.emailNormalized, name: order.customer.name } : null, itemCount: order._count.items, _count: undefined })), query.limit);
  }

  async order(storeId: string, orderId: string): Promise<unknown> {
    const order = await this.prisma.client.order.findFirst({ where: { id: orderId, storeId }, include: { customer: { select: { id: true, name: true, emailNormalized: true } }, items: true, statusHistory: { orderBy: { changedAt: 'asc' } }, shipments: true, payments: { include: { refunds: true } } } });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return {
      ...order,
      subtotalCents: Number(order.subtotalCents), discountCents: Number(order.discountCents), shippingCents: Number(order.shippingCents), totalCents: Number(order.totalCents),
      items: order.items.map((item) => ({ ...item, unitPriceCents: Number(item.unitPriceCents), discountCents: Number(item.discountCents), taxCents: Number(item.taxCents), totalCents: Number(item.totalCents) })),
      shipments: order.shipments.map((shipment) => ({ ...shipment, shippingAmountCents: Number(shipment.shippingAmountCents) })),
      payments: order.payments.map((payment) => ({ ...payment, authorizedCents: Number(payment.authorizedCents), capturedCents: Number(payment.capturedCents), refundedCents: Number(payment.refundedCents), refunds: payment.refunds.map((refund) => ({ ...refund, amountCents: Number(refund.amountCents) })) })),
    };
  }

  async transitionOrder(storeId: string, orderId: string, actorId: string, input: OrderTransitionInput): Promise<unknown> {
    return this.prisma.client.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, storeId } });
      if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
      if (!allowedTransitions[order.status]?.has(input.status)) throw new ConflictException('ORDER_TRANSITION_INVALID');
      const updated = await tx.order.update({ where: { id: order.id }, data: { status: input.status } });
      await tx.orderStatusHistory.create({ data: { storeId, orderId, fromStatus: order.status, toStatus: input.status, actorType: 'ADMIN', actorId, reason: input.reason ?? null } });
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'order.status.changed', objectType: 'Order', objectId: orderId, diffRedactedJson: { from: order.status, to: input.status, reason: input.reason ?? null } } });
      await tx.outboxEvent.create({ data: { storeId, aggregateType: 'Order', aggregateId: orderId, eventType: 'order.status.changed', payloadJson: { orderId, from: order.status, to: input.status } } });
      return { id: updated.id, number: updated.number, status: updated.status, updatedAt: updated.updatedAt };
    });
  }

  async customers(storeId: string, query: ListQueryInput): Promise<unknown> {
    const customers = await this.prisma.client.customer.findMany({
      where: { storeId, ...(query.status ? { status: query.status as 'ACTIVE' | 'BLOCKED' | 'ANONYMIZED' } : {}), ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { emailNormalized: { contains: query.q, mode: 'insensitive' } }] } : {}) },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, emailNormalized: true, name: true, status: true, createdAt: true, updatedAt: true, _count: { select: { orders: true, addresses: true } } },
    });
    const hasMore = customers.length > query.limit;
    const data = customers.slice(0, query.limit).map((customer) => ({ ...customer, email: customer.emailNormalized, emailNormalized: undefined, orderCount: customer._count.orders, addressCount: customer._count.addresses, _count: undefined }));
    return { items: data, nextCursor: hasMore ? data.at(-1)?.id ?? null : null, hasMore };
  }

  async customer(storeId: string, customerId: string): Promise<unknown> {
    const customer = await this.prisma.client.customer.findFirst({
      where: { id: customerId, storeId },
      select: {
        id: true,
        name: true,
        emailNormalized: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        addresses: { orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] },
        consentRecords: { orderBy: { recordedAt: 'desc' } },
        orders: {
          orderBy: { placedAt: 'desc' },
          take: 25,
          select: { id: true, number: true, status: true, totalCents: true, currency: true, placedAt: true },
        },
        _count: { select: { favorites: true, orders: true, addresses: true } },
      },
    });
    if (!customer) throw new NotFoundException('CUSTOMER_NOT_FOUND');
    return {
      ...customer,
      email: customer.emailNormalized,
      emailNormalized: undefined,
      orders: customer.orders.map((order) => ({ ...order, totalCents: Number(order.totalCents) })),
      favoriteCount: customer._count.favorites,
      orderCount: customer._count.orders,
      addressCount: customer._count.addresses,
      _count: undefined,
    };
  }

  async exportCustomers(storeId: string, query: ExportQueryInput): Promise<{ filename: string; contentType: string; content: string }> {
    const store = await this.prisma.client.store.findUnique({ where: { id: storeId }, select: { slug: true, displayName: true } });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    const customers = await this.prisma.client.customer.findMany({ where: { storeId, ...(query.customerId ? { id: query.customerId } : {}) }, orderBy: { createdAt: 'asc' }, select: { id: true, name: true, emailNormalized: true, status: true, createdAt: true, updatedAt: true, addresses: true, consentRecords: { orderBy: { recordedAt: 'asc' } }, orders: { orderBy: { placedAt: 'asc' }, select: { id: true, number: true, status: true, totalCents: true, currency: true, placedAt: true } } } });
    const data = customers.map((customer) => ({ ...customer, email: customer.emailNormalized, emailNormalized: undefined, orders: customer.orders.map((order) => ({ ...order, totalCents: Number(order.totalCents) })) }));
    const date = new Date().toISOString().slice(0, 10);
    if (query.format === 'json') return { filename: `${store.slug}-clientes-${date}.json`, contentType: 'application/json; charset=utf-8', content: JSON.stringify({ exportedAt: new Date().toISOString(), store, customers: data }, null, 2) };
    const lines = [`# Exportação de clientes — ${store.displayName}`, '', `Gerado em: ${new Date().toISOString()}`, ''];
    for (const customer of data) { lines.push(`## ${customer.name}`, '', `- ID: ${customer.id}`, `- E-mail: ${customer.email}`, `- Status: ${customer.status}`, `- Pedidos: ${customer.orders.length}`, `- Endereços: ${customer.addresses.length}`, ''); }
    return { filename: `${store.slug}-clientes-${date}.md`, contentType: 'text/markdown; charset=utf-8', content: lines.join('\n') };
  }

  async shipments(storeId: string, query: ListQueryInput): Promise<unknown> {
    const items = await this.prisma.client.shipment.findMany({ where: { storeId, ...(query.status ? { status: query.status as 'PENDING' | 'READY' | 'SHIPPED' | 'DELIVERED' | 'CANCELED' } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: { order: { select: { number: true, status: true, addressSnapshotJson: true, customer: { select: { name: true, emailNormalized: true } } } } } });
    const hasMore = items.length > query.limit; const page = items.slice(0, query.limit).map((item) => ({ ...item, shippingAmountCents: Number(item.shippingAmountCents) }));
    return { items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null, hasMore };
  }

  async updateShipment(storeId: string, shipmentId: string, actorId: string, input: ShipmentUpdateInput): Promise<unknown> {
    return this.prisma.client.$transaction(async (tx) => {
      const shipment = await tx.shipment.findFirst({ where: { id: shipmentId, storeId } }); if (!shipment) throw new NotFoundException('SHIPMENT_NOT_FOUND');
      const data = Object.fromEntries(Object.entries({ ...input, ...(input.status === 'SHIPPED' ? { shippedAt: shipment.shippedAt ?? new Date() } : {}), ...(input.status === 'DELIVERED' ? { deliveredAt: shipment.deliveredAt ?? new Date() } : {}) }).filter(([, value]) => value !== undefined));
      const updated = await tx.shipment.update({ where: { id: shipment.id }, data });
      if (input.status === 'SHIPPED' || input.status === 'DELIVERED') { const order = await tx.order.findUnique({ where: { id: shipment.orderId } }); if (order && order.status !== input.status) { await tx.order.update({ where: { id: order.id }, data: { status: input.status } }); await tx.orderStatusHistory.create({ data: { storeId, orderId: order.id, fromStatus: order.status, toStatus: input.status, actorType: 'ADMIN', actorId } }); } }
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'shipment.updated', objectType: 'Shipment', objectId: shipment.id, diffRedactedJson: { changedFields: Object.keys(input) } } });
      await tx.outboxEvent.create({ data: { storeId, aggregateType: 'Shipment', aggregateId: shipment.id, eventType: input.status === 'SHIPPED' ? 'order.shipped' : input.status === 'DELIVERED' ? 'order.delivered' : 'shipment.updated', payloadJson: { shipmentId: shipment.id, orderId: shipment.orderId, status: input.status ?? shipment.status, trackingCode: input.trackingCode ?? shipment.trackingCode } } });
      return { ...updated, shippingAmountCents: Number(updated.shippingAmountCents) };
    });
  }

  async bulkUpdateShipments(storeId: string, ids: string[], actorId: string, input: ShipmentUpdateInput): Promise<unknown> { const results = []; for (const id of ids) results.push(await this.updateShipment(storeId, id, actorId, input)); return results; }

  async imports(storeId: string, query: ListQueryInput) {
    const items = await this.prisma.client.importBatch.findMany({
      where: { storeId, ...(query.status ? { status: query.status as never } : {}), ...(query.q ? { externalBatchId: { contains: query.q, mode: 'insensitive' } } : {}) }, orderBy: [{ submittedAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, externalBatchId: true, status: true, total: true, processed: true, failed: true, submittedAt: true, completedAt: true, source: { select: { code: true, name: true } } },
    });
    return cursorPage(items, query.limit);
  }

  async audit(storeId: string, query: ListQueryInput): Promise<unknown> {
    const items = await this.prisma.client.auditLog.findMany({
      where: { storeId, ...(query.q ? { OR: [{ action: { contains: query.q, mode: 'insensitive' } }, { objectType: { contains: query.q, mode: 'insensitive' } }, { objectId: { contains: query.q, mode: 'insensitive' } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: { id: true, actorType: true, actorId: true, action: true, objectType: true, objectId: true, diffRedactedJson: true, createdAt: true },
    });
    return cursorPage(items, query.limit);
  }
}
