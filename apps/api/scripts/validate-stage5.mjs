/* global console, fetch, process */
import { randomBytes, randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashPassword } from '@ecommerce/auth';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
process.env.AUTH_ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4021';

const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage5-${suffix}`;
const password = 'catalog validation password';
let app;

async function request(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4021${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}`);
  return body;
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 5 validation' } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Catalog owner' } });
  await prisma.rolePermission.createMany({
    data: ['catalog:read', 'catalog:write', 'inventory:write'].map((permissionCode) => ({ roleId, permissionCode })),
  });
  await prisma.adminUser.create({
    data: { id: adminUserId, emailNormalized: `admin-${suffix}@example.test`, passwordHash: await hashPassword(password), status: 'ACTIVE' },
  });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });

  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();
  const login = await request('/v1/admin/auth/login', {
    method: 'POST', body: JSON.stringify({ storeSlug, email: `admin-${suffix}@example.test`, password }),
  });
  const authorization = `Bearer ${login.data.token}`;
  const enrollment = await request('/v1/admin/auth/mfa/enroll', { method: 'POST', headers: { authorization } });
  await request('/v1/admin/auth/mfa/verify', {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ code: generateTotp(enrollment.data.secret) }),
  }, 204);
  const adminBase = `/v1/admin/stores/${storeId}/catalog`;
  const category = await request(`${adminBase}/categories`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ name: 'Calçados' }),
  }, 201);
  const brand = await request(`${adminBase}/brands`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ name: 'Marca Teste' }),
  }, 201);
  const attribute = await request(`${adminBase}/attributes`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ code: 'cor', name: 'Cor', dataType: 'OPTION', options: ['Azul', 'Preto'] }),
  }, 201);
  await request(`${adminBase}/categories/${category.data.id}/attributes`, {
    method: 'PUT', headers: { authorization }, body: JSON.stringify({ definitionId: attribute.data.id, required: true, filterable: true }),
  });
  const product = await request(`${adminBase}/products`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ title: 'Tênis Pro', primaryCategoryId: category.data.id, brandId: brand.data.id }),
  }, 201);
  const variant = await request(`${adminBase}/products/${product.data.id}/variants`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ sku: 'tenis azul 42', ean: '7894900011517', attributes: { cor: 'Azul' } }),
  }, 201);
  await request(`${adminBase}/variants/${variant.data.id}/attributes`, {
    method: 'PUT', headers: { authorization }, body: JSON.stringify({ definitionId: attribute.data.id, value: 'Azul' }),
  });
  await request(`${adminBase}/products/${product.data.id}/publish`, { method: 'POST', headers: { authorization } }, 400);
  await request(`${adminBase}/variants/${variant.data.id}/prices`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ amountCents: 12990, currency: 'BRL' }),
  }, 201);
  const location = await request(`${adminBase}/inventory-locations`, {
    method: 'POST', headers: { authorization }, body: JSON.stringify({ code: 'principal', name: 'Estoque principal' }),
  }, 201);
  await request(`${adminBase}/variants/${variant.data.id}/inventory`, {
    method: 'PUT', headers: { authorization }, body: JSON.stringify({ locationId: location.data.id, onHand: 10, reserved: 2 }),
  });
  await request(`${adminBase}/products/${product.data.id}/publish`, { method: 'POST', headers: { authorization } });
  const publicList = await request(`/v1/public/stores/${storeSlug}/products`, { method: 'GET' });
  if (publicList.data.length !== 1 || publicList.data[0].variants[0].availableQuantity !== 8) {
    throw new Error('public catalog did not expose the expected sellable variant');
  }
  await request(`/v1/admin/stores/${randomUUID()}/catalog/products`, { method: 'GET', headers: { authorization } }, 401);
  console.log('STAGE5_CATALOG_FLOW_OK');
} finally {
  await app?.close();
  await prisma.outboxEvent.deleteMany({ where: { storeId } });
  await prisma.price.deleteMany({ where: { storeId } });
  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.productAttributeValue.deleteMany({ where: { storeId } });
  await prisma.variantAttributeValue.deleteMany({ where: { storeId } });
  await prisma.categoryAttribute.deleteMany({ where: { storeId } });
  await prisma.productCategory.deleteMany({ where: { storeId } });
  await prisma.productVariant.deleteMany({ where: { storeId } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.inventoryLocation.deleteMany({ where: { storeId } });
  await prisma.attributeDefinition.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.brand.deleteMany({ where: { storeId } });
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
