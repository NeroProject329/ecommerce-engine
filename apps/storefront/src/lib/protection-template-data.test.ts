import { describe, expect, it } from 'vitest';
import type { Product } from './commerce';
import { buildProtectionTemplate, findProtectionOption } from './protection-template-data';

function makeProduct(category: string, price = 1_199_900): Product {
  return {
    id: category,
    slug: category,
    title: category,
    description: '',
    brand: null,
    primaryCategory: { id: category, slug: category, name: category },
    media: [],
    variants: [
      {
        id: `${category}-variant`,
        sku: null,
        price: { amountCents: price, compareAtCents: null, currency: 'BRL' },
        availableQuantity: 1,
        media: [],
      },
    ],
  };
}

describe('protection template', () => {
  it('uses the technology offering for smartphones and preserves reference prices', () => {
    const template = buildProtectionTemplate(makeProduct('celulares-e-smartphones'));
    const warranty = findProtectionOption(template, 'warranty', 'warranty-36');
    const insurance = findProtectionOption(template, 'insurance', 'accidental-24', 'accidental');

    expect(template.niche).toBe('technology');
    expect(template.plans.map(({ title }) => title)).toEqual([
      'Garantia Estendida',
      'Fique Seguro',
      'Suporte Remoto',
    ]);
    expect(warranty?.totalCents).toBe(277_537);
    expect(insurance?.totalCents).toBe(528_316);
  });

  it('changes the support offer according to the product niche', () => {
    const appliance = buildProtectionTemplate(makeProduct('eletrodomesticos'));
    const furniture = buildProtectionTemplate(makeProduct('moveis'));

    expect(appliance.niche).toBe('appliances');
    expect(appliance.plans[2]?.title).toBe('Assistência Técnica');
    expect(furniture.niche).toBe('furniture');
    expect(furniture.plans[2]?.title).toBe('Montagem e Suporte');
  });

  it('scales optional services using integer cents', () => {
    const template = buildProtectionTemplate(makeProduct('telefonia', 599_950));
    const warranty = findProtectionOption(template, 'warranty', 'warranty-36');
    expect(warranty?.totalCents).toBe(138_769);
    expect(Number.isInteger(warranty?.totalCents)).toBe(true);
  });
});
