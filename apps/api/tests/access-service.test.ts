import { describe, expect, it, vi } from 'vitest';
import { AccessService } from '../src/access/access.service';

describe('AccessService security rules', () => {
  it('does not allow an administrator to disable their own access', async () => {
    const prisma = {
      client: {
        adminMembership: {
          findFirst: vi.fn(async () => ({
            id: 'membership-1',
            storeId: 'store-1',
            adminUserId: 'admin-1',
            roleId: 'role-1',
          })),
        },
      },
    };
    const service = new AccessService(prisma as never);

    await expect(
      service.updateUser('store-1', 'membership-1', 'admin-1', {
        membershipStatus: 'SUSPENDED',
      }),
    ).rejects.toThrow('CURRENT_ADMIN_ACCESS_CANNOT_BE_DISABLED');
  });
});
