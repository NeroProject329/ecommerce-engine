import { describe, expect, it } from 'vitest';
import type { Product } from './commerce';
import {
  filterCategoryProducts,
  getProductDiscount,
  getProductRating,
  isCbFullProduct,
} from './category-product-filters';

function product(overrides: {
  id: string;
  price: number;
  compareAt?: number;
  brand?: string;
  rating?: number;
  reviews?: number;
  discount?: number;
  flags?: string[];
  cbFull?: boolean;
  fastPickup?: boolean;
}): Product {
  return {
    id: overrides.id,
    slug: overrides.id,
    title: overrides.id,
    description: '',
    brand: overrides.brand
      ? { id: overrides.brand, slug: overrides.brand, name: overrides.brand }
      : null,
    primaryCategory: { id: 'phones', slug: 'phones', name: 'Phones' },
    media: [],
    variants: [
      {
        id: `${overrides.id}-variant`,
        sku: null,
        price: {
          amountCents: overrides.price,
          compareAtCents: overrides.compareAt ?? null,
          currency: 'BRL',
        },
        availableQuantity: 1,
        media: [],
      },
    ],
    card: {
      ...(typeof overrides.reviews === 'number' ? { reviewCount: overrides.reviews } : {}),
      ...(typeof overrides.rating === 'number' ? { ratingAverage: overrides.rating } : {}),
      ...(typeof overrides.discount === 'number' ? { discountPercent: overrides.discount } : {}),
      ...(overrides.flags ? { flags: overrides.flags } : {}),
      ...(typeof overrides.cbFull === 'boolean' ? { cbFull: overrides.cbFull } : {}),
      ...(typeof overrides.fastPickup === 'boolean' ? { fastPickup: overrides.fastPickup } : {}),
    },
  };
}

const products = [
  product({
    id: 'apple',
    price: 100_000,
    compareAt: 125_000,
    brand: 'Apple',
    rating: 4.8,
    reviews: 20,
    cbFull: true,
    fastPickup: true,
  }),
  product({
    id: 'samsung',
    price: 200_000,
    compareAt: 250_000,
    brand: 'Samsung',
    rating: 3.7,
    reviews: 90,
    discount: 20,
    flags: ['FRETE GRÁTIS'],
  }),
  product({
    id: 'motorola',
    price: 300_000,
    compareAt: 500_000,
    brand: 'Motorola',
    rating: 2.4,
    reviews: 2,
    flags: ['CB FULL', 'RETIRA RÁPIDO'],
  }),
  product({ id: 'unrated', price: 400_000, brand: 'Apple', reviews: 999 }),
];

const filters = {
  minPriceCents: 0,
  maxPriceCents: 999_999,
  brands: [] as string[],
  ratings: [] as number[],
  discounts: [] as Array<'Acima de 30%' | 'Até 10%' | 'De 10% até 20%' | 'De 20% até 30%'>,
  cbFull: false,
  fastPickup: false,
};

describe('category product filters', () => {
  it('applies inclusive price limits and ORs selected brands', () => {
    expect(
      filterCategoryProducts(products, {
        ...filters,
        minPriceCents: 100_000,
        maxPriceCents: 300_000,
      }).map(({ id }) => id),
    ).toEqual(['apple', 'samsung', 'motorola']);
    expect(
      filterCategoryProducts(products, { ...filters, brands: ['apple', 'MOTOROLA'] }).map(
        ({ id }) => id,
      ),
    ).toEqual(['apple', 'motorola', 'unrated']);
  });

  it('filters by the real average rating instead of review count', () => {
    expect(getProductRating(products[3]!)).toBe(0);
    expect(
      filterCategoryProducts(products, { ...filters, ratings: [4] }).map(({ id }) => id),
    ).toEqual(['apple']);
    expect(
      filterCategoryProducts(products, { ...filters, ratings: [5, 3] }).map(({ id }) => id),
    ).toEqual(['apple', 'samsung']);
  });

  it('supports every star threshold from one to five', () => {
    const ratedProducts = [5, 4.2, 3.4, 2.6, 1.8, 0].map((rating, index) =>
      product({
        id: `rating-${index}`,
        price: 100_000,
        rating,
        reviews: rating ? 10 : 0,
      }),
    );

    expect(
      [5, 4, 3, 2, 1].map((rating) =>
        filterCategoryProducts(ratedProducts, { ...filters, ratings: [rating] }).map(
          ({ id }) => id,
        ),
      ),
    ).toEqual([
      ['rating-0'],
      ['rating-0', 'rating-1'],
      ['rating-0', 'rating-1', 'rating-2'],
      ['rating-0', 'rating-1', 'rating-2', 'rating-3'],
      ['rating-0', 'rating-1', 'rating-2', 'rating-3', 'rating-4'],
    ]);
  });

  it('clamps invalid rating values to the zero-to-five range', () => {
    expect(getProductRating(product({ id: 'too-high', price: 100, rating: 9 }))).toBe(5);
    expect(getProductRating(product({ id: 'too-low', price: 100, rating: -3 }))).toBe(0);
  });

  it('derives a discount from compare-at price and supports every range', () => {
    expect(getProductDiscount(products[0]!)).toBe(20);
    expect(
      filterCategoryProducts(products, { ...filters, discounts: ['Até 10%'] }).map(({ id }) => id),
    ).toEqual(['unrated']);
    expect(
      filterCategoryProducts(products, { ...filters, discounts: ['De 10% até 20%'] }).map(
        ({ id }) => id,
      ),
    ).toEqual(['apple', 'samsung']);
    expect(
      filterCategoryProducts(products, { ...filters, discounts: ['Acima de 30%'] }).map(
        ({ id }) => id,
      ),
    ).toEqual(['motorola']);
  });

  it('does not confuse free shipping with CB Full and combines service filters', () => {
    expect(isCbFullProduct(products[1]!)).toBe(false);
    expect(
      filterCategoryProducts(products, { ...filters, cbFull: true }).map(({ id }) => id),
    ).toEqual(['apple', 'motorola']);
    expect(
      filterCategoryProducts(products, { ...filters, cbFull: true, fastPickup: true }).map(
        ({ id }) => id,
      ),
    ).toEqual(['apple', 'motorola']);
  });

  it('combines groups with AND semantics', () => {
    expect(
      filterCategoryProducts(products, {
        ...filters,
        minPriceCents: 150_000,
        brands: ['Samsung', 'Motorola'],
        ratings: [3],
        discounts: ['De 10% até 20%'],
      }).map(({ id }) => id),
    ).toEqual(['samsung']);
  });
});
