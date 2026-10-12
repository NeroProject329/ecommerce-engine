import { describe, expect, it } from 'vitest';
import { assertTenantAccess } from '../src';

describe('assertTenantAccess', () => {
  it('rejects records from another store', () => {
    expect(() => assertTenantAccess('store-a', { storeId: 'store-b' })).toThrow(
      'TENANT_ACCESS_DENIED',
    );
  });
});
