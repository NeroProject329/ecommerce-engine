import { describe, expect, it } from 'vitest';
import {
  buildCategoryPath,
  canPublishProduct,
  isValidEan,
  normalizeSku,
  normalizeSlug,
} from '../src';

describe('canPublishProduct', () => {
  it('requires at least one sellable variant', () => {
    expect(
      canPublishProduct([{ active: true, priceCents: 199_900, availableQuantity: 2 }]),
    ).toBe(true);
    expect(canPublishProduct([{ active: true, priceCents: null, availableQuantity: 2 }])).toBe(
      false,
    );
  });

  it('rejects inactive, negative-price and unavailable variants', () => {
    expect(canPublishProduct([{ active: false, priceCents: 10, availableQuantity: 1 }])).toBe(false);
    expect(canPublishProduct([{ active: true, priceCents: -1, availableQuantity: 1 }])).toBe(false);
    expect(canPublishProduct([{ active: true, priceCents: 10, availableQuantity: 0 }])).toBe(false);
  });
});

describe('catalog identifiers', () => {
  it('normalizes slugs and SKUs deterministically', () => {
    expect(normalizeSlug('  Tênis Corrida — Pro  ')).toBe('tenis-corrida-pro');
    expect(normalizeSku(' sku azul 42 ')).toBe('SKU-AZUL-42');
    expect(buildCategoryPath('calcados/masculino', 'Tênis')).toBe('calcados/masculino/tenis');
  });

  it('validates GTIN check digits', () => {
    expect(isValidEan('7894900011517')).toBe(true);
    expect(isValidEan('7894900011518')).toBe(false);
    expect(isValidEan('123')).toBe(false);
  });
});
