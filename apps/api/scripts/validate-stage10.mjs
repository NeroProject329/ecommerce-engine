/* global console, fetch, process */
import { randomBytes, randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';
import { generateTotp, hashPassword } from '@ecommerce/auth';
import { signWebhookPayload } from '@ecommerce/payments';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
process.env.AUTH_ENCRYPTION_KEY_BASE64 ||= randomBytes(32).toString('base64');
process.env.PAYMENT_WEBHOOK_SECRET ||= randomBytes(32).toString('hex');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4026';
const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const roleId = randomUUID();
const adminUserId = randomUUID();
const storeSlug = `stage10-${suffix}`;
const email = `admin-${suffix}@example.test`;
const password = 'payments validation password';
let app;

async function request(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4026${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 10 validation' } });
  const category = await prisma.category.create({ data: { storeId, slug: 'payments', name: 'Payments', path: 'payments' } });
  const product = await prisma.product.create({ data: { storeId, slug: 'paid-product', title: 'Paid product', primaryCategoryId: category.id, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
  await prisma.productCategory.create({ data: { storeId, productId: product.id, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { storeId, productId: product.id, sku: `PAY-${suffix}` } });
  await prisma.price.create({ data: { storeId, variantId: variant.id, amountCents: 10000n } });
  const location = await prisma.inventoryLocation.create({ data: { storeId, code: 'MAIN', name: 'Main' } });
  const inventory = await prisma.inventory.create({ data: { storeId, variantId: variant.id, locationId: location.id, onHand: 5 } });
  await prisma.role.create({ data: { id: roleId, storeId, name: 'Payments owner' } });
  await prisma.rolePermission.create({ data: { roleId, permissionCode: 'payments:refund' } });
  await prisma.adminUser.create({ data: { id: adminUserId, emailNormalized: email, passwordHash: await hashPassword(password), status: 'ACTIVE' } });
  await prisma.adminMembership.create({ data: { storeId, adminUserId, roleId } });

  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();
  const cartsBase = `/v1/public/stores/${storeSlug}/carts`;
  const cart = await request(cartsBase, { method: 'POST' }, 201);
  const cartHeaders = { 'x-cart-token': cart.data.cartToken };
  await request(`${cartsBase}/${cart.data.cartId}/items`, { method: 'PUT', headers: cartHeaders, body: JSON.stringify({ variantId: variant.id, quantity: 2 }) });
  const quote = await request(`${cartsBase}/${cart.data.cartId}/shipping-quotes`, { method: 'POST', headers: cartHeaders, body: JSON.stringify({ destinationPostalCode: '74000-000' }) }, 201);
  const checkout = await request(`${cartsBase}/${cart.data.cartId}/checkout`, {
    method: 'POST',
    headers: cartHeaders,
    body: JSON.stringify({
      idempotencyKey: `checkout-${suffix}`,
      shippingQuoteId: quote.data.id,
      address: { recipient: 'Test Buyer', postalCode: '74000-000', street: 'Rua Teste', number: '10', district: 'Centro', city: 'Goiânia', state: 'GO', country: 'BR' },
    }),
  }, 201);
  const paymentPayload = { providerCode: 'sandbox', idempotencyKey: `payment-${suffix}` };
  const paymentsBase = `/v1/public/stores/${storeSlug}/orders/${checkout.data.orderId}/payments`;
  const orderHeaders = { 'x-order-token': checkout.data.orderAccessToken };
  const payment = await request(paymentsBase, { method: 'POST', headers: orderHeaders, body: JSON.stringify(paymentPayload) }, 201);
  const replay = await request(paymentsBase, { method: 'POST', headers: orderHeaders, body: JSON.stringify(paymentPayload) }, 201);
  if (payment.data.id !== replay.data.id || payment.data.status !== 'CAPTURED' || payment.data.capturedCents !== 21690) throw new Error('payment capture or idempotency failed');

  const [paidOrder, updatedInventory, reservation, movements] = await Promise.all([
    prisma.order.findUniqueOrThrow({ where: { id: checkout.data.orderId } }),
    prisma.inventory.findUniqueOrThrow({ where: { id: inventory.id } }),
    prisma.inventoryReservation.findFirstOrThrow({ where: { storeId, orderId: checkout.data.orderId } }),
    prisma.inventoryMovement.count({ where: { storeId, actorRef: payment.data.id } }),
  ]);
  if (paidOrder.status !== 'PAID' || updatedInventory.onHand !== 3 || updatedInventory.reserved !== 0 || reservation.status !== 'CONSUMED' || movements !== 1) throw new Error('order capture inventory transition failed');

  const login = await request('/v1/admin/auth/login', { method: 'POST', body: JSON.stringify({ storeSlug, email, password }) });
  const authorization = `Bearer ${login.data.token}`;
  const enrollment = await request('/v1/admin/auth/mfa/enroll', { method: 'POST', headers: { authorization } });
  await request('/v1/admin/auth/mfa/verify', { method: 'POST', headers: { authorization }, body: JSON.stringify({ code: generateTotp(enrollment.data.secret) }) }, 204);
  const refund = await request(`/v1/admin/stores/${storeId}/payments/${payment.data.id}/refunds`, { method: 'POST', headers: { authorization }, body: JSON.stringify({ amountCents: 5000, reason: 'Stage 10 partial refund' }) }, 201);
  if (refund.data.status !== 'SUCCEEDED') throw new Error('refund failed');
  const partiallyRefunded = await prisma.order.findUniqueOrThrow({ where: { id: checkout.data.orderId } });
  if (partiallyRefunded.status !== 'PARTIALLY_REFUNDED') throw new Error('partial refund order transition failed');

  const webhookPayload = { storeId, eventId: `event-${suffix}`, type: 'payment.captured', externalPaymentId: 'sandbox-external', status: 'CAPTURED' };
  const webhookBody = JSON.stringify(webhookPayload);
  const signature = signWebhookPayload(webhookBody, process.env.PAYMENT_WEBHOOK_SECRET);
  const webhook = await request('/v1/webhooks/payments/sandbox', { method: 'POST', headers: { 'x-payment-signature': signature }, body: webhookBody }, 201);
  const duplicate = await request('/v1/webhooks/payments/sandbox', { method: 'POST', headers: { 'x-payment-signature': signature }, body: webhookBody }, 201);
  if (webhook.data.duplicate || !duplicate.data.duplicate) throw new Error('webhook deduplication failed');
  console.log('STAGE10_PAYMENTS_FLOW_OK');
} finally {
  await app?.close();
  await prisma.auditLog.deleteMany({ where: { storeId } });
  await prisma.paymentWebhookEvent.deleteMany({ where: { storeId } });
  await prisma.refund.deleteMany({ where: { storeId } });
  await prisma.paymentAttempt.deleteMany({ where: { storeId } });
  await prisma.payment.deleteMany({ where: { storeId } });
  await prisma.inventoryMovement.deleteMany({ where: { storeId } });
  await prisma.idempotencyRecord.deleteMany({ where: { storeId } });
  await prisma.inventoryReservation.deleteMany({ where: { storeId } });
  await prisma.shipment.deleteMany({ where: { storeId } });
  await prisma.orderStatusHistory.deleteMany({ where: { storeId } });
  await prisma.orderItem.deleteMany({ where: { storeId } });
  await prisma.order.deleteMany({ where: { storeId } });
  await prisma.checkoutSession.deleteMany({ where: { storeId } });
  await prisma.shippingQuote.deleteMany({ where: { storeId } });
  await prisma.cartItem.deleteMany({ where: { storeId } });
  await prisma.cart.deleteMany({ where: { storeId } });
  await prisma.inventory.deleteMany({ where: { storeId } });
  await prisma.price.deleteMany({ where: { storeId } });
  await prisma.productCategory.deleteMany({ where: { storeId } });
  await prisma.productVariant.deleteMany({ where: { storeId } });
  await prisma.product.deleteMany({ where: { storeId } });
  await prisma.inventoryLocation.deleteMany({ where: { storeId } });
  await prisma.category.deleteMany({ where: { storeId } });
  await prisma.adminSession.deleteMany({ where: { adminUserId } });
  await prisma.adminMembership.deleteMany({ where: { adminUserId } });
  await prisma.rolePermission.deleteMany({ where: { roleId } });
  await prisma.role.deleteMany({ where: { id: roleId } });
  await prisma.adminUser.deleteMany({ where: { id: adminUserId } });
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
