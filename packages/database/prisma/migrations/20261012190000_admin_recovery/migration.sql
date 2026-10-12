CREATE TABLE "admin_recovery_tokens" (
  "id" UUID NOT NULL,
  "adminUserId" UUID NOT NULL,
  "tokenHash" VARCHAR(255) NOT NULL,
  "expiresAt" TIMESTAMPTZ(3) NOT NULL,
  "usedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_recovery_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "admin_recovery_tokens_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE UNIQUE INDEX "admin_recovery_tokens_tokenHash_key" ON "admin_recovery_tokens"("tokenHash");
CREATE INDEX "admin_recovery_tokens_adminUserId_expiresAt_idx" ON "admin_recovery_tokens"("adminUserId","expiresAt");
ALTER TABLE "admin_recovery_tokens" ADD CONSTRAINT "admin_recovery_tokens_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
