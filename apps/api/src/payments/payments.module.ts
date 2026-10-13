import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma.service';
import { AdminPaymentsController, PaymentWebhooksController, PublicPaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({ imports: [AuthModule], controllers: [PublicPaymentsController, AdminPaymentsController, PaymentWebhooksController], providers: [PaymentsService, PrismaService] })
export class PaymentsModule {}
