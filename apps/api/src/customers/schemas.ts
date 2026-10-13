import { z } from 'zod';

const addressFields = {
  recipient: z.string().trim().min(2).max(180),
  postalCode: z.string().trim().regex(/^\d{5}-?\d{3}$/u).transform((value) => value.replace('-', '')),
  street: z.string().trim().min(2).max(220),
  number: z.string().trim().min(1).max(40),
  complement: z.string().trim().max(120).nullish(),
  district: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  country: z.string().trim().length(2).transform((value) => value.toUpperCase()).default('BR'),
  isDefault: z.boolean().default(false),
};

export const createAddressSchema = z.object(addressFields);
export const updateAddressSchema = z.object(addressFields).partial().refine((value) => Object.keys(value).length > 0, {
  message: 'ADDRESS_UPDATE_EMPTY',
});
export const cancelOrderSchema = z.object({ reason: z.string().trim().min(3).max(500).default('Solicitação do cliente') });
export const updateProfileSchema = z.object({ name: z.string().trim().min(2).max(180) }).strict();
export const favoriteSchema = z.object({ productId: z.string().uuid() }).strict();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type FavoriteInput = z.infer<typeof favoriteSchema>;
