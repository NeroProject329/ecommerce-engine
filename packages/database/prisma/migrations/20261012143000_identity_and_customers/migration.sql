-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('INVITED', 'ACTIVE', 'DISABLED');
CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REVOKED');
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'ANONYMIZED');

-- CreateTable
CREATE TABLE "admin_users" (
  "id" UUID NOT NULL,
  "emailNormalized" VARCHAR(320) NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "status" "AccountStatus" NOT NULL DEFAULT 'INVITED',
  "mfaState" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_users_normalized_email" CHECK ("emailNormalized" = lower(btrim("emailNormalized")))
);

CREATE TABLE "roles" (
  "id" UUID NOT NULL,
  "storeId" UUID,
  "name" VARCHAR(120) NOT NULL,
  "immutable" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "role_permissions" (
  "roleId" UUID NOT NULL,
  "permissionCode" VARCHAR(160) NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId", "permissionCode")
);

CREATE TABLE "admin_memberships" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "roleId" UUID NOT NULL,
  "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "admin_memberships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_sessions" (
  "id" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "mfaVerifiedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_sessions_valid_window" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "customers" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "emailNormalized" VARCHAR(320) NOT NULL,
  "name" VARCHAR(180) NOT NULL,
  "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customers_normalized_email" CHECK ("emailNormalized" = lower(btrim("emailNormalized")))
);

CREATE TABLE "customer_credentials" (
  "customerId" UUID NOT NULL,
  "passwordHash" VARCHAR(255) NOT NULL,
  "verifiedAt" TIMESTAMPTZ(3),
  "resetTokenHash" VARCHAR(255),
  "resetExpiresAt" TIMESTAMPTZ(3),
  "passwordChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_credentials_pkey" PRIMARY KEY ("customerId"),
  CONSTRAINT "customer_credentials_reset_pair" CHECK (
    ("resetTokenHash" IS NULL AND "resetExpiresAt" IS NULL)
    OR ("resetTokenHash" IS NOT NULL AND "resetExpiresAt" IS NOT NULL)
  )
);

CREATE TABLE "customer_sessions" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "revokedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_sessions_valid_window" CHECK ("expiresAt" > "createdAt")
);

CREATE TABLE "addresses" (
  "id" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "recipient" VARCHAR(180) NOT NULL,
  "postalCode" VARCHAR(12) NOT NULL,
  "street" VARCHAR(220) NOT NULL,
  "number" VARCHAR(40) NOT NULL,
  "complement" VARCHAR(120),
  "district" VARCHAR(120) NOT NULL,
  "city" VARCHAR(120) NOT NULL,
  "state" CHAR(2) NOT NULL,
  "country" CHAR(2) NOT NULL DEFAULT 'BR',
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "addresses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "addresses_region_codes" CHECK (
    "state" = upper("state") AND "country" = upper("country")
  )
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_emailNormalized_key" ON "admin_users"("emailNormalized");
CREATE INDEX "admin_users_status_createdAt_idx" ON "admin_users"("status", "createdAt");
CREATE INDEX "roles_storeId_name_idx" ON "roles"("storeId", "name");
CREATE UNIQUE INDEX "roles_storeId_name_key" ON "roles"("storeId", "name");
CREATE UNIQUE INDEX "roles_global_name_key" ON "roles"("name") WHERE "storeId" IS NULL;
CREATE INDEX "role_permissions_permissionCode_roleId_idx" ON "role_permissions"("permissionCode", "roleId");
CREATE INDEX "admin_memberships_adminUserId_status_idx" ON "admin_memberships"("adminUserId", "status");
CREATE INDEX "admin_memberships_storeId_status_idx" ON "admin_memberships"("storeId", "status");
CREATE UNIQUE INDEX "admin_memberships_storeId_adminUserId_roleId_key" ON "admin_memberships"("storeId", "adminUserId", "roleId");
CREATE UNIQUE INDEX "admin_sessions_tokenHash_key" ON "admin_sessions"("tokenHash");
CREATE INDEX "admin_sessions_adminUserId_expiresAt_idx" ON "admin_sessions"("adminUserId", "expiresAt");
CREATE INDEX "customers_storeId_status_createdAt_idx" ON "customers"("storeId", "status", "createdAt");
CREATE UNIQUE INDEX "customers_storeId_emailNormalized_key" ON "customers"("storeId", "emailNormalized");
CREATE UNIQUE INDEX "customers_id_storeId_key" ON "customers"("id", "storeId");
CREATE UNIQUE INDEX "customer_credentials_resetTokenHash_key" ON "customer_credentials"("resetTokenHash");
CREATE UNIQUE INDEX "customer_sessions_tokenHash_key" ON "customer_sessions"("tokenHash");
CREATE INDEX "customer_sessions_storeId_customerId_expiresAt_idx" ON "customer_sessions"("storeId", "customerId", "expiresAt");
CREATE INDEX "addresses_storeId_customerId_isDefault_idx" ON "addresses"("storeId", "customerId", "isDefault");
CREATE UNIQUE INDEX "addresses_one_default_per_customer" ON "addresses"("storeId", "customerId") WHERE "isDefault" = true;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_memberships" ADD CONSTRAINT "admin_memberships_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_memberships" ADD CONSTRAINT "admin_memberships_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_memberships" ADD CONSTRAINT "admin_memberships_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_adminUserId_fkey" FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customers" ADD CONSTRAINT "customers_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_credentials" ADD CONSTRAINT "customer_credentials_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "customer_sessions" ADD CONSTRAINT "customer_sessions_customerId_storeId_fkey" FOREIGN KEY ("customerId", "storeId") REFERENCES "customers"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_customerId_storeId_fkey" FOREIGN KEY ("customerId", "storeId") REFERENCES "customers"("id", "storeId") ON DELETE CASCADE ON UPDATE CASCADE;

-- A membership can use a global role or a role belonging to the same store.
CREATE FUNCTION enforce_admin_membership_role_scope() RETURNS trigger AS $$
DECLARE
  role_store_id UUID;
BEGIN
  SELECT "storeId" INTO role_store_id FROM "roles" WHERE "id" = NEW."roleId";
  IF role_store_id IS NOT NULL AND role_store_id <> NEW."storeId" THEN
    RAISE EXCEPTION 'role and membership belong to different stores' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "admin_memberships_role_scope"
BEFORE INSERT OR UPDATE OF "storeId", "roleId" ON "admin_memberships"
FOR EACH ROW EXECUTE FUNCTION enforce_admin_membership_role_scope();
