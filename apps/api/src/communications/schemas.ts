import { z } from 'zod';

export const webhookSchema = z.object({ name: z.string().trim().min(2).max(160), url: z.url().max(2048).refine((value) => value.startsWith('https://') || /^http:\/\/(localhost|127\.0\.0\.1)(:|\/)/u.test(value), 'WEBHOOK_URL_INSECURE'), secret: z.union([z.literal('generate'), z.string().min(24).max(500)]), eventTypes: z.array(z.string().trim().min(3).max(180)).min(1).max(100), enabled: z.boolean().default(true) });
export const updateWebhookSchema = webhookSchema.partial().refine((value) => Object.keys(value).length > 0);
export const templateSchema = z.object({ code: z.string().trim().regex(/^[a-z0-9._-]{3,120}$/u), channel: z.literal('EMAIL').default('EMAIL'), subject: z.string().trim().min(2).max(240), bodyMarkdown: z.string().min(2).max(100_000), enabled: z.boolean().default(true) });
export const updateTemplateSchema = templateSchema.omit({ code: true }).partial().refine((value) => Object.keys(value).length > 0);
export const campaignSchema = z.object({ name: z.string().trim().min(2).max(180), channel: z.literal('EMAIL').default('EMAIL'), subject: z.string().trim().min(2).max(240), bodyMarkdown: z.string().min(2).max(100_000), scheduledAt: z.coerce.date().nullish() });
export const updateCampaignSchema = campaignSchema.partial().refine((value) => Object.keys(value).length > 0);
export const outboxQuerySchema = z.object({ status: z.enum(['PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED']).optional(), limit: z.coerce.number().int().min(1).max(200).default(50), cursor: z.string().uuid().optional() });

export type WebhookInput = z.infer<typeof webhookSchema>;
export type UpdateWebhookInput = z.infer<typeof updateWebhookSchema>;
export type TemplateInput = z.infer<typeof templateSchema>;
export type UpdateTemplateInput = z.infer<typeof updateTemplateSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type OutboxQueryInput = z.infer<typeof outboxQuerySchema>;
