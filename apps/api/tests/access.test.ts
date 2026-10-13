import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AccessController } from '../src/access/access.controller';
import { AccessService } from '../src/access/access.service';
import { AdminAuthService } from '../src/auth/admin-auth.service';

describe('administrative access endpoints', () => {
  let app: NestFastifyApplication;
  const access = { roles: vi.fn(async () => []), createRole: vi.fn(async () => ({ id: 'role-1' })), updateRole: vi.fn(), users: vi.fn(async () => []), createUser: vi.fn(), updateUser: vi.fn() };
  const auth = { authorize: vi.fn(async () => ({ adminUserId: 'admin-1' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [AccessController], providers: [{ provide: AccessService, useValue: access }, { provide: AdminAuthService, useValue: auth }] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init(); await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => app.close());

  it('protects role management with users:write', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/admin/stores/store-1/access/roles', headers: { authorization: 'Bearer admin-token' } });
    expect(response.statusCode).toBe(200);
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', 'store-1', 'users:write');
  });

  it('validates permissions before creating a role', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/admin/stores/store-1/access/roles', headers: { authorization: 'Bearer admin-token' }, payload: { name: 'Operador', permissions: ['invalid'] } });
    expect(response.statusCode).toBe(400);
    expect(access.createRole).not.toHaveBeenCalled();
  });
});
