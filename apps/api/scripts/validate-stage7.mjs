/* global console, fetch, process, setTimeout */
import { randomBytes, randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashPassword } from '@ecommerce/auth';

if (!process.env.DATABASE_URL || !process.env.REDIS_URL) throw new Error('DATABASE_URL and REDIS_URL are required');
process.env.AUTH_ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4023';

const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage7-${suffix}`;
const email = `admin-${suffix}@example.test`;
const password = 'import validation password';
let app;
let worker;

async function request(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4023${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}`);
  return body;
}

async function awaitBatch(base, id, authorization) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const report = await request(`${base}/batches/${id}`, { method: 'GET', headers: { authorization } });
    if (['COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED'].includes(report.data.status)) return report.data;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('import batch timeout');
}

function batch(externalBatchId, title, amountCents, onHand) {
  return {
    contractVersion: '1.0',
    externalBatchId,
    sourceCode: 'collector',
    items: [{
      externalProductId: 'external-product-1',
      title,
      description: `Description ${title}`,
      category: { name: 'Importados' },
      variants: [{
        externalId: 'external-variant-1',
        sku: 'import sku 1',
        ean: '7894900011517',
        attributes: { cor: 'Azul' },
        price: { amountCents, currency: 'BRL' },
        inventory: [{ locationCode: 'principal', locationName: 'Estoque principal', onHand }],
      }],
    }],
  };
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 7 validation' } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Import owner' } });
  await prisma.rolePermission.createMany({ data: ['imports:read', 'imports:write'].map((permissionCode) => ({ roleId, permissionCode })) });
  await prisma.adminUser.create({ data: { id: adminUserId, emailNormalized: email, passwordHash: await hashPassword(password), status: 'ACTIVE' } });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });

  const { WorkerRuntime } = await import('../../worker/dist/worker-runtime.js');
  worker = new WorkerRuntime('stage7-worker', process.env.REDIS_URL);
  await worker.start();
  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();

  const login = await request('/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ storeSlug, email, password }) });
  const authorization = `Bearer ${login.data.token}`;
  const enrollment = await request('/v1/admin/auth/mfa/enroll', { method: 'POST', headers: { authorization } });
  await request('/v1/admin/auth/mfa/verify', { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: generateTotp(enrollment.data.secret) }) }, 204);
  const base = `/v1/admin/stores/${storeId}/imports`;
  await request(`${base}/sources`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: 'collector', name: 'Product Collector' }) }, 201);

  const firstPayload = batch(`batch-1-${suffix}`, 'Imported title', 12990, 5);
  const first = await request(`${base}/batches`, { method: 'POST', headers: { authorization }, body: JSON.stringify(firstPayload) }, 201);
  const duplicate = await request(`${base}/batches`, { method: 'POST', headers: { authorization }, body: JSON.stringify(firstPayload) }, 201);
  if (!duplicate.data.deduplicated || duplicate.data.id !== first.data.id) throw new Error('batch idempotency failed');
  const firstReport = await awaitBatch(base, first.data.id, authorization);
  if (firstReport.status !== 'COMPLETED' || firstReport.processed !== 1) throw new Error(`first import failed: ${JSON.stringify(firstReport.items)}`);
  const product = await prisma.product.findFirstOrThrow({ where: { storeId, title: 'Imported title' } });
  await prisma.product.update({ where: { id: product.id }, data: { title: 'Manual title' } });
  await prisma.importFieldOverride.create({ data: { storeId, productId: product.id, fieldPath: 'title', editedBy: adminUserId, policy: 'MANUAL_WINS' } });

  const secondPayload = batch(`batch-2-${suffix}`, 'Changed by import', 13990, 7);
  const second = await request(`${base}/batches`, { method: 'POST', headers: { authorization }, body: JSON.stringify(secondPayload) }, 201);
  const secondReport = await awaitBatch(base, second.data.id, authorization);
  if (secondReport.status !== 'COMPLETED') throw new Error('second import failed');
  const [products, variants, updated] = await Promise.all([
    prisma.product.count({ where: { storeId } }),
    prisma.productVariant.count({ where: { storeId } }),
    prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: { variants: { include: { inventory: true, prices: { orderBy: { createdAt: 'desc' } } } } } }),
  ]);
  if (products !== 1 || variants !== 1 || updated.title !== 'Manual title' || updated.description !== 'Description Changed by import') throw new Error('safe update or manual override failed');
  if (updated.variants[0].inventory[0].onHand !== 7 || updated.variants[0].prices[0].amountCents !== 13990n) throw new Error('variant update failed');

  const conflicting = { ...firstPayload, items: [{ ...firstPayload.items[0], title: 'Conflicting replay' }] };
  await request(`${base}/batches`, { method: 'POST', headers: { authorization }, body: JSON.stringify(conflicting) }, 409);
  console.log('STAGE7_IMPORT_FLOW_OK');
} finally {
  await app?.close();
  if (worker?.currentState() === 'running') await worker.stop();
  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.price.deleteMany({ where: { storeId } });
  await prisma.importFieldOverride.deleteMany({ where: { storeId } });
  await prisma.externalIdentity.deleteMany({ where: { storeId } });
  await prisma.productCategory.deleteMany({ where: { storeId } });
  await prisma.productVariant.deleteMany({ where: { storeId } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.inventoryLocation.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.brand.deleteMany({ where: { storeId } });
  await prisma.importItem.deleteMany({ where: { storeId } });
  await prisma.importBatch.deleteMany({ where: { storeId } });
  await prisma.importSource.deleteMany({ where: { storeId } });
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
