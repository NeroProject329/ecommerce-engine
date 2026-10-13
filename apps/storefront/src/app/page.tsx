import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { HomeHero } from '../components/home-hero';
import { PageFrame } from '../components/chrome';
import { ProductShelf } from '../components/product-card';
import { getStorefrontBootstrap } from '../lib/commerce';
import type { Product } from '../lib/commerce';
import { demoProducts } from '../lib/demo-products';

export const dynamic = 'force-dynamic';

function productsForSection(section: Record<string, unknown>, products: Product[], index: number) {
  const config = section.configJson && typeof section.configJson === 'object' && !Array.isArray(section.configJson)
    ? section.configJson as Record<string, unknown>
    : {};
  const ids = Array.isArray(config.productIds) ? config.productIds.filter((id): id is string => typeof id === 'string') : [];
  if (ids.length) return ids.map((id) => products.find((product) => product.id === id)).filter((product): product is Product => Boolean(product));
  if (typeof config.categorySlug === 'string') return products.filter((product) => product.primaryCategory.slug === config.categorySlug);
  return [...products.slice(index), ...products.slice(0, index)];
}

export default async function HomePage() {
  const { store, home, products, categories } = await getStorefrontBootstrap();
  const shelves = home.sections.length ? home.sections : [
    { id: 'pickup', title: 'Compre hoje e Retire em 2h' },
    { id: 'visits', title: 'Indicados com base nas suas visitas' },
    { id: 'month', title: 'Ofertas Mais Vendidas do Mês' },
    { id: 'tech', title: 'Mais Vendidos de Tecnologia' },
    { id: 'home', title: 'Tudo para sua Casa' },
    { id: 'furniture', title: 'Aproveite nossas ofertas de móveis' },
    { id: 'recent', title: 'Últimos itens que você visitou' },
  ];
  return <PageFrame store={store} categories={categories}>
    <main className="cb-home">
      <HomeHero banners={home.banners} categories={categories}/>
      <FinanceStrips />
      {shelves.map((section,index)=><ProductShelf
        key={String(section.id)}
        title={String(section.title ?? 'Seleção especial')}
        products={products.length
          ? productsForSection(section,products,index)
          : [...demoProducts.slice(index * 5), ...demoProducts.slice(0, index * 5)]}
      />) }
    </main>
  </PageFrame>;
}

function FinanceStrips() {
  return <>
    <Link href="/institucional/carne" className="carne-strip container" aria-label="Conheça o Carnê Casas Bahia" style={{ position: 'relative' }}>
      <Image src="/home-assets/carne-banner.png" alt="Carnê Casas Bahia: parcele sem usar o limite do cartão e aproveite em até 24 vezes" fill priority unoptimized/>
    </Link>
    <section className="digital-strip" aria-label="Benefícios do Carnê Digital">
      <div className="container digital-strip-content">
        <div className="digital-brand">
          <strong>CARNÊ<br/>DIGITAL</strong>
          <Image className="digital-mascot" src="/home-assets/carne-mascot.png" alt="" width={122} height={112} unoptimized/>
        </div>
        <DigitalBenefit icon="cart" lines={<>Parcelamento<br/>em até 24x</>}/>
        <DigitalBenefit icon="card" lines={<>Seu limite do<br/>cartão fica livre</>}/>
        <DigitalBenefit icon="calendar" lines={<>Pague a primeira parcela só<br/>daqui a 30 dias</>}/>
        <Link href="/institucional/carne">Consultar pré-aprovado</Link>
      </div>
    </section>
  </>;
}

function DigitalBenefit({ icon, lines }: { icon: 'cart' | 'card' | 'calendar'; lines: ReactNode }) {
  return <div className="digital-benefit">
    <span className="digital-benefit-icon" aria-hidden="true">
      {icon === 'cart' && <svg viewBox="0 0 24 24"><path d="M3 4h2l2.2 10.1a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 1.9-1.4L21 8H7"/><circle cx="10" cy="20" r="1.25"/><circle cx="18" cy="20" r="1.25"/></svg>}
      {icon === 'card' && <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="1.5"/><path d="M3 9h18M5 3l14 18"/></svg>}
      {icon === 'calendar' && <svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="1.5"/><path d="M7 3v4M17 3v4M3 10h18M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2"/></svg>}
    </span>
    <span className="digital-benefit-copy">{lines}</span>
  </div>;
}
