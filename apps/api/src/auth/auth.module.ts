import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CustomerAuthController } from './customer-auth.controller';
import { CustomerAuthService } from './customer-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';

@Module({
  controllers: [CustomerAuthController, AdminAuthController],
  providers: [PrismaService, CustomerAuthService, AdminAuthService],
  exports: [CustomerAuthService, AdminAuthService],
})
export class AuthModule {}
