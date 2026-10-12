import type { HealthStatus } from '@ecommerce/contracts';
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseHealthService) private readonly databaseHealth: DatabaseHealthService) {}

  @Get('live')
  live(): HealthStatus {
    return {
      status: 'ok',
      service: 'ecommerce-api',
      version: '0.1.0',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async ready() {
    const database = await this.databaseHealth.check();
    if (database.status !== 'up') {
      throw new ServiceUnavailableException({
        status: 'not-ready',
        dependencies: { database },
      });
    }
    return { status: 'ready', dependencies: { database } };
  }
}
