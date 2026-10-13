import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { resolve } from 'node:path';
import {
  imageSha256,
  LocalObjectStorage,
  optimizeImage,
  S3ObjectStorage,
  type ObjectStorage,
} from '@ecommerce/media';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { AttachMediaInput, ImportMediaInput, UploadMediaInput } from './schemas';
import { cursorPage, type CursorPage, type PaginationInput } from '../platform/pagination';

const MAXIMUM_BYTES = 10 * 1024 * 1024;

function privateAddress(address: string): boolean {
  if (address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true;
  if (isIP(address) !== 4) return false;
  const parts = address.split('.').map(Number);
  const [a = 0, b = 0] = parts;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function extension(mimeType: string): string {
  return ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string, string>)[mimeType] ?? 'bin';
}

function storageFromEnvironment(): ObjectStorage {
  if (process.env.MEDIA_STORAGE_DRIVER === 'r2') {
    const required = ['R2_ENDPOINT', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_PUBLIC_BASE_URL'] as const;
    for (const key of required) if (!process.env[key]) throw new Error(`${key}_REQUIRED`);
    return new S3ObjectStorage({
      endpoint: process.env.R2_ENDPOINT!,
      region: process.env.R2_REGION ?? 'auto',
      bucket: process.env.R2_BUCKET!,
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      publicBaseUrl: process.env.R2_PUBLIC_BASE_URL!,
    });
  }
  return new LocalObjectStorage(process.env.MEDIA_LOCAL_ROOT ?? resolve(process.cwd(), '.data', 'media'));
}

@Injectable()
export class MediaService {
  private readonly storage = storageFromEnvironment();

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(storeId: string, query: PaginationInput): Promise<CursorPage<Record<string, unknown> & { id: string }>> {
    const assets = await this.prisma.client.mediaAsset.findMany({ where: { storeId, ...(query.status ? { processingStatus: query.status as never } : {}), ...(query.q ? { OR: [{ sha256: { contains: query.q } }, { mimeType: { contains: query.q, mode: 'insensitive' } }] } : {}) }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: query.limit + 1, ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}), include: { renditions: true, _count: { select: { products: true, variants: true, storefrontBanners: true } } } });
    return cursorPage(assets.map((asset) => this.response(asset, false)), query.limit);
  }

  async delete(storeId: string, mediaId: string): Promise<void> { const asset = await this.prisma.client.mediaAsset.findFirst({ where: { id: mediaId, storeId }, include: { renditions: true, _count: { select: { products: true, variants: true, storefrontBanners: true } } } }); if (!asset) throw new NotFoundException('MEDIA_NOT_FOUND'); if (asset._count.products || asset._count.variants || asset._count.storefrontBanners) throw new BadRequestException('MEDIA_IN_USE'); await this.prisma.client.mediaAsset.delete({ where: { id: asset.id } }); await Promise.allSettled([this.storage.delete(asset.storageKey), ...asset.renditions.map((item) => this.storage.delete(item.storageKey))]); }

  async upload(storeId: string, input: UploadMediaInput) {
    const body = Buffer.from(input.contentBase64, 'base64');
    if (body.byteLength === 0 || body.byteLength > MAXIMUM_BYTES) throw new BadRequestException('MEDIA_SIZE_NOT_ALLOWED');
    return this.ingest(storeId, body);
  }

  async importUrl(storeId: string, input: ImportMediaInput) {
    const url = new URL(input.url);
    if (url.protocol !== 'https:' || url.username || url.password) throw new BadRequestException('MEDIA_URL_NOT_ALLOWED');
    const addresses = await lookup(url.hostname, { all: true });
    if (addresses.length === 0 || addresses.some((entry) => privateAddress(entry.address))) throw new BadRequestException('MEDIA_URL_NOT_ALLOWED');
    const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
    if (!response.ok || !response.body) throw new BadRequestException('MEDIA_DOWNLOAD_FAILED');
    const declaredLength = Number(response.headers.get('content-length') ?? 0);
    if (declaredLength > MAXIMUM_BYTES) throw new BadRequestException('MEDIA_SIZE_NOT_ALLOWED');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAXIMUM_BYTES) {
        await reader.cancel();
        throw new BadRequestException('MEDIA_SIZE_NOT_ALLOWED');
      }
      chunks.push(value);
    }
    return this.ingest(storeId, Buffer.concat(chunks));
  }

  async attachProduct(storeId: string, productId: string, input: AttachMediaInput) {
    const [product, asset] = await Promise.all([
      this.prisma.client.product.findFirst({ where: { id: productId, storeId } }),
      this.prisma.client.mediaAsset.findFirst({ where: { id: input.mediaAssetId, storeId, processingStatus: 'READY' } }),
    ]);
    if (!product || !asset) throw new NotFoundException('MEDIA_TARGET_NOT_FOUND');
    return this.prisma.client.productMedia.upsert({
      where: { storeId_productId_mediaAssetId_role: { storeId, productId, mediaAssetId: asset.id, role: input.role } },
      update: { sortOrder: input.sortOrder },
      create: { storeId, productId, mediaAssetId: asset.id, role: input.role, sortOrder: input.sortOrder },
    });
  }

  async attachVariant(storeId: string, variantId: string, input: AttachMediaInput) {
    const [variant, asset] = await Promise.all([
      this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } }),
      this.prisma.client.mediaAsset.findFirst({ where: { id: input.mediaAssetId, storeId, processingStatus: 'READY' } }),
    ]);
    if (!variant || !asset) throw new NotFoundException('MEDIA_TARGET_NOT_FOUND');
    return this.prisma.client.variantMedia.upsert({
      where: { storeId_variantId_mediaAssetId_role: { storeId, variantId, mediaAssetId: asset.id, role: input.role } },
      update: { sortOrder: input.sortOrder },
      create: { storeId, variantId, mediaAssetId: asset.id, role: input.role, sortOrder: input.sortOrder },
    });
  }

  async publicFile(storageKey: string): Promise<{ body: Uint8Array; mimeType: string }> {
    const asset = await this.prisma.client.mediaAsset.findFirst({ where: { storageKey, processingStatus: 'READY' } });
    const rendition = asset ? null : await this.prisma.client.mediaRendition.findUnique({ where: { storeId_storageKey: { storeId: storageKey.split('/')[0]!, storageKey } } });
    if ((!asset && !rendition) || !this.storage.get) throw new NotFoundException('MEDIA_NOT_FOUND');
    return { body: await this.storage.get(storageKey), mimeType: asset?.mimeType ?? `image/${rendition!.format}` };
  }

  private async ingest(storeId: string, body: Uint8Array) {
    const hash = imageSha256(body);
    const existing = await this.prisma.client.mediaAsset.findUnique({ where: { storeId_sha256: { storeId, sha256: hash } }, include: { renditions: true } });
    if (existing) return this.response(existing, true);
    let optimized;
    try {
      optimized = await optimizeImage(body);
    } catch (error) {
      throw new BadRequestException(error instanceof Error ? error.message : 'MEDIA_INVALID');
    }
    const originalKey = `${storeId}/${hash}/original.${extension(optimized.originalMimeType)}`;
    const renditionKey = `${storeId}/${hash}/web-1600.webp`;
    await this.storage.put(originalKey, body, optimized.originalMimeType);
    await this.storage.put(renditionKey, optimized.rendition, optimized.renditionMimeType);
    try {
      const asset = await this.prisma.client.$transaction(async (tx) => {
        const created = await tx.mediaAsset.create({
          data: {
            storeId,
            storageKey: originalKey,
            sha256: hash,
            mimeType: optimized.originalMimeType,
            bytes: BigInt(body.byteLength),
            width: optimized.width,
            height: optimized.height,
            processingStatus: 'READY',
          },
        });
        const rendition = await tx.mediaRendition.create({
          data: { storeId, mediaAssetId: created.id, format: 'webp', width: optimized.renditionWidth, height: optimized.renditionHeight, storageKey: renditionKey, bytes: BigInt(optimized.rendition.byteLength) },
        });
        return { ...created, renditions: [rendition] };
      });
      return this.response(asset, false);
    } catch (error) {
      await Promise.allSettled([this.storage.delete(originalKey), this.storage.delete(renditionKey)]);
      throw error;
    }
  }

  private response(asset: { id: string; storageKey: string; sha256: string; mimeType: string; bytes: bigint; width: number | null; height: number | null; renditions: Array<{ storageKey: string; format: string; width: number; height: number; bytes: bigint }> }, deduplicated: boolean) {
    return {
      id: asset.id,
      sha256: asset.sha256,
      mimeType: asset.mimeType,
      bytes: Number(asset.bytes),
      width: asset.width,
      height: asset.height,
      url: this.storage.publicUrl(asset.storageKey),
      deduplicated,
      renditions: asset.renditions.map((item) => ({ ...item, bytes: Number(item.bytes), url: this.storage.publicUrl(item.storageKey) })),
    };
  }
}
