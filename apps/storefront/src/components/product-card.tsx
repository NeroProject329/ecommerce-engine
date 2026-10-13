'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { mediaUrl, money, type Product } from '../lib/commerce';
import { useStore } from './store-context';

export function ProductCard({ product }: { product: Product }) {
  const { favorites, session, toggleFavorite, addItem, busy } = useStore();
  const variant = product.variants[0];
  if (!variant) return null;
  const image = mediaUrl(product, variant);
  const compare = variant.price.compareAtCents;
  const amount = variant.price.amountCents / 100;
  const installmentTotal = (product.card?.installmentTotalCents ?? variant.price.amountCents) / 100;
  const installmentCount = product.card?.installmentCount ?? 10;
  const installmentAmount = (product.card?.installmentAmountCents ?? Math.round(installmentTotal * 100 / installmentCount)) / 100;
  const discount = product.card?.discountPercent ?? (compare && compare > variant.price.amountCents ? Math.round((1 - variant.price.amountCents / compare) * 100) : 0);
  const href = product.isDemo ? `/busca?q=${encodeURIComponent(product.title)}` : `/produto/${product.slug}`;
  const reviewCount = product.card?.reviewCount ?? 0;
  async function favorite() {
    if (!session) { window.location.href = `/entrar?returnTo=${encodeURIComponent(location.pathname)}`; return; }
    await toggleFavorite(product);
  }
  return (
    <article className="cb-product-card">
      {!product.isDemo && <button className={`favorite ${favorites.has(product.id) ? 'active' : ''}`} onClick={()=>void favorite()} aria-label="Favoritar">♡</button>}
      {product.card?.promo && <span className={`card-promo card-promo-${product.card.promo}`}>
        {product.card.promo === 'exclusive'
          ? <Image src={product.id.startsWith('category-') ? '/category-assets/telefonia/imgi_8_selo-produtos-usados.png' : '/demo-products/selo-exclusivo.png'} alt="Produto exclusivo" width={72} height={72} unoptimized/>
          : product.card.promo.replace('-off', '% OFF')}
      </span>}
      <Link className="card-image" href={href}>
        {image ? <Image src={image} alt={product.title} fill sizes="220px" unoptimized/> : <span className="product-placeholder">{product.title.slice(0,1)}</span>}
      </Link>
      {product.card?.sponsored && <small className="card-sponsored">Patrocinado</small>}
      <Link className="card-title" href={href}>{product.title}</Link>
      <div className="rating" aria-label={`${reviewCount} avaliações`}><span>★★★★★</span> <small>({reviewCount})</small></div>
      {compare && compare > variant.price.amountCents && <div className="old-price">{money.format(compare/100)} <b>Baixou {discount}%</b></div>}
      <div className="installment">
        <span>{money.format(installmentTotal)} ou em até {installmentCount}x de</span>
        <span><b>{money.format(installmentAmount)}</b> sem juros ou</span>
      </div>
      <strong className="pix-price">{money.format(amount)}</strong>
      <small className="pix-label">No Pix</small>
      {product.card?.flags?.length ? <div className="card-flags">{product.card.flags.map((flag,index)=><span className={flag.includes('LANÇAMENTO') ? 'red' : flag.includes('RETIRA') ? 'blue' : 'yellow'} key={`${flag}-${index}`}>{flag}</span>)}</div> : null}
      {!product.isDemo && <button className="quick-buy" disabled={busy} onClick={()=>void addItem(variant)}>Adicionar</button>}
    </article>
  );
}

export function ProductShelf({ title, products, accent, compact = false }: { title: string; products: Product[]; accent?: string; compact?: boolean }) {
  const [page,setPage] = useState(0);
  const renderedItemCount = products.length || 10;
  const pageCount = Math.max(1,Math.ceil(renderedItemCount/5));
  const gapOffset = Array.from({length:page},()=>'- var(--product-gap)').join(' ');
  const trackTransform = page === 0 ? 'translate3d(0,0,0)' : `translate3d(calc(-${page * 100}% ${gapOffset}),0,0)`;

  useEffect(() => {
    setPage((value)=>Math.min(value,pageCount-1));
  },[pageCount]);

  return <section className={`product-shelf container${compact ? ' compact-shelf' : ''}`}>
    <div className="shelf-heading"><h2>{title} {accent && <em>{accent}</em>}</h2></div>
    <div className="product-row-wrap">
      <div className="product-carousel-viewport">
        <div className={`product-row product-carousel-track${products.length ? '' : ' empty-slots'}`} style={{transform:trackTransform}}>
          {products.length ? products.map((product)=><ProductCard key={product.id} product={product}/>) : <EmptyProductSlots count={10}/>}
        </div>
      </div>
      {page > 0 && <button className="shelf-arrow shelf-previous" type="button" onClick={()=>setPage((value)=>Math.max(0,value-1))} aria-label={`Ver produtos anteriores em ${title}`}>‹</button>}
      {page < pageCount-1 && <button className="shelf-arrow shelf-next" type="button" onClick={()=>setPage((value)=>Math.min(pageCount-1,value+1))} aria-label={`Ver mais produtos em ${title}`}>›</button>}
    </div>
  </section>;
}

export function EmptyProductSlots({ count = 5 }: { count?: number }) {
  return <>{Array.from({length:count},(_,index)=><div className="empty-product" key={index}><div className="empty-product-image"><span>{index % 2 ? '▯' : '▢'}</span></div><b>Produto publicado pelo painel</b><span className="empty-stars">★★★★★ <small>(0)</small></span><i/><i/><strong>R$ —</strong><small>no PIX</small></div>)}</>;
}
