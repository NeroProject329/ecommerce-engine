CREATE TYPE "CartStatus" AS ENUM ('ACTIVE','CONVERTED','ABANDONED','EXPIRED');
CREATE TYPE "CheckoutStatus" AS ENUM ('OPEN','SUBMITTED','COMPLETED','EXPIRED','FAILED');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT','PAID','FULFILLING','SHIPPED','DELIVERED','CANCELED','PAYMENT_FAILED','REFUND_PENDING','PARTIALLY_REFUNDED','REFUNDED');
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING','READY','SHIPPED','DELIVERED','CANCELED');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING','AUTHORIZED','CAPTURED','FAILED','CANCELED','PARTIALLY_REFUNDED','REFUNDED');
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING','SUCCEEDED','FAILED');
CREATE TYPE "WebhookSignatureState" AS ENUM ('VALID','INVALID','NOT_CHECKED');
CREATE TYPE "RefundStatus" AS ENUM ('PENDING','PROCESSING','SUCCEEDED','FAILED','CANCELED');

CREATE TABLE "carts" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "customerId" UUID, "anonymousKeyHash" VARCHAR(255),
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL', "status" "CartStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "carts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "carts_owner" CHECK (num_nonnulls("customerId", "anonymousKeyHash") = 1),
  CONSTRAINT "carts_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "carts_id_storeId_key" ON "carts"("id","storeId");
CREATE INDEX "carts_storeId_customerId_status_idx" ON "carts"("storeId","customerId","status");
CREATE INDEX "carts_storeId_anonymousKeyHash_status_idx" ON "carts"("storeId","anonymousKeyHash","status");
CREATE INDEX "carts_storeId_status_expiresAt_idx" ON "carts"("storeId","status","expiresAt");

CREATE TABLE "cart_items" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "cartId" UUID NOT NULL, "variantId" UUID NOT NULL,
  "quantity" INTEGER NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "cart_items_quantity" CHECK ("quantity" > 0)
);
CREATE UNIQUE INDEX "cart_items_storeId_cartId_variantId_key" ON "cart_items"("storeId","cartId","variantId");
CREATE INDEX "cart_items_storeId_variantId_cartId_idx" ON "cart_items"("storeId","variantId","cartId");

CREATE TABLE "shipping_quotes" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "cartId" UUID, "destinationPostalCode" VARCHAR(12) NOT NULL,
  "carrier" VARCHAR(120) NOT NULL, "service" VARCHAR(120) NOT NULL, "amountCents" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL', "providerQuoteId" VARCHAR(180), "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "shipping_quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipping_quotes_amount" CHECK ("amountCents" >= 0),
  CONSTRAINT "shipping_quotes_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "shipping_quotes_storeId_cartId_expiresAt_idx" ON "shipping_quotes"("storeId","cartId","expiresAt");

CREATE TABLE "checkout_sessions" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "cartId" UUID NOT NULL, "customerId" UUID,
  "status" "CheckoutStatus" NOT NULL DEFAULT 'OPEN', "idempotencyKey" VARCHAR(180) NOT NULL,
  "pricingSnapshot" JSONB NOT NULL, "expiresAt" TIMESTAMPTZ(3) NOT NULL, "submittedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "checkout_sessions_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "checkout_sessions_storeId_idempotencyKey_key" ON "checkout_sessions"("storeId","idempotencyKey");
CREATE INDEX "checkout_sessions_storeId_status_expiresAt_idx" ON "checkout_sessions"("storeId","status","expiresAt");

CREATE TABLE "orders" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "number" VARCHAR(80) NOT NULL, "customerId" UUID,
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT', "subtotalCents" BIGINT NOT NULL,
  "discountCents" BIGINT NOT NULL DEFAULT 0, "shippingCents" BIGINT NOT NULL DEFAULT 0,
  "taxCents" BIGINT NOT NULL DEFAULT 0, "totalCents" BIGINT NOT NULL, "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "addressSnapshotJson" JSONB NOT NULL, "pricingSnapshotJson" JSONB NOT NULL,
  "placedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_amounts" CHECK (
    "subtotalCents" >= 0 AND "discountCents" >= 0 AND "shippingCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0
    AND "totalCents" = "subtotalCents" - "discountCents" + "shippingCents" + "taxCents"
  )
);
CREATE UNIQUE INDEX "orders_storeId_number_key" ON "orders"("storeId","number");
CREATE UNIQUE INDEX "orders_id_storeId_key" ON "orders"("id","storeId");
CREATE INDEX "orders_storeId_status_placedAt_id_idx" ON "orders"("storeId","status","placedAt","id");
CREATE INDEX "orders_storeId_customerId_placedAt_id_idx" ON "orders"("storeId","customerId","placedAt","id");

CREATE TABLE "order_items" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "orderId" UUID NOT NULL, "variantId" UUID,
  "skuSnapshot" VARCHAR(120), "titleSnapshot" VARCHAR(240) NOT NULL, "attributesSnapshot" JSONB NOT NULL DEFAULT '{}',
  "quantity" INTEGER NOT NULL, "unitPriceCents" BIGINT NOT NULL, "discountCents" BIGINT NOT NULL DEFAULT 0,
  "taxCents" BIGINT NOT NULL DEFAULT 0, "totalCents" BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_amounts" CHECK (
    "quantity" > 0 AND "unitPriceCents" >= 0 AND "discountCents" >= 0 AND "taxCents" >= 0 AND "totalCents" >= 0
    AND "totalCents" = "unitPriceCents" * "quantity" - "discountCents" + "taxCents"
  )
);
CREATE INDEX "order_items_storeId_orderId_id_idx" ON "order_items"("storeId","orderId","id");
CREATE INDEX "order_items_storeId_variantId_idx" ON "order_items"("storeId","variantId");

CREATE TABLE "order_status_history" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "orderId" UUID NOT NULL, "fromStatus" "OrderStatus",
  "toStatus" "OrderStatus" NOT NULL, "actorType" VARCHAR(80) NOT NULL, "actorId" VARCHAR(180), "reason" VARCHAR(500),
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_status_history_change" CHECK ("fromStatus" IS NULL OR "fromStatus" <> "toStatus")
);
CREATE INDEX "order_status_history_storeId_orderId_changedAt_id_idx" ON "order_status_history"("storeId","orderId","changedAt","id");

CREATE TABLE "shipments" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "orderId" UUID NOT NULL, "carrier" VARCHAR(120) NOT NULL,
  "service" VARCHAR(120) NOT NULL, "shippingAmountCents" BIGINT NOT NULL, "trackingCode" VARCHAR(180),
  "trackingUrl" VARCHAR(2048), "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING', "shippedAt" TIMESTAMPTZ(3),
  "deliveredAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipments_amount" CHECK ("shippingAmountCents" >= 0),
  CONSTRAINT "shipments_dates" CHECK ("deliveredAt" IS NULL OR ("shippedAt" IS NOT NULL AND "deliveredAt" >= "shippedAt"))
);
CREATE INDEX "shipments_storeId_orderId_status_idx" ON "shipments"("storeId","orderId","status");
CREATE INDEX "shipments_storeId_trackingCode_idx" ON "shipments"("storeId","trackingCode");

CREATE TABLE "payments" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "orderId" UUID NOT NULL, "providerCode" VARCHAR(80) NOT NULL,
  "providerAccountRef" VARCHAR(180), "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "authorizedCents" BIGINT NOT NULL DEFAULT 0, "capturedCents" BIGINT NOT NULL DEFAULT 0,
  "refundedCents" BIGINT NOT NULL DEFAULT 0, "currency" CHAR(3) NOT NULL DEFAULT 'BRL', "externalPaymentId" VARCHAR(180),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"), CONSTRAINT "payments_amounts" CHECK (
    "authorizedCents" >= 0 AND "capturedCents" >= 0 AND "refundedCents" >= 0
    AND "capturedCents" <= "authorizedCents" AND "refundedCents" <= "capturedCents"
  )
);
CREATE UNIQUE INDEX "payments_id_storeId_key" ON "payments"("id","storeId");
CREATE UNIQUE INDEX "payments_storeId_providerCode_externalPaymentId_key" ON "payments"("storeId","providerCode","externalPaymentId");
CREATE INDEX "payments_storeId_orderId_status_idx" ON "payments"("storeId","orderId","status");

CREATE TABLE "payment_attempts" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "paymentId" UUID NOT NULL, "requestKey" VARCHAR(180) NOT NULL,
  "attempt" INTEGER NOT NULL, "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
  "providerResponseSafe" JSONB NOT NULL DEFAULT '{}', "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_attempts_number" CHECK ("attempt" > 0)
);
CREATE UNIQUE INDEX "payment_attempts_storeId_requestKey_key" ON "payment_attempts"("storeId","requestKey");
CREATE UNIQUE INDEX "payment_attempts_storeId_paymentId_attempt_key" ON "payment_attempts"("storeId","paymentId","attempt");
CREATE INDEX "payment_attempts_storeId_paymentId_status_idx" ON "payment_attempts"("storeId","paymentId","status");

CREATE TABLE "payment_webhook_events" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "providerCode" VARCHAR(80) NOT NULL, "providerEventId" VARCHAR(180) NOT NULL,
  "signatureState" "WebhookSignatureState" NOT NULL DEFAULT 'NOT_CHECKED', "payloadHash" CHAR(64) NOT NULL,
  "payloadSafe" JSONB NOT NULL DEFAULT '{}', "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMPTZ(3), CONSTRAINT "payment_webhook_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_webhook_events_hash" CHECK ("payloadHash" ~ '^[0-9a-f]{64}$')
);
CREATE UNIQUE INDEX "payment_webhook_events_providerCode_providerEventId_key" ON "payment_webhook_events"("providerCode","providerEventId");
CREATE INDEX "payment_webhook_events_storeId_processedAt_receivedAt_idx" ON "payment_webhook_events"("storeId","processedAt","receivedAt");

CREATE TABLE "refunds" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "paymentId" UUID NOT NULL, "amountCents" BIGINT NOT NULL,
  "reason" VARCHAR(500) NOT NULL, "externalRefundId" VARCHAR(180), "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "refunds_pkey" PRIMARY KEY ("id"), CONSTRAINT "refunds_amount" CHECK ("amountCents" > 0)
);
CREATE UNIQUE INDEX "refunds_storeId_externalRefundId_key" ON "refunds"("storeId","externalRefundId");
CREATE INDEX "refunds_storeId_paymentId_status_idx" ON "refunds"("storeId","paymentId","status");

ALTER TABLE "carts" ADD CONSTRAINT "carts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "carts" ADD CONSTRAINT "carts_customerId_storeId_fkey" FOREIGN KEY ("customerId","storeId") REFERENCES "customers"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cartId_storeId_fkey" FOREIGN KEY ("cartId","storeId") REFERENCES "carts"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variantId_storeId_fkey" FOREIGN KEY ("variantId","storeId") REFERENCES "product_variants"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipping_quotes" ADD CONSTRAINT "shipping_quotes_cartId_storeId_fkey" FOREIGN KEY ("cartId","storeId") REFERENCES "carts"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cartId_storeId_fkey" FOREIGN KEY ("cartId","storeId") REFERENCES "carts"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customerId_storeId_fkey" FOREIGN KEY ("customerId","storeId") REFERENCES "customers"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customerId_storeId_fkey" FOREIGN KEY ("customerId","storeId") REFERENCES "customers"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_storeId_fkey" FOREIGN KEY ("variantId","storeId") REFERENCES "product_variants"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_paymentId_storeId_fkey" FOREIGN KEY ("paymentId","storeId") REFERENCES "payments"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_paymentId_storeId_fkey" FOREIGN KEY ("paymentId","storeId") REFERENCES "payments"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_cartId_storeId_fkey" FOREIGN KEY ("cartId","storeId") REFERENCES "carts"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_orderId_storeId_fkey" FOREIGN KEY ("orderId","storeId") REFERENCES "orders"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customerId_storeId_fkey" FOREIGN KEY ("customerId","storeId") REFERENCES "customers"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
