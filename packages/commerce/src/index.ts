export function multiplyMoney(amountCents: number, quantity: number): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) {
    throw new Error('INVALID_AMOUNT_CENTS');
  }
  if (!Number.isSafeInteger(quantity) || quantity < 0) {
    throw new Error('INVALID_QUANTITY');
  }
  const total = amountCents * quantity;
  if (!Number.isSafeInteger(total)) {
    throw new Error('AMOUNT_OVERFLOW');
  }
  return total;
}

export function availableStock(onHand: number, reserved: number): number {
  if (![onHand, reserved].every((value) => Number.isSafeInteger(value) && value >= 0)) {
    throw new Error('INVALID_INVENTORY');
  }
  if (reserved > onHand) {
    throw new Error('INVENTORY_INVARIANT_VIOLATION');
  }
  return onHand - reserved;
}

export function applyPercentageDiscount(amountCents: number, percentageBasisPoints: number): number {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0) throw new Error('INVALID_AMOUNT_CENTS');
  if (!Number.isSafeInteger(percentageBasisPoints) || percentageBasisPoints < 0 || percentageBasisPoints > 10_000) {
    throw new Error('INVALID_PERCENTAGE');
  }
  return Math.floor((amountCents * (10_000 - percentageBasisPoints)) / 10_000);
}

export interface DiscountCandidate {
  id: string;
  percentageBasisPoints: number;
  priority: number;
}

export function selectPromotion(candidates: readonly DiscountCandidate[]): DiscountCandidate | null {
  return [...candidates].sort((left, right) => right.priority - left.priority || right.percentageBasisPoints - left.percentageBasisPoints || left.id.localeCompare(right.id))[0] ?? null;
}

export function cappedDiscount(subtotalCents: number, percentageBasisPoints: number, maximumDiscountCents?: number): number {
  const discounted = applyPercentageDiscount(subtotalCents, percentageBasisPoints);
  const discount = subtotalCents - discounted;
  return maximumDiscountCents === undefined ? discount : Math.min(discount, maximumDiscountCents);
}
