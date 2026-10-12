-- CreateEnum
CREATE TYPE "AttributeDataType" AS ENUM ('TEXT', 'NUMBER', 'BOOLEAN', 'OPTION', 'MULTI_OPTION');
CREATE TYPE "MediaProcessingStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
CREATE TYPE "MediaRole" AS ENUM ('PRIMARY', 'GALLERY', 'THUMBNAIL', 'SWATCH');

-- CreateTable
CREATE TABLE "attribute_definitions" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "name" VARCHAR(160) NOT NULL,
  "dataType" "AttributeDataType" NOT NULL,
  "unit" VARCHAR(40),
  "optionsJson" JSONB NOT NULL DEFAULT '[]',
  "version" INTEGER NOT NULL DEFAULT 1,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "attribute_definitions_version" CHECK ("version" >= 1),
  CONSTRAINT "attribute_definitions_option_shape" CHECK (
    "dataType" NOT IN ('OPTION', 'MULTI_OPTION') OR jsonb_typeof("optionsJson") = 'array'
  )
);

CREATE TABLE "category_attributes" (
  "storeId" UUID NOT NULL,
  "categoryId" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT false,
  "filterable" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "category_attributes_pkey" PRIMARY KEY ("storeId", "categoryId", "definitionId")
);

CREATE TABLE "product_attribute_values" (
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  "valueJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("storeId", "productId", "definitionId")
);

CREATE TABLE "variant_attribute_values" (
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "definitionId" UUID NOT NULL,
  "valueJson" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "variant_attribute_values_pkey" PRIMARY KEY ("storeId", "variantId", "definitionId")
);

CREATE TABLE "media_assets" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "storageKey" VARCHAR(1024) NOT NULL,
  "sha256" CHAR(64) NOT NULL,
  "mimeType" VARCHAR(120) NOT NULL,
  "bytes" BIGINT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "durationMs" INTEGER,
  "processingStatus" "MediaProcessingStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_assets_dimensions" CHECK (
    "bytes" >= 0
    AND ("width" IS NULL OR "width" >= 0)
    AND ("height" IS NULL OR "height" >= 0)
    AND ("durationMs" IS NULL OR "durationMs" >= 0)
  ),
  CONSTRAINT "media_assets_sha256" CHECK ("sha256" ~ '^[0-9a-f]{64}$')
);

CREATE TABLE "media_renditions" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "mediaAssetId" UUID NOT NULL,
  "format" VARCHAR(20) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "storageKey" VARCHAR(1024) NOT NULL,
  "bytes" BIGINT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "media_renditions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "media_renditions_dimensions" CHECK (
    "width" > 0 AND "height" > 0 AND "bytes" >= 0
  )
);

CREATE TABLE "product_media" (
  "storeId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "mediaAssetId" UUID NOT NULL,
  "role" "MediaRole" NOT NULL DEFAULT 'GALLERY',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_media_pkey" PRIMARY KEY ("storeId", "productId", "mediaAssetId", "role")
);

CREATE TABLE "variant_media" (
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "mediaAssetId" UUID NOT NULL,
  "role" "MediaRole" NOT NULL DEFAULT 'GALLERY',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "variant_media_pkey" PRIMARY KEY ("storeId", "variantId", "mediaAssetId", "role")
);

-- CreateIndex
CREATE UNIQUE INDEX "attribute_definitions_storeId_code_key" ON "attribute_definitions"("storeId", "code");
CREATE UNIQUE INDEX "attribute_definitions_id_storeId_key" ON "attribute_definitions"("id", "storeId");
CREATE INDEX "attribute_definitions_storeId_active_name_idx" ON "attribute_definitions"("storeId", "active", "name");
CREATE INDEX "category_attributes_storeId_definitionId_categoryId_idx" ON "category_attributes"("storeId", "definitionId", "categoryId");
CREATE INDEX "product_attribute_values_storeId_definitionId_productId_idx" ON "product_attribute_values"("storeId", "definitionId", "productId");
CREATE INDEX "variant_attribute_values_storeId_definitionId_variantId_idx" ON "variant_attribute_values"("storeId", "definitionId", "variantId");
CREATE UNIQUE INDEX "media_assets_storeId_storageKey_key" ON "media_assets"("storeId", "storageKey");
CREATE UNIQUE INDEX "media_assets_storeId_sha256_key" ON "media_assets"("storeId", "sha256");
CREATE UNIQUE INDEX "media_assets_id_storeId_key" ON "media_assets"("id", "storeId");
CREATE INDEX "media_assets_storeId_processingStatus_createdAt_idx" ON "media_assets"("storeId", "processingStatus", "createdAt");
CREATE UNIQUE INDEX "media_renditions_storeId_mediaAssetId_format_width_height_key" ON "media_renditions"("storeId", "mediaAssetId", "format", "width", "height");
CREATE UNIQUE INDEX "media_renditions_storeId_storageKey_key" ON "media_renditions"("storeId", "storageKey");
CREATE INDEX "product_media_storeId_productId_role_sortOrder_idx" ON "product_media"("storeId", "productId", "role", "sortOrder");
CREATE INDEX "variant_media_storeId_variantId_role_sortOrder_idx" ON "variant_media"("storeId", "variantId", "role", "sortOrder");

-- AddForeignKey
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "attribute_definitions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_categoryId_storeId_fkey" FOREIGN KEY ("categoryId", "storeId") REFERENCES "categories"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "category_attributes" ADD CONSTRAINT "category_attributes_definitionId_storeId_fkey" FOREIGN KEY ("definitionId", "storeId") REFERENCES "attribute_definitions"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "products"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_definitionId_storeId_fkey" FOREIGN KEY ("definitionId", "storeId") REFERENCES "attribute_definitions"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "variant_attribute_values_definitionId_storeId_fkey" FOREIGN KEY ("definitionId", "storeId") REFERENCES "attribute_definitions"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "media_renditions" ADD CONSTRAINT "media_renditions_mediaAssetId_storeId_fkey" FOREIGN KEY ("mediaAssetId", "storeId") REFERENCES "media_assets"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_productId_storeId_fkey" FOREIGN KEY ("productId", "storeId") REFERENCES "products"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_mediaAssetId_storeId_fkey" FOREIGN KEY ("mediaAssetId", "storeId") REFERENCES "media_assets"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "variant_media" ADD CONSTRAINT "variant_media_mediaAssetId_storeId_fkey" FOREIGN KEY ("mediaAssetId", "storeId") REFERENCES "media_assets"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
