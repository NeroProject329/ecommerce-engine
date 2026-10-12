import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const localDatabaseUrl = 'postgresql://ecommerce:ecommerce@127.0.0.1:5432/ecommerce?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL ?? localDatabaseUrl },
});
