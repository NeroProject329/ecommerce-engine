import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthController } from '../src/auth/admin-auth.controller';
import { AdminAuthService } from '../src/auth/admin-auth.service';

describe('admin authentication endpoints', () => {
  let app: NestFastifyApplication;
  const auth = {
    login: vi.fn(async () => ({ token: 'admin-token', mfaVerified: true, permissions: ['catalog:write'] })),
    logout: vi.fn(async () => undefined),
    beginTotpEnrollment: vi.fn(async () => ({ secret: 'BASE32SECRET', algorithm: 'SHA1', digits: 6, period: 30 })),
    verifyTotpEnrollment: vi.fn(async () => undefined),
    requestRecovery: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminAuthController],
      providers: [{ provide: AdminAuthService, useValue: auth }],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('validates admin login and returns scoped permissions', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/login',
      payload: { storeSlug: 'store-a', email: 'admin@example.test', password: 'valid password' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { token: 'admin-token', permissions: ['catalog:write'] } });
  });

  it('requires a bearer token for MFA enrollment', async () => {
    const denied = await app.inject({ method: 'POST', url: '/v1/admin/auth/mfa/enroll' });
    expect(denied.statusCode).toBe(400);
    const accepted = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/mfa/enroll',
      headers: { authorization: 'Bearer admin-token' },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ data: { algorithm: 'SHA1', digits: 6, period: 30 } });
  });

  it('keeps administrative recovery non-enumerating', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/auth/recovery/request',
      payload: { storeSlug: 'store-a', email: 'unknown@example.test' },
    });
    expect(response.statusCode).toBe(202);
    expect(response.json()).toEqual({ data: { accepted: true } });
  });
});
