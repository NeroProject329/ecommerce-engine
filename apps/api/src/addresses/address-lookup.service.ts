import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

export type BrazilianAddress = { postalCode: string; street: string; complement: string; district: string; city: string; state: string; ibgeCode: string | null; provider: 'viacep' | 'brasilapi' };
type CachedAddress = { expiresAt: number; value: BrazilianAddress };

@Injectable()
export class AddressLookupService {
  private readonly cache = new Map<string, CachedAddress>();

  async lookup(input: string): Promise<BrazilianAddress> {
    const postalCode = input.replace(/\D/gu, '');
    if (!/^\d{8}$/u.test(postalCode)) throw new BadRequestException('POSTAL_CODE_INVALID');
    const cached = this.cache.get(postalCode);
    if (cached && cached.expiresAt > Date.now()) return cached.value;
    const address = await this.viaCep(postalCode).catch(() => this.brasilApi(postalCode));
    if (!address) throw new NotFoundException('POSTAL_CODE_NOT_FOUND');
    this.cache.set(postalCode, { expiresAt: Date.now() + 24 * 60 * 60 * 1000, value: address });
    if (this.cache.size > 10_000) for (const [key, value] of this.cache) if (value.expiresAt <= Date.now()) this.cache.delete(key);
    return address;
  }

  private async viaCep(postalCode: string): Promise<BrazilianAddress | null> {
    const response = await fetch(`https://viacep.com.br/ws/${postalCode}/json/`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(3_000) });
    if (!response.ok) throw new BadGatewayException('VIACEP_UNAVAILABLE');
    const body = await response.json() as { erro?: boolean; cep?: string; logradouro?: string; complemento?: string; bairro?: string; localidade?: string; uf?: string; ibge?: string };
    if (body.erro) return null;
    return { postalCode, street: body.logradouro ?? '', complement: body.complemento ?? '', district: body.bairro ?? '', city: body.localidade ?? '', state: body.uf ?? '', ibgeCode: body.ibge ?? null, provider: 'viacep' };
  }

  private async brasilApi(postalCode: string): Promise<BrazilianAddress | null> {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${postalCode}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4_000) });
    if (response.status === 404) return null;
    if (!response.ok) throw new BadGatewayException('POSTAL_CODE_PROVIDERS_UNAVAILABLE');
    const body = await response.json() as { cep?: string; street?: string; neighborhood?: string; city?: string; state?: string };
    return { postalCode, street: body.street ?? '', complement: '', district: body.neighborhood ?? '', city: body.city ?? '', state: body.state ?? '', ibgeCode: null, provider: 'brasilapi' };
  }
}
