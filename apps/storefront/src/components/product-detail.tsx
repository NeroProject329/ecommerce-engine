'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  mediaUrl,
  money,
  publicApi,
  STORE_SLUG,
  type Category,
  type Product,
  type ShippingQuote,
  type Store,
} from '../lib/commerce';
import { referenceProduct, referenceProductShelves } from '../lib/product-detail-template-data';
import { Breadcrumbs, PageFrame } from './chrome';
import { ProductRatingStars, ProductShelf } from './product-card';
import { useStore } from './store-context';

type DetailTab = 'features' | 'technical' | 'contact';
type ModalKind = 'details' | 'payment' | null;

type DetailRow = readonly [label: string, value: string, wide?: boolean];

const referenceFeatureRows: DetailRow[] = [
  ['Memória total', '256GB'],
  ['Tecnologia', '5G'],
  ['Tamanho da Tela', 'Acima de 6"'],
  ['Código de Referência', 'Não informado'],
  ['Tipo', 'Flip'],
  ['Grava vídeo', 'Sim'],
  ['Slot para cartão', 'Não informado'],
  ['Cartão incluso', 'Não informado'],
  ['Rádio FM', 'Não'],
  ['MP3 player', 'Sim'],
  ['Bluetooth', 'Sim'],
  ['Bluetooth Estéreo (ouça suas músicas em um dispositivo Bluetooth)', 'Sim'],
  ['Wi-Fi', 'Sim'],
  ['TV-Out', 'Não'],
  ['Sincronização com PC', 'Sim'],
  ['HSDPA (maior velocidade em download)', 'Sim'],
  ['Visualizador de arquivos', 'Sim'],
  ['Browser de internet', 'HTML'],
  ['Suporte a GPS', 'Sim'],
  ['Mensagens', 'SMS | MMS | E-mail'],
  ['Toques', 'MP3'],
  ['Sistema Operacional', '- iOS - iOS'],
  ['Processador', 'Chip A20 Pro'],
  ['RAM', 'Não informado'],
  ['Memória interna', '256GB'],
  ['Som', 'MP3 Player'],
  [
    'Características Gerais',
    'Tela ProMotion de 6,9 polegadas, Câmera Fusion principal de 48MP com abertura variável, maior duração de bateria, chip A20 Pro, estrutura unibody em alumínio, parte de trás em vidro, Ceramic Shield na frente e atrás, Câmera frontal Center Stage de 18 MP, Duplo Neural Engine de 16 núcleos, GPU até 40% mais rápida, Detecção de Acidente, Wi-Fi 7, rede celular 5G, Bluetooth 6, eSIM integrado.',
    true,
  ],
];

const referenceTechnicalRows: DetailRow[] = [
  ['Conectividade', '- 5G - Wi-Fi 7 | 5G | Bluetooth 6'],
  ['Quadriband GSM', 'Sim'],
  ['Resolução do visor/display (pixels)', 'Não informado'],
  ['Duração da bateria (em uso)', 'Até 29 horas'],
  ['Duração da bateria (stand by)', 'Não informado'],
  ['Tamanho do visor (cm)', '17.53'],
  ['Tipo do Chip', 'eSIM'],
  ['Bateria removível', 'Não'],
  ['Bateria (mAh)', 'Não informado'],
  ['Bateria', 'Acima de 3.100 mAh'],
  ['Resolução câmera frontal', '- 9.0 MP ou mais - 18MP'],
  ['Resolução câmera traseira', 'Acima de 14.1 MP'],
  ['Câmera', 'Câmera Traseira Tripla | Câmera Frontal'],
  ['Resolução da câmera traseira', '48MP'],
  ['Resolução câmera frontal dupla', 'Não informado'],
  ['Resolução câmera traseira dupla', 'Não informado'],
  ['Resolução câmera traseira tripla', '48MP'],
  ['Resolução câmera traseira quádrupla', 'Não informado'],
  ['Número Homologação Anatel', '053542601993'],
  ['Tensão/Voltagem', 'Bivolt'],
  ['Garantia', 'Não informado'],
  ['Conteúdo da Embalagem', 'Não informado'],
];

const detailAsset = (name: string) => `/product-assets/iphone-18-pro-max/${name}`;

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className={filled ? 'detail-icon-filled' : ''} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <Image className="detail-share-icon" src={detailAsset('imgi_109_default.svg')} alt="" width={23} height={23} />
  );
}

function Chevron({ direction = 'right' }: { direction?: 'left' | 'right' | 'down' }) {
  return <span className={`detail-chevron detail-chevron-${direction}`} aria-hidden="true" />;
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button className="detail-close" type="button" onClick={onClick} aria-label="Fechar">
      <span />
      <span />
    </button>
  );
}

function ModalShell({ title, onClose, className = '', children }: { title: string; onClose: () => void; className?: string; children: ReactNode }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.body.classList.add('detail-modal-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('detail-modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);
  return (
    <div className="detail-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`detail-modal ${className}`} role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => event.stopPropagation()}>
        <header><h2>{title}</h2><CloseButton onClick={onClose} /></header>
        {children}
      </section>
    </div>
  );
}

function DetailsModal({ product, initialTab, onClose }: { product: Product; initialTab: DetailTab; onClose: () => void }) {
  const [tab, setTab] = useState<DetailTab>(initialTab);
  const brandName = product.brand?.name ?? 'fabricante';
  const isReference = product.id === referenceProduct.id;
  const title = tab === 'features' ? 'Características' : tab === 'technical' ? 'Especificações Técnicas' : `Contato ${brandName}`;
  const attributeRows: DetailRow[] = product.attributes?.length
    ? product.attributes.map((attribute) => [attribute.name, `${String(attribute.value)}${attribute.unit ? ` ${attribute.unit}` : ''}`])
    : [];
  const rows = tab === 'technical'
    ? (isReference ? referenceTechnicalRows : attributeRows)
    : (isReference ? referenceFeatureRows : attributeRows);
  return (
    <ModalShell title={title} onClose={onClose} className="details-modal">
      <div className="detail-modal-tabs" role="tablist">
        <button className={tab === 'features' ? 'active' : ''} onClick={() => setTab('features')} type="button">Características</button>
        <button className={tab === 'technical' ? 'active' : ''} onClick={() => setTab('technical')} type="button">Especificações Técnicas</button>
        <button className={tab === 'contact' ? 'active' : ''} onClick={() => setTab('contact')} type="button">Contato {brandName}</button>
      </div>
      {tab === 'contact' ? (
        <dl className="detail-contact-grid">
          <div><dt>Telefone</dt><dd>{isReference ? '0800-761-0880' : 'Não informado'}</dd></div>
          <div><dt>E-mail/Site</dt><dd>{isReference ? <a href="https://www.apple.com/br/contact/" target="_blank" rel="noreferrer">https://www.apple.com/br/contact/</a> : 'Não informado'}</dd></div>
        </dl>
      ) : (
        <dl className="detail-spec-grid">{rows.map(([label, value, wide], index) => <div className={wide ? 'detail-spec-wide' : undefined} key={`${label}-${index}`}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      )}
    </ModalShell>
  );
}

function PaymentModal({ product, onClose }: { product: Product; onClose: () => void }) {
  const [method, setMethod] = useState<'store' | 'credit' | 'pix'>('credit');
  const variant = product.variants[0];
  if (!variant) return null;
  const base = (variant.price.compareAtCents ?? variant.price.amountCents) / 100;
  const pix = variant.price.amountCents / 100;
  return (
    <ModalShell title="Formas de pagamento" onClose={onClose} className="payment-modal">
      <div className="payment-modal-layout">
        <nav aria-label="Formas de pagamento">
          <button className={method === 'store' ? 'active' : ''} onClick={() => setMethod('store')} type="button"><b>B.</b><span>Cartão Casas Bahia<br />(Visa)</span></button>
          <button className={method === 'credit' ? 'active' : ''} onClick={() => setMethod('credit')} type="button"><b>▰</b><span>Cartão de Crédito</span></button>
          <button className={method === 'pix' ? 'active' : ''} onClick={() => setMethod('pix')} type="button"><b>◆</b><span>Pix</span></button>
        </nav>
        <div className="payment-options">
          <div className="payment-product">{mediaUrl(product, variant) && <Image src={mediaUrl(product, variant)!} alt="" width={64} height={64} unoptimized />}<span>{product.title}<strong>{money.format(base)}</strong></span></div>
          <h3>{method === 'store' ? 'Cartão Casas Bahia' : method === 'credit' ? 'Cartão de Crédito' : 'Pix'}</h3>
          {method === 'pix' ? (
            <div className="pix-payment-copy"><strong>{money.format(pix)}</strong><p>Pagamento à vista com 10% de desconto. A aprovação costuma acontecer em poucos minutos.</p></div>
          ) : (
            <div className="installment-table">
              <div className="table-head"><span>QTD PARCELAS</span><span>VALOR TOTAL</span></div>
              <div className="cash-row"><span>À vista com 10% de desconto</span><strong>{money.format(pix)}</strong></div>
              {Array.from({ length: method === 'store' ? 18 : 11 }, (_, index) => index + 2).map((count) => {
                const withInterest = count > 6;
                const total = withInterest ? base * (1 + (count - 6) * 0.0115) : base;
                return <div key={count}><span>{count}x {money.format(total / count)} {withInterest ? '*' : 'sem juros'}</span><strong>{money.format(total)}</strong></div>;
              })}
            </div>
          )}
          <small>*Parcela mínima de R$ 5,00 nas compras com juros.<br />*Parcelamento em cartões de bandeiras: juros a partir de 1,99% a.m.</small>
        </div>
      </div>
    </ModalShell>
  );
}

function ProductLightbox({ title, images, imageIndex, setImageIndex, onClose }: { title: string; images: string[]; imageIndex: number; setImageIndex: (index: number) => void; onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') setImageIndex((imageIndex + 1) % images.length);
      if (event.key === 'ArrowLeft') setImageIndex((imageIndex - 1 + images.length) % images.length);
    };
    document.body.classList.add('detail-modal-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('detail-modal-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [imageIndex, images.length, onClose, setImageIndex]);
  return (
    <div className="product-lightbox" role="dialog" aria-modal="true" aria-label={`Galeria de ${title}`}>
      <CloseButton onClick={onClose} />
      <button className="lightbox-arrow lightbox-prev" type="button" onClick={() => setImageIndex((imageIndex - 1 + images.length) % images.length)} aria-label="Imagem anterior"><Chevron direction="left" /></button>
      <div className="lightbox-stage"><Image src={images[imageIndex]!} alt={`${title} - imagem ${imageIndex + 1}`} fill sizes="75vw" unoptimized priority /></div>
      <aside><h2>{title}</h2><div>{images.map((src, index) => <button className={index === imageIndex ? 'active' : ''} type="button" key={src} onClick={() => setImageIndex(index)}><Image src={src} alt="" fill sizes="74px" unoptimized /></button>)}</div></aside>
      <button className="lightbox-arrow lightbox-next" type="button" onClick={() => setImageIndex((imageIndex + 1) % images.length)} aria-label="Próxima imagem"><Chevron /></button>
      <span className="lightbox-count">{imageIndex + 1} de {images.length}</span>
    </div>
  );
}

function ProductGallery({ product, images, imageIndex, setImageIndex, onFavorite, favorite }: { product: Product; images: string[]; imageIndex: number; setImageIndex: (index: number) => void; onFavorite: () => void; favorite: boolean }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const activeImage = images[imageIndex];
  function updateZoom(event: ReactMouseEvent<HTMLButtonElement>) {
    const box = event.currentTarget.getBoundingClientRect();
    setZoom({ x: ((event.clientX - box.left) / box.width) * 100, y: ((event.clientY - box.top) / box.height) * 100 });
  }
  async function share() {
    const shareData = { title: product.title, url: window.location.href };
    if (navigator.share) await navigator.share(shareData).catch(() => undefined);
    else await navigator.clipboard?.writeText(window.location.href).catch(() => undefined);
  }
  return (
    <div className="product-gallery-column">
      <div className="product-gallery-stage-wrap">
        <button className="product-gallery-stage" type="button" onClick={() => images.length > 0 && setLightboxOpen(true)} onMouseMove={updateZoom} onMouseEnter={updateZoom} onMouseLeave={() => setZoom(null)} aria-label="Ampliar imagem do produto">
          {activeImage ? <Image src={activeImage} alt={product.title} fill priority loading="eager" sizes="520px" unoptimized /> : <span className="product-placeholder">{product.title.slice(0, 1)}</span>}
          {zoom && <span className="zoom-lens" style={{ left: `${zoom.x}%`, top: `${zoom.y}%` }} />}
        </button>
        <div className="gallery-actions">
          <button type="button" className={favorite ? 'active' : ''} onClick={onFavorite} aria-label={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}><HeartIcon filled={favorite} /></button>
          <button type="button" onClick={() => void share()} aria-label="Compartilhar produto"><ShareIcon /></button>
        </div>
        {zoom && activeImage && <div className="zoom-preview" style={{ backgroundImage: `url(${activeImage})`, backgroundPosition: `${zoom.x}% ${zoom.y}%` }} />}
      </div>
      <div className="product-thumbnails" aria-label="Imagens do produto">{images.map((src, index) => <button className={index === imageIndex ? 'active' : ''} type="button" key={src} onClick={() => setImageIndex(index)} aria-label={`Ver imagem ${index + 1}`}><Image src={src} alt="" fill sizes="74px" unoptimized /></button>)}</div>
      {lightboxOpen && images.length > 0 && <ProductLightbox title={product.title} images={images} imageIndex={imageIndex} setImageIndex={setImageIndex} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}

function ProductFacts({ product, onOpen }: { product: Product; onOpen: (tab: DetailTab) => void }) {
  const fallback = referenceProduct.attributes?.slice(0, 4) ?? [];
  const facts = (product.attributes?.length ? product.attributes : fallback).slice(0, 4);
  return (
    <section className="product-facts"><header><h2>Características do produto</h2><button type="button" onClick={() => onOpen('features')}>Ver mais <Chevron /></button></header><div>{facts.map((attribute) => <span key={attribute.code}><small>{attribute.name}</small><strong>{String(attribute.value)}{attribute.unit ? ` ${attribute.unit}` : ''}</strong></span>)}</div></section>
  );
}

function ProductPurchasePanel({ product, onPayment, onBuy, busy }: { product: Product; onPayment: () => void; onBuy: () => void; busy: boolean }) {
  const variant = product.variants[0]!;
  const compare = variant.price.compareAtCents ?? variant.price.amountCents;
  const installmentCount = product.card?.installmentCount ?? 6;
  const installmentAmount = (product.card?.installmentAmountCents ?? Math.round(compare / installmentCount)) / 100;
  const [postalCode, setPostalCode] = useState('13308-135');
  const [quoteBusy, setQuoteBusy] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[]>(product.isDemo ? [{ id: 'reference-normal', carrier: 'Casas Bahia', service: 'Normal', amountCents: 3321, estimatedDaysMin: 7, estimatedDaysMax: 9 }] : []);
  const [address, setAddress] = useState(product.isDemo ? 'Rua Mirandópolis, Cidade Nova I - Itu - SP' : '');
  function changePostal(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setPostalCode(digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits);
  }
  async function calculateShipping() {
    setQuoteBusy(true);
    try {
      if (product.isDemo) {
        const digits = postalCode.replace(/\D/g, '');
        setAddress(digits === '01001000' ? 'Praça da Sé, Sé - São Paulo - SP' : 'Rua Mirandópolis, Cidade Nova I - Itu - SP');
        setQuotes([{ id: `reference-${digits}`, carrier: 'Casas Bahia', service: 'Normal', amountCents: digits === '01001000' ? 2870 : 3321, estimatedDaysMin: 7, estimatedDaysMax: 9 }]);
        return;
      }
      const temp = await publicApi<{ cartId: string; cartToken: string }>(`/v1/public/stores/${STORE_SLUG}/carts`, { method: 'POST' });
      await publicApi(`/v1/public/stores/${STORE_SLUG}/carts/${temp.cartId}/items`, { method: 'PUT', headers: { 'content-type': 'application/json', 'x-cart-token': temp.cartToken }, body: JSON.stringify({ variantId: variant.id, quantity: 1 }) });
      const result = await publicApi<ShippingQuote>(`/v1/public/stores/${STORE_SLUG}/carts/${temp.cartId}/shipping-quotes`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cart-token': temp.cartToken }, body: JSON.stringify({ destinationPostalCode: postalCode.replace(/\D/g, '') }) });
      setQuotes([result]);
    } finally {
      setQuoteBusy(false);
    }
  }
  return (
    <div className="product-purchase-panel">
      <div className="seller-line"><Image src={detailAsset('imgi_110_default.svg')} alt="" width={21} height={21} /> Vendido e entregue por <a href="#seller">MOBCOMSTORE</a></div>
      <div className="product-feedback"><ProductRatingStars rating={product.card?.ratingAverage ?? 0} /><strong>{(product.card?.ratingAverage ?? 0).toFixed(1)}</strong><a href="#reviews"><Image src={detailAsset('imgi_112_default.svg')} alt="" width={16} height={16} />Sem avaliações</a><a href="#questions"><Image src={detailAsset('imgi_113_default.svg')} alt="" width={16} height={16} />Sem perguntas</a></div>
      <p className="product-installment-summary">{money.format(compare / 100)} em até <strong>{installmentCount}x de {money.format(installmentAmount)}</strong> sem juros no cartão de crédito.</p>
      <div className="product-price-buy"><div><strong>{money.format(variant.price.amountCents / 100)}</strong><span>no PIX com <b>10% de desconto</b></span></div><button className="buy-button" type="button" disabled={busy} onClick={onBuy}>{busy ? 'Aguarde...' : 'Comprar'}</button></div>
      <button className="more-payment" type="button" onClick={onPayment}>Ver mais opções de pagamento <Chevron /></button>
      <div className="preapproved-credit"><span>Talvez você tenha um <strong>crédito pré-aprovado.</strong> Que tal conferir?</span><Link href="/institucional/cartao"><Image src={detailAsset('imgi_115_default.svg')} alt="" width={16} height={16} />Ver agora</Link></div>
      <section className="product-shipping">
        <header><h2>Calcular o frete e prazo de entrega</h2><div><input value={postalCode} inputMode="numeric" aria-label="CEP" onChange={(event) => changePostal(event.target.value)} placeholder="00000-000" /><button type="button" onClick={() => void calculateShipping()} disabled={quoteBusy || postalCode.replace(/\D/g, '').length !== 8}>{quoteBusy ? 'Consultando...' : 'Consultar'}</button></div></header>
        {address && <div className="shipping-address"><Image src={detailAsset('imgi_116_default.svg')} alt="" width={17} height={17} />{address}</div>}
        {quotes.length > 0 && <div className="shipping-result"><h3>Receba em casa</h3>{quotes.map((quote) => <div key={quote.id}><span>{quote.service}</span><span>até {quote.estimatedDaysMax + 11} de outubro, terça</span><strong>{money.format(quote.amountCents / 100)}</strong></div>)}<a href="#shipping-rules">Ver regras de frete</a></div>}
      </section>
    </div>
  );
}

function ProductInformation({ product, onOpen }: { product: Product; onOpen: (tab: DetailTab) => void }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <>
      <div className="product-legal-notice"><strong><Image src={detailAsset('imgi_119_default.svg')} alt="" width={20} height={20} />Aviso legal</strong><p>Para consultar a homologação do produto, acesse: sistemas.anatel.gov.br/sch</p></div>
      <section className={`product-copy ${expanded ? 'expanded' : ''}`}><header><h2>Descrição do produto</h2><Image src={detailAsset('imgi_125_default.svg')} alt="" width={12} height={8} /></header><div><p>{product.description || 'A descrição cadastrada no painel administrativo aparecerá aqui.'}</p></div><button type="button" onClick={() => setExpanded((value) => !value)}>{expanded ? 'Ver menos informações' : 'Ver mais informações'}</button></section>
      <div className="product-info-links"><button type="button" onClick={() => onOpen('features')}>Características <Image src={detailAsset('imgi_121_default.svg')} alt="" width={20} height={20} /></button><button type="button" onClick={() => onOpen('technical')}>Especificações Técnicas <Image src={detailAsset('imgi_122_default.svg')} alt="" width={20} height={20} /></button><button type="button" onClick={() => onOpen('contact')}>Contato {product.brand?.name ?? 'fabricante'} <Image src={detailAsset('imgi_123_default.svg')} alt="" width={20} height={20} /></button></div>
      <button className="report-product" type="button">Denunciar produto</button>
    </>
  );
}

export function ProductDetail({ store, categories, product, related }: { store: Store; categories: Category[]; product: Product; related: Product[] }) {
  const { addItem: addToCart, toggleFavorite, favorites, session, busy } = useStore();
  const variant = product.variants[0];
  const gallery = useMemo(() => {
    const candidates = [...(variant?.media ?? []), ...product.media].map((media) => media.renditions?.[0]?.url ?? media.url).filter(Boolean);
    return [...new Set(candidates.map((url) => url!.startsWith('/product-assets/') || url!.startsWith('/demo-products/') || url!.startsWith('/category-assets/') ? url! : mediaUrl({ ...product, media: [{ url: url! }] }, variant) ?? url!))];
  }, [product, variant]);
  const [imageIndex, setImageIndex] = useState(0);
  const [modal, setModal] = useState<ModalKind>(null);
  const [detailsTab, setDetailsTab] = useState<DetailTab>('features');
  const [localFavorite, setLocalFavorite] = useState(false);
  const isReference = product.id === referenceProduct.id;
  const shelves = isReference ? referenceProductShelves : { sponsored: related, combine: related, recommended: [...related].reverse(), similar: related };
  const activeFavorite = product.isDemo ? localFavorite : favorites.has(product.id);
  if (!variant) return <PageFrame store={store} categories={categories}><main className="simple-page container"><h1>Produto indisponível</h1><p>Publique uma variante com preço e estoque pelo painel administrativo.</p></main></PageFrame>;
  const selectedVariant = variant;
  function openDetails(tab: DetailTab) { setDetailsTab(tab); setModal('details'); }
  async function favorite() {
    if (product.isDemo) { setLocalFavorite((value) => !value); return; }
    if (!session) { window.location.href = `/entrar?returnTo=/produto/${product.slug}`; return; }
    await toggleFavorite(product);
  }
  async function buy() {
    if (product.isDemo) { window.location.href = `/protecao?produto=${encodeURIComponent(product.slug)}`; return; }
    await addToCart(selectedVariant);
    window.location.href = `/protecao?produto=${encodeURIComponent(product.slug)}`;
  }
  return (
    <PageFrame store={store} categories={categories}>
      <main className="product-page">
        <div className="container product-heading"><Breadcrumbs items={[{ label: 'Telefones e Celulares', href: `/categoria/${product.primaryCategory.slug}` }, { label: 'Smartphones', href: '/categoria/celulares-e-smartphones' }, { label: product.title.includes('iPhone') ? 'iPhone' : (product.brand?.name ?? 'Produto') }]} /><h1>{product.title}</h1><p>(Cód. Item {variant.sku ?? variant.id.slice(0, 10)}) <span /> Outros produtos <Link href={`/busca?q=${encodeURIComponent(product.brand?.name ?? product.title)}`}>{product.brand?.name ?? ''}</Link></p></div>
        <div className="product-rule container" />
        <section className="product-main container"><div><ProductGallery product={product} images={gallery} imageIndex={imageIndex} setImageIndex={setImageIndex} onFavorite={() => void favorite()} favorite={activeFavorite} /><ProductFacts product={product} onOpen={openDetails} /></div><ProductPurchasePanel product={product} onPayment={() => setModal('payment')} onBuy={() => void buy()} busy={busy} /></section>
        <ProductShelf title="Produtos Patrocinados" subtitle="Patrocinado" products={shelves.sponsored} />
        <div className="container"><ProductInformation product={product} onOpen={openDetails} /></div>
        <ProductShelf title="Itens que combinam com seu produto" products={shelves.combine} />
        <ProductShelf title="Acreditamos que você pode gostar" products={shelves.recommended} />
        <section id="reviews" className="product-empty-section container"><h2>Avaliações de Clientes</h2><div><strong>Ainda não há avaliações sobre este produto.</strong></div></section>
        <ProductShelf title="Similares ao que você está vendo" products={shelves.similar} />
        <section id="questions" className="product-questions container"><h2>Dúvidas sobre o produto</h2><div className="question-search"><input placeholder="Busque uma pergunta já feita" aria-label="Buscar pergunta" /><button type="button" aria-label="Buscar">⌕</button></div><div><strong>Ainda não fizeram perguntas sobre este produto.</strong><p>Quer saber algo antes de comprar?</p><button type="button">Faça uma pergunta</button></div></section>
        <section className="important-information container"><h2>Informações importantes</h2><ul><li>As imagens são meramente ilustrativas.</li><li>Verifique a voltagem, medidas e compatibilidade antes da compra.</li><li>Os preços e condições podem variar conforme o CEP e a forma de pagamento.</li></ul></section>
      </main>
      {modal === 'details' && <DetailsModal product={product} initialTab={detailsTab} onClose={() => setModal(null)} />}
      {modal === 'payment' && <PaymentModal product={product} onClose={() => setModal(null)} />}
    </PageFrame>
  );
}
