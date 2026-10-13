import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post, Query, Req, type RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { PaymentsService } from './payments.service';
import { createPaymentSchema, paymentWebhookSchema, reconcilePaymentsSchema, refundPaymentSchema } from './schemas';

function validated<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try { return schema.parse(value); } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

@Controller('v1/public/stores/:storeSlug/orders/:orderId/payments')
export class PublicPaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post()
  async create(@Param('storeSlug') storeSlug: string, @Param('orderId') orderId: string, @Headers('x-order-token') orderToken: string | undefined, @Body() body: unknown) {
    return { data: await this.payments.create(storeSlug, orderId, orderToken, validated(createPaymentSchema, body)) };
  }
}

@Controller('v1/admin/stores/:storeId/payments')
export class AdminPaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}

  @Post(':paymentId/refunds')
  async refund(@Param('storeId') storeId: string, @Param('paymentId') paymentId: string, @Headers('authorization') authorization: string | undefined, @Headers('idempotency-key') idempotencyKey: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    const actor = await this.auth.authorize(bearer(authorization), storeId, 'payments:refund');
    if (!idempotencyKey || idempotencyKey.length < 12) throw new BadRequestException('IDEMPOTENCY_KEY_REQUIRED');
    return { data: await this.payments.refund(storeId, paymentId, actor.adminUserId, idempotencyKey, validated(refundPaymentSchema, body)) };
  }

  @Get()
  async list(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query('status') status?: string) { await this.auth.authorize(bearer(authorization), storeId, 'payments:read', false); return { data: await this.payments.list(storeId, status) }; }

  @Post('reconcile')
  async reconcile(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { const actor = await this.auth.authorize(bearer(authorization), storeId, 'payments:refund'); return { data: await this.payments.reconcile(storeId, actor.adminUserId, validated(reconcilePaymentsSchema, body)) }; }
}

@Controller('v1/webhooks/payments')
export class PaymentWebhooksController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(':providerCode')
  async receive(@Param('providerCode') providerCode: string, @Headers('x-payment-signature') signature: string | undefined, @Req() request: RawBodyRequest<FastifyRequest>, @Body() body: unknown) {
    return { data: await this.payments.receiveWebhook(providerCode, signature, request.rawBody, validated(paymentWebhookSchema, body)) };
  }
}
