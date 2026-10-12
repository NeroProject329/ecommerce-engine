import { describe, expect, it } from 'vitest';
import { applyPercentageDiscount, availableStock, cappedDiscount, multiplyMoney, selectPromotion } from '../src';

describe('commerce invariants', () => {
  it('calculates totals only with integer cents', () => {
    expect(multiplyMoney(199_990, 2)).toBe(399_980);
    expect(() => multiplyMoney(19.99, 2)).toThrow('INVALID_AMOUNT_CENTS');
  });

  it('never returns negative available stock', () => {
    expect(availableStock(10, 4)).toBe(6);
    expect(() => availableStock(3, 4)).toThrow('INVENTORY_INVARIANT_VIOLATION');
  });

  it('applies integer percentage discounts without floating point money', () => {
    expect(applyPercentageDiscount(19_999, 1_500)).toBe(16_999);
    expect(cappedDiscount(100_000, 2_000, 15_000)).toBe(15_000);
  });

  it('selects one promotion deterministically by priority and value', () => {
    expect(selectPromotion([
      { id: 'low', priority: 1, percentageBasisPoints: 3000 },
      { id: 'high', priority: 2, percentageBasisPoints: 1000 },
    ])?.id).toBe('high');
  });
});
