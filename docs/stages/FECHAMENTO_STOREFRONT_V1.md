# FECHAMENTO DA LOJA PÚBLICA V1

**Data:** 12/10/2026  
**Estado:** **CONCLUÍDA E VALIDADA**

## Escopo entregue

- identidade e dados públicos carregados da configuração da loja;
- hero, banners, seções da home e departamentos dinâmicos;
- busca, filtro por categoria e marca e ordenação por preço;
- cards, detalhe de produto, disponibilidade, SKU e seleção de variantes;
- favoritos autenticados;
- sacola persistida por aba, inclusão, remoção e alteração de quantidade;
- cadastro, login, logout e recuperação de acesso do cliente;
- perfil, endereços e histórico de pedidos;
- checkout com endereço salvo ou digitado, ViaCEP/BrasilAPI, cotação de frete e cupom;
- associação do cliente autenticado ao pedido, inclusive quando o carrinho começou anônimo;
- pagamento sandbox, confirmação do pedido e consulta posterior na conta;
- solicitação de cancelamento elegível;
- políticas de privacidade, termos e trocas definidas pelo painel;
- estados de carregamento, vazio e erro, layout responsivo e navegação acessível.

## Correções de integração encontradas na homologação

1. O cadastro retorna o cliente, não uma sessão. A loja agora conclui o cadastro e realiza o login em seguida.
2. O banco exige que o carrinho tenha proprietário anônimo ou cliente, nunca ambos. O carrinho mantém acesso anônimo seguro e o cliente é associado ao pedido no checkout autenticado.
3. `taxCents` ainda era `BigInt` na listagem de pedidos e impedia a resposta JSON; agora é serializado em centavos numéricos.
4. Favoritos retornavam preços e bytes como `BigInt`; a API agora entrega um DTO público serializável.
5. A confirmação visual do pedido não é mais desmontada antes de o cliente reconhecê-la.
6. Uma falha transitória ao atualizar a conta não encerra mais a sessão silenciosamente.

## Validação real

Foi criada uma loja temporária `demo` no PostgreSQL Railway, com três produtos, preços, estoque, seção de home e regra de frete. No navegador em `http://localhost:3000` foram validados:

- carregamento da loja “Casa Aurora” e dos três produtos;
- abertura do detalhe e inclusão de “Manta Brisa” na sacola;
- cálculo de entrega para o CEP `01001000`, com preenchimento de Praça da Sé, São Paulo/SP e frete de R$ 14,90;
- cadastro e login de cliente fictício;
- inclusão em favoritos;
- checkout autenticado completo;
- pagamento sandbox com status `PAID`;
- associação do pedido ao cliente e exibição em “Minha conta > Pedidos”;
- ausência de erros no console durante o percurso principal.

A loja, clientes, sessões, pedido, pagamento e demais registros temporários foram removidos por `storeId`; a verificação final retornou zero lojas residuais.

## Verificações específicas

- `pnpm --filter @ecommerce/storefront typecheck`: aprovado;
- `pnpm --filter @ecommerce/storefront lint`: aprovado;
- `pnpm --filter @ecommerce/storefront build`: aprovado;
- `pnpm --filter @ecommerce/api typecheck`: aprovado;
- testes focados de checkout: **5/5 aprovados**;
- testes focados de clientes: **3/3 aprovados**.

## Gates finais do monorepo

- `pnpm lint`: **15/15 tarefas aprovadas**;
- `pnpm typecheck`: **25/25 tarefas aprovadas**;
- `pnpm test`: **25/25 tarefas aprovadas, 74 testes aprovados**;
- `pnpm build`: **15/15 tarefas aprovadas**.

## Limites deliberados

- pagamento externo real continua adiado pelo proprietário;
- domínio de mídia e publicação externa permanecem para produção;
- conteúdo definitivo, identidade e políticas serão preenchidos pela administração da loja;
- transportadoras comerciais futuras poderão substituir a regra de frete interna sem alterar o checkout.

