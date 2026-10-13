import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { CommunicationsController } from './communications.controller';
import { CommunicationsService } from './communications.service';

@Module({ imports: [AuthModule], controllers: [CommunicationsController], providers: [CommunicationsService, PrismaService] })
export class CommunicationsModule {}
