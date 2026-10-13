import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CustomersController } from '../src/customers/customers.controller';
import { CustomersService } from '../src/customers/customers.service';

describe('customer account endpoints', () => {
  let app: NestFastifyApplication;
  const customers = {
    me: vi.fn(async () => ({ id: 'customer-1', email: 'cliente@example.test' })),
    addresses: vi.fn(async () => []),
    createAddress: vi.fn(async () => ({ id: 'address-1' })),
    updateAddress: vi.fn(async () => ({ id: 'address-1' })),
    deleteAddress: vi.fn(async () => undefined),
    orders: vi.fn(async () => []),
    order: vi.fn(async () => ({ id: 'order-1' })),
    requestCancellation: vi.fn(async () => ({ id: 'order-1', status: 'CANCELED' })),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [CustomersController], providers: [{ provide: CustomersService, useValue: customers }] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init(); await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => app.close());

  it('requires a bearer token for private customer data', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/customer/me' });
    expect(response.statusCode).toBe(400);
    expect(customers.me).not.toHaveBeenCalled();
  });

  it('validates Brazilian address fields', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/customer/addresses', headers: { authorization: 'Bearer customer-token' }, payload: { recipient: 'Cliente', postalCode: '123', street: 'Rua A', number: '1', district: 'Centro', city: 'São Paulo', state: 'SP' } });
    expect(response.statusCode).toBe(400);
    expect(customers.createAddress).not.toHaveBeenCalled();
  });

  it('exposes the authenticated order history', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/customer/orders', headers: { authorization: 'Bearer customer-token' } });
    expect(response.statusCode).toBe(200);
    expect(customers.orders).toHaveBeenCalledWith('customer-token', expect.objectContaining({ limit: 50 }));
  });
});
