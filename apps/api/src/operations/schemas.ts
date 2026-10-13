import { z } from 'zod';

export const orderTransitionSchema = z.object({
  status: z.enum(['PAID', 'FULFILLING', 'SHIPPED', 'DELIVERED', 'CANCELED', 'PAYMENT_FAILED', 'REFUND_PENDING', 'PARTIALLY_REFUNDED', 'REFUNDED']),
  reason: z.string().trim().max(500).optional(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
  status: z.string().trim().min(1).max(80).optional(),
  q: z.string().trim().min(1).max(180).optional(),
});
export const shipmentUpdateSchema = z.object({ carrier: z.string().trim().min(2).max(120).optional(), service: z.string().trim().min(2).max(120).optional(), trackingCode: z.string().trim().max(180).nullish(), trackingUrl: z.url().max(2048).nullish(), estimatedDeliveryAt: z.coerce.date().nullish(), status: z.enum(['PENDING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELED']).optional() }).refine((value) => Object.keys(value).length > 0);
export const bulkShipmentSchema = z.object({ ids: z.array(z.string().uuid()).min(1).max(200), update: shipmentUpdateSchema });
export const exportQuerySchema = z.object({ format: z.enum(['json', 'markdown']).default('json'), customerId: z.string().uuid().optional() });

export type OrderTransitionInput = z.infer<typeof orderTransitionSchema>;
export type ListQueryInput = z.infer<typeof listQuerySchema>;
export type ShipmentUpdateInput = z.infer<typeof shipmentUpdateSchema>;
export type ExportQueryInput = z.infer<typeof exportQuerySchema>;
