import { describe, expect, it } from 'vitest';
import { publicSearchSchema } from '../src/catalog/schemas';

describe('public catalog search schema', () => {
  it('applies stable pagination and sorting defaults', () => {
    expect(publicSearchSchema.parse({})).toEqual({
      q: '',
      sort: 'relevance',
      page: 1,
      limit: 24,
    });
  });

  it('coerces filters received from query strings', () => {
    expect(publicSearchSchema.parse({
      q: ' celular ',
      category: 'smartphones',
      brand: 'apple',
      minPriceCents: '100000',
      maxPriceCents: '900000',
      sort: 'price-desc',
      page: '2',
      limit: '12',
    })).toEqual({
      q: 'celular',
      category: 'smartphones',
      brand: 'apple',
      minPriceCents: 100000,
      maxPriceCents: 900000,
      sort: 'price-desc',
      page: 2,
      limit: 12,
    });
  });

  it('rejects an inverted price range', () => {
    expect(() => publicSearchSchema.parse({
      minPriceCents: '20000',
      maxPriceCents: '10000',
    })).toThrow('PRICE_RANGE_INVALID');
  });
});
