import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, HttpException, HttpStatus } from '@nestjs/common';

type RequestLike = { url?: string; requestId?: string };
type ReplyLike = { status(code: number): ReplyLike; header(name: string, value: string): ReplyLike; send(body: unknown): void };

function errorCode(response: unknown, fallback: string): string {
  if (typeof response === 'string') return response;
  if (response && typeof response === 'object') {
    const message = (response as Record<string, unknown>).message;
    if (typeof message === 'string') return message;
  }
  return fallback;
}

@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const request = host.switchToHttp().getRequest<RequestLike>();
    const reply = host.switchToHttp().getResponse<ReplyLike>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const response = exception instanceof HttpException ? exception.getResponse() : undefined;
    const code = errorCode(response, status === 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_FAILED');
    const title = HttpStatus[status] ?? 'Error';
    reply.status(status).header('content-type', 'application/problem+json').send({
      type: `https://ecommerce.local/problems/${code.toLowerCase().replace(/_/gu, '-')}`,
      title,
      status,
      detail: status === 500 ? 'Ocorreu um erro interno.' : code,
      instance: request.url ?? '',
      code,
      requestId: request.requestId ?? '',
    });
  }
}
