import { BadRequestException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AddressLookupService } from '../src/addresses/address-lookup.service';

describe('AddressLookupService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('uses ViaCEP as the primary provider', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ cep: '01001-000', logradouro: 'Praça da Sé', complemento: 'lado ímpar', bairro: 'Sé', localidade: 'São Paulo', uf: 'SP', ibge: '3550308' }), { status: 200 })));
    const result = await new AddressLookupService().lookup('01001-000');
    expect(result).toMatchObject({ postalCode: '01001000', city: 'São Paulo', state: 'SP', provider: 'viacep' });
  });

  it('falls back to BrasilAPI when ViaCEP fails', async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error('timeout')).mockResolvedValueOnce(new Response(JSON.stringify({ cep: '01310930', street: 'Avenida Paulista', neighborhood: 'Bela Vista', city: 'São Paulo', state: 'SP' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await new AddressLookupService().lookup('01310930');
    expect(result).toMatchObject({ street: 'Avenida Paulista', provider: 'brasilapi' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('rejects malformed Brazilian postal codes', async () => {
    await expect(new AddressLookupService().lookup('123')).rejects.toBeInstanceOf(BadRequestException);
  });
});
