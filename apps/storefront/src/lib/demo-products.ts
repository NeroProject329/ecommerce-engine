import type { Product } from './commerce';

type DemoSeed = {
  slug: string;
  title: string;
  image: string;
  pix: number;
  compare: number;
  reviews: number;
  installmentTotal?: number;
  installmentAmount?: number;
  installments?: number;
  discount?: number;
  promo?: Product['card'] extends infer Card ? Card extends { promo?: infer Promo } ? Promo : never : never;
  flags?: string[];
  sponsored?: boolean;
};

const seeds: DemoSeed[] = [
  { slug: 'fritadeira-air-fryer-oven-mondial', title: 'Fritadeira Air Fryer Oven Mondial AFON-12L-FG 12L...', image: 'air-fryer-mondial.jpg', pix: 44909, compare: 54890, reviews: 204, installmentTotal: 49899, installmentAmount: 4716, installments: 12, discount: 9, promo: 'exclusive', flags: ['FRETE GRÁTIS'] },
  { slug: 'motorola-moto-g47-5g', title: 'Smartphone Motorola Moto G47 5G 128GB 4GB RAM...', image: 'moto-g47.jpg', pix: 114900, compare: 158765, reviews: 14, installmentTotal: 127667, installmentAmount: 12065, installments: 12, discount: 20, promo: '10-off', flags: ['FRETE GRÁTIS'] },
  { slug: 'smart-tv-aoc-43', title: 'Smart TV 43” AOC 43S5155/78G Full HD LED...', image: 'smart-tv-aoc-43.jpg', pix: 139900, compare: 191986, reviews: 285, installmentTotal: 155444, installments: 6, discount: 19, flags: ['FRETE GRÁTIS', 'LANÇAMENTO★'] },
  { slug: 'geladeira-consul-crm53mb', title: 'Geladeira Consul CRM53MB Duplex Inverter 455L Frost...', image: 'geladeira-consul.jpg', pix: 298900, compare: 371759, reviews: 430, installmentTotal: 339659, installments: 6, discount: 9 },
  { slug: 'aspirador-electrolux-1400w', title: 'Aspirador de Pó e Água Electrolux 1400W 12 Litros...', image: 'aspirador-electrolux.jpg', pix: 23900, compare: 29590, reviews: 8351, installmentTotal: 26556, installments: 5, discount: 10, flags: ['RETIRA RÁPIDO', 'RETIRA RÁPIDO'] },

  { slug: 'geladeira-electrolux-french-door', title: 'Geladeira French Door Electrolux Frost Free Inox...', image: 'geladeira-electrolux-french-door.jpg', pix: 519900, compare: 609900, reviews: 37, installmentTotal: 577667, installments: 6, discount: 15, sponsored: true },
  { slug: 'iphone-18-pro-max-prateado', title: 'Apple iPhone 18 Pro Max 256GB Prateado', image: 'iphone-prateado.jpg', pix: 1169910, compare: 1299900, reviews: 0, installmentTotal: 1299900, installments: 6, discount: 10 },
  { slug: 'iphone-18-pro-max-glacial', title: 'Apple iPhone 18 Pro Max 256GB Glacial', image: 'iphone-glacial.jpg', pix: 1169910, compare: 1299900, reviews: 0, installmentTotal: 1299900, installments: 6, discount: 10 },
  { slug: 'playstation-5-digital-astro-bot', title: 'Console PlayStation 5 Edição Digital 825GB – ASTRO BOT...', image: 'playstation-5.jpg', pix: 429900, compare: 571430, reviews: 95, installmentTotal: 429900, installments: 6, discount: 25, promo: '10-off', flags: ['FRETE GRÁTIS'] },
  { slug: 'galaxy-s26-ultra', title: 'Smartphone Samsung Galaxy S26 Ultra 5G Tela 6,9”...', image: 'galaxy-s26-ultra.jpg', pix: 1034900, compare: 1149900, reviews: 7, installmentTotal: 1149900, installments: 12, discount: 10, promo: '20-off' },

  { slug: 'air-fryer-oven-12l', title: 'Fritadeira Air Fryer Oven Mondial AFON-12L-FG 12L...', image: 'air-fryer-oven.jpg', pix: 44909, compare: 54890, reviews: 204, installmentTotal: 49899, installments: 12, discount: 9, flags: ['FRETE GRÁTIS'] },
  { slug: 'smart-tv-samsung-75', title: 'Smart TV Samsung 75 Polegadas Crystal UHD 4K...', image: 'smart-tv-samsung-75.jpg', pix: 482099, compare: 685477, reviews: 202, installmentTotal: 535666, installments: 6, discount: 22, flags: ['FRETE GRÁTIS'] },
  { slug: 'smart-tv-lg-qned-50', title: 'Smart TV 50 Polegadas LG QNED Mini LED AI 4K...', image: 'smart-tv-lg-qned.jpg', pix: 239900, compare: 305188, reviews: 67, installmentTotal: 266556, installments: 6, discount: 13, flags: ['FRETE GRÁTIS', 'LANÇAMENTO★'] },
  { slug: 'multiprocessador-philco', title: 'Multiprocessador Philco 9 em 1 1400W com Blender...', image: 'multiprocessador.jpg', pix: 38990, compare: 45990, reviews: 318, installmentTotal: 43322, installments: 6, discount: 15, flags: ['RETIRA RÁPIDO'] },
  { slug: 'secador-philco-dourado', title: 'Secador de Cabelos Philco PSC3500 4 em 1 Dourado', image: 'secador-philco.jpg', pix: 49900, compare: 58900, reviews: 64, installmentTotal: 55444, installments: 6, discount: 15 },

  { slug: 'lavadora-semiautomatica', title: 'Lavadora Semiautomática 10kg Compacta Branca', image: 'lavadora-semiautomatica.jpg', pix: 46990, compare: 56990, reviews: 311, installmentTotal: 52211, installments: 6, discount: 18 },
  { slug: 'fogao-brastemp-5-bocas', title: 'Fogão Brastemp 5 Bocas com Mesa de Inox', image: 'fogao-brastemp.jpg', pix: 209900, compare: 249900, reviews: 185, installmentTotal: 233222, installments: 6, discount: 16 },
  { slug: 'galaxy-s26-azul', title: 'Smartphone Samsung Galaxy S26 Ultra 5G 256GB Azul', image: 'galaxy-s26-azul.jpg', pix: 1034900, compare: 1149900, reviews: 26, installmentTotal: 1149900, installments: 12, discount: 10, promo: '20-off' },
  { slug: 'galaxy-z-flip', title: 'Smartphone Samsung Galaxy Z Flip 7 256GB', image: 'galaxy-z-flip.jpg', pix: 629900, compare: 699900, reviews: 43, installmentTotal: 699900, installments: 12, discount: 10 },
  { slug: 'macbook-air-m1', title: 'Usado: Apple MacBook Air M1 2020 13,3” GPU 7-Core...', image: 'macbook-air.jpg', pix: 512900, compare: 629900, reviews: 31, installmentTotal: 569900, installments: 6, discount: 19, sponsored: true },

  { slug: 'macbook-pro-2019', title: 'Usado: Apple MacBook Pro 2019 16” Intel Core i7...', image: 'macbook-pro.jpg', pix: 683900, compare: 799900, reviews: 17, installmentTotal: 759900, installments: 6, discount: 15, sponsored: true },
  { slug: 'smart-tv-lg-50', title: 'Smart TV 50 Polegadas LG QNED Mini LED AI 4K', image: 'smart-tv-lg-50.jpg', pix: 239900, compare: 305188, reviews: 67, installmentTotal: 266556, installments: 6, discount: 13 },
  { slug: 'smart-tv-tcl-75', title: 'Smart TV TCL 75” QLED 4K Google TV', image: 'smart-tv-tcl-75.jpg', pix: 499900, compare: 589900, reviews: 49, installmentTotal: 555444, installments: 6, discount: 15 },
  { slug: 'nintendo-switch-oled', title: 'Console Nintendo Switch OLED Edição Especial', image: 'nintendo-switch.jpg', pix: 249900, compare: 299900, reviews: 119, installmentTotal: 277667, installments: 6, discount: 17, flags: ['FRETE GRÁTIS'] },
  { slug: 'air-fryer-digital', title: 'Fritadeira Air Fryer Digital 12L com Painel Touch', image: 'air-fryer-digital.jpg', pix: 52110, compare: 62990, reviews: 145, installmentTotal: 57900, installments: 6, discount: 17, flags: ['FRETE GRÁTIS'] },

  { slug: 'geladeira-brastemp-frost-free', title: 'Geladeira Brastemp BRO85AK 554L Frost Free...', image: 'geladeira-brastemp.jpg', pix: 629800, compare: 699900, reviews: 42, installmentTotal: 699778, installments: 6, discount: 10 },
  { slug: 'cama-box-king-atlanta', title: 'Conjunto Cama Box King Size Atlanta 193x203x66 Bege...', image: 'cama-box-king.jpg', pix: 199900, compare: 239900, reviews: 95, installmentTotal: 222111, installments: 6, discount: 17, promo: '15-off' },
  { slug: 'geladeira-electrolux-multidoor', title: 'Geladeira Electrolux Multidoor Efficient IM8S...', image: 'geladeira-electrolux.jpg', pix: 639800, compare: 714900, reviews: 104, installmentTotal: 710889, installments: 6, discount: 10 },
  { slug: 'lavadora-electrolux-17kg', title: 'Lavadora de Roupas Electrolux 17kg Essential Care', image: 'lavadora-electrolux.jpg', pix: 209900, compare: 249900, reviews: 185, installmentTotal: 233222, installments: 6, discount: 16 },
  { slug: 'lava-seca-inverter', title: 'Lava e Seca Inverter 11kg com Água Quente', image: 'lava-seca.jpg', pix: 329900, compare: 389900, reviews: 81, installmentTotal: 366556, installments: 6, discount: 15 },

  { slug: 'guarda-roupa-casal-mademarcs', title: 'Guarda-Roupa Casal Mademarcs Sevilla com Espelho', image: 'guarda-roupa-casal.jpg', pix: 274640, compare: 305900, reviews: 167, installmentTotal: 305156, installments: 6, discount: 10, promo: '10-off' },
  { slug: 'geladeira-multidoor-inox', title: 'Geladeira Multidoor Inox Frost Free 590 Litros', image: 'geladeira-multidoor.jpg', pix: 599900, compare: 669900, reviews: 73, installmentTotal: 666556, installments: 6, discount: 10 },
  { slug: 'colchao-king-premium', title: 'Colchão King Size Premium Molas Ensacadas', image: 'colchao-king.jpg', pix: 189900, compare: 229900, reviews: 84, installmentTotal: 211000, installments: 6, discount: 17 },
  { slug: 'cama-box-bau-casal', title: 'Cama Box Baú Casal com Colchão de Molas', image: 'cama-box-bau.jpg', pix: 159990, compare: 199900, reviews: 99, installmentTotal: 177767, installments: 6, discount: 20, promo: '10-off' },
  { slug: 'cama-box-pillow-top', title: 'Cama Box Casal Pillow Top Confort Premium', image: 'cama-box-pillow.jpg', pix: 103990, compare: 129900, reviews: 199, installmentTotal: 115544, installments: 6, discount: 20, promo: '10-off' },

  { slug: 'colchao-premium-casal', title: 'Colchão Casal Premium Espuma e Molas', image: 'colchao-premium.jpg', pix: 139990, compare: 169900, reviews: 121, installmentTotal: 155544, installments: 6, discount: 18 },
  { slug: 'guarda-roupa-branco', title: 'Guarda-Roupa Casal 6 Portas Branco', image: 'guarda-roupa-branco.png', pix: 164990, compare: 199900, reviews: 88, installmentTotal: 183322, installments: 6, discount: 17 },
  { slug: 'sofa-retratil-cinza', title: 'Sofá Retrátil e Reclinável 3 Lugares Cinza', image: 'sofa-retratil.jpg', pix: 239990, compare: 289900, reviews: 64, installmentTotal: 266656, installments: 6, discount: 17 },
  { slug: 'guarda-roupa-com-espelho', title: 'Guarda-Roupa Casal 3 Portas com Espelho', image: 'guarda-roupa-espelho.png', pix: 229990, compare: 279900, reviews: 55, installmentTotal: 255544, installments: 6, discount: 18 },
  { slug: 'sofa-cinza-5-lugares', title: 'Sofá 5 Lugares Retrátil e Reclinável Cinza', image: 'sofa-cinza.jpg', pix: 319990, compare: 379900, reviews: 48, installmentTotal: 355544, installments: 6, discount: 16 },
];

const category = { id: 'demo-category', slug: 'ofertas', name: 'Ofertas' };
const brand = { id: 'demo-brand', slug: 'casas-bahia', name: 'Casas Bahia' };

export const demoProducts: Product[] = seeds.map((seed, index) => ({
  id: `demo-product-${index + 1}`,
  slug: seed.slug,
  title: seed.title,
  description: 'Produto demonstrativo da vitrine Casas Bahia.',
  brand,
  primaryCategory: category,
  media: [{ url: `/demo-products/${seed.image}`, role: 'PRIMARY', sortOrder: 0 }],
  variants: [{
    id: `demo-variant-${index + 1}`,
    sku: `DEMO-${String(index + 1).padStart(3, '0')}`,
    price: { amountCents: seed.pix, compareAtCents: seed.compare, currency: 'BRL' },
    availableQuantity: 100,
    media: [],
  }],
  isDemo: true,
  card: {
    reviewCount: seed.reviews,
    installmentCount: seed.installments ?? 6,
    installmentTotalCents: seed.installmentTotal ?? seed.pix,
    ...(seed.installmentAmount !== undefined ? { installmentAmountCents: seed.installmentAmount } : {}),
    ...(seed.discount !== undefined ? { discountPercent: seed.discount } : {}),
    ...(seed.promo ? { promo: seed.promo } : {}),
    ...(seed.flags ? { flags: seed.flags } : {}),
    ...(seed.sponsored ? { sponsored: true } : {}),
  },
}));
