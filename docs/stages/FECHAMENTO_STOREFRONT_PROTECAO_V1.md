# FECHAMENTO — STOREFRONT PROTEÇÃO E SEGUROS V1

**Data:** 2026-10-14  
**Estado:** CONCLUÍDA E VALIDADA

## Escopo entregue

- Template reutilizável em `/protecao?produto=[slug]`, acionado pelo botão `Comprar` da tela individual.
- Resolução do produto pela API pública com fallback demonstrativo, preservando nome, imagem e preço do item selecionado.
- Cabeçalho simplificado de checkout, conteúdo central nas proporções da gravação, rodapé legal e resumo de compra fixo.
- Cartões de Garantia Estendida, Fique Seguro e serviço especializado, com oferta adaptada aos nichos tecnologia, eletrodomésticos, móveis e geral.
- Garantia com opções sem cobertura, 12, 24 e 36 meses; promoção de 36 meses pelo preço de 24 meses.
- Seguro com abas Completa, Roubo e Quebra, planos de 12 e 24 meses e benefícios próprios de cada cobertura.
- Serviço de suporte com nome, texto e opção ajustados ao nicho do produto.
- Expansões e recolhimentos animados, feedback de seleção, suporte a `prefers-reduced-motion` e hover restrito a dispositivos com ponteiro preciso.
- Resumo que lista os serviços escolhidos e recalcula o subtotal em centavos; seleção persistida em `sessionStorage` antes da continuidade para o carrinho.
- Oito assets do pacote fornecido incorporados em `public/insurance-assets`.

## Evidência funcional e visual

- O arquivo MP4 reenviado foi validado em 1920 × 1080, 60 fps e 30,5 s. Amostras em 0 s, 6 s, 16 s e 30 s diferiram menos de 0,55 nível médio de pixel dos quadros já extraídos do MKV, confirmando que ambos registram a mesma referência visual.
- Largura útil de aproximadamente 1080 px, cartões em três colunas e resumo fixo comparados com a gravação original.
- Expansão da garantia, troca para 12 meses e atualização do resumo testadas.
- Expansão do seguro, abas Completa/Roubo/Quebra e seleção do plano de 24 meses testadas.
- Expansão e seleção do suporte remoto testadas.
- Bloco de informações importantes alternou entre os estados compacto e completo.
- Revisão React confirmou estado derivado durante o render, atualizações funcionais de estado, componentes auxiliares fora do componente principal e remount por `product.id` ao trocar de produto.
- A página recarregou e permaneceu funcional depois dos testes de interação, sem falha atual de runtime.
- A regressão do vídeo de 15:51 corrigiu o conflito entre o radio do resumo recolhido e o radio da área animada oculta: o plano padrão agora mostra imediatamente a bolinha verde. Cartões expandidos passaram a preservar 24 px antes do bloco de informações no desktop e 32 px no layout estreito.

## Gates executados

- `pnpm lint`: 15/15 tarefas aprovadas.
- `pnpm typecheck`: 25/25 tarefas aprovadas.
- `pnpm test`: 25/25 tarefas aprovadas; storefront com 10 testes, incluindo 3 da proteção.
- `pnpm build`: 15/15 tarefas aprovadas; rota dinâmica `/protecao` gerada.

## Arquivos principais

- `apps/storefront/src/app/protecao/page.tsx`
- `apps/storefront/src/components/protection-page.tsx`
- `apps/storefront/src/lib/protection-template-data.ts`
- `apps/storefront/src/lib/protection-template-data.test.ts`
- `apps/storefront/src/components/product-detail.tsx`
- `apps/storefront/src/components/chrome.tsx`
- `apps/storefront/src/app/globals.css`
- `apps/storefront/public/insurance-assets/*`
