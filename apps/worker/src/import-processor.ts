import { createHash } from 'node:crypto';
import { isValidEan, normalizeSku, normalizeSlug } from '@ecommerce/catalog';
import { catalogImportItemV1Schema } from '@ecommerce/contracts';
import type { createPrismaClient } from '@ecommerce/database';

type DatabaseClient = ReturnType<typeof createPrismaClient>;

function variantIdentity(externalId: string): string {
  return `variant:${createHash('sha256').update(externalId).digest('hex')}`;
}

async function finishBatch(prisma: DatabaseClient, storeId: string, batchId: string): Promise<void> {
  const [batch, completed, failed] = await Promise.all([
    prisma.importBatch.findFirst({ where: { id: batchId, storeId } }),
    prisma.importItem.count({ where: { batchId, storeId, status: 'COMPLETED' } }),
    prisma.importItem.count({ where: { batchId, storeId, status: 'FAILED' } }),
  ]);
  if (!batch) return;
  const finished = completed + failed === batch.total;
  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      processed: completed,
      failed,
      status: finished ? (failed === 0 ? 'COMPLETED' : completed === 0 ? 'FAILED' : 'PARTIALLY_COMPLETED') : 'PROCESSING',
      completedAt: finished ? new Date() : null,
    },
  });
}

export async function processImportItem(prisma: DatabaseClient, itemId: string): Promise<void> {
  const record = await prisma.importItem.findUnique({ where: { id: itemId }, include: { batch: true } });
  if (!record || record.status === 'COMPLETED') return;
  await prisma.importItem.update({ where: { id: record.id }, data: { status: 'PROCESSING', attempts: { increment: 1 }, errorCode: null } });
  try {
    const input = catalogImportItemV1Schema.parse(record.payloadJson);
    await prisma.$transaction(async (tx) => {
      const categorySlug = normalizeSlug(input.category.slug ?? input.category.name);
      const category = await tx.category.upsert({
        where: { storeId_slug: { storeId: record.storeId, slug: categorySlug } },
        update: { name: input.category.name, status: 'ACTIVE' },
        create: { storeId: record.storeId, slug: categorySlug, name: input.category.name, path: categorySlug },
      });
      const brand = input.brand ? await tx.brand.upsert({
        where: { storeId_slug: { storeId: record.storeId, slug: normalizeSlug(input.brand.slug ?? input.brand.name) } },
        update: { name: input.brand.name, status: 'ACTIVE' },
        create: { storeId: record.storeId, slug: normalizeSlug(input.brand.slug ?? input.brand.name), name: input.brand.name },
      }) : null;
      const productExternalId = `product:${input.externalProductId}`;
      const identity = await tx.externalIdentity.findUnique({
        where: { storeId_sourceId_externalId: { storeId: record.storeId, sourceId: record.batch.sourceId, externalId: productExternalId } },
      });
      let productId = identity?.productId;
      if (!productId) {
        const product = await tx.product.create({
          data: {
            storeId: record.storeId,
            slug: normalizeSlug(input.slug ?? `${input.title}-${input.externalProductId}`),
            title: input.title,
            description: input.description,
            primaryCategoryId: category.id,
            brandId: brand?.id ?? null,
            sourceMode: 'IMPORTED',
          },
        });
        productId = product.id;
        await tx.productCategory.create({ data: { storeId: record.storeId, productId, categoryId: category.id } });
        await tx.externalIdentity.create({ data: { storeId: record.storeId, sourceId: record.batch.sourceId, productId, externalId: productExternalId } });
      } else {
        const overrides = await tx.importFieldOverride.findMany({ where: { storeId: record.storeId, productId, policy: 'MANUAL_WINS' }, select: { fieldPath: true } });
        const manual = new Set(overrides.map((entry) => entry.fieldPath));
        await tx.product.update({
          where: { id: productId },
          data: {
            ...(!manual.has('title') ? { title: input.title } : {}),
            ...(!manual.has('description') ? { description: input.description } : {}),
            ...(!manual.has('primaryCategoryId') ? { primaryCategoryId: category.id } : {}),
            ...(!manual.has('brandId') ? { brandId: brand?.id ?? null } : {}),
            sourceMode: manual.size > 0 ? 'HYBRID' : 'IMPORTED',
          },
        });
      }
      for (const variantInput of input.variants) {
        if (variantInput.ean && !isValidEan(variantInput.ean)) throw new Error('EAN_INVALID');
        const externalId = variantIdentity(variantInput.externalId);
        const variantIdentityRecord = await tx.externalIdentity.findUnique({
          where: { storeId_sourceId_externalId: { storeId: record.storeId, sourceId: record.batch.sourceId, externalId } },
        });
        let variantId = variantIdentityRecord?.variantId;
        if (!variantId) {
          const variant = await tx.productVariant.create({
            data: { storeId: record.storeId, productId, sku: variantInput.sku ? normalizeSku(variantInput.sku) : null, externalKey: variantInput.externalId, ean: variantInput.ean ?? null, variantAttributes: variantInput.attributes },
          });
          variantId = variant.id;
          await tx.externalIdentity.create({ data: { storeId: record.storeId, sourceId: record.batch.sourceId, variantId, externalId, groupExternalId: input.externalProductId } });
        } else {
          await tx.productVariant.update({ where: { id: variantId }, data: { sku: variantInput.sku ? normalizeSku(variantInput.sku) : null, ean: variantInput.ean ?? null, variantAttributes: variantInput.attributes, status: 'ACTIVE' } });
        }
        if (variantInput.price) {
          const latest = await tx.price.findFirst({ where: { storeId: record.storeId, variantId, currency: variantInput.price.currency }, orderBy: { createdAt: 'desc' } });
          if (!latest || latest.amountCents !== BigInt(variantInput.price.amountCents) || latest.compareAtCents !== (variantInput.price.compareAtCents == null ? null : BigInt(variantInput.price.compareAtCents))) {
            await tx.price.create({ data: { storeId: record.storeId, variantId, currency: variantInput.price.currency, amountCents: BigInt(variantInput.price.amountCents), compareAtCents: variantInput.price.compareAtCents == null ? null : BigInt(variantInput.price.compareAtCents) } });
          }
        }
        for (const inventoryInput of variantInput.inventory) {
          const code = normalizeSku(inventoryInput.locationCode);
          const location = await tx.inventoryLocation.upsert({
            where: { storeId_code: { storeId: record.storeId, code } },
            update: { name: inventoryInput.locationName ?? inventoryInput.locationCode, active: true },
            create: { storeId: record.storeId, code, name: inventoryInput.locationName ?? inventoryInput.locationCode },
          });
          await tx.inventory.upsert({
            where: { storeId_variantId_locationId: { storeId: record.storeId, variantId, locationId: location.id } },
            update: { onHand: inventoryInput.onHand, version: { increment: 1 } },
            create: { storeId: record.storeId, variantId, locationId: location.id, onHand: inventoryInput.onHand },
          });
        }
      }
      await tx.importItem.update({ where: { id: record.id }, data: { status: 'COMPLETED' } });
    });
  } catch (error) {
    await prisma.importItem.update({
      where: { id: record.id },
      data: { status: 'FAILED', errorCode: error instanceof Error ? error.message.slice(0, 120) : 'IMPORT_ITEM_FAILED', errorDetailsSafe: { retryable: false } },
    });
  }
  await finishBatch(prisma, record.storeId, record.batchId);
}
