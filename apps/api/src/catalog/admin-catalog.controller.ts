import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Patch, Post, Put, Query } from '@nestjs/common';
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
  updateCategorySchema,
  updateBrandSchema,
  updateAttributeSchema,
  updateProductSchema,
  updateVariantSchema,
  inventoryAdjustmentSchema,
  bulkIdsSchema,
} from './schemas';
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

@Controller('v1/admin/stores/:storeId/catalog')
export class AdminCatalogController {
  constructor(
    @Inject(CatalogService) private readonly catalog: CatalogService,
    @Inject(AdminAuthService) private readonly auth: AdminAuthService,
  ) {}

  @Get('products')
  async products(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Query() query: unknown) {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false);
    return pageEnvelope(await this.catalog.adminProducts(storeId, pagination(query)));
  }

  @Get('products/:productId')
  async product(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false);
    return { data: await this.catalog.adminProduct(storeId, productId) };
  }

  @Get('categories')
  async categories(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false); return { data: await this.catalog.adminCategories(storeId) }; }

  @Patch('categories/:categoryId')
  async updateCategory(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.updateCategory(storeId, categoryId, validated(updateCategorySchema, body)) }; }
  @Delete('categories/:categoryId') async archiveCategory(@Param('storeId') storeId: string, @Param('categoryId') categoryId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.archiveCategory(storeId, categoryId) }; }

  @Get('brands')
  async brands(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false); return { data: await this.catalog.adminBrands(storeId) }; }

  @Patch('brands/:brandId')
  async updateBrand(@Param('storeId') storeId: string, @Param('brandId') brandId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.updateBrand(storeId, brandId, validated(updateBrandSchema, body)) }; }
  @Delete('brands/:brandId') async archiveBrand(@Param('storeId') storeId: string, @Param('brandId') brandId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.archiveBrand(storeId, brandId) }; }

  @Get('attributes')
  async attributes(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:read', false); return { data: await this.catalog.adminAttributes(storeId) }; }

  @Patch('attributes/:attributeId')
  async updateAttribute(@Param('storeId') storeId: string, @Param('attributeId') attributeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.updateAttribute(storeId, attributeId, validated(updateAttributeSchema, body)) }; }
  @Delete('attributes/:attributeId') async archiveAttribute(@Param('storeId') storeId: string, @Param('attributeId') attributeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.archiveAttribute(storeId, attributeId) }; }

  @Patch('products/:productId')
  async updateProduct(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.updateProduct(storeId, productId, validated(updateProductSchema, body)) }; }

  @Delete('products/:productId')
  async archiveProduct(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.archiveProduct(storeId, productId) }; }
  @Post('products/bulk/archive') async bulkArchiveProducts(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.bulkArchiveProducts(storeId, validated(bulkIdsSchema, body).ids) }; }

  @Patch('variants/:variantId')
  async updateVariant(@Param('storeId') storeId: string, @Param('variantId') variantId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'catalog:write'); return { data: await this.catalog.updateVariant(storeId, variantId, validated(updateVariantSchema, body)) }; }

  @Get('inventory')
  async inventory(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'inventory:read', false); return { data: await this.catalog.inventory(storeId) }; }

  @Get('inventory/movements')
  async inventoryMovements(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'inventory:read', false); return { data: await this.catalog.inventoryMovements(storeId) }; }

  @Post('inventory/adjustments')
  async adjustInventory(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'inventory:write'); return { data: await this.catalog.adjustInventory(storeId, actor.adminUserId, validated(inventoryAdjustmentSchema, body)) }; }

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

  @Get('inventory-locations')
  async inventoryLocations(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'inventory:read', false);
    return { data: await this.catalog.inventoryLocations(storeId) };
  }

  @Post('products/:productId/publish')
  @HttpCode(200)
  async publish(@Param('storeId') storeId: string, @Param('productId') productId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> {
    await this.auth.authorize(bearer(authorization), storeId, 'catalog:write');
    return { data: await this.catalog.publishProduct(storeId, productId) };
  }
}
