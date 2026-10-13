# CONTINUAR DESENVOLVIMENTO

**Atualizado em:** 2026-10-13

## Estado de retomada

- Última etapa integralmente validada: **Etapa 14**.
- Etapas 15 e 16: implementação concluída, com gates externos documentados.
- Etapa 17: backend homologado no escopo combinado, sem autorização de publicação.
- Última atividade concluída: reconstrução do storefront desktop pela referência Casas Bahia, com 22 rotas, fluxo completo de catálogo/conta/carrinho/checkout, 47 assets fornecidos, busca pública paginada, SEO e estados de carregamento/erro/vazio.

## Bloqueios reais

- Docker não está instalado ou não está disponível no `PATH`; isso limita apenas a alternativa local via Compose, não o ambiente Railway Dev já validado.
- Qualquer credencial compartilhada fora do `.env` ignorado deve ser rotacionada antes da produção.

## Testes executados

- Instalação congelada, lint, typecheck, testes e build completos aprovados.
- HTTP 200 confirmado nas portas 3000, 3001 e 4000.
- Worker iniciou e permaneceu ativo.
- PostgreSQL e Redis Railway aceitaram conexão real.
- API respondeu HTTP 200 em `/health/ready` com banco `up`.
- Onze migrations foram aplicadas; `prisma migrate deploy` confirmou schema atualizado.
- Teste transacional confirmou isolamento e constraints de todos os blocos principais, com rollback completo.
- Smoke da Etapa 4 confirmou autenticação, recuperação, MFA, RBAC e isolamento entre lojas.
- Smoke da Etapa 5 confirmou catálogo, publicação vendável, vitrine pública e isolamento entre lojas.
- Smoke da Etapa 6 confirmou mídia original/otimizada, deduplicação e entrega pública.
- Smoke da Etapa 7 confirmou importação assíncrona, idempotência e override manual.
- Smoke da Etapa 8 confirmou promoções, cupom com teto e histórico de preço.
- Smoke da Etapa 9 confirmou carrinho, frete, checkout, reserva e pedido.
- Smoke da Etapa 10 confirmou pagamento idempotente, captura, baixa de estoque, estorno e webhook deduplicado.
- Smoke da Etapa 13 confirmou clientes M2M, escopos, rotação, consentimentos e outbox.
- Redis Railway respondeu `PING=PONG`, informou versão 8.2.10 e passou no teste de compatibilidade BullMQ.
- Cloudflare R2 passou em escrita, leitura e exclusão de objeto temporário.
- Consumidor da outbox passou em prova real no Railway, incluindo publicação e limpeza do evento temporário.
- ViaCEP e fallback BrasilAPI foram testados; o smoke HTTP mais recente confirmou 125 caminhos no OpenAPI.
- O conjunto final de gates passou: lint 15/15, typecheck 25/25, testes 25/25 tarefas (74 testes) e build 15/15.
- Os artefatos compilados também passaram em smoke de processo: API (liveness, readiness e OpenAPI), admin standalone e storefront standalone, incluindo CSS, responderam HTTP 200.
- O smoke de carga local da API compilada executou 100 requisições com concorrência 10, zero falhas e p95 de 216,9 ms; é uma verificação curta, não um benchmark de produção.
- Após o fechamento ampliado do admin em 13/10/2026, os gates integrais passaram novamente: lint 15/15, typecheck 25/25, testes 25/25 tarefas; após o teste adicional de autoproteção administrativa, a API fechou com 48 testes e o monorepo com 79; build 15/15.
- O painel foi percorrido com sessão real e MFA verificado; os 14 módulos carregaram sem alerta de permissão e o console permaneceu sem erros.
- A regressão final percorreu pedidos, clientes, estoque, catálogo, equipe e segurança; os novos controles foram renderizados sem erro de console. A API permaneceu `ready` e o build Next.js 16.4.0 passou.
- A consulta administrativa do CEP `01001000` retornou e preencheu Praça da Sé, São Paulo/SP.
- A loja pública foi homologada no navegador com dados temporários reais: três produtos, favorito, cadastro/login, frete, checkout, pagamento `PAID` e pedido associado ao cliente.
- Os dados temporários da homologação da loja foram removidos; a contagem residual da loja de teste retornou zero.
- A nova interface desktop percorreu 14 rotas representativas no navegador sem erros de console. O build do storefront gerou 22 rotas de aplicação, além de `robots.txt` e `sitemap.xml`.
- A busca pública ganhou filtros e paginação consistentes; a API passou a 18 arquivos e 51 testes após a cobertura dedicada desse contrato.
- Os gates integrais posteriores ao storefront passaram novamente: lint 15/15, typecheck 25/25, testes 25/25 tarefas com 82 testes e build 15/15. Busca pública, `sitemap.xml` e `robots.txt` responderam HTTP 200 no smoke final.
- O template compartilhado de categoria foi implementado em `/categoria/[slug]`; `Telefones e Celulares` recebeu os assets e conteúdos da referência, filtros funcionais, carrossel, vitrines, FAQ e ofertas relâmpago. A validação visual confirmou 19 cards, filtro Samsung 19 → 3 → 19, footer expansível e console limpo.
- Após essa entrega, os gates integrais passaram novamente: lint 15/15, typecheck 25/25, testes 25/25 tarefas e build 15/15.

## Testes pendentes

- Subida opcional do Compose quando Docker estiver disponível.
- Build das quatro imagens quando Docker estiver disponível.
- Drill de restauração em banco temporário isolado. No Windows atual não há `pg_dump`, `pg_restore` ou Docker; além disso, o endpoint PostgreSQL configurado não foi localizado entre os serviços visíveis na conta Railway autenticada. Não restaurar sobre o banco de desenvolvimento ativo. Para concluir o drill, disponibilizar as ferramentas PostgreSQL e uma URL `RESTORE_DATABASE_URL` exclusiva de um banco vazio e descartável.
- Homologação HTTPS após definição de domínios/TLS.
- Gateway real, integrações com transportadoras e dados finais da loja, deliberadamente adiados pelo proprietário. Regras de frete, gestão de entregas e configuração estruturada já estão prontas na API.

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

Com a home e o template-base de categoria concluídos, a próxima ação visual é configurar as demais categorias reaproveitando `CategoryTemplatePage` e trocando somente título, breadcrumb, banner, filtros e produtos. Em paralelo, o conteúdo definitivo da `loja-2` deve ser publicado pelo painel para substituir os fallbacks locais. Depois vêm E2E automatizado, carga de catálogo/checkout, drill de restauração e imagens Docker.

## Decisões imutáveis sem ADR

- Monólito modular NestJS; worker independente; multi-loja por `storeId`.
- PostgreSQL é a fonte autoritativa; Redis é transitório.
- Dinheiro em centavos; nenhum segredo no repositório.
- Product Collector permanece fora deste monorepo.

## Dependências externas pendentes

- Docker Desktop ou Docker Engine local permanece opcional para validar o caminho Compose.
- Cloudflare R2 está conectado e validado para escrita, leitura e exclusão; falta apenas definir a URL pública definitiva/domínio de mídia para produção.
- Gateways externos de pagamento foram deliberadamente adiados; o contrato agnóstico e o sandbox estão prontos.
- Integrações comerciais com transportadoras e os dados finais da loja foram deliberadamente adiados; a base de CEP, regras de frete e entregas está implementada.
