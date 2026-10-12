import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { ImportsController } from '../src/imports/imports.controller';
import { ImportsService } from '../src/imports/imports.service';

describe('import endpoints', () => {
  let app: NestFastifyApplication;
  const imports = {
    createSource: vi.fn(async () => ({ id: 'source-1' })),
    submit: vi.fn(async () => ({ id: 'batch-1', status: 'QUEUED', deduplicated: false })),
    report: vi.fn(async () => ({ id: 'batch-1', status: 'COMPLETED', total: 1, processed: 1 })),
  };
  const auth = { authorize: vi.fn(async () => ({ adminUserId: 'admin-1' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ImportsController],
      providers: [
        { provide: ImportsService, useValue: imports },
        { provide: AdminAuthService, useValue: auth },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('protects batch submission with import write permission', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/imports/batches',
      headers: { authorization: 'Bearer admin-token' },
      payload: { contractVersion: '1.0' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', '5f3d7a3b-d2fc-4056-86ea-cde687125676', 'imports:write');
  });

  it('uses read permission without mandatory MFA for reports', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/imports/batches/batch-1',
      headers: { authorization: 'Bearer admin-token' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: { status: 'COMPLETED', processed: 1 } });
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', '5f3d7a3b-d2fc-4056-86ea-cde687125676', 'imports:read', false);
  });

  it('validates source creation payloads', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/imports/sources',
      headers: { authorization: 'Bearer admin-token' },
      payload: { code: '', name: '' },
    });
    expect(response.statusCode).toBe(400);
    expect(imports.createSource).not.toHaveBeenCalled();
  });
});
