import { z } from 'zod';

const slug = z.string().trim().min(1).max(180).optional();
const uuid = z.string().uuid();

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug,
  parentId: uuid.nullish(),
  position: z.number().int().min(0).default(0),
});

export const createBrandSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug,
});

export const createProductSchema = z.object({
  title: z.string().trim().min(1).max(240),
  slug,
  description: z.string().max(100_000).default(''),
  primaryCategoryId: uuid,
  brandId: uuid.nullish(),
  categoryIds: z.array(uuid).max(50).default([]),
});

export const createVariantSchema = z.object({
  sku: z.string().trim().min(1).max(120).nullish(),
  externalKey: z.string().trim().min(1).max(180).nullish(),
  ean: z.string().trim().nullish(),
  attributes: z.record(z.string(), z.string()).default({}),
  weightGrams: z.number().int().positive().nullish(),
  lengthMm: z.number().int().positive().nullish(),
  widthMm: z.number().int().positive().nullish(),
  heightMm: z.number().int().positive().nullish(),
});

export const setPriceSchema = z.object({
  amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  compareAtCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()).default('BRL'),
  validFrom: z.coerce.date().nullish(),
  validTo: z.coerce.date().nullish(),
}).refine((value) => !value.validFrom || !value.validTo || value.validTo > value.validFrom, {
  message: 'PRICE_PERIOD_INVALID',
});

export const setInventorySchema = z.object({
  locationId: uuid,
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative().default(0),
}).refine((value) => value.reserved <= value.onHand, { message: 'INVENTORY_RESERVED_EXCEEDS_ON_HAND' });

export const createInventoryLocationSchema = z.object({
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(160),
});

export const createAttributeSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(160),
  dataType: z.enum(['TEXT', 'NUMBER', 'BOOLEAN', 'OPTION', 'MULTI_OPTION']),
  unit: z.string().trim().min(1).max(40).nullish(),
  options: z.array(z.string().trim().min(1).max(160)).max(500).default([]),
}).refine((value) => !['OPTION', 'MULTI_OPTION'].includes(value.dataType) || value.options.length > 0, {
  message: 'ATTRIBUTE_OPTIONS_REQUIRED',
});

export const assignCategoryAttributeSchema = z.object({
  definitionId: uuid,
  required: z.boolean().default(false),
  filterable: z.boolean().default(false),
  sortOrder: z.number().int().min(0).default(0),
});

export const setAttributeValueSchema = z.object({
  definitionId: uuid,
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateBrandInput = z.infer<typeof createBrandSchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type SetPriceInput = z.infer<typeof setPriceSchema>;
export type SetInventoryInput = z.infer<typeof setInventorySchema>;
export type CreateInventoryLocationInput = z.infer<typeof createInventoryLocationSchema>;
export type CreateAttributeInput = z.infer<typeof createAttributeSchema>;
export type AssignCategoryAttributeInput = z.infer<typeof assignCategoryAttributeSchema>;
export type SetAttributeValueInput = z.infer<typeof setAttributeValueSchema>;
