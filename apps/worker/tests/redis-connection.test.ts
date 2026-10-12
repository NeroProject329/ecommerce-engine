import { describe, expect, it } from 'vitest';
import { parseRedisUrl } from '../src/redis-connection';

describe('parseRedisUrl', () => {
  it('maps a local Redis URL to BullMQ connection options', () => {
    expect(parseRedisUrl('redis://localhost:6379/2')).toEqual({
      host: 'localhost',
      port: 6379,
      db: 2,
      maxRetriesPerRequest: null,
    });
  });

  it('rejects non-Redis protocols', () => {
    expect(() => parseRedisUrl('https://localhost:6379')).toThrow('REDIS_URL_PROTOCOL_INVALID');
  });
});
