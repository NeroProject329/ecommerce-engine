# ETAPA 12 — Storefront

## 1. Estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 2. Implementado

- Vitrine responsiva com catálogo real, busca e filtro por categoria.
- Estados de carregamento, coleção vazia e indisponibilidade da API.
- Sacola persistida por token opaco na sessão do navegador.
- Cotação, endereço, checkout idempotente e confirmação do pedido.
- Captura pelo gateway sandbox sem coleta de dados de cartão.
- Interface de confirmação e limpeza segura do carrinho convertido.

## 3. Evidência

- Typecheck, lint e build Next.js aprovados.
- Preview local HTTP 200 e inspeção visual responsiva no navegador concluídos.
- O fluxo comercial usa somente endpoints reais; `NEXT_PUBLIC_STORE_SLUG` seleciona a loja publicada.

## 4. Próxima tarefa

Implementar clientes de integração e marketing da Etapa 13.
