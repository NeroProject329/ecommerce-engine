ALTER TABLE "orders" ADD COLUMN "accessKeyHash" VARCHAR(255);
CREATE UNIQUE INDEX "orders_accessKeyHash_key" ON "orders"("accessKeyHash");
