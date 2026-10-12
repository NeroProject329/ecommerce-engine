import { afterEach, describe, expect, it, vi } from 'vitest';
import { WorkerRuntime } from '../src/worker-runtime';

describe('WorkerRuntime', () => {
  afterEach(() => vi.restoreAllMocks());

  it('starts and stops independently when Redis is not configured', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const worker = new WorkerRuntime('test-worker');
    await worker.start();
    expect(worker.currentState()).toBe('running');
    await worker.stop();
    expect(worker.currentState()).toBe('stopped');
  });
});
