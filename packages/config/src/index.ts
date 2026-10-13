import { z } from 'zod';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const portSchema = z.coerce.number().int().min(1).max(65_535);

export const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const apiEnvironmentSchema = runtimeEnvironmentSchema.extend({
  API_PORT: portSchema.default(4000),
});

export const workerEnvironmentSchema = runtimeEnvironmentSchema.extend({
  WORKER_NAME: z.string().trim().min(1).default('ecommerce-worker'),
});

export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;
export type WorkerEnvironment = z.infer<typeof workerEnvironmentSchema>;

export function loadLocalEnvironment(startDirectory = process.cwd()): string | undefined {
  let directory = startDirectory;
  for (let depth = 0; depth < 8; depth += 1) {
    const candidate = join(directory, '.env');
    if (existsSync(candidate)) {
      process.loadEnvFile(candidate);
      return candidate;
    }
    const parent = dirname(directory);
    if (parent === directory) break;
    directory = parent;
  }
  return undefined;
}

export function parseApiEnvironment(environment: NodeJS.ProcessEnv): ApiEnvironment {
  return apiEnvironmentSchema.parse(environment);
}

export function parseWorkerEnvironment(environment: NodeJS.ProcessEnv): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}

const productionApiSchema = z.object({
  DATABASE_URL: z.string().url().startsWith('postgresql://'),
  REDIS_URL: z.string().url().refine((value) => value.startsWith('redis://') || value.startsWith('rediss://')),
  AUTH_ENCRYPTION_KEY_BASE64: z.string().min(43).refine((value) => Buffer.from(value, 'base64').length >= 32),
  PAYMENT_WEBHOOK_SECRET: z.string().min(32),
  CORS_ALLOWED_ORIGINS: z.string().refine((value) => value.split(',').every((origin) => origin.trim().startsWith('https://'))),
  MEDIA_STORAGE_DRIVER: z.literal('r2'),
  R2_ENDPOINT: z.string().url(), R2_BUCKET: z.string().min(1), R2_ACCESS_KEY_ID: z.string().min(1), R2_SECRET_ACCESS_KEY: z.string().min(1), R2_PUBLIC_BASE_URL: z.string().url(),
});

const productionWorkerSchema = z.object({ DATABASE_URL: z.string().url().startsWith('postgresql://'), REDIS_URL: z.string().url().refine((value) => value.startsWith('redis://') || value.startsWith('rediss://')) });

export function assertApiProductionEnvironment(environment: NodeJS.ProcessEnv): void {
  if (environment.NODE_ENV === 'production') productionApiSchema.parse(environment);
}

export function assertWorkerProductionEnvironment(environment: NodeJS.ProcessEnv): void {
  if (environment.NODE_ENV === 'production') productionWorkerSchema.parse(environment);
}
