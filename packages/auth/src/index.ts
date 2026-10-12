export type Permission =
  | 'catalog:read'
  | 'catalog:write'
  | 'inventory:read'
  | 'inventory:write'
  | 'pricing:read'
  | 'pricing:write'
  | 'orders:read'
  | 'orders:write'
  | 'customers:read'
  | 'customers:write'
  | 'payments:read'
  | 'payments:refund'
  | 'imports:read'
  | 'imports:write'
  | 'audit:read'
  | 'users:write'
  | 'settings:write';

export interface AuthorizationContext {
  storeId: string;
  permissions: ReadonlySet<Permission>;
  mfaVerified: boolean;
}

export function authorizeStoreAction(
  context: AuthorizationContext,
  requestedStoreId: string,
  permission: Permission,
  requiresMfa = true,
): boolean {
  return (
    context.storeId === requestedStoreId &&
    context.permissions.has(permission) &&
    (!requiresMfa || context.mfaVerified)
  );
}

export { hashPassword, normalizeEmail, verifyPassword } from './password';
export { createOpaqueToken, hashOpaqueToken } from './tokens';
export { generateTotpSecret, generateTotp, verifyTotp } from './totp';
export { openSecret, sealSecret } from './secret-box';
