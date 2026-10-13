import { describe, expect, it } from 'vitest';
import { SandboxPaymentGateway, signWebhookPayload, verifyWebhookSignature } from '../src';

describe('payments foundation', () => {
  it('creates deterministic sandbox captures for idempotent requests', async () => {
    const gateway = new SandboxPaymentGateway();
    const input = { storeId: 'store', orderId: 'order', amountCents: 1000, currency: 'BRL' as const, idempotencyKey: 'request-1' };
    expect(await gateway.createPayment(input)).toEqual(await gateway.createPayment(input));
  });

  it('verifies webhook signatures in constant time', () => {
    const signature = signWebhookPayload('{"event":"paid"}', 'secret');
    expect(verifyWebhookSignature('{"event":"paid"}', signature, 'secret')).toBe(true);
    expect(verifyWebhookSignature('{"event":"failed"}', signature, 'secret')).toBe(false);
  });
});
