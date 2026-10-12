-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');
CREATE TYPE "PromotionStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ENDED');
CREATE TYPE "PromotionTargetType" AS ENUM ('STORE', 'CATEGORY', 'PRODUCT', 'VARIANT');

-- CreateTable
CREATE TABLE "inventory_reservations" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "orderId" UUID,
  "cartId" UUID,
  "quantity" INTEGER NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "releasedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_reservations_quantity" CHECK ("quantity" > 0),
  CONSTRAINT "inventory_reservations_owner" CHECK (num_nonnulls("orderId", "cartId") = 1),
  CONSTRAINT "inventory_reservations_release_state" CHECK (
    ("status" IN ('RELEASED', 'EXPIRED') AND "releasedAt" IS NOT NULL)
    OR ("status" IN ('ACTIVE', 'CONSUMED'))
  )
);

CREATE TABLE "inventory_movements" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "locationId" UUID NOT NULL,
  "delta" INTEGER NOT NULL,
  "reason" VARCHAR(120) NOT NULL,
  "actorRef" VARCHAR(180),
  "deduplicationKey" VARCHAR(180) NOT NULL,
  "metadataJson" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "inventory_movements_nonzero" CHECK ("delta" <> 0)
);

CREATE TABLE "price_history" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "variantId" UUID NOT NULL,
  "previousCents" BIGINT,
  "newCents" BIGINT NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
  "changedBy" VARCHAR(180) NOT NULL,
  "reason" VARCHAR(500),
  "changedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "price_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "price_history_non_negative" CHECK (
    "newCents" >= 0 AND ("previousCents" IS NULL OR "previousCents" >= 0)
  )
);

CREATE TABLE "promotions" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "status" "PromotionStatus" NOT NULL DEFAULT 'DRAFT',
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "percentageDecimal" DECIMAL(7,4) NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "promotions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotions_percentage" CHECK ("percentageDecimal" >= 0 AND "percentageDecimal" <= 100),
  CONSTRAINT "promotions_valid_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "promotion_targets" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "promotionId" UUID NOT NULL,
  "targetType" "PromotionTargetType" NOT NULL,
  "targetId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "promotion_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "promotion_targets_shape" CHECK (
    ("targetType" = 'STORE' AND "targetId" IS NULL)
    OR ("targetType" <> 'STORE' AND "targetId" IS NOT NULL)
  )
);

CREATE TABLE "coupons" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "code" VARCHAR(80) NOT NULL,
  "rulesJson" JSONB NOT NULL,
  "maxUses" INTEGER,
  "startsAt" TIMESTAMPTZ(3),
  "endsAt" TIMESTAMPTZ(3),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coupons_normalized_code" CHECK ("code" = upper(btrim("code"))),
  CONSTRAINT "coupons_max_uses" CHECK ("maxUses" IS NULL OR "maxUses" > 0),
  CONSTRAINT "coupons_valid_window" CHECK ("startsAt" IS NULL OR "endsAt" IS NULL OR "endsAt" > "startsAt")
);

CREATE TABLE "coupon_redemptions" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "couponId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "customerId" UUID,
  "redeemedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inventory_reservations_storeId_status_expiresAt_id_idx" ON "inventory_reservations"("storeId", "status", "expiresAt", "id");
CREATE INDEX "inventory_reservations_storeId_variantId_status_idx" ON "inventory_reservations"("storeId", "variantId", "status");
CREATE UNIQUE INDEX "inventory_movements_storeId_deduplicationKey_key" ON "inventory_movements"("storeId", "deduplicationKey");
CREATE INDEX "inventory_movements_storeId_variantId_createdAt_id_idx" ON "inventory_movements"("storeId", "variantId", "createdAt", "id");
CREATE INDEX "inventory_movements_storeId_locationId_createdAt_id_idx" ON "inventory_movements"("storeId", "locationId", "createdAt", "id");
CREATE INDEX "price_history_storeId_variantId_changedAt_id_idx" ON "price_history"("storeId", "variantId", "changedAt", "id");
CREATE UNIQUE INDEX "promotions_id_storeId_key" ON "promotions"("id", "storeId");
CREATE INDEX "promotions_storeId_status_startsAt_endsAt_idx" ON "promotions"("storeId", "status", "startsAt", "endsAt");
CREATE UNIQUE INDEX "promotion_targets_storeId_promotionId_targetType_targetId_key" ON "promotion_targets"("storeId", "promotionId", "targetType", "targetId");
CREATE UNIQUE INDEX "promotion_targets_store_scope_key" ON "promotion_targets"("storeId", "promotionId") WHERE "targetType" = 'STORE';
CREATE INDEX "promotion_targets_storeId_targetType_targetId_idx" ON "promotion_targets"("storeId", "targetType", "targetId");
CREATE UNIQUE INDEX "coupons_storeId_code_key" ON "coupons"("storeId", "code");
CREATE UNIQUE INDEX "coupons_id_storeId_key" ON "coupons"("id", "storeId");
CREATE INDEX "coupons_storeId_active_startsAt_endsAt_idx" ON "coupons"("storeId", "active", "startsAt", "endsAt");
CREATE UNIQUE INDEX "coupon_redemptions_storeId_couponId_orderId_key" ON "coupon_redemptions"("storeId", "couponId", "orderId");
CREATE INDEX "coupon_redemptions_storeId_customerId_redeemedAt_idx" ON "coupon_redemptions"("storeId", "customerId", "redeemedAt");

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_locationId_storeId_fkey" FOREIGN KEY ("locationId", "storeId") REFERENCES "inventory_locations"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_variantId_storeId_fkey" FOREIGN KEY ("variantId", "storeId") REFERENCES "product_variants"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "promotion_targets" ADD CONSTRAINT "promotion_targets_promotionId_storeId_fkey" FOREIGN KEY ("promotionId", "storeId") REFERENCES "promotions"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_storeId_fkey" FOREIGN KEY ("couponId", "storeId") REFERENCES "coupons"("id", "storeId") ON DELETE RESTRICT ON UPDATE CASCADE;
