import { z } from 'zod';

const permission = z.enum(['catalog:read', 'catalog:write', 'inventory:read', 'inventory:write', 'pricing:read', 'pricing:write', 'orders:read', 'orders:write', 'customers:read', 'customers:write', 'payments:read', 'payments:refund', 'imports:read', 'imports:write', 'audit:read', 'users:write', 'settings:write']);

export const createRoleSchema = z.object({ name: z.string().trim().min(2).max(120), permissions: z.array(permission).min(1) });
export const updateRoleSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), permissions: z.array(permission).min(1).optional() }).refine((value) => Object.keys(value).length > 0);
export const createUserSchema = z.object({ email: z.email(), password: z.string().min(12).max(1024), roleId: z.string().uuid(), status: z.enum(['INVITED', 'ACTIVE', 'DISABLED']).default('ACTIVE') });
export const updateUserSchema = z.object({ roleId: z.string().uuid().optional(), membershipStatus: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']).optional(), accountStatus: z.enum(['INVITED', 'ACTIVE', 'DISABLED']).optional() }).refine((value) => Object.keys(value).length > 0);

export type CreateRoleInput = z.infer<typeof createRoleSchema>;
export type UpdateRoleInput = z.infer<typeof updateRoleSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
