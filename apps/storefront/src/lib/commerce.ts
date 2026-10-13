export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
export const STORE_SLUG = process.env.NEXT_PUBLIC_STORE_SLUG ?? 'loja-2';
export const SITE_URL = process.env.NEXT_PUBLIC_STOREFRONT_URL ?? 'http://localhost:3000';

export type Media = {
  url: string;
  role?: string;
  sortOrder?: number;
  renditions?: Array<{ url: string; width?: number; height?: number }>;
};

export type Variant = {
  id: string;
  sku: string | null;
  ean?: string | null;
  attributes?: Record<string, string>;
  price: { amountCents: number; compareAtCents: number | null; currency: string };
  availableQuantity: number;
  media: Media[];
};

export type Category = {
  id: string;
  parentId?: string | null;
  slug: string;
  name: string;
  path?: string;
  position?: number;
};

export type Product = {
  id: string;
  slug: string;
  title: string;
  description: string;
  seo?: Record<string, unknown> | null;
  brand: { id: string; slug: string; name: string } | null;
  primaryCategory: Category;
  categories?: Array<{ category: Category }>;
  attributes?: Array<{ code: string; name: string; value: unknown; unit?: string | null }>;
  media: Media[];
  variants: Variant[];
  isDemo?: boolean;
  card?: {
    reviewCount?: number;
    installmentCount?: number;
    installmentTotalCents?: number;
    installmentAmountCents?: number;
    discountPercent?: number;
    promo?: 'exclusive' | '10-off' | '15-off' | '20-off';
    flags?: string[];
    sponsored?: boolean;
  };
};

export type Store = {
  id?: string;
  slug?: string;
  displayName: string;
  currency?: string;
  locale?: string;
  profile?: Record<string, unknown>;
  branding?: Record<string, unknown>;
  social?: Record<string, string>;
  policies?: Record<string, string>;
  seo?: Record<string, string>;
};

export type HomeContent = {
  banners: Array<Record<string, unknown>>;
  sections: Array<Record<string, unknown>>;
};

export type CartItem = {
  id: string;
  variantId: string;
  sku: string | null;
  title: string;
  quantity: number;
  unitPriceCents: number | null;
};

export type Cart = { id: string; status: string; currency?: string; items: CartItem[] };
export type CartAccess = { cartId: string; cartToken: string };
export type CustomerSession = { token: string; expiresAt: string };
export type Customer = { id: string; name: string; email: string };
export type Address = {
  id: string;
  recipient: string;
  postalCode: string;
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  city: string;
  state: string;
  country: string;
  isDefault: boolean;
};

export type ShippingQuote = {
  id: string;
  carrier: string;
  service: string;
  amountCents: number;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
};

export type Order = {
  id: string;
  number: string;
  status: string;
  totalCents: number;
  placedAt: string;
  itemCount: number;
  shipments?: Array<{
    status: string;
    carrier: string;
    service: string;
    trackingCode?: string | null;
    trackingUrl?: string | null;
  }>;
};

export type SearchResult = {
  items: Product[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function mediaUrl(product: Product, variant?: Variant, index = 0): string | undefined {
  const source = variant?.media[index] ?? product.media[index] ?? variant?.media[0] ?? product.media[0];
  const raw = source?.renditions?.[0]?.url ?? source?.url;
  if (raw?.startsWith('/demo-products/') || raw?.startsWith('/category-assets/')) return raw;
  return raw?.startsWith('/') ? `${API_BASE}${raw}` : raw;
}

export async function publicApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, { ...init, cache: 'no-store' });
  const payload = (await response.json().catch(() => ({}))) as {
    data?: T;
    detail?: string;
    message?: string;
  };
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.detail ?? payload.message ?? `HTTP_${response.status}`);
  }
  return payload.data;
}

export async function getStorefrontBootstrap(): Promise<{
  store: Store;
  home: HomeContent;
  products: Product[];
  categories: Category[];
}> {
  const fallback = {
    store: { displayName: 'CASAS BAHIA' },
    home: { banners: [], sections: [] },
    products: [],
    categories: [],
  };
  try {
    const [store, home, products, categories] = await Promise.all([
      publicApi<Store>(`/v1/public/stores/${STORE_SLUG}`),
      publicApi<HomeContent>(`/v1/public/stores/${STORE_SLUG}/home`),
      publicApi<Product[]>(`/v1/public/stores/${STORE_SLUG}/products`),
      publicApi<Category[]>(`/v1/public/stores/${STORE_SLUG}/categories`),
    ]);
    return { store, home, products, categories };
  } catch {
    return fallback;
  }
}
