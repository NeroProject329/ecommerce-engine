import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { AdminPricingController, PublicPricingController } from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({ imports: [AuthModule], controllers: [AdminPricingController, PublicPricingController], providers: [PricingService, PrismaService] })
export class PricingModule {}
