import { z } from 'zod';

const status = z.enum(['DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED']);
export const sectionSchema = z.object({ type: z.string().trim().min(2).max(100), title: z.string().trim().max(180).nullish(), config: z.record(z.string(), z.unknown()).default({}), position: z.number().int().min(0), status: status.default('DRAFT') });
export const updateSectionSchema = sectionSchema.partial().refine((value) => Object.keys(value).length > 0);
export const bannerSchema = z.object({ placement: z.string().trim().min(2).max(100), mediaId: z.string().uuid().nullish(), title: z.string().trim().max(180).nullish(), linkTarget: z.url().max(2048).nullish(), position: z.number().int().min(0), startsAt: z.coerce.date().nullish(), endsAt: z.coerce.date().nullish(), status: status.default('DRAFT') });
export const updateBannerSchema = bannerSchema.partial().refine((value) => Object.keys(value).length > 0);
const storeAddress = z.object({ postalCode: z.string().regex(/^\d{8}$/u), street: z.string().max(220), number: z.string().max(40), complement: z.string().max(120).nullish(), district: z.string().max(120), city: z.string().max(120), state: z.string().length(2), country: z.literal('BR').default('BR') });
export const storeSettingsSchema = z.object({
  displayName: z.string().trim().min(2).max(160).optional(),
  profile: z.object({ legalName: z.string().max(180).nullish(), document: z.string().max(18).nullish(), stateRegistration: z.string().max(40).nullish(), supportEmail: z.email().nullish(), phone: z.string().max(30).nullish(), whatsapp: z.string().max(30).nullish(), address: storeAddress.nullish() }).partial().optional(),
  branding: z.object({ logoMediaId: z.string().uuid().nullish(), faviconMediaId: z.string().uuid().nullish(), primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/u).nullish() }).partial().optional(),
  social: z.record(z.string(), z.url()).optional(),
  policies: z.object({ privacy: z.string().max(100_000).nullish(), terms: z.string().max(100_000).nullish(), exchanges: z.string().max(100_000).nullish() }).partial().optional(),
  seo: z.object({ title: z.string().max(70).nullish(), description: z.string().max(180).nullish() }).partial().optional(),
}).strict().refine((value) => Object.keys(value).length > 0);

const shippingRuleBase = z.object({ name: z.string().trim().min(2).max(160), code: z.string().trim().regex(/^[A-Z0-9_-]{2,100}$/u), enabled: z.boolean().default(true), priority: z.number().int().min(0).max(10_000).default(0), type: z.enum(['FLAT', 'FREE', 'PICKUP']), carrier: z.string().trim().min(2).max(120), service: z.string().trim().min(2).max(120), amountCents: z.number().int().min(0), freeAboveCents: z.number().int().min(0).nullish(), minSubtotalCents: z.number().int().min(0).nullish(), maxSubtotalCents: z.number().int().min(0).nullish(), postalCodePrefixes: z.array(z.string().regex(/^\d{1,8}$/u)).max(200).default([]), estimatedDaysMin: z.number().int().min(0).max(365), estimatedDaysMax: z.number().int().min(0).max(365), handlingDays: z.number().int().min(0).max(90).default(0) });
export const shippingRuleSchema = shippingRuleBase.refine((value) => value.estimatedDaysMax >= value.estimatedDaysMin, { message: 'SHIPPING_DAYS_INVALID' });
export const updateShippingRuleSchema = shippingRuleBase.partial().refine((value) => Object.keys(value).length > 0).refine((value) => value.estimatedDaysMin === undefined || value.estimatedDaysMax === undefined || value.estimatedDaysMax >= value.estimatedDaysMin, { message: 'SHIPPING_DAYS_INVALID' });
export const reorderSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(500) });

export type SectionInput = z.infer<typeof sectionSchema>;
export type UpdateSectionInput = z.infer<typeof updateSectionSchema>;
export type BannerInput = z.infer<typeof bannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;
export type StoreSettingsInput = z.infer<typeof storeSettingsSchema>;
export type ShippingRuleInput = z.infer<typeof shippingRuleSchema>;
export type UpdateShippingRuleInput = z.infer<typeof updateShippingRuleSchema>;
