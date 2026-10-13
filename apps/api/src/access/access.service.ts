import { hashPassword, normalizeEmail } from '@ecommerce/auth';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { CreateRoleInput, CreateUserInput, UpdateRoleInput, UpdateUserInput } from './schemas';

@Injectable()
export class AccessService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async roles(storeId: string): Promise<unknown> {
    return this.prisma.client.role.findMany({ where: { OR: [{ storeId }, { storeId: null }] }, orderBy: [{ immutable: 'desc' }, { name: 'asc' }], include: { permissions: true, _count: { select: { memberships: true } } } });
  }

  async createRole(storeId: string, actorId: string, input: CreateRoleInput): Promise<unknown> {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const role = await tx.role.create({ data: { storeId, name: input.name } });
        await tx.rolePermission.createMany({ data: input.permissions.map((permissionCode) => ({ roleId: role.id, permissionCode })) });
        await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'access.role.created', objectType: 'Role', objectId: role.id, diffRedactedJson: { name: role.name, permissions: input.permissions } } });
        return { ...role, permissions: input.permissions };
      });
    } catch (error) { throw new ConflictException('ROLE_ALREADY_EXISTS', { cause: error }); }
  }

  async updateRole(storeId: string, roleId: string, actorId: string, input: UpdateRoleInput): Promise<unknown> {
    const role = await this.prisma.client.role.findFirst({ where: { id: roleId, storeId } });
    if (!role) throw new NotFoundException('ROLE_NOT_FOUND');
    if (role.immutable) throw new ConflictException('ROLE_IMMUTABLE');
    return this.prisma.client.$transaction(async (tx) => {
      const updated = input.name ? await tx.role.update({ where: { id: role.id }, data: { name: input.name } }) : role;
      if (input.permissions) {
        await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
        await tx.rolePermission.createMany({ data: input.permissions.map((permissionCode) => ({ roleId: role.id, permissionCode })) });
      }
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'access.role.updated', objectType: 'Role', objectId: role.id, diffRedactedJson: { name: input.name, permissions: input.permissions } } });
      return { ...updated, permissions: input.permissions ?? undefined };
    });
  }

  async users(storeId: string): Promise<unknown> {
    return this.prisma.client.adminMembership.findMany({ where: { storeId }, orderBy: { createdAt: 'desc' }, include: { adminUser: { select: { id: true, emailNormalized: true, status: true, createdAt: true, updatedAt: true, mfaState: true } }, role: { include: { permissions: true } } } });
  }

  async createUser(storeId: string, actorId: string, input: CreateUserInput): Promise<unknown> {
    const role = await this.prisma.client.role.findFirst({ where: { id: input.roleId, OR: [{ storeId }, { storeId: null }] } });
    if (!role) throw new BadRequestException('ROLE_INVALID');
    const emailNormalized = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    return this.prisma.client.$transaction(async (tx) => {
      const user = await tx.adminUser.upsert({ where: { emailNormalized }, update: {}, create: { emailNormalized, passwordHash, status: input.status } });
      const existing = await tx.adminMembership.findFirst({ where: { storeId, adminUserId: user.id, status: { not: 'REVOKED' } } });
      if (existing) throw new ConflictException('USER_MEMBERSHIP_ALREADY_EXISTS');
      const membership = await tx.adminMembership.create({ data: { storeId, adminUserId: user.id, roleId: role.id } });
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'access.user.created', objectType: 'AdminMembership', objectId: membership.id, diffRedactedJson: { adminUserId: user.id, roleId: role.id } } });
      return { id: membership.id, adminUserId: user.id, email: user.emailNormalized, accountStatus: user.status, membershipStatus: membership.status, roleId: role.id };
    });
  }

  async updateUser(storeId: string, membershipId: string, actorId: string, input: UpdateUserInput): Promise<unknown> {
    const membership = await this.prisma.client.adminMembership.findFirst({ where: { id: membershipId, storeId } });
    if (!membership) throw new NotFoundException('USER_MEMBERSHIP_NOT_FOUND');
    if (membership.adminUserId === actorId && (input.membershipStatus === 'REVOKED' || input.membershipStatus === 'SUSPENDED' || input.accountStatus === 'DISABLED')) throw new ConflictException('CURRENT_ADMIN_ACCESS_CANNOT_BE_DISABLED');
    if (input.roleId && !(await this.prisma.client.role.findFirst({ where: { id: input.roleId, OR: [{ storeId }, { storeId: null }] } }))) throw new BadRequestException('ROLE_INVALID');
    return this.prisma.client.$transaction(async (tx) => {
      const updated = await tx.adminMembership.update({ where: { id: membership.id }, data: Object.fromEntries(Object.entries({ roleId: input.roleId, status: input.membershipStatus }).filter(([, value]) => value !== undefined)) });
      if (input.accountStatus) await tx.adminUser.update({ where: { id: membership.adminUserId }, data: { status: input.accountStatus } });
      await tx.auditLog.create({ data: { storeId, actorType: 'ADMIN', actorId, action: 'access.user.updated', objectType: 'AdminMembership', objectId: membership.id, diffRedactedJson: input } });
      return updated;
    });
  }
}
