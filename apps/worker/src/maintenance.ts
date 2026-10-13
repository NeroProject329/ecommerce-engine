import type { createPrismaClient } from '@ecommerce/database';

type DatabaseClient = ReturnType<typeof createPrismaClient>;

export async function runMaintenance(prisma: DatabaseClient, now = new Date()): Promise<{ releasedReservations: number; queuedCampaigns: number }> {
  const expired = await prisma.inventoryReservation.findMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, orderBy: { expiresAt: 'asc' }, take: 500 });
  let releasedReservations = 0;
  for (const reservation of expired) {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.inventoryReservation.updateMany({ where: { id: reservation.id, status: 'ACTIVE' }, data: { status: 'EXPIRED', releasedAt: now } });
      if (claimed.count !== 1) return;
      await tx.inventory.updateMany({ where: { storeId: reservation.storeId, variantId: reservation.variantId, locationId: reservation.locationId, reserved: { gte: reservation.quantity } }, data: { reserved: { decrement: reservation.quantity }, version: { increment: 1 } } });
      releasedReservations += 1;
    });
  }
  await Promise.all([
    prisma.checkoutSession.updateMany({ where: { status: 'OPEN', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } }),
    prisma.cart.updateMany({ where: { status: 'ACTIVE', expiresAt: { lte: now } }, data: { status: 'EXPIRED' } }),
    prisma.promotion.updateMany({ where: { status: 'ACTIVE', endsAt: { lte: now } }, data: { status: 'ENDED' } }),
    prisma.idempotencyRecord.deleteMany({ where: { expiresAt: { lte: now } } }),
    prisma.customerSession.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } }),
    prisma.adminSession.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { revokedAt: { not: null } }] } }),
    prisma.adminRecoveryToken.deleteMany({ where: { OR: [{ expiresAt: { lte: now } }, { usedAt: { not: null } }] } }),
  ]);
  const scheduled = await prisma.marketingCampaign.findMany({ where: { status: 'SCHEDULED', scheduledAt: { lte: now } }, take: 100 });
  let queuedCampaigns = 0;
  for (const campaign of scheduled) await prisma.$transaction(async (tx) => { const claimed = await tx.marketingCampaign.updateMany({ where: { id: campaign.id, status: 'SCHEDULED' }, data: { status: 'QUEUED' } }); if (!claimed.count) return; await tx.outboxEvent.create({ data: { storeId: campaign.storeId, aggregateType: 'MarketingCampaign', aggregateId: campaign.id, eventType: 'marketing.campaign.requested', payloadJson: { campaignId: campaign.id } } }); queuedCampaigns += 1; });
  return { releasedReservations, queuedCampaigns };
}
