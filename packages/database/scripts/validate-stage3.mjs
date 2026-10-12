/* global console, process */
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const { Client } = pg;
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required');
}

const client = new Client({ connectionString });

async function expectConstraint(name, operation) {
  await client.query(`SAVEPOINT ${name}`);

  try {
    await operation();
  } catch {
    await client.query(`ROLLBACK TO SAVEPOINT ${name}`);
    return;
  }

  throw new Error(`Expected database constraint to reject ${name}`);
}

await client.connect();

try {
  await client.query('BEGIN');

  const storeA = randomUUID();
  const storeB = randomUUID();
  const categoryA = randomUUID();
  const productA = randomUUID();
  const variantA = randomUUID();
  const locationA = randomUUID();
  const adminUser = randomUUID();
  const roleA = randomUUID();
  const globalRole = randomUUID();
  const customerA = randomUUID();
  const attributeA = randomUUID();
  const mediaA = randomUUID();
  const cartA = randomUUID();
  const orderA = randomUUID();

  await client.query(
    'INSERT INTO stores (id, slug, "displayName", "updatedAt") VALUES ($1, $2, $3, NOW()), ($4, $5, $6, NOW())',
    [storeA, `stage3-a-${storeA}`, 'Stage 3 A', storeB, `stage3-b-${storeB}`, 'Stage 3 B'],
  );
  await client.query(
    'INSERT INTO categories (id, "storeId", slug, name, path, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
    [categoryA, storeA, `category-${categoryA}`, 'Category A', `/category-${categoryA}`],
  );

  await expectConstraint('cross_tenant_product', () =>
    client.query(
      'INSERT INTO products (id, "storeId", "primaryCategoryId", slug, title, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [randomUUID(), storeB, categoryA, `invalid-${randomUUID()}`, 'Invalid cross-tenant product'],
    ),
  );

  await client.query(
    'INSERT INTO products (id, "storeId", "primaryCategoryId", slug, title, "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
    [productA, storeA, categoryA, `product-${productA}`, 'Valid product'],
  );
  await client.query(
    'INSERT INTO product_variants (id, "storeId", "productId", sku, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [variantA, storeA, productA, `SKU-${variantA}`],
  );
  await client.query(
    'INSERT INTO inventory_locations (id, "storeId", code, name, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [locationA, storeA, `LOC-${locationA}`, 'Main'],
  );

  await expectConstraint('invalid_inventory', () =>
    client.query(
      'INSERT INTO inventory (id, "storeId", "variantId", "locationId", "onHand", reserved, "updatedAt") VALUES ($1, $2, $3, $4, 1, 2, NOW())',
      [randomUUID(), storeA, variantA, locationA],
    ),
  );

  await expectConstraint('negative_price', () =>
    client.query(
      'INSERT INTO prices (id, "storeId", "variantId", "amountCents", "updatedAt") VALUES ($1, $2, $3, -1, NOW())',
      [randomUUID(), storeA, variantA],
    ),
  );

  await client.query(
    'INSERT INTO admin_users (id, "emailNormalized", "passwordHash", status, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [adminUser, `admin-${adminUser}@example.test`, 'test-hash-not-a-password', 'ACTIVE'],
  );
  await client.query(
    'INSERT INTO roles (id, "storeId", name, "updatedAt") VALUES ($1, $2, $3, NOW()), ($4, NULL, $5, NOW())',
    [roleA, storeA, `manager-${roleA}`, globalRole, `global-auditor-${globalRole}`],
  );

  await expectConstraint('cross_tenant_role_membership', () =>
    client.query(
      'INSERT INTO admin_memberships (id, "storeId", "adminUserId", "roleId", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      [randomUUID(), storeB, adminUser, roleA],
    ),
  );
  await client.query(
    'INSERT INTO admin_memberships (id, "storeId", "adminUserId", "roleId", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [randomUUID(), storeB, adminUser, globalRole],
  );

  await expectConstraint('non_normalized_customer_email', () =>
    client.query(
      'INSERT INTO customers (id, "storeId", "emailNormalized", name, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      [randomUUID(), storeA, 'UPPERCASE@example.test', 'Invalid customer'],
    ),
  );
  await client.query(
    'INSERT INTO customers (id, "storeId", "emailNormalized", name, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [customerA, storeA, `customer-${customerA}@example.test`, 'Customer A'],
  );

  const addressValues = [
    'Recipient',
    '01001000',
    'Example Street',
    '10',
    'Center',
    'Sao Paulo',
    'SP',
  ];
  await client.query(
    'INSERT INTO addresses (id, "storeId", "customerId", recipient, "postalCode", street, number, district, city, state, "isDefault", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())',
    [randomUUID(), storeA, customerA, ...addressValues],
  );
  await expectConstraint('cross_tenant_customer_address', () =>
    client.query(
      'INSERT INTO addresses (id, "storeId", "customerId", recipient, "postalCode", street, number, district, city, state, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())',
      [randomUUID(), storeB, customerA, ...addressValues],
    ),
  );
  await expectConstraint('duplicate_default_address', () =>
    client.query(
      'INSERT INTO addresses (id, "storeId", "customerId", recipient, "postalCode", street, number, district, city, state, "isDefault", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, NOW())',
      [randomUUID(), storeA, customerA, ...addressValues],
    ),
  );

  await expectConstraint('invalid_attribute_version', () =>
    client.query(
      'INSERT INTO attribute_definitions (id, "storeId", code, name, "dataType", version, "updatedAt") VALUES ($1, $2, $3, $4, $5, 0, NOW())',
      [randomUUID(), storeA, `invalid-${randomUUID()}`, 'Invalid attribute', 'TEXT'],
    ),
  );
  await client.query(
    'INSERT INTO attribute_definitions (id, "storeId", code, name, "dataType", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
    [attributeA, storeA, `color-${attributeA}`, 'Color', 'OPTION'],
  );
  await client.query(
    'INSERT INTO product_attribute_values ("storeId", "productId", "definitionId", "valueJson", "updatedAt") VALUES ($1, $2, $3, $4::jsonb, NOW())',
    [storeA, productA, attributeA, '"blue"'],
  );

  await expectConstraint('invalid_media_hash', () =>
    client.query(
      'INSERT INTO media_assets (id, "storeId", "storageKey", sha256, "mimeType", bytes, "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, NOW())',
      [randomUUID(), storeA, `invalid/${randomUUID()}.webp`, 'not-a-sha256', 'image/webp', 100],
    ),
  );
  await client.query(
    'INSERT INTO media_assets (id, "storeId", "storageKey", sha256, "mimeType", bytes, width, height, "processingStatus", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())',
    [mediaA, storeA, `catalog/${mediaA}.webp`, 'a'.repeat(64), 'image/webp', 100, 10, 10, 'READY'],
  );
  await client.query(
    'INSERT INTO product_media ("storeId", "productId", "mediaAssetId", role) VALUES ($1, $2, $3, $4)',
    [storeA, productA, mediaA, 'PRIMARY'],
  );

  await expectConstraint('reservation_without_owner', () =>
    client.query(
      'INSERT INTO inventory_reservations (id, "storeId", "variantId", quantity, "expiresAt", "updatedAt") VALUES ($1, $2, $3, 1, NOW() + INTERVAL \'10 minutes\', NOW())',
      [randomUUID(), storeA, variantA],
    ),
  );
  await expectConstraint('zero_inventory_movement', () =>
    client.query(
      'INSERT INTO inventory_movements (id, "storeId", "variantId", "locationId", delta, reason, "deduplicationKey") VALUES ($1, $2, $3, $4, 0, $5, $6)',
      [randomUUID(), storeA, variantA, locationA, 'TEST', `test-${randomUUID()}`],
    ),
  );
  await expectConstraint('invalid_promotion_percentage', () =>
    client.query(
      'INSERT INTO promotions (id, "storeId", name, "percentageDecimal", "updatedAt") VALUES ($1, $2, $3, 100.0001, NOW())',
      [randomUUID(), storeA, 'Invalid promotion'],
    ),
  );
  await expectConstraint('non_normalized_coupon', () =>
    client.query(
      'INSERT INTO coupons (id, "storeId", code, "rulesJson", "updatedAt") VALUES ($1, $2, $3, $4::jsonb, NOW())',
      [randomUUID(), storeA, 'lowercase', '{}'],
    ),
  );

  await expectConstraint('cart_without_owner', () =>
    client.query(
      'INSERT INTO carts (id, "storeId", "expiresAt", "updatedAt") VALUES ($1, $2, NOW() + INTERVAL \'1 day\', NOW())',
      [randomUUID(), storeA],
    ),
  );
  await client.query(
    'INSERT INTO carts (id, "storeId", "anonymousKeyHash", "expiresAt", "updatedAt") VALUES ($1, $2, $3, NOW() + INTERVAL \'1 day\', NOW())',
    [cartA, storeA, `anonymous-${cartA}`],
  );
  await expectConstraint('invalid_cart_quantity', () =>
    client.query(
      'INSERT INTO cart_items (id, "storeId", "cartId", "variantId", quantity, "updatedAt") VALUES ($1, $2, $3, $4, 0, NOW())',
      [randomUUID(), storeA, cartA, variantA],
    ),
  );
  await expectConstraint('invalid_order_total', () =>
    client.query(
      'INSERT INTO orders (id, "storeId", number, "subtotalCents", "totalCents", "addressSnapshotJson", "pricingSnapshotJson", "updatedAt") VALUES ($1, $2, $3, 1000, 999, $4::jsonb, $5::jsonb, NOW())',
      [randomUUID(), storeA, `INVALID-${randomUUID()}`, '{}', '{}'],
    ),
  );
  await client.query(
    'INSERT INTO orders (id, "storeId", number, "customerId", "subtotalCents", "totalCents", "addressSnapshotJson", "pricingSnapshotJson", "updatedAt") VALUES ($1, $2, $3, $4, 1000, 1000, $5::jsonb, $6::jsonb, NOW())',
    [orderA, storeA, `ORDER-${orderA}`, customerA, '{}', '{}'],
  );
  await expectConstraint('invalid_payment_amounts', () =>
    client.query(
      'INSERT INTO payments (id, "storeId", "orderId", "providerCode", "authorizedCents", "capturedCents", "refundedCents", "updatedAt") VALUES ($1, $2, $3, $4, 1000, 500, 600, NOW())',
      [randomUUID(), storeA, orderA, 'test-provider'],
    ),
  );
  await expectConstraint('invalid_webhook_hash', () =>
    client.query(
      'INSERT INTO payment_webhook_events (id, "storeId", "providerCode", "providerEventId", "payloadHash") VALUES ($1, $2, $3, $4, $5)',
      [randomUUID(), storeA, 'test-provider', `event-${randomUUID()}`, 'invalid-hash'],
    ),
  );

  const sourceA = randomUUID();
  await client.query(
    'INSERT INTO import_sources (id, "storeId", code, name, "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
    [sourceA, storeA, `source-${sourceA}`, 'Synthetic source'],
  );
  await expectConstraint('invalid_import_batch_hash', () =>
    client.query(
      'INSERT INTO import_batches (id, "storeId", "sourceId", "externalBatchId", "payloadHash", "updatedAt") VALUES ($1, $2, $3, $4, $5, NOW())',
      [randomUUID(), storeA, sourceA, `batch-${randomUUID()}`, 'invalid-hash'],
    ),
  );
  await expectConstraint('external_identity_without_target', () =>
    client.query(
      'INSERT INTO external_identities (id, "storeId", "sourceId", "externalId", "updatedAt") VALUES ($1, $2, $3, $4, NOW())',
      [randomUUID(), storeA, sourceA, `external-${randomUUID()}`],
    ),
  );
  await expectConstraint('invalid_idempotency_hash', () =>
    client.query(
      'INSERT INTO idempotency_records (id, "storeId", scope, "requestKey", "requestHash", "responseCode", "responseSnapshot", "expiresAt") VALUES ($1, $2, $3, $4, $5, 200, $6::jsonb, NOW() + INTERVAL \'1 day\')',
      [randomUUID(), storeA, 'checkout', `request-${randomUUID()}`, 'invalid-hash', '{}'],
    ),
  );
  await expectConstraint('invalid_banner_window', () =>
    client.query(
      'INSERT INTO storefront_banners (id, "storeId", placement, "startsAt", "endsAt", "updatedAt") VALUES ($1, $2, $3, NOW(), NOW() - INTERVAL \'1 minute\', NOW())',
      [randomUUID(), storeA, 'HOME_HERO'],
    ),
  );

  await client.query('ROLLBACK');
  console.log('STAGE3_DATABASE_CONSTRAINTS_OK');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  await client.end();
}
