ALTER TABLE "inventory_reservations" ADD COLUMN "locationId" UUID;

UPDATE "inventory_reservations" reservation
SET "locationId" = inventory."locationId"
FROM "inventory"
WHERE inventory."storeId" = reservation."storeId"
  AND inventory."variantId" = reservation."variantId"
  AND reservation."locationId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "inventory_reservations" WHERE "locationId" IS NULL) THEN
    RAISE EXCEPTION 'Cannot assign inventory location to existing reservation';
  END IF;
END $$;

ALTER TABLE "inventory_reservations" ALTER COLUMN "locationId" SET NOT NULL;
CREATE INDEX "inventory_reservations_storeId_locationId_status_idx" ON "inventory_reservations"("storeId", "locationId", "status");
ALTER TABLE "inventory_reservations"
  ADD CONSTRAINT "inventory_reservations_locationId_storeId_fkey"
  FOREIGN KEY ("locationId", "storeId") REFERENCES "inventory_locations"("id", "storeId")
  ON DELETE RESTRICT ON UPDATE CASCADE;
