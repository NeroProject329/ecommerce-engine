import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { CommunicationsService } from './communications.service';
import { campaignSchema, outboxQuerySchema, templateSchema, updateCampaignSchema, updateTemplateSchema, updateWebhookSchema, webhookSchema } from './schemas';

function bearer(value: string | undefined) { if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED'); return value.slice(7); }
function parse<T>(schema: { parse(value: unknown): T }, value: unknown): T { try { return schema.parse(value); } catch (error) { if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED'); throw error; } }

@Controller('v1/admin/stores/:storeId/communications')
export class CommunicationsController {
  constructor(@Inject(CommunicationsService) private readonly service: CommunicationsService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}
  private async authorize(storeId: string, authorization?: string) { return this.auth.authorize(bearer(authorization), storeId, 'settings:write'); }
  @Get('webhooks') async webhooks(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.authorize(storeId, authorization); return { data: await this.service.webhooks(storeId) }; }
  @Post('webhooks') async createWebhook(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.authorize(storeId, authorization); return { data: await this.service.createWebhook(storeId, parse(webhookSchema, body)) }; }
  @Patch('webhooks/:id') async updateWebhook(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.authorize(storeId, authorization); return { data: await this.service.updateWebhook(storeId, id, parse(updateWebhookSchema, body)) }; }
  @Delete('webhooks/:id') @HttpCode(204) async deleteWebhook(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization?: string): Promise<void> { await this.authorize(storeId, authorization); await this.service.deleteWebhook(storeId, id); }
  @Get('webhook-deliveries') async deliveries(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) { await this.authorize(storeId, authorization); return { data: await this.service.deliveries(storeId) }; }
  @Get('templates') async templates(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) { await this.authorize(storeId, authorization); return { data: await this.service.templates(storeId) }; }
  @Post('templates') async createTemplate(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { await this.authorize(storeId, authorization); return { data: await this.service.createTemplate(storeId, parse(templateSchema, body)) }; }
  @Patch('templates/:id') async updateTemplate(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { await this.authorize(storeId, authorization); return { data: await this.service.updateTemplate(storeId, id, parse(updateTemplateSchema, body)) }; }
  @Delete('templates/:id') @HttpCode(204) async deleteTemplate(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization?: string): Promise<void> { await this.authorize(storeId, authorization); await this.service.deleteTemplate(storeId, id); }
  @Get('campaigns') async campaigns(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string) { await this.authorize(storeId, authorization); return { data: await this.service.campaigns(storeId) }; }
  @Post('campaigns') async createCampaign(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { await this.authorize(storeId, authorization); return { data: await this.service.createCampaign(storeId, parse(campaignSchema, body)) }; }
  @Patch('campaigns/:id') async updateCampaign(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) { await this.authorize(storeId, authorization); return { data: await this.service.updateCampaign(storeId, id, parse(updateCampaignSchema, body)) }; }
  @Post('campaigns/:id/dispatch') async dispatchCampaign(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization?: string) { await this.authorize(storeId, authorization); return { data: await this.service.dispatchCampaign(storeId, id) }; }
  @Get('outbox') async outbox(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown): Promise<{ data: unknown }> { await this.authorize(storeId, authorization); return { data: await this.service.outbox(storeId, parse(outboxQuerySchema, query)) }; }
  @Post('outbox/:id/retry') async retryOutbox(@Param('storeId') storeId: string, @Param('id') id: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.authorize(storeId, authorization); return { data: await this.service.retryOutbox(storeId, id) }; }
}
