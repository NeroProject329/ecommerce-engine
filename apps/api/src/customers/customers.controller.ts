import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ZodError } from 'zod';
import { CustomersService } from './customers.service';
import { cancelOrderSchema, createAddressSchema, favoriteSchema, updateAddressSchema, updateProfileSchema } from './schemas';
import { pageEnvelope, pagination } from '../platform/pagination';

function bearer(value: string | undefined): string {
  if (!value?.startsWith('Bearer ') || value.length <= 7) throw new BadRequestException('BEARER_TOKEN_REQUIRED');
  return value.slice(7);
}

function parse<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try { return schema.parse(value); } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

@Controller('v1/customer')
export class CustomersController {
  constructor(@Inject(CustomersService) private readonly customers: CustomersService) {}

  @Get('me')
  async me(@Headers('authorization') authorization?: string) { return { data: await this.customers.me(bearer(authorization)) }; }

  @Patch('me')
  async updateMe(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) { return { data: await this.customers.updateProfile(bearer(authorization), parse(updateProfileSchema, body)) }; }

  @Get('favorites')
  async favorites(@Headers('authorization') authorization?: string): Promise<{ data: unknown }> { return { data: await this.customers.favorites(bearer(authorization)) }; }

  @Post('favorites')
  async addFavorite(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) { return { data: await this.customers.addFavorite(bearer(authorization), parse(favoriteSchema, body)) }; }

  @Delete('favorites/:productId')
  @HttpCode(204)
  async removeFavorite(@Headers('authorization') authorization: string | undefined, @Param('productId') productId: string): Promise<void> { await this.customers.removeFavorite(bearer(authorization), productId); }

  @Get('addresses')
  async addresses(@Headers('authorization') authorization?: string) { return { data: await this.customers.addresses(bearer(authorization)) }; }

  @Post('addresses')
  async createAddress(@Headers('authorization') authorization: string | undefined, @Body() body: unknown) { return { data: await this.customers.createAddress(bearer(authorization), parse(createAddressSchema, body)) }; }

  @Patch('addresses/:addressId')
  async updateAddress(@Headers('authorization') authorization: string | undefined, @Param('addressId') addressId: string, @Body() body: unknown) { return { data: await this.customers.updateAddress(bearer(authorization), addressId, parse(updateAddressSchema, body)) }; }

  @Delete('addresses/:addressId')
  @HttpCode(204)
  async deleteAddress(@Headers('authorization') authorization: string | undefined, @Param('addressId') addressId: string): Promise<void> { await this.customers.deleteAddress(bearer(authorization), addressId); }

  @Get('orders')
  async orders(@Headers('authorization') authorization: string | undefined, @Query() query: unknown) { return pageEnvelope(await this.customers.orders(bearer(authorization), pagination(query))); }

  @Get('orders/:orderId')
  async order(@Headers('authorization') authorization: string | undefined, @Param('orderId') orderId: string): Promise<{ data: unknown }> { return { data: await this.customers.order(bearer(authorization), orderId) }; }

  @Post('orders/:orderId/cancel-request')
  async requestCancellation(@Headers('authorization') authorization: string | undefined, @Param('orderId') orderId: string, @Body() body: unknown): Promise<{ data: unknown }> { return { data: await this.customers.requestCancellation(bearer(authorization), orderId, parse(cancelOrderSchema, body)) }; }
}
