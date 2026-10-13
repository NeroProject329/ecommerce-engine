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
    beginTotpEnrollment: vi.fn(async () => ({
      secret: 'BASE32SECRET',
      otpauthUrl: 'otpauth://totp/Ecommerce%20Engine%3Aadmin%40example.test?secret=BASE32SECRET&issuer=Ecommerce%20Engine&algorithm=SHA1&digits=6&period=30',
      issuer: 'Ecommerce Engine',
      accountName: 'admin@example.test',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    })),
    verifyTotpEnrollment: vi.fn(async () => undefined),
    sessions: vi.fn(async () => [{ id: 'session-1', current: true, mfaVerified: true }]),
    revokeSession: vi.fn(async () => undefined),
    changePassword: vi.fn(async () => undefined),
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
    expect(accepted.json()).toMatchObject({
      data: {
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        issuer: 'Ecommerce Engine',
        accountName: 'admin@example.test',
        otpauthUrl: expect.stringMatching(/^otpauth:\/\/totp\//u),
      },
    });
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

  it('lists sessions, revokes another session and changes the password', async () => {
    const headers = { authorization: 'Bearer admin-token' };
    const sessions = await app.inject({ method: 'GET', url: '/v1/admin/auth/sessions', headers });
    expect(sessions.statusCode).toBe(200);
    expect(sessions.json()).toMatchObject({ data: [{ id: 'session-1', current: true }] });

    const revoked = await app.inject({ method: 'DELETE', url: '/v1/admin/auth/sessions/session-2', headers });
    expect(revoked.statusCode).toBe(204);
    expect(auth.revokeSession).toHaveBeenCalledWith('admin-token', 'session-2');

    const changed = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/auth/password',
      headers,
      payload: { currentPassword: 'current password', newPassword: 'a different secure password' },
    });
    expect(changed.statusCode).toBe(204);
    expect(auth.changePassword).toHaveBeenCalledWith('admin-token', {
      currentPassword: 'current password',
      newPassword: 'a different secure password',
    });
  });
});
