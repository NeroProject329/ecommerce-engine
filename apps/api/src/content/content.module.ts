import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({ imports: [AuthModule], controllers: [ContentController], providers: [ContentService, PrismaService] })
export class ContentModule {}
