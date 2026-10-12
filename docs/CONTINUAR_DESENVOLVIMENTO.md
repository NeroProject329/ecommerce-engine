# CONTINUAR DESENVOLVIMENTO

**Atualizado em:** 2026-10-12

## Estado de retomada

- Última etapa validada: **Etapa 8 — CONCLUÍDA E VALIDADA**.
- Etapa em andamento: **Etapa 9 — carrinho, pedidos e frete**.
- Última atividade concluída: promoções, cupons e histórico de preço validados no Railway.
- Arquivos em alteração: `packages/commerce` e `apps/api/src/checkout`.

## Bloqueios reais

- Docker não está instalado ou não está disponível no `PATH`; isso limita apenas a alternativa local via Compose, não o ambiente Railway Dev já validado.
- As credenciais compartilhadas na conversa devem ser rotacionadas e atualizadas fora do repositório.

## Testes executados

- Instalação congelada, lint, typecheck, testes e build completos aprovados.
- HTTP 200 confirmado nas portas 3000, 3001 e 4000.
- Worker iniciou e permaneceu ativo.
- PostgreSQL e Redis Railway aceitaram conexão real.
- API respondeu HTTP 200 em `/health/ready` com banco `up`.
- Sete migrations foram aplicadas; `prisma migrate status` confirmou schema atualizado.
- Teste transacional confirmou isolamento e constraints de todos os blocos principais, com rollback completo.
- Smoke da Etapa 4 confirmou autenticação, recuperação, MFA, RBAC e isolamento entre lojas.
- Smoke da Etapa 5 confirmou catálogo, publicação vendável, vitrine pública e isolamento entre lojas.
- Smoke da Etapa 6 confirmou mídia original/otimizada, deduplicação e entrega pública.
- Smoke da Etapa 7 confirmou importação assíncrona, idempotência e override manual.
- Smoke da Etapa 8 confirmou promoções, cupom com teto e histórico de preço.

## Testes pendentes

- Subida opcional do Compose quando Docker estiver disponível.
- Fluxo completo de carrinho, reserva, frete, checkout e pedido.

## Comandos para continuar

```powershell
Set-Location 'C:\Users\mathe\Downloads\ecommerce-engine'
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Próxima tarefa exata

Implementar carrinho, reserva de estoque, frete, checkout e pedidos.

## Decisões imutáveis sem ADR

- Monólito modular NestJS; worker independente; multi-loja por `storeId`.
- PostgreSQL é a fonte autoritativa; Redis é transitório.
- Dinheiro em centavos; nenhum segredo no repositório.
- Product Collector permanece fora deste monorepo.

## Dependências externas pendentes

- Docker Desktop ou Docker Engine local permanece opcional para validar o caminho Compose.
- Cloudflare R2 ainda não foi acessado.
