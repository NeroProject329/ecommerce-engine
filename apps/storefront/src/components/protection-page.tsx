'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { mediaUrl, money, type Product, type Store } from '../lib/commerce';
import {
  CART_SELECTION_KEY,
  getCartServicePriceCents,
  type CartSelectionSnapshot,
} from '../lib/cart-template-data';
import {
  buildProtectionTemplate,
  findProtectionOption,
  getProtectionProductPriceCents,
  type ProtectionOption,
  type ProtectionPlan,
} from '../lib/protection-template-data';
import { PageFrame } from './chrome';

const checkIcon = '/insurance-assets/check.svg';
const chevronIcon = '/insurance-assets/chevron.svg';

function OptionRow({ option, radioName, selected, onSelect }: {
  option: ProtectionOption;
  radioName: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const installment = option.installmentCount
    ? Math.round(option.totalCents / option.installmentCount)
    : 0;
  return (
    <div className="protection-option-wrap">
      {option.promotion && <strong className="protection-promotion">{option.promotion}</strong>}
      <label className="protection-option" data-selected={selected}>
        <input type="radio" name={radioName} checked={selected} onChange={onSelect} />
        <strong>{option.label}</strong>
        {option.totalCents > 0 && (
          <span>em até {option.installmentCount}x <b>{money.format(installment / 100)}</b></span>
        )}
      </label>
    </div>
  );
}

function PlanDescription({ plan }: { plan: ProtectionPlan }) {
  if (plan.id !== 'insurance' || !plan.description.includes('Roubo')) {
    return <>{plan.description}</>;
  }
  const [start, emphasis = ''] = plan.description.split('Roubo');
  return <>{start}<strong>{emphasis ? `Roubo${emphasis}` : plan.description}</strong></>;
}

export function ProtectionPage({ store, product }: { store: Store; product: Product }) {
  const router = useRouter();
  const template = useMemo(() => buildProtectionTemplate(product), [product]);
  const [selected, setSelected] = useState<Record<ProtectionPlan['id'], string | null>>(() => ({
    warranty: template.plans.find(({ id }) => id === 'warranty')?.defaultOptionId ?? null,
    insurance: template.plans.find(({ id }) => id === 'insurance')?.defaultOptionId ?? null,
    support: template.plans.find(({ id }) => id === 'support')?.defaultOptionId ?? null,
  }));
  const [expanded, setExpanded] = useState<Record<ProtectionPlan['id'], boolean>>({
    warranty: false,
    insurance: false,
    support: false,
  });
  const [coverageByPlan, setCoverageByPlan] = useState<Record<string, string>>({ insurance: 'complete' });
  const [importantExpanded, setImportantExpanded] = useState(false);
  const variant = product.variants[0];
  const productPriceCents = getProtectionProductPriceCents(product);
  const productImage = mediaUrl(product, variant) ?? '/insurance-assets/reference-product.jpg';

  const selectedServices = template.plans.flatMap((plan) => {
    const selectedOption = findProtectionOption(
      template,
      plan.id,
      selected[plan.id],
      coverageByPlan[plan.id],
    );
    return selectedOption && selectedOption.totalCents > 0
      ? [{ plan, option: selectedOption }]
      : [];
  });
  const subtotalCents = selectedServices.reduce(
    (total, { option }) => total + option.totalCents,
    productPriceCents,
  );

  function selectOption(planId: ProtectionPlan['id'], optionId: string) {
    setSelected((current) => ({ ...current, [planId]: optionId }));
  }

  function selectCoverage(planId: ProtectionPlan['id'], coverageId: string) {
    setCoverageByPlan((current) => ({ ...current, [planId]: coverageId }));
    setSelected((current) => ({ ...current, [planId]: null }));
  }

  function goToCart(includeServices: boolean) {
    const services = includeServices
      ? selectedServices.map(({ plan, option }) => ({
          planId: plan.id,
          optionId: option.id,
          totalCents: getCartServicePriceCents(option.id, option.totalCents),
        }))
      : [];
    if (includeServices) {
      sessionStorage.setItem(
        `protection:${product.slug}`,
        JSON.stringify({
          productId: product.id,
          services,
        }),
      );
    } else {
      sessionStorage.removeItem(`protection:${product.slug}`);
    }
    const cartSelection: CartSelectionSnapshot = {
      productId: product.id,
      productSlug: product.slug,
      services,
    };
    sessionStorage.setItem(CART_SELECTION_KEY, JSON.stringify(cartSelection));
    router.push('/carrinho');
  }

  return (
    <PageFrame store={store} checkout checkoutFooter={false}>
      <main className="protection-page" data-niche={template.niche}>
        <div className="protection-content">
          <header className="protection-title-row">
            <h1>Muito mais proteção para o seu produto!</h1>
            <div className="protection-product-mini">
              <span><Image src={productImage} alt="" fill sizes="42px" unoptimized /></span>
              <p>{product.title}</p>
            </div>
          </header>

          <section className="protection-grid" aria-label="Planos de proteção disponíveis">
            {template.plans.map((plan) => {
              const activeCoverage = plan.coverages?.find(({ id }) => id === coverageByPlan[plan.id]) ?? plan.coverages?.[0];
              const allOptions = plan.options ?? activeCoverage?.options ?? [];
              const selectedOption = allOptions.find(({ id }) => id === selected[plan.id]);
              const previewOption = selectedOption ?? allOptions.find(({ totalCents }) => totalCents > 0) ?? allOptions[0];
              const benefits = activeCoverage?.benefits ?? plan.benefits ?? [];
              const isExpanded = expanded[plan.id];
              return (
                <article className="protection-card" data-expanded={isExpanded} key={plan.id}>
                  <h2><Image src={plan.icon} alt="" width={48} height={48} /><span>{plan.title}</span></h2>
                  <p className="protection-description"><PlanDescription plan={plan} /></p>

                  {!isExpanded && previewOption && (
                    <div className="protection-preview">
                      <OptionRow
                        option={previewOption}
                        radioName={`protection-${plan.id}-preview`}
                        selected={selected[plan.id] === previewOption.id}
                        onSelect={() => selectOption(plan.id, previewOption.id)}
                      />
                    </div>
                  )}

                  <div className="protection-expanded" aria-hidden={!isExpanded}>
                    <div>
                      {plan.coverages && (
                        <div className="protection-tabs" role="tablist" aria-label="Tipo de cobertura">
                          {plan.coverages.map((coverage) => (
                            <button
                              className={activeCoverage?.id === coverage.id ? 'active' : ''}
                              type="button"
                              role="tab"
                              aria-selected={activeCoverage?.id === coverage.id}
                              onClick={() => selectCoverage(plan.id, coverage.id)}
                              key={coverage.id}
                            >
                              {coverage.label}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="protection-options">
                        {allOptions.map((option) => (
                          <OptionRow
                            option={option}
                            radioName={`protection-${plan.id}`}
                            selected={selected[plan.id] === option.id}
                            onSelect={() => selectOption(plan.id, option.id)}
                            key={option.id}
                          />
                        ))}
                      </div>
                      <ul className="protection-benefits">
                        {benefits.map((benefit) => (
                          <li key={benefit}><Image src={checkIcon} alt="" width={13} height={10} />{benefit}</li>
                        ))}
                      </ul>
                      <p className="protection-terms">
                        Ao adicionar o {plan.termsLabel}, declaro que tive acesso, li e aceito os{' '}
                        <a href="/institucional/termos">Termos e Condições</a>.
                      </p>
                    </div>
                  </div>

                  <button
                    className="protection-toggle"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => setExpanded((current) => ({ ...current, [plan.id]: !current[plan.id] }))}
                  >
                    {isExpanded ? 'Ver menos' : 'Ver mais'}
                    <Image src={chevronIcon} alt="" width={14} height={8} />
                  </button>
                </article>
              );
            })}
          </section>
        </div>

        <section className="protection-important">
          <div>
            <strong>Informações importantes:</strong>
            <p>A contratação de seguro é opcional, sendo possível a desistência do contrato em até 7 (sete) dias corridos com a devolução integral do valor pago.</p>
            <p>É proibido condicionar desconto no preço do bem à aquisição do seguro.</p>
            <div className="protection-important-extra" data-expanded={importantExpanded}>
              <div><p>Consulte as condições gerais, coberturas, exclusões e períodos de vigência antes de contratar.</p></div>
            </div>
            <button type="button" onClick={() => setImportantExpanded((value) => !value)}>
              {importantExpanded ? 'Mostrar menos' : 'Mostrar mais'}
            </button>
          </div>
        </section>

        <footer className="protection-company">
          <div>
            <strong>Importante: Para que o maior número de clientes seja atendido, é possível que o site limite a quantidade de itens do mesmo produto no carrinho.</strong>
            <p>Preços e condições exclusivos para o site www.casasbahia.com.br, podendo sofrer alterações sem prévia notificação.</p>
            <p><strong>Grupo Casas Bahia S.A.</strong> | Rua Florida, 1970 | São Paulo - SP | CEP: 04565-001 | CNPJ: 33.041.260/0652-90 | Inscrição Estadual: 133.091.229.115 | Nossas filiais | Lojas Físicas</p>
          </div>
        </footer>
      </main>

      <aside className="protection-summary" aria-label="Resumo da compra">
        <div className="protection-summary-inner">
          <div className="protection-summary-items">
            <span><small>Produto</small><strong>{money.format(productPriceCents / 100)}</strong></span>
            {selectedServices.map(({ plan, option }) => (
              <span key={`${plan.id}-${option.id}`}>
                <small>{option.summaryLabel ?? `${plan.title} - ${option.label}`}</small>
                <strong>{money.format(option.totalCents / 100)}</strong>
              </span>
            ))}
          </div>
          <span className="protection-summary-total"><small>Subtotal</small><strong>{money.format(subtotalCents / 100)}</strong></span>
          <div className="protection-summary-actions">
            <button className="protection-skip" type="button" onClick={() => goToCart(false)}>Agora não</button>
            <button className="protection-continue" type="button" onClick={() => goToCart(true)}>Continuar</button>
          </div>
        </div>
      </aside>
    </PageFrame>
  );
}
