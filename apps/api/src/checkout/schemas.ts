import { z } from 'zod';

export const cartItemSchema = z.object({
  variantId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
});

export const shippingQuoteSchema = z.object({
  destinationPostalCode: z.string().trim().regex(/^\d{5}-?\d{3}$/),
});

export const checkoutSchema = z.object({
  idempotencyKey: z.string().trim().min(8).max(180),
  shippingQuoteId: z.string().uuid(),
  couponCode: z.string().trim().min(2).max(80).transform((value) => value.toUpperCase()).optional(),
  address: z.object({
    recipient: z.string().trim().min(1).max(180),
    postalCode: z.string().trim().regex(/^\d{5}-?\d{3}$/),
    street: z.string().trim().min(1).max(220),
    number: z.string().trim().min(1).max(40),
    complement: z.string().trim().max(120).optional(),
    district: z.string().trim().min(1).max(120),
    city: z.string().trim().min(1).max(120),
    state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
    country: z.string().trim().length(2).transform((value) => value.toUpperCase()).default('BR'),
  }),
});

export type CartItemInput = z.infer<typeof cartItemSchema>;
export type ShippingQuoteInput = z.infer<typeof shippingQuoteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
