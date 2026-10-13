import { z } from 'zod';

export const integrationScopes = ['catalog:submit', 'catalog:read'] as const;
export const createIntegrationClientSchema = z.object({
  name: z.string().trim().min(2).max(80),
  scopes: z.array(z.enum(integrationScopes)).min(1).max(integrationScopes.length),
});
export const consentSchema = z.object({
  purpose: z.enum(['marketing', 'analytics', 'personalization']),
  channel: z.enum(['email', 'sms', 'whatsapp', 'site']),
  granted: z.boolean(),
  version: z.string().trim().min(1).max(80),
});
export type CreateIntegrationClientInput = z.infer<typeof createIntegrationClientSchema>;
export type ConsentInput = z.infer<typeof consentSchema>;
