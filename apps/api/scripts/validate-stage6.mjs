/* global console, fetch, process */
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashPassword } from '@ecommerce/auth';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
process.env.AUTH_ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4022';
process.env.MEDIA_STORAGE_DRIVER = 'local';
const mediaRoot = await mkdtemp(join(tmpdir(), 'ecommerce-media-'));
process.env.MEDIA_LOCAL_ROOT = mediaRoot;

const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage6-${suffix}`;
const email = `admin-${suffix}@example.test`;
const password = 'media validation password';
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
let app;

async function jsonRequest(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4022${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}`);
  return body;
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 6 validation' } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Media owner' } });
  await prisma.rolePermission.create({ data: { roleId, permissionCode: 'catalog:write' } });
  await prisma.adminUser.create({ data: { id: adminUserId, emailNormalized: email, passwordHash: await hashPassword(password), status: 'ACTIVE' } });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });

  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();
  const login = await jsonRequest('/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ storeSlug, email, password }) });
  const authorization = `Bearer ${login.data.token}`;
  const enrollment = await jsonRequest('/v1/admin/auth/mfa/enroll', { method: 'POST', headers: { authorization } });
  await jsonRequest('/v1/admin/auth/mfa/verify', { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: generateTotp(enrollment.data.secret) }) }, 204);

  const mediaBase = `/v1/admin/stores/${storeId}/media`;
  const upload = await jsonRequest(`${mediaBase}/uploads`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ contentBase64: pngBase64 }) }, 201);
  const duplicate = await jsonRequest(`${mediaBase}/uploads`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ contentBase64: pngBase64 }) }, 201);
  if (upload.data.id !== duplicate.data.id || duplicate.data.deduplicated !== true) throw new Error('media deduplication failed');

  const catalogBase = `/v1/admin/stores/${storeId}/catalog`;
  const category = await jsonRequest(`${catalogBase}/categories`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ name: 'Mídia' }) }, 201);
  const product = await jsonRequest(`${catalogBase}/products`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ title: 'Produto com imagem', primaryCategoryId: category.data.id }) }, 201);
  await jsonRequest(`${mediaBase}/products/${product.data.id}`, { method: 'PUT', headers: { authorization }, body: JSON.stringify({ mediaAssetId: upload.data.id, role: 'PRIMARY' }) });

  for (const target of [upload.data.url, upload.data.renditions[0].url]) {
    const response = await fetch(`http://127.0.0.1:4022${target}`);
    if (!response.ok || (await response.arrayBuffer()).byteLength === 0) throw new Error(`media delivery failed for ${target}`);
  }
  await jsonRequest(`/v1/admin/stores/${randomUUID()}/media/uploads`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ contentBase64: pngBase64 }) }, 401);
  console.log('STAGE6_MEDIA_FLOW_OK');
} finally {
  await app?.close();
  await prisma.productMedia.deleteMany({ where: { storeId } });
  await prisma.mediaRendition.deleteMany({ where: { storeId } });
  await prisma.mediaAsset.deleteMany({ where: { storeId } });
  await prisma.outboxEvent.deleteMany({ where: { storeId } });
  await prisma.productCategory.deleteMany({ where: { storeId } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
  await rm(mediaRoot, { recursive: true, force: true });
}
