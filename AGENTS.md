# AGENTS.md — Ecommerce Engine

## Fonte de verdade

- Leia `docs/CONTEXTO_MESTRE.md`, `docs/STATUS_PROJETO.md` e `docs/CONTINUAR_DESENVOLVIMENTO.md` antes de alterar o projeto.
- O PDF `docs/references/CONTEXTO_MESTRE_V1.pdf` é a referência normativa. Divergências exigem ADR.
- Avance na ordem das etapas 0–17 e nunca marque uma etapa como concluída sem executar seus gates aplicáveis.

## Regras permanentes

- Projeto local-first. Não publicar, configurar VPS, criar serviços pagos, alterar infraestrutura externa ou usar credenciais de produção sem autorização explícita.
- Não configurar GitHub, origin, push ou releases neste momento.
- Preserve o monólito modular NestJS, o worker independente e o isolamento multi-loja por `storeId`.
- Storefront e admin consomem a API; nunca acessam PostgreSQL diretamente.
- Valores monetários são inteiros em centavos. Não use ponto flutuante para regras financeiras.
- Segredos ficam fora do repositório. Nunca registre tokens, senhas, CPF ou payloads sensíveis em logs.
- Product Collector pertence a outro monorepo. Aqui existem apenas contratos, API receptora e processamento.
- Use `apply_patch` para alterações manuais. Não gere o código-fonte inteiro por script PowerShell.
- No Windows, use caminhos literais e scripts PowerShell com tratamento de `$LASTEXITCODE`.

## Gates

Depois de alterações relevantes, execute na raiz:

1. `pnpm lint`
2. `pnpm typecheck`
3. `pnpm test`
4. `pnpm build`

Registre comandos e resultados reais em `docs/stages/ETAPA_XX.md`, `docs/STATUS_PROJETO.md` e `docs/CONTINUAR_DESENVOLVIMENTO.md`.

## Estados permitidos

- PENDENTE
- EM ANDAMENTO
- BLOQUEADA
- IMPLEMENTADA — AGUARDANDO VALIDAÇÃO
- CONCLUÍDA E VALIDADA
