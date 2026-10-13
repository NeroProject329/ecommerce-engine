import { afterEach, describe, expect, it, vi } from 'vitest';
import { hashPassword, verifyPassword } from '@ecommerce/auth';
import { AdminAuthService } from '../src/auth/admin-auth.service';

describe('AdminAuthService MFA enrollment', () => {
  const previousKey = process.env.AUTH_ENCRYPTION_KEY_BASE64;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.AUTH_ENCRYPTION_KEY_BASE64;
    else process.env.AUTH_ENCRYPTION_KEY_BASE64 = previousKey;
  });

  it('keeps the active factor while preparing a replacement key', async () => {
    process.env.AUTH_ENCRYPTION_KEY_BASE64 = Buffer.alloc(32, 7).toString('base64');
    const update = vi.fn(async () => undefined);
    const prisma = {
      client: {
        adminSession: {
          findUnique: vi.fn(async () => ({
            id: 'session-1',
            adminUserId: 'admin-1',
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            adminUser: {
              emailNormalized: 'owner@example.test',
              status: 'ACTIVE',
              mfaState: { totpSecretEncrypted: 'existing-encrypted-secret', enrolledAt: '2026-10-13T00:00:00.000Z' },
            },
          })),
        },
        adminUser: { update },
      },
    };
    const service = new AdminAuthService(prisma as never, { sendRecovery: vi.fn() } as never);

    const enrollment = await service.beginTotpEnrollment('session-token');

    expect(enrollment).toMatchObject({
      issuer: 'Ecommerce Engine',
      accountName: 'owner@example.test',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });
    expect(enrollment.otpauthUrl).toContain('otpauth://totp/');
    expect(update).toHaveBeenCalledWith({
      where: { id: 'admin-1' },
      data: {
        mfaState: expect.objectContaining({
          totpSecretEncrypted: 'existing-encrypted-secret',
          enrolledAt: '2026-10-13T00:00:00.000Z',
          pendingTotpSecretEncrypted: expect.any(String),
        }),
      },
    });
  });

  it('changes the password and revokes every session except the current one', async () => {
    const currentPassword = 'current secure password';
    const currentHash = await hashPassword(currentPassword);
    const updateUser = vi.fn(async (input: unknown) => input);
    const revokeOthers = vi.fn(async () => ({ count: 2 }));
    const prisma = {
      client: {
        adminSession: {
          findUnique: vi.fn(async () => ({
            id: 'session-current',
            adminUserId: 'admin-1',
            expiresAt: new Date(Date.now() + 60_000),
            revokedAt: null,
            mfaVerifiedAt: new Date(),
            adminUser: { status: 'ACTIVE', passwordHash: currentHash, mfaState: {} },
          })),
          updateMany: revokeOthers,
        },
        adminUser: { update: updateUser },
        $transaction: vi.fn(async (operations: Array<Promise<unknown>>) => Promise.all(operations)),
      },
    };
    const service = new AdminAuthService(prisma as never, { sendRecovery: vi.fn() } as never);

    await service.changePassword('session-token', {
      currentPassword,
      newPassword: 'new secure password 2026',
    });

    const passwordHash = (updateUser.mock.calls[0]?.[0] as { data: { passwordHash: string } }).data.passwordHash;
    expect(await verifyPassword('new secure password 2026', passwordHash)).toBe(true);
    expect(revokeOthers).toHaveBeenCalledWith({
      where: { adminUserId: 'admin-1', id: { not: 'session-current' }, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
  });
});
