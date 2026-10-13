import { z } from 'zod';

const password = z.string().min(12).max(1024);

export const customerRegisterSchema = z.object({
  storeSlug: z.string().trim().min(2).max(120),
  email: z.email(),
  name: z.string().trim().min(2).max(180),
  password,
});

export const customerLoginSchema = z.object({
  storeSlug: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(1).max(1024),
});

export const recoveryRequestSchema = z.object({
  storeSlug: z.string().trim().min(2).max(120),
  email: z.email(),
});

export const recoveryResetSchema = z.object({
  token: z.string().min(32).max(512),
  newPassword: password,
});

export type CustomerRegisterInput = z.infer<typeof customerRegisterSchema>;
export type CustomerLoginInput = z.infer<typeof customerLoginSchema>;
export type RecoveryRequestInput = z.infer<typeof recoveryRequestSchema>;
export type RecoveryResetInput = z.infer<typeof recoveryResetSchema>;

export const adminLoginSchema = z.object({
  storeSlug: z.string().trim().min(2).max(120),
  email: z.email(),
  password: z.string().min(1).max(1024),
  totp: z.string().regex(/^\d{6}$/u).optional(),
});

export const totpVerificationSchema = z.object({ code: z.string().regex(/^\d{6}$/u) });
export const adminPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: password,
}).refine((value) => value.currentPassword !== value.newPassword, { path: ['newPassword'], message: 'NEW_PASSWORD_MUST_DIFFER' });

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type TotpVerificationInput = z.infer<typeof totpVerificationSchema>;
export type AdminPasswordChangeInput = z.infer<typeof adminPasswordChangeSchema>;

export const adminRecoveryRequestSchema = z.object({
  storeSlug: z.string().trim().min(2).max(120),
  email: z.email(),
});

export const adminRecoveryResetSchema = z.object({ token: z.string().min(32).max(512), newPassword: password });

export type AdminRecoveryRequestInput = z.infer<typeof adminRecoveryRequestSchema>;
export type AdminRecoveryResetInput = z.infer<typeof adminRecoveryResetSchema>;
