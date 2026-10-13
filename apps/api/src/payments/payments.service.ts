import { createHash } from 'node:crypto';
import { hashOpaqueToken } from '@ecommerce/auth';
import { SandboxPaymentGateway, verifyWebhookSignature, type PaymentGateway } from '@ecommerce/payments';
import { BadRequestException, ConflictException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { CreatePaymentInput, PaymentWebhookInput, ReconcilePaymentsInput, RefundPaymentInput } from './schemas';

@Injectable()
export class PaymentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(storeSlug: string, orderId: string, orderToken: string | undefined, input: CreatePaymentInput) {
    const order = await this.requirePublicOrder(storeSlug, orderId, orderToken);
    const replay = await this.prisma.client.paymentAttempt.findUnique({
      where: { storeId_requestKey: { storeId: order.storeId, requestKey: input.idempotencyKey } },
      include: { payment: true },
    });
    if (replay) return this.paymentResponse(replay.payment);
    if (order.status !== 'PENDING_PAYMENT') throw new ConflictException('ORDER_NOT_PAYABLE');

    const payment = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.payment.create({
        data: { storeId: order.storeId, orderId: order.id, providerCode: input.providerCode, currency: order.currency },
      });
      await tx.paymentAttempt.create({
        data: { storeId: order.storeId, paymentId: created.id, requestKey: input.idempotencyKey, attempt: 1 },
      });
      return created;
    });

    const result = await this.gateway(input.providerCode).createPayment({
      storeId: order.storeId,
      orderId: order.id,
      amountCents: Number(order.totalCents),
      currency: 'BRL',
      idempotencyKey: input.idempotencyKey,
    });

    return this.prisma.client.$transaction(async (tx) => {
      const status = result.status === 'CAPTURED' ? 'CAPTURED' : 'FAILED';
      const updated = await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          externalPaymentId: result.providerPaymentId,
          authorizedCents: status === 'CAPTURED' ? order.totalCents : 0,
          capturedCents: status === 'CAPTURED' ? order.totalCents : 0,
        },
      });
      await tx.paymentAttempt.update({
        where: { storeId_requestKey: { storeId: order.storeId, requestKey: input.idempotencyKey } },
        data: { status: status === 'CAPTURED' ? 'SUCCEEDED' : 'FAILED', providerResponseSafe: { providerPaymentId: result.providerPaymentId, status: result.status } },
      });
      if (status === 'CAPTURED') {
        const reservations = await tx.inventoryReservation.findMany({
          where: { storeId: order.storeId, orderId: order.id, status: 'ACTIVE' },
        });
        for (const reservation of reservations) {
          const changed = await tx.inventory.updateMany({
            where: {
              storeId: order.storeId,
              variantId: reservation.variantId,
              locationId: reservation.locationId,
              reserved: { gte: reservation.quantity },
              onHand: { gte: reservation.quantity },
            },
            data: { reserved: { decrement: reservation.quantity }, onHand: { decrement: reservation.quantity }, version: { increment: 1 } },
          });
          if (changed.count !== 1) throw new ConflictException('INVENTORY_RESERVATION_INVALID');
          await tx.inventoryMovement.create({
            data: {
              storeId: order.storeId,
              variantId: reservation.variantId,
              locationId: reservation.locationId,
              delta: -reservation.quantity,
              reason: 'ORDER_CAPTURED',
              actorRef: updated.id,
              deduplicationKey: `payment:${updated.id}:${reservation.id}`,
              metadataJson: { orderId: order.id, reservationId: reservation.id },
            },
          });
          await tx.inventoryReservation.update({ where: { id: reservation.id }, data: { status: 'CONSUMED' } });
        }
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAID' } });
        await tx.orderStatusHistory.create({
          data: { storeId: order.storeId, orderId: order.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'PAID', actorType: 'PAYMENT_GATEWAY', actorId: updated.id },
        });
        await tx.outboxEvent.create({ data: { storeId: order.storeId, aggregateType: 'Payment', aggregateId: updated.id, eventType: 'payment.captured', payloadJson: { paymentId: updated.id, orderId: order.id, customerId: order.customerId, amountCents: Number(order.totalCents) } } });
      } else {
        await tx.order.update({ where: { id: order.id }, data: { status: 'PAYMENT_FAILED' } });
        await tx.orderStatusHistory.create({
          data: { storeId: order.storeId, orderId: order.id, fromStatus: 'PENDING_PAYMENT', toStatus: 'PAYMENT_FAILED', actorType: 'PAYMENT_GATEWAY', actorId: updated.id },
        });
      }
      return this.paymentResponse(updated);
    }, { isolationLevel: 'Serializable' });
  }

  async refund(storeId: string, paymentId: string, actorId: string, idempotencyKey: string, input: RefundPaymentInput): Promise<unknown> {
    const requestHash = createHash('sha256').update(JSON.stringify({ paymentId, input })).digest('hex');
    const replay = await this.prisma.client.idempotencyRecord.findUnique({ where: { storeId_scope_requestKey: { storeId, scope: 'payment.refund', requestKey: idempotencyKey } } });
    if (replay) { if (replay.requestHash !== requestHash) throw new ConflictException('IDEMPOTENCY_KEY_REUSED'); return replay.responseSnapshot; }
    const payment = await this.prisma.client.payment.findFirst({ where: { id: paymentId, storeId }, include: { order: true } });
    if (!payment?.externalPaymentId || !['CAPTURED', 'PARTIALLY_REFUNDED'].includes(payment.status)) throw new NotFoundException('PAYMENT_NOT_REFUNDABLE');
    const remainingCents = Number(payment.capturedCents - payment.refundedCents);
    if (input.amountCents > remainingCents) throw new BadRequestException('REFUND_EXCEEDS_CAPTURE');
    const refund = await this.prisma.client.refund.create({ data: { storeId, paymentId, amountCents: BigInt(input.amountCents), reason: input.reason, status: 'PROCESSING' } });
    const result = await this.gateway(payment.providerCode).refund(payment.externalPaymentId, input.amountCents);
    if (result.status !== 'REFUNDED') {
      await this.prisma.client.refund.update({ where: { id: refund.id }, data: { status: 'FAILED' } });
      throw new ConflictException('REFUND_FAILED');
    }
    return this.prisma.client.$transaction(async (tx) => {
      const refundedCents = payment.refundedCents + BigInt(input.amountCents);
      const fullyRefunded = refundedCents === payment.capturedCents;
      const updatedRefund = await tx.refund.update({ where: { id: refund.id }, data: { status: 'SUCCEEDED', externalRefundId: `${result.providerPaymentId}:${refund.id}` } });
      await tx.payment.update({ where: { id: payment.id }, data: { refundedCents, status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED' } });
      await tx.orderStatusHistory.create({ data: { storeId, orderId: payment.orderId, fromStatus: payment.order.status, toStatus: fullyRefunded ? 'REFUNDED' : 'PARTIALLY_REFUNDED', actorType: 'ADMIN', actorId, reason: input.reason } });
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'payment.refund', objectType: 'payment', objectId: payment.id, diffRedactedJson: { refundId: updatedRefund.id, amountCents: input.amountCents, status: updatedRefund.status } } });
      await tx.outboxEvent.create({ data: { storeId, aggregateType: 'Payment', aggregateId: payment.id, eventType: 'payment.refunded', payloadJson: { paymentId: payment.id, orderId: payment.orderId, amountCents: input.amountCents, fullyRefunded } } });
      const response = { id: updatedRefund.id, paymentId, amountCents: input.amountCents, status: updatedRefund.status };
      await tx.idempotencyRecord.create({ data: { storeId, scope: 'payment.refund', requestKey: idempotencyKey, requestHash, responseCode: 201, responseSnapshot: response, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
      return response;
    });
  }

  async list(storeId: string, status?: string): Promise<unknown> { const items = await this.prisma.client.payment.findMany({ where: { storeId, ...(status ? { status: status as never } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 200, include: { order: { select: { number: true, status: true } }, attempts: true, refunds: true } }); return items.map((item) => ({ ...this.paymentResponse(item), order: item.order, attempts: item.attempts, refunds: item.refunds.map((refund) => ({ ...refund, amountCents: Number(refund.amountCents) })) })); }

  async reconcile(storeId: string, actorId: string, input: ReconcilePaymentsInput): Promise<unknown> { const payments = await this.prisma.client.payment.findMany({ where: { storeId, status: { in: ['CAPTURED', 'PARTIALLY_REFUNDED', 'REFUNDED'] } }, take: input.limit, orderBy: { updatedAt: 'asc' }, include: { order: true } }); const issues = []; for (const payment of payments) { const expected = payment.status === 'REFUNDED' ? 'REFUNDED' : payment.status === 'PARTIALLY_REFUNDED' ? 'PARTIALLY_REFUNDED' : 'PAID'; if (payment.order.status === expected || (payment.status === 'CAPTURED' && ['FULFILLING', 'SHIPPED', 'DELIVERED'].includes(payment.order.status))) continue; issues.push({ paymentId: payment.id, orderId: payment.orderId, paymentStatus: payment.status, orderStatus: payment.order.status, expectedOrderStatus: expected }); if (input.repair) await this.prisma.client.$transaction([this.prisma.client.order.update({ where: { id: payment.orderId }, data: { status: expected } }), this.prisma.client.orderStatusHistory.create({ data: { storeId, orderId: payment.orderId, fromStatus: payment.order.status, toStatus: expected, actorType: 'RECONCILIATION', actorId, reason: 'Correção automática por reconciliação de pagamento' } }), this.prisma.client.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'payment.reconciled', objectType: 'Payment', objectId: payment.id, diffRedactedJson: { from: payment.order.status, to: expected } } })]); } return { scanned: payments.length, issues, repaired: input.repair ? issues.length : 0 }; }

  async receiveWebhook(providerCode: string, signature: string | undefined, rawPayload: Uint8Array | string | undefined, input: PaymentWebhookInput) {
    if (providerCode !== 'sandbox') throw new NotFoundException('PAYMENT_PROVIDER_NOT_CONFIGURED');
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) throw new InternalServerErrorException('PAYMENT_WEBHOOK_SECRET_NOT_CONFIGURED');
    if (!rawPayload || !signature || !verifyWebhookSignature(rawPayload, signature, secret)) throw new UnauthorizedException('WEBHOOK_SIGNATURE_INVALID');
    const payloadHash = createHash('sha256').update(rawPayload).digest('hex');
    const existing = await this.prisma.client.paymentWebhookEvent.findUnique({ where: { providerCode_providerEventId: { providerCode, providerEventId: input.eventId } } });
    if (existing) return { accepted: true, duplicate: true };
    await this.prisma.client.paymentWebhookEvent.create({
      data: {
        storeId: input.storeId,
        providerCode,
        providerEventId: input.eventId,
        signatureState: 'VALID',
        payloadHash,
        payloadSafe: { type: input.type, externalPaymentId: input.externalPaymentId, status: input.status },
        processedAt: new Date(),
      },
    });
    return { accepted: true, duplicate: false };
  }

  private gateway(providerCode: string): PaymentGateway {
    if (providerCode === 'sandbox') return new SandboxPaymentGateway();
    throw new NotFoundException('PAYMENT_PROVIDER_NOT_CONFIGURED');
  }

  private async requirePublicOrder(storeSlug: string, orderId: string, orderToken: string | undefined) {
    const order = await this.prisma.client.order.findFirst({ where: { id: orderId, store: { slug: storeSlug, status: 'ACTIVE' } } });
    if (!order) throw new NotFoundException('ORDER_NOT_FOUND');
    if (!orderToken || !order.accessKeyHash || hashOpaqueToken(orderToken) !== order.accessKeyHash) throw new UnauthorizedException('ORDER_ACCESS_DENIED');
    return order;
  }

  private paymentResponse(payment: { id: string; orderId: string; providerCode: string; status: string; capturedCents: bigint; refundedCents: bigint; currency: string }) {
    return { id: payment.id, orderId: payment.orderId, providerCode: payment.providerCode, status: payment.status, capturedCents: Number(payment.capturedCents), refundedCents: Number(payment.refundedCents), currency: payment.currency };
  }
}
