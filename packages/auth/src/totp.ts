import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function encodeBase32(input: Buffer): string {
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      result += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) result += ALPHABET[(value << (5 - bits)) & 31];
  return result;
}

function decodeBase32(input: string): Buffer {
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const character of input.replace(/=+$/u, '').toUpperCase()) {
    const index = ALPHABET.indexOf(character);
    if (index < 0) throw new Error('TOTP_SECRET_INVALID');
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function generateTotpSecret(): string {
  return encodeBase32(randomBytes(20));
}

export function generateTotp(secret: string, at = Date.now(), periodSeconds = 30, digits = 6): string {
  const counter = Math.floor(at / 1000 / periodSeconds);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac('sha1', decodeBase32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = (digest.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;
  return binary.toString().padStart(digits, '0');
}

export function verifyTotp(secret: string, token: string, at = Date.now(), window = 1): boolean {
  if (!/^\d{6}$/u.test(token) || window < 0 || window > 10) return false;
  const provided = Buffer.from(token);
  for (let step = -window; step <= window; step += 1) {
    const expected = Buffer.from(generateTotp(secret, at + step * 30_000));
    if (provided.length === expected.length && timingSafeEqual(provided, expected)) return true;
  }
  return false;
}
