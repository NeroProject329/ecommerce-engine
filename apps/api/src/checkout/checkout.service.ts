import { createHash } from 'node:crypto';
import { createOpaqueToken, hashOpaqueToken } from '@ecommerce/auth';
import { cappedDiscount, multiplyMoney } from '@ecommerce/commerce';
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CustomerAuthService } from '../auth/customer-auth.service';
import { PrismaService } from '../prisma.service';
import type { CartItemInput, CheckoutInput, ShippingQuoteInput } from './schemas';

const CART_DURATION_MS = 14 * 24 * 60 * 60 * 1000;
const QUOTE_DURATION_MS = 30 * 60 * 1000;
const RESERVATION_DURATION_MS = 20 * 60 * 1000;

@Injectable()
export class CheckoutService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CustomerAuthService) private readonly auth: CustomerAuthService,
  ) {}

  async createCart(storeSlug: string, customerToken?: string) {
    const store = await this.store(storeSlug);
    await this.customerId(customerToken, store.id);
    const token = createOpaqueToken();
    const cart = await this.prisma.client.cart.create({
      data: {
        storeId: store.id,
        anonymousKeyHash: token.hash,
        currency: store.currency,
        expiresAt: new Date(Date.now() + CART_DURATION_MS),
      },
    });
    return { cartId: cart.id, cartToken: token.raw, expiresAt: cart.expiresAt.toISOString() };
  }

  async getCart(storeSlug: string, cartId: string, cartToken: string | undefined) {
    const store = await this.store(storeSlug);
    const cart = await this.requireCart(store.id, cartId, cartToken);
    return this.cartResponse(cart);
  }

  async setItem(
    storeSlug: string,
    cartId: string,
    cartToken: string | undefined,
    input: CartItemInput,
  ) {
    const store = await this.store(storeSlug);
    await this.requireCart(store.id, cartId, cartToken);
    const variant = await this.prisma.client.productVariant.findFirst({
      where: {
        id: input.variantId,
        storeId: store.id,
        status: 'ACTIVE',
        product: { publicationStatus: 'PUBLISHED' },
      },
      include: { inventory: true, prices: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!variant?.prices[0]) throw new BadRequestException('CART_VARIANT_UNAVAILABLE');
    const available = variant.inventory.reduce(
      (total, item) => total + item.onHand - item.reserved,
      0,
    );
    if (available < input.quantity) throw new ConflictException('INSUFFICIENT_STOCK');
    await this.prisma.client.cartItem.upsert({
      where: {
        storeId_cartId_variantId: { storeId: store.id, cartId, variantId: input.variantId },
      },
      update: { quantity: input.quantity },
      create: { storeId: store.id, cartId, variantId: input.variantId, quantity: input.quantity },
    });
    return this.getCart(storeSlug, cartId, cartToken);
  }

  async removeItem(
    storeSlug: string,
    cartId: string,
    itemId: string,
    cartToken: string | undefined,
  ): Promise<void> {
    const store = await this.store(storeSlug);
    await this.requireCart(store.id, cartId, cartToken);
    const deleted = await this.prisma.client.cartItem.deleteMany({
      where: { id: itemId, cartId, storeId: store.id },
    });
    if (deleted.count !== 1) throw new NotFoundException('CART_ITEM_NOT_FOUND');
  }

  async quoteShipping(
    storeSlug: string,
    cartId: string,
    cartToken: string | undefined,
    input: ShippingQuoteInput,
  ) {
    const store = await this.store(storeSlug);
    const cart = await this.requireCart(store.id, cartId, cartToken);
    if (cart.items.length === 0) throw new BadRequestException('CART_EMPTY');
    const subtotalCents = cart.items.reduce(
      (total, item) =>
        total +
        (item.variant.prices[0] ? Number(item.variant.prices[0].amountCents) * item.quantity : 0),
      0,
    );
    const postalCode = input.destinationPostalCode.replace('-', '');
    const rules = await this.prisma.client.shippingRule.findMany({
      where: {
        storeId: store.id,
        enabled: true,
        AND: [
          {
            OR: [{ minSubtotalCents: null }, { minSubtotalCents: { lte: BigInt(subtotalCents) } }],
          },
          {
            OR: [{ maxSubtotalCents: null }, { maxSubtotalCents: { gte: BigInt(subtotalCents) } }],
          },
        ],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
    });
    const rule = rules.find((candidate) => {
      const prefixes = candidate.postalCodePrefixes as string[];
      return prefixes.length === 0 || prefixes.some((prefix) => postalCode.startsWith(prefix));
    });
    const quantity = cart.items.reduce((total, item) => total + item.quantity, 0);
    const standardAmount = 1_490 + Math.min(quantity * 100, 2_000);
    const amountCents = rule
      ? rule.type === 'FREE' ||
        (rule.freeAboveCents !== null && subtotalCents >= Number(rule.freeAboveCents))
        ? 0
        : Number(rule.amountCents)
      : standardAmount;
    const quote = await this.prisma.client.shippingQuote.create({
      data: {
        storeId: store.id,
        cartId,
        destinationPostalCode: postalCode,
        carrier: rule?.carrier ?? 'STANDARD',
        service: rule?.service ?? 'Entrega padrão',
        amountCents: BigInt(amountCents),
        currency: store.currency,
        expiresAt: new Date(Date.now() + QUOTE_DURATION_MS),
      },
    });
    return {
      id: quote.id,
      carrier: quote.carrier,
      service: quote.service,
      amountCents,
      currency: quote.currency,
      estimatedDaysMin: rule?.estimatedDaysMin ?? 3,
      estimatedDaysMax: rule?.estimatedDaysMax ?? 9,
      handlingDays: rule?.handlingDays ?? 0,
      expiresAt: quote.expiresAt.toISOString(),
    };
  }

  async checkout(
    storeSlug: string,
    cartId: string,
    cartToken: string | undefined,
    input: CheckoutInput,
    customerToken?: string,
  ): Promise<unknown> {
    const store = await this.store(storeSlug);
    const authenticatedCustomerId = await this.customerId(customerToken, store.id);
    const cart = await this.requireCart(store.id, cartId, cartToken, true);
    const customerId = authenticatedCustomerId ?? cart.customerId;
    const existing = await this.prisma.client.idempotencyRecord.findUnique({
      where: {
        storeId_scope_requestKey: {
          storeId: store.id,
          scope: 'checkout',
          requestKey: input.idempotencyKey,
        },
      },
    });
    if (existing) return existing.responseSnapshot;
    if (cart.status !== 'ACTIVE') throw new ConflictException('CART_NOT_ACTIVE');
    if (cart.items.length === 0) throw new BadRequestException('CART_EMPTY');
    const quote = await this.prisma.client.shippingQuote.findFirst({
      where: {
        id: input.shippingQuoteId,
        storeId: store.id,
        cartId,
        expiresAt: { gt: new Date() },
      },
    });
    if (!quote) throw new BadRequestException('SHIPPING_QUOTE_INVALID');
    const lines = cart.items.map((item) => {
      const price = item.variant.prices[0];
      if (!price) throw new BadRequestException('PRICE_UNAVAILABLE');
      const unitPriceCents = Number(price.amountCents);
      return {
        variantId: item.variantId,
        sku: item.variant.sku,
        title: item.variant.product.title,
        attributes: item.variant.variantAttributes === null ? {} : item.variant.variantAttributes,
        quantity: item.quantity,
        unitPriceCents,
        totalCents: multiplyMoney(unitPriceCents, item.quantity),
        inventory: item.variant.inventory,
      };
    });
    const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
    const shippingCents = Number(quote.amountCents);
    const now = new Date();
    const coupon = input.couponCode
      ? await this.prisma.client.coupon.findFirst({
          where: {
            storeId: store.id,
            code: input.couponCode,
            active: true,
            AND: [
              { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
              { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
          },
          include: { _count: { select: { redemptions: true } } },
        })
      : null;
    if (
      input.couponCode &&
      (!coupon || (coupon.maxUses !== null && coupon._count.redemptions >= coupon.maxUses))
    )
      throw new BadRequestException('COUPON_INVALID');
    const couponRules = coupon?.rulesJson as
      | {
          percentageBasisPoints?: number;
          minimumSubtotalCents?: number;
          maximumDiscountCents?: number | null;
        }
      | undefined;
    if (
      coupon &&
      (!Number.isInteger(couponRules?.percentageBasisPoints) ||
        subtotalCents < (couponRules?.minimumSubtotalCents ?? 0))
    )
      throw new BadRequestException('COUPON_NOT_APPLICABLE');
    const discountCents = coupon
      ? cappedDiscount(
          subtotalCents,
          couponRules!.percentageBasisPoints!,
          couponRules?.maximumDiscountCents ?? undefined,
        )
      : 0;
    const totalCents = subtotalCents - discountCents + shippingCents;
    const response = await this.prisma.client.$transaction(
      async (tx) => {
        const replay = await tx.idempotencyRecord.findUnique({
          where: {
            storeId_scope_requestKey: {
              storeId: store.id,
              scope: 'checkout',
              requestKey: input.idempotencyKey,
            },
          },
        });
        if (replay) return replay.responseSnapshot;
        const reservations: Array<{ variantId: string; locationId: string; quantity: number }> = [];
        for (const line of lines) {
          const location = line.inventory.find(
            (entry) => entry.onHand - entry.reserved >= line.quantity,
          );
          if (!location) throw new ConflictException('INSUFFICIENT_STOCK');
          const updated = await tx.$queryRaw<
            Array<{ id: string }>
          >`UPDATE "inventory" SET "reserved" = "reserved" + ${line.quantity}, "version" = "version" + 1, "updatedAt" = NOW() WHERE "id" = ${location.id}::uuid AND "storeId" = ${store.id}::uuid AND ("onHand" - "reserved") >= ${line.quantity} RETURNING "id"`;
          if (updated.length !== 1) throw new ConflictException('INSUFFICIENT_STOCK');
          reservations.push({
            variantId: line.variantId,
            locationId: location.locationId,
            quantity: line.quantity,
          });
        }
        const pricingLines = lines.map((line) => ({
          variantId: line.variantId,
          sku: line.sku,
          title: line.title,
          attributes: line.attributes,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          totalCents: line.totalCents,
        }));
        const checkoutSession = await tx.checkoutSession.create({
          data: {
            storeId: store.id,
            cartId,
            idempotencyKey: input.idempotencyKey,
            pricingSnapshot: {
              lines: pricingLines,
              subtotalCents,
              discountCents,
              shippingCents,
              totalCents,
              couponCode: coupon?.code ?? null,
            },
            expiresAt: new Date(Date.now() + RESERVATION_DURATION_MS),
          },
        });
        const orderAccess = createOpaqueToken();
        const order = await tx.order.create({
          data: {
            storeId: store.id,
            customerId: customerId ?? null,
            number: `${Date.now()}-${cartId.slice(0, 8)}`,
            accessKeyHash: orderAccess.hash,
            subtotalCents: BigInt(subtotalCents),
            discountCents: BigInt(discountCents),
            shippingCents: BigInt(shippingCents),
            totalCents: BigInt(totalCents),
            currency: store.currency,
            addressSnapshotJson: input.address,
            pricingSnapshotJson: {
              lines: pricingLines,
              subtotalCents,
              discountCents,
              shippingCents,
              totalCents,
              couponCode: coupon?.code ?? null,
            },
          },
        });
        await tx.orderItem.createMany({
          data: lines.map((line) => ({
            storeId: store.id,
            orderId: order.id,
            variantId: line.variantId,
            skuSnapshot: line.sku,
            titleSnapshot: line.title,
            attributesSnapshot: line.attributes,
            quantity: line.quantity,
            unitPriceCents: BigInt(line.unitPriceCents),
            totalCents: BigInt(line.totalCents),
          })),
        });
        await tx.orderStatusHistory.create({
          data: {
            storeId: store.id,
            orderId: order.id,
            toStatus: 'PENDING_PAYMENT',
            actorType: 'CUSTOMER',
          },
        });
        await tx.shipment.create({
          data: {
            storeId: store.id,
            orderId: order.id,
            carrier: quote.carrier,
            service: quote.service,
            shippingAmountCents: quote.amountCents,
          },
        });
        if (coupon)
          await tx.couponRedemption.create({
            data: {
              storeId: store.id,
              couponId: coupon.id,
              orderId: order.id,
              customerId: customerId ?? null,
            },
          });
        await tx.inventoryReservation.createMany({
          data: reservations.map((reservation) => ({
            ...reservation,
            storeId: store.id,
            orderId: order.id,
            expiresAt: new Date(Date.now() + RESERVATION_DURATION_MS),
          })),
        });
        await tx.cart.update({ where: { id: cartId }, data: { status: 'CONVERTED' } });
        await tx.checkoutSession.update({
          where: { id: checkoutSession.id },
          data: { status: 'COMPLETED', submittedAt: new Date() },
        });
        await tx.outboxEvent.create({
          data: {
            storeId: store.id,
            aggregateType: 'Order',
            aggregateId: order.id,
            eventType: 'order.created',
            payloadJson: { orderId: order.id, orderNumber: order.number, customerId, totalCents },
          },
        });
        const snapshot = {
          orderId: order.id,
          orderNumber: order.number,
          orderAccessToken: orderAccess.raw,
          status: order.status,
          subtotalCents,
          discountCents,
          shippingCents,
          totalCents,
          currency: order.currency,
        };
        await tx.idempotencyRecord.create({
          data: {
            storeId: store.id,
            scope: 'checkout',
            requestKey: input.idempotencyKey,
            requestHash: createHash('sha256').update(JSON.stringify(input)).digest('hex'),
            responseCode: 201,
            responseSnapshot: snapshot,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        return snapshot;
      },
      { isolationLevel: 'Serializable' },
    );
    return response;
  }

  private async store(slug: string) {
    const store = await this.prisma.client.store.findFirst({ where: { slug, status: 'ACTIVE' } });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    return store;
  }

  private async customerId(
    rawToken: string | undefined,
    storeId: string,
  ): Promise<string | undefined> {
    if (!rawToken) return undefined;
    const session = await this.auth.authenticate(rawToken);
    if (session.storeId !== storeId) throw new UnauthorizedException('CUSTOMER_STORE_MISMATCH');
    return session.customerId;
  }

  private async requireCart(
    storeId: string,
    cartId: string,
    cartToken: string | undefined,
    allowConverted = false,
  ) {
    const cart = await this.prisma.client.cart.findFirst({
      where: {
        id: cartId,
        storeId,
        status: allowConverted ? { in: ['ACTIVE', 'CONVERTED'] } : 'ACTIVE',
        expiresAt: { gt: new Date() },
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: true,
                prices: { orderBy: { createdAt: 'desc' }, take: 1 },
                inventory: true,
              },
            },
          },
        },
      },
    });
    if (!cart) throw new NotFoundException('CART_NOT_FOUND');
    if (
      !cartToken ||
      !cart.anonymousKeyHash ||
      hashOpaqueToken(cartToken) !== cart.anonymousKeyHash
    )
      throw new UnauthorizedException('CART_ACCESS_DENIED');
    return cart;
  }

  private cartResponse(cart: Awaited<ReturnType<CheckoutService['requireCart']>>) {
    return {
      id: cart.id,
      status: cart.status,
      currency: cart.currency,
      expiresAt: cart.expiresAt.toISOString(),
      items: cart.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        sku: item.variant.sku,
        title: item.variant.product.title,
        quantity: item.quantity,
        unitPriceCents: item.variant.prices[0] ? Number(item.variant.prices[0].amountCents) : null,
      })),
    };
  }
}
