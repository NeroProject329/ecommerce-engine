import { z } from 'zod';

export const storeIdSchema = z.uuid();
export const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const amountCentsSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER);

export function normalizeEmail(value: string): string {
  return value.trim().toLocaleLowerCase('pt-BR');
}
