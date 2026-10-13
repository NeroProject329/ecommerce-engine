import { z } from 'zod';

export const createPaymentSchema = z.object({
  providerCode: z.literal('sandbox'),
  idempotencyKey: z.string().trim().min(12).max(180),
});

export const refundPaymentSchema = z.object({
  amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  reason: z.string().trim().min(3).max(500),
});
export const reconcilePaymentsSchema = z.object({ repair: z.boolean().default(false), limit: z.number().int().min(1).max(500).default(100) });

export const paymentWebhookSchema = z.object({
  storeId: z.string().uuid(),
  eventId: z.string().trim().min(1).max(180),
  type: z.string().trim().min(1).max(120),
  externalPaymentId: z.string().trim().min(1).max(180).optional(),
  status: z.enum(['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'CANCELED', 'PARTIALLY_REFUNDED', 'REFUNDED']).optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type RefundPaymentInput = z.infer<typeof refundPaymentSchema>;
export type PaymentWebhookInput = z.infer<typeof paymentWebhookSchema>;
export type ReconcilePaymentsInput = z.infer<typeof reconcilePaymentsSchema>;
