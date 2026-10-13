import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { HttpException, Injectable } from '@nestjs/common';
import { createClient, type RedisClientType } from 'redis';

type RequestLike = { ip?: string; headers: Record<string, string | string[] | undefined> };
type Entry = { count: number; resetsAt: number };

const WINDOW_MS = 60_000;
const MAXIMUM_REQUESTS = 300;

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly entries = new Map<string, Entry>();
  private redis: RedisClientType | undefined;
  private connecting: Promise<unknown> | undefined;

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const forwarded = request.headers['x-forwarded-for'];
    const key = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || request.ip || 'unknown';
    if (process.env.REDIS_URL && process.env.NODE_ENV !== 'test') return this.distributed(key);
    return this.local(key);
  }

  private async distributed(identity: string): Promise<boolean> {
    if (!this.redis) { const url = process.env.REDIS_URL; if (!url) return this.local(identity); this.redis = createClient({ url }); this.redis.on('error', () => undefined); this.connecting = this.redis.connect(); }
    await this.connecting;
    const bucket = Math.floor(Date.now() / WINDOW_MS);
    const count = await this.redis.eval("local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return n", { keys: [`rate:${bucket}:${identity}`], arguments: [String(WINDOW_MS * 2)] });
    if (Number(count) > MAXIMUM_REQUESTS) throw new HttpException('RATE_LIMIT_EXCEEDED', 429);
    return true;
  }

  private local(key: string): boolean {
    const now = Date.now();
    const current = this.entries.get(key);
    if (!current || current.resetsAt <= now) {
      this.entries.set(key, { count: 1, resetsAt: now + WINDOW_MS });
      if (this.entries.size > 10_000) this.prune(now);
      return true;
    }
    current.count += 1;
    if (current.count > MAXIMUM_REQUESTS) throw new HttpException('RATE_LIMIT_EXCEEDED', 429);
    return true;
  }

  private prune(now: number): void {
    for (const [key, entry] of this.entries) if (entry.resetsAt <= now) this.entries.delete(key);
  }
}
