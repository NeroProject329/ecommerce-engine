import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';

@Module({
  imports: [AuthModule],
  controllers: [ImportsController],
  providers: [ImportsService, PrismaService],
})
export class ImportsModule {}
