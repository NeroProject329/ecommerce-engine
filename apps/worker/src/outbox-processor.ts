import { createHmac } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { openSecret } from '@ecommerce/auth';
import type { createPrismaClient } from '@ecommerce/database';

type Database = ReturnType<typeof createPrismaClient>;
type JsonObject = Record<string, unknown>;
const MAX_ATTEMPTS = 5;

function object(value: unknown): JsonObject { return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : {}; }
function render(template: string, values: JsonObject): string { return template.replace(/\{\{([a-zA-Z0-9_.]+)\}\}/gu, (_, path: string) => { let value: unknown = values; for (const part of path.split('.')) value = object(value)[part]; return value === undefined || value === null ? '' : String(value); }); }
function privateAddress(address: string): boolean { if (address === '::1' || address.startsWith('fc') || address.startsWith('fd') || address.startsWith('fe80:')) return true; if (isIP(address) !== 4) return false; const [a = 0, b = 0] = address.split('.').map(Number); return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168); }
async function assertWebhookUrl(raw: string): Promise<void> { const url = new URL(raw); if (url.protocol !== 'https:' && !(process.env.NODE_ENV !== 'production' && url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) throw new Error('WEBHOOK_URL_INSECURE'); if (url.username || url.password) throw new Error('WEBHOOK_URL_INVALID'); if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return; const addresses = await lookup(url.hostname, { all: true }); if (!addresses.length || addresses.some((entry) => privateAddress(entry.address))) throw new Error('WEBHOOK_URL_PRIVATE'); }

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const provider = (process.env.EMAIL_PROVIDER ?? 'disabled').toLowerCase();
  if (provider === 'disabled' || provider === 'console') return;
  if (provider !== 'resend' || !process.env.EMAIL_API_KEY || !process.env.EMAIL_FROM) throw new Error('EMAIL_CONFIGURATION_INCOMPLETE');
  const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${process.env.EMAIL_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: process.env.EMAIL_FROM, to: [to], subject, text }), signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`EMAIL_DELIVERY_FAILED_${response.status}`);
}

async function notificationContext(database: Database, storeId: string, eventType: string, payload: JsonObject): Promise<{ to: string; templateCode: string; values: JsonObject } | null> {
  const templateCode = ({ 'customer.registered': 'customer.welcome', 'order.created': 'order.created', 'payment.captured': 'payment.approved', 'order.shipped': 'order.shipped', 'order.cancellation_requested': 'order.canceled', 'payment.refunded': 'payment.refunded' } as Record<string, string>)[eventType];
  if (!templateCode) return null;
  const customerId = typeof payload.customerId === 'string' ? payload.customerId : undefined;
  const orderId = typeof payload.orderId === 'string' ? payload.orderId : undefined;
  const customer = customerId ? await database.customer.findFirst({ where: { id: customerId, storeId } }) : orderId ? (await database.order.findFirst({ where: { id: orderId, storeId }, include: { customer: true } }))?.customer : null;
  if (!customer) return null;
  return { to: customer.emailNormalized, templateCode, values: { ...payload, customer: { id: customer.id, name: customer.name, email: customer.emailNormalized } } };
}

async function dispatchTransactionalEmail(database: Database, storeId: string, eventType: string, payload: JsonObject): Promise<void> {
  const context = await notificationContext(database, storeId, eventType, payload); if (!context) return;
  const template = await database.notificationTemplate.findUnique({ where: { storeId_code_channel: { storeId, code: context.templateCode, channel: 'EMAIL' } } });
  if (template && !template.enabled) return;
  const defaults: Record<string, { subject: string; body: string }> = {
    'customer.welcome': { subject: 'Cadastro realizado', body: 'Olá {{customer.name}}, seu cadastro foi realizado com sucesso.' },
    'order.created': { subject: 'Pedido {{orderNumber}} recebido', body: 'Olá {{customer.name}}, recebemos seu pedido {{orderNumber}}.' },
    'payment.approved': { subject: 'Pagamento aprovado', body: 'Olá {{customer.name}}, o pagamento do seu pedido foi aprovado.' },
    'order.shipped': { subject: 'Seu pedido foi enviado', body: 'Olá {{customer.name}}, seu pedido foi enviado. Código de rastreio: {{trackingCode}}.' },
    'order.canceled': { subject: 'Atualização do cancelamento', body: 'Olá {{customer.name}}, recebemos a solicitação de cancelamento do seu pedido.' },
    'payment.refunded': { subject: 'Estorno processado', body: 'Olá {{customer.name}}, o estorno do seu pedido foi processado.' },
  };
  const selected = template ? { subject: template.subject, body: template.bodyMarkdown } : defaults[context.templateCode]; if (!selected) return;
  await sendEmail(context.to, render(selected.subject, context.values), render(selected.body, context.values));
}

async function dispatchCampaign(database: Database, storeId: string, campaignId: string): Promise<void> {
  const campaign = await database.marketingCampaign.findFirst({ where: { id: campaignId, storeId } }); if (!campaign) throw new Error('CAMPAIGN_NOT_FOUND');
  const consents = await database.consentRecord.findMany({ where: { storeId, purpose: 'marketing', channel: 'email' }, orderBy: { recordedAt: 'desc' }, include: { customer: true } });
  const latest = new Map<string, typeof consents[number]>(); for (const consent of consents) if (!latest.has(consent.customerId)) latest.set(consent.customerId, consent);
  for (const consent of latest.values()) if (consent.granted && consent.customer.status === 'ACTIVE') await sendEmail(consent.customer.emailNormalized, campaign.subject, render(campaign.bodyMarkdown, { customer: { name: consent.customer.name, email: consent.customer.emailNormalized } }));
  await database.marketingCampaign.update({ where: { id: campaign.id }, data: { status: 'SENT', sentAt: new Date() } });
}

async function dispatchWebhooks(database: Database, event: { id: string; storeId: string; eventType: string; eventVersion: number; aggregateType: string; aggregateId: string; payloadJson: unknown; createdAt: Date }): Promise<void> {
  const endpoints = await database.webhookEndpoint.findMany({ where: { storeId: event.storeId, enabled: true } });
  const body = JSON.stringify({ id: event.id, type: event.eventType, version: event.eventVersion, aggregate: { type: event.aggregateType, id: event.aggregateId }, data: event.payloadJson, occurredAt: event.createdAt.toISOString() });
  for (const endpoint of endpoints) {
    const types = Array.isArray(endpoint.eventTypes) ? endpoint.eventTypes : []; if (!types.includes('*') && !types.includes(event.eventType)) continue;
    const delivery = await database.webhookDelivery.upsert({ where: { endpointId_outboxEventId: { endpointId: endpoint.id, outboxEventId: event.id } }, update: {}, create: { storeId: event.storeId, endpointId: endpoint.id, outboxEventId: event.id } });
    if (delivery.status === 'DELIVERED') continue;
    const secret = openSecret(endpoint.secretEncrypted, process.env.AUTH_ENCRYPTION_KEY_BASE64 ?? '');
    try { await assertWebhookUrl(endpoint.url); const response = await fetch(endpoint.url, { method: 'POST', redirect: 'error', headers: { 'content-type': 'application/json', 'x-ecommerce-event-id': event.id, 'x-ecommerce-signature': createHmac('sha256', secret).update(body).digest('hex') }, body, signal: AbortSignal.timeout(10_000) }); if (!response.ok) throw new Error(`WEBHOOK_HTTP_${response.status}`); await database.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'DELIVERED', attempts: { increment: 1 }, responseStatus: response.status, deliveredAt: new Date(), lastError: null } }); } catch (error) { await database.webhookDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', attempts: { increment: 1 }, nextAttemptAt: new Date(Date.now() + 60_000), lastError: error instanceof Error ? error.message.slice(0, 1000) : 'UNKNOWN' } }); throw error; }
  }
}

export async function processOutbox(database: Database): Promise<number> {
  const candidates = await database.outboxEvent.findMany({ where: { status: 'PENDING', availableAt: { lte: new Date() } }, orderBy: [{ availableAt: 'asc' }, { id: 'asc' }], take: 25 }); let processed = 0;
  for (const candidate of candidates) {
    const claimed = await database.outboxEvent.updateMany({ where: { id: candidate.id, status: 'PENDING' }, data: { status: 'PROCESSING', lockedAt: new Date(), attempts: { increment: 1 } } }); if (!claimed.count) continue;
    try { const payload = object(candidate.payloadJson); if (candidate.storeId) { if (candidate.eventType === 'marketing.campaign.requested' && typeof payload.campaignId === 'string') await dispatchCampaign(database, candidate.storeId, payload.campaignId); else await dispatchTransactionalEmail(database, candidate.storeId, candidate.eventType, payload); await dispatchWebhooks(database, { ...candidate, storeId: candidate.storeId }); } await database.outboxEvent.update({ where: { id: candidate.id }, data: { status: 'PUBLISHED', publishedAt: new Date(), lockedAt: null, lastError: null } }); processed += 1; } catch (error) { const attempts = candidate.attempts + 1; const dead = attempts >= MAX_ATTEMPTS; await database.outboxEvent.update({ where: { id: candidate.id }, data: { status: dead ? 'FAILED' : 'PENDING', availableAt: new Date(Date.now() + Math.min(60_000 * 2 ** attempts, 3_600_000)), lockedAt: null, lastError: error instanceof Error ? error.message.slice(0, 1000) : 'UNKNOWN', deadLetteredAt: dead ? new Date() : null } }); }
  }
  return processed;
}
