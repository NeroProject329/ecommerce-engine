import { describe, expect, it } from 'vitest';
import { parseApiEnvironment } from '../src';

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
});
