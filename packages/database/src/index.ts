export interface TenantRecord {
  storeId: string;
}

export function assertTenantAccess(expectedStoreId: string, record: TenantRecord): void {
  if (record.storeId !== expectedStoreId) {
    throw new Error('TENANT_ACCESS_DENIED');
  }
}

export interface DependencyHealth {
  status: 'up' | 'down' | 'not-configured';
  checkedAt: string;
}

export { createPrismaClient, checkDatabaseHealth } from './prisma-client';
