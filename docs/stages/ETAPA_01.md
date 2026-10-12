# ETAPA 01 — Fundação do monorepo

## 1. Objetivo

Entregar um monorepo pnpm/Turborepo executável com quatro aplicações independentes, onze pacotes compartilhados e gates reproduzíveis.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Funcionalidades implementadas

- Workspace pnpm 11 com versões fixas e lockfile.
- Turborepo com tarefas `lint`, `typecheck`, `test`, `build` e `dev`.
- TypeScript 5.9 estrito, ESLint 9 flat config e Prettier.
- Storefront Next.js 16 na porta 3000 e admin independente na porta 3001.
- API NestJS 11/Fastify na porta 4000 com `GET /health/live`.
- Worker Node independente com ciclo de vida start/stop e permanência ativa.
- Pacotes para config, contratos, validação, observabilidade, UI, database, auth, catálogo, commerce, pagamentos e mídia.
- Regras mínimas reais: isolamento tenant, autorização, publicação, centavos/estoque, redaction e validação de mídia.
- Scripts PowerShell para gate completo e smoke test dos quatro processos.

## 4. Arquivos e módulos principais

- Configuração raiz: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `tsconfig.base.json`, `eslint.config.mjs`.
- Apps: `apps/storefront`, `apps/admin`, `apps/api`, `apps/worker`.
- Pacotes: todos os diretórios em `packages/*` agora possuem package, fonte e build próprios.
- Operação: `scripts/TESTAR_ETAPA_1.ps1` e `scripts/SMOKE_ETAPA_1.ps1`.

## 5. Decisões técnicas

- Mantidos os majors aprovados: Next 16, NestJS 11, TypeScript 5.9, Turbo 2 e Zod 4.
- Node 24.18.0 e pnpm 11.18.0 confirmados no host.
- `esbuild` é a única dependência autorizada a executar build script pelo pnpm.
- Next usa saída `standalone`, adequada ao self-hosting futuro.

## 6. Dependências principais

- Next.js 16.4.0, React 19.3.0.
- NestJS 11.2.7, Fastify 5.11.3.
- TypeScript 5.9.3, Turbo 2.11.7, Zod 4.6.6.
- Vitest 4.1.11, ESLint 9.39.5, Prettier 3.9.10.

## 7. Testes executados e resultados

- `pnpm install --frozen-lockfile`: aprovado; lockfile e política de supply chain verificados.
- `pnpm lint`: 15/15 workspaces aprovados.
- `pnpm typecheck`: 15/15 workspaces aprovados.
- `pnpm test`: 19 tarefas aprovadas; 8 arquivos de teste e 10 testes reais aprovados.
- `pnpm build`: 15/15 workspaces aprovados; páginas Next prerenderizadas.
- `scripts/SMOKE_ETAPA_1.ps1`: storefront 3000, admin 3001 e API 4000 retornaram HTTP 200; worker permaneceu ativo.

## 8. Problemas e correções

- O pnpm bloqueou o postinstall do `esbuild`; a autorização foi limitada explicitamente a essa dependência.
- O worker encerrava após iniciar por não possuir handle ativo; foi adicionado heartbeat controlado e cleanup no stop.
- O output de cache de testes do Turbo esperava coverage inexistente; a declaração incorreta foi removida.

## 9. Pendências

- Nenhuma pendência bloqueante da Etapa 1.
- Autenticação, banco, Redis e telas funcionais pertencem às etapas seguintes.

## 10. Critérios de aceite

Todos os critérios técnicos locais da Etapa 1 foram atendidos. Nenhum deploy ou serviço externo foi utilizado.

## 11. Próxima etapa

Etapa 2: infraestrutura local PostgreSQL/Redis, Prisma, health de dependências e estratégia segura de migrations.
