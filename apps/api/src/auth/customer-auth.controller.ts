import { BadRequestException, Body, Controller, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { ZodError } from 'zod';
import { CustomerAuthService } from './customer-auth.service';
import {
  customerLoginSchema,
  customerRegisterSchema,
  recoveryRequestSchema,
  recoveryResetSchema,
} from './schemas';

function parseBearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function parseBody<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

@Controller('v1/customer/auth')
export class CustomerAuthController {
  constructor(@Inject(CustomerAuthService) private readonly auth: CustomerAuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    return { data: await this.auth.register(parseBody(customerRegisterSchema, body)) };
  }

  @Post('login')
  @HttpCode(200)
  async login(@Body() body: unknown) {
    return { data: await this.auth.login(parseBody(customerLoginSchema, body)) };
  }

  @Post('logout')
  @HttpCode(204)
  async logout(@Headers('authorization') authorization?: string): Promise<void> {
    await this.auth.logout(parseBearer(authorization));
  }

  @Post('recovery/request')
  @HttpCode(202)
  async requestRecovery(@Body() body: unknown): Promise<{ data: { accepted: true } }> {
    await this.auth.requestRecovery(parseBody(recoveryRequestSchema, body));
    return { data: { accepted: true } };
  }

  @Post('recovery/reset')
  @HttpCode(204)
  async resetPassword(@Body() body: unknown): Promise<void> {
    await this.auth.resetPassword(parseBody(recoveryResetSchema, body));
  }
}
