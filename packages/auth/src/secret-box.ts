import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

function parseKey(encodedKey: string): Buffer {
  const key = Buffer.from(encodedKey, 'base64');
  if (key.length !== 32) throw new Error('AUTH_ENCRYPTION_KEY_INVALID');
  return key;
}

export function sealSecret(secret: string, encodedKey: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', parseKey(encodedKey), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return ['v1', iv.toString('base64url'), tag.toString('base64url'), ciphertext.toString('base64url')].join('.');
}

export function openSecret(sealed: string, encodedKey: string): string {
  const [version, ivText, tagText, ciphertextText] = sealed.split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText) throw new Error('SEALED_SECRET_INVALID');
  const decipher = createDecipheriv('aes-256-gcm', parseKey(encodedKey), Buffer.from(ivText, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextText, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
