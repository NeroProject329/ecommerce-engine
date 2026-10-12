import { createHash, randomBytes } from 'node:crypto';

export interface OpaqueToken {
  raw: string;
  hash: string;
}

export function hashOpaqueToken(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('base64url');
}

export function createOpaqueToken(bytes = 32): OpaqueToken {
  if (!Number.isInteger(bytes) || bytes < 32 || bytes > 128) {
    throw new Error('TOKEN_ENTROPY_INVALID');
  }

  const raw = randomBytes(bytes).toString('base64url');
  return { raw, hash: hashOpaqueToken(raw) };
}
