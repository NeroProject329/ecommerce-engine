'use client';

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';
type Session = {
  token: string;
  storeId: string;
  storeSlug: string;
  permissions: string[];
  mfaVerified: boolean;
};
type Row = Record<string, unknown> & { id: string };
type Module =
  | 'overview'
  | 'catalog'
  | 'inventory'
  | 'pricing'
  | 'orders'
  | 'customers'
  | 'content'
  | 'marketing'
  | 'access'
  | 'integrations'
  | 'imports'
  | 'audit'
  | 'settings'
  | 'security';
type Api = <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
type Toast = { kind: 'success' | 'error'; text: string } | null;
type ViewProps = {
  api: Api;
  base: string;
  data: Record<string, unknown>;
  act: (label: string, fn: () => Promise<unknown>, reload?: boolean) => Promise<void>;
  search: string;
  onMfaVerified?: () => void;
};

const money = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const navigation: Array<{ group: string; items: Array<[Module, string, string]> }> = [
  {
    group: 'Operação',
    items: [
      ['overview', '⌂', 'Visão geral'],
      ['orders', '▤', 'Pedidos e entregas'],
      ['customers', '♙', 'Clientes'],
      ['inventory', '▥', 'Estoque'],
    ],
  },
  {
    group: 'Comercial',
    items: [
      ['catalog', '◇', 'Catálogo'],
      ['pricing', '%', 'Preços e promoções'],
      ['content', '◫', 'Loja e conteúdo'],
      ['marketing', '✦', 'Marketing'],
    ],
  },
  {
    group: 'Plataforma',
    items: [
      ['integrations', '⌁', 'Integrações'],
      ['imports', '⇩', 'Importações'],
      ['access', '♢', 'Equipe e acesso'],
      ['audit', '◎', 'Auditoria'],
      ['settings', '⚙', 'Configurações'],
      ['security', '⌾', 'Minha segurança'],
    ],
  },
];
const titles: Record<Module, [string, string]> = {
  overview: ['Visão geral', 'Indicadores e prioridades da operação'],
  catalog: ['Catálogo', 'Produtos, variantes e organização'],
  inventory: ['Estoque', 'Saldos, locais e movimentações'],
  pricing: ['Preços e promoções', 'Estratégia comercial e cupons'],
  orders: ['Pedidos e entregas', 'Operação do pedido até a entrega'],
  customers: ['Clientes', 'Relacionamento, endereços e exportação'],
  content: ['Loja e conteúdo', 'Banners e montagem da home'],
  marketing: ['Marketing', 'Campanhas, templates e consentimentos'],
  access: ['Equipe e acesso', 'Usuários, funções e permissões'],
  integrations: ['Integrações', 'Credenciais M2M e webhooks'],
  imports: ['Importações', 'Lotes recebidos do Product Collector'],
  audit: ['Auditoria', 'Rastreabilidade administrativa'],
  settings: ['Configurações', 'Dados completos da empresa e frete'],
  security: ['Minha segurança', 'Sessão, senha e autenticação MFA'],
};

function asRows(value: unknown): Row[] {
  if (Array.isArray(value)) return value as Row[];
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items))
    return (value as { items: Row[] }).items;
  return [];
}
function text(value: unknown, fallback = '—') {
  return value === null || value === undefined || value === '' ? fallback : String(value);
}
function date(value: unknown) {
  if (!value) return '—';
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.valueOf()) ? '—' : dateTime.format(parsed);
}
function csv(value: FormDataEntryValue | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
function optional(value: FormDataEntryValue | null) {
  const result = String(value ?? '').trim();
  return result || undefined;
}
function integer(value: FormDataEntryValue | null, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}
function cents(value: FormDataEntryValue | null) {
  return Math.round(Number(value || 0) * 100);
}
function confirmAction(message: string, action: () => void) {
  if (window.confirm(message)) action();
}

export default function AdminApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [module, setModule] = useState<Module>('overview');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [search, setSearch] = useState('');
  useEffect(() => {
    const saved = sessionStorage.getItem('ecommerce-admin-session');
    if (saved)
      try {
        const restored = JSON.parse(saved) as Session;
        setSession(restored);
        if (!restored.mfaVerified) setModule('security');
      } catch {
        sessionStorage.removeItem('ecommerce-admin-session');
      }
  }, []);
  const api = useCallback<Api>(
    async (path, init = {}) => {
      if (!session) throw new Error('SESSION_REQUIRED');
      const response = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
          authorization: `Bearer ${session.token}`,
          ...(init.body ? { 'content-type': 'application/json' } : {}),
          ...init.headers,
        },
        cache: 'no-store',
      });
      if (response.status === 204) return undefined as never;
      const contentType = response.headers.get('content-type') ?? '';
      const payload = contentType.includes('json')
        ? await response.json().catch(() => ({}))
        : await response.text();
      if (!response.ok) {
        const body = payload as { message?: string; title?: string; detail?: string };
        throw new Error(body.detail ?? body.message ?? body.title ?? `HTTP_${response.status}`);
      }
      return ((payload as { data?: unknown }).data ?? payload) as never;
    },
    [session],
  );
  const base = session ? `/v1/admin/stores/${session.storeId}` : '';
  const load = useCallback(
    async (target: Module) => {
      if (!session) return;
      setLoading(true);
      setToast(null);
      const endpoints: Record<Module, Record<string, string>> = {
        overview: {
          summary: `${base}/operations/summary`,
          products: `${base}/catalog/products?limit=8`,
          orders: `${base}/operations/orders?limit=8`,
        },
        catalog: {
          products: `${base}/catalog/products?limit=100`,
          categories: `${base}/catalog/categories`,
          brands: `${base}/catalog/brands`,
          attributes: `${base}/catalog/attributes`,
          media: `${base}/media?limit=100`,
        },
        inventory: {
          inventory: `${base}/catalog/inventory`,
          movements: `${base}/catalog/inventory/movements`,
          locations: `${base}/catalog/inventory-locations`,
          products: `${base}/catalog/products?limit=100`,
        },
        pricing: {
          promotions: `${base}/pricing/promotions?limit=100`,
          coupons: `${base}/pricing/coupons?limit=100`,
          history: `${base}/pricing/history?limit=100`,
          products: `${base}/catalog/products?limit=100`,
        },
        orders: {
          orders: `${base}/operations/orders?limit=100`,
          shipments: `${base}/operations/shipments?limit=100`,
        },
        customers: { customers: `${base}/operations/customers?limit=100` },
        content: {
          sections: `${base}/content/sections`,
          banners: `${base}/content/banners`,
          media: `${base}/media?limit=100`,
        },
        marketing: {
          campaigns: `${base}/communications/campaigns`,
          templates: `${base}/communications/templates`,
          consents: `${base}/integrations/consents`,
          outbox: `${base}/communications/outbox?limit=100`,
        },
        access: { users: `${base}/access/users`, roles: `${base}/access/roles` },
        integrations: {
          clients: `${base}/integrations/clients`,
          webhooks: `${base}/communications/webhooks`,
          deliveries: `${base}/communications/webhook-deliveries`,
        },
        imports: { imports: `${base}/operations/imports?limit=100` },
        audit: { audit: `${base}/operations/audit?limit=100` },
        settings: { store: `${base}/content/store`, shipping: `${base}/content/shipping-rules` },
        security: { sessions: '/v1/admin/auth/sessions' },
      };
      const entries = Object.entries(endpoints[target]);
      const settled = await Promise.allSettled(entries.map(([, path]) => api(path)));
      const next: Record<string, unknown> = {};
      settled.forEach((result, index) => {
        const entry = entries[index];
        if (result.status === 'fulfilled' && entry) next[entry[0]] = result.value;
      });
      setData(next);
      if (settled.some((result) => result.status === 'rejected'))
        setToast({
          kind: 'error',
          text: 'Alguns dados não puderam ser carregados. Verifique suas permissões.',
        });
      setLoading(false);
    },
    [api, base, session],
  );
  useEffect(() => {
    if (session) void load(module);
  }, [session, module, load]);
  async function login(input: {
    storeSlug: string;
    email: string;
    password: string;
    totp?: string;
  }) {
    setLoading(true);
    setToast(null);
    try {
      const response = await fetch(`${API_BASE}/v1/admin/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = (await response.json()) as {
        data?: Omit<Session, 'storeSlug'>;
        message?: string;
      };
      if (!response.ok || !body.data) throw new Error(body.message ?? 'LOGIN_FAILED');
      const next = { ...body.data, storeSlug: input.storeSlug };
      sessionStorage.setItem('ecommerce-admin-session', JSON.stringify(next));
      setSession(next);
      if (!next.mfaVerified) setModule('security');
    } catch (error) {
      setToast({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Não foi possível entrar.',
      });
      setLoading(false);
    }
  }
  async function logout() {
    if (session)
      await fetch(`${API_BASE}/v1/admin/auth/logout`, {
        method: 'POST',
        headers: { authorization: `Bearer ${session.token}` },
      }).catch(() => undefined);
    sessionStorage.removeItem('ecommerce-admin-session');
    setSession(null);
    setData({});
  }
  const act = useCallback(
    async (label: string, operation: () => Promise<unknown>, reload = true) => {
      setLoading(true);
      setToast(null);
      try {
        await operation();
        setToast({ kind: 'success', text: `${label} concluído com sucesso.` });
        if (reload) await load(module);
        else setLoading(false);
      } catch (error) {
        setToast({
          kind: 'error',
          text: error instanceof Error ? error.message : 'Não foi possível concluir a operação.',
        });
        setLoading(false);
      }
    },
    [load, module],
  );
  const markMfaVerified = useCallback(() => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, mfaVerified: true };
      sessionStorage.setItem('ecommerce-admin-session', JSON.stringify(next));
      return next;
    });
  }, []);
  if (!session) return <LoginScreen onLogin={login} loading={loading} toast={toast} />;
  const props = { api, base, data, act, search, onMfaVerified: markMfaVerified };
  return (
    <div className="admin-shell">
      <aside className="sidebar">
        <Wordmark />
        <div className="store-chip">
          <span>{session.storeSlug.slice(0, 2).toUpperCase()}</span>
          <div>
            <strong>{session.storeSlug}</strong>
            <small>Loja ativa · BRL</small>
          </div>
        </div>
        <nav className="side-nav" aria-label="Módulos administrativos">
          {navigation.map((section) => (
            <div className="nav-group" key={section.group}>
              <p>{section.group}</p>
              {section.items.map(([key, icon, label]) => (
                <button
                  key={key}
                  className={module === key ? 'active' : ''}
                  disabled={!session.mfaVerified && key !== 'security'}
                  title={
                    !session.mfaVerified && key !== 'security'
                      ? 'Ative o MFA para acessar este módulo'
                      : undefined
                  }
                  onClick={() => setModule(key)}
                >
                  <span>{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-foot">
          <span className="status-dot" /> API conectada
          <br />
          <small>{session.permissions.length} permissões disponíveis</small>
        </div>
      </aside>
      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="overline">Central de operação</p>
            <h1>{titles[module][0]}</h1>
            <p className="page-subtitle">{titles[module][1]}</p>
          </div>
          <div className="top-actions">
            <label className="global-search">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Filtrar nesta tela"
              />
            </label>
            <button
              className="icon-button"
              onClick={() => void load(module)}
              aria-label="Atualizar dados"
            >
              ↻
            </button>
            <div className="avatar">AD</div>
            <button className="text-button" onClick={() => void logout()}>
              Sair
            </button>
          </div>
        </header>
        {toast && (
          <div className={`toast ${toast.kind}`}>
            {toast.kind === 'success' ? '✓' : '!'} {toast.text}
            <button onClick={() => setToast(null)}>×</button>
          </div>
        )}
        {loading && (
          <div className="progress" aria-label="Carregando">
            <span />
          </div>
        )}
        <ModuleView module={module} {...props} />
      </main>
    </div>
  );
}

function ModuleView({ module, ...props }: { module: Module } & ViewProps) {
  switch (module) {
    case 'overview':
      return <Overview {...props} />;
    case 'catalog':
      return <Catalog {...props} />;
    case 'inventory':
      return <Inventory {...props} />;
    case 'pricing':
      return <Pricing {...props} />;
    case 'orders':
      return <Orders {...props} />;
    case 'customers':
      return <Customers {...props} />;
    case 'content':
      return <Content {...props} />;
    case 'marketing':
      return <Marketing {...props} />;
    case 'access':
      return <Access {...props} />;
    case 'integrations':
      return <Integrations {...props} />;
    case 'imports':
      return <Imports {...props} />;
    case 'audit':
      return <Audit {...props} />;
    case 'settings':
      return <Settings {...props} />;
    case 'security':
      return <Security {...props} />;
  }
}

function Overview({ data }: ViewProps) {
  const summary = (data.summary ?? {}) as Record<string, number>;
  const products = asRows(data.products);
  const orders = asRows(data.orders);
  const cards = [
    ['Receita processada', money.format((summary.revenueCents ?? 0) / 100), '↗'],
    ['Pedidos em operação', text(summary.pendingOrders, '0'), '▤'],
    ['Produtos publicados', text(summary.publishedProducts, '0'), '◇'],
    ['Estoque em atenção', text(summary.lowStock, '0'), '!'],
  ];
  return (
    <div className="view">
      <section className="metrics">
        {cards.map(([label, value, icon], index) => (
          <article className="metric" key={label}>
            <span className={`metric-mark mark-${index}`}>{icon}</span>
            <p>{label}</p>
            <strong>{value}</strong>
            <small>Atualizado com dados da API</small>
          </article>
        ))}
      </section>
      <section className="dashboard-grid">
        <Panel title="Pedidos recentes" eyebrow="Operação">
          <OrderTable rows={orders} />
        </Panel>
        <Panel title="Prontidão da loja" eyebrow="Checklist">
          <Checklist
            items={[
              ['Catálogo publicado', (summary.publishedProducts ?? 0) > 0],
              ['Clientes ativos', (summary.customers ?? 0) > 0],
              ['Operação sem importações presas', (summary.activeImports ?? 0) === 0],
              ['Produtos fora do estoque crítico', (summary.lowStock ?? 0) === 0],
            ]}
          />
        </Panel>
      </section>
      <Panel title="Catálogo recente" eyebrow="Produtos">
        <ProductTable rows={products} />
      </Panel>
    </div>
  );
}

function Catalog({ data, api, base, act, search }: ViewProps) {
  const [tab, setTab] = useState('products');
  const [selected, setSelected] = useState<Row | null>(null);
  const products = filter(asRows(data.products), search, ['title', 'slug', 'publicationStatus']);
  const categories = filter(asRows(data.categories), search, ['name', 'slug', 'status']);
  const brands = filter(asRows(data.brands), search, ['name', 'slug', 'status']);
  const attributes = filter(asRows(data.attributes), search, ['name', 'code', 'dataType']);
  const media = asRows(data.media);
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['products', 'Produtos'],
          ['categories', 'Categorias'],
          ['brands', 'Marcas'],
          ['attributes', 'Atributos'],
          ['media', 'Imagens'],
        ]}
      />
      {tab === 'products' && (
        <>
          <Panel
            title="Produtos"
            eyebrow="Catálogo"
            action={
              <button className="primary small" onClick={() => setSelected({ id: 'new' })}>
                + Novo produto
              </button>
            }
          >
            <ProductTable rows={products} onSelect={setSelected} />
          </Panel>
          {selected && (
            <ProductEditor
              item={selected}
              categories={categories}
              brands={brands}
              media={media}
              api={api}
              base={base}
              act={act}
              close={() => setSelected(null)}
            />
          )}
        </>
      )}
      {tab === 'categories' && (
        <SimpleManager
          title="Categorias"
          rows={categories}
          fields={[
            ['name', 'Nome'],
            ['slug', 'Slug'],
          ]}
          create={(values) =>
            api(`${base}/catalog/categories`, {
              method: 'POST',
              body: JSON.stringify({ ...values, position: 0 }),
            })
          }
          archive={(id) => api(`${base}/catalog/categories/${id}`, { method: 'DELETE' })}
          update={(id, values) =>
            api(`${base}/catalog/categories/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(values),
            })
          }
          act={act}
        />
      )}{' '}
      {tab === 'brands' && (
        <SimpleManager
          title="Marcas"
          rows={brands}
          fields={[
            ['name', 'Nome'],
            ['slug', 'Slug'],
          ]}
          create={(values) =>
            api(`${base}/catalog/brands`, { method: 'POST', body: JSON.stringify(values) })
          }
          archive={(id) => api(`${base}/catalog/brands/${id}`, { method: 'DELETE' })}
          update={(id, values) =>
            api(`${base}/catalog/brands/${id}`, {
              method: 'PATCH',
              body: JSON.stringify(values),
            })
          }
          act={act}
        />
      )}{' '}
      {tab === 'attributes' && (
        <AttributeManager rows={attributes} api={api} base={base} act={act} />
      )}{' '}
      {tab === 'media' && (
        <MediaManager rows={media} products={products} api={api} base={base} act={act} />
      )}
    </div>
  );
}

function ProductEditor({
  item,
  categories,
  brands,
  media,
  api,
  base,
  act,
  close,
}: {
  item: Row;
  categories: Row[];
  brands: Row[];
  media: Row[];
  api: Api;
  base: string;
  act: ViewProps['act'];
  close: () => void;
}) {
  const isNew = item.id === 'new';
  const [detail, setDetail] = useState<Row>(item);
  const [editingVariant, setEditingVariant] = useState<Row | null>(null);
  useEffect(() => {
    if (!isNew) void api<Row>(`${base}/catalog/products/${item.id}`).then(setDetail);
  }, [api, base, isNew, item.id]);
  const variants = asRows(detail.variants);
  async function refreshDetail() {
    if (!isNew) setDetail(await api<Row>(`${base}/catalog/products/${item.id}`));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = {
      title: String(form.get('title')),
      slug: optional(form.get('slug')),
      description: String(form.get('description') ?? ''),
      primaryCategoryId: String(form.get('primaryCategoryId')),
      brandId: optional(form.get('brandId')) ?? null,
      categoryIds: [String(form.get('primaryCategoryId'))],
    };
    await act(isNew ? 'Produto criado' : 'Produto atualizado', () =>
      api(`${base}/catalog/products${isNew ? '' : `/${item.id}`}`, {
        method: isNew ? 'POST' : 'PATCH',
        body: JSON.stringify(body),
      }),
    );
    close();
  }
  return (
    <Drawer
      title={isNew ? 'Novo produto' : text(detail.title)}
      subtitle="Cadastro comercial, variantes e publicação"
      close={close}
    >
      <form className="form-grid" onSubmit={save}>
        <Field
          name="title"
          label="Nome do produto"
          defaultValue={text(detail.title, '')}
          required
        />
        <Field name="slug" label="Slug" defaultValue={text(detail.slug, '')} />
        <Select
          name="primaryCategoryId"
          label="Categoria principal"
          defaultValue={text(
            (detail.primaryCategory as Row | undefined)?.id ?? detail.primaryCategoryId,
            '',
          )}
          options={categories.map((row) => [row.id, text(row.name)])}
          required
        />
        <Select
          name="brandId"
          label="Marca"
          defaultValue={text((detail.brand as Row | undefined)?.id ?? detail.brandId, '')}
          options={brands.map((row) => [row.id, text(row.name)])}
        />
        <Field
          name="description"
          label="Descrição"
          defaultValue={text(detail.description, '')}
          textarea
          wide
        />
        <div className="drawer-actions">
          <button type="button" className="secondary" onClick={close}>
            Cancelar
          </button>
          <button className="primary">Salvar produto</button>
        </div>
      </form>
      {!isNew && (
        <>
          <Divider />
          <div className="section-title">
            <div>
              <h3>Variantes</h3>
              <p>SKU, dimensões, preço e imagem associados ao produto.</p>
            </div>
            <button
              className="secondary"
              onClick={() =>
                void act('Produto publicado', () =>
                  api(`${base}/catalog/products/${item.id}/publish`, { method: 'POST' }),
                )
              }
            >
              Publicar produto
            </button>
          </div>
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act(
                'Variante criada',
                () =>
                  api(`${base}/catalog/products/${item.id}/variants`, {
                    method: 'POST',
                    body: JSON.stringify({
                      sku: optional(f.get('sku')),
                      ean: optional(f.get('ean')),
                      attributes: {},
                      weightGrams: integer(f.get('weightGrams')) || null,
                    }),
                  }),
                false,
              ).then(() => void refreshDetail());
            }}
          >
            <Field name="sku" label="SKU" required />
            <Field name="ean" label="EAN" />
            <Field name="weightGrams" label="Peso (g)" type="number" />
            <button className="primary small">Adicionar variante</button>
          </form>
          <div className="stack">
            {variants.map((variant) => (
              <article className="compact-card" key={variant.id}>
                <div>
                  <strong>{text(variant.sku, 'Sem SKU')}</strong>
                  <small>{text(variant.ean, 'EAN não informado')}</small>
                </div>
                <Badge value={text(variant.status, 'ACTIVE')} />
                <button className="link" onClick={() => setEditingVariant(variant)}>
                  Editar
                </button>
                <button
                  className="link"
                  onClick={() => {
                    const amount = prompt('Novo preço em centavos', '0');
                    if (amount)
                      void act('Preço atualizado', () =>
                        api(`${base}/pricing/variants/${variant.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({
                            amountCents: integer(amount),
                            compareAtCents: null,
                            currency: 'BRL',
                            reason: 'Alteração pelo painel',
                          }),
                        }),
                      );
                  }}
                >
                  Alterar preço
                </button>
                <button
                  className="link"
                  onClick={() => {
                    const mediaId = prompt(`ID da mídia (${media.length} disponíveis)`);
                    if (mediaId)
                      void act('Imagem associada', () =>
                        api(`${base}/media/variants/${variant.id}`, {
                          method: 'PUT',
                          body: JSON.stringify({
                            mediaAssetId: mediaId,
                            role: 'GALLERY',
                            sortOrder: 0,
                          }),
                        }),
                      );
                  }}
                >
                  Associar imagem
                </button>
              </article>
            ))}
          </div>
          {editingVariant && (
            <Drawer
              title={`Editar variante ${text(editingVariant.sku, '')}`}
              subtitle="Identificação, dimensões e disponibilidade"
              close={() => setEditingVariant(null)}
            >
              <form
                className="form-grid"
                onSubmit={(event) => {
                  event.preventDefault();
                  const f = new FormData(event.currentTarget);
                  void act(
                    'Variante atualizada',
                    () =>
                      api(`${base}/catalog/variants/${editingVariant.id}`, {
                        method: 'PATCH',
                        body: JSON.stringify({
                          sku: optional(f.get('sku')) ?? null,
                          ean: optional(f.get('ean')) ?? null,
                          weightGrams: integer(f.get('weightGrams')) || null,
                          lengthMm: integer(f.get('lengthMm')) || null,
                          widthMm: integer(f.get('widthMm')) || null,
                          heightMm: integer(f.get('heightMm')) || null,
                          status: String(f.get('status')),
                        }),
                      }),
                    false,
                  ).then(() => {
                    setEditingVariant(null);
                    void refreshDetail();
                  });
                }}
              >
                <Field name="sku" label="SKU" defaultValue={text(editingVariant.sku, '')} />
                <Field name="ean" label="EAN" defaultValue={text(editingVariant.ean, '')} />
                <Field
                  name="weightGrams"
                  label="Peso (g)"
                  type="number"
                  defaultValue={text(editingVariant.weightGrams, '')}
                />
                <Field
                  name="lengthMm"
                  label="Comprimento (mm)"
                  type="number"
                  defaultValue={text(editingVariant.lengthMm, '')}
                />
                <Field
                  name="widthMm"
                  label="Largura (mm)"
                  type="number"
                  defaultValue={text(editingVariant.widthMm, '')}
                />
                <Field
                  name="heightMm"
                  label="Altura (mm)"
                  type="number"
                  defaultValue={text(editingVariant.heightMm, '')}
                />
                <Select
                  name="status"
                  label="Status"
                  defaultValue={text(editingVariant.status, 'ACTIVE')}
                  options={['ACTIVE', 'INACTIVE', 'ARCHIVED'].map((value) => [value, value])}
                />
                <div className="drawer-actions">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setEditingVariant(null)}
                  >
                    Cancelar
                  </button>
                  <button className="primary">Salvar variante</button>
                </div>
              </form>
            </Drawer>
          )}
        </>
      )}
    </Drawer>
  );
}

function AttributeManager({
  rows,
  api,
  base,
  act,
}: {
  rows: Row[];
  api: Api;
  base: string;
  act: ViewProps['act'];
}) {
  const [selected, setSelected] = useState<Row | null>(null);
  return (
    <>
    <Panel title="Atributos" eyebrow="Variações">
      <form
        className="inline-form"
        onSubmit={(event) => {
          event.preventDefault();
          const f = new FormData(event.currentTarget);
          void act('Atributo criado', () =>
            api(`${base}/catalog/attributes`, {
              method: 'POST',
              body: JSON.stringify({
                code: String(f.get('code')),
                name: String(f.get('name')),
                dataType: String(f.get('dataType')),
                unit: optional(f.get('unit')) ?? null,
                options: csv(f.get('options')),
              }),
            }),
          );
        }}
      >
        <Field name="name" label="Nome" required />
        <Field name="code" label="Código" required />
        <Select
          name="dataType"
          label="Tipo"
          options={['TEXT', 'NUMBER', 'BOOLEAN', 'OPTION', 'MULTI_OPTION'].map((v) => [v, v])}
        />
        <Field name="unit" label="Unidade" />
        <Field name="options" label="Opções (vírgula)" />
        <button className="primary small">Adicionar</button>
      </form>
      <CardList
        rows={rows}
        title="name"
        meta={(row) => `${text(row.code)} · ${text(row.dataType)}`}
        actions={(row) => (
          <>
            <button className="link" onClick={() => setSelected(row)}>
              Editar
            </button>
            <button
              className="danger-link"
              onClick={() =>
                confirmAction(`Arquivar o atributo “${text(row.name)}”?`, () =>
                  void act('Atributo arquivado', () =>
                    api(`${base}/catalog/attributes/${row.id}`, { method: 'DELETE' }),
                  ),
                )
              }
            >
              Arquivar
            </button>
          </>
        )}
      />
    </Panel>
    {selected && (
      <Drawer
        title={`Editar ${text(selected.name)}`}
        subtitle="Nome, unidade, opções e disponibilidade"
        close={() => setSelected(null)}
      >
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            void act('Atributo atualizado', () =>
              api(`${base}/catalog/attributes/${selected.id}`, {
                method: 'PATCH',
                body: JSON.stringify({
                  name: String(f.get('name')),
                  unit: optional(f.get('unit')) ?? null,
                  options: csv(f.get('options')),
                  active: String(f.get('active')) === 'true',
                }),
              }),
            ).then(() => setSelected(null));
          }}
        >
          <Field name="name" label="Nome" defaultValue={text(selected.name, '')} required />
          <Field name="unit" label="Unidade" defaultValue={text(selected.unit, '')} />
          <Field
            name="options"
            label="Opções separadas por vírgula"
            defaultValue={
              Array.isArray(selected.optionsJson) ? selected.optionsJson.join(',') : ''
            }
            wide
          />
          <Select
            name="active"
            label="Disponibilidade"
            defaultValue={selected.active === false ? 'false' : 'true'}
            options={[
              ['true', 'Ativo'],
              ['false', 'Inativo'],
            ]}
          />
          <div className="drawer-actions">
            <button type="button" className="secondary" onClick={() => setSelected(null)}>
              Cancelar
            </button>
            <button className="primary">Salvar atributo</button>
          </div>
        </form>
      </Drawer>
    )}
    </>
  );
}

function MediaManager({
  rows,
  products,
  api,
  base,
  act,
}: {
  rows: Row[];
  products: Row[];
  api: Api;
  base: string;
  act: ViewProps['act'];
}) {
  async function upload(file: File) {
    const contentBase64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await act('Imagem enviada', () =>
      api(`${base}/media/uploads`, { method: 'POST', body: JSON.stringify({ contentBase64 }) }),
    );
  }
  return (
    <div className="view">
      <Panel
        title="Biblioteca de mídia"
        eyebrow="Imagens"
        action={
          <label className="primary small file-button">
            Enviar arquivo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </label>
        }
      >
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            void act('Imagem importada', () =>
              api(`${base}/media/imports`, {
                method: 'POST',
                body: JSON.stringify({ url: String(f.get('url')) }),
              }),
            );
          }}
        >
          <Field name="url" label="Ou importar por URL HTTPS" type="url" required wide />
          <button className="secondary">Importar URL</button>
        </form>
        <div className="media-grid">
          {rows.map((row) => (
            <article key={row.id}>
              <div className="media-preview">
                {row.publicUrl ? <img src={String(row.publicUrl)} alt="" /> : <span>IMG</span>}
              </div>
              <strong>{text(row.originalFilename ?? row.id)}</strong>
              <small>
                {text(row.mimeType)} · {text(row.processingStatus)}
              </small>
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Excluir a mídia “${text(row.originalFilename ?? row.id)}”?`, () =>
                    void act('Mídia excluída', () =>
                      api(`${base}/media/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Excluir
              </button>
            </article>
          ))}
        </div>
      </Panel>
      <Panel title="Associação rápida" eyebrow="Produtos">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const f = new FormData(event.currentTarget);
            void act('Imagem associada', () =>
              api(`${base}/media/products/${String(f.get('productId'))}`, {
                method: 'PUT',
                body: JSON.stringify({
                  mediaAssetId: String(f.get('mediaId')),
                  role: String(f.get('role')),
                  sortOrder: 0,
                }),
              }),
            );
          }}
        >
          <Select
            name="productId"
            label="Produto"
            options={products.map((row) => [row.id, text(row.title)])}
          />
          <Select
            name="mediaId"
            label="Imagem"
            options={rows.map((row) => [row.id, text(row.originalFilename ?? row.id)])}
          />
          <Select
            name="role"
            label="Uso"
            options={['PRIMARY', 'GALLERY', 'THUMBNAIL', 'SWATCH'].map((v) => [v, v])}
          />
          <button className="primary small">Associar</button>
        </form>
      </Panel>
    </div>
  );
}

function Inventory({ data, api, base, act, search }: ViewProps) {
  const locations = asRows(data.locations);
  const variants: Row[] = asRows(data.products).flatMap((product) =>
    asRows(product.variants).map((variant) => ({
      ...variant,
      productTitle: product.title,
    }) as Row),
  );
  const items = filter(
    asRows(data.inventory).map((row) => ({
      ...row,
      sku: (row.variant as Row | undefined)?.sku,
      productTitle: ((row.variant as Row | undefined)?.product as Row | undefined)?.title,
      locationName: (row.location as Row | undefined)?.name,
    })),
    search,
    ['sku', 'productTitle', 'locationName'],
  );
  const movements = filter(
    asRows(data.movements).map((row) => ({
      ...row,
      sku: (row.variant as Row | undefined)?.sku,
      locationName: (row.location as Row | undefined)?.name,
    })),
    search,
    ['reason', 'type', 'sku', 'locationName'],
  );
  return (
    <div className="view">
      <section className="split-panels">
        <Panel title="Ajustar estoque" eyebrow="Movimentação">
          <form
            className="form-grid compact"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Estoque ajustado', () =>
                api(`${base}/catalog/inventory/adjustments`, {
                  method: 'POST',
                  body: JSON.stringify({
                    variantId: String(f.get('variantId')),
                    locationId: String(f.get('locationId')),
                    delta: integer(f.get('delta')),
                    reason: String(f.get('reason')),
                    deduplicationKey: `panel-${Date.now()}`,
                  }),
                }),
              );
            }}
          >
            <Select
              name="variantId"
              label="Variante"
              options={variants.map((row) => [
                row.id,
                `${text(row.productTitle)} · ${text(row.sku, 'sem SKU')}`,
              ])}
              required
            />
            <Select
              name="locationId"
              label="Local"
              options={locations.map((row) => [row.id, `${text(row.name)} · ${text(row.code)}`])}
              required
            />
            <Field name="delta" label="Quantidade (+/-)" type="number" required />
            <Field name="reason" label="Motivo" required />
            <button className="primary">Registrar ajuste</button>
          </form>
        </Panel>
        <Panel title="Novo local" eyebrow="Armazém">
          <form
            className="form-grid compact"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Local criado', () =>
                api(`${base}/catalog/inventory-locations`, {
                  method: 'POST',
                  body: JSON.stringify({
                    code: String(f.get('code')),
                    name: String(f.get('name')),
                  }),
                }),
              );
            }}
          >
            <Field name="code" label="Código" required />
            <Field name="name" label="Nome do local" required />
            <button className="primary">Criar local</button>
          </form>
        </Panel>
      </section>
      <Panel title="Locais de estoque" eyebrow="Armazéns ativos">
        <GenericTable
          rows={locations}
          columns={[
            ['code', 'Código'],
            ['name', 'Nome'],
            ['createdAt', 'Criado'],
          ]}
        />
      </Panel>
      <Panel title="Saldos por variante" eyebrow="Estoque">
        <GenericTable
          rows={items}
          columns={[
            ['productTitle', 'Produto'],
            ['sku', 'SKU'],
            ['locationName', 'Local'],
            ['onHand', 'Físico'],
            ['reserved', 'Reservado'],
          ]}
        />
      </Panel>
      <Panel title="Movimentações" eyebrow="Histórico">
        <GenericTable
          rows={movements}
          columns={[
            ['createdAt', 'Data'],
            ['sku', 'SKU'],
              ['locationName', 'Local'],
            ['delta', 'Variação'],
            ['reason', 'Motivo'],
            ['type', 'Tipo'],
          ]}
        />
      </Panel>
    </div>
  );
}

function Pricing({ data, api, base, act, search }: ViewProps) {
  const [tab, setTab] = useState('promotions');
  const promotions = filter(asRows(data.promotions), search, ['name', 'status']);
  const coupons = filter(asRows(data.coupons), search, ['code']);
  const history = filter(asRows(data.history), search, ['reason']);
  const variants = asRows(data.products).flatMap((product) => asRows(product.variants));
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['promotions', 'Promoções'],
          ['coupons', 'Cupons'],
          ['prices', 'Preços'],
          ['history', 'Histórico'],
        ]}
      />
      {tab === 'promotions' && (
        <Panel title="Promoções" eyebrow="Campanhas">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Promoção criada', () =>
                api(`${base}/pricing/promotions`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    percentageBasisPoints: integer(f.get('percentage')) * 100,
                    priority: integer(f.get('priority')),
                    targets: [{ targetType: 'STORE', targetId: null }],
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome" required />
            <Field name="percentage" label="Desconto (%)" type="number" required />
            <Field name="priority" label="Prioridade" type="number" defaultValue="0" />
            <button className="primary small">Criar promoção</button>
          </form>
          <CardList
            rows={promotions}
            title="name"
            meta={(row) => `${Number(row.percentageBasisPoints ?? 0) / 100}% · ${text(row.status)}`}
            actions={(row) => (
              <>
                <button
                  className="link"
                  onClick={() =>
                    void act('Promoção ativada', () =>
                      api(`${base}/pricing/promotions/${row.id}/activate`, { method: 'POST' }),
                    )
                  }
                >
                  Ativar
                </button>
                <button
                  className="danger-link"
                  onClick={() =>
                    confirmAction(`Encerrar a promoção “${text(row.name)}”?`, () =>
                      void act('Promoção encerrada', () =>
                        api(`${base}/pricing/promotions/${row.id}`, { method: 'DELETE' }),
                      ),
                    )
                  }
                >
                  Encerrar
                </button>
              </>
            )}
          />
        </Panel>
      )}
      {tab === 'coupons' && (
        <Panel title="Cupons" eyebrow="Conversão">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Cupom criado', () =>
                api(`${base}/pricing/coupons`, {
                  method: 'POST',
                  body: JSON.stringify({
                    code: String(f.get('code')),
                    percentageBasisPoints: integer(f.get('percentage')) * 100,
                    minimumSubtotalCents: cents(f.get('minimum')),
                    maximumDiscountCents: cents(f.get('maximum')) || null,
                    maxUses: integer(f.get('maxUses')) || null,
                  }),
                }),
              );
            }}
          >
            <Field name="code" label="Código" required />
            <Field name="percentage" label="Desconto (%)" type="number" required />
            <Field name="minimum" label="Compra mínima (R$)" type="number" />
            <Field name="maximum" label="Desconto máximo (R$)" type="number" />
            <Field name="maxUses" label="Usos" type="number" />
            <button className="primary small">Criar cupom</button>
          </form>
          <CardList
            rows={coupons}
            title="code"
            meta={(row) =>
              `${Number(row.percentageBasisPoints ?? 0) / 100}% · ${row.active ? 'Ativo' : 'Inativo'}`
            }
            actions={(row) => (
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Desativar o cupom “${text(row.code)}”?`, () =>
                    void act('Cupom desativado', () =>
                      api(`${base}/pricing/coupons/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Desativar
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'prices' && (
        <Panel title="Preço por variante" eyebrow="Tabela vigente">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Preço atualizado', () =>
                api(`${base}/pricing/variants/${String(f.get('variantId'))}`, {
                  method: 'PUT',
                  body: JSON.stringify({
                    amountCents: cents(f.get('amount')),
                    compareAtCents: cents(f.get('compareAt')) || null,
                    currency: 'BRL',
                    reason: String(f.get('reason')),
                  }),
                }),
              );
            }}
          >
            <Select
              name="variantId"
              label="Variante"
              options={variants.map((v) => [v.id, text(v.sku, v.id)])}
            />
            <Field name="amount" label="Preço (R$)" type="number" required />
            <Field name="compareAt" label="De (R$)" type="number" />
            <Field name="reason" label="Motivo" defaultValue="Ajuste comercial" />
            <button className="primary small">Atualizar preço</button>
          </form>
        </Panel>
      )}
      {tab === 'history' && (
        <Panel title="Histórico de preços" eyebrow="Auditoria">
          <GenericTable
            rows={history}
            columns={[
              ['createdAt', 'Data'],
              ['variantId', 'Variante'],
              ['oldAmountCents', 'Anterior'],
              ['newAmountCents', 'Novo'],
              ['reason', 'Motivo'],
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

function Orders({ data, api, base, act, search }: ViewProps) {
  const [tab, setTab] = useState('orders');
  const [detail, setDetail] = useState<Row | null>(null);
  const [selectedShipment, setSelectedShipment] = useState<Row | null>(null);
  const orders = filter(asRows(data.orders), search, ['number', 'status']);
  const shipments = filter(asRows(data.shipments), search, ['trackingCode', 'carrier', 'status']);
  async function open(row: Row) {
    setDetail(await api<Row>(`${base}/operations/orders/${row.id}`));
  }
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['orders', 'Pedidos'],
          ['shipments', 'Entregas'],
        ]}
      />
      {tab === 'orders' && (
        <Panel title="Pedidos" eyebrow="Operação">
          <OrderTable rows={orders} onSelect={(row) => void open(row)} />
        </Panel>
      )}
      {tab === 'shipments' && (
        <Panel title="Entregas e rastreio" eyebrow="Logística">
          <div className="card-list">
            {shipments.map((row) => (
              <article className="list-card" key={row.id}>
                <div>
                  <strong>
                    #{text((row.order as Row | undefined)?.number ?? row.orderNumber)}
                  </strong>
                  <small>
                    {text(row.carrier)} · {text(row.service)}
                  </small>
                </div>
                <Badge value={text(row.status)} />
                <span>{text(row.trackingCode, 'Sem rastreio')}</span>
                <button
                  className="secondary small"
                  onClick={() => setSelectedShipment(row)}
                >
                  Gerenciar
                </button>
              </article>
            ))}
          </div>
        </Panel>
      )}
      {detail && (
        <Drawer
          title={`Pedido #${text(detail.number)}`}
          subtitle="Itens, pagamentos, histórico e entrega"
          close={() => setDetail(null)}
        >
          <div className="order-total">
            <span>Total</span>
            <strong>{money.format(Number(detail.totalCents ?? 0) / 100)}</strong>
            <Badge value={text(detail.status)} />
          </div>
          <Definition
            data={{
              Cliente: text((detail.customer as Row | undefined)?.name),
              Email: text((detail.customer as Row | undefined)?.emailNormalized),
              Frete: money.format(Number(detail.shippingCents ?? 0) / 100),
              Desconto: money.format(Number(detail.discountCents ?? 0) / 100),
              Criado: date(detail.placedAt),
            }}
          />
          <Divider />
          <h3>Itens do pedido</h3>
          <CardList
            rows={asRows(detail.items)}
            title="titleSnapshot"
            meta={(row) =>
              `${text(row.quantity)} × ${money.format(Number(row.unitPriceCents ?? 0) / 100)}`
            }
          />
          <Divider />
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              const status = String(f.get('status'));
              confirmAction(`Alterar o pedido #${text(detail.number)} para ${status}?`, () =>
                void act('Status do pedido atualizado', () =>
                  api(`${base}/operations/orders/${detail.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      status,
                      reason: optional(f.get('reason')),
                    }),
                  }),
                ).then(() => setDetail(null)),
              );
            }}
          >
            <Select
              name="status"
              label="Novo status"
              options={[
                'PAID',
                'FULFILLING',
                'SHIPPED',
                'DELIVERED',
                'CANCELED',
                'PAYMENT_FAILED',
                'REFUND_PENDING',
                'PARTIALLY_REFUNDED',
                'REFUNDED',
              ].map((v) => [v, v])}
            />
            <Field name="reason" label="Motivo" />
            <button className="primary small">Alterar status</button>
          </form>
        </Drawer>
      )}
      {selectedShipment && (
        <Drawer
          title={`Entrega do pedido #${text((selectedShipment.order as Row | undefined)?.number ?? selectedShipment.orderNumber)}`}
          subtitle="Transportadora, rastreio, previsão e status"
          close={() => setSelectedShipment(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              const status = String(f.get('status'));
              confirmAction(`Atualizar esta entrega para ${status}?`, () =>
                void act('Entrega atualizada', () =>
                  api(`${base}/operations/shipments/${selectedShipment.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      carrier: String(f.get('carrier')),
                      service: String(f.get('service')),
                      trackingCode: optional(f.get('trackingCode')) ?? null,
                      trackingUrl: optional(f.get('trackingUrl')) ?? null,
                      estimatedDeliveryAt: optional(f.get('estimatedDeliveryAt')) ?? null,
                      status,
                    }),
                  }),
                ).then(() => setSelectedShipment(null)),
              );
            }}
          >
            <Field
              name="carrier"
              label="Transportadora"
              defaultValue={text(selectedShipment.carrier, '')}
              required
            />
            <Field
              name="service"
              label="Serviço"
              defaultValue={text(selectedShipment.service, '')}
              required
            />
            <Field
              name="trackingCode"
              label="Código de rastreamento"
              defaultValue={text(selectedShipment.trackingCode, '')}
            />
            <Field
              name="trackingUrl"
              label="URL de rastreamento"
              type="url"
              defaultValue={text(selectedShipment.trackingUrl, '')}
            />
            <Field
              name="estimatedDeliveryAt"
              label="Previsão de entrega"
              type="datetime-local"
              defaultValue={
                selectedShipment.estimatedDeliveryAt
                  ? new Date(String(selectedShipment.estimatedDeliveryAt)).toISOString().slice(0, 16)
                  : ''
              }
            />
            <Select
              name="status"
              label="Status"
              defaultValue={text(selectedShipment.status, 'PENDING')}
              options={['PENDING', 'READY', 'SHIPPED', 'DELIVERED', 'CANCELED'].map((value) => [
                value,
                value,
              ])}
            />
            <div className="drawer-actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setSelectedShipment(null)}
              >
                Cancelar
              </button>
              <button className="primary">Salvar entrega</button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

function Customers({ data, api, base, act, search }: ViewProps) {
  const rows = filter(asRows(data.customers), search, ['name', 'email', 'status']);
  const [detail, setDetail] = useState<Row | null>(null);
  async function open(row: Row) {
    await act(
      'Cliente carregado',
      async () => setDetail(await api<Row>(`${base}/operations/customers/${row.id}`)),
      false,
    );
  }
  async function download(format: 'json' | 'markdown', customerId?: string) {
    await act(
      'Exportação preparada',
      async () => {
        const response = await fetch(
          `${API_BASE}${base}/operations/customers/export?format=${format}${customerId ? `&customerId=${customerId}` : ''}`,
          {
            headers: {
              authorization: `Bearer ${(JSON.parse(sessionStorage.getItem('ecommerce-admin-session') ?? '{}') as Session).token}`,
            },
          },
        );
        if (!response.ok) throw new Error(`HTTP_${response.status}`);
        const blob = await response.blob();
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.download = `clientes.${format === 'json' ? 'json' : 'md'}`;
        anchor.click();
        URL.revokeObjectURL(href);
      },
      false,
    );
  }
  return (
    <div className="view">
      <Panel
        title="Clientes"
        eyebrow="Relacionamento"
        action={
          <div className="button-row">
            <button className="secondary small" onClick={() => void download('markdown')}>
              Exportar .MD
            </button>
            <button className="primary small" onClick={() => void download('json')}>
              Exportar JSON
            </button>
          </div>
        }
      >
        <GenericTable
          rows={rows}
          columns={[
            ['name', 'Cliente'],
            ['email', 'E-mail'],
            ['status', 'Status'],
            ['orderCount', 'Pedidos'],
            ['addressCount', 'Endereços'],
            ['createdAt', 'Cadastro'],
          ]}
          actions={(row) => (
            <>
              <button className="link" onClick={() => void open(row)}>
                Abrir
              </button>
              <button className="link" onClick={() => void download('json', row.id)}>
                Exportar
              </button>
            </>
          )}
        />
      </Panel>
      <Info title="Sobre os endereços">
        A exportação individual reúne perfil, endereços, pedidos e consentimentos do cliente sem
        expor esses dados sensíveis na listagem geral.
      </Info>
      {detail && (
        <Drawer
          title={text(detail.name)}
          subtitle="Perfil, endereços, pedidos e consentimentos"
          close={() => setDetail(null)}
        >
          <Definition
            data={{
              Email: text(detail.email),
              Status: text(detail.status),
              Cadastro: date(detail.createdAt),
              Pedidos: text(detail.orderCount, '0'),
              Endereços: text(detail.addressCount, '0'),
              Favoritos: text(detail.favoriteCount, '0'),
            }}
          />
          <Divider />
          <div className="section-title">
            <div>
              <h3>Endereços</h3>
              <p>Dados informados pelo cliente para entrega.</p>
            </div>
          </div>
          <div className="stack">
            {asRows(detail.addresses).map((address) => (
              <article className="compact-card" key={address.id}>
                <div>
                  <strong>
                    {text(address.recipient)} {address.isDefault ? '· principal' : ''}
                  </strong>
                  <small>
                    {text(address.street)}, {text(address.number)}
                    {address.complement ? ` · ${text(address.complement)}` : ''} ·{' '}
                    {text(address.district)} · {text(address.city)}/{text(address.state)} · CEP{' '}
                    {text(address.postalCode)}
                  </small>
                </div>
              </article>
            ))}
            {!asRows(detail.addresses).length && (
              <div className="empty">Nenhum endereço cadastrado.</div>
            )}
          </div>
          <Divider />
          <h3>Pedidos recentes</h3>
          <GenericTable
            rows={asRows(detail.orders)}
            columns={[
              ['number', 'Pedido'],
              ['status', 'Status'],
              ['totalCents', 'Total'],
              ['placedAt', 'Data'],
            ]}
            format={(key, value) =>
              key === 'totalCents' ? money.format(Number(value) / 100) : undefined
            }
          />
          <Divider />
          <h3>Consentimentos</h3>
          <GenericTable
            rows={asRows(detail.consentRecords).map((row) => ({
              ...row,
              decision: row.granted ? 'CONCEDIDO' : 'REVOGADO',
            }))}
            columns={[
              ['purpose', 'Finalidade'],
              ['channel', 'Canal'],
              ['decision', 'Decisão'],
              ['source', 'Origem'],
              ['recordedAt', 'Registro'],
            ]}
          />
        </Drawer>
      )}
    </div>
  );
}

function Content({ data, api, base, act }: ViewProps) {
  const [tab, setTab] = useState('sections');
  const sections = asRows(data.sections);
  const banners = asRows(data.banners);
  const media = asRows(data.media);
  async function move(index: number, direction: number) {
    const ids = sections.map((row) => row.id);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    const current = ids[index];
    const replacement = ids[target];
    if (!current || !replacement) return;
    ids[index] = replacement;
    ids[target] = current;
    await act('Ordem da home atualizada', () =>
      api(`${base}/content/sections/reorder`, { method: 'PUT', body: JSON.stringify({ ids }) }),
    );
  }
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['sections', 'Seções da home'],
          ['banners', 'Banners'],
        ]}
      />
      {tab === 'sections' && (
        <Panel title="Montagem da home" eyebrow="Storefront">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Seção criada', () =>
                api(`${base}/content/sections`, {
                  method: 'POST',
                  body: JSON.stringify({
                    type: String(f.get('type')),
                    title: optional(f.get('title')) ?? null,
                    config: {},
                    position: sections.length,
                    status: String(f.get('status')),
                  }),
                }),
              );
            }}
          >
            <Select
              name="type"
              label="Tipo"
              options={[
                'HERO',
                'FEATURED_PRODUCTS',
                'CATEGORY_GRID',
                'EDITORIAL',
                'NEWSLETTER',
              ].map((v) => [v, v])}
            />
            <Field name="title" label="Título" />
            <Select
              name="status"
              label="Status"
              options={['DRAFT', 'ACTIVE', 'INACTIVE'].map((v) => [v, v])}
            />
            <button className="primary small">Adicionar seção</button>
          </form>
          <div className="builder-list">
            {sections.map((row, index) => (
              <article key={row.id}>
                <span className="drag">⋮⋮</span>
                <div>
                  <strong>{text(row.title, text(row.type))}</strong>
                  <small>
                    {text(row.type)} · posição {index + 1}
                  </small>
                </div>
                <Badge value={text(row.status)} />
                <button className="icon-button" onClick={() => void move(index, -1)}>
                  ↑
                </button>
                <button className="icon-button" onClick={() => void move(index, 1)}>
                  ↓
                </button>
                <button
                  className="danger-link"
                  onClick={() =>
                    confirmAction(`Excluir a seção “${text(row.title, text(row.type))}”?`, () =>
                      void act('Seção removida', () =>
                        api(`${base}/content/sections/${row.id}`, { method: 'DELETE' }),
                      ),
                    )
                  }
                >
                  Excluir
                </button>
              </article>
            ))}
          </div>
        </Panel>
      )}
      {tab === 'banners' && (
        <Panel title="Banners" eyebrow="Campanhas visuais">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Banner criado', () =>
                api(`${base}/content/banners`, {
                  method: 'POST',
                  body: JSON.stringify({
                    placement: String(f.get('placement')),
                    mediaId: optional(f.get('mediaId')) ?? null,
                    title: optional(f.get('title')) ?? null,
                    linkTarget: optional(f.get('linkTarget')) ?? null,
                    position: banners.length,
                    status: 'DRAFT',
                  }),
                }),
              );
            }}
          >
            <Field name="placement" label="Posição" defaultValue="HOME_HERO" required />
            <Field name="title" label="Título" />
            <Select
              name="mediaId"
              label="Imagem"
              options={media.map((row) => [row.id, text(row.originalFilename ?? row.id)])}
            />
            <Field name="linkTarget" label="Link" type="url" />
            <button className="primary small">Criar banner</button>
          </form>
          <CardList
            rows={banners}
            title="title"
            meta={(row) => `${text(row.placement)} · ${text(row.status)}`}
            actions={(row) => (
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Excluir o banner “${text(row.title, row.id)}”?`, () =>
                    void act('Banner removido', () =>
                      api(`${base}/content/banners/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Excluir
              </button>
            )}
          />
        </Panel>
      )}
    </div>
  );
}

function Marketing({ data, api, base, act, search }: ViewProps) {
  const [tab, setTab] = useState('campaigns');
  const campaigns = filter(asRows(data.campaigns), search, ['name', 'status']);
  const templates = filter(asRows(data.templates), search, ['code', 'subject']);
  const consents = filter(asRows(data.consents), search, ['purpose', 'channel']);
  const outbox = asRows(data.outbox);
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['campaigns', 'Campanhas'],
          ['templates', 'Templates'],
          ['consents', 'Consentimentos'],
          ['outbox', 'Eventos e DLQ'],
        ]}
      />
      {tab === 'campaigns' && (
        <Panel title="Campanhas" eyebrow="E-mail">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Campanha criada', () =>
                api(`${base}/communications/campaigns`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    channel: 'EMAIL',
                    subject: String(f.get('subject')),
                    bodyMarkdown: String(f.get('bodyMarkdown')),
                    scheduledAt: optional(f.get('scheduledAt')),
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome interno" required />
            <Field name="subject" label="Assunto" required />
            <Field name="scheduledAt" label="Agendar" type="datetime-local" />
            <Field name="bodyMarkdown" label="Mensagem em Markdown" textarea wide required />
            <button className="primary">Salvar campanha</button>
          </form>
          <CardList
            rows={campaigns}
            title="name"
            meta={(row) => `${text(row.status)} · ${text(row.subject)}`}
            actions={(row) => (
              <button
                className="link"
                onClick={() =>
                  confirmAction(`Colocar a campanha “${text(row.name)}” na fila de envio?`, () =>
                    void act('Campanha colocada na fila', () =>
                      api(`${base}/communications/campaigns/${row.id}/dispatch`, {
                        method: 'POST',
                      }),
                    ),
                  )
                }
              >
                Disparar
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'templates' && (
        <Panel title="Notificações transacionais" eyebrow="Templates">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Template criado', () =>
                api(`${base}/communications/templates`, {
                  method: 'POST',
                  body: JSON.stringify({
                    code: String(f.get('code')),
                    channel: 'EMAIL',
                    subject: String(f.get('subject')),
                    bodyMarkdown: String(f.get('bodyMarkdown')),
                    enabled: true,
                  }),
                }),
              );
            }}
          >
            <Select
              name="code"
              label="Evento"
              options={[
                'customer.welcome',
                'auth.customer.recovery',
                'auth.admin.recovery',
                'order.created',
                'payment.approved',
                'order.shipped',
                'order.canceled',
                'payment.refunded',
              ].map((v) => [v, v])}
            />
            <Field name="subject" label="Assunto" required />
            <Field name="bodyMarkdown" label="Mensagem em Markdown" textarea wide required />
            <button className="primary">Salvar template</button>
          </form>
          <CardList
            rows={templates}
            title="code"
            meta={(row) => text(row.subject)}
            actions={(row) => (
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Excluir o template “${text(row.code)}”?`, () =>
                    void act('Template excluído', () =>
                      api(`${base}/communications/templates/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Excluir
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'consents' && (
        <Panel title="Consentimentos" eyebrow="LGPD">
          <GenericTable
            rows={consents}
            columns={[
              ['recordedAt', 'Data'],
              ['customerId', 'Cliente'],
              ['purpose', 'Finalidade'],
              ['channel', 'Canal'],
              ['granted', 'Aceite'],
              ['version', 'Versão'],
            ]}
          />
        </Panel>
      )}
      {tab === 'outbox' && (
        <Panel title="Eventos e dead-letter" eyebrow="Processamento">
          <GenericTable
            rows={outbox}
            columns={[
              ['createdAt', 'Data'],
              ['eventType', 'Evento'],
              ['status', 'Status'],
              ['attempts', 'Tentativas'],
              ['lastError', 'Último erro'],
            ]}
            actions={(row) =>
              row.status === 'FAILED' ? (
                <button
                  className="link"
                  onClick={() =>
                    void act('Evento reenfileirado', () =>
                      api(`${base}/communications/outbox/${row.id}/retry`, { method: 'POST' }),
                    )
                  }
                >
                  Reprocessar
                </button>
              ) : null
            }
          />
        </Panel>
      )}
    </div>
  );
}

function Access({ data, api, base, act }: ViewProps) {
  const [tab, setTab] = useState('users');
  const [selectedUser, setSelectedUser] = useState<Row | null>(null);
  const [selectedRole, setSelectedRole] = useState<Row | null>(null);
  const users = asRows(data.users);
  const roles = asRows(data.roles);
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['users', 'Usuários'],
          ['roles', 'Funções e permissões'],
        ]}
      />
      {tab === 'users' && (
        <Panel title="Equipe administrativa" eyebrow="Acessos">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Usuário criado', () =>
                api(`${base}/access/users`, {
                  method: 'POST',
                  body: JSON.stringify({
                    email: String(f.get('email')),
                    password: String(f.get('password')),
                    roleId: String(f.get('roleId')),
                    status: 'ACTIVE',
                  }),
                }),
              );
            }}
          >
            <Field name="email" label="E-mail" type="email" required />
            <Field name="password" label="Senha inicial" type="password" required />
            <Select
              name="roleId"
              label="Função"
              options={roles.map((row) => [row.id, text(row.name)])}
            />
            <button className="primary small">Adicionar usuário</button>
          </form>
          <GenericTable
            rows={users.map((row) => ({
              ...row,
              email: (row.adminUser as Row | undefined)?.emailNormalized,
              accountStatus: (row.adminUser as Row | undefined)?.status,
              roleName: (row.role as Row | undefined)?.name,
              mfa: ((row.adminUser as Row | undefined)?.mfaState as Row | undefined)
                ?.totpSecretEncrypted
                ? 'ATIVO'
                : 'PENDENTE',
            }))}
            columns={[
              ['email', 'E-mail'],
              ['roleName', 'Função'],
              ['status', 'Vínculo'],
              ['accountStatus', 'Conta'],
              ['mfa', 'MFA'],
            ]}
            actions={(row) => (
              <button className="link" onClick={() => setSelectedUser(row)}>
                Gerenciar
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'roles' && (
        <Panel title="Funções e permissões" eyebrow="RBAC">
          <form
            className="form-grid compact"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Função criada', () =>
                api(`${base}/access/roles`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    permissions: csv(f.get('permissions')),
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome da função" required />
            <Field
              name="permissions"
              label="Permissões separadas por vírgula"
              defaultValue="catalog:read,orders:read"
              required
              wide
            />
            <button className="primary">Criar função</button>
          </form>
          <CardList
            rows={roles}
            title="name"
            meta={(row) =>
              `${Array.isArray(row.permissions) ? row.permissions.length : 0} permissões · ${text((row._count as Row | undefined)?.memberships, '0')} usuários`
            }
            actions={(row) =>
              row.immutable ? (
                <span className="status">Protegida</span>
              ) : (
                <button className="link" onClick={() => setSelectedRole(row)}>
                  Editar
                </button>
              )
            }
          />
        </Panel>
      )}
      {selectedUser && (
        <Drawer
          title={text(selectedUser.email)}
          subtitle="Função e estado do acesso administrativo"
          close={() => setSelectedUser(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              const membershipStatus = String(f.get('membershipStatus'));
              const accountStatus = String(f.get('accountStatus'));
              confirmAction('Aplicar estas alterações de acesso?', () =>
                void act('Acesso atualizado', () =>
                  api(`${base}/access/users/${selectedUser.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      roleId: String(f.get('roleId')),
                      membershipStatus,
                      accountStatus,
                    }),
                  }),
                ).then(() => setSelectedUser(null)),
              );
            }}
          >
            <Select
              name="roleId"
              label="Função"
              defaultValue={text((selectedUser.role as Row | undefined)?.id, '')}
              options={roles.map((row) => [row.id, text(row.name)])}
              required
            />
            <Select
              name="membershipStatus"
              label="Vínculo com a loja"
              defaultValue={text(selectedUser.status, 'ACTIVE')}
              options={['ACTIVE', 'SUSPENDED', 'REVOKED'].map((value) => [value, value])}
            />
            <Select
              name="accountStatus"
              label="Estado da conta"
              defaultValue={text(selectedUser.accountStatus, 'ACTIVE')}
              options={['INVITED', 'ACTIVE', 'DISABLED'].map((value) => [value, value])}
            />
            <div className="drawer-actions">
              <button type="button" className="secondary" onClick={() => setSelectedUser(null)}>
                Cancelar
              </button>
              <button className="primary">Salvar acesso</button>
            </div>
          </form>
        </Drawer>
      )}
      {selectedRole && (
        <Drawer
          title={text(selectedRole.name)}
          subtitle="Nome e conjunto de permissões"
          close={() => setSelectedRole(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Função atualizada', () =>
                api(`${base}/access/roles/${selectedRole.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    permissions: csv(f.get('permissions')),
                  }),
                }),
              ).then(() => setSelectedRole(null));
            }}
          >
            <Field name="name" label="Nome" defaultValue={text(selectedRole.name, '')} required />
            <Field
              name="permissions"
              label="Permissões separadas por vírgula"
              defaultValue={asRows(selectedRole.permissions)
                .map((permission) => text(permission.permissionCode, ''))
                .filter(Boolean)
                .join(',')}
              textarea
              wide
              required
            />
            <div className="drawer-actions">
              <button type="button" className="secondary" onClick={() => setSelectedRole(null)}>
                Cancelar
              </button>
              <button className="primary">Salvar função</button>
            </div>
          </form>
        </Drawer>
      )}
    </div>
  );
}

function Integrations({ data, api, base, act }: ViewProps) {
  const [tab, setTab] = useState('m2m');
  const clients = asRows(data.clients);
  const webhooks = asRows(data.webhooks);
  const deliveries = asRows(data.deliveries);
  const [secret, setSecret] = useState<Row | null>(null);
  async function reveal(label: string, fn: () => Promise<Row>) {
    await act(
      label,
      async () => {
        setSecret(await fn());
      },
      false,
    );
  }
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['m2m', 'Credenciais M2M'],
          ['webhooks', 'Webhooks'],
          ['deliveries', 'Entregas'],
        ]}
      />
      {secret && <SecretBanner data={secret} close={() => setSecret(null)} />}{' '}
      {tab === 'm2m' && (
        <Panel title="Clientes de integração" eyebrow="Product Collector">
          <form
            className="inline-form"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void reveal('Credencial criada', () =>
                api<Row>(`${base}/integrations/clients`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    scopes: csv(f.get('scopes')),
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome" required />
            <Field
              name="scopes"
              label="Escopos"
              defaultValue="catalog:submit,catalog:read"
              required
              wide
            />
            <button className="primary small">Gerar credencial</button>
          </form>
          <CardList
            rows={clients}
            title="clientId"
            meta={(row) => `${text(row.status)} · ${((row.scopes as string[]) ?? []).join(', ')}`}
            actions={(row) => (
              <button
                className="link"
                onClick={() =>
                  confirmAction('Rotacionar este segredo? O valor anterior deixará de funcionar.', () =>
                    void reveal('Segredo rotacionado', () =>
                      api<Row>(`${base}/integrations/clients/${row.id}/rotate`, { method: 'POST' }),
                    ),
                  )
                }
              >
                Rotacionar segredo
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'webhooks' && (
        <Panel title="Webhooks de saída" eyebrow="Eventos">
          <form
            className="form-grid compact"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void reveal('Webhook criado', () =>
                api<Row>(`${base}/communications/webhooks`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    url: String(f.get('url')),
                    secret: 'generate',
                    eventTypes: csv(f.get('eventTypes')),
                    enabled: true,
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome" required />
            <Field name="url" label="URL HTTPS" type="url" required />
            <Field
              name="eventTypes"
              label="Eventos"
              defaultValue="order.created,payment.captured,order.shipped"
              wide
              required
            />
            <button className="primary">Criar webhook</button>
          </form>
          <CardList
            rows={webhooks}
            title="name"
            meta={(row) => `${text(row.url)} · ${row.enabled ? 'Ativo' : 'Pausado'}`}
            actions={(row) => (
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Excluir o webhook “${text(row.name)}”?`, () =>
                    void act('Webhook removido', () =>
                      api(`${base}/communications/webhooks/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Excluir
              </button>
            )}
          />
        </Panel>
      )}
      {tab === 'deliveries' && (
        <Panel title="Histórico de entregas" eyebrow="Webhooks">
          <GenericTable
            rows={deliveries.map((row) => ({
              ...row,
              endpointName: (row.endpoint as Row | undefined)?.name,
            }))}
            columns={[
              ['createdAt', 'Data'],
              ['endpointName', 'Destino'],
              ['status', 'Status'],
              ['attempts', 'Tentativas'],
              ['responseStatus', 'HTTP'],
              ['lastError', 'Erro'],
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

function Imports({ data, api, base, act, search }: ViewProps) {
  const rows = filter(asRows(data.imports), search, ['externalBatchId', 'status']);
  return (
    <Panel title="Lotes de importação" eyebrow="Product Collector">
      <GenericTable
        rows={rows.map((row) => ({ ...row, sourceName: (row.source as Row | undefined)?.name }))}
        columns={[
          ['submittedAt', 'Recebido'],
          ['externalBatchId', 'Lote'],
          ['sourceName', 'Origem'],
          ['status', 'Status'],
          ['processed', 'Processados'],
          ['failed', 'Falhas'],
        ]}
        actions={(row) =>
          row.status === 'FAILED' ? (
            <button
              className="link"
              onClick={() =>
                void act('Lote reenfileirado', () =>
                  api(`${base}/imports/batches/${row.id}/retry`, { method: 'POST' }),
                )
              }
            >
              Reprocessar
            </button>
          ) : null
        }
      />
    </Panel>
  );
}
function Audit({ data, search }: ViewProps) {
  const rows = filter(asRows(data.audit), search, ['action', 'objectType', 'actorType']);
  return (
    <Panel title="Trilha de auditoria" eyebrow="Imutável">
      <div className="timeline">
        {rows.map((row) => (
          <article key={row.id}>
            <span className="timeline-dot" />
            <div>
              <strong>{text(row.action)}</strong>
              <p>
                {text(row.actorType)} em {text(row.objectType)} · {text(row.objectId)}
              </p>
            </div>
            <time>{date(row.createdAt)}</time>
          </article>
        ))}
      </div>
    </Panel>
  );
}

function Settings({ data, api, base, act }: ViewProps) {
  const [tab, setTab] = useState('store');
  const store = (data.store ?? {}) as Row;
  const settings = (store.settings ?? {}) as Record<string, unknown>;
  const profile = (settings.profile ?? {}) as Row;
  const branding = (settings.branding ?? {}) as Row;
  const seo = (settings.seo ?? {}) as Row;
  const address = (profile.address ?? {}) as Row;
  const social = (settings.social ?? {}) as Row;
  const policies = (settings.policies ?? {}) as Row;
  const shipping = asRows(data.shipping);
  return (
    <div className="view">
      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          ['store', 'Dados da loja'],
          ['shipping', 'Frete e regiões'],
        ]}
      />
      {tab === 'store' && (
        <Panel title="Empresa e identidade" eyebrow="Configuração">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              const postalCode = String(f.get('postalCode') ?? '').replace(/\D/gu, '');
              const socialLinks = Object.fromEntries(
                ['instagram', 'facebook', 'youtube', 'tiktok', 'linkedin']
                  .map((key) => [key, optional(f.get(key))] as const)
                  .filter((entry): entry is [string, string] => Boolean(entry[1])),
              );
              void act('Dados da loja atualizados', () =>
                api(`${base}/content/store`, {
                  method: 'PATCH',
                  body: JSON.stringify({
                    displayName: String(f.get('displayName')),
                    profile: {
                      legalName: optional(f.get('legalName')) ?? null,
                      document: optional(f.get('document')) ?? null,
                      stateRegistration: optional(f.get('stateRegistration')) ?? null,
                      supportEmail: optional(f.get('supportEmail')) ?? null,
                      phone: optional(f.get('phone')) ?? null,
                      whatsapp: optional(f.get('whatsapp')) ?? null,
                      address: postalCode
                        ? {
                            postalCode,
                            street: String(f.get('street') ?? '').trim(),
                            number: String(f.get('number') ?? '').trim(),
                            complement: optional(f.get('complement')) ?? null,
                            district: String(f.get('district') ?? '').trim(),
                            city: String(f.get('city') ?? '').trim(),
                            state: String(f.get('state') ?? '')
                              .trim()
                              .toUpperCase(),
                            country: 'BR',
                          }
                        : null,
                    },
                    branding: { primaryColor: optional(f.get('primaryColor')) ?? null },
                    social: socialLinks,
                    policies: {
                      privacy: optional(f.get('privacy')) ?? null,
                      terms: optional(f.get('terms')) ?? null,
                      exchanges: optional(f.get('exchanges')) ?? null,
                    },
                    seo: {
                      title: optional(f.get('seoTitle')) ?? null,
                      description: optional(f.get('seoDescription')) ?? null,
                    },
                  }),
                }),
              );
            }}
          >
            <Field
              name="displayName"
              label="Nome público"
              defaultValue={text(store.displayName, '')}
              required
            />
            <Field
              name="legalName"
              label="Razão social"
              defaultValue={text(profile.legalName, '')}
            />
            <Field name="document" label="CNPJ/CPF" defaultValue={text(profile.document, '')} />
            <Field
              name="stateRegistration"
              label="Inscrição estadual"
              defaultValue={text(profile.stateRegistration, '')}
            />
            <Field
              name="supportEmail"
              label="E-mail de suporte"
              type="email"
              defaultValue={text(profile.supportEmail, '')}
            />
            <Field name="phone" label="Telefone" defaultValue={text(profile.phone, '')} />
            <Field name="whatsapp" label="WhatsApp" defaultValue={text(profile.whatsapp, '')} />
            <div className="field cep-field">
              <span>CEP</span>
              <div className="input-action">
                <input
                  name="postalCode"
                  aria-label="CEP"
                  inputMode="numeric"
                  defaultValue={text(address.postalCode, '')}
                  placeholder="00000000"
                />
                <button
                  type="button"
                  className="secondary small"
                  onClick={(event) => {
                    const form = event.currentTarget.form;
                    if (!form) return;
                    const postal = String(
                      (form.elements.namedItem('postalCode') as HTMLInputElement | null)?.value ??
                        '',
                    ).replace(/\D/gu, '');
                    void act(
                      'CEP consultado',
                      async () => {
                        const found = await api<Row>(`/v1/public/address/postal-codes/${postal}`);
                        for (const [name, value] of Object.entries({
                          postalCode: found.postalCode,
                          street: found.street,
                          complement: found.complement,
                          district: found.district,
                          city: found.city,
                          state: found.state,
                        })) {
                          const input = form.elements.namedItem(name) as HTMLInputElement | null;
                          if (input) input.value = text(value, '');
                        }
                      },
                      false,
                    );
                  }}
                >
                  Buscar
                </button>
              </div>
            </div>
            <Field name="street" label="Logradouro" defaultValue={text(address.street, '')} />
            <Field name="number" label="Número" defaultValue={text(address.number, '')} />
            <Field
              name="complement"
              label="Complemento"
              defaultValue={text(address.complement, '')}
            />
            <Field name="district" label="Bairro" defaultValue={text(address.district, '')} />
            <Field name="city" label="Cidade" defaultValue={text(address.city, '')} />
            <Field name="state" label="UF" defaultValue={text(address.state, '')} />
            <Field
              name="primaryColor"
              label="Cor principal"
              type="color"
              defaultValue={text(branding.primaryColor, '#2867f0')}
            />
            <Field name="seoTitle" label="Título SEO" defaultValue={text(seo.title, '')} />
            <Field
              name="seoDescription"
              label="Descrição SEO"
              defaultValue={text(seo.description, '')}
              wide
            />
            <Field
              name="instagram"
              label="Instagram"
              type="url"
              defaultValue={text(social.instagram, '')}
            />
            <Field
              name="facebook"
              label="Facebook"
              type="url"
              defaultValue={text(social.facebook, '')}
            />
            <Field
              name="youtube"
              label="YouTube"
              type="url"
              defaultValue={text(social.youtube, '')}
            />
            <Field name="tiktok" label="TikTok" type="url" defaultValue={text(social.tiktok, '')} />
            <Field
              name="linkedin"
              label="LinkedIn"
              type="url"
              defaultValue={text(social.linkedin, '')}
            />
            <Field
              name="privacy"
              label="Política de privacidade"
              defaultValue={text(policies.privacy, '')}
              textarea
              wide
            />
            <Field
              name="terms"
              label="Termos de uso"
              defaultValue={text(policies.terms, '')}
              textarea
              wide
            />
            <Field
              name="exchanges"
              label="Trocas e devoluções"
              defaultValue={text(policies.exchanges, '')}
              textarea
              wide
            />
            <button className="primary">Salvar configurações</button>
          </form>
        </Panel>
      )}
      {tab === 'shipping' && (
        <Panel title="Regras de frete" eyebrow="CEP e região">
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const f = new FormData(event.currentTarget);
              void act('Regra de frete criada', () =>
                api(`${base}/content/shipping-rules`, {
                  method: 'POST',
                  body: JSON.stringify({
                    name: String(f.get('name')),
                    code: String(f.get('code')).toUpperCase(),
                    enabled: true,
                    priority: integer(f.get('priority')),
                    type: String(f.get('type')),
                    carrier: String(f.get('carrier')),
                    service: String(f.get('service')),
                    amountCents: cents(f.get('amount')),
                    freeAboveCents: cents(f.get('freeAbove')) || null,
                    minSubtotalCents: null,
                    maxSubtotalCents: null,
                    postalCodePrefixes: csv(f.get('prefixes')).map((v) => v.replace(/\D/gu, '')),
                    estimatedDaysMin: integer(f.get('daysMin')),
                    estimatedDaysMax: integer(f.get('daysMax')),
                    handlingDays: integer(f.get('handling')),
                  }),
                }),
              );
            }}
          >
            <Field name="name" label="Nome" required />
            <Field name="code" label="Código" required />
            <Select
              name="type"
              label="Tipo"
              options={[
                ['FLAT', 'Valor fixo'],
                ['FREE', 'Grátis'],
                ['PICKUP', 'Retirada'],
              ]}
            />
            <Field name="carrier" label="Transportadora" defaultValue="Loja" required />
            <Field name="service" label="Serviço" defaultValue="Padrão" required />
            <Field name="amount" label="Valor (R$)" type="number" />
            <Field name="freeAbove" label="Grátis acima de (R$)" type="number" />
            <Field name="prefixes" label="Prefixos de CEP" placeholder="01, 02, 130" />
            <Field name="daysMin" label="Prazo mínimo" type="number" defaultValue="2" required />
            <Field name="daysMax" label="Prazo máximo" type="number" defaultValue="7" required />
            <Field name="handling" label="Dias de separação" type="number" defaultValue="1" />
            <Field name="priority" label="Prioridade" type="number" defaultValue="0" />
            <button className="primary">Criar regra</button>
          </form>
          <CardList
            rows={shipping}
            title="name"
            meta={(row) =>
              `${text(row.carrier)} · ${money.format(Number(row.amountCents ?? 0) / 100)} · ${text(row.estimatedDaysMin)}–${text(row.estimatedDaysMax)} dias`
            }
            actions={(row) => (
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Excluir a regra de frete “${text(row.name)}”?`, () =>
                    void act('Regra excluída', () =>
                      api(`${base}/content/shipping-rules/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Excluir
              </button>
            )}
          />
        </Panel>
      )}
    </div>
  );
}

function Security({ api, act, onMfaVerified, data }: ViewProps) {
  const [enrollment, setEnrollment] = useState<Row | null>(null);
  const sessions = asRows(data.sessions);
  return (
    <div className="view">
      <Panel title="Sessão atual" eyebrow="Segurança">
        <Info title="Proteção obrigatória">
          Os módulos operacionais são liberados depois que o MFA é configurado e verificado nesta
          conta.
        </Info>
        <Definition
          data={{
            Armazenamento: 'Somente nesta aba',
            Transporte: 'Bearer token',
            Expiração: 'Controlada pela API',
            MFA: 'Disponível para esta conta',
          }}
        />
        <Info title="Boas práticas">
          Use uma senha exclusiva, ative MFA e encerre a sessão em computadores compartilhados.
        </Info>
      </Panel>
      <Panel title="Alterar senha" eyebrow="Credenciais">
        <form
          className="form-grid"
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget;
            const fields = new FormData(form);
            const newPassword = String(fields.get('newPassword') ?? '');
            const confirmation = String(fields.get('confirmation') ?? '');
            if (newPassword !== confirmation) {
              void act('As senhas não coincidem', () => Promise.reject(new Error('PASSWORD_CONFIRMATION_MISMATCH')), false);
              return;
            }
            void act('Senha alterada', async () => {
              await api('/v1/admin/auth/password', {
                method: 'PATCH',
                body: JSON.stringify({ currentPassword: fields.get('currentPassword'), newPassword }),
              });
              form.reset();
            });
          }}
        >
          <Field name="currentPassword" label="Senha atual" type="password" required />
          <Field name="newPassword" label="Nova senha (mínimo 12 caracteres)" type="password" minLength={12} required />
          <Field name="confirmation" label="Confirmar nova senha" type="password" minLength={12} required />
          <div className="drawer-actions">
            <button className="primary small">Atualizar senha</button>
          </div>
        </form>
        <p className="muted">Após a alteração, todas as outras sessões administrativas serão encerradas.</p>
      </Panel>
      <Panel title="Sessões ativas" eyebrow="Acessos">
        <GenericTable
          rows={sessions}
          columns={[
            ['createdAt', 'Iniciada'],
            ['expiresAt', 'Expira'],
            ['mfaVerified', 'MFA'],
            ['current', 'Sessão'],
          ]}
          format={(key, value) =>
            key === 'mfaVerified'
              ? value
                ? 'Verificado'
                : 'Pendente'
              : key === 'current'
                ? value
                  ? 'Atual'
                  : 'Outro acesso'
                : undefined
          }
          actions={(row) =>
            row.current ? (
              <span className="status success">Esta sessão</span>
            ) : (
              <button
                className="danger small"
                onClick={() =>
                  confirmAction('Encerrar esta sessão administrativa?', () =>
                    void act('Sessão encerrada', () =>
                      api(`/v1/admin/auth/sessions/${row.id}`, { method: 'DELETE' }),
                    ),
                  )
                }
              >
                Encerrar
              </button>
            )
          }
        />
      </Panel>
      <Panel
        title="Autenticação em dois fatores"
        eyebrow="MFA"
        action={
          <button
            className="primary small"
            onClick={() =>
              void act(
                'MFA preparado',
                async () =>
                  setEnrollment(await api<Row>('/v1/admin/auth/mfa/enroll', { method: 'POST' })),
                false,
              )
            }
          >
            Configurar MFA
          </button>
        }
      >
        {enrollment ? (
          <div className="mfa-box">
            <div className="mfa-heading">
              <div>
                <strong>Cadastre esta chave no seu autenticador</strong>
                <span>Google Authenticator, Microsoft Authenticator ou Authy</span>
              </div>
              <span className="mfa-status">Aguardando confirmação</span>
            </div>
            <ol className="mfa-steps">
              <li>Escolha “Inserir chave de configuração”.</li>
              <li>Use o nome <strong>{text(enrollment.accountName ?? 'Ecommerce Engine')}</strong>.</li>
              <li>Selecione o tipo <strong>Baseada em horário</strong>.</li>
              <li>Cole a chave abaixo e informe o código atual de seis dígitos.</li>
            </ol>
            <div className="mfa-secret">
              <span>Chave manual · Base32</span>
              <code>{text(enrollment.secret)}</code>
              <button
                type="button"
                className="secondary small"
                onClick={() =>
                  void act(
                    'Chave copiada',
                    () => navigator.clipboard.writeText(text(enrollment.secret)),
                    false,
                  )
                }
              >
                Copiar chave
              </button>
            </div>
            {Boolean(enrollment.otpauthUrl) && (
              <a className="mfa-app-link" href={text(enrollment.otpauthUrl)}>
                Abrir diretamente no aplicativo autenticador
              </a>
            )}
            <Info title="Não gere outra chave antes de confirmar">
              Clicar novamente em “Configurar MFA” substitui esta chave. Se isso acontecer, remova a
              entrada anterior do aplicativo e cadastre a nova chave exibida.
            </Info>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                const f = new FormData(event.currentTarget);
                void act(
                  'MFA ativado',
                  async () => {
                    await api('/v1/admin/auth/mfa/verify', {
                      method: 'POST',
                      body: JSON.stringify({ code: String(f.get('code')) }),
                    });
                    onMfaVerified?.();
                  },
                  false,
                );
              }}
            >
              <Field name="code" label="Código atual de 6 dígitos" placeholder="000000" required />
              <button className="primary small">Verificar e ativar</button>
            </form>
          </div>
        ) : (
          <p className="muted">Adicione uma segunda camada de proteção à conta administrativa.</p>
        )}
      </Panel>
    </div>
  );
}

function SimpleManager({
  title,
  rows,
  fields,
  create,
  archive,
  update,
  act,
}: {
  title: string;
  rows: Row[];
  fields: Array<[string, string]>;
  create: (value: Record<string, string>) => Promise<unknown>;
  archive: (id: string) => Promise<unknown>;
  update?: (id: string, value: Record<string, string>) => Promise<unknown>;
  act: ViewProps['act'];
}) {
  const [selected, setSelected] = useState<Row | null>(null);
  return (
    <>
      <Panel title={title} eyebrow="Organização">
        <form
          className="inline-form"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const values = Object.fromEntries(
              fields.map(([name]) => [name, String(form.get(name) ?? '')]),
            );
            void act(`${title.slice(0, -1)} criada`, () => create(values));
          }}
        >
          {fields.map(([name, label]) => (
            <Field key={name} name={name} label={label} required={name === 'name'} />
          ))}
          <button className="primary small">Adicionar</button>
        </form>
        <CardList
          rows={rows}
          title="name"
          meta={(row) => `${text(row.slug)} · ${text(row.status, 'ACTIVE')}`}
          actions={(row) => (
            <>
              {update && (
                <button className="link" onClick={() => setSelected(row)}>
                  Editar
                </button>
              )}
              <button
                className="danger-link"
                onClick={() =>
                  confirmAction(`Arquivar “${text(row.name)}”?`, () =>
                    void act('Item arquivado', () => archive(row.id)),
                  )
                }
              >
                Arquivar
              </button>
            </>
          )}
        />
      </Panel>
      {selected && update && (
        <Drawer
          title={`Editar ${title.slice(0, -1).toLowerCase()}`}
          subtitle="Atualize os dados de organização do catálogo"
          close={() => setSelected(null)}
        >
          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              const values = Object.fromEntries(
                fields.map(([name]) => [name, String(form.get(name) ?? '')]),
              );
              void act('Item atualizado', () => update(selected.id, values)).then(() =>
                setSelected(null),
              );
            }}
          >
            {fields.map(([name, label]) => (
              <Field
                key={name}
                name={name}
                label={label}
                defaultValue={text(selected[name], '')}
                required={name === 'name'}
              />
            ))}
            <div className="drawer-actions">
              <button type="button" className="secondary" onClick={() => setSelected(null)}>
                Cancelar
              </button>
              <button className="primary">Salvar</button>
            </div>
          </form>
        </Drawer>
      )}
    </>
  );
}
function ProductTable({ rows, onSelect }: { rows: Row[]; onSelect?: (row: Row) => void }) {
  const actions = onSelect
    ? (row: Row) => (
        <button className="link" onClick={() => onSelect(row)}>
          Editar
        </button>
      )
    : undefined;
  return (
    <GenericTable
      rows={rows.map((row) => ({
        ...row,
        variantsCount: asRows(row.variants).length,
        stock: asRows(row.variants)
          .flatMap((v) => asRows(v.inventory))
          .reduce((sum, item) => sum + Number(item.onHand ?? 0) - Number(item.reserved ?? 0), 0),
      }))}
      columns={[
        ['title', 'Produto'],
        ['publicationStatus', 'Status'],
        ['variantsCount', 'Variantes'],
        ['stock', 'Disponível'],
        ['updatedAt', 'Atualizado'],
      ]}
      {...(actions ? { actions } : {})}
    />
  );
}
function OrderTable({ rows, onSelect }: { rows: Row[]; onSelect?: (row: Row) => void }) {
  const actions = onSelect
    ? (row: Row) => (
        <button className="link" onClick={() => onSelect(row)}>
          Abrir
        </button>
      )
    : undefined;
  return (
    <GenericTable
      rows={rows.map((row) => ({
        ...row,
        customerName: (row.customer as Row | undefined)?.name,
        total: Number(row.totalCents ?? 0),
      }))}
      columns={[
        ['number', 'Pedido'],
        ['customerName', 'Cliente'],
        ['itemCount', 'Itens'],
        ['status', 'Status'],
        ['total', 'Total'],
        ['placedAt', 'Data'],
      ]}
      format={(key, value) => (key === 'total' ? money.format(Number(value) / 100) : undefined)}
      {...(actions ? { actions } : {})}
    />
  );
}
function GenericTable({
  rows,
  columns,
  actions,
  format,
}: {
  rows: Row[];
  columns: Array<[string, string]>;
  actions?: (row: Row) => ReactNode;
  format?: (key: string, value: unknown, row: Row) => string | undefined;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map(([, label]) => (
              <th key={label}>{label}</th>
            ))}
            {actions && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              {columns.map(([key]) => (
                <td key={key}>
                  {key.toLowerCase().includes('status') ? (
                    <Badge value={text(row[key])} />
                  ) : key.toLowerCase().includes('at') || key === 'createdAt' ? (
                    date(row[key])
                  ) : (
                    (format?.(key, row[key], row) ?? text(row[key]))
                  )}
                </td>
              ))}
              {actions && <td className="row-actions">{actions(row)}</td>}
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={columns.length + (actions ? 1 : 0)} className="empty">
                Nenhum registro encontrado.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
function CardList({
  rows,
  title,
  meta,
  actions,
}: {
  rows: Row[];
  title: string;
  meta: (row: Row) => string;
  actions?: (row: Row) => ReactNode;
}) {
  return (
    <div className="card-list">
      {rows.map((row) => (
        <article className="list-card" key={row.id}>
          <div>
            <strong>{text(row[title])}</strong>
            <small>{meta(row)}</small>
          </div>
          {Boolean(row.status) && <Badge value={text(row.status)} />}
          <div className="row-actions">{actions?.(row)}</div>
        </article>
      ))}
      {!rows.length && <div className="empty">Nenhum registro encontrado.</div>}
    </div>
  );
}
function Panel({
  title,
  eyebrow,
  action,
  children,
}: {
  title: string;
  eyebrow: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="panel">
      <div className="panel-head">
        <div>
          <p className="overline">{eyebrow}</p>
          <h2>{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
function Tabs({
  value,
  onChange,
  items,
}: {
  value: string;
  onChange: (value: string) => void;
  items: Array<[string, string]>;
}) {
  return (
    <div className="tabs">
      {items.map(([key, label]) => (
        <button key={key} className={value === key ? 'active' : ''} onClick={() => onChange(key)}>
          {label}
        </button>
      ))}
    </div>
  );
}
function Field({
  name,
  label,
  type = 'text',
  defaultValue,
  placeholder,
  required,
  minLength,
  textarea,
  wide,
}: {
  name: string;
  label: string;
  type?: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  textarea?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
        />
      ) : (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          step={type === 'number' ? 'any' : undefined}
        />
      )}
    </label>
  );
}
function Select({
  name,
  label,
  options,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  options: Array<[string, string]>;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select name={name} defaultValue={defaultValue} required={required}>
        <option value="">Selecione</option>
        {options.map(([value, label]) => (
          <option value={value} key={value}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Drawer({
  title,
  subtitle,
  close,
  children,
}: {
  title: string;
  subtitle: string;
  close: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <aside className="drawer" role="dialog" aria-modal="true">
        <header>
          <div>
            <p className="overline">Editor</p>
            <h2>{title}</h2>
            <span>{subtitle}</span>
          </div>
          <button className="icon-button" onClick={close}>
            ×
          </button>
        </header>
        <div className="drawer-body">{children}</div>
      </aside>
    </div>
  );
}
function Badge({ value }: { value: string }) {
  return (
    <span className={`badge badge-${value.toLowerCase().replaceAll('_', '-')}`}>
      {value.replaceAll('_', ' ')}
    </span>
  );
}
function Divider() {
  return <hr className="divider" />;
}
function Definition({ data }: { data: Record<string, string> }) {
  return (
    <dl className="definition">
      {Object.entries(data).map(([key, value]) => (
        <div key={key}>
          <dt>{key}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
function Info({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="info">
      <span>i</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
function Checklist({ items }: { items: Array<[string, boolean]> }) {
  return (
    <div className="checklist">
      {items.map(([label, done]) => (
        <div key={label}>
          <span className={done ? 'done' : ''}>{done ? '✓' : '·'}</span>
          <p>{label}</p>
          <strong>{done ? 'Pronto' : 'Atenção'}</strong>
        </div>
      ))}
    </div>
  );
}
function SecretBanner({ data, close }: { data: Row; close: () => void }) {
  return (
    <div className="secret-banner">
      <div>
        <strong>Guarde esta credencial agora</strong>
        <p>Ela não será exibida novamente.</p>
      </div>
      <code>
        {text(data.clientId)}
        {Boolean(data.clientSecret) && ` : ${text(data.clientSecret)}`}
        {Boolean(data.secret) && text(data.secret)}
      </code>
      <button
        onClick={() => void navigator.clipboard.writeText(text(data.clientSecret ?? data.secret))}
      >
        Copiar segredo
      </button>
      <button onClick={close}>×</button>
    </div>
  );
}
function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <div className={`wordmark${light ? ' light' : ''}`}>
      <span>E</span>
      <strong>Engine</strong>
      <small>ADMIN</small>
    </div>
  );
}
function LoginScreen({
  onLogin,
  loading,
  toast,
}: {
  onLogin: (input: {
    storeSlug: string;
    email: string;
    password: string;
    totp?: string;
  }) => Promise<void>;
  loading: boolean;
  toast: Toast;
}) {
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const totp = optional(data.get('totp'));
    await onLogin({
      storeSlug: String(data.get('storeSlug')),
      email: String(data.get('email')),
      password: String(data.get('password')),
      ...(totp ? { totp } : {}),
    });
  }
  return (
    <main className="login-page">
      <section className="login-story">
        <Wordmark light />
        <div>
          <p className="overline">Commerce operations</p>
          <h1>
            Uma operação.
            <br />
            Todos os detalhes.
          </h1>
          <p className="story-copy">
            Catálogo, pedidos, conteúdo, marketing e segurança em uma central preparada para o dia a
            dia da loja.
          </p>
        </div>
        <p className="story-foot">Ambiente administrativo · sessão protegida</p>
      </section>
      <section className="login-panel">
        <div className="login-card">
          <p className="overline blue">Acesso administrativo</p>
          <h2>Bem-vindo de volta.</h2>
          <p className="muted">Entre com as credenciais da loja e informe o MFA quando exigido.</p>
          {toast && <div className="toast error">! {toast.text}</div>}
          <form onSubmit={submit}>
            <Field name="storeSlug" label="Loja" placeholder="minha-loja" required />
            <Field
              name="email"
              label="E-mail"
              type="email"
              placeholder="voce@empresa.com"
              required
            />
            <Field name="password" label="Senha" type="password" required />
            <Field name="totp" label="Código MFA (se ativo)" placeholder="000000" />
            <button className="primary" disabled={loading}>
              {loading ? 'Autenticando…' : 'Entrar no painel'}
              <span>→</span>
            </button>
          </form>
          <p className="security-note">✓ O token fica somente nesta aba e é removido ao sair.</p>
        </div>
      </section>
    </main>
  );
}
function filter(rows: Row[], query: string, keys: string[]) {
  if (!query.trim()) return rows;
  const needle = query.toLowerCase();
  return rows.filter((row) =>
    keys.some((key) => text(row[key], '').toLowerCase().includes(needle)),
  );
}
