import type { Product } from './commerce';

export type ProtectionOption = {
  id: string;
  label: string;
  totalCents: number;
  installmentCount?: number;
  summaryLabel?: string;
  promotion?: string;
};

export type ProtectionCoverage = {
  id: string;
  label: string;
  options: ProtectionOption[];
  benefits: string[];
};

export type ProtectionPlan = {
  id: 'warranty' | 'insurance' | 'support';
  title: string;
  description: string;
  icon: string;
  defaultOptionId: string | null;
  options?: ProtectionOption[];
  coverages?: ProtectionCoverage[];
  benefits?: string[];
  termsLabel: string;
};

export type ProtectionTemplate = {
  niche: 'technology' | 'appliances' | 'furniture' | 'general';
  plans: ProtectionPlan[];
};

const referenceProductPriceCents = 1_199_900;

export function getProtectionProductPriceCents(product: Product) {
  if (product.id === 'reference-iphone-18-pro-max-glacial') return referenceProductPriceCents;
  return product.variants[0]?.price.amountCents ?? 0;
}

function proportionalPrice(productPriceCents: number, referencePriceCents: number) {
  return Math.max(0, Math.round((productPriceCents * referencePriceCents) / referenceProductPriceCents));
}

function option(
  productPriceCents: number,
  id: string,
  label: string,
  referencePriceCents: number,
  summaryLabel?: string,
  promotion?: string,
): ProtectionOption {
  return {
    id,
    label,
    totalCents: proportionalPrice(productPriceCents, referencePriceCents),
    ...(referencePriceCents > 0 ? { installmentCount: 10 } : {}),
    ...(summaryLabel ? { summaryLabel } : {}),
    ...(promotion ? { promotion } : {}),
  };
}

function getNiche(product: Product): ProtectionTemplate['niche'] {
  const category = `${product.primaryCategory.slug} ${product.primaryCategory.name} ${product.title}`.toLowerCase();
  if (/celular|smartphone|telefone|iphone|tablet|inform[aá]tica|notebook|tv|televis/.test(category)) return 'technology';
  if (/eletro|geladeira|lavadora|fog[aã]o|forno|micro-ondas|microondas|ar-condicionado/.test(category)) return 'appliances';
  if (/m[oó]ve|sof[aá]|cama|colch[aã]o|guarda-roupa|mesa|cadeira/.test(category)) return 'furniture';
  return 'general';
}

export function buildProtectionTemplate(product: Product): ProtectionTemplate {
  const productPriceCents = getProtectionProductPriceCents(product);
  const niche = getNiche(product);
  const technology = niche === 'technology';
  const appliances = niche === 'appliances';
  const furniture = niche === 'furniture';

  const warranty: ProtectionPlan = {
    id: 'warranty',
    title: 'Garantia Estendida',
    description: 'Garanta a proteção do seu produto por mais tempo que a garantia do fabricante.',
    icon: '/insurance-assets/extended-warranty.svg',
    defaultOptionId: 'warranty-36',
    termsLabel: 'Garantia Estendida',
    benefits: [
      'O valor do seguro na maior parte das vezes é menor que o custo de um simples reparo.',
      'O Seguro contempla as mesmas coberturas e exclusões da garantia contratual do fornecedor.',
      'Tranquilidade e conforto com atendimento em domicílio para produtos de grande porte.',
      'Troca para eletroeletrônicos e eletroportáteis com valor de até R$300,00.',
      'Quantas vezes necessário para o bom funcionamento do produto, sem nenhum custo adicional.',
      'Peças genuínas e mão de obra especializada para consertos cobertos.',
    ],
    options: [
      option(productPriceCents, 'warranty-none', 'Sem garantia estendida', 0),
      option(productPriceCents, 'warranty-12', '+ 12 meses', 197_260, 'Seguro de Garantia Estendida Original de 12 meses'),
      option(productPriceCents, 'warranty-24', '+ 24 meses', 277_537, 'Seguro de Garantia Estendida Original de 24 meses'),
      option(
        productPriceCents,
        'warranty-36',
        '+ 36 meses',
        277_537,
        'Seguro de Garantia Estendida Original de 36 meses',
        'PROMOÇÃO! Pelo preço de 24 meses',
      ),
    ],
  };

  const insuranceDescription = technology
    ? 'Proteja seu produto contra Roubo, Furto Qualificado e Quebra Acidental.'
    : appliances
      ? 'Proteja seu produto contra danos elétricos e quebra acidental.'
      : furniture
        ? 'Proteja seu produto contra danos acidentais durante o uso.'
        : 'Proteja seu produto contra imprevistos e quebra acidental.';

  const insurance: ProtectionPlan = {
    id: 'insurance',
    title: 'Fique Seguro',
    description: insuranceDescription,
    icon: '/insurance-assets/insurance.svg',
    defaultOptionId: null,
    termsLabel: 'Fique Seguro',
    coverages: [
      {
        id: 'complete',
        label: 'Completa',
        options: [
          option(productPriceCents, 'complete-none', 'Sem seguro', 0),
          option(productPriceCents, 'complete-12', '12 meses', 385_170, '1 ano de Seguro, Roubo, Furto Qualificado e Quebra Acidental'),
          option(productPriceCents, 'complete-24', '24 meses', 619_148, '2 anos de Seguro, Roubo, Furto Qualificado e Quebra Acidental'),
        ],
        benefits: technology
          ? [
              'Consertos utilizando peças genuínas e mão de obra especializada.',
              'O custo é bem mais vantajoso do que comprar um produto novo.',
              'Cobertura nacional e internacional.',
              'Concorra a R$ 7.000,00 por 12 meses.',
            ]
          : [
              'Atendimento especializado para o seu produto.',
              'Cobertura contra imprevistos previstos no plano.',
              'Reparo com peças compatíveis e mão de obra qualificada.',
              'Cobertura válida em todo o território nacional.',
            ],
      },
      {
        id: 'theft',
        label: 'Roubo',
        options: [
          option(productPriceCents, 'theft-none', 'Sem seguro', 0),
          option(productPriceCents, 'theft-12', '12 meses', 344_030, '1 ano de Seguro contra Roubo e Furto Qualificado'),
          option(productPriceCents, 'theft-24', '24 meses', 562_753, '2 anos de Seguro contra Roubo e Furto Qualificado'),
        ],
        benefits: [
          'Cobertura contra roubo e furto qualificado.',
          'Atendimento especializado durante toda a vigência.',
          'Use seu produto onde e quando quiser com mais tranquilidade.',
          'Concorra a R$ 7.000,00 por 12 meses.',
        ],
      },
      {
        id: 'accidental',
        label: 'Quebra',
        options: [
          option(productPriceCents, 'accidental-none', 'Sem seguro', 0),
          option(productPriceCents, 'accidental-12', '12 meses', 295_180, '1 ano de Seguro contra Quebra Acidental'),
          option(productPriceCents, 'accidental-24', '24 meses', 528_316, '2 anos de Seguro contra Quebra Acidental'),
        ],
        benefits: [
          'Mais barato do que comprar um novo aparelho ou consertar o seu usado.',
          'Use seu produto onde e quando quiser sem preocupação.',
          'Não tem carência. Comprou, já pode utilizar o seu seguro.',
          'Cobertura contra oxidação ou imersão em líquido. E mais: você concorre a R$ 7.000,00 por 12 meses.',
        ],
      },
    ],
  };

  const supportTitle = technology ? 'Suporte Remoto' : appliances ? 'Assistência Técnica' : furniture ? 'Montagem e Suporte' : 'Suporte Especializado';
  const supportPaidLabel = technology ? '64 GB' : appliances ? '12 meses' : furniture ? 'Montagem' : '12 meses';
  const supportDescription = technology
    ? 'Contrate assistência 24h, 7 dias por semana, proteção digital e armazenamento em nuvem.'
    : appliances
      ? 'Conte com orientação especializada e assistência para o seu produto.'
      : furniture
        ? 'Conte com montagem e assistência especializada para o seu produto.'
        : 'Conte com assistência especializada sempre que precisar.';

  const support: ProtectionPlan = {
    id: 'support',
    title: supportTitle,
    description: supportDescription,
    icon: '/insurance-assets/remote-support.svg',
    defaultOptionId: null,
    termsLabel: supportTitle,
    benefits: technology
      ? [
          'Suporte remoto ilimitado com Central Técnica 24 horas.',
          'Espaço para armazenamento em nuvem com segurança.',
          'Licença antivírus multidispositivo.',
          'Ferramentas para uma proteção digital garantida.',
        ]
      : [
          'Atendimento realizado por profissionais especializados.',
          'Orientação durante toda a vigência do serviço.',
          'Agendamento simples e acompanhamento do atendimento.',
          'Consulte a cobertura disponível para a sua região.',
        ],
    options: [
      option(productPriceCents, 'support-none', `Sem ${supportTitle.toLowerCase()}`, 0),
      option(productPriceCents, 'support-paid', supportPaidLabel, 12_990, `${supportTitle} - ${supportPaidLabel}`),
    ],
  };

  return { niche, plans: [warranty, insurance, support] };
}

export function findProtectionOption(
  template: ProtectionTemplate,
  planId: ProtectionPlan['id'],
  optionId: string | null,
  coverageId?: string,
) {
  if (!optionId) return undefined;
  const plan = template.plans.find((item) => item.id === planId);
  if (!plan) return undefined;
  if (plan.options) return plan.options.find((item) => item.id === optionId);
  const coverage = plan.coverages?.find((item) => item.id === coverageId) ?? plan.coverages?.[0];
  return coverage?.options.find((item) => item.id === optionId);
}
