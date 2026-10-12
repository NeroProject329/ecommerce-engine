import { z } from 'zod';

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

export function parseApiEnvironment(environment: NodeJS.ProcessEnv): ApiEnvironment {
  return apiEnvironmentSchema.parse(environment);
}

export function parseWorkerEnvironment(environment: NodeJS.ProcessEnv): WorkerEnvironment {
  return workerEnvironmentSchema.parse(environment);
}
