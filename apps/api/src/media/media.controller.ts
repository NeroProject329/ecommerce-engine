import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Post, Put, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { MediaService } from './media.service';
import { attachMediaSchema, importMediaSchema, uploadMediaSchema } from './schemas';
import { pageEnvelope, pagination } from '../platform/pagination';

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

@Controller('v1/admin/stores/:storeId/media')
export class AdminMediaController {
  constructor(
    @Inject(MediaService) private readonly media: MediaService,
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
  ) {}

  @Get()
  async list(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown): Promise<{ data: unknown; meta: { nextCursor: string | null; hasMore: boolean } }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false);
    return pageEnvelope(await this.media.list(storeId, pagination(query)));
  }
  @Delete(':mediaId') @HttpCode(204) async delete(@Param('storeId') storeId: string, @Param('mediaId') mediaId: string, @Headers('authorization') authorization?: string): Promise<void> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); await this.media.delete(storeId, mediaId); }

  @Post('uploads')
  async upload(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.media.upload(storeId, validated(uploadMediaSchema, body)) };
  }

  @Post('imports')
  async importUrl(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.media.importUrl(storeId, validated(importMediaSchema, body)) };
  }

  @Put('products/:productId')
  async attachProduct(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.media.attachProduct(storeId, productId, validated(attachMediaSchema, body)) };
  }

  @Put('variants/:variantId')
  async attachVariant(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.media.attachVariant(storeId, variantId, validated(attachMediaSchema, body)) };
  }
}

@Controller('v1/public/media')
export class PublicMediaController {
  constructor(@Inject(MediaService) private readonly media: MediaService) {}

  @Get(':storeId/:hash/:file')
  async file(@Param('storeId') storeId: string, @Param('hash') hash: string, @Param('file') file: string, @Res() reply: FastifyReply): Promise<void> {
    const result = await this.media.publicFile(`${storeId}/${hash}/${file}`);
    reply.type(result.mimeType).header('cache-control', 'public, max-age=31536000, immutable').send(Buffer.from(result.body));
  }
}
