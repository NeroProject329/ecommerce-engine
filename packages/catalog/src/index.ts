export type PublicationStatus = 'DRAFT' | 'REVIEW' | 'PUBLISHED' | 'ARCHIVED';

export interface VariantAvailability {
  active: boolean;
  priceCents: number | null;
  availableQuantity: number;
}

export function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 180);
}

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, '-').slice(0, 120);
}

export function isValidEan(value: string): boolean {
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const checkDigit = digits.pop();
  const sum = digits
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === checkDigit;
}

export function buildCategoryPath(parentPath: string | null, slug: string): string {
  const normalized = normalizeSlug(slug);
  if (!normalized) throw new Error('CATEGORY_SLUG_INVALID');
  return parentPath ? `${parentPath}/${normalized}` : normalized;
}

export function canPublishProduct(variants: readonly VariantAvailability[]): boolean {
  return variants.some(
    (variant) =>
      variant.active &&
      variant.priceCents !== null &&
      Number.isSafeInteger(variant.priceCents) &&
      variant.priceCents >= 0 &&
      variant.availableQuantity > 0,
  );
}
