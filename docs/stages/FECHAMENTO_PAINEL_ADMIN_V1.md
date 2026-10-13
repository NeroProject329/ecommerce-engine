# FECHAMENTO DO PAINEL ADMINISTRATIVO V1

**Data:** 13/10/2026  
**Estado:** **CONCLUÍDO E VALIDADO**

## Escopo entregue

O painel em `apps/admin` deixou de ser uma página parcial de consulta e passou a cobrir a operação administrativa da loja por meio da API, sem acesso direto ao PostgreSQL.

- visão geral com indicadores, pedidos e catálogo recente;
- produtos, variantes, atributos, categorias e marcas com criação e edição, além da associação de mídias;
- upload de arquivos e importação de mídia por URL HTTPS;
- estoque, locais, ajustes e histórico de movimentações;
- preços de variantes, histórico, promoções e cupons;
- clientes com visão administrativa detalhada de endereços, pedidos, favoritos e consentimentos, além de exportação individual ou em lote em JSON/Markdown;
- pedidos, itens, pagamento e gestão estruturada de entrega, transportadora, serviço, rastreio, prazo e status;
- banners, seções da home, ordenação e publicação;
- campanhas, consentimentos, templates transacionais e reprocessamento da outbox;
- credenciais M2M, rotação de segredo, webhooks e entregas de webhook;
- importações e reprocessamento de lotes com falha;
- usuários administrativos, funções e permissões, incluindo edição de função, vínculo e estado da conta;
- trilha de auditoria;
- dados da empresa, endereço, identidade, SEO, redes sociais e políticas;
- consulta de CEP pela API interna, que usa ViaCEP e BrasilAPI como fallback;
- regras de frete por CEP/região;
- sessão administrativa, alteração de senha, gestão de sessões ativas e configuração obrigatória de MFA.

## Segurança e comportamento

- O token administrativo permanece em `sessionStorage` e é removido ao sair.
- Contas ainda sem MFA são enviadas diretamente para “Minha segurança”.
- Os módulos operacionais ficam desabilitados até a confirmação do MFA, em alinhamento com a autorização da API.
- A ativação do MFA atualiza a sessão visual imediatamente e libera a navegação.
- O cadastro TOTP informa nome da conta, chave Base32, URI `otpauth://`, algoritmo, período e orienta explicitamente o uso de chave baseada em horário.
- Uma nova tentativa de cadastro TOTP preserva o fator ativo até a confirmação da nova chave.
- A troca de senha exige a senha atual e MFA verificado; as demais sessões são revogadas.
- O administrador não pode encerrar a sessão corrente pela lista nem suspender, revogar ou desativar o próprio acesso.
- Segredos M2M são exibidos apenas na resposta de criação ou rotação.
- Operações destrutivas e alterações críticas exigem confirmação, usam endpoints autenticados e respeitam o isolamento por `storeId`.

## Validação executada

Validação visual e funcional em `http://localhost:3001`, com API em `http://localhost:4000`:

1. login administrativo real;
2. bloqueio correto dos módulos antes do MFA;
3. geração do segredo TOTP, confirmação do código e liberação da sessão;
4. carregamento autenticado das 14 áreas do painel sem alertas de permissão;
5. consulta do CEP `01001000`, retornando Praça da Sé, São Paulo/SP;
6. inspeção visual do formulário completo da loja;
7. console do navegador sem erros;
8. remoção da loja, usuário, função, categoria e produto temporários, com contagem residual zero.
9. regressão visual das áreas de pedidos, clientes, estoque, catálogo, equipe e segurança após o fechamento final, sem erro no console;
10. `GET /health/ready` com estado `ready` e OpenAPI com 125 caminhos, incluindo cliente detalhado e locais de estoque.

## Gates

Executados na raiz oficial do projeto:

- `pnpm lint`: **15/15 tarefas aprovadas**;
- `pnpm typecheck`: **25/25 tarefas aprovadas**;
- `pnpm test`: **25/25 tarefas aprovadas**, **79 testes aprovados** no total; API com **48 testes aprovados**;
- `pnpm build`: **15/15 tarefas aprovadas**; admin e storefront compilados pelo Next.js 16.4.0.

## Limites deliberados

- O gateway de pagamento real permanece adiado por decisão do proprietário; o sandbox e o contrato agnóstico continuam disponíveis.
- Integrações comerciais com transportadoras permanecem futuras; a operação manual de frete, entrega e rastreio está disponível.
- Domínio público de mídia e publicação externa continuam reservados para a etapa de produção.
- Product Collector permanece em monorepo separado.

