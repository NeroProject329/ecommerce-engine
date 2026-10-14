import type { Product } from './commerce';

const asset = (name: string) => `/product-assets/iphone-18-pro-max/${name}`;

const phoneCategory = {
  id: 'reference-phone-category',
  slug: 'celulares-e-smartphones',
  name: 'Telefones e Celulares',
};

const appleBrand = { id: 'reference-apple', slug: 'apple', name: 'Apple' };

export const referenceProduct: Product = {
  id: 'reference-iphone-18-pro-max-glacial',
  slug: 'apple-iphone-18-pro-max-256gb-glacial',
  title: 'Apple iPhone 18 Pro Max 256GB Glacial',
  description:
    'iPhone 18 Pro Max. Tela ProMotion de 6,9 polegadas, câmera Fusion principal de 48MP com abertura variável, maior duração de bateria e chip A20 Pro. QUATRO CORES LINDAS. UM DESIGN RESISTENTE Feito para durar, com estrutura unibody em alumínio e parte de trás em vidro na mesma cor para um visual mais uniforme. TELA PRO IMERSIVA Tela Super Retina XDR de 6,9 polegadas. Mais brilho. Menos reflexos. E com ProMotion de até 120 Hz. COM A RESISTÊNCIA DO CERAMIC SHIELD. NA FRENTE E ATRÁS Feito para durar com Ceramic Shield na parte de trás e Ceramic Shield 2 na parte da frente, com 3x mais resistência a arranhões que o iPhone 16 Pro. O SISTEMA DE CÂMERA PRO DEFINITIVO Câmera Fusion principal de 48 MP com abertura variável para fotos e vídeos melhores em pouca luz e profundidade de campo impressionante. Controles Pro personalizados. E zoom de 8x com qualidade óptica. CÂMERA FRONTAL CENTER STAGE DE 18 MP Mais flexibilidade para tirar selfies. Mais pessoas na foto. Captura Dupla de vídeo frontal e traseira. E muito mais. Chip A20 Pro. Uma potência em IA Com câmara de vapor de nova geração e Duplo Neural Engine de 16 núcleos. GPU até 40% mais rápida que no iPhone 17 Pro Max. Feito para IA. UM GRANDE SALTO EM BATERIA Até 30 horas a mais de reprodução de vídeo que no iPhone 17 Pro Max. Até 29 horas de uso por recarga. Recarga com fio mais rápida, até 50% em cerca de 15 minutos com adaptador compatível. SIRI AI. SUA ASSISTENTE DE IA A Siri AI é uma assistente de IA mais pessoal e mais poderosa. Faça perguntas, troque ideias em qualquer lugar e muito mais. RECURSO ESSENCIAL DE SEGURANÇA Com a Detecção de Acidente, o iPhone é capaz de identificar um acidente grave de carro e ligar para a emergência se você não puder. CONEXÃO EM QUASE TODO LUGAR Tenha velocidades mais altas com conexões seguras a Wi-Fi 7, rede celular 5G e Bluetooth 6. ESIM. MAIS SEGURO, PRÁTICO E FÁCIL DE USAR O eSIM integrado garante conectividade sem o cartão SIM físico. É ideal para quem viaja para o exterior. PRIVACIDADE Use o Face ID para desbloquear seu aparelho, iniciar sessão e fazer pagamentos com segurança.',
  brand: appleBrand,
  primaryCategory: phoneCategory,
  categories: [
    { category: phoneCategory },
    {
      category: {
        id: 'reference-smartphones',
        slug: 'smartphones',
        name: 'Smartphones',
      },
    },
  ],
  attributes: [
    { code: 'memory', name: 'Memória total', value: '256GB' },
    { code: 'technology', name: 'Tecnologia', value: '5G' },
    { code: 'screen', name: 'Tamanho da Tela', value: 'Acima de 6"' },
    { code: 'reference', name: 'Código de Referência', value: 'Não informado' },
    { code: 'type', name: 'Tipo', value: 'Flip' },
    { code: 'video', name: 'Grava vídeo', value: 'Sim' },
    { code: 'card-slot', name: 'Slot para cartão', value: 'Não informado' },
    { code: 'included-card', name: 'Cartão incluso', value: 'Não informado' },
    { code: 'radio', name: 'Rádio FM', value: 'Não' },
    { code: 'mp3', name: 'MP3 player', value: 'Sim' },
    { code: 'bluetooth', name: 'Bluetooth', value: 'Sim' },
    { code: 'stereo', name: 'Bluetooth Estéreo (ouça suas músicas em um dispositivo Bluetooth)', value: 'Sim' },
    { code: 'wifi', name: 'Wi-Fi', value: 'Sim' },
    { code: 'camera', name: 'Câmera traseira', value: '48 MP' },
    { code: 'front-camera', name: 'Câmera frontal', value: '18 MP Center Stage' },
    { code: 'color', name: 'Cor', value: 'Glacial' },
  ],
  media: [
    { url: asset('imgi_133_1xg.jpg'), role: 'PRIMARY', sortOrder: 0 },
    { url: asset('imgi_134_2xg.jpg'), role: 'GALLERY', sortOrder: 1 },
    { url: asset('imgi_135_3xg.jpg'), role: 'GALLERY', sortOrder: 2 },
    { url: asset('imgi_136_4xg.jpg'), role: 'GALLERY', sortOrder: 3 },
  ],
  variants: [
    {
      id: 'reference-iphone-18-pro-max-glacial-256',
      sku: '1582965282',
      attributes: { Cor: 'Glacial', Armazenamento: '256GB' },
      price: { amountCents: 1169910, compareAtCents: 1299900, currency: 'BRL' },
      availableQuantity: 100,
      media: [],
    },
  ],
  isDemo: true,
  card: {
    reviewCount: 0,
    ratingAverage: 0,
    installmentCount: 6,
    installmentTotalCents: 1299900,
    installmentAmountCents: 216650,
    discountPercent: 10,
  },
};

type ReferenceCardSeed = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: number;
  compareAt?: number;
  installmentTotal?: number;
  installmentAmount?: number;
  installmentCount?: number;
  reviews?: number;
  rating?: number;
  brand?: string;
  flags?: string[];
  promo?: 'exclusive' | '10-off' | '15-off' | '20-off';
  sponsored?: boolean;
};

function makeReferenceCard(seed: ReferenceCardSeed): Product {
  const brandName = seed.brand ?? 'Apple';
  const compareAt = seed.compareAt ?? Math.round(seed.price / 0.9);
  return {
    id: seed.id,
    slug: seed.slug,
    title: seed.title,
    description: 'Produto demonstrativo do template individual de produto.',
    brand: {
      id: `reference-brand-${brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      slug: brandName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      name: brandName,
    },
    primaryCategory: phoneCategory,
    attributes: [
      { code: 'memory', name: 'Memória total', value: '128GB' },
      { code: 'technology', name: 'Tecnologia', value: '5G' },
      { code: 'reference', name: 'Código de Referência', value: 'Não informado' },
    ],
    media: [{ url: asset(seed.image), role: 'PRIMARY', sortOrder: 0 }],
    variants: [
      {
        id: `${seed.id}-variant`,
        sku: `REF-${seed.id.replace('reference-', '').toUpperCase()}`,
        price: { amountCents: seed.price, compareAtCents: compareAt, currency: 'BRL' },
        availableQuantity: 50,
        media: [],
      },
    ],
    isDemo: true,
    card: {
      reviewCount: seed.reviews ?? 0,
      ratingAverage: seed.rating ?? 0,
      installmentCount: seed.installmentCount ?? 12,
      installmentTotalCents: seed.installmentTotal ?? seed.price,
      ...(seed.installmentAmount ? { installmentAmountCents: seed.installmentAmount } : {}),
      discountPercent: Math.max(1, Math.round((1 - seed.price / compareAt) * 100)),
      ...(seed.flags ? { flags: seed.flags } : {}),
      ...(seed.promo ? { promo: seed.promo } : {}),
      ...(seed.sponsored ? { sponsored: true } : {}),
    },
  };
}

const usedCardDefaults = {
  flags: ['*CONFIRA A REGRA'],
  promo: 'exclusive' as const,
};

const sponsoredSeeds: ReferenceCardSeed[] = [
  { ...usedCardDefaults, id: 'reference-used-iphone-12-128-preto', slug: 'usado-iphone-12-128gb-preto-muito-bom', title: 'Usado: iPhone 12 128 GB Preto - Muito Bom', image: 'imgi_13_1xg.jpg', price: 205080, compareAt: 212635, installmentAmount: 19380 },
  { ...usedCardDefaults, id: 'reference-used-iphone-13-128-azul', slug: 'usado-iphone-13-128gb-azul-excelente', title: 'Usado: iPhone 13 128 GB Azul - Excelente', image: 'imgi_16_1xg.jpg', price: 289080, compareAt: 305785, installmentAmount: 27319 },
  { ...usedCardDefaults, id: 'reference-used-iphone-11-64-preto', slug: 'usado-iphone-11-64gb-preto-excelente', title: 'Usado: iPhone 11 64 GB Preto - Excelente', image: 'imgi_17_1xg.jpg', price: 148680, compareAt: 158585, installmentAmount: 14050 },
  { ...usedCardDefaults, id: 'reference-used-iphone-13-128-preto', slug: 'usado-iphone-13-128gb-preto-excelente', title: 'Usado: iPhone 13 128 GB Preto - Excelente', image: 'imgi_18_1xg.jpg', price: 289080, compareAt: 305785, installmentAmount: 27319 },
  { ...usedCardDefaults, id: 'reference-used-iphone-13-256-azul', slug: 'usado-iphone-13-256gb-azul-excelente', title: 'Usado: iPhone 13 256 GB Azul - Excelente', image: 'imgi_19_1xg.jpg', price: 323880, compareAt: 352935, installmentAmount: 30607 },
  { ...usedCardDefaults, id: 'reference-used-iphone-12-64-preto', slug: 'usado-iphone-12-64gb-preto-excelente', title: 'Usado: iPhone 12 64 GB Preto - Excelente', image: 'imgi_20_1xg.jpg', price: 191880, compareAt: 202000, installmentAmount: 18133 },
  { ...usedCardDefaults, id: 'reference-used-iphone-11-128-preto', slug: 'usado-iphone-11-128gb-preto-muito-bom', title: 'Usado: iPhone 11 128 GB Preto - Muito Bom', image: 'imgi_21_1xg.jpg', price: 182280, compareAt: 192000, installmentAmount: 17226 },
  { ...usedCardDefaults, id: 'reference-used-iphone-11-128-branco', slug: 'usado-iphone-11-128gb-branco-muito-bom', title: 'Usado: iPhone 11 128 GB Branco - Muito Bom', image: 'imgi_22_1xg.jpg', price: 182280, compareAt: 192000, installmentAmount: 17226 },
  { ...usedCardDefaults, id: 'reference-used-iphone-14-pro-128-preto', slug: 'usado-iphone-14-pro-128gb-preto-excelente', title: 'Usado: iPhone 14 Pro 128 GB Preto - Excelente', image: 'imgi_23_1xg.jpg', price: 461880, compareAt: 486200, installmentAmount: 43648 },
  { ...usedCardDefaults, id: 'reference-used-iphone-12-256-preto', slug: 'usado-iphone-12-256gb-preto-excelente', title: 'Usado: iPhone 12 256 GB Preto - Excelente', image: 'imgi_24_1xg.jpg', price: 287880, compareAt: 303000, installmentAmount: 27205 },
];

const combineSeeds: ReferenceCardSeed[] = [
  { id: 'reference-combine-iphone-18-pro', slug: 'iphone-18-pro-256gb-glacial', title: 'Apple iPhone 18 Pro 256GB Glacial', image: 'imgi_25_1xg.jpg', price: 1079910, compareAt: 2200000, installmentTotal: 1199900, installmentAmount: 199983, installmentCount: 6 },
  { id: 'reference-combine-app-store-card', slug: 'app-store-card-50', title: 'App Store Card de R$ 50', image: 'imgi_26_1xg.jpg', price: 5000, compareAt: 5150, installmentAmount: 1060, installmentCount: 5 },
  { id: 'reference-combine-iphone-18-pro-max-512', slug: 'iphone-18-pro-max-512gb-glacial', title: 'Apple iPhone 18 Pro Max 512GB Glacial', image: 'imgi_27_1xg.jpg', price: 1304910, compareAt: 1449900, installmentTotal: 1449900, installmentAmount: 241650, installmentCount: 6 },
  { id: 'reference-combine-lenovo-ideapad', slug: 'notebook-lenovo-ideapad-slim-3', title: 'Notebook Lenovo IdeaPad Slim 3 83MMS00100 AMD...', image: 'imgi_28_1xg.jpg', price: 399900, compareAt: 999900, installmentAmount: 66650, installmentCount: 6, reviews: 11, rating: 5, brand: 'Lenovo' },
  { id: 'reference-combine-super-help', slug: 'suporte-super-help-64gb', title: 'Suporte Super Help 64GB', image: 'imgi_29_1xg.jpg', price: 12990, compareAt: 12990, installmentAmount: 1228, brand: 'Super Help' },
];

const recommendedSeeds: ReferenceCardSeed[] = [
  { id: 'reference-recommended-lg-tv', slug: 'smart-tv-lg-qned-75', title: 'Smart TV 75” 4K LG 75QNED70BSA QNED Mini...', image: 'imgi_45_1xg.jpg', price: 489900, compareAt: 601155, installmentTotal: 544333, installmentAmount: 90722, installmentCount: 6, reviews: 8, rating: 5, brand: 'LG', flags: ['LANÇAMENTO★'] },
  { id: 'reference-recommended-brastemp', slug: 'geladeira-brastemp-brm46mk', title: 'Geladeira Brastemp BRM46MK Frost Free 385...', image: 'imgi_46_1g.jpg', price: 278900, compareAt: 348211, installmentTotal: 309889, installmentAmount: 51648, installmentCount: 6, reviews: 328, rating: 5, brand: 'Brastemp' },
  { id: 'reference-recommended-ipad', slug: 'apple-tablet-11-wifi-128gb-prata', title: 'Apple Tablet 11 Wifi 128Gb Prata', image: 'imgi_47_1xg.jpg', price: 339900, compareAt: 419900, installmentAmount: 56650, installmentCount: 6 },
  { id: 'reference-recommended-king-bed', slug: 'cama-box-king-alford', title: 'Conjunto Cama Box King Size Alford 193x203x66 Bege c/...', image: 'imgi_48_1xg.jpg', price: 199900, compareAt: 283990, installmentAmount: 33317, installmentCount: 6, reviews: 75, rating: 5, brand: 'Alford', promo: '15-off' },
  { id: 'reference-recommended-box-bed', slug: 'cama-box-bau-casal-colchao', title: 'Cama Box Com Baú Casal + Colchão De Molas - Comfor...', image: 'imgi_50_1xg.jpg', price: 103990, compareAt: 131390, installmentAmount: 17332, installmentCount: 6, reviews: 39, rating: 5, promo: '10-off' },
];

const similarSeeds: ReferenceCardSeed[] = [
  { id: 'reference-similar-iphone-18-max-preto', slug: 'iphone-18-pro-max-256gb-preto', title: 'Apple iPhone 18 Pro Max 256GB Preto', image: 'imgi_54_1xg.jpg', price: 1169910, compareAt: 1299900, installmentTotal: 1299900, installmentAmount: 216650, installmentCount: 6 },
  { id: 'reference-similar-iphone-18-max-bordo', slug: 'iphone-18-pro-max-256gb-bordo', title: 'Apple iPhone 18 Pro Max 256GB Bordô', image: 'imgi_55_1xg.jpg', price: 1169910, compareAt: 4199900, installmentTotal: 1299900, installmentAmount: 216650, installmentCount: 6 },
  { id: 'reference-similar-iphone-18-max-512-preto', slug: 'iphone-18-pro-max-512gb-preto', title: 'Apple iPhone 18 Pro Max 512GB Preto', image: 'imgi_52_1xg.jpg', price: 1304910, compareAt: 1449900, installmentTotal: 1449900, installmentAmount: 241650, installmentCount: 6 },
  { id: 'reference-similar-iphone-18-pro-bordo', slug: 'iphone-18-pro-256gb-bordo', title: 'Apple iPhone 18 Pro 256GB Bordô', image: 'imgi_53_1xg.jpg', price: 1079910, compareAt: 4199900, installmentTotal: 1199900, installmentAmount: 199983, installmentCount: 6, reviews: 1, rating: 5 },
  { id: 'reference-similar-iphone-18-pro-glacial', slug: 'iphone-18-pro-256gb-glacial-similar', title: 'Apple iPhone 18 Pro 256GB Glacial', image: 'imgi_56_1xg.jpg', price: 1079910, compareAt: 2200000, installmentTotal: 1199900, installmentAmount: 199983, installmentCount: 6 },
];

const makeCards = (seeds: ReferenceCardSeed[]) => seeds.map((seed) => makeReferenceCard(seed));

const sponsoredProducts = makeCards(sponsoredSeeds);
const combineProducts = makeCards(combineSeeds);
const recommendedProducts = makeCards(recommendedSeeds);
const similarProducts = makeCards(similarSeeds);

export const referenceRelatedProducts = [
  ...sponsoredProducts,
  ...combineProducts,
  ...recommendedProducts,
  ...similarProducts,
];

export const referenceProductShelves = {
  sponsored: sponsoredProducts,
  combine: combineProducts,
  recommended: recommendedProducts,
  similar: similarProducts,
};

export function findReferenceProduct(slug: string): Product | null {
  if ([referenceProduct.slug, 'iphone-18-pro-max-glacial'].includes(slug)) return referenceProduct;
  return referenceRelatedProducts.find((product) => product.slug === slug) ?? null;
}
