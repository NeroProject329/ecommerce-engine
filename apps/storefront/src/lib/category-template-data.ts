import type { Product } from './commerce';

export type CategoryImageBanner = {
  kind: 'image';
  src: string;
  alt: string;
  href: string;
};

export type CategoryProductBanner = {
  kind: 'product';
  id: string;
  image: string;
  alt: string;
  title: string;
  compareAt: number;
  price: number;
  installmentTotal: number;
  discount: number;
  href: string;
  flag?: string;
};

export type CategoryBanner = CategoryImageBanner | CategoryProductBanner;

export type CategoryFaq = {
  question: string;
  answer: string;
};

export type CategoryTemplateConfig = {
  slug: string;
  title: string;
  breadcrumb: string;
  banners: CategoryBanner[];
  subcategories: string[];
  brands: string[];
  description: string;
  faqs: CategoryFaq[];
  sponsored: Product[];
  recommended: Product[];
  flash: Product[];
};

type ProductSeed = {
  slug: string;
  title: string;
  image: string;
  brand: string;
  price: number;
  compareAt: number;
  reviews: number;
  rating?: number;
  installments?: number;
  installmentTotal?: number;
  discount?: number;
  promo?: Product['card'] extends infer Card
    ? Card extends { promo?: infer Promo }
      ? Promo
      : never
    : never;
  flags?: string[];
  sponsored?: boolean;
  cbFull?: boolean;
  fastPickup?: boolean;
};

const assetPath = (name: string) => `/category-assets/telefonia/${name}`;

function createProduct(seed: ProductSeed, index: number, categorySlug = 'telefonia'): Product {
  const brandSlug = seed.brand
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return {
    id: `category-${categorySlug}-${seed.slug}`,
    slug: seed.slug,
    title: seed.title,
    description: 'Produto demonstrativo do template de categoria.',
    brand: { id: `category-brand-${brandSlug}`, slug: brandSlug, name: seed.brand },
    primaryCategory: {
      id: `category-${categorySlug}`,
      slug: categorySlug,
      name: 'Telefones e Celulares',
    },
    media: [{ url: assetPath(seed.image), role: 'PRIMARY', sortOrder: 0 }],
    variants: [
      {
        id: `category-variant-${categorySlug}-${index + 1}`,
        sku: `CAT-${String(index + 1).padStart(3, '0')}`,
        price: { amountCents: seed.price, compareAtCents: seed.compareAt, currency: 'BRL' },
        availableQuantity: 100,
        media: [],
      },
    ],
    isDemo: true,
    card: {
      reviewCount: seed.reviews,
      ratingAverage: seed.rating ?? 0,
      installmentCount: seed.installments ?? 12,
      installmentTotalCents: seed.installmentTotal ?? Math.round(seed.price / 0.9),
      discountPercent:
        seed.discount ?? Math.max(1, Math.round((1 - seed.price / seed.compareAt) * 100)),
      ...(seed.promo ? { promo: seed.promo } : {}),
      ...(seed.flags ? { flags: seed.flags } : {}),
      ...(seed.sponsored ? { sponsored: true } : {}),
      ...(typeof seed.cbFull === 'boolean' ? { cbFull: seed.cbFull } : {}),
      ...(typeof seed.fastPickup === 'boolean' ? { fastPickup: seed.fastPickup } : {}),
    },
  };
}

const sponsoredSeeds: ProductSeed[] = [
  {
    slug: 'usado-iphone-12-256gb-preto',
    title: 'Usado: iPhone 12 256 GB Preto - Excelente',
    image: 'imgi_7_1xg.jpg',
    brand: 'Apple',
    price: 287880,
    compareAt: 347800,
    reviews: 0,
    discount: 17,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-iphone-11-64gb-preto',
    title: 'Usado: iPhone 11 64 GB Preto - Muito Bom',
    image: 'imgi_10_1xg.jpg',
    brand: 'Apple',
    price: 141480,
    compareAt: 169900,
    reviews: 0,
    discount: 17,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-iphone-11-128gb-branco',
    title: 'Usado: iPhone 11 128 GB Branco - Muito Bom',
    image: 'imgi_11_1xg.jpg',
    brand: 'Apple',
    price: 182280,
    compareAt: 218900,
    reviews: 0,
    discount: 17,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-motorola-edge-40-256gb',
    title: 'Usado: Motorola Edge 40 256 GB Preto - Excelente',
    image: 'imgi_12_1xg.jpg',
    brand: 'Motorola',
    price: 167880,
    compareAt: 201900,
    reviews: 0,
    discount: 17,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-iphone-12-128gb-preto',
    title: 'Usado: iPhone 12 128 GB Preto - Excelente',
    image: 'imgi_13_1xg.jpg',
    brand: 'Apple',
    price: 246990,
    compareAt: 289900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-samsung-galaxy-a53-128gb',
    title: 'Usado: Samsung Galaxy A53 128 GB Branco - Muito Bom',
    image: 'imgi_14_1xg.jpg',
    brand: 'Samsung',
    price: 118990,
    compareAt: 139900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-motorola-edge-30-256gb',
    title: 'Usado: Motorola Edge 30 256 GB Preto - Excelente',
    image: 'imgi_15_1xg.jpg',
    brand: 'Motorola',
    price: 152990,
    compareAt: 179900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-iphone-12-64gb-preto',
    title: 'Usado: iPhone 12 64 GB Preto - Muito Bom',
    image: 'imgi_16_1xg.jpg',
    brand: 'Apple',
    price: 219990,
    compareAt: 259900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-iphone-13-128gb-azul',
    title: 'Usado: iPhone 13 128 GB Azul - Excelente',
    image: 'imgi_17_1xg.jpg',
    brand: 'Apple',
    price: 296990,
    compareAt: 349900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'usado-samsung-galaxy-s22-ultra-256gb',
    title: 'Usado: Samsung Galaxy S22 Ultra 256 GB Preto - Excelente',
    image: 'imgi_18_1xg.jpg',
    brand: 'Samsung',
    price: 329990,
    compareAt: 389900,
    reviews: 0,
    discount: 15,
    sponsored: true,
    promo: 'exclusive',
    flags: ['RETIRA RÁPIDO'],
  },
];

const recommendedSeeds: ProductSeed[] = [
  {
    slug: 'iphone-18-pro-max-glacial',
    title: 'Apple iPhone 18 Pro Max 256GB Glacial',
    image: 'imgi_19_1xg.jpg',
    brand: 'Apple',
    price: 1169910,
    compareAt: 1299900,
    reviews: 0,
    discount: 10,
  },
  {
    slug: 'iphone-18-pro-max-prateado',
    title: 'Apple iPhone 18 Pro Max 256GB Prateado',
    image: 'imgi_20_1xg.jpg',
    brand: 'Apple',
    price: 1169910,
    compareAt: 1299900,
    reviews: 0,
    discount: 10,
  },
  {
    slug: 'galaxy-s26-ultra-5g',
    title: 'Smartphone Samsung Galaxy S26 Ultra 5G Tela 6,9” 256GB Câmera...',
    image: 'imgi_21_1xg.jpg',
    brand: 'Samsung',
    price: 1034900,
    compareAt: 1149900,
    reviews: 7,
    rating: 5,
    discount: 10,
    promo: '20-off',
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'motorola-moto-g71-5g',
    title: 'Smartphone Motorola Moto G71 5G 256GB 8GB RAM Tela 6,4” Câmera...',
    image: 'imgi_24_01g.jpg',
    brand: 'Motorola',
    price: 179900,
    compareAt: 209900,
    reviews: 18,
    rating: 4.4,
    discount: 14,
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'motorola-edge-70-fusion',
    title: 'Smartphone Motorola Edge 70 Fusion 256GB 5G 8GB RAM 144Hz...',
    image: 'imgi_25_1xg.jpg',
    brand: 'Motorola',
    price: 249900,
    compareAt: 299900,
    reviews: 11,
    rating: 3.8,
    discount: 17,
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'galaxy-z-flip-7-fe',
    title: 'Smartphone Samsung Galaxy Z Flip 7 FE 256GB 5G - Branco, Tela dobrável...',
    image: 'imgi_26_1xg.jpg',
    brand: 'Samsung',
    price: 545900,
    compareAt: 649900,
    reviews: 4,
    rating: 2.7,
    discount: 16,
  },
  {
    slug: 'motorola-moto-g47-5g',
    title: 'Smartphone Motorola Moto G47 5G 128GB 4GB RAM Câmera 50MP...',
    image: 'imgi_27_1xg.jpg',
    brand: 'Motorola',
    price: 129900,
    compareAt: 158765,
    reviews: 14,
    rating: 4.7,
    discount: 18,
    promo: '10-off',
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'galaxy-a17-4g',
    title: 'Celular Samsung Galaxy A17 4G Tela 6,7” 128GB Super AMOLED Câmera...',
    image: 'imgi_29_1xg.jpg',
    brand: 'Samsung',
    price: 109898,
    compareAt: 129900,
    reviews: 231,
    rating: 4.8,
    discount: 15,
    promo: '10-off',
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'carregador-usb-c-20w-apple',
    title: 'Carregador USB-C 20W Apple Branco Original - iPhone/iPad',
    image: 'imgi_30_1g.jpg',
    brand: 'Apple',
    price: 16958,
    compareAt: 19990,
    reviews: 1615,
    rating: 4.9,
    discount: 15,
    flags: ['RETIRA RÁPIDO'],
    fastPickup: true,
  },
  {
    slug: 'fone-baseus-bowie',
    title: 'Fone de Ouvido Moto Buds Baseus Bluetooth Cancelamento de Ruído...',
    image: 'imgi_32_1g.jpg',
    brand: 'Baseus',
    price: 28900,
    compareAt: 32990,
    reviews: 9,
    rating: 1.8,
    discount: 12,
  },
  {
    slug: 'fone-jbl-beam-3-tws',
    title: 'Fone Bluetooth Live Beam 3 TWS JBL LIVEBEAM3BR, Preto, HARMAN...',
    image: 'imgi_34_1xg.jpg',
    brand: 'JBL',
    price: 56900,
    compareAt: 69900,
    reviews: 18,
    rating: 4.6,
    discount: 19,
  },
  {
    slug: 'apple-watch-series-8-reembalado',
    title: 'REEMBALADO: Apple Watch Series 8 45mm GPS Sport Band A2770...',
    image: 'imgi_35_1xg.jpg',
    brand: 'Apple',
    price: 521990,
    compareAt: 579900,
    reviews: 0,
    discount: 10,
    flags: ['RETIRA RÁPIDO'],
  },
  {
    slug: 'capa-iphone-17-pro-azul',
    title: 'Capa Protetora Magsafe Slim para iPhone 17 Pro Azul - Laut',
    image: 'imgi_38_1xg.jpg',
    brand: 'Laut',
    price: 16028,
    compareAt: 18990,
    reviews: 0,
    discount: 16,
  },
  {
    slug: 'motorola-moto-watch-fit',
    title: 'Smartwatch Motorola Moto Watch Fit GPS Ativo SAT Bateria Durável...',
    image: 'imgi_39_1g.png',
    brand: 'Motorola',
    price: 69900,
    compareAt: 77900,
    reviews: 0,
    discount: 10,
    promo: '10-off',
  },
  {
    slug: 'honor-x6c-5g',
    title: 'Smartphone HONOR X6c 5G Preto 256GB, 4GB RAM Turbo, Tela de...',
    image: 'imgi_40_1g.jpg',
    brand: 'Honor',
    price: 154898,
    compareAt: 179900,
    reviews: 0,
    discount: 14,
    flags: ['FRETE GRÁTIS'],
    cbFull: true,
  },
  {
    slug: 'buds-loop-ows',
    title: 'Fone de Ouvido Moto Buds Loop OWS Bluetooth, Sound by Bose IP54...',
    image: 'imgi_41_1xg.jpg',
    brand: 'Motorola',
    price: 62999,
    compareAt: 69990,
    reviews: 0,
    discount: 10,
  },
  {
    slug: 'power-bank-10000mah',
    title: 'Power Bank 10GO Plus 10000mAh 4 em 1 USB-C Lightning e Micro USB...',
    image: 'imgi_42_1xg.jpg',
    brand: 'I2GO',
    price: 8900,
    compareAt: 11990,
    reviews: 16,
    rating: 4.3,
    discount: 26,
  },
  {
    slug: 'carregador-turbopower-20w',
    title: 'Carregador de parede TurboPower™ 20W USB-C',
    image: 'imgi_43_1xg.jpg',
    brand: 'Motorola',
    price: 14632,
    compareAt: 16990,
    reviews: 12,
    rating: 4.8,
    discount: 14,
    flags: ['FRETE GRÁTIS'],
  },
  {
    slug: 'kit-radio-walkie-talkie',
    title: 'Kit 6 Rádio Walkie Talkie 20W Bidirecional de Longo Alcance com...',
    image: 'imgi_45_1xg.jpg',
    brand: 'DeWalt',
    price: 1166751,
    compareAt: 1299900,
    reviews: 0,
    discount: 10,
  },
];

const flashSeeds: ProductSeed[] = [
  {
    slug: 'smart-tv-philco-40-roku',
    title: 'Smart TV 40” Philco LED Roku TV Dolby Audio PTV40G...',
    image: 'imgi_46_1xg.jpg',
    brand: 'Philco',
    price: 149990,
    compareAt: 179990,
    reviews: 61,
    rating: 4.8,
    discount: 17,
  },
  {
    slug: 'liquidificador-electrolux-ebl10b',
    title: 'Liquidificador Electrolux EBL10B Efficient Preto 1200W...',
    image: 'imgi_47_1g.jpg',
    brand: 'Electrolux',
    price: 12900,
    compareAt: 17745,
    reviews: 152,
    rating: 4.7,
    discount: 27,
  },
  {
    slug: 'ventilador-mesa-aoc-40cm',
    title: 'Ventilador de Mesa AOC 40cm 6 Pás Preto Mondial 127V',
    image: 'imgi_48_1xg.jpg',
    brand: 'Mondial',
    price: 12290,
    compareAt: 17490,
    reviews: 21,
    rating: 4.8,
    discount: 30,
  },
];

export const phoneCategoryTemplate: CategoryTemplateConfig = {
  slug: 'telefonia',
  title: 'Telefones e Celulares',
  breadcrumb: 'Telefones e Celulares',
  banners: [
    {
      kind: 'image',
      src: assetPath('imgi_3_12594324347_ADS_Motorola_G47_Julho_1240X315.jpg'),
      alt: 'Moto G47: a evolução da fotografia',
      href: '/busca?q=Moto%20G47',
    },
    {
      kind: 'image',
      src: assetPath('imgi_4_banner-categoria-telefonia.png'),
      alt: 'Ofertas de telefonia e celulares',
      href: '/busca?q=celular',
    },
    {
      kind: 'image',
      src: assetPath('imgi_5_depto-garantia.png'),
      alt: 'Garantia estendida original Casas Bahia',
      href: '/protecao',
    },
    {
      kind: 'image',
      src: assetPath('imgi_6_depto-fique-seguro.png'),
      alt: 'Proteção para celulares, tablets e notebooks',
      href: '/protecao',
    },
    {
      kind: 'product',
      id: 'moto-g06',
      image: assetPath('carousel-moto-g06.png'),
      alt: 'Smartphone Moto G06 verde',
      title:
        'Oportunidade! Smartphones com desconto no cupom + 12x sem juros no cartão CB a partir de',
      compareAt: 124544,
      price: 107900,
      installmentTotal: 119889,
      discount: 13,
      href: '/busca?q=Moto%20G06',
    },
    {
      kind: 'product',
      id: 'oppo-reno-16f',
      image: assetPath('carousel-oppo-reno.jpg'),
      alt: 'Smartphone OPPO Reno 16F branco',
      title: 'Smartphone OPPO Reno 16F 5G 256GB Branco Aura Octa Core',
      compareAt: 459898,
      price: 413908,
      installmentTotal: 459898,
      discount: 10,
      flag: 'FRETE GRÁTIS',
      href: '/busca?q=OPPO%20Reno%2016F',
    },
    {
      kind: 'product',
      id: 'jovi-y21',
      image: assetPath('carousel-jovi-y21.jpg'),
      alt: 'Smartphone Jovi Y21 rosa',
      title: 'Oportunidade! Smartphones da Jovi a partir de',
      compareAt: 181389,
      price: 148409,
      installmentTotal: 164899,
      discount: 18,
      href: '/busca?q=Jovi%20Y21',
    },
    {
      kind: 'product',
      id: 'galaxy-a17',
      image: assetPath('carousel-galaxy-a17.jpg'),
      alt: 'Smartphone Samsung Galaxy A17 azul',
      title: 'Oportunidade! Smartphones Samsung Galaxy a partir de',
      compareAt: 121099,
      price: 109899,
      installmentTotal: 121099,
      discount: 9,
      href: '/busca?q=Galaxy%20A17',
    },
    {
      kind: 'product',
      id: 'moto-g77',
      image: assetPath('carousel-moto-g77.jpg'),
      alt: 'Smartphone Motorola Moto G77 preto',
      title: 'Oportunidade! Smartphones Motorola com desconto no Pix',
      compareAt: 88999,
      price: 79999,
      installmentTotal: 88999,
      discount: 10,
      href: '/busca?q=Moto%20G77',
    },
  ],
  subcategories: [
    'Smartphones',
    'Celulares',
    'Telefonia Fixa',
    'Acessórios para Celulares',
    'Wearables',
    'Smartphones',
    'Fones de Ouvido',
  ],
  brands: ['Kawasaki', 'Samsung', 'Motorola', 'Apple', 'Tudo Celular'],
  description:
    'O Telefone celular é um dispositivo eletrônico portátil usado para comunicação, acesso à internet, entretenimento, estudos e produtividade. Os smartphones atuais permitem fazer chamadas, trocar mensagens, utilizar aplicativos, tirar fotos, gravar vídeos, realizar pagamentos e acessar muitas outras funcionalidades.',
  faqs: [
    {
      question: 'Qual a diferença entre celular e smartphone?',
      answer:
        'Smartphones contam com sistema operacional, aplicativos e conexão avançada com a internet. Celulares básicos priorizam ligações e mensagens.',
    },
    {
      question: 'O que consome mais bateria no celular?',
      answer:
        'Tela em brilho alto, jogos, vídeos, GPS e redes móveis são alguns dos recursos que mais consomem bateria.',
    },
    {
      question: 'Vale a pena comprar um celular 5G?',
      answer:
        'Sim. Além da velocidade de conexão, o 5G ajuda a manter o aparelho preparado para as redes móveis atuais e futuras.',
    },
  ],
  sponsored: sponsoredSeeds.map((seed, index) => createProduct(seed, index)),
  recommended: recommendedSeeds.map((seed, index) =>
    createProduct(seed, sponsoredSeeds.length + index),
  ),
  flash: flashSeeds.map((seed, index) =>
    createProduct(seed, sponsoredSeeds.length + recommendedSeeds.length + index),
  ),
};

export function getCategoryTemplate(slug: string): CategoryTemplateConfig {
  const normalizedSlug = slug.toLocaleLowerCase('pt-BR');
  if (['telefonia', 'telefones-e-celulares', 'celulares-e-smartphones'].includes(normalizedSlug))
    return phoneCategoryTemplate;
  const title = slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toLocaleUpperCase('pt-BR') + part.slice(1))
    .join(' ');
  return {
    ...phoneCategoryTemplate,
    slug,
    title,
    breadcrumb: title,
  };
}
