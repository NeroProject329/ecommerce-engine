import { Controller, Get, Inject, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('v1/public/stores/:storeSlug')
export class PublicCatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}

  @Get('categories')
  async categories(@Param('storeSlug') storeSlug: string) {
    return { data: await this.catalog.publicCategories(storeSlug) };
  }

  @Get('brands')
  async brands(@Param('storeSlug') storeSlug: string) {
    return { data: await this.catalog.publicBrands(storeSlug) };
  }

  @Get('products')
  async products(@Param('storeSlug') storeSlug: string) {
    return { data: await this.catalog.publicProducts(storeSlug) };
  }

  @Get('products/:productSlug')
  async product(@Param('storeSlug') storeSlug: string, @Param('productSlug') productSlug: string) {
    return { data: await this.catalog.publicProduct(storeSlug, productSlug) };
  }
}
