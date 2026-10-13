import { ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { PrismaService } from '../prisma.service';
import type {
  CancelOrderInput,
  CreateAddressInput,
  FavoriteInput,
  UpdateAddressInput,
  UpdateProfileInput,
} from './schemas';
import { cursorPage, type CursorPage, type PaginationInput } from '../platform/pagination';

type CustomerContext = { customerId: string; storeId: string };

function serializeOrder<
  T extends {
    subtotalCents: bigint;
    discountCents: bigint;
    shippingCents: bigint;
    taxCents: bigint;
    totalCents: bigint;
    items?: Array<{
      unitPriceCents: bigint;
      discountCents: bigint;
      taxCents: bigint;
      totalCents: bigint;
    }>;
  },
>(order: T) {
  return {
    ...order,
    subtotalCents: Number(order.subtotalCents),
    discountCents: Number(order.discountCents),
    shippingCents: Number(order.shippingCents),
    taxCents: Number(order.taxCents),
    totalCents: Number(order.totalCents),
    ...(order.items
      ? {
          items: order.items.map((item) => ({
            ...item,
            unitPriceCents: Number(item.unitPriceCents),
            discountCents: Number(item.discountCents),
            taxCents: Number(item.taxCents),
            totalCents: Number(item.totalCents),
          })),
        }
      : {}),
  };
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CustomerAuthService) private readonly auth: CustomerAuthService,
  ) {}

  private async context(rawToken: string): Promise<CustomerContext> {
    const session = await this.auth.authenticate(rawToken);
    return { customerId: session.customerId, storeId: session.storeId };
  }

  async me(rawToken: string) {
    const context = await this.context(rawToken);
    const customer = await this.prisma.client.customer.findFirst({
      where: { id: context.customerId, storeId: context.storeId },
      select: {
        id: true,
        name: true,
        emailNormalized: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!customer) throw new NotFoundException('CUSTOMER_NOT_FOUND');
    return { ...customer, email: customer.emailNormalized, emailNormalized: undefined };
  }

  async updateProfile(rawToken: string, input: UpdateProfileInput) {
    const context = await this.context(rawToken);
    const customer = await this.prisma.client.customer.update({
      where: { id: context.customerId },
      data: { name: input.name },
    });
    await this.prisma.client.outboxEvent.create({
      data: {
        storeId: context.storeId,
        aggregateType: 'Customer',
        aggregateId: customer.id,
        eventType: 'customer.profile_updated',
        payloadJson: { customerId: customer.id },
      },
    });
    return {
      id: customer.id,
      name: customer.name,
      email: customer.emailNormalized,
      status: customer.status,
      updatedAt: customer.updatedAt,
    };
  }

  async favorites(rawToken: string): Promise<unknown> {
    const context = await this.context(rawToken);
    const favorites = await this.prisma.client.customerFavorite.findMany({
      where: context,
      orderBy: { createdAt: 'desc' },
      include: {
        product: {
          include: {
            brand: true,
            variants: {
              where: { status: 'ACTIVE' },
              include: { prices: { orderBy: { createdAt: 'desc' }, take: 1 } },
            },
          },
        },
      },
    });
    return favorites.map((favorite) => ({
      id: favorite.id,
      storeId: favorite.storeId,
      customerId: favorite.customerId,
      productId: favorite.productId,
      createdAt: favorite.createdAt,
      product: {
        id: favorite.product.id,
        slug: favorite.product.slug,
        title: favorite.product.title,
        description: favorite.product.description,
        brand: favorite.product.brand,
        variants: favorite.product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          attributes: variant.variantAttributes,
          prices: variant.prices.map((price) => ({
            amountCents: Number(price.amountCents),
            compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
            currency: price.currency,
          })),
        })),
      },
    }));
  }

  async addFavorite(rawToken: string, input: FavoriteInput) {
    const context = await this.context(rawToken);
    const product = await this.prisma.client.product.findFirst({
      where: { id: input.productId, storeId: context.storeId, publicationStatus: 'PUBLISHED' },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return this.prisma.client.customerFavorite.upsert({
      where: { storeId_customerId_productId: { ...context, productId: input.productId } },
      update: {},
      create: { ...context, productId: input.productId },
    });
  }

  async removeFavorite(rawToken: string, productId: string): Promise<void> {
    const context = await this.context(rawToken);
    await this.prisma.client.customerFavorite.deleteMany({ where: { ...context, productId } });
  }

  async addresses(rawToken: string) {
    const context = await this.context(rawToken);
    return this.prisma.client.address.findMany({
      where: { storeId: context.storeId, customerId: context.customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(rawToken: string, input: CreateAddressInput) {
    const context = await this.context(rawToken);
    return this.prisma.client.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.address.updateMany({ where: context, data: { isDefault: false } });
      const existing = await tx.address.count({ where: context });
      return tx.address.create({
        data: {
          ...context,
          recipient: input.recipient,
          postalCode: input.postalCode,
          street: input.street,
          number: input.number,
          district: input.district,
          city: input.city,
          state: input.state,
          country: input.country,
          isDefault: input.isDefault || existing === 0,
          ...(input.complement !== undefined ? { complement: input.complement } : {}),
        },
      });
    });
  }

  async updateAddress(rawToken: string, addressId: string, input: UpdateAddressInput) {
    const context = await this.context(rawToken);
    const address = await this.prisma.client.address.findFirst({
      where: { id: addressId, ...context },
    });
    if (!address) throw new NotFoundException('ADDRESS_NOT_FOUND');
    return this.prisma.client.$transaction(async (tx) => {
      if (input.isDefault)
        await tx.address.updateMany({ where: context, data: { isDefault: false } });
      const data = Object.fromEntries(
        Object.entries(input).filter(([, value]) => value !== undefined),
      );
      return tx.address.update({ where: { id: address.id }, data });
    });
  }

  async deleteAddress(rawToken: string, addressId: string): Promise<void> {
    const context = await this.context(rawToken);
    const address = await this.prisma.client.address.findFirst({
      where: { id: addressId, ...context },
    });
    if (!address) throw new NotFoundException('ADDRESS_NOT_FOUND');
    await this.prisma.client.$transaction(async (tx) => {
      await tx.address.delete({ where: { id: address.id } });
      if (address.isDefault) {
        const replacement = await tx.address.findFirst({
          where: context,
          orderBy: { createdAt: 'desc' },
        });
        if (replacement)
          await tx.address.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    });
  }

  async orders(
    rawToken: string,
    query: PaginationInput,
  ): Promise<CursorPage<Record<string, unknown> & { id: string }>> {
    const context = await this.context(rawToken);
    const orders = await this.prisma.client.order.findMany({
      where: { ...context, ...(query.status ? { status: query.status as never } : {}) },
      orderBy: [{ placedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        _count: { select: { items: true } },
        shipments: {
          select: {
            status: true,
            carrier: true,
            service: true,
            trackingCode: true,
            trackingUrl: true,
          },
        },
      },
    });
    return cursorPage(
      orders.map((order) => ({
        ...serializeOrder(order),
        itemCount: order._count.items,
        _count: undefined,
      })),
      query.limit,
    );
  }

  async order(rawToken: string, orderId: string): Promise<unknown> {
    const context = await this.context(rawToken);
    const order = await this.prisma.client.order.findFirst({
      where: { id: orderId, ...context },
      include: {
        items: { orderBy: { createdAt: 'asc' } },
        statusHistory: { orderBy: { changedAt: 'asc' } },
        shipments: true,
        payments: {
          select: {
            id: true,
            providerCode: true,
            status: true,
            authorizedCents: true,
            capturedCents: true,
            refundedCents: true,
            currency: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    return {
      ...serializeOrder(order),
      payments: order.payments.map((payment) => ({
        ...payment,
        authorizedCents: Number(payment.authorizedCents),
        capturedCents: Number(payment.capturedCents),
        refundedCents: Number(payment.refundedCents),
      })),
    };
  }

  async requestCancellation(
    rawToken: string,
    orderId: string,
    input: CancelOrderInput,
  ): Promise<unknown> {
    const context = await this.context(rawToken);
    return this.prisma.client.$transaction(async (tx) => {
      const order = await tx.order.findFirst({ where: { id: orderId, ...context } });
      if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
      if (!['PENDING_PAYMENT', 'PAID'].includes(order.status))
        throw new ConflictException('ORDER_CANCELLATION_NOT_ALLOWED');
      const nextStatus = order.status === 'PAID' ? 'REFUND_PENDING' : 'CANCELED';
      const updated = await tx.order.update({
        where: { id: order.id },
        data: { status: nextStatus },
      });
      await tx.orderStatusHistory.create({
        data: {
          ...context,
          orderId: order.id,
          fromStatus: order.status,
          toStatus: nextStatus,
          actorType: 'CUSTOMER',
          actorId: context.customerId,
          reason: input.reason,
        },
      });
      await tx.outboxEvent.create({
        data: {
          storeId: context.storeId,
          aggregateType: 'Order',
          aggregateId: order.id,
          eventType: 'order.cancellation_requested',
          payloadJson: { orderId: order.id, previousStatus: order.status, nextStatus },
        },
      });
      return serializeOrder(updated);
    });
  }
}
