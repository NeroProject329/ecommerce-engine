import { BadRequestException, Body, Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { AdminAuthService } from './admin-auth.service';
import {
  adminLoginSchema,
  adminRecoveryRequestSchema,
  adminRecoveryResetSchema,
  totpVerificationSchema,
} from './schemas';

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function validated<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

@Controller('v1/admin/auth')
export class AdminAuthController {
  constructor(@Inject(AdminAuthService) private readonly auth: AdminAuthService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown) {
    return { data: await this.auth.login(validated(adminLoginSchema, body)) };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Headers('authorization') authorization?: string): Promise<void> {
    await this.auth.logout(bearer(authorization));
  }

  @Post('mfa/enroll')
  @HttpCode(200)
  async enroll(@Headers('authorization') authorization?: string) {
    return { data: await this.auth.beginTotpEnrollment(bearer(authorization)) };
  }

  @Post('mfa/verify')
  @HttpCode(204)
  async verify(@Headers('authorization') authorization: string | undefined, @Body() body: unknown): Promise<void> {
    await this.auth.verifyTotpEnrollment(bearer(authorization), validated(totpVerificationSchema, body));
  }

  @Post('recovery/request')
  @HttpCode(202)
  async requestRecovery(@Body() body: unknown): Promise<{ data: { accepted: true } }> {
    await this.auth.requestRecovery(validated(adminRecoveryRequestSchema, body));
    return { data: { accepted: true } };
  }

  @Post('recovery/reset')
  @HttpCode(204)
  async resetPassword(@Body() body: unknown): Promise<void> {
    await this.auth.resetPassword(validated(adminRecoveryResetSchema, body));
  }
}
