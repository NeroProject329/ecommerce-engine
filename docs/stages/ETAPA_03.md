# ETAPA 03 — Banco de dados e multi-loja

## 1. Objetivo

Implementar o modelo relacional V1 com isolamento por `storeId`, constraints no PostgreSQL e migrations incrementais auditáveis.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado

- Segunda migration: `20261012133000_catalog_core`.
- Entidades: `Brand`, `Category`, `Product`, `ProductCategory`, `ProductVariant`, `InventoryLocation`, `Inventory`, `Price` e `OutboxEvent`.
- Enums de catálogo, publicação, origem, variante e outbox.
- Unicidades por loja para slugs, SKU, localização e saldo de variante/localização.
- FKs compostas com `storeId` para bloquear relações entre tenants diferentes.
- Constraints SQL para dimensões físicas, publicação, saldo/reserva, preços, janelas de vigência e contadores de outbox.
- Script transacional reutilizável `db:validate:stage3`, sempre encerrado com rollback.
- Identidade administrativa, RBAC, sessões, clientes, credenciais e endereços.
- Atributos, mídias, reservas, preços, promoções e cupons.
- Carrinho, frete, checkout, pedidos, pagamentos, webhooks e estornos.
- Integrações, importações, idempotência, auditoria, consentimentos e vitrine dinâmica.
- Sete migrations incrementais aplicadas no Railway Dev.

## 4. Validações

- Prisma schema válido e client gerado.
- Sete migrations sincronizadas no PostgreSQL Railway Dev.
- API confirmou readiness HTTP 200 com o banco real marcado como `up`.
- Vínculo de produto com categoria de outra loja foi rejeitado pelo banco.
- Estoque com `reserved > onHand` foi rejeitado.
- Preço negativo foi rejeitado.
- Lint, typecheck, 13 testes automatizados e build dos 15 workspaces aprovados após execução sequencial.

## 5. Critérios encerrados

- Schema Prisma integral da V1, relações e índices multi-loja aplicados.
- Constraints críticas exercitadas no PostgreSQL real com rollback.
- Lint, typecheck, testes e build completos aprovados.
- Testes de volume e concorrência permanecem alocados na Etapa 14.

## 6. Próxima tarefa exata

Implementar a Etapa 4 — autenticação e permissões.
