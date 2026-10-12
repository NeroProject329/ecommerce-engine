import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AdminAuthService } from '../src/auth/admin-auth.service';
import { AdminCatalogController } from '../src/catalog/admin-catalog.controller';
import { CatalogService } from '../src/catalog/catalog.service';
import { PublicCatalogController } from '../src/catalog/public-catalog.controller';

describe('catalog endpoints', () => {
  let app: NestFastifyApplication;
  const catalog = {
    publicCategories: vi.fn(async () => [{ id: 'category-1', slug: 'calcados', name: 'Calçados' }]),
    publicBrands: vi.fn(async () => [{ id: 'brand-1', slug: 'acme', name: 'Acme' }]),
    publicProducts: vi.fn(async () => [{ id: 'product-1', slug: 'tenis-pro', variants: [{ availableQuantity: 2 }] }]),
    publicProduct: vi.fn(async () => ({ id: 'product-1', slug: 'tenis-pro' })),
    adminProducts: vi.fn(async () => []),
    createCategory: vi.fn(async (_storeId: string, input: unknown) => ({ id: 'category-1', ...input as object })),
    createBrand: vi.fn(async () => ({ id: 'brand-1' })),
    createAttribute: vi.fn(async () => ({ id: 'attribute-1' })),
    assignCategoryAttribute: vi.fn(async () => ({ categoryId: 'category-1' })),
    createProduct: vi.fn(async () => ({ id: 'product-1' })),
    createVariant: vi.fn(async () => ({ id: 'variant-1' })),
    setProductAttribute: vi.fn(async () => ({ productId: 'product-1' })),
    setVariantAttribute: vi.fn(async () => ({ variantId: 'variant-1' })),
    setPrice: vi.fn(async () => ({ id: 'price-1', amountCents: 12990 })),
    setInventory: vi.fn(async () => ({ id: 'inventory-1', onHand: 5 })),
    createInventoryLocation: vi.fn(async () => ({ id: 'location-1' })),
    publishProduct: vi.fn(async () => ({ id: 'product-1', publicationStatus: 'PUBLISHED' })),
  };
  const auth = { authorize: vi.fn(async () => ({ adminUserId: 'admin-1' })) };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminCatalogController, PublicCatalogController],
      providers: [
        { provide: CatalogService, useValue: catalog },
        { provide: AdminAuthService, useValue: auth },
      ],
    }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => app.close());

  it('serves the public catalog scoped by store slug', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/public/stores/loja-a/products' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ data: [{ slug: 'tenis-pro' }] });
    expect(catalog.publicProducts).toHaveBeenCalledWith('loja-a');
  });

  it('requires an administrative bearer token', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/admin/stores/store-id/catalog/products' });
    expect(response.statusCode).toBe(400);
    expect(auth.authorize).not.toHaveBeenCalled();
  });

  it('checks tenant permission before an administrative mutation', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/catalog/categories',
      headers: { authorization: 'Bearer admin-token' },
      payload: { name: 'Calçados' },
    });
    expect(response.statusCode).toBe(201);
    expect(auth.authorize).toHaveBeenCalledWith('admin-token', '5f3d7a3b-d2fc-4056-86ea-cde687125676', 'catalog:write');
    expect(catalog.createCategory).toHaveBeenCalled();
  });

  it('rejects malformed catalog payloads before persistence', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/admin/stores/5f3d7a3b-d2fc-4056-86ea-cde687125676/catalog/products',
      headers: { authorization: 'Bearer admin-token' },
      payload: { title: '', primaryCategoryId: 'not-a-uuid' },
    });
    expect(response.statusCode).toBe(400);
    expect(catalog.createProduct).not.toHaveBeenCalled();
  });
});
