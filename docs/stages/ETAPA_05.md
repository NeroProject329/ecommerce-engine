# ETAPA 05 — Catálogo

## 1. Objetivo

Entregar o catálogo multi-loja completo, com categorias hierárquicas, marcas, produtos, variantes, preços, estoque e publicação segura para a vitrine.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Escopo de implementação

- Normalização de slugs, SKU e EAN.
- CRUD administrativo protegido por RBAC e MFA.
- Leitura pública somente de conteúdo ativo e publicado da loja solicitada.
- Categorias hierárquicas sem ciclos.
- Variantes com dimensões e atributos.
- Preços vigentes por moeda e estoque por localização.
- Publicação somente quando existir ao menos uma variante ativa, com preço vigente e saldo disponível.
- Eventos outbox para mutações relevantes.

## 4. Implementado

- Normalização e validação de slug, SKU e EAN/GTIN.
- Categorias hierárquicas, marcas, produtos e variantes multi-loja.
- Atributos tipados e configuráveis por categoria, produto e variante.
- Preços vigentes por moeda, localizações e saldos de estoque versionados.
- Publicação bloqueada sem variante ativa, preço vigente e saldo disponível.
- Catálogo público filtrando somente itens publicados e vendáveis.
- Endpoints administrativos protegidos por RBAC, MFA e isolamento de tenant.
- Eventos outbox para criação e publicação de produto.

## 5. Validações

- 4 testes unitários do domínio de catálogo aprovados.
- 4 testes HTTP adicionais; suíte da API com 12 testes aprovados.
- Typecheck, lint e build da API aprovados.
- Smoke real Railway `STAGE5_CATALOG_FLOW_OK` aprovado, com dados sintéticos removidos ao final.
- O smoke confirmou bloqueio de publicação prematura, atributos, preço, estoque, publicação, vitrine e negação cross-tenant.

## 6. Próxima tarefa exata

Implementar armazenamento, upload, importação por URL, deduplicação e otimização de mídia.
