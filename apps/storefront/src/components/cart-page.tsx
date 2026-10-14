'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CART_SELECTION_KEY,
  cartDocumentSources,
  fallbackCartSelection,
  getCartProductPriceCents,
  getCartServicePriceCents,
  type CartDocumentKind,
  type CartProtectionSelection,
  type CartSelectionSnapshot,
} from '../lib/cart-template-data';
import { mediaUrl, money, type Product, type Store } from '../lib/commerce';
import {
  buildProtectionTemplate,
  type ProtectionPlan,
} from '../lib/protection-template-data';
import { PageFrame } from './chrome';
import { ProductShelf } from './product-card';
import { useStore } from './store-context';

const asset = (name: string) => `/cart-assets/${name}`;

type CartDialog =
  | { kind: 'edit'; planId: 'warranty' | 'insurance' }
  | { kind: 'document'; document: CartDocumentKind }
  | null;

type DisplayItem = {
  id: string;
  variantId: string;
  title: string;
  quantity: number;
  unitPriceCents: number;
  product?: Product;
  image?: string;
  seller: string;
};

function formatPostalCode(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function getPlanOptions(plan: ProtectionPlan) {
  const options = plan.options ?? plan.coverages?.flatMap((coverage) => coverage.options) ?? [];
  return [...new Map(options.map((option) => [option.id, option])).values()];
}

function getOptionBenefits(plan: ProtectionPlan, optionId: string) {
  if (plan.benefits) return plan.benefits;
  return plan.coverages?.find((coverage) => coverage.options.some((option) => option.id === optionId))?.benefits ?? [];
}

function getBenefitTitle(planId: 'warranty' | 'insurance', index: number) {
  const titles = planId === 'warranty'
    ? ['Economia', 'Cobertura', 'Visita Técnica', 'Troca Imediata', 'Reparo', 'Qualidade']
    : ['Reparo especializado', 'Economia', 'Cobertura', 'Mais tranquilidade'];
  return titles[index] ?? 'Benefício';
}

const warrantyImportantInformation = [
  'É proibido condicionar desconto no preço do bem à aquisição do seguro.',
  'A comercialização de seguro é fiscalizada pela SUSEP. O registro deste plano na SUSEP não implica, por parte da Autarquia, incentivo ou recomendação a sua comercialização. Acesse www.susep.gov.br ou ligue para 0800 021 8484.',
  'A Via Varejo S.A. CNPJ: 33.041.260/0652-90 é representante do Seguro de Garantia Estendida Original da Zurich Minas Brasil Seguros S.A. Processo SUSEP: 15414.900523/2014-77. CNPJ: 17.197.385/0001-21. Avenida Getúlio Vargas, 1.420, 5º andar, Funcionários - Belo Horizonte/MG, CEP: 30.112-021. Central de Atendimento para abertura de sinistro: 4020-4848 (regiões metropolitanas) ou 0800 285 4141 (para demais regiões), de segunda à sexta das 08h00 às 20h00 e aos sábados das 08h00 às 18h00. Informação, dúvida e reclamação: Serviço de Atendimento ao Consumidor (SAC) 0800 284 4848, disponível 24 horas por dia e 7 dias por semana. Pessoas com deficiência auditiva ou de fala: 0800 275 8585. Ouvidoria: 0800 770 1061, de segunda à sexta das 09h00 às 18h00, ou Caixa Postal 67.600, CEP: 03162-971 - São Paulo/SP, ou pelo site www.zurich.com.br. As condições contratuais deste produto protocolizadas pela sociedade junto à SUSEP poderão ser consultadas no endereço eletrônico www.susep.gov.br, de acordo com o número de processo constante no bilhete. Consulte as Condições Contratuais deste seguro e o Extrato do Contrato de Representação nas nossas lojas físicas.',
  'Este website é credenciado e habilitado a realizar em nome da seguradora os seguintes serviços: oferta e promoção de planos de seguro, recepção de propostas, emissão de bilhetes, recolhimento de prêmios, coleta e fornecimento à sociedade seguradora dos dados cadastrais e de documentação dos segurados, bem como orientação e assistência, no que compete aos contratos de seguros, aos segurados e seus beneficiários.',
];

const insuranceImportantInformation = [
  'É proibido condicionar desconto no preço do bem à aquisição do seguro.',
  'A comercialização de seguro é fiscalizada pela SUSEP. O registro deste plano na SUSEP não implica, por parte da Autarquia, incentivo ou recomendação a sua comercialização”. Acesse www.susep.gov.br ou ligue para 0800 021 8484.',
  'A Via Varejo S.A.CNPJ: 33.041.260/0652-90 é representante do Seguro de Garantia Estendida Original da Zurich Minas Brasil Seguros S.A. Processo SUSEP: 15414.900523/2014-77. CNPJ: 17.197.385/0001-21 Avenida Getúlio Vargas, 1.420, 5º andar Funcionários - Belo Horizonte/MG CEP: 30.112-021. Central de Atendimento para abertura de sinistro: 4020-4848 (regiões metropolitanas) ou 0800 285 4141 (para demais regiões) para as demais regiões de segunda à sexta das 08h00 ás 20h00 e aos sábados das 08:00h às 18:00. Informação, dúvida e reclamação ligue para o Serviço de Atendimento ao Consumidor (SAC) 0800 284 4848 disponível 24 horas por dia e 7 dias por semana. Pessoas com deficiência auditiva ou de fala: 0800 275 8585. Ouvidoria: 0800 770 1061 de segunda à sexta das 09h00 às 18h00 ou Caixa Postal 67.600, CEP: 03162-971 - São Paulo -SP ou pelo site www.zurich.com.br. As condições contratuais deste produto protocolizadas pela sociedade junto à SUSEP poderão ser consultadas no endereço eletrônico www.susep.gov.br, de acordo com o número de processo constante no bilhete. Consulte as Condições Contratuais deste seguro e o Extrato do Contrato de Representação nas nossas lojas físicas.',
  'Este website é credenciado e habilitado a realizar em nome da seguradora os seguintes serviços: oferta e promoção de planos de seguro, recepção de propostas, emissão de bilhetes, recolhimento de prêmios, coleta e fornecimento à sociedade seguradora dos dados cadastrais e de documentação dos segurados, bem como orientação e assistência, no que compete aos contratos de seguros, aos segurados e seus beneficiários.',
];

function serviceTitle(planId: CartProtectionSelection['planId'], quantity: number) {
  if (planId === 'warranty') return `${quantity}x Garantia Estendida`;
  if (planId === 'insurance') return `${quantity}x Seguro Roubo e Furto + Quebra`;
  return 'Suporte Super Help 64GB';
}

function CheckedBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      className="cb-cart-check"
      type="button"
      data-checked={checked}
      aria-pressed={checked}
      aria-label={label}
      onClick={onChange}
    >
      {checked ? '✓' : ''}
    </button>
  );
}

function QuantityPicker({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  onChange: (quantity: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const quantities = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    if (!open) return;

    const closeOnOutsidePress = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePress);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePress);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  return (
    <div className="cb-cart-quantity" data-open={open} ref={rootRef}>
      <button
        className="cb-cart-quantity-trigger"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{String(value).padStart(2, '0')} un</span>
        <span className="cb-cart-quantity-chevron" aria-hidden="true">
          <Image className="cb-cart-quantity-chevron-down" src={asset('imgi_20_default.svg')} alt="" width={16} height={16} />
          <Image className="cb-cart-quantity-chevron-up" src={asset('imgi_26_default.svg')} alt="" width={16} height={16} />
        </span>
      </button>
      <div className="cb-cart-quantity-menu" role="listbox" aria-label={label} aria-hidden={!open}>
        {quantities.map((quantity) => (
          <button
            type="button"
            role="option"
            aria-selected={quantity === value}
            tabIndex={open ? 0 : -1}
            key={quantity}
            onClick={() => {
              onChange(quantity);
              setOpen(false);
            }}
          >
            {String(quantity).padStart(2, '0')} un
          </button>
        ))}
      </div>
    </div>
  );
}

function DocumentDialog({ document, onClose }: { document: CartDocumentKind; onClose: () => void }) {
  const source = cartDocumentSources[document];
  const [content, setContent] = useState('Carregando conteúdo...');

  useEffect(() => {
    let active = true;
    fetch(source.path)
      .then((response) => {
        if (!response.ok) throw new Error('DOCUMENT_LOAD_FAILED');
        return response.text();
      })
      .then((text) => {
        if (active) setContent(text);
      })
      .catch(() => {
        if (active) setContent('Não foi possível carregar este documento.');
      });
    return () => {
      active = false;
    };
  }, [source.path]);

  return (
    <div className="cb-cart-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="cb-cart-dialog cb-cart-document-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-document-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="cart-document-title">{source.title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <Image src={asset('imgi_25_default.svg')} alt="" width={14} height={14} />
          </button>
        </header>
        <div className="cb-cart-document-content">{content}</div>
      </section>
    </div>
  );
}

function ServiceEditDialog({
  product,
  planId,
  current,
  onSave,
  onClose,
}: {
  product: Product;
  planId: 'warranty' | 'insurance';
  current?: CartProtectionSelection;
  onSave: (selection: CartProtectionSelection | null) => void;
  onClose: () => void;
}) {
  const template = useMemo(() => buildProtectionTemplate(product), [product]);
  const plan = template.plans.find((entry) => entry.id === planId)!;
  const options = getPlanOptions(plan);
  const defaultOption = options.find((option) => option.id === current?.optionId) ?? options[0];
  const [selectedOptionId, setSelectedOptionId] = useState(defaultOption?.id ?? '');
  const [expandedOptionId, setExpandedOptionId] = useState('');
  const [importantExpanded, setImportantExpanded] = useState(false);
  const selectedOption = options.find((option) => option.id === selectedOptionId);

  function save() {
    if (!selectedOption || selectedOption.totalCents === 0) {
      onSave(null);
      return;
    }
    onSave({
      planId,
      optionId: selectedOption.id,
      totalCents: getCartServicePriceCents(selectedOption.id, selectedOption.totalCents),
    });
  }

  return (
    <div className="cb-cart-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="cb-cart-dialog cb-cart-service-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-service-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <h2 id="cart-service-title">{planId === 'warranty' ? 'Garantia Estendida Original' : 'Fique Seguro'}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <Image src={asset('imgi_25_default.svg')} alt="" width={14} height={14} />
          </button>
        </header>
        <div className="cb-cart-service-dialog-scroll">
          <div className="cb-cart-service-intro">
            <Image
              src={asset(planId === 'warranty' ? 'warranty-medal.svg' : 'imgi_24_default.svg')}
              alt=""
              width={38}
              height={38}
            />
            <p>
              {planId === 'warranty' ? (
                <>Aproveite nossos planos do <strong>Seguro Garantia Estendida Original</strong> e mantenha seu produto protegido por mais tempo do que a garantia oferecida pelo fabricante.<br /><strong>A contratação do seguro é opcional.</strong></>
              ) : (
                <>Proteja seu produto contra <strong>Roubo, Furto Qualificado e Quebra Acidental</strong>. Escolha o plano que combina com você.</>
              )}
            </p>
          </div>

          <div className="cb-cart-service-options">
            {options.map((option) => {
              const selected = selectedOptionId === option.id;
              const expanded = expandedOptionId === option.id && option.totalCents > 0;
              const benefits = getOptionBenefits(plan, option.id);
              const totalCents = getCartServicePriceCents(option.id, option.totalCents);
              const installment = option.installmentCount ? Math.round(totalCents / option.installmentCount) : 0;
              const baseLabel = option.label.replace(/^\+\s*/, '');
              const label = option.totalCents === 0
                ? planId === 'warranty' ? 'Sem Garantia Estendida Original' : 'Sem Fique Seguro'
                : planId === 'warranty'
                  ? `+${baseLabel} Garantia Estendida`
                  : `${baseLabel} ${option.id.startsWith('complete') ? 'Roubo e Furto Qualificado + Quebra Acidental' : option.id.startsWith('theft') ? 'Roubo e Furto Qualificado' : 'Quebra Acidental'}`;
              return (
                <article className="cb-cart-service-option" data-expanded={expanded} key={option.id}>
                  <div>
                    <label>
                      <input type="radio" name={`cart-${planId}`} checked={selected} onChange={() => setSelectedOptionId(option.id)} />
                      <span><strong>{label}</strong>{option.totalCents > 0 && <small>a partir de 10x de {money.format(installment / 100)}</small>}</span>
                    </label>
                    {option.totalCents > 0 && (
                      <button className="cb-cart-option-toggle" type="button" aria-expanded={expanded} aria-label={expanded ? 'Ocultar benefícios' : 'Exibir benefícios'} onClick={() => setExpandedOptionId((value) => value === option.id ? '' : option.id)}>
                        <span aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <div className="cb-cart-option-details">
                      <p>Valor total: <strong>{money.format(totalCents / 100)}</strong></p>
                      <ul>{benefits.map((benefit, index) => <li key={benefit}><span>✓</span><p><strong>{getBenefitTitle(planId, index)}</strong>{benefit}</p></li>)}</ul>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          <div className="cb-cart-important-copy">
            <strong>Informações importantes:</strong>
            <p>A contratação de seguro é opcional, sendo possível a desistência do contrato em até 7 (sete) dias corridos com a devolução integral do valor pago.</p>
            {importantExpanded && (
              <div className="cb-cart-important-extra">
                {(planId === 'warranty' ? warrantyImportantInformation : insuranceImportantInformation).map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            )}
            <button type="button" aria-expanded={importantExpanded} onClick={() => setImportantExpanded((value) => !value)}>{importantExpanded ? 'ver menos' : 'ver mais'}</button>
          </div>
        </div>
        <footer><button type="button" onClick={save}>CONTINUAR</button></footer>
      </section>
    </div>
  );
}

function ServiceTerms({ planId, onOpen }: { planId: 'warranty' | 'insurance'; onOpen: (document: CartDocumentKind) => void }) {
  const terms: CartDocumentKind = planId === 'warranty' ? 'warrantyTerms' : 'insuranceTerms';
  const conditions: CartDocumentKind = planId === 'warranty' ? 'warrantyConditions' : 'insuranceConditions';
  return (
    <span className="cb-cart-service-links">
      <button type="button" onClick={() => onOpen(terms)}>Termos</button>
      <span> e </span>
      <button type="button" onClick={() => onOpen(conditions)}>Condições do seguro</button>
    </span>
  );
}

export function CartPage({ store, products, recommendations }: { store: Store; products: Product[]; recommendations: Product[] }) {
  const { cart, cartAccess, busy, setQuantity } = useStore();
  const [selection, setSelection] = useState<CartSelectionSnapshot>(fallbackCartSelection);
  const [hydrated, setHydrated] = useState(false);
  const [demoQuantity, setDemoQuantity] = useState(1);
  const [supportQuantity, setSupportQuantity] = useState(1);
  const [removedDemoProduct, setRemovedDemoProduct] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const [selectedPlans, setSelectedPlans] = useState<Record<string, boolean>>({});
  const [postalCode, setPostalCode] = useState('13309-836');
  const [calculatedPostalCode, setCalculatedPostalCode] = useState('13309-836');
  const [shippingCents, setShippingCents] = useState(3_321);
  const [freightOpen, setFreightOpen] = useState(false);
  const [lastUnitsVisible, setLastUnitsVisible] = useState(true);
  const [dialog, setDialog] = useState<CartDialog>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(CART_SELECTION_KEY);
    if (saved) {
      try {
        setSelection(JSON.parse(saved) as CartSelectionSnapshot);
      } catch {
        sessionStorage.removeItem(CART_SELECTION_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    sessionStorage.setItem(CART_SELECTION_KEY, JSON.stringify(selection));
  }, [hydrated, selection]);

  useEffect(() => {
    if (!dialog) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDialog(null);
    };
    document.body.classList.add('cart-dialog-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('cart-dialog-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [dialog]);

  const productByVariant = useMemo(
    () => new Map(products.flatMap((product) => product.variants.map((variant) => [variant.id, product] as const))),
    [products],
  );
  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selection.productId || product.slug === selection.productSlug) ?? products[0],
    [products, selection.productId, selection.productSlug],
  );
  const apiItems = cart?.items ?? [];
  const demoMode = apiItems.length === 0;
  const displayItems = useMemo<DisplayItem[]>(() => {
    if (apiItems.length) {
      return apiItems.map((item) => {
        const product = productByVariant.get(item.variantId);
        const image = product ? mediaUrl(product, product.variants.find((variant) => variant.id === item.variantId)) : undefined;
        return {
          id: item.id,
          variantId: item.variantId,
          title: item.title,
          quantity: item.quantity,
          unitPriceCents: item.unitPriceCents ?? 0,
          ...(product ? { product } : {}),
          ...(image ? { image } : {}),
          seller: product?.isDemo ? 'MOBCOMSTORE' : store.displayName,
        };
      });
    }
    if (!selectedProduct || removedDemoProduct) return [];
    const variant = selectedProduct.variants[0];
    const demoImage = selectedProduct.id === 'reference-iphone-18-pro-max-glacial'
      ? asset('imgi_3_1xg.jpg')
      : mediaUrl(selectedProduct, variant);
    return [{
      id: `demo-${selectedProduct.id}`,
      variantId: variant?.id ?? selectedProduct.id,
      title: selectedProduct.title,
      quantity: demoQuantity,
      unitPriceCents: getCartProductPriceCents(selectedProduct),
      product: selectedProduct,
      ...(demoImage ? { image: demoImage } : {}),
      seller: selectedProduct.id === 'reference-iphone-18-pro-max-glacial' ? 'MOBCOMSTORE' : store.displayName,
    }];
  }, [apiItems, demoQuantity, productByVariant, removedDemoProduct, selectedProduct, store.displayName]);

  const protectedProduct = selectedProduct ?? displayItems[0]?.product;
  const protectionTemplate = useMemo(() => protectedProduct ? buildProtectionTemplate(protectedProduct) : null, [protectedProduct]);
  const currentDialogSelection = dialog?.kind === 'edit'
    ? selection.services.find((service) => service.planId === dialog.planId)
    : undefined;
  const mainQuantity = displayItems[0]?.quantity ?? 1;
  const supportSelection = selection.services.find((service) => service.planId === 'support');
  const insuranceSelections = selection.services
    .filter((service) => service.planId !== 'support')
    .sort((left, right) => (left.planId === 'warranty' ? -1 : right.planId === 'warranty' ? 1 : 0));
  const itemIsSelected = (id: string) => selectedItems[id] !== false;
  const planIsSelected = (planId: string) => selectedPlans[planId] !== false;
  const supportSelected = Boolean(supportSelection) && planIsSelected('support');
  const mainItemIsSelected = itemIsSelected(displayItems[0]?.id ?? '');

  const productSubtotalCents = displayItems.reduce(
    (sum, item) => sum + (itemIsSelected(item.id) ? item.unitPriceCents * item.quantity : 0),
    supportSelected ? getCartServicePriceCents('support-paid', supportSelection?.totalCents ?? 12_990) * supportQuantity : 0,
  );
  const serviceSubtotalCents = insuranceSelections.reduce(
    (sum, service) => sum + (planIsSelected(service.planId) && mainItemIsSelected ? service.totalCents * mainQuantity : 0),
    0,
  );
  const productCount = displayItems.reduce(
    (sum, item) => sum + (itemIsSelected(item.id) ? item.quantity : 0),
    supportSelected ? supportQuantity : 0,
  );
  const serviceCount = insuranceSelections.reduce(
    (sum, service) => sum + (planIsSelected(service.planId) && mainItemIsSelected ? mainQuantity : 0),
    0,
  );
  const hasSelectedItems = productCount > 0;
  const appliedShippingCents = hasSelectedItems ? shippingCents : 0;
  const totalCents = productSubtotalCents + serviceSubtotalCents + appliedShippingCents;

  function toggleItem(id: string) {
    setSelectedItems((current) => ({ ...current, [id]: current[id] === false }));
  }

  function togglePlan(planId: string) {
    setSelectedPlans((current) => ({ ...current, [planId]: current[planId] === false }));
  }

  async function changeQuantity(item: DisplayItem, nextQuantity: number) {
    if (demoMode) {
      setDemoQuantity(nextQuantity);
      return;
    }
    await setQuantity(item.variantId, nextQuantity);
  }

  async function removeItem(item: DisplayItem) {
    if (demoMode) {
      setRemovedDemoProduct(true);
      return;
    }
    await setQuantity(item.variantId, 0);
  }

  function calculateFreight() {
    const digits = postalCode.replace(/\D/g, '');
    if (digits.length !== 8) return;
    const formatted = formatPostalCode(digits);
    setCalculatedPostalCode(formatted);
    setShippingCents(digits === '13308135' ? 4_164 : 3_321);
    setFreightOpen(false);
  }

  function saveService(next: CartProtectionSelection | null, planId: 'warranty' | 'insurance') {
    setSelection((current) => ({
      ...current,
      services: next
        ? current.services.some((service) => service.planId === planId)
          ? current.services.map((service) => service.planId === planId ? next : service)
          : [...current.services, next]
        : current.services.filter((service) => service.planId !== planId),
    }));
    setSelectedPlans((current) => ({ ...current, [planId]: Boolean(next) }));
    setDialog(null);
  }

  const continueEnabled = hasSelectedItems && (demoMode || cartAccess !== null);

  return (
    <PageFrame store={store} checkout>
      <main className="reference-cart-page">
        <div className="container">
          <h1>Meu carrinho</h1>
          {displayItems.length || supportSelection ? (
            <div className="cb-cart-layout">
              <section className="cb-cart-main-column">
                <section className="cb-cart-freight" data-open={freightOpen}>
                  <button className="cb-cart-freight-heading" type="button" onClick={() => setFreightOpen((value) => !value)}>
                    <span><Image src={asset('imgi_19_default.svg')} alt="" width={17} height={17} /><strong>{freightOpen ? 'Calcular frete' : `Frete para ${calculatedPostalCode}`}</strong></span>
                    <span>{freightOpen ? <>Descobrir CEP <b>⌾</b></> : <>Alterar <Image src={asset('imgi_20_default.svg')} alt="" width={16} height={16} /></>}</span>
                  </button>
                  <div className="cb-cart-freight-collapsed" aria-hidden={freightOpen}>
                    <span>Receba tudo até 21 de outubro, quarta.</span>
                    <strong>{money.format(shippingCents / 100)}</strong>
                  </div>
                  <div className="cb-cart-freight-expanded" aria-hidden={!freightOpen}>
                    <p>Adicione um CEP para calcular entrega, valor final e continuar sua compra</p>
                    <label>Insira seu CEP</label>
                    <div><input value={postalCode} inputMode="numeric" onChange={(event) => setPostalCode(formatPostalCode(event.target.value))} /><button type="button" onClick={calculateFreight} disabled={postalCode.replace(/\D/g, '').length !== 8}>Calcular</button></div>
                    <button type="button" onClick={() => setFreightOpen(false)}>Manter CEP atual</button>
                  </div>
                </section>

                {lastUnitsVisible && (
                  <aside className="cb-cart-last-units">
                    <button type="button" aria-label="Fechar aviso" onClick={() => setLastUnitsVisible(false)}>×</button>
                    <strong>🔥 &nbsp;Últimas unidades</strong>
                    <span>Todo mundo está comprando os mesmos itens que você. Finalize seu pedido e garanta essas ofertas.</span>
                  </aside>
                )}

                {supportSelection && (
                  <section className="cb-cart-seller-card">
                    <header>Vendido por <strong>PORTO SERVICO S.A.</strong></header>
                    <article className="cb-cart-product-row">
                      <CheckedBox checked={planIsSelected('support')} onChange={() => togglePlan('support')} label="Selecionar Suporte Super Help" />
                      <div className="cb-cart-product-image"><Image src={asset('imgi_2_1xg.jpg')} alt="Suporte Super Help 64GB" fill sizes="62px" unoptimized /></div>
                      <div className="cb-cart-product-copy"><strong>Suporte Super Help 64GB</strong><b>{money.format(getCartServicePriceCents('support-paid', supportSelection.totalCents) / 100)}</b><span>No Pix ou Cartão</span><small>Até sexta, 16 de outubro: <em>Grátis</em></small></div>
                      <button className="cb-cart-trash" type="button" onClick={() => setSelection((current) => ({ ...current, services: current.services.filter((service) => service.planId !== 'support') }))} aria-label="Excluir suporte"><Image src={asset('imgi_22_default.svg')} alt="" width={16} height={16} /></button>
                      <QuantityPicker value={supportQuantity} onChange={setSupportQuantity} label="Quantidade de Suporte Super Help 64GB" />
                    </article>
                  </section>
                )}

                {displayItems.map((item, index) => (
                  <section className="cb-cart-seller-card" key={item.id}>
                    <header>Vendido por <strong>{item.seller}</strong></header>
                    <article className="cb-cart-product-row">
                      <CheckedBox checked={itemIsSelected(item.id)} onChange={() => toggleItem(item.id)} label={`Selecionar ${item.title}`} />
                      <div className="cb-cart-product-image">{item.image ? <Image src={item.image} alt={item.title} fill sizes="62px" unoptimized /> : <span>{item.title.slice(0, 1)}</span>}</div>
                      <div className="cb-cart-product-copy"><strong>{item.title}</strong><b>{money.format(item.unitPriceCents / 100)}</b><span>No Pix ou Cartão</span><small>Até 21 de outubro, quarta: <b>{money.format(shippingCents / 100)}</b></small></div>
                      <button className="cb-cart-trash" type="button" onClick={() => void removeItem(item)} disabled={busy} aria-label={`Excluir ${item.title}`}><Image src={asset('imgi_22_default.svg')} alt="" width={16} height={16} /></button>
                      <QuantityPicker value={item.quantity} disabled={busy} onChange={(quantity) => void changeQuantity(item, quantity)} label={`Quantidade de ${item.title}`} />
                    </article>

                    {index === 0 && insuranceSelections.map((service) => {
                      const planId = service.planId as 'warranty' | 'insurance';
                      return (
                        <article className="cb-cart-service-row" key={service.planId}>
                          <CheckedBox checked={planIsSelected(service.planId)} onChange={() => togglePlan(service.planId)} label={`Selecionar ${serviceTitle(service.planId, item.quantity)}`} />
                          <Image src={asset(service.planId === 'warranty' ? 'imgi_23_default.svg' : 'imgi_24_default.svg')} alt="" width={36} height={36} />
                          <div><strong>{serviceTitle(service.planId, item.quantity)}</strong><ServiceTerms planId={planId} onOpen={(document) => setDialog({ kind: 'document', document })} /></div>
                          <div><strong>{money.format((service.totalCents * item.quantity) / 100)}</strong><button type="button" onClick={() => setDialog({ kind: 'edit', planId })}>Editar</button></div>
                        </article>
                      );
                    })}
                  </section>
                ))}

                <section className="cb-cart-stock-info">
                  <strong>Informações sobre preço e estoque</strong>
                  <ul><li>Produtos no carrinho não são reservados. Realize o pagamento e garanta sua compra.</li><li>Itens promocionais possuem estoque limitado.</li><li>Valores podem ser alterados conforme opção de pagamento escolhida.</li></ul>
                </section>
              </section>

              <aside className="cb-cart-summary">
                <h2>Resumo do pedido</h2>
                <div><span>{String(productCount).padStart(2, '0')} Produtos</span><strong>{money.format(productSubtotalCents / 100)}</strong></div>
                <div><span>{String(serviceCount).padStart(2, '0')} Seguros ou serviços</span><strong>{money.format(serviceSubtotalCents / 100)}</strong></div>
                <div><span>Entrega</span><strong>{money.format(appliedShippingCents / 100)}</strong></div>
                <div className="cb-cart-summary-total"><strong>Total</strong><span><b>{money.format(totalCents / 100)}</b><small>No Pix ou Cartão</small></span></div>
                <Link className="cb-cart-more-products" href="/">Comprar mais produtos</Link>
                <Link className={`cb-cart-continue${continueEnabled ? '' : ' disabled'}`} aria-disabled={!continueEnabled} href={continueEnabled ? '/checkout/endereco' : '#'}>Continuar a compra</Link>
                <p><strong>Possui cupom ou vale?</strong><span>Você vai poder usar na etapa de pagamento.</span></p>
              </aside>
            </div>
          ) : (
            <div className="empty-cart-page"><span>🛒</span><h2>Seu carrinho está vazio</h2><p>Os produtos adicionados aparecerão aqui.</p><Link className="blue-button" href="/">Ver ofertas</Link></div>
          )}
        </div>

        <div className="cb-cart-recommendations"><ProductShelf title="Indicados com base nas suas visitas" products={recommendations} /></div>
      </main>

      {dialog?.kind === 'document' && <DocumentDialog document={dialog.document} onClose={() => setDialog(null)} />}
      {dialog?.kind === 'edit' && protectedProduct && protectionTemplate && (
        <ServiceEditDialog product={protectedProduct} planId={dialog.planId} {...(currentDialogSelection ? { current: currentDialogSelection } : {})} onSave={(next) => saveService(next, dialog.planId)} onClose={() => setDialog(null)} />
      )}
    </PageFrame>
  );
}
