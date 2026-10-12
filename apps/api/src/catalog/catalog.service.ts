import { buildCategoryPath, canPublishProduct, isValidEan, normalizeSku, normalizeSlug } from '@ecommerce/catalog';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  CreateBrandInput,
  CreateAttributeInput,
  AssignCategoryAttributeInput,
  CreateCategoryInput,
  CreateProductInput,
  CreateInventoryLocationInput,
  CreateVariantInput,
  SetInventoryInput,
  SetPriceInput,
  SetAttributeValueInput,
} from './schemas';

function requiredSlug(value: string): string {
  const result = normalizeSlug(value);
  if (!result) throw new BadRequestException('SLUG_INVALID');
  return result;
}

function mediaUrl(storageKey: string): string {
  const base = process.env.MEDIA_STORAGE_DRIVER === 'r2' ? process.env.R2_PUBLIC_BASE_URL : '/v1/public/media';
  return `${(base ?? '/v1/public/media').replace(/\/$/, '')}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

function publicVariant(variant: {
  id: string;
  sku: string | null;
  ean: string | null;
  variantAttributes: unknown;
  prices: Array<{ amountCents: bigint; compareAtCents: bigint | null; currency: string }>;
  inventory: Array<{ onHand: number; reserved: number }>;
  media: Array<{ role: string; sortOrder: number; asset: { storageKey: string; renditions: Array<{ storageKey: string; format: string; width: number; height: number }> } }>;
}) {
  const price = variant.prices[0];
  return {
    id: variant.id,
    sku: variant.sku,
    ean: variant.ean,
    attributes: variant.variantAttributes,
    price: price ? {
      amountCents: Number(price.amountCents),
      compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
      currency: price.currency,
    } : null,
    availableQuantity: variant.inventory.reduce((total, item) => total + item.onHand - item.reserved, 0),
    media: variant.media.map((item) => ({
      role: item.role,
      sortOrder: item.sortOrder,
      url: mediaUrl(item.asset.storageKey),
      renditions: item.asset.renditions.map((rendition) => ({ ...rendition, url: mediaUrl(rendition.storageKey) })),
    })),
  };
}

function normalizeAttributeCode(value: string): string {
  const code = normalizeSlug(value).replace(/-/g, '_').toUpperCase();
  if (!code) throw new BadRequestException('ATTRIBUTE_CODE_INVALID');
  return code;
}

function assertAttributeValue(definition: { dataType: string; optionsJson: unknown }, value: unknown): void {
  const options = Array.isArray(definition.optionsJson) ? definition.optionsJson.filter((entry): entry is string => typeof entry === 'string') : [];
  const valid =
    (definition.dataType === 'TEXT' && typeof value === 'string') ||
    (definition.dataType === 'NUMBER' && typeof value === 'number' && Number.isFinite(value)) ||
    (definition.dataType === 'BOOLEAN' && typeof value === 'boolean') ||
    (definition.dataType === 'OPTION' && typeof value === 'string' && options.includes(value)) ||
    (definition.dataType === 'MULTI_OPTION' && Array.isArray(value) && value.every((entry) => typeof entry === 'string' && options.includes(entry)));
  if (!valid) throw new BadRequestException('ATTRIBUTE_VALUE_INVALID');
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async publicCategories(storeSlug: string) {
    return this.prisma.client.category.findMany({
      where: { store: { slug: storeSlug, status: 'ACTIVE' }, status: 'ACTIVE' },
      orderBy: [{ position: 'asc' }, { name: 'asc' }],
      select: { id: true, parentId: true, slug: true, name: true, path: true, position: true },
    });
  }

  async publicBrands(storeSlug: string) {
    return this.prisma.client.brand.findMany({
      where: { store: { slug: storeSlug, status: 'ACTIVE' }, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true },
    });
  }

  async publicProducts(storeSlug: string) {
    const now = new Date();
    const products = await this.prisma.client.product.findMany({
      where: { store: { slug: storeSlug, status: 'ACTIVE' }, publicationStatus: 'PUBLISHED' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        brand: { select: { id: true, slug: true, name: true } },
        primaryCategory: { select: { id: true, slug: true, name: true, path: true } },
        media: { orderBy: { sortOrder: 'asc' }, include: { asset: { include: { renditions: true } } } },
        variants: {
          where: { status: 'ACTIVE' },
          include: {
            prices: { where: { AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] }, { OR: [{ validTo: null }, { validTo: { gt: now } }] }] }, orderBy: { createdAt: 'desc' }, take: 1 },
            inventory: { select: { onHand: true, reserved: true } },
            media: { orderBy: { sortOrder: 'asc' }, include: { asset: { include: { renditions: true } } } },
          },
        },
      },
    });
    return products.map((product) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      brand: product.brand,
      primaryCategory: product.primaryCategory,
      media: product.media.map((item) => ({
        role: item.role,
        sortOrder: item.sortOrder,
        url: mediaUrl(item.asset.storageKey),
        renditions: item.asset.renditions.map((rendition) => ({ ...rendition, bytes: Number(rendition.bytes), url: mediaUrl(rendition.storageKey) })),
      })),
      variants: product.variants.map(publicVariant).filter((variant) => variant.price && variant.availableQuantity > 0),
    })).filter((product) => product.variants.length > 0);
  }

  async publicProduct(storeSlug: string, productSlug: string) {
    const products = await this.publicProducts(storeSlug);
    const product = products.find((entry) => entry.slug === productSlug);
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return product;
  }

  async adminProducts(storeId: string): Promise<unknown> {
    const products = await this.prisma.client.product.findMany({
      where: { storeId },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      include: { brand: true, primaryCategory: true, variants: { include: { prices: true, inventory: true } } },
    });
    return products.map((product) => ({
      ...product,
      variants: product.variants.map((variant) => ({
        ...variant,
        prices: variant.prices.map((price) => ({
          ...price,
          amountCents: Number(price.amountCents),
          compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
        })),
      })),
    }));
  }

  async createCategory(storeId: string, input: CreateCategoryInput) {
    const slug = requiredSlug(input.slug ?? input.name);
    const parent = input.parentId ? await this.prisma.client.category.findFirst({ where: { id: input.parentId, storeId } }) : null;
    if (input.parentId && !parent) throw new BadRequestException('CATEGORY_PARENT_INVALID');
    try {
      return await this.prisma.client.category.create({
        data: { storeId, name: input.name, slug, parentId: parent?.id ?? null, path: buildCategoryPath(parent?.path ?? null, slug), position: input.position },
      });
    } catch (error) {
      throw new ConflictException('CATEGORY_ALREADY_EXISTS', { cause: error });
    }
  }

  async createBrand(storeId: string, input: CreateBrandInput) {
    try {
      return await this.prisma.client.brand.create({ data: { storeId, name: input.name, slug: requiredSlug(input.slug ?? input.name) } });
    } catch (error) {
      throw new ConflictException('BRAND_ALREADY_EXISTS', { cause: error });
    }
  }

  async createAttribute(storeId: string, input: CreateAttributeInput): Promise<unknown> {
    try {
      return await this.prisma.client.attributeDefinition.create({
        data: {
          storeId,
          code: normalizeAttributeCode(input.code),
          name: input.name,
          dataType: input.dataType,
          unit: input.unit ?? null,
          optionsJson: input.options,
        },
      });
    } catch (error) {
      throw new ConflictException('ATTRIBUTE_ALREADY_EXISTS', { cause: error });
    }
  }

  async assignCategoryAttribute(storeId: string, categoryId: string, input: AssignCategoryAttributeInput): Promise<unknown> {
    const [category, definition] = await Promise.all([
      this.prisma.client.category.findFirst({ where: { id: categoryId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({ where: { id: input.definitionId, storeId, active: true } }),
    ]);
    if (!category || !definition) throw new BadRequestException('CATEGORY_ATTRIBUTE_INVALID');
    return this.prisma.client.categoryAttribute.upsert({
      where: { storeId_categoryId_definitionId: { storeId, categoryId, definitionId: input.definitionId } },
      update: { required: input.required, filterable: input.filterable, sortOrder: input.sortOrder },
      create: { storeId, categoryId, definitionId: input.definitionId, required: input.required, filterable: input.filterable, sortOrder: input.sortOrder },
    });
  }

  async setProductAttribute(storeId: string, productId: string, input: SetAttributeValueInput): Promise<unknown> {
    const [product, definition] = await Promise.all([
      this.prisma.client.product.findFirst({ where: { id: productId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({ where: { id: input.definitionId, storeId, active: true } }),
    ]);
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    if (!definition) throw new BadRequestException('ATTRIBUTE_INVALID');
    assertAttributeValue(definition, input.value);
    return this.prisma.client.productAttributeValue.upsert({
      where: { storeId_productId_definitionId: { storeId, productId, definitionId: input.definitionId } },
      update: { valueJson: input.value },
      create: { storeId, productId, definitionId: input.definitionId, valueJson: input.value },
    });
  }

  async setVariantAttribute(storeId: string, variantId: string, input: SetAttributeValueInput): Promise<unknown> {
    const [variant, definition] = await Promise.all([
      this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({ where: { id: input.definitionId, storeId, active: true } }),
    ]);
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    if (!definition) throw new BadRequestException('ATTRIBUTE_INVALID');
    assertAttributeValue(definition, input.value);
    return this.prisma.client.variantAttributeValue.upsert({
      where: { storeId_variantId_definitionId: { storeId, variantId, definitionId: input.definitionId } },
      update: { valueJson: input.value },
      create: { storeId, variantId, definitionId: input.definitionId, valueJson: input.value },
    });
  }

  async createProduct(storeId: string, input: CreateProductInput): Promise<unknown> {
    const category = await this.prisma.client.category.findFirst({ where: { id: input.primaryCategoryId, storeId } });
    if (!category) throw new BadRequestException('PRIMARY_CATEGORY_INVALID');
    if (input.brandId && !(await this.prisma.client.brand.findFirst({ where: { id: input.brandId, storeId } }))) {
      throw new BadRequestException('BRAND_INVALID');
    }
    const categoryIds = [...new Set([input.primaryCategoryId, ...input.categoryIds])];
    const count = await this.prisma.client.category.count({ where: { storeId, id: { in: categoryIds } } });
    if (count !== categoryIds.length) throw new BadRequestException('CATEGORY_INVALID');
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            storeId,
            title: input.title,
            slug: requiredSlug(input.slug ?? input.title),
            description: input.description,
            primaryCategoryId: input.primaryCategoryId,
            brandId: input.brandId ?? null,
          },
        });
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ storeId, productId: product.id, categoryId })),
        });
        await tx.outboxEvent.create({ data: { storeId, aggregateType: 'Product', aggregateId: product.id, eventType: 'catalog.product.created', payloadJson: { productId: product.id } } });
        return product;
      });
    } catch (error) {
      throw new ConflictException('PRODUCT_ALREADY_EXISTS', { cause: error });
    }
  }

  async createVariant(storeId: string, productId: string, input: CreateVariantInput): Promise<unknown> {
    if (!(await this.prisma.client.product.findFirst({ where: { id: productId, storeId } }))) throw new NotFoundException('PRODUCT_NOT_FOUND');
    if (input.ean && !isValidEan(input.ean)) throw new BadRequestException('EAN_INVALID');
    try {
      return await this.prisma.client.productVariant.create({
        data: {
          storeId,
          productId,
          sku: input.sku ? normalizeSku(input.sku) : null,
          externalKey: input.externalKey ?? null,
          ean: input.ean ?? null,
          variantAttributes: input.attributes,
          weightGrams: input.weightGrams ?? null,
          lengthMm: input.lengthMm ?? null,
          widthMm: input.widthMm ?? null,
          heightMm: input.heightMm ?? null,
        },
      });
    } catch (error) {
      throw new ConflictException('VARIANT_ALREADY_EXISTS', { cause: error });
    }
  }

  async setPrice(storeId: string, variantId: string, input: SetPriceInput) {
    if (!(await this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } }))) throw new NotFoundException('VARIANT_NOT_FOUND');
    const price = await this.prisma.client.price.create({
      data: {
        storeId,
        variantId,
        currency: input.currency,
        amountCents: BigInt(input.amountCents),
        compareAtCents: input.compareAtCents == null ? null : BigInt(input.compareAtCents),
        validFrom: input.validFrom ?? null,
        validTo: input.validTo ?? null,
      },
    });
    return {
      ...price,
      amountCents: Number(price.amountCents),
      compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
    };
  }

  async setInventory(storeId: string, variantId: string, input: SetInventoryInput) {
    const [variant, location] = await Promise.all([
      this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } }),
      this.prisma.client.inventoryLocation.findFirst({ where: { id: input.locationId, storeId, active: true } }),
    ]);
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    if (!location) throw new BadRequestException('INVENTORY_LOCATION_INVALID');
    return this.prisma.client.inventory.upsert({
      where: { storeId_variantId_locationId: { storeId, variantId, locationId: input.locationId } },
      update: { onHand: input.onHand, reserved: input.reserved, version: { increment: 1 } },
      create: { storeId, variantId, locationId: input.locationId, onHand: input.onHand, reserved: input.reserved },
    });
  }

  async createInventoryLocation(storeId: string, input: CreateInventoryLocationInput): Promise<unknown> {
    try {
      return await this.prisma.client.inventoryLocation.create({
        data: { storeId, code: normalizeSku(input.code), name: input.name },
      });
    } catch (error) {
      throw new ConflictException('INVENTORY_LOCATION_ALREADY_EXISTS', { cause: error });
    }
  }

  async publishProduct(storeId: string, productId: string): Promise<unknown> {
    const now = new Date();
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, storeId },
      include: { variants: { include: { prices: { where: { AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] }, { OR: [{ validTo: null }, { validTo: { gt: now } }] }] } }, inventory: true } } },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const sellable = canPublishProduct(product.variants.map((variant) => ({
      active: variant.status === 'ACTIVE',
      priceCents: variant.prices[0] ? Number(variant.prices[0].amountCents) : null,
      availableQuantity: variant.inventory.reduce((total, item) => total + item.onHand - item.reserved, 0),
    })));
    if (!sellable) throw new BadRequestException('PRODUCT_NOT_SELLABLE');
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: product.id }, data: { publicationStatus: 'PUBLISHED', publishedAt: now } });
      await tx.outboxEvent.create({ data: { storeId, aggregateType: 'Product', aggregateId: product.id, eventType: 'catalog.product.published', payloadJson: { productId: product.id } } });
      return updated;
    });
  }
}
