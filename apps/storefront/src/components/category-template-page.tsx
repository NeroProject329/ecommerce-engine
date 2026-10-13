'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { mediaUrl, money, type Category, type Product, type Store } from '../lib/commerce';
import { getCategoryTemplate } from '../lib/category-template-data';
import { PageFrame } from './chrome';
import { ProductCard } from './product-card';

type CategoryTemplatePageProps = {
  store: Store;
  categories: Category[];
  initialProducts: Product[];
  categorySlug: string;
};

const discountOptions = ['Acima de 30%', 'Até 10%', 'De 10% até 20%', 'De 20% até 30%'];

export function CategoryTemplatePage({ store, categories, initialProducts, categorySlug }: CategoryTemplatePageProps) {
  const config = useMemo(() => getCategoryTemplate(categorySlug), [categorySlug]);
  const categoryProducts = useMemo(
    () => initialProducts.filter((product) => product.primaryCategory.slug === categorySlug),
    [categorySlug, initialProducts],
  );
  const baseProducts = categoryProducts.length ? categoryProducts : config.recommended;
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1_300_000);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<string[]>([]);
  const [cbFull, setCbFull] = useState(false);
  const [fastPickup, setFastPickup] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [clock, setClock] = useState({ hours: 21, minutes: 49, seconds: 42 });

  useEffect(() => {
    if (bannerPaused || config.banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((value) => (value + 1) % config.banners.length), 5500);
    return () => window.clearInterval(timer);
  }, [bannerPaused, config.banners.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock((value) => {
        const total = Math.max(0, value.hours * 3600 + value.minutes * 60 + value.seconds - 1);
        return { hours: Math.floor(total / 3600), minutes: Math.floor((total % 3600) / 60), seconds: total % 60 };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(() => baseProducts.filter((product) => {
    const price = product.variants[0]?.price.amountCents ?? 0;
    const rating = product.card?.reviewCount ? 5 : 0;
    const discount = product.card?.discountPercent ?? 0;
    const flags = product.card?.flags ?? [];
    const brandMatches = !selectedBrands.length || (product.brand && selectedBrands.includes(product.brand.name));
    const ratingMatches = !selectedRatings.length || selectedRatings.some((selected) => rating >= selected);
    const discountMatches = !selectedDiscounts.length || selectedDiscounts.some((selected) => {
      if (selected === 'Acima de 30%') return discount > 30;
      if (selected === 'Até 10%') return discount <= 10;
      if (selected === 'De 10% até 20%') return discount > 10 && discount <= 20;
      return discount > 20 && discount <= 30;
    });
    const fullMatches = !cbFull || flags.some((flag) => flag.includes('FRETE'));
    const pickupMatches = !fastPickup || flags.some((flag) => flag.includes('RETIRA'));
    return price >= minPrice && price <= maxPrice && brandMatches && ratingMatches && discountMatches && fullMatches && pickupMatches;
  }), [baseProducts, cbFull, fastPickup, maxPrice, minPrice, selectedBrands, selectedDiscounts, selectedRatings]);

  const hasActiveFilters = minPrice > 0 || maxPrice < 1_300_000 || cbFull || fastPickup || selectedBrands.length > 0 || selectedDiscounts.length > 0 || selectedRatings.length > 0;
  const visibleProducts = filteredProducts.length || hasActiveFilters
    ? filteredProducts
    : baseProducts;

  const moveBanner = (direction: number) => {
    setBannerIndex((value) => (value + direction + config.banners.length) % config.banners.length);
  };
  const toggleValue = <T,>(value: T, setter: Dispatch<SetStateAction<T[]>>) => {
    setter((values) => values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };

  return (
    <PageFrame store={store} categories={categories}>
      <main className="category-template-page">
        <div className="category-head container">
          <nav className="category-breadcrumb" aria-label="Navegação estrutural">
            <Link href="/">casasbahia.com.br</Link><span aria-hidden="true">›</span><strong>{config.breadcrumb}</strong>
          </nav>
          <h1>{config.title}</h1>
        </div>

        <section className="category-banner container" aria-label="Ofertas da categoria">
          <div className="category-banner-viewport">
            <div className="category-banner-track" style={{ transform: `translate3d(-${bannerIndex * 100}%,0,0)` }}>
              {config.banners.map((banner, index) => (
                <Link className="category-banner-slide" href={banner.href} key={banner.src} tabIndex={index === bannerIndex ? undefined : -1} aria-hidden={index !== bannerIndex}>
                  <Image src={banner.src} alt={banner.alt} fill priority={index === 0} unoptimized />
                </Link>
              ))}
            </div>
          </div>
          <button className="category-banner-arrow previous" type="button" onClick={() => moveBanner(-1)} aria-label="Banner anterior">‹</button>
          <button className="category-banner-arrow next" type="button" onClick={() => moveBanner(1)} aria-label="Próximo banner">›</button>
          <div className="category-banner-dots">
            {config.banners.map((banner, index) => <button key={banner.src} type="button" className={index === bannerIndex ? 'active' : ''} onClick={() => setBannerIndex(index)} aria-label={`Exibir banner ${index + 1}`} />)}
          </div>
          <button className="category-banner-playback" type="button" onClick={() => setBannerPaused((value) => !value)} aria-label={bannerPaused ? 'Retomar banners' : 'Pausar banners'}>{bannerPaused ? '▶' : 'Ⅱ'}</button>
        </section>

        <div className="category-body container">
          <aside className="category-filters" aria-label="Filtros de produtos">
            <section className="category-link-list">
              <strong>{config.title}</strong>
              {config.subcategories.map((item, index) => <Link href={`/busca?q=${encodeURIComponent(item)}`} key={`${item}-${index}`}>{item}</Link>)}
            </section>

            <label className="category-switch-row"><span>CB Full</span><input type="checkbox" checked={cbFull} onChange={(event) => setCbFull(event.target.checked)} /><i aria-hidden="true" /></label>
            <label className="category-switch-row"><span>Retira Rápido</span><input type="checkbox" checked={fastPickup} onChange={(event) => setFastPickup(event.target.checked)} /><i aria-hidden="true" /></label>

            <details className="category-filter-box price-box" open>
              <summary>Preço</summary>
              <div className="category-price-fields">
                <label>De<input type="number" value={Math.round(minPrice / 100)} min={0} max={13000} onChange={(event) => setMinPrice(Math.min(Number(event.target.value) * 100, maxPrice))} /></label>
                <label>Até<input type="number" value={Math.round(maxPrice / 100)} min={0} max={13000} onChange={(event) => setMaxPrice(Math.max(Number(event.target.value) * 100, minPrice))} /></label>
              </div>
              <div className="category-range" aria-hidden="true"><span /><i style={{ left: `${Math.min(100, minPrice / 13_000)}%`, right: `${Math.max(0, 100 - maxPrice / 13_000)}%` }} /></div>
              <div className="category-range-labels"><small>Min R$ 0</small><small>Máx R$ 13.000</small></div>
              <button type="button" className="category-apply-button">Aplicar</button>
            </details>

            <details className="category-filter-box" open>
              <summary>Avaliação</summary>
              {[5, 4, 3, 2, 1].map((rating) => <label className="category-check" key={rating}><input type="checkbox" checked={selectedRatings.includes(rating)} onChange={() => toggleValue(rating, setSelectedRatings)} /><span>{'★'.repeat(rating)}<i>{'★'.repeat(5 - rating)}</i></span></label>)}
              <button type="button" className="category-more-link">Exibir mais</button>
            </details>

            <details className="category-filter-box" open>
              <summary>Marca</summary>
              {config.brands.map((brand) => <label className="category-check brand-check" key={brand}><input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleValue(brand, setSelectedBrands)} /><span>{brand}</span></label>)}
              <button type="button" className="category-more-link">Exibir mais</button>
            </details>

            <details className="category-filter-box" open>
              <summary>Desconto</summary>
              {discountOptions.map((discount) => <label className="category-check brand-check" key={discount}><input type="checkbox" checked={selectedDiscounts.includes(discount)} onChange={() => toggleValue(discount, setSelectedDiscounts)} /><span>{discount}</span></label>)}
            </details>
          </aside>

          <div className="category-products">
            <section className="category-sponsored">
              <div className="category-section-heading"><div><h2>Produtos Patrocinados</h2><small>Patrocinado</small></div></div>
              <div className="category-sponsored-wrap">
                <div className="category-sponsored-grid">{config.sponsored.map((product) => <ProductCard key={product.id} product={product} />)}</div>
                <button type="button" className="category-shelf-arrow" aria-label="Ver mais produtos patrocinados">›</button>
              </div>
            </section>

            <section className="category-recommended">
              <div className="category-section-heading"><h2>Recomendados para você</h2></div>
              {visibleProducts.length ? <div className="category-product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="category-no-products">Nenhum produto corresponde aos filtros selecionados.</div>}
            </section>

            <section className={`category-description${descriptionExpanded ? ' expanded' : ''}`}>
              <p>{config.description}</p>
              {descriptionExpanded && <p>Compare modelos, capacidades, câmeras, duração de bateria, conectividade e recursos antes de escolher o aparelho ideal para sua rotina.</p>}
              <button type="button" onClick={() => setDescriptionExpanded((value) => !value)}>{descriptionExpanded ? 'Ver menos' : 'Ver mais'}</button>
            </section>

            <section className="category-faq" aria-label="Perguntas frequentes">
              {config.faqs.map((faq) => <details key={faq.question}><summary>{faq.question}<span aria-hidden="true">⌄</span></summary><p>{faq.answer}</p></details>)}
            </section>
          </div>
        </div>

        <section className="category-flash container">
          <div className="category-flash-heading"><h2>Ofertas Relâmpago <span>⚡</span></h2><div><span>As ofertas se encerram em:</span><b>◷</b><strong>{String(clock.hours).padStart(2, '0')} H</strong><strong>{String(clock.minutes).padStart(2, '0')} M</strong><strong>{String(clock.seconds).padStart(2, '0')} S</strong></div></div>
          <div className="category-flash-grid">{config.flash.map((product) => <FlashProduct key={product.id} product={product} />)}</div>
        </section>
      </main>
    </PageFrame>
  );
}

function FlashProduct({ product }: { product: Product }) {
  const variant = product.variants[0];
  if (!variant) return null;
  const image = mediaUrl(product, variant);
  return <article className="category-flash-card">
    <Link href={`/busca?q=${encodeURIComponent(product.title)}`} className="category-flash-image">{image && <Image src={image} alt={product.title} fill unoptimized />}</Link>
    <div><Link href={`/busca?q=${encodeURIComponent(product.title)}`}>{product.title}</Link><span className="category-flash-rating">★★★★★ <small>({product.card?.reviewCount ?? 0})</small></span><strong>{money.format(variant.price.amountCents / 100)}</strong><small>Exclusivo Pix <b>{product.card?.discountPercent ?? 0}% OFF</b></small></div>
  </article>;
}
