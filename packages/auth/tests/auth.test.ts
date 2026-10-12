import { describe, expect, it } from 'vitest';
import {
  authorizeStoreAction,
  createOpaqueToken,
  generateTotp,
  generateTotpSecret,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  openSecret,
  sealSecret,
  verifyPassword,
  verifyTotp,
} from '../src';

describe('authentication primitives', () => {
  it('normalizes email and verifies password without storing plaintext', async () => {
    expect(normalizeEmail('  User@Example.COM ')).toBe('user@example.com');
    const encoded = await hashPassword('correct horse battery staple');
    expect(encoded).not.toContain('correct horse');
    await expect(verifyPassword('correct horse battery staple', encoded)).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(false);
  });

  it('creates opaque tokens whose hashes are deterministic', () => {
    const token = createOpaqueToken();
    expect(token.raw).not.toBe(token.hash);
    expect(hashOpaqueToken(token.raw)).toBe(token.hash);
  });

  it('verifies TOTP only inside the configured time window', () => {
    const secret = generateTotpSecret();
    const at = Date.UTC(2026, 9, 12, 12, 0, 0);
    const token = generateTotp(secret, at);
    expect(verifyTotp(secret, token, at)).toBe(true);
    expect(verifyTotp(secret, token, at + 120_000)).toBe(false);
  });

  it('requires matching tenant, permission and MFA', () => {
    const context = { storeId: 'store-a', permissions: new Set(['users:write'] as const), mfaVerified: true };
    expect(authorizeStoreAction(context, 'store-a', 'users:write')).toBe(true);
    expect(authorizeStoreAction(context, 'store-b', 'users:write')).toBe(false);
    expect(authorizeStoreAction({ ...context, mfaVerified: false }, 'store-a', 'users:write')).toBe(false);
  });

  it('encrypts MFA secrets with authenticated encryption', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const sealed = sealSecret('TOTP-SECRET', key);
    expect(sealed).not.toContain('TOTP-SECRET');
    expect(openSecret(sealed, key)).toBe('TOTP-SECRET');
    expect(() => openSecret(`${sealed}x`, key)).toThrow();
  });
});
