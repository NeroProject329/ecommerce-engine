'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { Category, Store } from '../lib/commerce';
import { useStore } from './store-context';

function Logo() {
  return (
    <Link className="cb-logo" href="/" aria-label="Página inicial">
      <Image
        src="/brand-assets/casas-bahia-logo.svg"
        alt=""
        width={197}
        height={21}
        priority
      />
    </Link>
  );
}

const popularProductColumns = [
  ['Air fryer','Ar condicionado','Ar condicionado portátil','Armário de cozinha','Bicicleta','Bicicleta ergométrica','Cafeteira'],
  ['Cama','Celular','Celular Motorola','Celular Samsung','Colchão','Computador','Cooktop','Fogão 4 bocas'],
  ['Fralda','Galaxy S24','Geladeira','Guarda roupa','iPhone','iPhone 11','iPhone 12','iPhone 13'],
  ['iPhone 14','iPhone 15','iPhone 15 Pro','iPhone 16','Liquidificador','Máquina de lavar','Microondas','Notebook'],
  ['Pneu','Pneu aro 13','PS5','Rack','S25','Smart TV','Smartphone','Smartwatch'],
  ['Sofá','Tablet','Tanquinho','Tênis','TV','TV 32 polegadas','TV 50 4K','Umidificador de ar'],
  ['Ventilador','Xbox','Xiaomi'],
];

const departmentItems = [
  { label: 'Todas as Categorias', href: '/departamentos', icon: '31_minimal_gray_hamburger_menu_icon.svg', all: true },
  { label: 'Celulares e Smartphones', href: '/categoria/celulares-e-smartphones', icon: '32_minimal_gray_smartphone_icon.svg' },
  { label: 'TVs', href: '/categoria/tvs-e-video', icon: '33_minimal_gray_desktop_monitor_icon.svg' },
  { label: 'Eletrodomésticos', href: '/categoria/eletrodomesticos', icon: '41_geladeira_cinza.svg' },
  { label: 'Móveis', href: '/categoria/moveis', icon: '34_minimal_gray_bed_icon.svg' },
  { label: 'Eletroportáteis', href: '/categoria/eletroportateis', icon: '35_minimalist_gray_blender_icon.svg' },
  { label: 'Informática', href: '/categoria/informatica', icon: '36_minimal_gray_computer_mouse_icon.svg' },
  { label: 'Ar e Ventilação', href: '/categoria/ar-e-ventilacao', icon: '37_minimal_gray_snowflake_icon.svg' },
  { label: 'Automotivo', href: '/categoria/automotivo', icon: '38_minimalist_gray_car_icon.svg' },
  { label: 'Beleza e Saúde', href: '/categoria/beleza-e-saude', icon: '39_minimalist_gray_heart_outline.svg' },
  { label: 'Games', href: '/categoria/games', icon: '40_minimal_gray_game_controller_icon.svg' },
  { label: 'Gift Card', href: '/busca?q=gift%20card', icon: '42_presente_cinza.svg' },
];

const departmentGroups = [
  { title: 'Tecnologia e Eletrônicos', items: ['Acessórios para Celulares','Câmeras, Filmadoras e Drones','Eletrodomésticos','Eletroportáteis','Informática','Tablets','Telefonia e Celulares','TV e Vídeo','Áudio'] },
  { title: 'Casa e Decoração', items: ['Casa e Construção','Casa, Mesa e Banho','Decoração','Ferramentas','Móveis','Utilidades Domésticas'] },
  { title: 'Moda e Acessórios', items: ['Acessórios e Inovações','Calçados','Joias e Bijuterias','Malas e Mochilas','Moda','Relógios'] },
  { title: 'Alimentos e Bebidas', items: ['Alimentos','Bebidas'] },
  { title: 'Saúde, Beleza e Bem-Estar', items: ['Beleza e Saúde','Perfumaria e Cosméticos','Bebês','Pet Shop'] },
  { title: 'Entretenimento e Lazer', items: ['Brinquedos','Esporte e Lazer','Natal','Gift Card'] },
  { title: 'Serviços e Comércio', items: ['Agro, Indústria e Comércio','Alameda de Serviços','Marketplace','CB Full','Gift Card'] },
  { title: 'Livros e Papelaria', items: ['Livros','Papelaria','Gift Card'] },
];

const corporateItems = ['CB Empresas', 'Marketplace', 'B2B - Grupo Casas Bahia'];
const serviceItems = ['Casas Bahia Pay BanQi', 'Serviços', 'Consórcio', 'Garantia Estendida', 'Fique Seguro', 'Empréstimos', 'Instalações', 'Retira'];

export function SiteHeader({ categories = [] }: { categories?: Category[] }) {
  const router = useRouter();
  const { cartCount, customer } = useStore();
  const [query, setQuery] = useState('');
  const [openMenu, setOpenMenu] = useState<'departments' | 'corporate' | 'services' | null>(null);
  const [showAllDepartments, setShowAllDepartments] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accountCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navShellRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const open = (menu: 'departments' | 'corporate' | 'services') => {
    cancelClose();
    setAccountOpen(false);
    setOpenMenu(menu);
    if (menu !== 'departments') setShowAllDepartments(false);
  };
  const cancelAccountClose = () => {
    if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    accountCloseTimer.current = null;
  };
  const openAccount = () => {
    cancelAccountClose();
    cancelClose();
    setOpenMenu(null);
    setShowAllDepartments(false);
    setAccountOpen(true);
  };
  const closeAccount = (delay = 110) => {
    cancelAccountClose();
    accountCloseTimer.current = setTimeout(() => setAccountOpen(false), delay);
  };
  const close = (delay = 110) => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpenMenu(null);
      setShowAllDepartments(false);
    }, delay);
  };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenu(null);
        setShowAllDepartments(false);
        setAccountOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (accountCloseTimer.current) clearTimeout(accountCloseTimer.current);
    };
  }, []);
  function search(event: FormEvent) {
    event.preventDefault();
    if (query.trim()) router.push(`/busca?q=${encodeURIComponent(query.trim())}`);
  }
  return (
    <>
      <div className="promotion-ticker" aria-hidden="true"><div>{Array.from({ length: 9 }, (_, index) => <span key={index}>▻ COMPRE E RETIRE EM ATÉ <b>2H</b><strong>10.10</strong></span>)}</div></div>
      <div className="brand-rule" />
      <header className="cb-header">
        <div className="header-main container">
          <Logo />
          <Link className="accessibility" href="/institucional/acessibilidade" title="Acessibilidade" aria-label="Acessibilidade"><Image src="/brand-assets/25_blue_universal_accessibility_icon.svg" alt="" width={21} height={21}/></Link>
          <form className="main-search" onSubmit={search}>
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="O que você tá procurando?" aria-label="Buscar produtos" />
            <button aria-label="Pesquisar"><span className="search-glass" /></button>
          </form>
          <Link className="delivery-link" href="/carrinho"><Image src="/brand-assets/24_minimal_blue_delivery_truck_icon.svg" alt="" width={23} height={23}/><strong>Informe seu CEP</strong></Link>
          <div className="account-cluster">
            <div ref={accountRef} className="account-menu-anchor" onMouseEnter={openAccount} onMouseLeave={() => closeAccount()} onFocus={openAccount} onBlur={(event) => { if (!accountRef.current?.contains(event.relatedTarget as Node | null)) closeAccount(0); }}>
              <Link className="account-link" href={customer ? '/minha-conta' : '/entrar'} aria-expanded={accountOpen} aria-controls="account-menu"><Image src="/brand-assets/22_minimal_blue_profile_avatar_icon.svg" alt="" width={23} height={23}/><strong>{customer ? `Olá, ${customer.name.split(' ')[0]}` : 'Acesse sua conta'}</strong></Link>
              <div id="account-menu" className="account-popover" data-open={accountOpen} aria-hidden={!accountOpen}>
                <Link className="account-primary" href={customer ? '/minha-conta' : '/entrar'}>{customer ? 'Minha conta' : 'Entre ou Cadastre-se'}</Link>
                <Link href="/minha-conta/pedidos">Pedidos de Loja On-Line</Link>
                <Link href="/minha-conta/pedidos">Pedidos de Loja Física</Link>
                <Link href="/institucional/atendimento">Atendimento</Link>
              </div>
            </div>
            <Link className="account-favorite" href="/favoritos" aria-label="Favoritos" title="Favoritos"><Image src="/brand-assets/23_blue_heart_outline_icon.svg" alt="" width={22} height={22}/></Link>
          </div>
          <Link className="header-icon cart-link" href="/carrinho" aria-label={`Carrinho com ${cartCount} itens`} title="Carrinho"><Image src="/brand-assets/21_minimal_blue_shopping_cart_icon.svg" alt="" width={28} height={28}/>{cartCount > 0 && <b>{cartCount}</b>}</Link>
        </div>
        <div
          ref={navShellRef}
          className="nav-shell"
          onMouseEnter={cancelClose}
          onMouseLeave={() => close()}
          onBlur={(event) => {
            if (!navShellRef.current?.contains(event.relatedTarget as Node | null)) close(0);
          }}
        >
          <nav className="category-nav container" aria-label="Navegação principal">
            <button className="nav-trigger departments" type="button" aria-expanded={openMenu === 'departments'} aria-controls="departments-menu" onMouseEnter={() => open('departments')} onClick={() => open('departments')}><span className="nav-hamburger" aria-hidden="true"/>Departamentos</button>
            {categories.slice(0, 5).map((category) => <Link key={category.id} href={`/categoria/${category.slug}`}>{category.name}</Link>)}
            {!categories.length && <><Link href="/categoria/telefonia">Telefonia</Link><Link href="/categoria/eletrodomesticos">Eletrodomésticos</Link><Link href="/categoria/tvs-e-video">TVs e Vídeo</Link><Link href="/categoria/moveis">Móveis</Link><Link href="/categoria/eletroportateis">Eletroportáteis</Link></>}
            <Link className="coupon-pill" href="/busca?oferta=true">Cupom</Link>
            <span className="nav-spacer" />
            <Link href="/institucional/carne">Carnê Digital</Link>
            <Link href="/institucional/cartao">Cartão Casas Bahia</Link>
            <button className="nav-trigger" type="button" aria-expanded={openMenu === 'corporate'} aria-controls="corporate-menu" onMouseEnter={() => open('corporate')} onClick={() => open('corporate')}>Compra Corporativa</button>
            <button className="nav-trigger" type="button" aria-expanded={openMenu === 'services'} aria-controls="services-menu" onMouseEnter={() => open('services')} onClick={() => open('services')}>Soluções e Serviços</button>
          </nav>
          <div className="nav-backdrop" data-open={openMenu !== null} aria-hidden="true" onMouseEnter={() => close(0)}/>
          <section id="departments-menu" className="nav-flyout departments-flyout" data-open={openMenu === 'departments'} data-expanded={showAllDepartments} aria-hidden={openMenu !== 'departments'}>
            <div className="department-rail">
              {departmentItems.map((item) => <Link key={item.label} href={item.href} className={item.all && showAllDepartments ? 'active' : ''} onMouseEnter={() => setShowAllDepartments(Boolean(item.all))} onFocus={() => setShowAllDepartments(Boolean(item.all))}>
                <Image src={`/brand-assets/${item.icon}`} alt="" width={17} height={17}/><span>{item.label}</span>{item.all && <b aria-hidden="true">›</b>}
              </Link>)}
            </div>
            <div className="department-mega" aria-hidden={!showAllDepartments}>
              {departmentGroups.map((group) => <div key={group.title} className="department-group"><strong>{group.title}</strong>{group.items.map((item) => <Link key={item} href={`/busca?q=${encodeURIComponent(item)}`}>{item}</Link>)}</div>)}
            </div>
          </section>
          <section id="corporate-menu" className="nav-flyout nav-small-flyout corporate-flyout" data-open={openMenu === 'corporate'} aria-hidden={openMenu !== 'corporate'}>
            {corporateItems.map((item) => <Link key={item} href={`/busca?q=${encodeURIComponent(item)}`}>{item}</Link>)}
          </section>
          <section id="services-menu" className="nav-flyout nav-small-flyout services-flyout" data-open={openMenu === 'services'} aria-hidden={openMenu !== 'services'}>
            {serviceItems.map((item) => <Link key={item} href={`/busca?q=${encodeURIComponent(item)}`}>{item}</Link>)}
          </section>
        </div>
      </header>
    </>
  );
}

export function SiteFooter({ store }: { store: Store }) {
  const profile = store.profile ?? {};
  const salesText = String(profile.footerSalesText ?? 'Compre pelo Whatsapp');
  const supportText = String(profile.footerSupportText ?? 'Iniciar atendimento online');
  const regionText = String(profile.footerRegionText ?? '0800-200-4336');
  const legalLineOne = String(profile.footerLegalLineOne ?? 'Preços e condições exclusivos para o site www.casasbahia.com.br, podendo sofrer alterações sem prévia notificação.');
  const legalLineTwo = String(profile.footerLegalLineTwo ?? 'Grupo Casas Bahia S.A. | Rua Florida, 1970 | São Paulo - SP | CEP: 04565-001 | CNPJ: 33.041.260/0652-90 | Inscrição Estadual: 133.091.229.115');
  const [expanded,setExpanded] = useState(false);
  const detailsRef = useRef<HTMLDivElement>(null);
  const [detailsHeight,setDetailsHeight] = useState(0);
  useEffect(()=>{
    const details = detailsRef.current;
    if (!details) return;
    const measure = () => setDetailsHeight(details.scrollHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(details);
    return () => observer.disconnect();
  },[]);
  return (
    <footer className="cb-footer">
      <section className="help-strip"><div className="container"><strong>Se precisar, tô aqui!</strong><Link href="/institucional/atendimento">Preciso de ajuda</Link></div></section>
      <div className="footer-contacts container">
        <div><strong>CENTRAL DE VENDAS</strong><span>{salesText}</span></div>
        <div><strong>CENTRAL DE ATENDIMENTO</strong><span>{supportText}</span></div>
        <div><strong>PARA SUA REGIÃO</strong><span>{regionText}</span></div>
      </div>
      <div className="footer-popular container"><strong>PRODUTOS MAIS BUSCADOS</strong><div className="footer-popular-grid">{popularProductColumns.map((column,index)=><div className="footer-popular-column" key={index}>{column.map((item)=><Link key={item} href={`/busca?q=${encodeURIComponent(item)}`}>{item}</Link>)}</div>)}</div></div>
      <div className="footer-glossary container"><strong>GLOSSÁRIO</strong><div>{['0-9','A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U','V','W','X','Y','Z'].map((letter)=><span key={letter}>{letter}</span>)}</div></div>
      <div className="footer-toggle-row">
        <button type="button" onClick={()=>setExpanded((value)=>!value)} aria-expanded={expanded} aria-controls="footer-more-information">
          {expanded ? 'MENOS INFORMAÇÕES' : 'MAIS INFORMAÇÕES'} <span className="footer-chevron" aria-hidden="true"/>
        </button>
      </div>
      <div id="footer-more-information" className="footer-expandable" data-expanded={expanded} aria-hidden={!expanded} style={{height:expanded ? `${detailsHeight}px` : '0px'}}>
        <div ref={detailsRef} className="footer-expanded-content">
          <div className="footer-columns container">
            <div><strong>MEUS PEDIDOS</strong><Link href="/minha-conta/pedidos">Acompanhe seus pedidos</Link><Link href="/minha-conta/perfil">Editar cadastro</Link></div>
            <div><strong>CASAS BAHIA</strong><Link href="/institucional/quem-somos">Quem somos</Link><Link href="/institucional/servicos">Serviços</Link><Link href="/institucional/lista-de-presentes">Lista de Presentes</Link><Link href="/institucional/trabalhe-conosco">Trabalhe conosco</Link><Link href="/institucional/venda-seus-produtos">Venda seus produtos</Link><Link href="/institucional/venda-para-empresas">Para empresas</Link><Link href="/institucional/blog">Blog Casas Bahia</Link><Link href="/busca?q=Black%20Friday">Black Friday</Link><Link href="/institucional/desenrola-brasil">Desenrola Brasil</Link></div>
            <div><strong>AJUDA</strong><Link href="/institucional/mapa-do-site">Mapa do Site</Link><Link href="/institucional/atendimento">Atendimento em libras</Link><Link href="/institucional/prazos">Prazos e locais de entrega</Link><Link href="/institucional/trocas-e-devolucoes">Política de Troca e Devolução</Link><Link href="/institucional/quantidade-de-itens">Quantidade de itens por pedido</Link><Link href="/institucional/privacidade">Portal de Privacidade</Link><Link href="/institucional/politica-de-privacidade">Política de Privacidade</Link><Link href="/institucional/termos">Termos e Condições de Uso</Link><Link href="/institucional/seguranca">Segurança Digital</Link></div>
            <div><strong>MARKETPLACE</strong><Link href="/institucional/marketplace">Cadastro</Link><Link href="/institucional/venda-seus-produtos">Venda seus produtos</Link><Link href="/institucional/servicos">Serviços</Link></div>
            <div className="footer-card-column"><strong>CARTÃO CASAS BAHIA</strong><span>Parcele suas compras em até<br/>30x</span><Link className="footer-card-cta" href="/institucional/cartao"><Image src="/brand-assets/02_blue_rounded_b_pay_app_icon.svg" alt="" width={36} height={28}/> Peça já o seu!</Link></div>
          </div>
          <div className="footer-payments-band">
            <div className="footer-payment-layout container">
              <strong>FORMAS DE PAGAMENTO</strong>
              <div className="payment-group"><b>Cartões do Grupo</b><div><span><Image src="/brand-assets/01_blue_b_dot_app_icon_logo.svg" alt="Cartão Casas Bahia" width={40} height={32}/><small>Casas Bahia</small></span></div></div>
              <div className="payment-group"><b>Outras formas</b><div><span><Image src="/brand-assets/02_blue_rounded_b_pay_app_icon.svg" alt="Casas Bahia Pay" width={40} height={32}/><small>Casas Bahia Pay</small></span><span><Image src="/brand-assets/03_blue_and_red_document_interface_icon.svg" alt="Carnê digital" width={40} height={32}/><small>Carnê Digital</small></span><span><Image src="/brand-assets/04_teal_four_petal_app_icon.svg" alt="Pix" width={34} height={30}/><small>Pix</small></span></div></div>
              <div className="payment-group credit-group"><b>Crédito</b><div className="credit-logos"><span><Image src="/brand-assets/05_visa_logo.svg" alt="Visa" width={44} height={28}/><Image src="/brand-assets/06_direct_club_international_logo.svg" alt="Diners Club" width={44} height={28}/></span><span><Image src="/brand-assets/07_overlapping_red_and_golden_circles.svg" alt="Mastercard" width={40} height={28}/><Image src="/brand-assets/08_hypercard_red_logo_tile.svg" alt="Hipercard" width={40} height={28}/></span><span><Image src="/brand-assets/09_dark_green_elo_logo.svg" alt="Elo" width={40} height={28}/><Image src="/brand-assets/10_banescard_blue_ribbon_logo.svg" alt="Banescard" width={40} height={28}/></span><span><Image src="/brand-assets/11_american_express_blue_badge_logo.svg" alt="American Express" width={42} height={28}/><Image src="/brand-assets/12_jcb_logo.svg" alt="JCB" width={42} height={28}/></span></div></div>
            </div>
          </div>
          <div className="footer-social-band"><div className="container">
            <div><strong>ACOMPANHE NAS REDES SOCIAIS</strong><div className="social-logos"><Image src="/brand-assets/20_clean_gray_facebook_icon.svg" alt="Facebook" width={32} height={32}/><Image src="/brand-assets/19_minimal_gray_x_app_icon.svg" alt="X" width={32} height={32}/><Image src="/brand-assets/18_gray_instagram_camera_icon.svg" alt="Instagram" width={32} height={32}/><Image src="/brand-assets/17_gray_rounded_play_button_icon.svg" alt="YouTube" width={32} height={32}/></div></div>
            <div><strong>BAIXE O APP DAS CASAS BAHIA</strong><div className="app-badges"><Image src="/brand-assets/13_portuguese_app_store_download_badge.svg" alt="App Store" width={132} height={44}/><Image src="/brand-assets/14_disponivel_no_google_play_badge.svg" alt="Google Play" width={150} height={44}/></div></div>
            <div className="trust-badges"><Image src="/brand-assets/15_confi_trusted_store_badge.svg" alt="Loja confiável" width={96} height={96}/><Image src="/brand-assets/16_consumidor_gov_br_green_logo.svg" alt="Consumidor.gov.br" width={105} height={58}/></div>
          </div></div>
        </div>
      </div>
      <div className="footer-bottom"><div className="container"><span>{legalLineOne}</span><strong>{legalLineTwo}</strong></div></div>
    </footer>
  );
}

export function PageFrame({ store, categories, children, checkout = false }: { store: Store; categories?: Category[]; children: ReactNode; checkout?: boolean }) {
  if (checkout) return <div className="checkout-frame"><div className="brand-rule"/><header className="checkout-header container"><Logo/><span>♿</span></header>{children}<CheckoutFooter store={store}/></div>;
  return <><SiteHeader {...(categories ? { categories } : {})}/>{children}<SiteFooter store={store}/></>;
}

function CheckoutFooter({ store }: { store: Store }) {
  const profile = store.profile ?? {};
  return <footer className="checkout-footer container">{String(profile.legalName ?? store.displayName)} | {String(profile.address ?? 'Dados da empresa configuráveis no painel administrativo')}</footer>;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="breadcrumbs" aria-label="Navegação estrutural"><Link href="/">Página inicial</Link>{items.map((item)=><span key={item.label}>› {item.href ? <Link href={item.href}>{item.label}</Link> : item.label}</span>)}</nav>;
}
