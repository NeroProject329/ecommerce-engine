import {
  buildCategoryPath,
  canPublishProduct,
  isValidEan,
  normalizeSku,
  normalizeSlug,
} from '@ecommerce/catalog';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
  PublicSearchInput,
  UpdateCategoryInput,
  UpdateBrandInput,
  UpdateAttributeInput,
  UpdateProductInput,
  UpdateVariantInput,
  InventoryAdjustmentInput,
} from './schemas';
import { cursorPage, type CursorPage, type PaginationInput } from '../platform/pagination';

function requiredSlug(value: string): string {
  const result = normalizeSlug(value);
  if (!result) throw new BadRequestException('SLUG_INVALID');
  return result;
}

function mediaUrl(storageKey: string): string {
  const base =
    process.env.MEDIA_STORAGE_DRIVER === 'r2' ? process.env.R2_PUBLIC_BASE_URL : '/v1/public/media';
  return `${(base ?? '/v1/public/media').replace(/\/$/, '')}/${storageKey.split('/').map(encodeURIComponent).join('/')}`;
}

function publicVariant(variant: {
  id: string;
  sku: string | null;
  ean: string | null;
  variantAttributes: unknown;
  prices: Array<{ amountCents: bigint; compareAtCents: bigint | null; currency: string }>;
  inventory: Array<{ onHand: number; reserved: number }>;
  media: Array<{
    role: string;
    sortOrder: number;
    asset: {
      storageKey: string;
      renditions: Array<{ storageKey: string; format: string; width: number; height: number }>;
    };
  }>;
}) {
  const price = variant.prices[0];
  return {
    id: variant.id,
    sku: variant.sku,
    ean: variant.ean,
    attributes: variant.variantAttributes,
    price: price
      ? {
          amountCents: Number(price.amountCents),
          compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
          currency: price.currency,
        }
      : null,
    availableQuantity: variant.inventory.reduce(
      (total, item) => total + item.onHand - item.reserved,
      0,
    ),
    media: variant.media.map((item) => ({
      role: item.role,
      sortOrder: item.sortOrder,
      url: mediaUrl(item.asset.storageKey),
      renditions: item.asset.renditions.map((rendition) => ({
        ...rendition,
        url: mediaUrl(rendition.storageKey),
      })),
    })),
  };
}

function normalizeAttributeCode(value: string): string {
  const code = normalizeSlug(value).replace(/-/g, '_').toUpperCase();
  if (!code) throw new BadRequestException('ATTRIBUTE_CODE_INVALID');
  return code;
}

function assertAttributeValue(
  definition: { dataType: string; optionsJson: unknown },
  value: unknown,
): void {
  const options = Array.isArray(definition.optionsJson)
    ? definition.optionsJson.filter((entry): entry is string => typeof entry === 'string')
    : [];
  const valid =
    (definition.dataType === 'TEXT' && typeof value === 'string') ||
    (definition.dataType === 'NUMBER' && typeof value === 'number' && Number.isFinite(value)) ||
    (definition.dataType === 'BOOLEAN' && typeof value === 'boolean') ||
    (definition.dataType === 'OPTION' && typeof value === 'string' && options.includes(value)) ||
    (definition.dataType === 'MULTI_OPTION' &&
      Array.isArray(value) &&
      value.every((entry) => typeof entry === 'string' && options.includes(entry)));
  if (!valid) throw new BadRequestException('ATTRIBUTE_VALUE_INVALID');
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async publicStore(storeSlug: string): Promise<unknown> {
    const store = await this.prisma.client.store.findFirst({
      where: { slug: storeSlug, status: 'ACTIVE' },
      select: {
        id: true,
        slug: true,
        displayName: true,
        currency: true,
        timezone: true,
        settings: true,
      },
    });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    const settings =
      store.settings && typeof store.settings === 'object' && !Array.isArray(store.settings)
        ? (store.settings as Record<string, unknown>)
        : {};
    const publicBlock = (key: string): Record<string, unknown> => {
      const value = settings[key];
      return value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};
    };
    return {
      id: store.id,
      slug: store.slug,
      displayName: store.displayName,
      currency: store.currency,
      timezone: store.timezone,
      locale: process.env.STORE_LOCALE ?? 'pt-BR',
      country: process.env.STORE_COUNTRY ?? 'BR',
      profile: publicBlock('profile'),
      branding: publicBlock('branding'),
      social: publicBlock('social'),
      policies: publicBlock('policies'),
      seo: publicBlock('seo'),
    };
  }

  async publicHome(storeSlug: string): Promise<unknown> {
    const store = await this.prisma.client.store.findFirst({
      where: { slug: storeSlug, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    const now = new Date();
    const [banners, sections] = await Promise.all([
      this.prisma.client.storefrontBanner.findMany({
        where: {
          storeId: store.id,
          status: 'ACTIVE',
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
          ],
        },
        orderBy: [{ placement: 'asc' }, { position: 'asc' }],
        include: { media: { select: { storageKey: true } } },
      }),
      this.prisma.client.storefrontSection.findMany({
        where: { storeId: store.id, status: 'ACTIVE' },
        orderBy: { position: 'asc' },
      }),
    ]);
    return {
      banners: banners.map((banner) => ({
        ...banner,
        mediaUrl: banner.media ? mediaUrl(banner.media.storageKey) : null,
        media: undefined,
      })),
      sections,
    };
  }

  async publicSearch(storeSlug: string, input: PublicSearchInput): Promise<unknown> {
    const query = input.q.toLocaleLowerCase('pt-BR');
    const products = await this.publicProducts(storeSlug);
    const filtered = products
      .filter((product) => {
        const searchable =
          `${product.title} ${product.description} ${product.brand?.name ?? ''}`.toLocaleLowerCase(
            'pt-BR',
          );
        const price = product.variants[0]?.price?.amountCents;
        return (
          (!query || searchable.includes(query)) &&
          (!input.category || product.primaryCategory.slug === input.category) &&
          (!input.brand || product.brand?.slug === input.brand || product.brand?.name === input.brand) &&
          (input.minPriceCents === undefined || (price !== undefined && price >= input.minPriceCents)) &&
          (input.maxPriceCents === undefined || (price !== undefined && price <= input.maxPriceCents))
        );
      })
      .sort((left, right) => {
        const leftPrice = left.variants[0]?.price?.amountCents ?? 0;
        const rightPrice = right.variants[0]?.price?.amountCents ?? 0;
        if (input.sort === 'price-asc') return leftPrice - rightPrice;
        if (input.sort === 'price-desc') return rightPrice - leftPrice;
        return 0;
      });
    const total = filtered.length;
    const start = (input.page - 1) * input.limit;
    return {
      items: filtered.slice(start, start + input.limit),
      page: input.page,
      pageSize: input.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / input.limit)),
    };
  }

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

  async publicProducts(storeSlug: string): Promise<Array<Record<string, unknown> & {
    id: string;
    slug: string;
    title: string;
    description: string;
    brand: { id: string; slug: string; name: string } | null;
    primaryCategory: { id: string; slug: string; name: string; path: string };
    variants: Array<ReturnType<typeof publicVariant>>;
  }>> {
    const now = new Date();
    const products = await this.prisma.client.product.findMany({
      where: { store: { slug: storeSlug, status: 'ACTIVE' }, publicationStatus: 'PUBLISHED' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: {
        brand: { select: { id: true, slug: true, name: true } },
        primaryCategory: { select: { id: true, slug: true, name: true, path: true } },
        categories: { include: { category: { select: { id: true, slug: true, name: true, path: true } } } },
        attributeValues: { include: { definition: { select: { code: true, name: true, unit: true } } } },
        media: {
          orderBy: { sortOrder: 'asc' },
          include: { asset: { include: { renditions: true } } },
        },
        variants: {
          where: { status: 'ACTIVE' },
          include: {
            prices: {
              where: {
                AND: [
                  { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                  { OR: [{ validTo: null }, { validTo: { gt: now } }] },
                ],
              },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            inventory: { select: { onHand: true, reserved: true } },
            media: {
              orderBy: { sortOrder: 'asc' },
              include: { asset: { include: { renditions: true } } },
            },
          },
        },
      },
    });
    return products
      .map((product) => ({
        id: product.id,
        slug: product.slug,
        title: product.title,
        description: product.description,
        seo: product.seo,
        brand: product.brand,
        primaryCategory: product.primaryCategory,
        categories: product.categories,
        attributes: product.attributeValues.map((attribute) => ({
          code: attribute.definition.code,
          name: attribute.definition.name,
          value: attribute.valueJson,
          unit: attribute.definition.unit,
        })),
        media: product.media.map((item) => ({
          role: item.role,
          sortOrder: item.sortOrder,
          url: mediaUrl(item.asset.storageKey),
          renditions: item.asset.renditions.map((rendition) => ({
            ...rendition,
            bytes: Number(rendition.bytes),
            url: mediaUrl(rendition.storageKey),
          })),
        })),
        variants: product.variants
          .map(publicVariant)
          .filter((variant) => variant.price && variant.availableQuantity > 0),
      }))
      .filter((product) => product.variants.length > 0);
  }

  async publicProduct(storeSlug: string, productSlug: string): Promise<unknown> {
    const products = await this.publicProducts(storeSlug);
    const product = products.find((entry) => entry.slug === productSlug);
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return product;
  }

  async adminProducts(
    storeId: string,
    query: PaginationInput,
  ): Promise<CursorPage<Record<string, unknown> & { id: string }>> {
    const products = await this.prisma.client.product.findMany({
      where: {
        storeId,
        ...(query.status ? { publicationStatus: query.status as never } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { slug: { contains: query.q, mode: 'insensitive' } },
                { variants: { some: { sku: { contains: query.q, mode: 'insensitive' } } } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: query.limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      include: {
        brand: true,
        primaryCategory: true,
        variants: { include: { prices: true, inventory: true } },
      },
    });
    return cursorPage(
      products.map((product) => ({
        ...product,
        variants: product.variants.map((variant) => ({
          ...variant,
          prices: variant.prices.map((price) => ({
            ...price,
            amountCents: Number(price.amountCents),
            compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents),
          })),
        })),
      })),
      query.limit,
    );
  }

  async adminProduct(storeId: string, productId: string): Promise<unknown> {
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, storeId },
      include: {
        brand: true,
        primaryCategory: true,
        categories: { include: { category: true } },
        variants: {
          include: {
            prices: true,
            inventory: { include: { location: true } },
            media: { include: { asset: true } },
          },
        },
        attributeValues: { include: { definition: true } },
        media: { include: { asset: { include: { renditions: true } } } },
      },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return product;
  }

  async adminCategories(storeId: string): Promise<unknown> {
    return this.prisma.client.category.findMany({
      where: { storeId },
      orderBy: [{ path: 'asc' }, { position: 'asc' }],
    });
  }

  async adminBrands(storeId: string): Promise<unknown> {
    return this.prisma.client.brand.findMany({ where: { storeId }, orderBy: { name: 'asc' } });
  }

  async adminAttributes(storeId: string): Promise<unknown> {
    return this.prisma.client.attributeDefinition.findMany({
      where: { storeId },
      orderBy: { name: 'asc' },
    });
  }

  async inventory(storeId: string): Promise<unknown> {
    return this.prisma.client.inventory.findMany({
      where: { storeId },
      orderBy: [{ variantId: 'asc' }, { locationId: 'asc' }],
      include: {
        variant: { select: { sku: true, product: { select: { title: true } } } },
        location: true,
      },
    });
  }

  async inventoryMovements(storeId: string): Promise<unknown> {
    return this.prisma.client.inventoryMovement.findMany({
      where: { storeId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 200,
      include: {
        variant: { select: { sku: true, product: { select: { title: true } } } },
        location: { select: { code: true, name: true } },
      },
    });
  }

  async updateCategory(
    storeId: string,
    categoryId: string,
    input: UpdateCategoryInput,
  ): Promise<unknown> {
    const category = await this.prisma.client.category.findFirst({
      where: { id: categoryId, storeId },
    });
    if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    const slugValue = input.slug || (input.name ? requiredSlug(input.name) : undefined);
    const data = Object.fromEntries(
      Object.entries({
        name: input.name,
        slug: slugValue,
        position: input.position,
        status: input.status,
      }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.client.category.update({
      where: { id: category.id },
      data: {
        ...data,
        ...(slugValue
          ? {
              path: buildCategoryPath(
                category.path.includes('/')
                  ? category.path.slice(0, category.path.lastIndexOf('/'))
                  : null,
                slugValue,
              ),
            }
          : {}),
      },
    });
  }

  async updateBrand(storeId: string, brandId: string, input: UpdateBrandInput): Promise<unknown> {
    const brand = await this.prisma.client.brand.findFirst({ where: { id: brandId, storeId } });
    if (!brand) throw new NotFoundException('BRAND_NOT_FOUND');
    const data = Object.fromEntries(
      Object.entries({
        name: input.name,
        slug: input.slug ? requiredSlug(input.slug) : undefined,
        status: input.status,
      }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.client.brand.update({ where: { id: brand.id }, data });
  }

  async updateAttribute(
    storeId: string,
    attributeId: string,
    input: UpdateAttributeInput,
  ): Promise<unknown> {
    const attribute = await this.prisma.client.attributeDefinition.findFirst({
      where: { id: attributeId, storeId },
    });
    if (!attribute) throw new NotFoundException('ATTRIBUTE_NOT_FOUND');
    const data = Object.fromEntries(
      Object.entries({
        name: input.name,
        unit: input.unit,
        optionsJson: input.options,
        active: input.active,
      }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.client.attributeDefinition.update({
      where: { id: attribute.id },
      data: { ...data, version: { increment: 1 } },
    });
  }

  async updateProduct(
    storeId: string,
    productId: string,
    input: UpdateProductInput,
  ): Promise<unknown> {
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, storeId },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const primaryCategoryId = input.primaryCategoryId ?? product.primaryCategoryId;
    if (
      input.primaryCategoryId &&
      !(await this.prisma.client.category.findFirst({
        where: { id: input.primaryCategoryId, storeId },
      }))
    )
      throw new BadRequestException('PRIMARY_CATEGORY_INVALID');
    if (
      input.brandId &&
      !(await this.prisma.client.brand.findFirst({ where: { id: input.brandId, storeId } }))
    )
      throw new BadRequestException('BRAND_INVALID');
    const categoryIds = input.categoryIds
      ? [...new Set([primaryCategoryId, ...input.categoryIds])]
      : undefined;
    if (
      categoryIds &&
      (await this.prisma.client.category.count({ where: { id: { in: categoryIds }, storeId } })) !==
        categoryIds.length
    )
      throw new BadRequestException('CATEGORY_INVALID');
    const data = Object.fromEntries(
      Object.entries({
        title: input.title,
        slug: input.slug ? requiredSlug(input.slug) : undefined,
        description: input.description,
        brandId: input.brandId,
        primaryCategoryId: input.primaryCategoryId,
        seo: input.seo,
      }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.product.update({ where: { id: product.id }, data });
      if (categoryIds) {
        await tx.productCategory.deleteMany({ where: { storeId, productId } });
        await tx.productCategory.createMany({
          data: categoryIds.map((categoryId) => ({ storeId, productId, categoryId })),
        });
      }
      await tx.outboxEvent.create({
        data: {
          storeId,
          aggregateType: 'Product',
          aggregateId: productId,
          eventType: 'catalog.product.updated',
          payloadJson: { productId },
        },
      });
      return updated;
    });
  }

  async archiveProduct(storeId: string, productId: string): Promise<unknown> {
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, storeId },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    return this.prisma.client.product.update({
      where: { id: product.id },
      data: { publicationStatus: 'ARCHIVED' },
    });
  }

  async updateVariant(
    storeId: string,
    variantId: string,
    input: UpdateVariantInput,
  ): Promise<unknown> {
    const variant = await this.prisma.client.productVariant.findFirst({
      where: { id: variantId, storeId },
    });
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    if (input.ean && !isValidEan(input.ean)) throw new BadRequestException('EAN_INVALID');
    const data = Object.fromEntries(
      Object.entries({
        sku: input.sku ? normalizeSku(input.sku) : input.sku,
        externalKey: input.externalKey,
        ean: input.ean,
        variantAttributes: input.attributes,
        weightGrams: input.weightGrams,
        lengthMm: input.lengthMm,
        widthMm: input.widthMm,
        heightMm: input.heightMm,
        status: input.status,
      }).filter(([, value]) => value !== undefined),
    );
    return this.prisma.client.productVariant.update({ where: { id: variant.id }, data });
  }

  async archiveCategory(storeId: string, categoryId: string): Promise<unknown> {
    const category = await this.prisma.client.category.findFirst({
      where: { id: categoryId, storeId },
    });
    if (!category) throw new NotFoundException('CATEGORY_NOT_FOUND');
    if (
      await this.prisma.client.category.count({
        where: { storeId, parentId: categoryId, status: 'ACTIVE' },
      })
    )
      throw new ConflictException('CATEGORY_HAS_ACTIVE_CHILDREN');
    return this.prisma.client.category.update({
      where: { id: category.id },
      data: { status: 'ARCHIVED' },
    });
  }
  async archiveBrand(storeId: string, brandId: string): Promise<unknown> {
    const brand = await this.prisma.client.brand.findFirst({ where: { id: brandId, storeId } });
    if (!brand) throw new NotFoundException('BRAND_NOT_FOUND');
    return this.prisma.client.brand.update({
      where: { id: brand.id },
      data: { status: 'ARCHIVED' },
    });
  }
  async archiveAttribute(storeId: string, attributeId: string): Promise<unknown> {
    const attribute = await this.prisma.client.attributeDefinition.findFirst({
      where: { id: attributeId, storeId },
    });
    if (!attribute) throw new NotFoundException('ATTRIBUTE_NOT_FOUND');
    return this.prisma.client.attributeDefinition.update({
      where: { id: attribute.id },
      data: { active: false, version: { increment: 1 } },
    });
  }
  async bulkArchiveProducts(storeId: string, ids: string[]): Promise<{ count: number }> {
    const result = await this.prisma.client.product.updateMany({
      where: { storeId, id: { in: ids } },
      data: { publicationStatus: 'ARCHIVED' },
    });
    return { count: result.count };
  }

  async adjustInventory(
    storeId: string,
    actorId: string,
    input: InventoryAdjustmentInput,
  ): Promise<unknown> {
    return this.prisma.client.$transaction(
      async (tx) => {
        const existing = await tx.inventoryMovement.findUnique({
          where: {
            storeId_deduplicationKey: { storeId, deduplicationKey: input.deduplicationKey },
          },
        });
        if (existing) return { ...existing, deduplicated: true };
        const inventory = await tx.inventory.findUnique({
          where: {
            storeId_variantId_locationId: {
              storeId,
              variantId: input.variantId,
              locationId: input.locationId,
            },
          },
        });
        if (!inventory) throw new NotFoundException('INVENTORY_NOT_FOUND');
        if (inventory.onHand + input.delta < inventory.reserved)
          throw new ConflictException('INVENTORY_BELOW_RESERVED');
        const updated = await tx.inventory.update({
          where: { id: inventory.id },
          data: { onHand: { increment: input.delta }, version: { increment: 1 } },
        });
        const movement = await tx.inventoryMovement.create({
          data: {
            storeId,
            variantId: input.variantId,
            locationId: input.locationId,
            delta: input.delta,
            reason: input.reason,
            actorRef: actorId,
            deduplicationKey: input.deduplicationKey,
          },
        });
        return { ...movement, balance: updated.onHand, deduplicated: false };
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async createCategory(storeId: string, input: CreateCategoryInput) {
    const slug = requiredSlug(input.slug ?? input.name);
    const parent = input.parentId
      ? await this.prisma.client.category.findFirst({ where: { id: input.parentId, storeId } })
      : null;
    if (input.parentId && !parent) throw new BadRequestException('CATEGORY_PARENT_INVALID');
    try {
      return await this.prisma.client.category.create({
        data: {
          storeId,
          name: input.name,
          slug,
          parentId: parent?.id ?? null,
          path: buildCategoryPath(parent?.path ?? null, slug),
          position: input.position,
        },
      });
    } catch (error) {
      throw new ConflictException('CATEGORY_ALREADY_EXISTS', { cause: error });
    }
  }

  async createBrand(storeId: string, input: CreateBrandInput) {
    try {
      return await this.prisma.client.brand.create({
        data: { storeId, name: input.name, slug: requiredSlug(input.slug ?? input.name) },
      });
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

  async assignCategoryAttribute(
    storeId: string,
    categoryId: string,
    input: AssignCategoryAttributeInput,
  ): Promise<unknown> {
    const [category, definition] = await Promise.all([
      this.prisma.client.category.findFirst({ where: { id: categoryId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({
        where: { id: input.definitionId, storeId, active: true },
      }),
    ]);
    if (!category || !definition) throw new BadRequestException('CATEGORY_ATTRIBUTE_INVALID');
    return this.prisma.client.categoryAttribute.upsert({
      where: {
        storeId_categoryId_definitionId: { storeId, categoryId, definitionId: input.definitionId },
      },
      update: {
        required: input.required,
        filterable: input.filterable,
        sortOrder: input.sortOrder,
      },
      create: {
        storeId,
        categoryId,
        definitionId: input.definitionId,
        required: input.required,
        filterable: input.filterable,
        sortOrder: input.sortOrder,
      },
    });
  }

  async setProductAttribute(
    storeId: string,
    productId: string,
    input: SetAttributeValueInput,
  ): Promise<unknown> {
    const [product, definition] = await Promise.all([
      this.prisma.client.product.findFirst({ where: { id: productId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({
        where: { id: input.definitionId, storeId, active: true },
      }),
    ]);
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    if (!definition) throw new BadRequestException('ATTRIBUTE_INVALID');
    assertAttributeValue(definition, input.value);
    return this.prisma.client.productAttributeValue.upsert({
      where: {
        storeId_productId_definitionId: { storeId, productId, definitionId: input.definitionId },
      },
      update: { valueJson: input.value },
      create: { storeId, productId, definitionId: input.definitionId, valueJson: input.value },
    });
  }

  async setVariantAttribute(
    storeId: string,
    variantId: string,
    input: SetAttributeValueInput,
  ): Promise<unknown> {
    const [variant, definition] = await Promise.all([
      this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } }),
      this.prisma.client.attributeDefinition.findFirst({
        where: { id: input.definitionId, storeId, active: true },
      }),
    ]);
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    if (!definition) throw new BadRequestException('ATTRIBUTE_INVALID');
    assertAttributeValue(definition, input.value);
    return this.prisma.client.variantAttributeValue.upsert({
      where: {
        storeId_variantId_definitionId: { storeId, variantId, definitionId: input.definitionId },
      },
      update: { valueJson: input.value },
      create: { storeId, variantId, definitionId: input.definitionId, valueJson: input.value },
    });
  }

  async createProduct(storeId: string, input: CreateProductInput): Promise<unknown> {
    const category = await this.prisma.client.category.findFirst({
      where: { id: input.primaryCategoryId, storeId },
    });
    if (!category) throw new BadRequestException('PRIMARY_CATEGORY_INVALID');
    if (
      input.brandId &&
      !(await this.prisma.client.brand.findFirst({ where: { id: input.brandId, storeId } }))
    ) {
      throw new BadRequestException('BRAND_INVALID');
    }
    const categoryIds = [...new Set([input.primaryCategoryId, ...input.categoryIds])];
    const count = await this.prisma.client.category.count({
      where: { storeId, id: { in: categoryIds } },
    });
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
        await tx.outboxEvent.create({
          data: {
            storeId,
            aggregateType: 'Product',
            aggregateId: product.id,
            eventType: 'catalog.product.created',
            payloadJson: { productId: product.id },
          },
        });
        return product;
      });
    } catch (error) {
      throw new ConflictException('PRODUCT_ALREADY_EXISTS', { cause: error });
    }
  }

  async createVariant(
    storeId: string,
    productId: string,
    input: CreateVariantInput,
  ): Promise<unknown> {
    if (!(await this.prisma.client.product.findFirst({ where: { id: productId, storeId } })))
      throw new NotFoundException('PRODUCT_NOT_FOUND');
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
    if (!(await this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } })))
      throw new NotFoundException('VARIANT_NOT_FOUND');
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
      this.prisma.client.inventoryLocation.findFirst({
        where: { id: input.locationId, storeId, active: true },
      }),
    ]);
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    if (!location) throw new BadRequestException('INVENTORY_LOCATION_INVALID');
    return this.prisma.client.inventory.upsert({
      where: { storeId_variantId_locationId: { storeId, variantId, locationId: input.locationId } },
      update: { onHand: input.onHand, reserved: input.reserved, version: { increment: 1 } },
      create: {
        storeId,
        variantId,
        locationId: input.locationId,
        onHand: input.onHand,
        reserved: input.reserved,
      },
    });
  }

  async createInventoryLocation(
    storeId: string,
    input: CreateInventoryLocationInput,
  ): Promise<unknown> {
    try {
      return await this.prisma.client.inventoryLocation.create({
        data: { storeId, code: normalizeSku(input.code), name: input.name },
      });
    } catch (error) {
      throw new ConflictException('INVENTORY_LOCATION_ALREADY_EXISTS', { cause: error });
    }
  }

  async inventoryLocations(storeId: string): Promise<unknown> {
    return this.prisma.client.inventoryLocation.findMany({
      where: { storeId, active: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }

  async publishProduct(storeId: string, productId: string): Promise<unknown> {
    const now = new Date();
    const product = await this.prisma.client.product.findFirst({
      where: { id: productId, storeId },
      include: {
        variants: {
          include: {
            prices: {
              where: {
                AND: [
                  { OR: [{ validFrom: null }, { validFrom: { lte: now } }] },
                  { OR: [{ validTo: null }, { validTo: { gt: now } }] },
                ],
              },
            },
            inventory: true,
          },
        },
      },
    });
    if (!product) throw new NotFoundException('PRODUCT_NOT_FOUND');
    const sellable = canPublishProduct(
      product.variants.map((variant) => ({
        active: variant.status === 'ACTIVE',
        priceCents: variant.prices[0] ? Number(variant.prices[0].amountCents) : null,
        availableQuantity: variant.inventory.reduce(
          (total, item) => total + item.onHand - item.reserved,
          0,
        ),
      })),
    );
    if (!sellable) throw new BadRequestException('PRODUCT_NOT_SELLABLE');
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: product.id },
        data: { publicationStatus: 'PUBLISHED', publishedAt: now },
      });
      await tx.outboxEvent.create({
        data: {
          storeId,
          aggregateType: 'Product',
          aggregateId: product.id,
          eventType: 'catalog.product.published',
          payloadJson: { productId: product.id },
        },
      });
      return updated;
    });
  }
}
