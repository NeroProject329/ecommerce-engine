import { z } from 'zod';

export const uploadMediaSchema = z.object({
  contentBase64: z.string().min(12).max(14_000_000).regex(/^[A-Za-z0-9+/]+={0,2}$/),
});

export const importMediaSchema = z.object({
  url: z.string().url().max(2048).refine((value) => value.startsWith('https://')),
});

export const attachMediaSchema = z.object({
  mediaAssetId: z.string().uuid(),
  role: z.enum(['PRIMARY', 'GALLERY', 'THUMBNAIL', 'SWATCH']).default('GALLERY'),
  sortOrder: z.number().int().min(0).max(10_000).default(0),
});

export type UploadMediaInput = z.infer<typeof uploadMediaSchema>;
export type ImportMediaInput = z.infer<typeof importMediaSchema>;
export type AttachMediaInput = z.infer<typeof attachMediaSchema>;
