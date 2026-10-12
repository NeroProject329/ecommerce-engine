# ETAPA 02 — Ambiente local e infraestrutura

## 1. Objetivo

Preparar PostgreSQL, Redis, Prisma e readiness reproduzíveis sem depender de serviços pagos.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado

- Compose local com PostgreSQL 17.6 e Redis 8.2.1, volumes, rede isolada e healthchecks.
- Portas publicadas somente em `127.0.0.1`.
- Prisma ORM 7.10 com generator Rust-free, adapter `pg`, configuração externa e client factory.
- Schema inicial de infraestrutura multi-loja (`Store` e `StoreDomain`).
- `GET /health/ready` com 503 explícito quando PostgreSQL está ausente ou não configurado.
- Worker preparado para BullMQ 6.3.12 e parsing seguro de `redis://`/`rediss://`.
- Runbook e scripts de validação/subida local.

## 4. Decisões técnicas

- `DATABASE_URL` é lida em runtime; apenas uma URL Docker local não secreta existe como fallback da CLI Prisma.
- O worker funciona em modo foundation sem Redis e usa BullMQ quando `REDIS_URL` é fornecida.
- `msgpackr-extract` permanece com build nativo negado; o fallback JavaScript é suficiente e reduz superfície de supply chain.
- Migrations destrutivas em bancos remotos continuam proibidas.

## 5. Testes executados

- `prisma validate`: schema válido.
- `prisma generate`: Prisma Client 7.10 gerado.
- Parser YAML: Compose contém os dois serviços, imagens fixas, healthchecks e bindings loopback.
- Lint e typecheck: 15 workspaces aprovados.
- Testes: 10 arquivos e 13 testes aprovados; inclui readiness 503 e parsing Redis.
- Build: 15 workspaces aprovados.
- Smoke: storefront/admin/API HTTP 200 e worker ativo.
- Conectividade real com PostgreSQL e Redis no ambiente Railway Dev confirmada sem persistir credenciais.
- `GET /health/ready` respondeu HTTP 200 com o PostgreSQL Railway marcado como `up`.
- Migration inicial `20261012123000_init` aplicada por `prisma migrate deploy`.
- `prisma migrate status`: banco sincronizado após o deploy.

## 6. Limitação local não bloqueante

O executável `docker` ainda não existe no host/`PATH`. Por isso o caminho alternativo de infraestrutura local via Compose não foi executado neste computador:

- `docker compose config` pelo daemon/CLI oficial.
- Inicialização dos containers locais.
- Migration contra banco local descartável.

## 7. Critérios de aceite

A etapa foi validada com a infraestrutura Railway Dev escolhida para o projeto: PostgreSQL e Redis aceitaram conexões reais, a migration foi aplicada e o estado do schema foi confirmado. O Compose permanece disponível como alternativa reproduzível, com validação estática aprovada.

## 8. Próxima tarefa

Prosseguir com a modelagem multi-loja da Etapa 3. Quando Docker estiver disponível, executar `scripts/INICIAR_INFRA_LOCAL.ps1` como validação adicional do caminho local.
