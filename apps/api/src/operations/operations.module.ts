import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { OperationsController } from './operations.controller';
import { OperationsService } from './operations.service';

@Module({ imports: [AuthModule], controllers: [OperationsController], providers: [OperationsService, PrismaService] })
export class OperationsModule {}
