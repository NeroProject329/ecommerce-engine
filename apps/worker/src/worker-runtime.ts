import { createLogRecord } from '@ecommerce/observability';
import { Worker } from 'bullmq';
import { parseRedisUrl } from './redis-connection';
import { createPrismaClient } from '@ecommerce/database';
import { processImportItem } from './import-processor';
import { runMaintenance } from './maintenance';
import { processOutbox } from './outbox-processor';

export type WorkerState = 'idle' | 'running' | 'stopped';

export class WorkerRuntime {
  private state: WorkerState = 'idle';
  private heartbeat: NodeJS.Timeout | undefined;
  private maintenance: NodeJS.Timeout | undefined;
  private queueWorker: Worker | undefined;
  private importWorker: Worker | undefined;
  private database: ReturnType<typeof createPrismaClient> | undefined;

  constructor(
    private readonly name: string,
    private readonly redisUrl?: string,
  ) {}

  async start(): Promise<void> {
    if (this.state !== 'idle') throw new Error('WORKER_ALREADY_STARTED');
    if (this.redisUrl) {
      this.queueWorker = new Worker(`${this.name}.system`, async () => undefined, {
        connection: parseRedisUrl(this.redisUrl),
      });
      this.queueWorker.on('error', (error) => {
        console.error(
          JSON.stringify(
            createLogRecord(this.name, 'error', 'worker.redis.error', { message: error.message }),
          ),
        );
      });
      await this.queueWorker.waitUntilReady();
      if (process.env.DATABASE_URL) {
        this.database = createPrismaClient();
        this.importWorker = new Worker('catalog.import', async (job) => {
          if (job.name !== 'catalog.import.item' || typeof job.data?.itemId !== 'string' || !this.database) throw new Error('IMPORT_JOB_INVALID');
          await processImportItem(this.database, job.data.itemId);
        }, { connection: parseRedisUrl(this.redisUrl), concurrency: 5 });
        this.importWorker.on('error', (error) => console.error(JSON.stringify(createLogRecord(this.name, 'error', 'worker.import.error', { message: error.message }))));
        await this.importWorker.waitUntilReady();
        await runMaintenance(this.database);
        await processOutbox(this.database);
        this.maintenance = setInterval(() => {
          if (!this.database) return;
          void Promise.all([runMaintenance(this.database), processOutbox(this.database)]).catch((error: unknown) => console.error(JSON.stringify(createLogRecord(this.name, 'error', 'worker.maintenance.error', { message: error instanceof Error ? error.message : 'unknown' }))));
        }, 60_000);
      }
    }
    this.state = 'running';
    if (!this.queueWorker) this.heartbeat = setInterval(() => undefined, 60_000);
    console.log(JSON.stringify(createLogRecord(this.name, 'info', 'worker.started')));
  }

  async stop(): Promise<void> {
    if (this.state !== 'running') throw new Error('WORKER_NOT_RUNNING');
    await this.queueWorker?.close();
    await this.importWorker?.close();
    await this.database?.$disconnect();
    if (this.maintenance) clearInterval(this.maintenance);
    this.maintenance = undefined;
    this.queueWorker = undefined;
    this.importWorker = undefined;
    this.database = undefined;
    if (this.heartbeat) clearInterval(this.heartbeat);
    this.heartbeat = undefined;
    this.state = 'stopped';
    console.log(JSON.stringify(createLogRecord(this.name, 'info', 'worker.stopped')));
  }

  currentState(): WorkerState {
    return this.state;
  }
}
