CREATE TYPE "IntegrationStatus" AS ENUM ('ACTIVE','DISABLED','ROTATING');
CREATE TYPE "ImportBatchStatus" AS ENUM ('RECEIVED','QUEUED','PROCESSING','COMPLETED','PARTIALLY_COMPLETED','FAILED','RETRYING');
CREATE TYPE "ImportItemStatus" AS ENUM ('PENDING','PROCESSING','COMPLETED','FAILED','SKIPPED');
CREATE TYPE "OverridePolicy" AS ENUM ('MANUAL_WINS','IMPORT_WINS','REVIEW_REQUIRED');
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT','ACTIVE','INACTIVE','ARCHIVED');

CREATE TABLE "integration_clients" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "clientId" VARCHAR(180) NOT NULL, "secretHash" VARCHAR(255) NOT NULL,
  "scopes" JSONB NOT NULL DEFAULT '[]', "status" "IntegrationStatus" NOT NULL DEFAULT 'ACTIVE', "rotatedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "integration_clients_pkey" PRIMARY KEY ("id"), CONSTRAINT "integration_clients_scopes" CHECK (jsonb_typeof("scopes") = 'array')
);
CREATE UNIQUE INDEX "integration_clients_storeId_clientId_key" ON "integration_clients"("storeId","clientId");
CREATE INDEX "integration_clients_storeId_status_idx" ON "integration_clients"("storeId","status");

CREATE TABLE "import_sources" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "code" VARCHAR(100) NOT NULL, "name" VARCHAR(180) NOT NULL,
  "allowedDomains" JSONB NOT NULL DEFAULT '[]', "provenancePolicy" JSONB NOT NULL DEFAULT '{}', "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "import_sources_pkey" PRIMARY KEY ("id"), CONSTRAINT "import_sources_domains" CHECK (jsonb_typeof("allowedDomains") = 'array')
);
CREATE UNIQUE INDEX "import_sources_storeId_code_key" ON "import_sources"("storeId","code");
CREATE UNIQUE INDEX "import_sources_id_storeId_key" ON "import_sources"("id","storeId");

CREATE TABLE "import_batches" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "sourceId" UUID NOT NULL, "externalBatchId" VARCHAR(180) NOT NULL,
  "payloadHash" CHAR(64) NOT NULL, "status" "ImportBatchStatus" NOT NULL DEFAULT 'RECEIVED', "total" INTEGER NOT NULL DEFAULT 0,
  "processed" INTEGER NOT NULL DEFAULT 0, "failed" INTEGER NOT NULL DEFAULT 0, "submittedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMPTZ(3), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id"), CONSTRAINT "import_batches_hash" CHECK ("payloadHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "import_batches_counters" CHECK ("total" >= 0 AND "processed" >= 0 AND "failed" >= 0 AND "processed" + "failed" <= "total")
);
CREATE UNIQUE INDEX "import_batches_storeId_sourceId_externalBatchId_key" ON "import_batches"("storeId","sourceId","externalBatchId");
CREATE UNIQUE INDEX "import_batches_id_storeId_key" ON "import_batches"("id","storeId");
CREATE INDEX "import_batches_storeId_status_submittedAt_id_idx" ON "import_batches"("storeId","status","submittedAt","id");

CREATE TABLE "import_items" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "batchId" UUID NOT NULL, "externalProductId" VARCHAR(180) NOT NULL,
  "status" "ImportItemStatus" NOT NULL DEFAULT 'PENDING', "attempts" INTEGER NOT NULL DEFAULT 0, "payloadJson" JSONB NOT NULL,
  "errorCode" VARCHAR(120), "errorDetailsSafe" JSONB, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "import_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "import_items_attempts" CHECK ("attempts" >= 0),
  CONSTRAINT "import_items_error_shape" CHECK (("status" = 'FAILED' AND "errorCode" IS NOT NULL) OR "status" <> 'FAILED')
);
CREATE UNIQUE INDEX "import_items_storeId_batchId_externalProductId_key" ON "import_items"("storeId","batchId","externalProductId");
CREATE INDEX "import_items_storeId_batchId_status_id_idx" ON "import_items"("storeId","batchId","status","id");

CREATE TABLE "import_field_overrides" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "productId" UUID NOT NULL, "fieldPath" VARCHAR(240) NOT NULL,
  "policy" "OverridePolicy" NOT NULL DEFAULT 'MANUAL_WINS', "editedBy" VARCHAR(180) NOT NULL,
  "editedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "import_field_overrides_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "import_field_overrides_storeId_productId_fieldPath_key" ON "import_field_overrides"("storeId","productId","fieldPath");

CREATE TABLE "external_identities" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "sourceId" UUID NOT NULL, "productId" UUID, "variantId" UUID,
  "externalId" VARCHAR(240) NOT NULL, "groupExternalId" VARCHAR(240), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "external_identities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "external_identities_target" CHECK (num_nonnulls("productId","variantId") = 1)
);
CREATE UNIQUE INDEX "external_identities_storeId_sourceId_externalId_key" ON "external_identities"("storeId","sourceId","externalId");
CREATE INDEX "external_identities_storeId_groupExternalId_idx" ON "external_identities"("storeId","groupExternalId");

CREATE TABLE "inbox_events" (
  "consumerName" VARCHAR(160) NOT NULL, "eventId" UUID NOT NULL, "processedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inbox_events_pkey" PRIMARY KEY ("consumerName","eventId")
);

CREATE TABLE "idempotency_records" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "scope" VARCHAR(160) NOT NULL, "requestKey" VARCHAR(180) NOT NULL,
  "requestHash" CHAR(64) NOT NULL, "responseCode" INTEGER NOT NULL, "responseSnapshot" JSONB NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id"), CONSTRAINT "idempotency_records_hash" CHECK ("requestHash" ~ '^[0-9a-f]{64}$'),
  CONSTRAINT "idempotency_records_code" CHECK ("responseCode" BETWEEN 100 AND 599),
  CONSTRAINT "idempotency_records_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "idempotency_records_storeId_scope_requestKey_key" ON "idempotency_records"("storeId","scope","requestKey");
CREATE INDEX "idempotency_records_expiresAt_idx" ON "idempotency_records"("expiresAt");

CREATE TABLE "audit_logs" (
  "id" UUID NOT NULL, "storeId" UUID, "actorType" VARCHAR(80) NOT NULL, "actorId" VARCHAR(180), "action" VARCHAR(160) NOT NULL,
  "objectType" VARCHAR(120) NOT NULL, "objectId" VARCHAR(180) NOT NULL, "diffRedactedJson" JSONB NOT NULL DEFAULT '{}',
  "requestId" VARCHAR(180), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "audit_logs_storeId_createdAt_id_idx" ON "audit_logs"("storeId","createdAt","id");
CREATE INDEX "audit_logs_storeId_objectType_objectId_createdAt_idx" ON "audit_logs"("storeId","objectType","objectId","createdAt");

CREATE TABLE "consent_records" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "customerId" UUID NOT NULL, "purpose" VARCHAR(160) NOT NULL,
  "channel" VARCHAR(80) NOT NULL, "granted" BOOLEAN NOT NULL, "source" VARCHAR(120) NOT NULL, "version" VARCHAR(80) NOT NULL,
  "recordedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "consent_records_storeId_customerId_purpose_channel_recordedAt_idx" ON "consent_records"("storeId","customerId","purpose","channel","recordedAt");

CREATE TABLE "storefront_banners" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "placement" VARCHAR(100) NOT NULL, "mediaId" UUID,
  "title" VARCHAR(180), "linkTarget" VARCHAR(2048), "position" INTEGER NOT NULL DEFAULT 0, "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3), "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT', "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "storefront_banners_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storefront_banners_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt")
);
CREATE INDEX "storefront_banners_storeId_placement_status_position_idx" ON "storefront_banners"("storeId","placement","status","position");

CREATE TABLE "storefront_sections" (
  "id" UUID NOT NULL, "storeId" UUID NOT NULL, "type" VARCHAR(100) NOT NULL, "title" VARCHAR(180),
  "configJson" JSONB NOT NULL DEFAULT '{}', "position" INTEGER NOT NULL DEFAULT 0, "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "storefront_sections_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "storefront_sections_storeId_position_key" ON "storefront_sections"("storeId","position");
CREATE INDEX "storefront_sections_storeId_status_position_idx" ON "storefront_sections"("storeId","status","position");

ALTER TABLE "integration_clients" ADD CONSTRAINT "integration_clients_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_sources" ADD CONSTRAINT "import_sources_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_sourceId_storeId_fkey" FOREIGN KEY ("sourceId","storeId") REFERENCES "import_sources"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_items" ADD CONSTRAINT "import_items_batchId_storeId_fkey" FOREIGN KEY ("batchId","storeId") REFERENCES "import_batches"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_field_overrides" ADD CONSTRAINT "import_field_overrides_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "import_field_overrides" ADD CONSTRAINT "import_field_overrides_productId_storeId_fkey" FOREIGN KEY ("productId","storeId") REFERENCES "products"("id","storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_sourceId_storeId_fkey" FOREIGN KEY ("sourceId","storeId") REFERENCES "import_sources"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_productId_storeId_fkey" FOREIGN KEY ("productId","storeId") REFERENCES "products"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "external_identities" ADD CONSTRAINT "external_identities_variantId_storeId_fkey" FOREIGN KEY ("variantId","storeId") REFERENCES "product_variants"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "idempotency_records" ADD CONSTRAINT "idempotency_records_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_customerId_storeId_fkey" FOREIGN KEY ("customerId","storeId") REFERENCES "customers"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "storefront_banners" ADD CONSTRAINT "storefront_banners_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "storefront_banners" ADD CONSTRAINT "storefront_banners_mediaId_storeId_fkey" FOREIGN KEY ("mediaId","storeId") REFERENCES "media_assets"("id","storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "storefront_sections" ADD CONSTRAINT "storefront_sections_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
