import { Module } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { CatalogModule } from './catalog/catalog.module';
import { MediaModule } from './media/media.module';
import { ImportsModule } from './imports/imports.module';
import { PricingModule } from './pricing/pricing.module';

@Module({
  imports: [AuthModule, CatalogModule, MediaModule, ImportsModule, PricingModule],
  controllers: [HealthController],
  providers: [DatabaseHealthService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
