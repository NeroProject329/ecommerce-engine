import type { Product } from './commerce';

export const CART_SELECTION_KEY = 'cart:storefront-selection';

export type CartProtectionSelection = {
  planId: 'warranty' | 'insurance' | 'support';
  optionId: string;
  totalCents: number;
};

export type CartSelectionSnapshot = {
  productId: string;
  productSlug: string;
  services: CartProtectionSelection[];
};

const referenceCategory = {
  id: 'reference-phone-category',
  slug: 'celulares-e-smartphones',
  name: 'Telefones e Celulares',
};

const appleBrand = { id: 'reference-apple', slug: 'apple', name: 'Apple' };

type CartCardSeed = {
  id: string;
  slug: string;
  title: string;
  image: string;
  priceCents: number;
  compareAtCents?: number;
  installmentCount?: number;
  installmentAmountCents?: number;
  reviewCount?: number;
  ratingAverage?: number;
  promo?: 'exclusive';
  flags?: string[];
};

function makeCartCard(seed: CartCardSeed): Product {
  const compareAtCents = seed.compareAtCents ?? seed.priceCents;
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    description: 'Produto demonstrativo da vitrine do carrinho.',
    brand: appleBrand,
    primaryCategory: referenceCategory,
    media: [{ url: `/cart-assets/${seed.image}`, role: 'PRIMARY', sortOrder: 0 }],
    variants: [
      {
        id: `${seed.id}-variant`,
        sku: `CART-${seed.id.toUpperCase()}`,
        price: { amountCents: seed.priceCents, compareAtCents, currency: 'BRL' },
        availableQuantity: 20,
        media: [],
      },
    ],
    isDemo: true,
    card: {
      reviewCount: seed.reviewCount ?? 0,
      ratingAverage: seed.ratingAverage ?? 0,
      installmentCount: seed.installmentCount ?? 6,
      installmentTotalCents: seed.priceCents,
      installmentAmountCents:
        seed.installmentAmountCents ?? Math.round(seed.priceCents / (seed.installmentCount ?? 6)),
      discountPercent:
        compareAtCents > seed.priceCents
          ? Math.round((1 - seed.priceCents / compareAtCents) * 100)
          : 0,
      ...(seed.promo ? { promo: seed.promo } : {}),
      ...(seed.flags ? { flags: seed.flags } : {}),
    },
  };
}

export const cartRecommendations: Product[] = [
  makeCartCard({
    id: 'cart-used-iphone-16-pro-max',
    slug: 'usado-iphone-16-pro-max-512gb-cinza-excelente',
    title: 'Usado: iPhone 16 Pro Max 512 GB Cinza - Excelente',
    image: 'imgi_9_1xg.jpg',
    priceCents: 851_880,
    installmentCount: 12,
    installmentAmountCents: 80_504,
    promo: 'exclusive',
    flags: ['PRODUTO USADO'],
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-max-blue',
    slug: 'iphone-17-pro-max-256gb-azul-intenso',
    title: 'Apple iPhone 17 Pro Max 256GB Azul-intenso',
    image: 'imgi_12_1xg.jpg',
    priceCents: 1_049_900,
    compareAtCents: 1_299_900,
    installmentAmountCents: 174_983,
    reviewCount: 5,
    ratingAverage: 5,
  }),
  makeCartCard({
    id: 'cart-iphone-18-pro-max-glacial',
    slug: 'apple-iphone-18-pro-max-256gb-glacial-cart',
    title: 'Apple iPhone 18 Pro Max 256GB Glacial',
    image: 'imgi_13_1xg.jpg',
    priceCents: 1_299_900,
    installmentAmountCents: 216_650,
  }),
  makeCartCard({
    id: 'cart-iphone-18-pro-bordo',
    slug: 'apple-iphone-18-pro-256gb-bordo',
    title: 'Apple iPhone 18 Pro 256GB Bordô',
    image: 'imgi_14_1xg.jpg',
    priceCents: 1_199_900,
    compareAtCents: 4_199_800,
    installmentAmountCents: 199_983,
    reviewCount: 1,
    ratingAverage: 5,
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-max-512-blue',
    slug: 'iphone-17-pro-max-512gb-azul-intenso',
    title: 'iPhone 17 Pro Max 512GB 5G Tela 6,9 Azul-intenso',
    image: 'imgi_15_1xg.jpg',
    priceCents: 1_570_900,
    installmentAmountCents: 261_817,
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-max-silver',
    slug: 'iphone-17-pro-max-256gb-prateado',
    title: 'iPhone 17 Pro Max Apple 256GB Prateado',
    image: 'imgi_4_1xg.jpg',
    priceCents: 1_079_900,
    compareAtCents: 1_299_900,
    installmentAmountCents: 179_983,
  }),
  makeCartCard({
    id: 'cart-iphone-18-pro-max-silver',
    slug: 'iphone-18-pro-max-256gb-prateado',
    title: 'Apple iPhone 18 Pro Max 256GB Prateado',
    image: 'imgi_5_1xg.jpg',
    priceCents: 1_169_910,
    compareAtCents: 1_299_900,
    installmentAmountCents: 216_650,
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-512-silver',
    slug: 'iphone-17-pro-max-512gb-prateado',
    title: 'iPhone 17 Pro Max 512GB Prateado',
    image: 'imgi_6_1xg.jpg',
    priceCents: 1_470_900,
    installmentAmountCents: 245_150,
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-cosmic',
    slug: 'iphone-17-pro-256gb-laranja-cosmico',
    title: 'Apple iPhone 17 Pro 256GB Laranja-Cósmico',
    image: 'imgi_7_1xg.jpg',
    priceCents: 1_099_900,
    compareAtCents: 1_299_900,
    installmentAmountCents: 183_317,
    reviewCount: 1,
    ratingAverage: 5,
  }),
  makeCartCard({
    id: 'cart-iphone-17-pro-512-dark',
    slug: 'iphone-17-pro-max-512gb-azul-escuro',
    title: 'iPhone 17 Pro Max 512GB 5G Azul-escuro',
    image: 'imgi_8_1xg.jpg',
    priceCents: 1_570_900,
    installmentAmountCents: 261_817,
  }),
];

export const cartServicePriceOverrides: Record<string, number> = {
  'warranty-12': 197_260,
  'warranty-24': 277_537,
  'warranty-36': 277_537,
  'theft-12': 344_030,
  'theft-24': 562_753,
  'complete-12': 385_168,
  'complete-24': 619_148,
  'accidental-12': 295_180,
  'accidental-24': 528_316,
  'support-paid': 12_990,
};

export function getCartProductPriceCents(product: Product) {
  if (product.id === 'reference-iphone-18-pro-max-glacial') return 1_199_900;
  return product.variants[0]?.price.amountCents ?? 0;
}

export function getCartServicePriceCents(optionId: string, fallbackCents: number) {
  return cartServicePriceOverrides[optionId] ?? fallbackCents;
}

export const fallbackCartSelection: CartSelectionSnapshot = {
  productId: 'reference-iphone-18-pro-max-glacial',
  productSlug: 'apple-iphone-18-pro-max-256gb-glacial',
  services: [
    { planId: 'warranty', optionId: 'warranty-36', totalCents: 277_537 },
    { planId: 'insurance', optionId: 'complete-12', totalCents: 385_168 },
    { planId: 'support', optionId: 'support-paid', totalCents: 12_990 },
  ],
};

export const cartDocumentSources = {
  warrantyTerms: {
    title: 'Termo de pagamento em conjunto',
    path: '/cart-assets/documents/termos-garantia.txt',
  },
  warrantyConditions: {
    title: 'Garantia Estendida Original',
    path: '/cart-assets/documents/condicoes-garantia-estendida.txt',
  },
  insuranceTerms: {
    title: 'Termo de pagamento em conjunto',
    path: '/cart-assets/documents/termos-seguro-roubo-furto.txt',
  },
  insuranceConditions: {
    title: 'Fique Seguro',
    path: '/cart-assets/documents/condicoes-seguro-roubo-furto.txt',
  },
} as const;

export type CartDocumentKind = keyof typeof cartDocumentSources;
