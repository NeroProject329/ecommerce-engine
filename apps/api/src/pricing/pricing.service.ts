import { applyPercentageDiscount, cappedDiscount, multiplyMoney, selectPromotion } from '@ecommerce/commerce';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import type { ChangePriceInput, CreateCouponInput, CreatePromotionInput, PriceQuoteInput } from './schemas';

@Injectable()
export class PricingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createPromotion(storeId: string, input: CreatePromotionInput): Promise<unknown> {
    return this.prisma.client.$transaction(async (tx) => {
      const promotion = await tx.promotion.create({
        data: { storeId, name: input.name, percentageDecimal: (input.percentageBasisPoints / 100).toFixed(4), priority: input.priority, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null },
      });
      await tx.promotionTarget.createMany({ data: input.targets.map((target) => ({ storeId, promotionId: promotion.id, targetType: target.targetType, targetId: target.targetId ?? null })) });
      return { ...promotion, targets: await tx.promotionTarget.findMany({ where: { promotionId: promotion.id, storeId } }) };
    });
  }

  async activatePromotion(storeId: string, promotionId: string): Promise<unknown> {
    const promotion = await this.prisma.client.promotion.findFirst({ where: { id: promotionId, storeId } });
    if (!promotion) throw new NotFoundException('PROMOTION_NOT_FOUND');
    return this.prisma.client.promotion.update({ where: { id: promotion.id }, data: { status: 'ACTIVE' } });
  }

  async createCoupon(storeId: string, input: CreateCouponInput): Promise<unknown> {
    return this.prisma.client.coupon.create({
      data: {
        storeId,
        code: input.code,
        rulesJson: { percentageBasisPoints: input.percentageBasisPoints, minimumSubtotalCents: input.minimumSubtotalCents, maximumDiscountCents: input.maximumDiscountCents ?? null },
        maxUses: input.maxUses ?? null,
        startsAt: input.startsAt ?? null,
        endsAt: input.endsAt ?? null,
      },
    });
  }

  async changePrice(storeId: string, variantId: string, actorId: string, input: ChangePriceInput): Promise<unknown> {
    const variant = await this.prisma.client.productVariant.findFirst({ where: { id: variantId, storeId } });
    if (!variant) throw new NotFoundException('VARIANT_NOT_FOUND');
    const current = await this.prisma.client.price.findFirst({ where: { storeId, variantId, currency: input.currency }, orderBy: { createdAt: 'desc' } });
    return this.prisma.client.$transaction(async (tx) => {
      const price = await tx.price.create({ data: { storeId, variantId, currency: input.currency, amountCents: BigInt(input.amountCents), compareAtCents: input.compareAtCents == null ? null : BigInt(input.compareAtCents) } });
      await tx.priceHistory.create({ data: { storeId, variantId, previousCents: current?.amountCents ?? null, newCents: price.amountCents, currency: input.currency, changedBy: actorId, reason: input.reason ?? null } });
      return { ...price, amountCents: Number(price.amountCents), compareAtCents: price.compareAtCents === null ? null : Number(price.compareAtCents) };
    });
  }

  async quote(storeSlug: string, input: PriceQuoteInput) {
    const now = new Date();
    const store = await this.prisma.client.store.findFirst({ where: { slug: storeSlug, status: 'ACTIVE' } });
    if (!store) throw new NotFoundException('STORE_NOT_FOUND');
    const ids = [...new Set(input.items.map((item) => item.variantId))];
    const variants = await this.prisma.client.productVariant.findMany({
      where: { id: { in: ids }, storeId: store.id, status: 'ACTIVE' },
      include: { product: { include: { categories: true } }, prices: { where: { AND: [{ OR: [{ validFrom: null }, { validFrom: { lte: now } }] }, { OR: [{ validTo: null }, { validTo: { gt: now } }] }] }, orderBy: { createdAt: 'desc' } } },
    });
    if (variants.length !== ids.length) throw new BadRequestException('QUOTE_VARIANT_INVALID');
    const promotions = await this.prisma.client.promotion.findMany({
      where: { storeId: store.id, status: 'ACTIVE', AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] },
      include: { targets: true },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const lines = input.items.map((item) => {
      const variant = byId.get(item.variantId)!;
      const price = variant.prices[0];
      if (!price) throw new BadRequestException('QUOTE_PRICE_UNAVAILABLE');
      const categoryIds = new Set([variant.product.primaryCategoryId, ...variant.product.categories.map((entry) => entry.categoryId)]);
      const applicable = promotions.filter((promotion) => promotion.targets.some((target) =>
        target.targetType === 'STORE' ||
        (target.targetType === 'VARIANT' && target.targetId === variant.id) ||
        (target.targetType === 'PRODUCT' && target.targetId === variant.productId) ||
        (target.targetType === 'CATEGORY' && target.targetId && categoryIds.has(target.targetId)),
      )).map((promotion) => ({ id: promotion.id, priority: promotion.priority, percentageBasisPoints: Math.round(Number(promotion.percentageDecimal) * 100) }));
      const selected = selectPromotion(applicable);
      const unitBaseCents = Number(price.amountCents);
      const unitFinalCents = selected ? applyPercentageDiscount(unitBaseCents, selected.percentageBasisPoints) : unitBaseCents;
      return { variantId: variant.id, quantity: item.quantity, unitBaseCents, unitFinalCents, promotionId: selected?.id ?? null, totalCents: multiplyMoney(unitFinalCents, item.quantity) };
    });
    const subtotalCents = lines.reduce((total, line) => total + line.totalCents, 0);
    let couponDiscountCents = 0;
    let couponId: string | null = null;
    if (input.couponCode) {
      const coupon = await this.prisma.client.coupon.findFirst({ where: { storeId: store.id, code: input.couponCode, active: true, AND: [{ OR: [{ startsAt: null }, { startsAt: { lte: now } }] }, { OR: [{ endsAt: null }, { endsAt: { gt: now } }] }] }, include: { _count: { select: { redemptions: true } } } });
      if (!coupon || (coupon.maxUses !== null && coupon._count.redemptions >= coupon.maxUses)) throw new BadRequestException('COUPON_INVALID');
      const rules = coupon.rulesJson as { percentageBasisPoints?: number; minimumSubtotalCents?: number; maximumDiscountCents?: number | null };
      if (!Number.isInteger(rules.percentageBasisPoints) || subtotalCents < (rules.minimumSubtotalCents ?? 0)) throw new BadRequestException('COUPON_NOT_APPLICABLE');
      couponDiscountCents = cappedDiscount(subtotalCents, rules.percentageBasisPoints!, rules.maximumDiscountCents ?? undefined);
      couponId = coupon.id;
    }
    return { currency: store.currency, lines, subtotalCents, couponId, couponDiscountCents, totalCents: subtotalCents - couponDiscountCents };
  }
}
