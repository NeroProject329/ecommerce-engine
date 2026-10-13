import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { ImportsService } from '../imports/imports.service';
import { IntegrationsService } from './integrations.service';
import { consentSchema, createIntegrationClientSchema } from './schemas';

function parse<T>(schema: { parse(value: unknown): T }, value: unknown): T { try { return schema.parse(value); } catch (error) { if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED'); throw error; } }
function bearer(value: string | undefined) { if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED'); return value.slice(7); }

@Controller('v1/admin/stores/:storeId/integrations')
export class AdminIntegrationsController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}
  @Get('clients') async clients(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) { await this.auth.authorize(bearer(authorization), storeId, 'settings:write'); return { data: await this.integrations.listClients(storeId) }; }
  @Post('clients') async create(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { const actor = await this.auth.authorize(bearer(authorization), storeId, 'settings:write'); return { data: await this.integrations.createClient(storeId, actor.adminUserId, parse(createIntegrationClientSchema, body)) }; }
  @Post('clients/:clientId/rotate') async rotate(@Param('storeId') storeId: string, @Param('clientId') clientId: string, @Headers('authorization') authorization: string | undefined) { const actor = await this.auth.authorize(bearer(authorization), storeId, 'settings:write'); return { data: await this.integrations.rotateClient(storeId, clientId, actor.adminUserId) }; }
  @Get('consents') async consents(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) { await this.auth.authorize(bearer(authorization), storeId, 'customers:read', false); return { data: await this.integrations.listConsents(storeId) }; }
}

@Controller('v1/integrations/catalog')
export class CatalogIntegrationController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService, @Inject(ImportsService) private readonly imports: ImportsService) {}
  @Post('batches') async submit(@Headers('x-client-id') clientId: string | undefined, @Headers('x-client-secret') secret: string | undefined, @Body() body: unknown) { const actor = await this.integrations.authorizeClient(clientId, secret, 'catalog:submit'); return { data: await this.imports.submit(actor.storeId, body) }; }
  @Get('batches/:batchId') async report(@Param('batchId') batchId: string, @Headers('x-client-id') clientId: string | undefined, @Headers('x-client-secret') secret: string | undefined) { const actor = await this.integrations.authorizeClient(clientId, secret, 'catalog:read'); return { data: await this.imports.report(actor.storeId, batchId) }; }
  @Get('batches/:batchId/items') async items(@Param('batchId') batchId: string, @Headers('x-client-id') clientId: string | undefined, @Headers('x-client-secret') secret: string | undefined): Promise<{ data: unknown }> { const actor = await this.integrations.authorizeClient(clientId, secret, 'catalog:read'); return { data: await this.imports.items(actor.storeId, batchId) }; }
  @Post('batches/:batchId/retry') async retry(@Param('batchId') batchId: string, @Headers('x-client-id') clientId: string | undefined, @Headers('x-client-secret') secret: string | undefined) { const actor = await this.integrations.authorizeClient(clientId, secret, 'catalog:submit'); return { data: await this.imports.retry(actor.storeId, batchId) }; }
}

@Controller('v1/customer/stores/:storeSlug/consents')
export class CustomerConsentController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService, @Inject(CustomerAuthService) private readonly auth: CustomerAuthService) {}
  @Post() @HttpCode(201) async record(@Param('storeSlug') storeSlug: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { const token = bearer(authorization); return { data: await this.integrations.recordConsent(storeSlug, token, parse(consentSchema, body), async storeId => this.auth.authorize(token, storeId)) }; }
}
