import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

config({ path: resolve(dirname(fileURLToPath(import.meta.url)), '../../.env'), override: false, quiet: true });

const localDatabaseUrl = 'postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? localDatabaseUrl },
});
