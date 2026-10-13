import {
  createOpaqueToken,
  hashOpaqueToken,
  hashPassword,
  normalizeEmail,
  verifyPassword,
} from '@ecommerce/auth';
import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  CustomerLoginInput,
  CustomerRegisterInput,
  RecoveryRequestInput,
  RecoveryResetInput,
} from './schemas';
import { EmailService } from './email.service';

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;
const RECOVERY_DURATION_MS = 30 * 60 * 1000;

@Injectable()
export class CustomerAuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(EmailService) private readonly email: EmailService) {}

  async register(input: CustomerRegisterInput) {
    const emailNormalized = normalizeEmail(input.email);
    const store = await this.prisma.client.store.findUnique({ where: { slug: input.storeSlug } });
    if (!store || store.status !== 'ACTIVE') throw new UnauthorizedException('STORE_NOT_AVAILABLE');

    const existing = await this.prisma.client.customer.findUnique({
      where: { storeId_emailNormalized: { storeId: store.id, emailNormalized } },
    });
    if (existing) throw new ConflictException('CUSTOMER_ALREADY_EXISTS');

    const passwordHash = await hashPassword(input.password);
    const customer = await this.prisma.client.customer.create({
      data: {
        storeId: store.id,
        emailNormalized,
        name: input.name.trim(),
        credential: { create: { passwordHash } },
      },
      select: { id: true, storeId: true, name: true, emailNormalized: true },
    });
    await this.prisma.client.outboxEvent.create({ data: { storeId: store.id, aggregateType: 'Customer', aggregateId: customer.id, eventType: 'customer.registered', payloadJson: { customerId: customer.id } } });
    return { customer };
  }

  async login(input: CustomerLoginInput) {
    const store = await this.prisma.client.store.findUnique({ where: { slug: input.storeSlug } });
    if (!store || store.status !== 'ACTIVE') throw new UnauthorizedException('INVALID_CREDENTIALS');
    const customer = await this.prisma.client.customer.findUnique({
      where: { storeId_emailNormalized: { storeId: store.id, emailNormalized: normalizeEmail(input.email) } },
      include: { credential: true },
    });
    if (!customer?.credential || customer.status !== 'ACTIVE') throw new UnauthorizedException('INVALID_CREDENTIALS');
    if (!(await verifyPassword(input.password, customer.credential.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.prisma.client.customerSession.create({
      data: { storeId: store.id, customerId: customer.id, tokenHash: token.hash, expiresAt },
    });
    return { token: token.raw, expiresAt: expiresAt.toISOString() };
  }

  async logout(rawToken: string): Promise<void> {
    await this.prisma.client.customerSession.updateMany({
      where: { tokenHash: hashOpaqueToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async authorize(rawToken: string, storeId: string) {
    const session = await this.authenticate(rawToken);
    if (!session || session.storeId !== storeId || session.revokedAt || session.expiresAt <= new Date() || session.customer.status !== 'ACTIVE') {
      throw new UnauthorizedException('CUSTOMER_SESSION_INVALID');
    }
    return { customerId: session.customerId, storeId };
  }

  async authenticate(rawToken: string) {
    const session = await this.prisma.client.customerSession.findUnique({
      where: { tokenHash: hashOpaqueToken(rawToken) },
      include: { customer: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.customer.status !== 'ACTIVE') {
      throw new UnauthorizedException('CUSTOMER_SESSION_INVALID');
    }
    return session;
  }

  async requestRecovery(input: RecoveryRequestInput): Promise<void> {
    const store = await this.prisma.client.store.findUnique({ where: { slug: input.storeSlug } });
    if (!store) return;
    const customer = await this.prisma.client.customer.findUnique({
      where: { storeId_emailNormalized: { storeId: store.id, emailNormalized: normalizeEmail(input.email) } },
      include: { credential: true },
    });
    if (!customer?.credential || customer.status !== 'ACTIVE') return;

    const token = createOpaqueToken();
    await this.prisma.client.customerCredential.update({
      where: { customerId: customer.id },
      data: { resetTokenHash: token.hash, resetExpiresAt: new Date(Date.now() + RECOVERY_DURATION_MS) },
    });
    await this.email.sendRecovery(store.id, customer.emailNormalized, token.raw, 'customer').catch(() => false);
  }

  async resetPassword(input: RecoveryResetInput): Promise<void> {
    const tokenHash = hashOpaqueToken(input.token);
    const credential = await this.prisma.client.customerCredential.findUnique({ where: { resetTokenHash: tokenHash } });
    if (!credential?.resetExpiresAt || credential.resetExpiresAt <= new Date()) {
      throw new UnauthorizedException('RECOVERY_TOKEN_INVALID');
    }
    const passwordHash = await hashPassword(input.newPassword);
    await this.prisma.client.$transaction([
      this.prisma.client.customerCredential.update({
        where: { customerId: credential.customerId },
        data: { passwordHash, passwordChangedAt: new Date(), resetTokenHash: null, resetExpiresAt: null },
      }),
      this.prisma.client.customerSession.updateMany({
        where: { customerId: credential.customerId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }
}
