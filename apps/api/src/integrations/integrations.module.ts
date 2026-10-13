import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImportsModule } from '../imports/imports.module';
import { PrismaService } from '../prisma.service';
import { AdminIntegrationsController, CatalogIntegrationController, CustomerConsentController } from './integrations.controller';
import { IntegrationsService } from './integrations.service';

@Module({ imports: [AuthModule, ImportsModule], controllers: [AdminIntegrationsController, CatalogIntegrationController, CustomerConsentController], providers: [IntegrationsService, PrismaService] })
export class IntegrationsModule {}
