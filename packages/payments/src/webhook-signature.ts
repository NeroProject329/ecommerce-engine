import { createHmac, timingSafeEqual } from 'node:crypto';

export function signWebhookPayload(payload: Uint8Array | string, secret: string): string {
  if (!secret) throw new Error('WEBHOOK_SECRET_REQUIRED');
  return createHmac('sha256', secret).update(payload).digest('hex');
}

export function verifyWebhookSignature(payload: Uint8Array | string, signature: string, secret: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = Buffer.from(signWebhookPayload(payload, secret), 'hex');
  const received = Buffer.from(signature, 'hex');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
