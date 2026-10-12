import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { AdminMediaController } from '../src/media/media.controller';
import { MediaService } from '../src/media/media.service';

describe('media endpoints', () => {
  let app: NestFastifyApplication;
  const media = {
    upload: vi.fn(async () => ({ id: 'asset-1', deduplicated: false })),
    importUrl: vi.fn(async () => ({ id: 'asset-2', deduplicated: false })),
    attachProduct: vi.fn(async () => ({ productId: 'product-1' })),
    attachVariant: vi.fn(async () => ({ variantId: 'variant-1' })),
  };
  const auth = { authorize: vi.fn(async () => ({ adminUserId: 'admin-1' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminMediaController],
      providers: [
        { provide: MediaService, useValue: media },
        { provide: AdminAuthService, useValue: auth },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('requires RBAC authorization for upload', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/media/uploads',
      headers: { authorization: 'Bearer admin-token' },
      payload: { contentBase64: 'iVBORw0KGgoAAAA==' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', '5f3d7a3b-d2fc-4056-86ea-cde687125676', 'catalog:write');
  });

  it('rejects non-HTTPS media imports during request validation or service processing', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/media/imports',
      headers: { authorization: 'Bearer admin-token' },
      payload: { url: 'http://example.test/image.png' },
    });
    expect(response.statusCode).toBe(400);
    expect(media.importUrl).not.toHaveBeenCalled();
  });

  it('validates attachment roles before calling persistence', async () => {
    const response = await app.inject({
      method: 'PUT',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/media/products/product-1',
      headers: { authorization: 'Bearer admin-token' },
      payload: { mediaAssetId: '5f3d7a3b-d2fc-4056-86ea-cde687125676', role: 'INVALID' },
    });
    expect(response.statusCode).toBe(400);
    expect(media.attachProduct).not.toHaveBeenCalled();
  });
});
