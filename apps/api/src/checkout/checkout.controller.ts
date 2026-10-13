import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ZodError } from 'zod';
import { CheckoutService } from './checkout.service';
import { cartItemSchema, checkoutSchema, shippingQuoteSchema } from './schemas';

function validated<T>(schema: { parse(value: unknown): T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) throw new BadRequestException('REQUEST_VALIDATION_FAILED');
    throw error;
  }
}

function optionalBearer(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (!value.startsWith('Bearer ') || value.length <= 7)
    throw new BadRequestException('BEARER_TOKEN_INVALID');
  return value.slice(7);
}

@Controller('v1/public/stores/:storeSlug/carts')
export class CheckoutController {
  constructor(@Inject(CheckoutService) private readonly checkoutService: CheckoutService) {}

  @Post()
  async create(
    @Param('storeSlug') storeSlug: string,
    @Headers('authorization') authorization?: string,
  ) {
    return {
      data: await this.checkoutService.createCart(storeSlug, optionalBearer(authorization)),
    };
  }

  @Get(':cartId')
  async get(
    @Param('storeSlug') storeSlug: string,
    @Param('cartId') cartId: string,
    @Headers('x-cart-token') cartToken?: string,
  ) {
    return { data: await this.checkoutService.getCart(storeSlug, cartId, cartToken) };
  }

  @Put(':cartId/items')
  async setItem(
    @Param('storeSlug') storeSlug: string,
    @Param('cartId') cartId: string,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Body() body: unknown,
  ) {
    return {
      data: await this.checkoutService.setItem(
        storeSlug,
        cartId,
        cartToken,
        validated(cartItemSchema, body),
      ),
    };
  }

  @Delete(':cartId/items/:itemId')
  @HttpCode(204)
  async removeItem(
    @Param('storeSlug') storeSlug: string,
    @Param('cartId') cartId: string,
    @Param('itemId') itemId: string,
    @Headers('x-cart-token') cartToken: string | undefined,
  ): Promise<void> {
    await this.checkoutService.removeItem(storeSlug, cartId, itemId, cartToken);
  }

  @Post(':cartId/shipping-quotes')
  async quoteShipping(
    @Param('storeSlug') storeSlug: string,
    @Param('cartId') cartId: string,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Body() body: unknown,
  ) {
    return {
      data: await this.checkoutService.quoteShipping(
        storeSlug,
        cartId,
        cartToken,
        validated(shippingQuoteSchema, body),
      ),
    };
  }

  @Post(':cartId/checkout')
  async checkout(
    @Param('storeSlug') storeSlug: string,
    @Param('cartId') cartId: string,
    @Headers('x-cart-token') cartToken: string | undefined,
    @Headers('authorization') authorization: string | undefined,
    @Body() body: unknown,
  ): Promise<{ data: unknown }> {
    return {
      data: await this.checkoutService.checkout(
        storeSlug,
        cartId,
        cartToken,
        validated(checkoutSchema, body),
        optionalBearer(authorization),
      ),
    };
  }
}
