import { createPrismaClient } from '@ecommerce/database';
import { Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  private database?: ReturnType<typeof createPrismaClient>;

  get client(): ReturnType<typeof createPrismaClient> {
    this.database ??= createPrismaClient();
    return this.database;
  }

  async onModuleDestroy(): Promise<void> {
    await this.database?.$disconnect();
  }
}
