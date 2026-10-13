import { BadRequestException, Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ZodError } from 'zod';
import { CatalogService } from './catalog.service';
import { publicSearchSchema } from './schemas';

@Controller('v1/public/stores/:storeSlug')
export class PublicCatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get()
  async store(@Param('storeSlug') storeSlug: string): Promise<{ data: unknown }> {
    return { data: await this.catalog.publicStore(storeSlug) };
  }

  @Get('home')
  async home(@Param('storeSlug') storeSlug: string): Promise<{ data: unknown }> {
    return { data: await this.catalog.publicHome(storeSlug) };
  }

  @Get('categories')
  async categories(@Param('storeSlug') storeSlug: string) {
    return { data: await this.catalog.publicCategories(storeSlug) };
  }

  @Get('brands')
  async brands(@Param('storeSlug') storeSlug: string) {
    return { data: await this.catalog.publicBrands(storeSlug) };
  }

  @Get('products')
  async products(@Param('storeSlug') storeSlug: string): Promise<{ data: unknown }> {
    return { data: await this.catalog.publicProducts(storeSlug) };
  }

  @Get('products/:productSlug')
  async product(@Param('storeSlug') storeSlug: string, @Param('productSlug') productSlug: string): Promise<{ data: unknown }> {
    return { data: await this.catalog.publicProduct(storeSlug, productSlug) };
  }

  @Get('search')
  async search(@Param('storeSlug') storeSlug: string, @Query() query: unknown): Promise<{ data: unknown }> {
    try {
      return { data: await this.catalog.publicSearch(storeSlug, publicSearchSchema.parse(query)) };
    } catch (error) {
      if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
      throw error;
    }
  }
}
