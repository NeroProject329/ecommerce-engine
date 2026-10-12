# ETAPA 1 — PLANO DE EXECUÇÃO E CRITÉRIOS DE ACEITE

## Pré-requisitos e objetivo

Entrada: planejamento de Etapa 0 documentado e Contexto Mestre V1 referenciado.  
Meta: monorepo executável, quatro apps, pacotes base, configuração compartilhada e verificações independentes, **sem depender de Railway/Contabo/R2 real**. Banco/Redis operacionais ficam para a Etapa 2.

Diretório oficial: `C:\Users\mathe\Downloads\ecommerce-engine`.

## Método de entrega obrigatório

1. **Scripts PowerShell** somente para criar diretórios, inspecionar requisitos, executar validações e atividades operacionais. Não usar script grande que escreva o código de dezenas de arquivos.
2. **Códigos completos entregues como arquivos unitários**, com caminho Windows explícito, conteúdo integral e indicação de como salvar no VS Code.
3. Um arquivo por vez, sem sobreescrever customizações antigas sem comparação prévia.
4. Rodar gate de lint/typecheck/test/build de acordo com o estado do projeto. Se falhar, corrigir antes de avançar.
5. Registrar cada sessão no `docs/STATUS_PROJETO.md` e, se necessário, um `docs/stages/ETAPA_1.md` com progresso por arquivo e logs.

## Sequência incremental

| Bloco | Entregável | Gate para avançar |
|---|---|---|
| 1A | `scripts/CRIAR_PASTAS_ETAPA_1.ps1` (criar estrutura de diretórios apenas) | pastas existem, nenhuma preexistente foi perdida |
| 1B | `package.json`, `pnpm-workspace.yaml`, `.gitignore`, `.editorconfig`, `tsconfig.base.json`, `turbo.json`, `prettier` e `eslint` | JSON/YAML parseável, nenhum segredo, configuração consistente |
| 1C | pacotes `config`, `contracts`, `validation`, `observability`, `ui` mínimos e seus `package.json` | lint/typecheck/test/build dos pacotes |
| 1D | pacotes restantes com contratos e scaffolds mínimos: database, auth, catalog, commerce, payments, media | dependências unidirecionais, sem Prisma de produção prematuro |
| 1E | API NestJS `/health/live` com testes | HTTP local, erros previsíveis, lint/typecheck/test/build |
| 1F | worker independente com log start/stop e teste de inicialização | build/test sem requerer Redis antes da Etapa 2 |
| 1G | storefront Next.js com home placeholder e admin com página de login placeholder | porta 3000/3001, rota `/`, CSS responsivo básico, build independente |
| 1H | `scripts/TESTAR_ETAPA_1.ps1`, scripts de execução, teste de smoke, docs e lockfile | gate final completo e evidenciado no Windows |

**Não marcar concluída** a Etapa 1 até 1H e evidências reais de execução.

## Matriz de versões (planejamento)

- **Node.js 24 LTS** durante a fundação; verificar `node --version` no Windows antes de instalar dependências.
- **pnpm 11** com patch exato registrado em `packageManager` e lockfile ao criar `package.json` (referência candidata verificada: 11.18.0); `pnpm --version` precisa ser compatível.
- TypeScript 5.9, Next.js 16, React 19, NestJS 11, Prisma ORM 7, Turborepo 2, Zod 4 e Playwright/Vitest em versões compatíveis **são famílias planejadas**, não instalação concluída. Registrar patches exatos após checagem no ambiente e resolver compatibilidade antes de escrever scaffolds. Se optar por versões principais mais novas (ex. Nest 12 ou Prisma 8), criar ADR e testar antes.
- `prisma7.config.ts` ou `prisma.config.ts` conforme patch e documentação da versão instalada; Prisma terá configuração própria em `packages/database`, nunca supor que `DATABASE_URL` está disponível para um script de format.
- `pnpm 11`: configuração de workspace em `pnpm-workspace.yaml`, não usar campo legado de configuração pnpm no `package.json`.

## Critérios verificáveis de aceite

1. [ ] Diretórios corretos em `C:\Users\mathe\Downloads\ecommerce-engine`, sem dano a arquivos existentes.
2. [ ] `pnpm install --frozen-lockfile` funciona após o primeiro lockfile estar gerado e versionado.
3. [ ] `pnpm lint` passa em todos os apps/pacotes de Etapa 1.
4. [ ] `pnpm typecheck` passa em todos os apps/pacotes de Etapa 1.
5. [ ] `pnpm test` passa com testes reais de health/config/worker/contratos aplicáveis (não `echo ok`).
6. [ ] `pnpm build` passa com quatro apps independentes e pacotes.
7. [ ] `pnpm --filter storefront dev` abre loja na 3000; `admin` na 3001; `api` na 4000; `worker` inicia e encerra sem erros.
8. [ ] `GET http://localhost:4000/health/live` retorna 200 com JSON tipado.
9. [ ] Sem dependências circulares, sem import de backend no bundle browser, sem `node_modules`/segredos commitados.
10. [ ] `docs/STATUS_PROJETO.md` e `docs/stages/ETAPA_1.md` contêm executado/pendente, versões e evidências de comandos.
11. [ ] Commit local da fundação com mensagem clara; push GitHub apenas com autorização/acesso resolvido, sem segredos.
12. [ ] Etapa 2 não começou: nenhuma instalação definitiva em VPS, nem promessa de integração de banco ainda não construída.

## Testes e validação

- Em arquivos iniciais não executáveis: validação estrutural, JSON parsing e checks de sintaxe; **não afirmar** lint/build do monorepo se apps e dependências não existem.
- Após apps reais: scripts `.ps1` chamam `pnpm`, capturam `$LASTEXITCODE` imediatamente, abortam no primeiro comando com falha e fazem relatório. Nunca ocultar erros com `|| true`, `exit 0` automático ou `-ErrorAction SilentlyContinue`.
- Em CI futuro: instalação congelada, lint, typecheck, unit, build e smoke; testes E2E completos ficam nas fases posteriores.

## Formato de commit sugerido

- `docs(ecommerce): consolida planejamento tecnico da etapa 0`
- `chore(ecommerce): cria estrutura de diretorios da etapa 1`
- `chore(ecommerce): adiciona configuracao do monorepo`
- `feat(ecommerce): inicia apps e packages da fundacao`

## Próximo arquivo após pasta

`package.json` da raiz será enviado completo, depois `pnpm-workspace.yaml`, depois demais arquivos unitários. Só seguir ao receber resultado do script de pastas ou um erro a tratar; não presumir que o usuário o executou.
