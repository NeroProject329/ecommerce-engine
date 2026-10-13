import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { AccessController } from './access.controller';
import { AccessService } from './access.service';

@Module({ imports: [AuthModule], controllers: [AccessController], providers: [AccessService, PrismaService] })
export class AccessModule {}
