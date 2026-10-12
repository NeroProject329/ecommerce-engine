import { BadRequestException, Body, Controller, Get, Headers, HttpCode, Inject, Param, Post, Put } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { CatalogService } from './catalog.service';
import {
  createBrandSchema,
  createAttributeSchema,
  assignCategoryAttributeSchema,
  createCategorySchema,
  createProductSchema,
  createInventoryLocationSchema,
  createVariantSchema,
  setInventorySchema,
  setPriceSchema,
  setAttributeValueSchema,
} from './schemas';

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

@Controller('v1/admin/stores/:storeId/catalog')
export class AdminCatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
  ) {}

  @Get('products')
  async products(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false);
    return { data: await this.catalog.adminProducts(storeId) };
  }

  @Post('categories')
  async createCategory(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.createCategory(storeId, validated(createCategorySchema, body)) };
  }

  @Post('brands')
  async createBrand(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.createBrand(storeId, validated(createBrandSchema, body)) };
  }

  @Post('attributes')
  async createAttribute(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.createAttribute(storeId, validated(createAttributeSchema, body)) };
  }

  @Put('categories/:categoryId/attributes')
  async assignCategoryAttribute(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.assignCategoryAttribute(storeId, categoryId, validated(assignCategoryAttributeSchema, body)) };
  }

  @Post('products')
  async createProduct(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.createProduct(storeId, validated(createProductSchema, body)) };
  }

  @Post('products/:productId/variants')
  async createVariant(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.createVariant(storeId, productId, validated(createVariantSchema, body)) };
  }

  @Put('products/:productId/attributes')
  async setProductAttribute(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.setProductAttribute(storeId, productId, validated(setAttributeValueSchema, body)) };
  }

  @Put('variants/:variantId/attributes')
  async setVariantAttribute(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.setVariantAttribute(storeId, variantId, validated(setAttributeValueSchema, body)) };
  }

  @Post('variants/:variantId/prices')
  async setPrice(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.setPrice(storeId, variantId, validated(setPriceSchema, body)) };
  }

  @Put('variants/:variantId/inventory')
  async setInventory(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'inventory:write');
    return { data: await this.catalog.setInventory(storeId, variantId, validated(setInventorySchema, body)) };
  }

  @Post('inventory-locations')
  async createInventoryLocation(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'inventory:write');
    return { data: await this.catalog.createInventoryLocation(storeId, validated(createInventoryLocationSchema, body)) };
  }

  @Post('products/:productId/publish')
  @HttpCode(200)
  async publish(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.publishProduct(storeId, productId) };
  }
}
