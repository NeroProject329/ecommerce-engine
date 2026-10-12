-- CreateEnum
CREATE TYPE "CatalogStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "ProductPublicationStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ProductSourceMode" AS ENUM ('MANUAL', 'IMPORTED', 'HYBRID');
CREATE TYPE "VariantStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateTable
CREATE TABLE "brands" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "slug" VARCHAR(140) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "brands_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "parentId" UUID,
  "slug" VARCHAR(140) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "path" VARCHAR(1000) NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" "CatalogStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "categories_not_own_parent" CHECK ("parentId" IS NULL OR "parentId" <> "id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "brandId" UUID,
  "primaryCategoryId" UUID NOT NULL,
  "slug" VARCHAR(180) NOT NULL,
  "title" VARCHAR(240) NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "seo" JSONB NOT NULL DEFAULT '{}',
  "publicationStatus" "ProductPublicationStatus" NOT NULL DEFAULT 'DRAFT',
  "sourceMode" "ProductSourceMode" NOT NULL DEFAULT 'MANUAL',
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_publication_state" CHECK (
    ("publicationStatus" = 'PUBLISHED' AND "publishedAt" IS NOT NULL)
    OR ("publicationStatus" <> 'PUBLISHED')
  )
);

CREATE TABLE "product_categories" (
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_categories_pkey" PRIMARY KEY ("storeId", "productId", "categoryId")
);

CREATE TABLE "product_variants" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "sku" VARCHAR(120),
  "externalKey" VARCHAR(180),
  "ean" VARCHAR(14),
  "variantAttributes" JSONB NOT NULL DEFAULT '{}',
  "weightGrams" INTEGER,
  "lengthMm" INTEGER,
  "widthMm" INTEGER,
  "heightMm" INTEGER,
  "status" "VariantStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_variants_physical_values" CHECK (
    ("weightGrams" IS NULL OR "weightGrams" >= 0)
    AND ("lengthMm" IS NULL OR "lengthMm" >= 0)
    AND ("widthMm" IS NULL OR "widthMm" >= 0)
    AND ("heightMm" IS NULL OR "heightMm" >= 0)
  )
);

CREATE TABLE "inventory_locations" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_locations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "inventory" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "onHand" INTEGER NOT NULL DEFAULT 0,
  "reserved" INTEGER NOT NULL DEFAULT 0,
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_quantities" CHECK (
    "onHand" >= 0 AND "reserved" >= 0 AND "reserved" <= "onHand" AND "version" >= 1
  )
);

CREATE TABLE "prices" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "amountCents" BIGINT NOT NULL,
  "compareAtCents" BIGINT,
  "validFrom" TIMESTAMPTZ(3),
  "validTo" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "prices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "prices_non_negative" CHECK (
    "amountCents" >= 0 AND ("compareAtCents" IS NULL OR "compareAtCents" >= 0)
  ),
  CONSTRAINT "prices_valid_window" CHECK (
    "validFrom" IS NULL OR "validTo" IS NULL OR "validTo" > "validFrom"
  )
);

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL,
  "storeId" UUID,
  "aggregateType" VARCHAR(120) NOT NULL,
  "aggregateId" VARCHAR(180) NOT NULL,
  "eventType" VARCHAR(180) NOT NULL,
  "eventVersion" INTEGER NOT NULL DEFAULT 1,
  "payloadJson" JSONB NOT NULL,
  "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "availableAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publishedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_event_counters" CHECK ("eventVersion" >= 1 AND "attempts" >= 0)
);

-- CreateIndex
CREATE INDEX "brands_storeId_status_name_idx" ON "brands"("storeId", "status", "name");
CREATE UNIQUE INDEX "brands_storeId_slug_key" ON "brands"("storeId", "slug");
CREATE UNIQUE INDEX "brands_id_storeId_key" ON "brands"("id", "storeId");
CREATE INDEX "categories_storeId_parentId_position_idx" ON "categories"("storeId", "parentId", "position");
CREATE INDEX "categories_storeId_status_path_idx" ON "categories"("storeId", "status", "path");
CREATE UNIQUE INDEX "categories_storeId_slug_key" ON "categories"("storeId", "slug");
CREATE UNIQUE INDEX "categories_id_storeId_key" ON "categories"("id", "storeId");
CREATE INDEX "products_storeId_publicationStatus_createdAt_id_idx" ON "products"("storeId", "publicationStatus", "createdAt", "id");
CREATE INDEX "products_storeId_primaryCategoryId_id_idx" ON "products"("storeId", "primaryCategoryId", "id");
CREATE INDEX "products_storeId_brandId_id_idx" ON "products"("storeId", "brandId", "id");
CREATE UNIQUE INDEX "products_storeId_slug_key" ON "products"("storeId", "slug");
CREATE UNIQUE INDEX "products_id_storeId_key" ON "products"("id", "storeId");
CREATE INDEX "product_categories_storeId_categoryId_productId_idx" ON "product_categories"("storeId", "categoryId", "productId");
CREATE INDEX "product_variants_storeId_productId_status_idx" ON "product_variants"("storeId", "productId", "status");
CREATE UNIQUE INDEX "product_variants_storeId_sku_key" ON "product_variants"("storeId", "sku");
CREATE UNIQUE INDEX "product_variants_id_storeId_key" ON "product_variants"("id", "storeId");
CREATE INDEX "inventory_locations_storeId_active_name_idx" ON "inventory_locations"("storeId", "active", "name");
CREATE UNIQUE INDEX "inventory_locations_storeId_code_key" ON "inventory_locations"("storeId", "code");
CREATE UNIQUE INDEX "inventory_locations_id_storeId_key" ON "inventory_locations"("id", "storeId");
CREATE INDEX "inventory_storeId_locationId_variantId_idx" ON "inventory"("storeId", "locationId", "variantId");
CREATE UNIQUE INDEX "inventory_storeId_variantId_locationId_key" ON "inventory"("storeId", "variantId", "locationId");
CREATE INDEX "prices_storeId_variantId_currency_validFrom_idx" ON "prices"("storeId", "variantId", "currency", "validFrom");
CREATE INDEX "outbox_events_status_availableAt_id_idx" ON "outbox_events"("status", "availableAt", "id");
CREATE INDEX "outbox_events_storeId_aggregateType_aggregateId_idx" ON "outbox_events"("storeId", "aggregateType", "aggregateId");

-- AddForeignKey
ALTER TABLE "brands" ADD CONSTRAINT "brands_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_storeId_fkey" FOREIGN KEY ("parentId", "storeId") REFERENCES "categories"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_brandId_storeId_fkey" FOREIGN KEY ("brandId", "storeId") REFERENCES "brands"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "products" ADD CONSTRAINT "products_primaryCategoryId_storeId_fkey" FOREIGN KEY ("primaryCategoryId", "storeId") REFERENCES "categories"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "products"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_categoryId_storeId_fkey" FOREIGN KEY ("categoryId", "storeId") REFERENCES "categories"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "products"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "inventory_locations" ADD CONSTRAINT "inventory_locations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_locationId_storeId_fkey" FOREIGN KEY ("locationId", "storeId") REFERENCES "inventory_locations"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prices" ADD CONSTRAINT "prices_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prices" ADD CONSTRAINT "prices_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
