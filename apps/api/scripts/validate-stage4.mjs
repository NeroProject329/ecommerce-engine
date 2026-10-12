/* global console, fetch, process */
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashOpaqueToken, hashPassword } from '@ecommerce/auth';

if (!process.env.DATABASE_URL || !process.env.AUTH_ENCRYPTION_KEY_BASE64) {
  throw new Error('DATABASE_URL and AUTH_ENCRYPTION_KEY_BASE64 are required');
}

process.env.NODE_ENV = 'test';
process.env.API_PORT = '4020';

const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage4-${suffix}`;
const adminEmail = `admin-${suffix}@example.test`;
const customerEmail = `customer-${suffix}@example.test`;
const password = 'correct horse battery staple';
let customerId;
let app;

async function request(path, init) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4020${path}`, {
    ...init,
    headers,
  });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status >= 400) throw new Error(`${path} failed with ${response.status}`);
  return { response, body };
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 4 validation' } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Owner validation' } });
  await prisma.rolePermission.create({ data: { roleId, permissionCode: 'users:write' } });
  await prisma.adminUser.create({
    data: { id: adminUserId, emailNormalized: adminEmail, passwordHash: await hashPassword(password), status: 'ACTIVE' },
  });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });

  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();

  const registration = await request('/v1/customer/auth/register', {
    method: 'POST',
    body: JSON.stringify({ storeSlug, email: customerEmail, name: 'Synthetic customer', password }),
  });
  customerId = registration.body.data.customer.id;
  const customerLogin = await request('/v1/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ storeSlug, email: customerEmail, password }),
  });
  await request('/v1/customer/auth/logout', {
    method: 'POST',
    headers: { authorization: `Bearer ${customerLogin.body.data.token}` },
  });

  const adminLogin = await request('/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({ storeSlug, email: adminEmail, password }),
  });
  const authorization = `Bearer ${adminLogin.body.data.token}`;
  const enrollment = await request('/v1/admin/auth/mfa/enroll', {
    method: 'POST',
    headers: { authorization },
  });
  await request('/v1/admin/auth/mfa/verify', {
    method: 'POST',
    headers: { authorization },
    body: JSON.stringify({ code: generateTotp(enrollment.body.data.secret) }),
  });
  const { AdminAuthService } = await import('../dist/auth/admin-auth.service.js');
  const authorizationService = app.get(AdminAuthService);
  await authorizationService.authorize(adminLogin.body.data.token, storeId, 'users:write');
  let crossTenantDenied = false;
  try {
    await authorizationService.authorize(adminLogin.body.data.token, randomUUID(), 'users:write');
  } catch {
    crossTenantDenied = true;
  }
  if (!crossTenantDenied) throw new Error('cross-tenant authorization was not denied');
  await request('/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      storeSlug,
      email: adminEmail,
      password,
      totp: generateTotp(enrollment.body.data.secret),
    }),
  });
  await request('/v1/admin/auth/logout', { method: 'POST', headers: { authorization } });

  const newPassword = 'updated horse battery staple';
  const customerRecoveryToken = `customer-recovery-${randomUUID()}`;
  await prisma.customerCredential.update({
    where: { customerId },
    data: {
      resetTokenHash: hashOpaqueToken(customerRecoveryToken),
      resetExpiresAt: new Date(Date.now() + 60_000),
    },
  });
  await request('/v1/customer/auth/recovery/reset', {
    method: 'POST',
    body: JSON.stringify({ token: customerRecoveryToken, newPassword }),
  });
  await request('/v1/customer/auth/login', {
    method: 'POST',
    body: JSON.stringify({ storeSlug, email: customerEmail, password: newPassword }),
  });

  const adminRecoveryToken = `admin-recovery-${randomUUID()}`;
  await prisma.adminRecoveryToken.create({
    data: {
      adminUserId,
      tokenHash: hashOpaqueToken(adminRecoveryToken),
      expiresAt: new Date(Date.now() + 60_000),
    },
  });
  await request('/v1/admin/auth/recovery/reset', {
    method: 'POST',
    body: JSON.stringify({ token: adminRecoveryToken, newPassword }),
  });
  await request('/v1/admin/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      storeSlug,
      email: adminEmail,
      password: newPassword,
      totp: generateTotp(enrollment.body.data.secret),
    }),
  });

  console.log('STAGE4_AUTH_FLOW_OK');
} finally {
  await app?.close();
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  if (customerId) {
    await prisma.customerSession.deleteMany({ where: { customerId } });
    await prisma.customer.deleteMany({ where: { id: customerId } });
  }
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
