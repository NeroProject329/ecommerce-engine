import { z } from 'zod';

export const createImportSourceSchema = z.object({
  code: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1).max(180),
  allowedDomains: z.array(z.string().trim().min(1).max(253)).max(100).default([]),
});

export type CreateImportSourceInput = z.infer<typeof createImportSourceSchema>;
