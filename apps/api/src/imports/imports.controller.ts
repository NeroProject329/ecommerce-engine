import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { ImportsService } from './imports.service';
import { createImportSourceSchema } from './schemas';

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function validated<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

@Controller('v1/admin/stores/:storeId/imports')
export class ImportsController {
  constructor(
    @Inject(ImportsService) private readonly imports: ImportsService,
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
  ) {}

  @Post('sources')
  async createSource(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'imports:write');
    return { data: await this.imports.createSource(storeId, validated(createImportSourceSchema, body)) };
  }

  @Post('batches')
  async submit(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'imports:write');
    try {
      return { data: await this.imports.submit(storeId, body) };
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException('IMPORT_CONTRACT_INVALID');
      throw error;
    }
  }

  @Get('batches/:batchId')
  async report(@Param('storeId') storeId: string, @Param('batchId') batchId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'imports:read', false);
    return { data: await this.imports.report(storeId, batchId) };
  }
}
