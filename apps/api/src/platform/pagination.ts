import { BadRequestException } from '@nestjs/common';
import { z, ZodError } from 'zod';

export const paginationSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50), cursor: z.string().uuid().optional(), status: z.string().trim().min(1).max(80).optional(), q: z.string().trim().min(1).max(180).optional() });
export type PaginationInput = z.infer<typeof paginationSchema>;
export type CursorPage<T = unknown> = { items: T[]; nextCursor: string | null; hasMore: boolean };
export function pagination(value: unknown): PaginationInput { try { return paginationSchema.parse(value); } catch (error) { if (error instanceof ZodError) throw new BadRequestException('PAGINATION_INVALID'); throw error; } }
export function cursorPage<T extends { id: string }>(items: T[], limit: number): CursorPage<T> { const hasMore = items.length > limit; const page = items.slice(0, limit); return { items: page, nextCursor: hasMore ? page.at(-1)?.id ?? null : null, hasMore }; }
export function pageEnvelope<T>(page: CursorPage<T>): { data: T[]; meta: { nextCursor: string | null; hasMore: boolean } } { return { data: page.items, meta: { nextCursor: page.nextCursor, hasMore: page.hasMore } }; }
