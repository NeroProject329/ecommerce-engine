import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type RecoveryAudience = 'customer' | 'admin';

@Injectable()
export class EmailService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async sendRecovery(storeId: string, email: string, token: string, audience: RecoveryAudience): Promise<boolean> {
    const provider = (process.env.EMAIL_PROVIDER ?? 'console').toLowerCase();
    if (provider === 'console' || provider === 'disabled') return false;
    if (provider !== 'resend') throw new Error('EMAIL_PROVIDER_UNSUPPORTED');
    const apiKey = process.env.EMAIL_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) throw new Error('EMAIL_CONFIGURATION_INCOMPLETE');
    const code = audience === 'admin' ? 'auth.admin.recovery' : 'auth.customer.recovery';
    const template = await this.prisma.client.notificationTemplate.findUnique({ where: { storeId_code_channel: { storeId, code, channel: 'EMAIL' } } });
    if (template && !template.enabled) return false;
    const subject = template?.subject ?? (audience === 'admin' ? 'Recuperação do painel administrativo' : 'Recuperação de acesso à loja');
    const text = (template?.bodyMarkdown ?? 'Use este token de recuperação em até 30 minutos: {{token}}').replaceAll('{{token}}', token);
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [email],
        subject,
        text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`EMAIL_DELIVERY_FAILED_${response.status}`);
    return true;
  }
}
