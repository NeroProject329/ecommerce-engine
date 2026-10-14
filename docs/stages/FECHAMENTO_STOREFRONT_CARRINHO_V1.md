# FECHAMENTO — STOREFRONT CARRINHO V1

**Data:** 2026-10-14  
**Estado:** CONCLUÍDA E VALIDADA

## Escopo entregue

- Tela reutilizável de carrinho em `/carrinho`, integrada ao fluxo `/produto/[slug]` → `/protecao?produto=[slug]` → `/carrinho`.
- Cabeçalho compacto de checkout, grade desktop em duas colunas, resumo fixo e rodapé legal compartilhado.
- Produto, suporte, Garantia Estendida e Fique Seguro agrupados por vendedor conforme a gravação de referência.
- Valores da demonstração reproduzidos em centavos: produtos `R$ 12.128,90`, seguros/serviços `R$ 6.627,05`, entrega `R$ 33,21` e total `R$ 18.789,16`.
- Seleção individual de itens e serviços, alteração de quantidade, remoção, aviso dispensável de últimas unidades e recálculo imediato de contagens e totais.
- Os seletores de quantidade do produto e do Suporte Super Help agora compartilham o mesmo comportamento funcional e recalculam produtos, serviços e total sem divergência.
- Bloco de frete expansível com máscara de CEP, validação e atualização do valor calculado.
- Edição de Garantia Estendida e Fique Seguro em modais, com troca de plano, expansão de benefícios e persistência da escolha.
- Modais refinados contra a gravação de 16:39: opções compactas no estado inicial, setas com estado visual ascendente/descendente, títulos e descrições dos benefícios e bloco “ver mais/ver menos” funcional.
- Modais independentes para Termos e Condições, carregando integralmente os quatro documentos fornecidos pelo proprietário.
- Prateleira “Indicados com base nas suas visitas” com dez produtos, imagens do pacote enviado e navegação em duas páginas.
- Tratamento de mídia local ampliado para `cart-assets` e `insurance-assets`, evitando redirecionamento incorreto para a API.

## Evidência funcional e visual

- A gravação de referência foi amostrada em 82 quadros, incluindo visão geral, cálculo de frete, edição dos dois seguros, documentos longos e carrossel.
- Validação em 1920 × 1080 confirmou largura útil, proporções dos cartões, hierarquia do resumo e modal centralizado com fundo escurecido.
- A regressão da gravação de 16:39 também confirmou o separador integral do cabeçalho, pin vermelho, checkbox encostado à imagem, alinhamento vertical de excluir/quantidade e resumo sticky durante a área do carrinho.
- Quantidade `01 → 03` atualizou o resumo para 04 produtos, 06 seguros/serviços e total `R$ 56.041,26`; o retorno para 01 restaurou os valores da referência.
- Desmarcar a garantia removeu somente sua quantidade e seu valor; reativação restaurou o total.
- CEP `13308-135` atualizou a entrega para `R$ 41,64`; o CEP original restaurou `R$ 33,21`.
- Troca de plano de garantia, expansão dos benefícios do seguro, fechamento por botão e conteúdo dos quatro documentos foram percorridos no navegador.
- Carrossel avançou e voltou, expondo o controle anterior e alterando o deslocamento da trilha; as dez imagens terminaram apontando para assets locais válidos.
- Uma sessão limpa carregou o carrinho sem avisos ou erros de console.
- Os dois seletores de quantidade, seis expansores do modal Fique Seguro, três expansores da Garantia e o conteúdo adicional de informações importantes foram exercitados diretamente no navegador.
- Revisão React confirmou componentes auxiliares fora do componente principal, cálculos derivados durante o render, atualizações funcionais de estado e atributos acessíveis nos controles.

## Gates executados

- `pnpm lint`: 15/15 tarefas aprovadas.
- `pnpm typecheck`: 25/25 tarefas aprovadas.
- `pnpm test`: 25/25 tarefas aprovadas; 95 testes no total e 13 no storefront, incluindo 3 dedicados ao carrinho.
- `pnpm build`: 15/15 tarefas aprovadas; rota dinâmica `/carrinho` gerada.

## Arquivos principais

- `apps/storefront/src/app/carrinho/page.tsx`
- `apps/storefront/src/components/cart-page.tsx`
- `apps/storefront/src/lib/cart-template-data.ts`
- `apps/storefront/src/lib/cart-template-data.test.ts`
- `apps/storefront/src/components/protection-page.tsx`
- `apps/storefront/src/lib/protection-template-data.ts`
- `apps/storefront/src/lib/commerce.ts`
- `apps/storefront/src/app/globals.css`
- `apps/storefront/public/cart-assets/*`

