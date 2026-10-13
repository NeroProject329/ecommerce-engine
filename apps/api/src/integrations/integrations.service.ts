import { createOpaqueToken, hashPassword, verifyPassword } from '@ecommerce/auth';
import { Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ConsentInput, CreateIntegrationClientInput } from './schemas';

@Injectable()
export class IntegrationsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listClients(storeId: string): Promise<unknown> {
    return this.prisma.client.integrationClient.findMany({ where: { storeId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: { id: true, clientId: true, scopes: true, status: true, rotatedAt: true, createdAt: true, updatedAt: true } });
  }

  async createClient(storeId: string, actorId: string, input: CreateIntegrationClientInput) {
    const idToken = createOpaqueToken(); const secret = createOpaqueToken(); const clientId = `int_${idToken.raw}`;
    const client = await this.prisma.client.integrationClient.create({ data: { storeId, clientId, secretHash: await hashPassword(secret.raw), scopes: input.scopes } });
    await this.prisma.client.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'integration.client.create', objectType: 'integration_client', objectId: client.id, diffRedactedJson: { name: input.name, scopes: input.scopes } } });
    return { id: client.id, clientId, clientSecret: secret.raw, scopes: input.scopes, warning: 'O segredo é exibido uma única vez.' };
  }

  async rotateClient(storeId: string, clientRecordId: string, actorId: string) {
    const client = await this.prisma.client.integrationClient.findFirst({ where: { id: clientRecordId, storeId, status: { not: 'DISABLED' } } });
    if (!client) throw new NotFoundException('INTEGRATION_CLIENT_NOT_FOUND');
    const secret = createOpaqueToken();
    await this.prisma.client.$transaction([
      this.prisma.client.integrationClient.update({ where: { id: client.id }, data: { secretHash: await hashPassword(secret.raw), status: 'ACTIVE', rotatedAt: new Date() } }),
      this.prisma.client.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'integration.client.rotate', objectType: 'integration_client', objectId: client.id, diffRedactedJson: {} } }),
    ]);
    return { clientId: client.clientId, clientSecret: secret.raw, warning: 'O segredo anterior foi revogado.' };
  }

  async authorizeClient(clientId: string | undefined, secret: string | undefined, requiredScope: string) {
    if (!clientId || !secret) throw new UnauthorizedException('INTEGRATION_CREDENTIALS_REQUIRED');
    const client = await this.prisma.client.integrationClient.findFirst({ where: { clientId, status: 'ACTIVE' } });
    const scopes = Array.isArray(client?.scopes) ? client.scopes.filter((scope): scope is string => typeof scope === 'string') : [];
    if (!client || !(await verifyPassword(secret, client.secretHash)) || !scopes.includes(requiredScope)) throw new UnauthorizedException('INTEGRATION_AUTHORIZATION_DENIED');
    return { storeId: client.storeId, clientRecordId: client.id };
  }

  async recordConsent(storeSlug: string, rawToken: string, input: ConsentInput, authorize: (storeId: string) => Promise<{ customerId: string; storeId: string }>) {
    const store = await this.prisma.client.store.findFirst({ where: { slug: storeSlug, status: 'ACTIVE' } });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    const actor = await authorize(store.id);
    return this.prisma.client.$transaction(async (tx) => {
      const record = await tx.consentRecord.create({ data: { storeId: store.id, customerId: actor.customerId, purpose: input.purpose, channel: input.channel, granted: input.granted, source: 'customer_portal', version: input.version } });
      await tx.outboxEvent.create({ data: { storeId: store.id, aggregateType: 'customer', aggregateId: actor.customerId, eventType: 'customer.consent.changed', payloadJson: { consentId: record.id, customerId: actor.customerId, purpose: input.purpose, channel: input.channel, granted: input.granted, version: input.version } } });
      return { id: record.id, ...input, recordedAt: record.recordedAt };
    });
  }

  async listConsents(storeId: string) {
    return this.prisma.client.consentRecord.findMany({ where: { storeId }, orderBy: [{ recordedAt: 'desc' }, { id: 'desc' }], take: 100, select: { id: true, customerId: true, purpose: true, channel: true, granted: true, source: true, version: true, recordedAt: true } });
  }
}
