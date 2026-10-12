import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { CustomerAuthController } from '../src/auth/customer-auth.controller';
import { CustomerAuthService } from '../src/auth/customer-auth.service';

describe('customer authentication endpoints', () => {
  let app: NestFastifyApplication;
  const auth = {
    register: vi.fn(async () => ({ customer: { id: 'customer-1' } })),
    login: vi.fn(async () => ({ token: 'opaque-token', expiresAt: '2026-11-12T00:00:00.000Z' })),
    logout: vi.fn(async () => undefined),
    requestRecovery: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CustomerAuthController],
      providers: [{ provide: CustomerAuthService, useValue: auth }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('rejects invalid registration input before reaching the service', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/customer/auth/register', payload: { email: 'bad' } });
    expect(response.statusCode).toBe(400);
    expect(auth.register).not.toHaveBeenCalled();
  });

  it('returns a session only after validated login input', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/customer/auth/login',
      payload: { storeSlug: 'store-a', email: 'user@example.test', password: 'correct password' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { token: 'opaque-token' } });
  });

  it('keeps recovery requests non-enumerating', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/customer/auth/recovery/request',
      payload: { storeSlug: 'store-a', email: 'unknown@example.test' },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ data: { accepted: true } });
  });
});
