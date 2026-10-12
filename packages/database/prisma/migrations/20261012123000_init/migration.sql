-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DomainStatus" AS ENUM ('PENDING', 'VERIFIED', 'DISABLED');

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "displayName" VARCHAR(160) NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "currency" CHAR(3) NOT NULL DEFAULT 'BRL',
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Sao_Paulo',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_domains" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "hostname" VARCHAR(253) NOT NULL,
    "status" "DomainStatus" NOT NULL DEFAULT 'PENDING',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_domains_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "stores_slug_key" ON "stores"("slug");

-- CreateIndex
CREATE INDEX "stores_status_createdAt_idx" ON "stores"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "store_domains_hostname_key" ON "store_domains"("hostname");

-- CreateIndex
CREATE INDEX "store_domains_storeId_status_idx" ON "store_domains"("storeId", "status");

-- AddForeignKey
ALTER TABLE "store_domains"
ADD CONSTRAINT "store_domains_storeId_fkey"
FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
