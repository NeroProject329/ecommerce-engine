import { Module } from '@nestjs/common';
import { DatabaseHealthService } from './database-health.service';
import { HealthController } from './health.controller';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma.service';
import { CatalogModule } from './catalog/catalog.module';
import { MediaModule } from './media/media.module';
import { ImportsModule } from './imports/imports.module';
import { PricingModule } from './pricing/pricing.module';
import { CheckoutModule } from './checkout/checkout.module';
import { PaymentsModule } from './payments/payments.module';
import { OperationsModule } from './operations/operations.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CustomersModule } from './customers/customers.module';
import { OpenApiController } from './platform/openapi.controller';
import { AccessModule } from './access/access.module';
import { ContentModule } from './content/content.module';
import { AddressesModule } from './addresses/addresses.module';
import { CommunicationsModule } from './communications/communications.module';

@Module({
  imports: [AuthModule, AccessModule, AddressesModule, CommunicationsModule, ContentModule, CustomersModule, CatalogModule, MediaModule, ImportsModule, PricingModule, CheckoutModule, PaymentsModule, OperationsModule, IntegrationsModule],
  controllers: [HealthController, OpenApiController],
  providers: [DatabaseHealthService, PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
