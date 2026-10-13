import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch, Post, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { OperationsService } from './operations.service';
import { bulkShipmentSchema, exportQuerySchema, listQuerySchema, orderTransitionSchema, shipmentUpdateSchema } from './schemas';
import { pageEnvelope, type CursorPage } from '../platform/pagination';

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function parsed<T>(schema: { parse(value: unknown): T }, value: unknown): T { try { return schema.parse(value); } catch (error) { if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED'); throw error; } }

@Controller('v1/admin/stores/:storeId/operations')
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly operations: OperationsService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}

  @Get('summary')
  async summary(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false);
    return { data: await this.operations.summary(storeId) };
  }

  @Get('orders')
  async orders(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'orders:read', false);
    return pageEnvelope(await this.operations.orders(storeId, parsed(listQuerySchema, query)));
  }

  @Get('orders/:orderId')
  async order(@Param('storeId') storeId: string, @Param('orderId') orderId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'orders:read', false); return { data: await this.operations.order(storeId, orderId) }; }

  @Patch('orders/:orderId')
  async transitionOrder(@Param('storeId') storeId: string, @Param('orderId') orderId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'orders:write'); return { data: await this.operations.transitionOrder(storeId, orderId, actor.adminUserId, parsed(orderTransitionSchema, body)) }; }

  @Get('customers')
  async customers(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'customers:read', false); return { data: await this.operations.customers(storeId, parsed(listQuerySchema, query)) }; }

  @Get('customers/:customerId')
  async customer(@Param('storeId') storeId: string, @Param('customerId') customerId: string, @Headers('authorization') authorization: string | undefined): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'customers:read', false); return { data: await this.operations.customer(storeId, customerId) }; }

  @Get('customers/export')
  async exportCustomers(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown, @Res({ passthrough: true }) reply: FastifyReply): Promise<string> { await this.auth.authorize(bearer(authorization), storeId, 'customers:read', false); const exported = await this.operations.exportCustomers(storeId, parsed(exportQuerySchema, query)); reply.header('content-type', exported.contentType); reply.header('content-disposition', `attachment; filename="${exported.filename}"`); return exported.content; }

  @Get('shipments')
  async shipments(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'orders:read', false); return { data: await this.operations.shipments(storeId, parsed(listQuerySchema, query)) }; }

  @Patch('shipments/:shipmentId')
  async updateShipment(@Param('storeId') storeId: string, @Param('shipmentId') shipmentId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'orders:write'); return { data: await this.operations.updateShipment(storeId, shipmentId, actor.adminUserId, parsed(shipmentUpdateSchema, body)) }; }

  @Post('shipments/bulk')
  async bulkShipments(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'orders:write'); const input = parsed(bulkShipmentSchema, body); return { data: await this.operations.bulkUpdateShipments(storeId, input.ids, actor.adminUserId, input.update) }; }

  @Get('imports')
  async imports(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'imports:read', false);
    return pageEnvelope(await this.operations.imports(storeId, parsed(listQuerySchema, query)));
  }

  @Get('audit')
  async audit(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown): Promise<{ data: unknown; meta: { nextCursor: string | null; hasMore: boolean } }> {
    await this.auth.authorize(bearer(authorization), storeId, 'audit:read', false);
    return pageEnvelope(await this.operations.audit(storeId, parsed(listQuerySchema, query)) as CursorPage);
  }
}
