# CONTRATOS REST V1 — Catálogo, administração e comércio

**Estado:** design contratual de Etapa 0. Schemas executáveis Zod, Swagger/OpenAPI e testes de contrato serão implementados nas etapas próprias; a documentação não representa endpoints disponíveis agora.

## Convenções

- Prefixo: `/v1`; HTTPS em ambientes remotos, HTTP localhost permitido apenas em desenvolvimento.
- Request/response JSON `application/json`; arquivos por fluxos específicos autorizados.
- UUID para identificadores internos, slug para acesso público; timestamp em ISO-8601 UTC; moeda ISO 4217 (inicial BRL).
- `amountCents`/`priceCents`: inteiros JSON, não floats, limitados por schema. `percentage`: string decimal (`"12.5000"`) no contrato para não perder precisão; cálculo `Decimal` no servidor.
- `Idempotency-Key` em chamadas que criam pedidos, pagamentos, lotes etc.; `X-Request-Id` como rastreio opcional; API produz um ID quando ausente.
- Listagem usa cursor (`?limit=20&cursor=...`) com `limit` máximo definido por endpoint; ordenar deterministicamente.
- Erro usa `application/problem+json` em estilo RFC 9457, com `type`, `title`, `status`, `detail`, `instance`, `code`, `requestId`, `errors?` (campos/códigos). Não devolver stack trace ou dados sensíveis.
- Em sucesso simples: `{ "data": { ... }, "meta": { "requestId": "..." } }`; para paginação `meta.nextCursor` e `meta.hasMore`.
- `401` não autenticado, `403` sem escopo/role, `404` não visível na loja, `409` conflito/concor­rência/idempotência divergente, `422` regra de negócio, `429` rate limit, `202` aceito para fila.
- Cada mutação relevante gera `AuditLog` e/ou evento Outbox conforme política do módulo.

## A. Endpoints públicos (sem login)

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/v1/public/stores/:storeSlug` | branding/configuração publicável |
| GET | `/v1/public/stores/:storeSlug/home` | banners, seções e destaques |
| GET | `/v1/public/stores/:storeSlug/categories` | árvore e contagens autorizadas |
| GET | `/v1/public/stores/:storeSlug/brands` | listagem de marcas |
| GET | `/v1/public/stores/:storeSlug/products` | catálogo paginado e filtros |
| GET | `/v1/public/stores/:storeSlug/products/:productSlug` | PDP, variantes, mídia e preço atual |
| GET | `/v1/public/stores/:storeSlug/search` | busca por query e facetas |
| POST | `/v1/public/stores/:storeSlug/shipping/quotes` | estimativa de frete sem confiar no cliente |

Todos exigem resolução consistente de `storeId`, só expõem dados `PUBLISHED` e não retornam campos administrativos.

## B. Clientes, carrinho e checkout

| Método | Rota | Requer |
|---|---|---|
| POST | `/v1/customer/auth/register` | loja, controles antiabuso |
| POST | `/v1/customer/auth/login` | loja + credenciais |
| POST | `/v1/customer/auth/logout` | sessão/cookie |
| GET | `/v1/customer/me` | autenticação |
| GET/POST | `/v1/customer/addresses` | autenticação |
| PATCH/DELETE | `/v1/customer/addresses/:addressId` | dono + tenant |
| GET | `/v1/customer/cart` | sessão anônima/cliente |
| POST | `/v1/customer/cart/items` | variante e quantidade |
| PATCH/DELETE | `/v1/customer/cart/items/:itemId` | dono do carrinho |
| POST | `/v1/customer/checkout/preview` | reprecificação no servidor |
| POST | `/v1/customer/checkout/submit` | Idempotency-Key obrigatória |
| GET | `/v1/customer/orders` | cliente e loja |
| GET | `/v1/customer/orders/:orderId` | cliente e loja |
| POST | `/v1/customer/orders/:orderId/cancel-request` | transição permitida |
| PUT | `/v1/customer/me/consents` | consentimentos versionados |

A API deve estabelecer a loja via contexto confiável (domínio + BFF/configuração), nunca só pelo `storeId` enviado pelo browser. Durante desenvolvimento, cabeçalho interno pode existir sob controle estrito, sem ser um bypass em produção.

## C. Administração (sessão com MFA, role e store scope)

Prefixo `/v1/admin/stores/:storeId`. Login próprio em `/v1/admin/auth/*`. A autorização sempre confere membership e permissão na loja solicitada.

| Método | Rota após prefixo admin store | Domínio |
|---|---|---|
| GET | `/dashboard/summary` | KPIs administrativos |
| GET/POST | `/products` | catálogo |
| GET/PATCH/DELETE | `/products/:productId` | catálogo, soft delete conforme política |
| POST/PATCH | `/products/:productId/variants` | variantes |
| GET/POST/PATCH | `/categories` | hierarquia (PATCH em `/:categoryId`) |
| GET/POST/PATCH | `/brands` | marcas |
| GET/POST/PATCH | `/attributes` | definição e regras |
| GET/POST/PATCH | `/media` | mídias e metadados; upload presigned por subrota |
| GET/POST | `/inventory/adjustments` | saldos e razão de movimentos |
| GET/POST/PATCH | `/prices` | precificação e histórico |
| GET/POST/PATCH | `/promotions` | campanhas |
| GET/POST/PATCH | `/coupons` | cupons |
| GET/POST/PATCH | `/home/sections` | vitrine dinâmica |
| GET/POST/PATCH | `/home/banners` | banners |
| GET | `/customers` | clientes, acesso restrito/PII |
| GET/PATCH | `/orders` | pedidos e transições autorizadas |
| POST | `/orders/:orderId/refund-requests` | estorno via fluxo de gateway |
| GET/POST/PATCH | `/gateways` | seleção/configuração de provedores instalados |
| GET | `/imports/batches` | histórico de importações |
| GET/POST | `/imports/batches/:batchId/retry` | reprocessamento controlado |
| GET/POST/PATCH | `/users` | operadores e memberships |
| GET/POST/PATCH | `/roles` | RBAC |
| GET | `/audit` | auditoria |
| GET/POST/PATCH | `/marketing/consents` | observação/gestão adequada |

**Nota:** a tabela é um **mapa de recursos**, não assinatura OpenAPI final: `PATCH/DELETE` incidem em itens com ID. Operações destrutivas devem obedecer política por estado e role.

## D. Integrações e pagamentos

| Método | Rota | Proteção |
|---|---|---|
| POST | `/v1/integrations/catalog/batches` | credencial M2M por loja; idempotência |
| GET | `/v1/integrations/catalog/batches/:batchId` | M2M e autorização por loja |
| GET | `/v1/integrations/catalog/batches/:batchId/items` | M2M e paginação |
| POST | `/v1/integrations/catalog/batches/:batchId/retry` | M2M com scope específico |
| POST | `/v1/webhooks/payments/:providerCode` | assinatura comprovada do gateway, replay guard |
| GET | `/health/live` | disponibilidade sem dados internos |
| GET | `/health/ready` | readiness com exposição controlada |

O payload de importação e estados estão em `INTEGRACAO_PRODUCT_COLLECTOR_V1.md`.

## E. Estados de domínio

- Product: `DRAFT -> REVIEW -> PUBLISHED -> ARCHIVED` (transições auditáveis; produto não vende sem variante/estoque/preço válidos).
- ImportBatch: `RECEIVED -> QUEUED -> PROCESSING -> COMPLETED | PARTIALLY_COMPLETED | FAILED`; `RETRYING` em reprocessamento.
- Order: `PENDING_PAYMENT -> PAID -> FULFILLING -> SHIPPED -> DELIVERED`, alternativas `CANCELED`, `PAYMENT_FAILED`, `REFUND_PENDING`, `PARTIALLY_REFUNDED`, `REFUNDED` sob guarda de transições.
- Payment: `PENDING -> AUTHORIZED -> CAPTURED`, alternativas `FAILED`, `CANCELED`, `PARTIALLY_REFUNDED`, `REFUNDED`; reconciliação lida com eventos fora de ordem.

Estados acima são uma proposta inicial sujeita a refinamento por contratos de gateway, preservando máquina de estados estrita e testes.

## F. Segurança e compatibilidade

- Só adicionar campos opcionais dentro de `v1` sem quebrar clientes. Mudanças incompatíveis exigem `/v2` ou esquema de compatibilidade.
- Validar em fronteiras com Zod. Contratos publicados por `packages/contracts` e documentação OpenAPI gerada/testada.
- Webhook request body precisa estar disponível bruto antes de parsing para conferir assinatura; processar evento verificado com dedupe.
- Limites e rate limits por identidade, loja, IP e endpoint; `Retry-After` quando aplicável.
- Implementar testes negativos `storeA` não acessa `storeB`, inclusive endpoints de lote, mídia e pedidos.
