'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { mediaUrl, money, type Category, type Product, type Store } from '../lib/commerce';
import {
  categoryDiscountOptions,
  filterCategoryProducts,
  getProductRating,
  type CategoryDiscountOption,
} from '../lib/category-product-filters';
import { getCategoryTemplate } from '../lib/category-template-data';
import { PageFrame } from './chrome';
import { ProductCard, ProductRatingStars } from './product-card';

type CategoryTemplatePageProps = {
  store: Store;
  categories: Category[];
  initialProducts: Product[];
  categorySlug: string;
};

const MIN_PRICE_CENTS = 400;
const MAX_PRICE_CENTS = 3_762_500;
const PRICE_STEP_CENTS = 100;
const SPONSORED_PAGE_SIZE = 4;
const priceInputFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function parsePriceInput(value: string, fallback: number) {
  const normalized = value
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : fallback;
}

export function CategoryTemplatePage({
  store,
  categories,
  initialProducts,
  categorySlug,
}: CategoryTemplatePageProps) {
  const config = useMemo(() => getCategoryTemplate(categorySlug), [categorySlug]);
  const categoryProducts = useMemo(
    () => initialProducts.filter((product) => product.primaryCategory.slug === categorySlug),
    [categorySlug, initialProducts],
  );
  const baseProducts = categoryProducts.length ? categoryProducts : config.recommended;
  const [bannerIndex, setBannerIndex] = useState(0);
  const [bannerPaused, setBannerPaused] = useState(false);
  const [sponsoredPage, setSponsoredPage] = useState(0);
  const [minPrice, setMinPrice] = useState(MIN_PRICE_CENTS);
  const [maxPrice, setMaxPrice] = useState(MAX_PRICE_CENTS);
  const [appliedMinPrice, setAppliedMinPrice] = useState(MIN_PRICE_CENTS);
  const [appliedMaxPrice, setAppliedMaxPrice] = useState(MAX_PRICE_CENTS);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<number[]>([]);
  const [selectedDiscounts, setSelectedDiscounts] = useState<CategoryDiscountOption[]>([]);
  const [brandsExpanded, setBrandsExpanded] = useState(false);
  const [cbFull, setCbFull] = useState(false);
  const [fastPickup, setFastPickup] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [clock, setClock] = useState({ hours: 21, minutes: 49, seconds: 42 });

  useEffect(() => {
    if (
      bannerPaused ||
      config.banners.length < 2 ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setInterval(
      () => setBannerIndex((value) => (value + 1) % config.banners.length),
      5500,
    );
    return () => window.clearInterval(timer);
  }, [bannerPaused, config.banners.length]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock((value) => {
        const total = Math.max(0, value.hours * 3600 + value.minutes * 60 + value.seconds - 1);
        return {
          hours: Math.floor(total / 3600),
          minutes: Math.floor((total % 3600) / 60),
          seconds: total % 60,
        };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredProducts = useMemo(
    () =>
      filterCategoryProducts(baseProducts, {
        minPriceCents: appliedMinPrice,
        maxPriceCents: appliedMaxPrice,
        brands: selectedBrands,
        ratings: selectedRatings,
        discounts: selectedDiscounts,
        cbFull,
        fastPickup,
      }),
    [
      appliedMaxPrice,
      appliedMinPrice,
      baseProducts,
      cbFull,
      fastPickup,
      selectedBrands,
      selectedDiscounts,
      selectedRatings,
    ],
  );

  const hasActiveFilters =
    appliedMinPrice > MIN_PRICE_CENTS ||
    appliedMaxPrice < MAX_PRICE_CENTS ||
    cbFull ||
    fastPickup ||
    selectedBrands.length > 0 ||
    selectedDiscounts.length > 0 ||
    selectedRatings.length > 0;
  const visibleProducts =
    filteredProducts.length || hasActiveFilters ? filteredProducts : baseProducts;
  const sponsoredPageCount = Math.max(1, Math.ceil(config.sponsored.length / SPONSORED_PAGE_SIZE));
  const visibleSponsored = config.sponsored.slice(
    sponsoredPage * SPONSORED_PAGE_SIZE,
    (sponsoredPage + 1) * SPONSORED_PAGE_SIZE,
  );
  const availableBrands = useMemo(
    () =>
      Array.from(
        new Set([
          ...config.brands,
          ...baseProducts
            .map((product) => product.brand?.name)
            .filter((brand): brand is string => Boolean(brand)),
        ]),
      ),
    [baseProducts, config.brands],
  );
  const shownBrands = brandsExpanded ? availableBrands : availableBrands.slice(0, 5);
  const rangeSpan = MAX_PRICE_CENTS - MIN_PRICE_CENTS;
  const minPercent = ((minPrice - MIN_PRICE_CENTS) / rangeSpan) * 100;
  const maxPercent = ((maxPrice - MIN_PRICE_CENTS) / rangeSpan) * 100;

  const moveBanner = (direction: number) => {
    setBannerIndex((value) => (value + direction + config.banners.length) % config.banners.length);
  };
  const toggleValue = <T,>(value: T, setter: Dispatch<SetStateAction<T[]>>) => {
    setter((values) =>
      values.includes(value) ? values.filter((item) => item !== value) : [...values, value],
    );
  };

  return (
    <PageFrame store={store} categories={categories}>
      <main className="category-template-page">
        <div className="category-head container">
          <nav className="category-breadcrumb" aria-label="Navegação estrutural">
            <Link href="/">casasbahia.com.br</Link>
            <span aria-hidden="true">›</span>
            <strong>{config.breadcrumb}</strong>
          </nav>
          <h1>{config.title}</h1>
        </div>

        <section className="category-banner container" aria-label="Ofertas da categoria">
          <div className="category-banner-viewport">
            <div
              className="category-banner-track"
              style={{ transform: `translate3d(-${bannerIndex * 100}%,0,0)` }}
            >
              {config.banners.map((banner, index) =>
                banner.kind === 'image' ? (
                  <Link
                    className="category-banner-slide"
                    href={banner.href}
                    key={banner.src}
                    tabIndex={index === bannerIndex ? undefined : -1}
                    aria-hidden={index !== bannerIndex}
                  >
                    <Image
                      src={banner.src}
                      alt={banner.alt}
                      fill
                      priority={index === 0}
                      unoptimized
                    />
                  </Link>
                ) : (
                  <article
                    className="category-banner-slide category-product-banner"
                    key={banner.id}
                    aria-hidden={index !== bannerIndex}
                  >
                    <div className="category-product-banner-image">
                      <Image src={banner.image} alt={banner.alt} fill unoptimized />
                    </div>
                    <div className="category-product-banner-offer">
                      <h2>{banner.title}</h2>
                      {banner.flag && (
                        <span className="category-product-banner-flag">{banner.flag}</span>
                      )}
                      <p>
                        <del>{money.format(banner.compareAt / 100)}</del>{' '}
                        <b>Baixou {banner.discount}%</b>
                      </p>
                      <p>
                        <strong>{money.format(banner.installmentTotal / 100)}</strong> em até 1x de{' '}
                        <strong>{money.format(banner.price / 100)}</strong>
                      </p>
                      <div>
                        <span>
                          <b>{money.format(banner.price / 100)}</b>
                          <small>No Pix</small>
                        </span>
                        <Link href={banner.href} tabIndex={index === bannerIndex ? undefined : -1}>
                          Confira
                        </Link>
                      </div>
                    </div>
                  </article>
                ),
              )}
            </div>
          </div>
          <button
            className="category-banner-arrow previous"
            type="button"
            onClick={() => moveBanner(-1)}
            aria-label="Banner anterior"
          >
            ‹
          </button>
          <button
            className="category-banner-arrow next"
            type="button"
            onClick={() => moveBanner(1)}
            aria-label="Próximo banner"
          >
            ›
          </button>
          <div className="category-banner-dots">
            {config.banners.map((banner, index) => (
              <button
                key={banner.kind === 'image' ? banner.src : banner.id}
                type="button"
                className={index === bannerIndex ? 'active' : ''}
                onClick={() => setBannerIndex(index)}
                aria-label={`Exibir banner ${index + 1}`}
              />
            ))}
          </div>
          <button
            className="category-banner-playback"
            type="button"
            onClick={() => setBannerPaused((value) => !value)}
            aria-label={bannerPaused ? 'Retomar banners' : 'Pausar banners'}
          >
            {bannerPaused ? '▶' : 'Ⅱ'}
          </button>
        </section>

        <div className="category-body container">
          <aside className="category-filters" aria-label="Filtros de produtos">
            <section className="category-link-list">
              <strong>{config.title}</strong>
              {config.subcategories.map((item, index) => (
                <Link href={`/busca?q=${encodeURIComponent(item)}`} key={`${item}-${index}`}>
                  {item}
                </Link>
              ))}
            </section>

            <label className="category-switch-row">
              <span>CB Full</span>
              <input
                type="checkbox"
                checked={cbFull}
                onChange={(event) => setCbFull(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>
            <label className="category-switch-row">
              <span>Retira Rápido</span>
              <input
                type="checkbox"
                checked={fastPickup}
                onChange={(event) => setFastPickup(event.target.checked)}
              />
              <i aria-hidden="true" />
            </label>

            <div className="category-filter-stack">
              <details className="category-filter-box price-box" open>
                <summary>Preço</summary>
                <div className="category-price-fields">
                  <label>
                    De
                    <span>
                      <b>R$</b>
                      <input
                        aria-label="Preço mínimo"
                        inputMode="decimal"
                        value={priceInputFormatter.format(minPrice / 100)}
                        onChange={(event) =>
                          setMinPrice(
                            Math.min(
                              Math.max(
                                parsePriceInput(event.target.value, minPrice),
                                MIN_PRICE_CENTS,
                              ),
                              maxPrice - PRICE_STEP_CENTS,
                            ),
                          )
                        }
                      />
                    </span>
                  </label>
                  <label>
                    Até
                    <span>
                      <b>R$</b>
                      <input
                        aria-label="Preço máximo"
                        inputMode="decimal"
                        value={priceInputFormatter.format(maxPrice / 100)}
                        onChange={(event) =>
                          setMaxPrice(
                            Math.max(
                              Math.min(
                                parsePriceInput(event.target.value, maxPrice),
                                MAX_PRICE_CENTS,
                              ),
                              minPrice + PRICE_STEP_CENTS,
                            ),
                          )
                        }
                      />
                    </span>
                  </label>
                </div>
                <div className="category-range">
                  <span />
                  <i style={{ left: `${minPercent}%`, right: `${100 - maxPercent}%` }} />
                  <input
                    aria-label="Faixa mínima de preço"
                    type="range"
                    min={MIN_PRICE_CENTS}
                    max={MAX_PRICE_CENTS}
                    step={PRICE_STEP_CENTS}
                    value={minPrice}
                    onChange={(event) =>
                      setMinPrice(Math.min(Number(event.target.value), maxPrice - PRICE_STEP_CENTS))
                    }
                  />
                  <input
                    aria-label="Faixa máxima de preço"
                    type="range"
                    min={MIN_PRICE_CENTS}
                    max={MAX_PRICE_CENTS}
                    step={PRICE_STEP_CENTS}
                    value={maxPrice}
                    onChange={(event) =>
                      setMaxPrice(Math.max(Number(event.target.value), minPrice + PRICE_STEP_CENTS))
                    }
                  />
                </div>
                <div className="category-range-labels">
                  <small>Min {money.format(MIN_PRICE_CENTS / 100)}</small>
                  <small>Máx {money.format(MAX_PRICE_CENTS / 100)}</small>
                </div>
                <button
                  type="button"
                  className="category-apply-button"
                  onClick={() => {
                    setAppliedMinPrice(minPrice);
                    setAppliedMaxPrice(maxPrice);
                  }}
                >
                  Aplicar
                </button>
              </details>

              <details className="category-filter-box" open>
                <summary>Avaliação</summary>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <label className="category-check" key={rating}>
                    <input
                      type="checkbox"
                      checked={selectedRatings.includes(rating)}
                      onChange={() => toggleValue(rating, setSelectedRatings)}
                      aria-label={`${rating} ${rating === 1 ? 'estrela' : 'estrelas'} ou mais`}
                    />
                    <span aria-hidden="true">
                      {'★'.repeat(rating)}
                      <i>{'★'.repeat(5 - rating)}</i>
                    </span>
                  </label>
                ))}
              </details>

              <details className="category-filter-box" open>
                <summary>Marca</summary>
                {shownBrands.map((brand) => (
                  <label className="category-check brand-check" key={brand}>
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(brand)}
                      onChange={() => toggleValue(brand, setSelectedBrands)}
                    />
                    <span>{brand}</span>
                  </label>
                ))}
                {availableBrands.length > 5 && (
                  <button
                    type="button"
                    className="category-more-link"
                    onClick={() => setBrandsExpanded((value) => !value)}
                  >
                    {brandsExpanded ? 'Exibir menos' : 'Exibir mais'}
                  </button>
                )}
              </details>

              <details className="category-filter-box" open>
                <summary>Desconto</summary>
                {categoryDiscountOptions.map((discount) => (
                  <label className="category-check brand-check" key={discount}>
                    <input
                      type="checkbox"
                      checked={selectedDiscounts.includes(discount)}
                      onChange={() => toggleValue(discount, setSelectedDiscounts)}
                    />
                    <span>{discount}</span>
                  </label>
                ))}
              </details>
            </div>
          </aside>

          <div className="category-products">
            <section className="category-sponsored">
              <div className="category-section-heading">
                <div>
                  <h2>Produtos Patrocinados</h2>
                  <small>Patrocinado</small>
                </div>
              </div>
              <div className="category-sponsored-wrap">
                <div className="category-sponsored-grid" key={sponsoredPage}>
                  {visibleSponsored.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {sponsoredPage > 0 && (
                  <button
                    type="button"
                    className="category-shelf-arrow previous"
                    onClick={() => setSponsoredPage((value) => Math.max(0, value - 1))}
                    aria-label="Ver produtos patrocinados anteriores"
                  >
                    ‹
                  </button>
                )}
                {sponsoredPage < sponsoredPageCount - 1 && (
                  <button
                    type="button"
                    className="category-shelf-arrow next"
                    onClick={() =>
                      setSponsoredPage((value) => Math.min(sponsoredPageCount - 1, value + 1))
                    }
                    aria-label="Ver mais produtos patrocinados"
                  >
                    ›
                  </button>
                )}
              </div>
            </section>

            <section className="category-recommended">
              <div className="category-section-heading">
                <h2>Recomendados para você</h2>
              </div>
              {visibleProducts.length ? (
                <div className="category-product-grid">
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="category-no-products">
                  Nenhum produto corresponde aos filtros selecionados.
                </div>
              )}
            </section>

            <section className={`category-description${descriptionExpanded ? ' expanded' : ''}`}>
              <p>{config.description}</p>
              {descriptionExpanded && (
                <p>
                  Compare modelos, capacidades, câmeras, duração de bateria, conectividade e
                  recursos antes de escolher o aparelho ideal para sua rotina.
                </p>
              )}
              <button type="button" onClick={() => setDescriptionExpanded((value) => !value)}>
                {descriptionExpanded ? 'Ver menos' : 'Ver mais'}
              </button>
            </section>

            <section className="category-faq" aria-label="Perguntas frequentes">
              {config.faqs.map((faq) => (
                <details key={faq.question}>
                  <summary>
                    {faq.question}
                    <span aria-hidden="true">⌄</span>
                  </summary>
                  <p>{faq.answer}</p>
                </details>
              ))}
            </section>
          </div>
        </div>

        <section className="category-flash container">
          <div className="category-flash-heading">
            <h2>
              Ofertas Relâmpago <span>⚡</span>
            </h2>
            <div>
              <span>As ofertas se encerram em:</span>
              <b>◷</b>
              <strong>{String(clock.hours).padStart(2, '0')} H</strong>
              <strong>{String(clock.minutes).padStart(2, '0')} M</strong>
              <strong>{String(clock.seconds).padStart(2, '0')} S</strong>
            </div>
          </div>
          <div className="category-flash-grid">
            {config.flash.map((product) => (
              <FlashProduct key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>
    </PageFrame>
  );
}

function FlashProduct({ product }: { product: Product }) {
  const variant = product.variants[0];
  if (!variant) return null;
  const image = mediaUrl(product, variant);
  const rating = getProductRating(product);
  const reviewCount = product.card?.reviewCount ?? 0;
  return (
    <article className="category-flash-card">
      <Link href={`/busca?q=${encodeURIComponent(product.title)}`} className="category-flash-image">
        {image && <Image src={image} alt={product.title} fill unoptimized />}
      </Link>
      <div>
        <Link href={`/busca?q=${encodeURIComponent(product.title)}`}>{product.title}</Link>
        <span
          className="category-flash-rating"
          aria-label={`${rating.toLocaleString('pt-BR')} de 5 estrelas em ${reviewCount} avaliações`}
        >
          <ProductRatingStars rating={rating} /> <small>({reviewCount})</small>
        </span>
        <strong>{money.format(variant.price.amountCents / 100)}</strong>
        <small>
          Exclusivo Pix <b>{product.card?.discountPercent ?? 0}% OFF</b>
        </small>
      </div>
    </article>
  );
}
