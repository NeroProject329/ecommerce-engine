import { performance } from 'node:perf_hooks';

const baseUrl = process.env.API_BASE_URL ?? 'http://127.0.0.1:4000';
const total = Number(process.env.LOAD_REQUESTS ?? 100);
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 10);
const maxP95Ms = Number(process.env.LOAD_MAX_P95_MS ?? 500);

if (!Number.isInteger(total) || total < 1 || !Number.isInteger(concurrency) || concurrency < 1) {
  throw new Error('LOAD_CONFIGURATION_INVALID');
}

const timings = [];
let failures = 0;
let cursor = 0;

async function worker() {
  while (cursor < total) {
    cursor += 1;
    const startedAt = performance.now();
    try {
      const response = await fetch(`${baseUrl}/health/live`, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) failures += 1;
      await response.arrayBuffer();
    } catch {
      failures += 1;
    } finally {
      timings.push(performance.now() - startedAt);
    }
  }
}

const startedAt = performance.now();
await Promise.all(Array.from({ length: Math.min(concurrency, total) }, () => worker()));
const elapsedMs = performance.now() - startedAt;
timings.sort((a, b) => a - b);
const percentile = (ratio) => timings[Math.min(timings.length - 1, Math.ceil(timings.length * ratio) - 1)];
const result = {
  requests: total,
  concurrency,
  failures,
  elapsedMs: Number(elapsedMs.toFixed(2)),
  requestsPerSecond: Number((total / (elapsedMs / 1_000)).toFixed(2)),
  p50Ms: Number(percentile(0.5).toFixed(2)),
  p95Ms: Number(percentile(0.95).toFixed(2)),
  p99Ms: Number(percentile(0.99).toFixed(2)),
};

console.log(JSON.stringify(result));
if (failures > 0 || result.p95Ms > maxP95Ms) process.exitCode = 1;
