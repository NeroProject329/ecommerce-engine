import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { AdminCatalogController } from './admin-catalog.controller';
import { CatalogService } from './catalog.service';
import { PublicCatalogController } from './public-catalog.controller';

@Module({
  imports: [AuthModule],
  controllers: [AdminCatalogController, PublicCatalogController],
  providers: [CatalogService, PrismaService],
})
export class CatalogModule {}
