export interface RedisConnectionOptions {
  host: string;
  port: number;
  db: number;
  maxRetriesPerRequest: null;
  username?: string;
  password?: string;
  tls?: Record<string, never>;
}

export function parseRedisUrl(redisUrl: string): RedisConnectionOptions {
  const url = new URL(redisUrl);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL_PROTOCOL_INVALID');
  }
  const dbPart = url.pathname.slice(1) || '0';
  const db = Number(dbPart);
  if (!Number.isInteger(db) || db < 0) throw new Error('REDIS_URL_DATABASE_INVALID');

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 6379,
    db,
    maxRetriesPerRequest: null,
    ...(url.username ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
