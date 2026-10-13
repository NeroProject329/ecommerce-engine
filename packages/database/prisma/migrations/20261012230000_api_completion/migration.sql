ALTER TABLE "outbox_events"
  ADD COLUMN "lastError" VARCHAR(1000),
  ADD COLUMN "lockedAt" TIMESTAMPTZ(3),
  ADD COLUMN "deadLetteredAt" TIMESTAMPTZ(3);

ALTER TABLE "shipments"
  ADD COLUMN "estimatedDeliveryAt" TIMESTAMPTZ(3);

CREATE TABLE "customer_favorites" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_favorites_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "customer_favorites_customerId_storeId_fkey" FOREIGN KEY ("customerId", "storeId") REFERENCES "customers"("id", "storeId") ON DELETE CASCADE,
  CONSTRAINT "customer_favorites_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "products"("id", "storeId") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "customer_favorites_storeId_customerId_productId_key" ON "customer_favorites"("storeId", "customerId", "productId");
CREATE INDEX "customer_favorites_storeId_customerId_createdAt_idx" ON "customer_favorites"("storeId", "customerId", "createdAt");

CREATE TABLE "shipping_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "type" VARCHAR(40) NOT NULL,
  "carrier" VARCHAR(120) NOT NULL,
  "service" VARCHAR(120) NOT NULL,
  "amountCents" BIGINT NOT NULL DEFAULT 0,
  "freeAboveCents" BIGINT,
  "minSubtotalCents" BIGINT,
  "maxSubtotalCents" BIGINT,
  "postalCodePrefixes" JSONB NOT NULL DEFAULT '[]',
  "estimatedDaysMin" INTEGER NOT NULL DEFAULT 1,
  "estimatedDaysMax" INTEGER NOT NULL DEFAULT 7,
  "handlingDays" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "shipping_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipping_rules_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "shipping_rules_storeId_code_key" ON "shipping_rules"("storeId", "code");
CREATE INDEX "shipping_rules_storeId_enabled_priority_idx" ON "shipping_rules"("storeId", "enabled", "priority");

CREATE TABLE "webhook_endpoints" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "url" VARCHAR(2048) NOT NULL,
  "secretEncrypted" VARCHAR(2048) NOT NULL,
  "eventTypes" JSONB NOT NULL DEFAULT '[]',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_endpoints_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT
);
CREATE INDEX "webhook_endpoints_storeId_enabled_idx" ON "webhook_endpoints"("storeId", "enabled");

CREATE TABLE "webhook_deliveries" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "endpointId" UUID NOT NULL,
  "outboxEventId" UUID NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "responseStatus" INTEGER,
  "lastError" VARCHAR(1000),
  "nextAttemptAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deliveredAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "webhook_deliveries_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "webhook_deliveries_endpointId_fkey" FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "webhook_deliveries_endpointId_outboxEventId_key" ON "webhook_deliveries"("endpointId", "outboxEventId");
CREATE INDEX "webhook_deliveries_storeId_status_nextAttemptAt_idx" ON "webhook_deliveries"("storeId", "status", "nextAttemptAt");

CREATE TABLE "notification_templates" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "code" VARCHAR(120) NOT NULL,
  "channel" VARCHAR(40) NOT NULL DEFAULT 'EMAIL',
  "subject" VARCHAR(240) NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notification_templates_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX "notification_templates_storeId_code_channel_key" ON "notification_templates"("storeId", "code", "channel");
CREATE INDEX "notification_templates_storeId_enabled_idx" ON "notification_templates"("storeId", "enabled");

CREATE TABLE "marketing_campaigns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "channel" VARCHAR(40) NOT NULL DEFAULT 'EMAIL',
  "subject" VARCHAR(240) NOT NULL,
  "bodyMarkdown" TEXT NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'DRAFT',
  "scheduledAt" TIMESTAMPTZ(3),
  "sentAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "marketing_campaigns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketing_campaigns_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT
);
CREATE INDEX "marketing_campaigns_storeId_status_scheduledAt_idx" ON "marketing_campaigns"("storeId", "status", "scheduledAt");
