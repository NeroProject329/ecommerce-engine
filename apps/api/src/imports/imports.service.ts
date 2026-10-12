import { createHash } from 'node:crypto';
import { catalogImportBatchV1Schema, stableJson, type CatalogImportBatchV1 } from '@ecommerce/contracts';
import { ConflictException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma.service';
import type { CreateImportSourceInput } from './schemas';

function redisConnection(redisUrl: string) {
  const url = new URL(redisUrl);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL_PROTOCOL_INVALID');
  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    db: Number(url.pathname.slice(1) || 0),
    maxRetriesPerRequest: null,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}

@Injectable()
export class ImportsService implements OnModuleDestroy {
  private readonly queue = process.env.REDIS_URL ? new Queue('catalog.import', { connection: redisConnection(process.env.REDIS_URL) }) : undefined;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleDestroy(): Promise<void> {
    await this.queue?.close();
  }

  async createSource(storeId: string, input: CreateImportSourceInput): Promise<unknown> {
    return this.prisma.client.importSource.create({
      data: { storeId, code: input.code.trim().toUpperCase(), name: input.name, allowedDomains: input.allowedDomains },
    });
  }

  async submit(storeId: string, raw: unknown) {
    if (!this.queue) throw new ServiceUnavailableException('IMPORT_QUEUE_NOT_CONFIGURED');
    const input = catalogImportBatchV1Schema.parse(raw);
    const source = await this.prisma.client.importSource.findFirst({ where: { storeId, code: input.sourceCode.toUpperCase(), active: true } });
    if (!source) throw new NotFoundException('IMPORT_SOURCE_NOT_FOUND');
    const payloadHash = createHash('sha256').update(stableJson(input)).digest('hex');
    const existing = await this.prisma.client.importBatch.findUnique({
      where: { storeId_sourceId_externalBatchId: { storeId, sourceId: source.id, externalBatchId: input.externalBatchId } },
    });
    if (existing) {
      if (existing.payloadHash !== payloadHash) throw new ConflictException('IMPORT_IDEMPOTENCY_CONFLICT');
      return { ...existing, deduplicated: true };
    }
    const batch = await this.prisma.client.$transaction(async (tx) => {
      const created = await tx.importBatch.create({
        data: { storeId, sourceId: source.id, externalBatchId: input.externalBatchId, payloadHash, status: 'QUEUED', total: input.items.length },
      });
      await tx.importItem.createMany({
        data: input.items.map((item) => ({ storeId, batchId: created.id, externalProductId: item.externalProductId, payloadJson: item })),
      });
      return created;
    });
    const items = await this.prisma.client.importItem.findMany({ where: { batchId: batch.id, storeId }, select: { id: true } });
    await this.queue.addBulk(items.map((item) => ({ name: 'catalog.import.item', data: { itemId: item.id }, opts: { jobId: item.id, attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 1000, removeOnFail: 5000 } })));
    return { ...batch, deduplicated: false };
  }

  async report(storeId: string, batchId: string): Promise<unknown> {
    const batch = await this.prisma.client.importBatch.findFirst({
      where: { id: batchId, storeId },
      include: { items: { orderBy: { createdAt: 'asc' }, select: { id: true, externalProductId: true, status: true, attempts: true, errorCode: true, errorDetailsSafe: true, updatedAt: true } } },
    });
    if (!batch) throw new NotFoundException('IMPORT_BATCH_NOT_FOUND');
    return batch;
  }

  parse(raw: unknown): CatalogImportBatchV1 {
    return catalogImportBatchV1Schema.parse(raw);
  }
}
