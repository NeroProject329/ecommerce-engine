/* global console, fetch, process */
import { randomUUID } from 'node:crypto';
import { createPrismaClient } from '@ecommerce/database';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
process.env.NODE_ENV = 'test';
process.env.API_PORT = '4025';
const prisma = createPrismaClient();
const suffix = randomUUID();
const storeId = randomUUID();
const storeSlug = `stage9-${suffix}`;
let app;

async function request(path, init, expected = 200) {
  const headers = { ...(init?.headers ?? {}) };
  if (init?.body) headers['content-type'] = 'application/json';
  const response = await fetch(`http://127.0.0.1:4025${path}`, { ...init, headers });
  const body = response.status === 204 ? undefined : await response.json();
  if (response.status !== expected) throw new Error(`${path} expected ${expected}, received ${response.status}: ${JSON.stringify(body)}`);
  return body;
}

try {
  await prisma.store.create({ data: { id: storeId, slug: storeSlug, displayName: 'Stage 9 validation' } });
  const category = await prisma.category.create({ data: { storeId, slug: 'checkout', name: 'Checkout', path: 'checkout' } });
  const product = await prisma.product.create({ data: { storeId, slug: 'checkout-product', title: 'Checkout product', primaryCategoryId: category.id, publicationStatus: 'PUBLISHED', publishedAt: new Date() } });
  await prisma.productCategory.create({ data: { storeId, productId: product.id, categoryId: category.id } });
  const variant = await prisma.productVariant.create({ data: { storeId, productId: product.id, sku: `CHECKOUT-${suffix}` } });
  await prisma.price.create({ data: { storeId, variantId: variant.id, amountCents: 10000n } });
  const location = await prisma.inventoryLocation.create({ data: { storeId, code: 'MAIN', name: 'Main' } });
  const inventory = await prisma.inventory.create({ data: { storeId, variantId: variant.id, locationId: location.id, onHand: 5 } });
  const { bootstrap } = await import('../dist/main.js');
  app = await bootstrap();
  const base = `/v1/public/stores/${storeSlug}/carts`;
  const created = await request(base, { method: 'POST' }, 201);
  const cartId = created.data.cartId;
  const cartToken = created.data.cartToken;
  const headers = { 'x-cart-token': cartToken };
  await request(`${base}/${cartId}/items`, { method: 'PUT', headers, body: JSON.stringify({ variantId: variant.id, quantity: 2 }) });
  await request(`${base}/${cartId}`, { method: 'GET', headers: { 'x-cart-token': 'wrong-token' } }, 401);
  const quote = await request(`${base}/${cartId}/shipping-quotes`, { method: 'POST', headers, body: JSON.stringify({ destinationPostalCode: '74000-000' }) }, 201);
  const checkoutPayload = {
    idempotencyKey: `checkout-${suffix}`,
    shippingQuoteId: quote.data.id,
    address: { recipient: 'Test Buyer', postalCode: '74000-000', street: 'Rua Teste', number: '10', district: 'Centro', city: 'Goiânia', state: 'GO', country: 'BR' },
  };
  const first = await request(`${base}/${cartId}/checkout`, { method: 'POST', headers, body: JSON.stringify(checkoutPayload) }, 201);
  const replay = await request(`${base}/${cartId}/checkout`, { method: 'POST', headers, body: JSON.stringify(checkoutPayload) }, 201);
  if (first.data.orderId !== replay.data.orderId || first.data.subtotalCents !== 20000 || first.data.shippingCents !== 1690 || first.data.totalCents !== 21690) throw new Error('checkout totals or idempotency failed');
  const [orders, updatedInventory, reservation, shipment] = await Promise.all([
    prisma.order.count({ where: { storeId } }),
    prisma.inventory.findUniqueOrThrow({ where: { id: inventory.id } }),
    prisma.inventoryReservation.findFirst({ where: { storeId, orderId: first.data.orderId } }),
    prisma.shipment.findFirst({ where: { storeId, orderId: first.data.orderId } }),
  ]);
  if (orders !== 1 || updatedInventory.reserved !== 2 || reservation?.locationId !== location.id || !shipment) throw new Error('reservation or order snapshot failed');
  const second = await request(base, { method: 'POST' }, 201);
  await request(`${base}/${second.data.cartId}/items`, { method: 'PUT', headers: { 'x-cart-token': second.data.cartToken }, body: JSON.stringify({ variantId: variant.id, quantity: 4 }) }, 409);
  console.log('STAGE9_CHECKOUT_FLOW_OK');
} finally {
  await app?.close();
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
  await prisma.store.deleteMany({ where: { id: storeId } });
  await prisma.$disconnect();
}
