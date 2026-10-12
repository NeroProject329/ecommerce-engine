import 'reflect-metadata';
import { parseApiEnvironment } from '@ecommerce/config';
import { createLogRecord } from '@ecommerce/observability';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';

export async function bootstrap(): Promise<NestFastifyApplication> {
  const environment = parseApiEnvironment(process.env);
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: environment.NODE_ENV === 'test' ? false : ['error', 'warn', 'log'],
  });
  app.enableShutdownHooks();
  await app.listen(environment.API_PORT, '0.0.0.0');
  console.log(JSON.stringify(createLogRecord('ecommerce-api', 'info', 'api.started', { port: environment.API_PORT })));
  return app;
}

if (require.main === module) {
  void bootstrap();
}
