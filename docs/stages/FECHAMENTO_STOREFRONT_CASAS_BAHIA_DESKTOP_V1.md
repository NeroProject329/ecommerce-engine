# FECHAMENTO DO STOREFRONT DESKTOP — REFERÊNCIA CASAS BAHIA

**Data:** 13/10/2026  
**Estado:** **IMPLEMENTADO E VALIDADO LOCALMENTE**

## Objetivo

Reestruturar a loja pública desktop seguindo os fluxos, a hierarquia visual e as proporções das referências fornecidas, sem fixar produtos ou conteúdo comercial no código. Produtos, variantes, preços, estoque, banners, seções, dados institucionais e regras de frete continuam vindo da API e do painel administrativo.

## Entrega

- cabeçalho, busca, navegação, departamentos e rodapé no padrão visual de referência;
- home dinâmica com banners, campanhas, departamentos e prateleiras administráveis;
- busca no servidor com filtros, ordenação e paginação;
- listagem por categoria/departamento;
- detalhe de produto com galeria, variantes, atributos, preço, estoque, favorito e cálculo de frete;
- etapa opcional de proteção antes do carrinho;
- carrinho com quantidade, remoção, cupom, frete e resumo;
- checkout com endereço salvo ou novo, ViaCEP/BrasilAPI, escolha do frete e pagamento sandbox;
- login, cadastro, recuperação de senha, favoritos e área do cliente;
- perfil, endereços, pedidos, detalhes, rastreamento e cancelamento elegível;
- páginas institucionais abastecidas pelo painel;
- metadata dinâmica, canonical, JSON-LD de produto, `sitemap.xml` e `robots.txt`;
- estados completos de carregamento, vazio, erro e página não encontrada;
- 47 recursos visuais fornecidos incorporados em `public/brand-assets`.
- template reutilizável de categoria em `/categoria/[slug]`, com breadcrumb, banner 1240×315, filtros, produtos patrocinados, grade recomendada, descrição, FAQ e ofertas relâmpago;
- configuração visual inicial de `Telefones e Celulares` com assets locais fornecidos, 4 produtos patrocinados, 19 recomendados e 3 ofertas relâmpago como fallback enquanto a API da loja está vazia.

## Rotas principais

- `/`, `/busca`, `/categoria/[slug]`, `/departamentos`;
- `/produto/[slug]`, `/protecao`, `/carrinho`;
- `/checkout/endereco`, `/checkout/pagamento`, `/checkout/sucesso`;
- `/entrar`, `/cadastro`, `/recuperar-senha`, `/favoritos`;
- `/minha-conta`, `/minha-conta/perfil`, `/minha-conta/enderecos`, `/minha-conta/pedidos`, `/minha-conta/pedidos/[id]`;
- `/institucional/[slug]`, `/robots.txt`, `/sitemap.xml`.

## Contrato dinâmico

A loja usa `NEXT_PUBLIC_STORE_SLUG=loja-2` e consulta exclusivamente a API pública. A busca passou a aceitar `q`, categoria, marca, preço mínimo/máximo, ordenação, página e limite, retornando um envelope paginado estável.

No estado atual do Railway, `loja-2` existe, mas não possui produtos publicados. Por isso, a validação visual atual mostra corretamente slots e estados vazios; o conteúdo real aparecerá quando for cadastrado e publicado pelo painel.

## Validação

- 14 rotas representativas percorridas no navegador sem erro de console;
- storefront: lint, typecheck e build aprovados;
- build Next.js gerou 22 rotas de aplicação, além de `robots.txt` e `sitemap.xml`;
- API: 18 arquivos de teste e 51 testes aprovados, incluindo cobertura da busca paginada;
- API e storefront responderam localmente durante a homologação visual.
- em 13/10/2026, o template de categoria passou novamente por `pnpm lint` (15/15), `pnpm typecheck` (25/25), `pnpm test` (25/25 tarefas) e `pnpm build` (15/15);
- validação no navegador confirmou banner, 19 cards, filtro de marca (19 → 3 → 19), FAQ, rodapé expansível e console sem erros.

## Limites deliberados

- gateway real continua adiado pelo proprietário; pagamento sandbox permanece funcional;
- versão desktop é a referência aprovada nesta entrega; refinamento responsivo específico será uma etapa posterior;
- domínio público de mídia, DNS, TLS e publicação ficam para produção;
- conteúdo definitivo da loja deve ser administrado pelo painel, sem dados comerciais codificados na interface.

