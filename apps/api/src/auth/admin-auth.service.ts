import {
  createOpaqueToken,
  generateTotpSecret,
  hashOpaqueToken,
  normalizeEmail,
  openSecret,
  sealSecret,
  verifyPassword,
  verifyTotp,
  hashPassword,
  authorizeStoreAction,
} from '@ecommerce/auth';
import type { Permission } from '@ecommerce/auth';
import { BadRequestException, Inject, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type {
  AdminLoginInput,
  AdminPasswordChangeInput,
  AdminRecoveryRequestInput,
  AdminRecoveryResetInput,
  TotpVerificationInput,
} from './schemas';
import { EmailService } from './email.service';

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;
const RECOVERY_DURATION_MS = 30 * 60 * 1000;

function encryptionKey(): string {
  const key = process.env.AUTH_ENCRYPTION_KEY_BASE64;
  if (!key) throw new InternalServerErrorException('AUTH_ENCRYPTION_KEY_NOT_CONFIGURED');
  return key;
}

function readString(value: unknown, key: string): string | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === 'string' ? candidate : undefined;
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

@Injectable()
export class AdminAuthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Inject(EmailService) private readonly email: EmailService) {}

  async login(input: AdminLoginInput) {
    const user = await this.prisma.client.adminUser.findUnique({
      where: { emailNormalized: normalizeEmail(input.email) },
      include: {
        memberships: {
          where: { status: 'ACTIVE', store: { slug: input.storeSlug, status: 'ACTIVE' } },
          include: { store: true, role: { include: { permissions: true } } },
        },
      },
    });
    const membership = user?.memberships[0];
    if (!user || user.status !== 'ACTIVE' || !membership || !(await verifyPassword(input.password, user.passwordHash))) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const sealedTotpSecret = readString(user.mfaState, 'totpSecretEncrypted');
    const totpSecret = sealedTotpSecret ? openSecret(sealedTotpSecret, encryptionKey()) : undefined;
    if (totpSecret && (!input.totp || !verifyTotp(totpSecret, input.totp))) {
      throw new UnauthorizedException('MFA_REQUIRED');
    }

    const token = createOpaqueToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
    await this.prisma.client.adminSession.create({
      data: {
        adminUserId: user.id,
        tokenHash: token.hash,
        expiresAt,
        mfaVerifiedAt: totpSecret ? new Date() : null,
      },
    });
    return {
      token: token.raw,
      expiresAt: expiresAt.toISOString(),
      storeId: membership.storeId,
      permissions: membership.role.permissions.map((permission) => permission.permissionCode),
      mfaVerified: Boolean(totpSecret),
    };
  }

  async logout(rawToken: string): Promise<void> {
    await this.prisma.client.adminSession.updateMany({
      where: { tokenHash: hashOpaqueToken(rawToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async beginTotpEnrollment(rawToken: string) {
    const session = await this.requireSession(rawToken);
    const secret = generateTotpSecret();
    await this.prisma.client.adminUser.update({
      where: { id: session.adminUserId },
      data: {
        mfaState: {
          ...readObject(session.adminUser.mfaState),
          pendingTotpSecretEncrypted: sealSecret(secret, encryptionKey()),
        },
      },
    });
    const issuer = 'Ecommerce Engine';
    const accountName = session.adminUser.emailNormalized;
    const label = encodeURIComponent(`${issuer}:${accountName}`);
    const otpauthUrl = `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
    return { secret, otpauthUrl, issuer, accountName, algorithm: 'SHA1', digits: 6, period: 30 };
  }

  async verifyTotpEnrollment(rawToken: string, input: TotpVerificationInput): Promise<void> {
    const session = await this.requireSession(rawToken);
    const pendingSealed = readString(session.adminUser.mfaState, 'pendingTotpSecretEncrypted');
    const pendingSecret = pendingSealed ? openSecret(pendingSealed, encryptionKey()) : undefined;
    if (!pendingSecret || !verifyTotp(pendingSecret, input.code)) throw new UnauthorizedException('MFA_CODE_INVALID');
    await this.prisma.client.$transaction([
      this.prisma.client.adminUser.update({
        where: { id: session.adminUserId },
        data: {
          mfaState: {
            totpSecretEncrypted: sealSecret(pendingSecret, encryptionKey()),
            enrolledAt: new Date().toISOString(),
          },
        },
      }),
      this.prisma.client.adminSession.update({
        where: { id: session.id },
        data: { mfaVerifiedAt: new Date() },
      }),
    ]);
  }

  async sessions(rawToken: string) {
    const current = await this.requireSession(rawToken);
    const sessions = await this.prisma.client.adminSession.findMany({
      where: { adminUserId: current.adminUserId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((session) => ({
      id: session.id,
      current: session.id === current.id,
      createdAt: session.createdAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      mfaVerified: Boolean(session.mfaVerifiedAt),
    }));
  }

  async revokeSession(rawToken: string, sessionId: string): Promise<void> {
    const current = await this.requireSession(rawToken);
    if (sessionId === current.id) throw new BadRequestException('CURRENT_SESSION_USE_LOGOUT');
    const result = await this.prisma.client.adminSession.updateMany({
      where: { id: sessionId, adminUserId: current.adminUserId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    if (result.count === 0) throw new NotFoundException('SESSION_NOT_FOUND');
  }

  async changePassword(rawToken: string, input: AdminPasswordChangeInput): Promise<void> {
    const session = await this.requireSession(rawToken);
    if (!session.mfaVerifiedAt) throw new UnauthorizedException('MFA_REQUIRED');
    if (!(await verifyPassword(input.currentPassword, session.adminUser.passwordHash))) {
      throw new UnauthorizedException('CURRENT_PASSWORD_INVALID');
    }
    const passwordHash = await hashPassword(input.newPassword);
    const now = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.adminUser.update({ where: { id: session.adminUserId }, data: { passwordHash } }),
      this.prisma.client.adminSession.updateMany({
        where: { adminUserId: session.adminUserId, id: { not: session.id }, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async requestRecovery(input: AdminRecoveryRequestInput): Promise<void> {
    const user = await this.prisma.client.adminUser.findUnique({
      where: { emailNormalized: normalizeEmail(input.email) },
      include: { memberships: { where: { status: 'ACTIVE', store: { slug: input.storeSlug, status: 'ACTIVE' } } } },
    });
    if (!user || user.status !== 'ACTIVE' || user.memberships.length === 0) return;
    const token = createOpaqueToken();
    await this.prisma.client.adminRecoveryToken.create({
      data: { adminUserId: user.id, tokenHash: token.hash, expiresAt: new Date(Date.now() + RECOVERY_DURATION_MS) },
    });
    await this.email.sendRecovery(user.memberships[0]!.storeId, user.emailNormalized, token.raw, 'admin').catch(() => false);
  }

  async resetPassword(input: AdminRecoveryResetInput): Promise<void> {
    const recovery = await this.prisma.client.adminRecoveryToken.findUnique({
      where: { tokenHash: hashOpaqueToken(input.token) },
    });
    if (!recovery || recovery.usedAt || recovery.expiresAt <= new Date()) {
      throw new UnauthorizedException('RECOVERY_TOKEN_INVALID');
    }
    const passwordHash = await hashPassword(input.newPassword);
    const now = new Date();
    await this.prisma.client.$transaction([
      this.prisma.client.adminUser.update({ where: { id: recovery.adminUserId }, data: { passwordHash } }),
      this.prisma.client.adminRecoveryToken.update({ where: { id: recovery.id }, data: { usedAt: now } }),
      this.prisma.client.adminSession.updateMany({
        where: { adminUserId: recovery.adminUserId, revokedAt: null },
        data: { revokedAt: now },
      }),
    ]);
  }

  async authorize(rawToken: string, storeId: string, permission: Permission, requiresMfa = true) {
    const session = await this.prisma.client.adminSession.findUnique({
      where: { tokenHash: hashOpaqueToken(rawToken) },
      include: {
        adminUser: {
          include: {
            memberships: {
              where: { storeId, status: 'ACTIVE' },
              include: { role: { include: { permissions: true } } },
            },
          },
        },
      },
    });
    const membership = session?.adminUser.memberships[0];
    if (!session || session.revokedAt || session.expiresAt <= new Date() || !membership) {
      throw new UnauthorizedException('AUTHORIZATION_DENIED');
    }
    const context = {
      storeId: membership.storeId,
      permissions: new Set(membership.role.permissions.map((entry) => entry.permissionCode as Permission)),
      mfaVerified: Boolean(session.mfaVerifiedAt),
    };
    if (!authorizeStoreAction(context, storeId, permission, requiresMfa)) {
      throw new UnauthorizedException('AUTHORIZATION_DENIED');
    }
    return { adminUserId: session.adminUserId, storeId, permission };
  }

  private async requireSession(rawToken: string) {
    const session = await this.prisma.client.adminSession.findUnique({
      where: { tokenHash: hashOpaqueToken(rawToken) },
      include: { adminUser: true },
    });
    if (!session || session.revokedAt || session.expiresAt <= new Date() || session.adminUser.status !== 'ACTIVE') {
      throw new UnauthorizedException('SESSION_INVALID');
    }
    return session;
  }
}
