/* global console, fetch, process */
import { randomBytes, randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashPassword } from '@ecommerce/auth';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
process.env.AUTH_ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4024';
const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage8-${suffix}`;
const email = `admin-${suffix}@example.test`;
const password = 'pricing validation password';
let app;

async function request(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4024${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}`);
  return body;
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 8 validation' } });
  const category = await prisma.category.create({ data: { storeId, slug: 'pricing', name: 'Pricing', path: 'pricing' } });
  const product = await prisma.product.create({ data: { storeId, slug: 'priced-product', title: 'Priced product', primaryCategoryId: category.id } });
  await prisma.productCategory.create({ data: { storeId, productId: product.id, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { storeId, productId: product.id, sku: `PRICE-${suffix}` } });
  await prisma.price.create({ data: { storeId, variantId: variant.id, amountCents: 12000n } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Pricing owner' } });
  await prisma.rolePermission.create({ data: { roleId, permissionCode: 'pricing:write' } });
  await prisma.adminUser.create({ data: { id: adminUserId, emailNormalized: email, passwordHash: await hashPassword(password), status: 'ACTIVE' } });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });
  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();
  const login = await request('/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ storeSlug, email, password }) });
  const authorization = `Bearer ${login.data.token}`;
  const enrollment = await request('/v1/admin/auth/mfa/enroll', { method: 'POST', headers: { authorization } });
  await request('/v1/admin/auth/mfa/verify', { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: generateTotp(enrollment.data.secret) }) }, 204);
  const base = `/v1/admin/stores/${storeId}/pricing`;
  await request(`${base}/variants/${variant.id}`, { method: 'PUT', headers: { authorization }, body: JSON.stringify({ amountCents: 10000, reason: 'Stage 8 validation' }) });
  const promotion = await request(`${base}/promotions`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ name: '10 percent', percentageBasisPoints: 1000, priority: 10, targets: [{ targetType: 'STORE' }] }) }, 201);
  await request(`${base}/promotions/${promotion.data.id}/activate`, { method: 'POST', headers: { authorization } }, 201);
  await request(`${base}/coupons`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: 'SAVE20', percentageBasisPoints: 2000, maximumDiscountCents: 3000 }) }, 201);
  const quote = await request(`/v1/public/stores/${storeSlug}/pricing/quote`, { method: 'POST', body: JSON.stringify({ items: [{ variantId: variant.id, quantity: 2 }], couponCode: 'save20' }) }, 201);
  if (quote.data.subtotalCents !== 18000 || quote.data.couponDiscountCents !== 3000 || quote.data.totalCents !== 15000) throw new Error('pricing calculation mismatch');
  const history = await prisma.priceHistory.findFirst({ where: { storeId, variantId: variant.id } });
  if (!history || history.previousCents !== 12000n || history.newCents !== 10000n) throw new Error('price history missing');
  console.log('STAGE8_PRICING_FLOW_OK');
} finally {
  await app?.close();
  await prisma.promotionTarget.deleteMany({ where: { storeId } });
  await prisma.promotion.deleteMany({ where: { storeId } });
  await prisma.coupon.deleteMany({ where: { storeId } });
  await prisma.priceHistory.deleteMany({ where: { storeId } });
  await prisma.price.deleteMany({ where: { storeId } });
  await prisma.productCategory.deleteMany({ where: { storeId } });
  await prisma.productVariant.deleteMany({ where: { storeId } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
