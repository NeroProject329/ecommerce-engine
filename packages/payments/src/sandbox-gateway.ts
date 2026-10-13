import { createHash } from 'node:crypto';
import type { CreatePaymentInput, PaymentGateway, PaymentResult } from './index';

export class SandboxPaymentGateway implements PaymentGateway {
  readonly code = 'sandbox';

  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const providerPaymentId = createHash('sha256').update(`${input.storeId}:${input.orderId}:${input.idempotencyKey}`).digest('hex').slice(0, 32);
    return { providerPaymentId, status: input.amountCents > 0 ? 'CAPTURED' : 'FAILED' };
  }

  async refund(providerPaymentId: string, amountCents: number): Promise<PaymentResult> {
    if (!providerPaymentId || !Number.isSafeInteger(amountCents) || amountCents <= 0) throw new Error('REFUND_INVALID');
    return { providerPaymentId, status: 'REFUNDED' };
  }
}
