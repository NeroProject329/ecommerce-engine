import type { Product } from './commerce';

export const categoryDiscountOptions = [
  'Acima de 30%',
  'Até 10%',
  'De 10% até 20%',
  'De 20% até 30%',
] as const;

export type CategoryDiscountOption = (typeof categoryDiscountOptions)[number];

export type CategoryProductFilterState = {
  minPriceCents: number;
  maxPriceCents: number;
  brands: string[];
  ratings: number[];
  discounts: CategoryDiscountOption[];
  cbFull: boolean;
  fastPickup: boolean;
};

const normalize = (value: string) => value.trim().toLocaleLowerCase('pt-BR');

export function getProductRating(product: Product) {
  const rating = product.card?.ratingAverage;
  return typeof rating === 'number' && Number.isFinite(rating)
    ? Math.min(5, Math.max(0, rating))
    : 0;
}

export function getProductDiscount(product: Product) {
  const configuredDiscount = product.card?.discountPercent;
  if (typeof configuredDiscount === 'number' && Number.isFinite(configuredDiscount)) {
    return Math.max(0, configuredDiscount);
  }

  const variant = product.variants[0];
  const current = variant?.price.amountCents ?? 0;
  const compareAt = variant?.price.compareAtCents ?? 0;
  return current > 0 && compareAt > current ? Math.round((1 - current / compareAt) * 100) : 0;
}

export function isCbFullProduct(product: Product) {
  if (typeof product.card?.cbFull === 'boolean') return product.card.cbFull;
  return (product.card?.flags ?? []).some((flag) => normalize(flag) === 'cb full');
}

export function isFastPickupProduct(product: Product) {
  if (typeof product.card?.fastPickup === 'boolean') return product.card.fastPickup;
  return (product.card?.flags ?? []).some((flag) => normalize(flag).includes('retira'));
}

function matchesDiscount(discount: number, selected: CategoryDiscountOption) {
  if (selected === 'Acima de 30%') return discount > 30;
  if (selected === 'Até 10%') return discount <= 10;
  if (selected === 'De 10% até 20%') return discount > 10 && discount <= 20;
  return discount > 20 && discount <= 30;
}

export function filterCategoryProducts(products: Product[], filters: CategoryProductFilterState) {
  const selectedBrands = new Set(filters.brands.map(normalize));
  const minimumRating = filters.ratings.length ? Math.min(...filters.ratings) : 0;

  return products.filter((product) => {
    const price = product.variants[0]?.price.amountCents;
    if (typeof price !== 'number' || price < filters.minPriceCents || price > filters.maxPriceCents)
      return false;

    const brand = product.brand?.name ? normalize(product.brand.name) : '';
    if (selectedBrands.size && !selectedBrands.has(brand)) return false;
    if (minimumRating && getProductRating(product) < minimumRating) return false;

    const discount = getProductDiscount(product);
    if (
      filters.discounts.length &&
      !filters.discounts.some((selected) => matchesDiscount(discount, selected))
    )
      return false;
    if (filters.cbFull && !isCbFullProduct(product)) return false;
    if (filters.fastPickup && !isFastPickupProduct(product)) return false;
    return true;
  });
}
