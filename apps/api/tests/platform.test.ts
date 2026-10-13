import { BadRequestException, Controller, Get } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ProblemDetailsFilter } from '../src/platform/problem-details.filter';
import { RequestContextInterceptor } from '../src/platform/request-context';

class PlatformTestController {
  ok() { return { data: { ok: true } }; }
  error(): never { throw new BadRequestException('PLATFORM_TEST_ERROR'); }
}

Controller('platform-test')(PlatformTestController);
Get('ok')(PlatformTestController.prototype, 'ok', Object.getOwnPropertyDescriptor(PlatformTestController.prototype, 'ok')!);
Get('error')(PlatformTestController.prototype, 'error', Object.getOwnPropertyDescriptor(PlatformTestController.prototype, 'error')!);

describe('API platform conventions', () => {
  let app: NestFastifyApplication;
  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ controllers: [PlatformTestController] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false });
    app.useGlobalFilters(new ProblemDetailsFilter());
    app.useGlobalInterceptors(new RequestContextInterceptor());
    await app.init(); await app.getHttpAdapter().getInstance().ready();
  });
  afterAll(async () => app.close());

  it('propagates a valid request id into success metadata', async () => {
    const response = await app.inject({ method: 'GET', url: '/platform-test/ok', headers: { 'x-request-id': 'request-test-123' } });
    expect(response.headers['x-request-id']).toBe('request-test-123');
    expect(response.json()).toMatchObject({ data: { ok: true }, meta: { requestId: 'request-test-123' } });
  });

  it('returns RFC-style problem details without stack traces', async () => {
    const response = await app.inject({ method: 'GET', url: '/platform-test/error', headers: { 'x-request-id': 'request-test-456' } });
    expect(response.statusCode).toBe(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.json()).toMatchObject({ status: 400, code: 'PLATFORM_TEST_ERROR', requestId: 'request-test-456' });
    expect(response.body).not.toContain('stack');
  });
});
