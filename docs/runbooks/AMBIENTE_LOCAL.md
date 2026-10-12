# Runbook — ambiente local

## Pré-requisitos

- Node.js 24.x.
- pnpm 11.18.0 via Corepack ou instalação compatível.
- Docker Desktop/Engine com Compose v2.

## Instalação

```powershell
Set-Location 'C:\Users\mathe\Downloads\ecommerce-engine'
pnpm install --frozen-lockfile
Copy-Item -LiteralPath '.env.example' -Destination '.env'
```

O `.env` é local e ignorado pelo Git. Nunca use credenciais reais de produção nesse arquivo.

## PostgreSQL e Redis

```powershell
& '.\scripts\INICIAR_INFRA_LOCAL.ps1'
```

O Compose publica ambos somente no loopback:

- PostgreSQL: `127.0.0.1:5432`.
- Redis: `127.0.0.1:6379`.

Após a primeira subida saudável:

```powershell
pnpm --filter @ecommerce/database db:migrate:dev --name init
```

`migrate dev` é permitido somente contra o banco Docker local explicitamente identificado. Para banco remoto, revisar a URL e usar migrations versionadas com `migrate deploy`; nunca executar `migrate reset`.

## Aplicações

```powershell
pnpm dev
```

- Storefront: `http://localhost:3000`.
- Admin: `http://localhost:3001`.
- API live: `http://localhost:4000/health/live`.
- API ready: `http://localhost:4000/health/ready`.

## Validação

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm build
node '.\scripts\VALIDAR_INFRA_ETAPA_2.mjs'
```

O readiness só deve retornar 200 quando PostgreSQL responder. Sem `DATABASE_URL`, retorna 503 deliberadamente.
