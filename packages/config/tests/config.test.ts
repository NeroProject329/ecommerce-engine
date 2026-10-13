import { describe, expect, it } from 'vitest';
import { assertApiProductionEnvironment, assertWorkerProductionEnvironment, parseApiEnvironment } from '../src';

describe('parseApiEnvironment', () => {
  it('applies safe local defaults', () => {
    expect(parseApiEnvironment({})).toEqual({
      NODE_ENV: 'development',
      LOG_LEVEL: 'info',
      API_PORT: 4000,
    });
  });

  it('rejects invalid ports', () => {
    expect(() => parseApiEnvironment({ API_PORT: '70000' })).toThrow();
  });

  it('fails closed when production secrets and managed storage are absent', () => {
    expect(() => assertApiProductionEnvironment({ NODE_ENV: 'production' })).toThrow();
    expect(() => assertWorkerProductionEnvironment({ NODE_ENV: 'production' })).toThrow();
  });

  it('does not require production-only settings in local development', () => {
    expect(() => assertApiProductionEnvironment({ NODE_ENV: 'development' })).not.toThrow();
  });
});
