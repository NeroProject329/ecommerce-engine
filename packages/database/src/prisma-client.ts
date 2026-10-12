import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import type { DependencyHealth } from './index';

export function createPrismaClient(databaseUrl = process.env.DATABASE_URL): PrismaClient {
  if (!databaseUrl) throw new Error('DATABASE_URL_NOT_CONFIGURED');
  const adapter = new PrismaPg({ connectionString: databaseUrl });
  return new PrismaClient({ adapter });
}

export async function checkDatabaseHealth(databaseUrl = process.env.DATABASE_URL): Promise<DependencyHealth> {
  if (!databaseUrl) {
    return { status: 'not-configured', checkedAt: new Date().toISOString() };
  }
  const client = createPrismaClient(databaseUrl);
  try {
    await client.$queryRaw`SELECT 1`;
    return { status: 'up', checkedAt: new Date().toISOString() };
  } catch {
    return { status: 'down', checkedAt: new Date().toISOString() };
  } finally {
    await client.$disconnect();
  }
}
