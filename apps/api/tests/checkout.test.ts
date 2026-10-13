import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CheckoutController } from '../src/checkout/checkout.controller';
import { CheckoutService } from '../src/checkout/checkout.service';

describe('checkout endpoints', () => {
  let app: NestFastifyApplication;
  const checkout = {
    createCart: vi.fn(async () => ({ cartId: 'cart-1', cartToken: 'token-1' })),
    getCart: vi.fn(async () => ({ id: 'cart-1', items: [] })),
    setItem: vi.fn(async () => ({ id: 'cart-1', items: [{ quantity: 2 }] })),
    quoteShipping: vi.fn(async () => ({ id: 'quote-1', amountCents: 1690 })),
    checkout: vi.fn(async () => ({ orderId: 'order-1', totalCents: 21690 })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CheckoutController],
      providers: [{ provide: CheckoutService, useValue: checkout }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), {
      logger: false,
    });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('creates an anonymous cart token', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/public/stores/store-a/carts' });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ data: { cartId: 'cart-1', cartToken: 'token-1' } });
    expect(checkout.createCart).toHaveBeenLastCalledWith('store-a', undefined);
  });

  it('forwards the customer session when creating an authenticated cart', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/stores/store-a/carts',
      headers: { authorization: 'Bearer customer-session' },
    });
    expect(response.statusCode).toBe(201);
    expect(checkout.createCart).toHaveBeenLastCalledWith('store-a', 'customer-session');
  });

  it('validates cart quantities', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/public/stores/store-a/carts/cart-1/items',
      headers: { 'x-cart-token': 'token-1' },
      payload: { variantId: '5f3d7a3b-d2fc-4056-86ea-cde687125676', quantity: 0 },
    });
    expect(response.statusCode).toBe(400);
    expect(checkout.setItem).not.toHaveBeenCalled();
  });

  it('normalizes and validates shipping requests', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/stores/store-a/carts/cart-1/shipping-quotes',
      headers: { 'x-cart-token': 'token-1' },
      payload: { destinationPostalCode: '74000-000' },
    });
    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ data: { amountCents: 1690 } });
  });

  it('requires an idempotency key and full address at checkout', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/public/stores/store-a/carts/cart-1/checkout',
      headers: { 'x-cart-token': 'token-1' },
      payload: { idempotencyKey: 'short' },
    });
    expect(response.statusCode).toBe(400);
    expect(checkout.checkout).not.toHaveBeenCalled();
  });
});
