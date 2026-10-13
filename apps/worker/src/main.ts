import { assertWorkerProductionEnvironment, loadLocalEnvironment, parseWorkerEnvironment } from '@ecommerce/config';
import { WorkerRuntime } from './worker-runtime';

export async function startWorker(): Promise<WorkerRuntime> {
  loadLocalEnvironment();
  assertWorkerProductionEnvironment(process.env);
  const environment = parseWorkerEnvironment(process.env);
  const worker = new WorkerRuntime(environment.WORKER_NAME, process.env.REDIS_URL);
  await worker.start();
  return worker;
}

if (require.main === module) {
  void startWorker().then((worker) => {
    const shutdown = async () => {
      if (worker.currentState() === 'running') await worker.stop();
      process.exitCode = 0;
    };
    process.once('SIGINT', () => void shutdown());
    process.once('SIGTERM', () => void shutdown());
  });
}
