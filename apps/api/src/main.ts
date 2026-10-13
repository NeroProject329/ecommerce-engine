import 'reflect-metadata';
import { assertApiProductionEnvironment, loadLocalEnvironment, parseApiEnvironment } from '@ecommerce/config';
import { createLogRecord } from '@ecommerce/observability';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ProblemDetailsFilter } from './platform/problem-details.filter';
import { RateLimitGuard } from './platform/rate-limit.guard';
import { RequestContextInterceptor } from './platform/request-context';

export async function bootstrap(): Promise<NestFastifyApplication> {
  loadLocalEnvironment();
  assertApiProductionEnvironment(process.env);
  const environment = parseApiEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    rawBody: true,
    logger: environment.NODE_ENV === 'test' ? ['error'] : ['error', 'warn', 'log'],
  });
  const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000,http://localhost:3001').split(',').map((origin) => origin.trim()).filter(Boolean);
  app.enableCors({ origin: allowedOrigins, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], allowedHeaders: ['authorization', 'content-type', 'idempotency-key', 'x-request-id', 'x-cart-token', 'x-order-token', 'x-payment-signature', 'x-client-id', 'x-client-secret'], exposedHeaders: ['x-request-id'] });
  app.useGlobalFilters(new ProblemDetailsFilter());
  app.useGlobalGuards(new RateLimitGuard());
  app.useGlobalInterceptors(new RequestContextInterceptor());
  app.enableShutdownHooks();
  await app.listen(environment.API_PORT, '0.0.0.0');
  console.log(JSON.stringify(createLogRecord('ecommerce-api', 'info', 'api.started', { port: environment.API_PORT })));
  return app;
}

if (require.main === module) {
  void bootstrap();
}
