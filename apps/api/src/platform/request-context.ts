import { randomUUID } from 'node:crypto';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

type RequestLike = { headers: Record<string, string | string[] | undefined>; requestId?: string };
type ReplyLike = { header(name: string, value: string): void; statusCode?: number };

@Injectable()
export class RequestContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestLike>();
    const reply = context.switchToHttp().getResponse<ReplyLike>();
    const candidate = request.headers['x-request-id'];
    const incoming = Array.isArray(candidate) ? candidate[0] : candidate;
    const requestId = incoming && /^[A-Za-z0-9._:-]{8,180}$/u.test(incoming) ? incoming : randomUUID();
    request.requestId = requestId;
    reply.header('x-request-id', requestId);
    return next.handle().pipe(map((body: unknown) => {
      if (body === undefined || reply.statusCode === 204 || !body || typeof body !== 'object' || Array.isArray(body)) return body;
      const record = body as Record<string, unknown>;
      return { ...record, meta: { ...(record.meta && typeof record.meta === 'object' ? record.meta : {}), requestId } };
    }));
  }
}
