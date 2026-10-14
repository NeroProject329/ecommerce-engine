# FECHAMENTO — STOREFRONT PRODUTO INDIVIDUAL V1

**Data:** 2026-10-14  
**Estado:** CONCLUÍDA E VALIDADA

## Escopo entregue

- Template reutilizável de produto individual em `/produto/[slug]`, preservando header e footer compartilhados.
- Produto demonstrativo `Apple iPhone 18 Pro Max 256GB Glacial`, disponível em `/produto/apple-iphone-18-pro-max-256gb-glacial` mesmo quando a API estiver sem catálogo publicado.
- Galeria com quatro imagens fornecidas, miniaturas, favorito, compartilhamento, zoom no desktop e visualização ampliada com navegação e teclado.
- Painel comercial com vendedor, avaliação, preço, parcelamento, compra, crédito pré-aprovado e cálculo de frete.
- Modais de pagamentos, características, especificações técnicas e contato do fabricante.
- Prateleiras de patrocinados, combinações, recomendações e similares com cards navegáveis.
- Conteúdo comercial das quatro prateleiras alinhado aos produtos e imagens exibidos na gravação original, incluindo selo de produto usado e regras promocionais.
- Aviso legal, descrição expansível, avaliação vazia, perguntas e informações importantes.
- Produtos reais continuam carregando preço, mídia, atributos e frete pela API usando o mesmo contrato `Product`.

## Evidência funcional e visual

- Dobra principal conferida em 1920 × 1080 contra o vídeo de referência.
- Galeria, troca de miniaturas, navegação de carrossel, modal de características, abas de especificações, pagamento/Pix e descrição expansível testados no navegador.
- Proporções da galeria, coluna de compra, frete, tabela de características, cards e atalhos de informação ajustadas pelas medidas visíveis na gravação original.
- Ícones de favorito, compartilhamento, vendedor, frete e atalhos substituídos pelos assets fornecidos; breadcrumb final corrigido para `iPhone`.
- CEP `01001-000` atualizou o endereço para Praça da Sé, São Paulo/SP e recalculou o frete demonstrativo.
- Página completa inspecionada no navegador; nenhuma falha de runtime observada.
- Revisão React não encontrou regressões de ciclo de vida, listeners ou composição. O detector Impeccable não apontou erro; os avisos globais de fonte e navegação lateral pertencem à identidade/área de conta já existente, e a animação de `max-height` da descrição foi removida.

## Gates executados

- `pnpm lint`: 15/15 tarefas aprovadas.
- `pnpm typecheck`: 25/25 tarefas aprovadas.
- `pnpm test`: 25/25 tarefas aprovadas; storefront com 7 testes e API com 51 testes.
- `pnpm build`: 15/15 tarefas aprovadas; rota dinâmica `/produto/[slug]` gerada.

## Arquivos principais

- `apps/storefront/src/components/product-detail.tsx`
- `apps/storefront/src/lib/product-detail-template-data.ts`
- `apps/storefront/src/app/produto/[slug]/page.tsx`
- `apps/storefront/src/app/globals.css`
- `apps/storefront/src/components/product-card.tsx`
- `apps/storefront/src/lib/commerce.ts`
- `apps/storefront/public/product-assets/iphone-18-pro-max/*`

