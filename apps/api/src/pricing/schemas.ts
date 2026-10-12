import { z } from 'zod';

const uuid = z.string().uuid();

export const createPromotionSchema = z.object({
  name: z.string().trim().min(1).max(180),
  percentageBasisPoints: z.number().int().min(1).max(10_000),
  priority: z.number().int().min(-10_000).max(10_000).default(0),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
  targets: z.array(z.object({ targetType: z.enum(['STORE', 'CATEGORY', 'PRODUCT', 'VARIANT']), targetId: uuid.nullish() })).min(1).max(500),
}).refine((value) => !value.startsAt || !value.endsAt || value.endsAt > value.startsAt, { message: 'PROMOTION_PERIOD_INVALID' })
  .refine((value) => value.targets.every((target) => target.targetType === 'STORE' ? !target.targetId : Boolean(target.targetId)), { message: 'PROMOTION_TARGET_INVALID' });

export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(80).transform((value) => value.toUpperCase()),
  percentageBasisPoints: z.number().int().min(1).max(10_000),
  minimumSubtotalCents: z.number().int().nonnegative().default(0),
  maximumDiscountCents: z.number().int().positive().nullish(),
  maxUses: z.number().int().positive().nullish(),
  startsAt: z.coerce.date().nullish(),
  endsAt: z.coerce.date().nullish(),
});

export const priceQuoteSchema = z.object({
  items: z.array(z.object({ variantId: uuid, quantity: z.number().int().min(1).max(100) })).min(1).max(100),
  couponCode: z.string().trim().min(3).max(80).transform((value) => value.toUpperCase()).optional(),
});

export const changePriceSchema = z.object({
  amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  compareAtCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
  currency: z.string().length(3).transform((value) => value.toUpperCase()).default('BRL'),
  reason: z.string().trim().max(500).optional(),
});

export type CreatePromotionInput = z.infer<typeof createPromotionSchema>;
export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type PriceQuoteInput = z.infer<typeof priceQuoteSchema>;
export type ChangePriceInput = z.infer<typeof changePriceSchema>;
