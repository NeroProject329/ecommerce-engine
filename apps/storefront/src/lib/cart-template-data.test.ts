import { describe, expect, it } from 'vitest';
import {
  cartServicePriceOverrides,
  fallbackCartSelection,
  getCartProductPriceCents,
  getCartServicePriceCents,
} from './cart-template-data';
import { referenceProduct } from './product-detail-template-data';

describe('cart template data', () => {
  it('uses the reference cart price for the individual product template', () => {
    expect(getCartProductPriceCents(referenceProduct)).toBe(1_199_900);
  });

  it('normalizes protection plan values to the cart reference', () => {
    expect(getCartServicePriceCents('complete-12', 1)).toBe(385_168);
    expect(getCartServicePriceCents('unknown-plan', 12_345)).toBe(12_345);
  });

  it('reproduces the full reference total including shipping', () => {
    const servicesTotal = fallbackCartSelection.services.reduce(
      (sum, service) => sum + service.totalCents,
      0,
    );

    expect(cartServicePriceOverrides['support-paid']).toBe(12_990);
    expect(1_199_900 + servicesTotal + 3_321).toBe(1_878_916);
  });
});
