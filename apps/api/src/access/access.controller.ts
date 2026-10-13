import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, Patch, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from '../auth/admin-auth.service';
import { AccessService } from './access.service';
import { createRoleSchema, createUserSchema, updateRoleSchema, updateUserSchema } from './schemas';

function bearer(value: string | undefined): string { if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED'); return value.slice(7); }
function parsed<T>(schema: { parse(value: unknown): T }, value: unknown): T { try { return schema.parse(value); } catch (error) { if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED'); throw error; } }

@Controller('v1/admin/stores/:storeId/access')
export class AccessController {
  constructor(@Inject(AccessService) private readonly access: AccessService, @Inject(AdminAuthService) private readonly auth: AdminAuthService) {}

  @Get('roles') async roles(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.roles(storeId) }; }
  @Post('roles') async createRole(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.createRole(storeId, actor.adminUserId, parsed(createRoleSchema, body)) }; }
  @Patch('roles/:roleId') async updateRole(@Param('storeId') storeId: string, @Param('roleId') roleId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.updateRole(storeId, roleId, actor.adminUserId, parsed(updateRoleSchema, body)) }; }
  @Get('users') async users(@Param('storeId') storeId: string, @Headers('authorization') authorization?: string): Promise<{ data: unknown }> { await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.users(storeId) }; }
  @Post('users') async createUser(@Param('storeId') storeId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.createUser(storeId, actor.adminUserId, parsed(createUserSchema, body)) }; }
  @Patch('users/:membershipId') async updateUser(@Param('storeId') storeId: string, @Param('membershipId') membershipId: string, @Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<{ data: unknown }> { const actor = await this.auth.authorize(bearer(authorization), storeId, 'users:write'); return { data: await this.access.updateUser(storeId, membershipId, actor.adminUserId, parsed(updateUserSchema, body)) }; }
}
