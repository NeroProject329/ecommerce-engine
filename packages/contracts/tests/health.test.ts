import { describe, expect, it } from 'vitest';
import { catalogImportBatchV1Schema, healthStatusSchema, stableJson } from '../src';

describe('healthStatusSchema', () => {
  it('accepts a typed live response', () => {
    const result = healthStatusSchema.parse({
      status: 'ok',
      service: 'api',
      version: '0.1.0',
      timestamp: '2026-10-12T12:00:00.000Z',
    });
    expect(result.service).toBe('api');
  });

  it('validates a versioned catalog import and rejects duplicate external ids', () => {
    const item = {
      externalProductId: 'product-1',
      title: 'Tênis Pro',
      category: { name: 'Calçados' },
      variants: [{ externalId: 'variant-1', sku: 'SKU-1', price: { amountCents: 12990 }, inventory: [] }],
    };
    expect(catalogImportBatchV1Schema.parse({ contractVersion: '1.0', externalBatchId: 'batch-1', sourceCode: 'collector', items: [item] }).items).toHaveLength(1);
    expect(() => catalogImportBatchV1Schema.parse({ contractVersion: '1.0', externalBatchId: 'batch-1', sourceCode: 'collector', items: [item, item] })).toThrow();
  });

  it('serializes object keys deterministically for idempotency hashes', () => {
    expect(stableJson({ b: 2, a: { d: 4, c: 3 } })).toBe(stableJson({ a: { c: 3, d: 4 }, b: 2 }));
  });
});
