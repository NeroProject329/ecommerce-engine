# ETAPA 16 — Preparação de produção

- Data: 2026-10-12
- Estado: **CONCLUÍDA; IMAGENS NÃO CONSTRUÍDAS LOCALMENTE**

## Entregas

- Dockerfiles independentes para API, worker, admin e storefront.
- Admin e storefront iniciam pelo `server.js` standalone do Next.js 16, com os assets estáticos copiados para o bundle final.
- Composes separados para VPS 1 (storefront) e VPS 2 (API, admin, worker e Redis), sem portas internas publicadas.
- Templates Nginx para loja, API e painel, com encaminhamento correto e limite adicional por IP na API.
- Regras mínimas de firewall, imagens imutáveis, segredos externos e observabilidade documentadas.
- `.dockerignore` exclui segredos, backups e artefatos locais.
- Configuração de produção fail-closed para banco, Redis, criptografia, webhook, CORS HTTPS e R2.
- Headers de segurança no admin e storefront.
- Runbook de ordem de promoção, migrations e validação.
- Testes do pacote de configuração, builds Next.js e typecheck aprovados.

## Smoke dos artefatos de produção

- API compilada iniciada por `node dist/main.js`: liveness, readiness e OpenAPI responderam HTTP 200.
- Admin iniciado pelo bundle standalone: página e CSS gerado responderam HTTP 200.
- Storefront iniciado pelo bundle standalone: página e CSS gerado responderam HTTP 200.
- O alerta do Next.js 16 sobre `next start` com `output: standalone` foi eliminado nos Dockerfiles.

Docker não está disponível nesta estação; a construção das imagens fica no gate de homologação.
