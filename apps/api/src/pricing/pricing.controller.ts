import { BadRequestException, Body, Controller, Headers, Inject, Param, Post, Put } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { PricingService } from './pricing.service';
import { changePriceSchema, createCouponSchema, createPromotionSchema, priceQuoteSchema } from './schemas';

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function validated<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try { return schema.parse(value); } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

@Controller('v1/admin/stores/:storeId/pricing')
export class AdminPricingController {
  constructor(@Inject(PricingService) private readonly pricing: PricingService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}

  @Post('promotions')
  async createPromotion(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'pricing:write');
    return { data: await this.pricing.createPromotion(storeId, validated(createPromotionSchema, body)) };
  }

  @Post('promotions/:promotionId/activate')
  async activatePromotion(@Param('storeId') storeId: string, @Param('promotionId') promotionId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'pricing:write');
    return { data: await this.pricing.activatePromotion(storeId, promotionId) };
  }

  @Post('coupons')
  async createCoupon(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'pricing:write');
    return { data: await this.pricing.createCoupon(storeId, validated(createCouponSchema, body)) };
  }

  @Put('variants/:variantId')
  async changePrice(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    const actor = await this.auth.authorize(bearer(authorization), storeId, 'pricing:write');
    return { data: await this.pricing.changePrice(storeId, variantId, actor.adminUserId, validated(changePriceSchema, body)) };
  }
}

@Controller('v1/public/stores/:storeSlug/pricing')
export class PublicPricingController {
  constructor(@Inject(PricingService) private readonly pricing: PricingService) {}

  @Post('quote')
  async quote(@Param('storeSlug') storeSlug: string, @Body() body: unknown) {
    return { data: await this.pricing.quote(storeSlug, validated(priceQuoteSchema, body)) };
  }
}
