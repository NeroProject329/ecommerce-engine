import { z } from 'zod';

export const healthStatusSchema = z.object({
  status: z.literal('ok'),
  service: z.string().min(1),
  version: z.string().min(1),
  timestamp: z.iso.datetime(),
});

export type HealthStatus = z.infer<typeof healthStatusSchema>;

export const problemDetailsSchema = z.object({
  type: z.url(),
  title: z.string().min(1),
  status: z.number().int().min(400).max(599),
  detail: z.string().min(1),
  instance: z.string().min(1),
  code: z.string().min(1),
  requestId: z.string().min(1),
});

export type ProblemDetails = z.infer<typeof problemDetailsSchema>;

const importPriceSchema = z.object({
  amountCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
  compareAtCents: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullish(),
  currency: z.string().length(3).default('BRL'),
});

const importInventorySchema = z.object({
  locationCode: z.string().trim().min(1).max(80),
  locationName: z.string().trim().min(1).max(160).optional(),
  onHand: z.number().int().nonnegative(),
});

const importVariantSchema = z.object({
  externalId: z.string().trim().min(1).max(240),
  sku: z.string().trim().min(1).max(120).nullish(),
  ean: z.string().trim().nullish(),
  attributes: z.record(z.string(), z.string()).default({}),
  price: importPriceSchema.optional(),
  inventory: z.array(importInventorySchema).max(50).default([]),
});

export const catalogImportItemV1Schema = z.object({
  externalProductId: z.string().trim().min(1).max(180),
  title: z.string().trim().min(1).max(240),
  slug: z.string().trim().min(1).max(180).optional(),
  description: z.string().max(100_000).default(''),
  brand: z.object({ name: z.string().trim().min(1).max(160), slug: z.string().trim().min(1).max(140).optional() }).optional(),
  category: z.object({ name: z.string().trim().min(1).max(160), slug: z.string().trim().min(1).max(140).optional() }),
  variants: z.array(importVariantSchema).min(1).max(500),
  mediaUrls: z.array(z.string().url().refine((value) => value.startsWith('https://'))).max(100).default([]),
});

export const catalogImportBatchV1Schema = z.object({
  contractVersion: z.literal('1.0'),
  externalBatchId: z.string().trim().min(1).max(180),
  sourceCode: z.string().trim().min(1).max(100),
  items: z.array(catalogImportItemV1Schema).min(1).max(1000),
}).superRefine((batch, context) => {
  const seen = new Set<string>();
  batch.items.forEach((item, index) => {
    if (seen.has(item.externalProductId)) context.addIssue({ code: 'custom', path: ['items', index, 'externalProductId'], message: 'DUPLICATE_EXTERNAL_PRODUCT_ID' });
    seen.add(item.externalProductId);
  });
});

export type CatalogImportBatchV1 = z.infer<typeof catalogImportBatchV1Schema>;
export type CatalogImportItemV1 = z.infer<typeof catalogImportItemV1Schema>;

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}
