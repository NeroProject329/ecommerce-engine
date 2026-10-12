import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { AdminMediaController, PublicMediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminMediaController, PublicMediaController],
  providers: [MediaService, PrismaService],
})
export class MediaModule {}
