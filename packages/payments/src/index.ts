export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'CANCELED'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED';

export interface CreatePaymentInput {
  storeId: string;
  orderId: string;
  amountCents: number;
  currency: 'BRL';
  idempotencyKey: string;
}

export interface PaymentResult {
  providerPaymentId: string;
  status: PaymentStatus;
}

export interface PaymentGateway {
  readonly code: string;
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  refund(providerPaymentId: string, amountCents: number): Promise<PaymentResult>;
}

export { SandboxPaymentGateway } from './sandbox-gateway';
export { signWebhookPayload, verifyWebhookSignature } from './webhook-signature';
