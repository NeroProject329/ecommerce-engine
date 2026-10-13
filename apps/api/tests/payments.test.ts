import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { AdminPaymentsController, PaymentWebhooksController, PublicPaymentsController } from '../src/payments/payments.controller';
import { PaymentsService } from '../src/payments/payments.service';

describe('payment endpoints', () => {
  let app: NestFastifyApplication;
  const payments = {
    create: vi.fn(async () => ({ id: 'payment-1', status: 'CAPTURED' })),
    refund: vi.fn(async () => ({ id: 'refund-1', status: 'SUCCEEDED' })),
    receiveWebhook: vi.fn(async () => ({ accepted: true, duplicate: false })),
  };
  const auth = { authorize: vi.fn(async () => ({ adminUserId: 'admin-1' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [PublicPaymentsController, AdminPaymentsController, PaymentWebhooksController],
      providers: [{ provide: PaymentsService, useValue: payments }, { provide: AdminAuthService, useValue: auth }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false, rawBody: true });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  beforeEach(() => vi.clearAllMocks());
  afterAll(async () => app.close());

  it('creates a sandbox payment with the order bearer token', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/stores/loja/orders/3f3d7a3b-d2fc-4056-86ea-cde687125676/payments',
      headers: { 'x-order-token': 'order-token' },
      payload: { providerCode: 'sandbox', idempotencyKey: 'payment-request-0001' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ data: { status: 'CAPTURED' } });
    expect(payments.create).toHaveBeenCalledWith('loja', expect.any(String), 'order-token', expect.objectContaining({ providerCode: 'sandbox' }));
  });

  it('protects refunds with admin authorization and validates integer cents', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/3f3d7a3b-d2fc-4056-86ea-cde687125676/payments/payment-1/refunds',
      headers: { authorization: 'Bearer admin-token', 'idempotency-key': 'refund-request-0001' },
      payload: { amountCents: 500, reason: 'Solicitação do cliente' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', expect.any(String), 'payments:refund');
    expect(payments.refund).toHaveBeenCalledWith(expect.any(String), 'payment-1', 'admin-1', 'refund-request-0001', expect.objectContaining({ amountCents: 500 }));
  });

  it('accepts a structurally valid signed webhook envelope', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/webhooks/payments/sandbox',
      headers: { 'x-payment-signature': 'a'.repeat(64) },
      payload: { storeId: '3f3d7a3b-d2fc-4056-86ea-cde687125676', eventId: 'event-1', type: 'payment.captured', status: 'CAPTURED' },
    });
    expect(response.statusCode).toBe(201);
    expect(payments.receiveWebhook).toHaveBeenCalledWith('sandbox', 'a'.repeat(64), expect.any(Uint8Array), expect.objectContaining({ eventId: 'event-1' }));
  });

  it('rejects unsupported providers before reaching the service', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/stores/loja/orders/order-1/payments',
      headers: { 'x-order-token': 'order-token' },
      payload: { providerCode: 'stripe', idempotencyKey: 'payment-request-0001' },
    });
    expect(response.statusCode).toBe(400);
    expect(payments.create).not.toHaveBeenCalled();
  });
});
