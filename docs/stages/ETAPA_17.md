# ETAPA 17 — Homologação e publicação

- Data: 2026-10-12
- Estado: **PRONTA PARA HOMOLOGAÇÃO; PUBLICAÇÃO NÃO AUTORIZADA**

## Preparado

- Checklist técnico, comercial e de privacidade.
- Validador HTTP read-only para API, admin e storefront em HTTPS.
- Critérios de rollback e promoção por imagem imutável.

## Validação externa concluída em 12/10/2026

- PostgreSQL Railway conectado, com 11 migrations aplicadas e nenhuma pendente.
- Redis Railway conectado, `PING=PONG`, versão 8.2.10 e compatibilidade BullMQ aprovada.
- Cloudflare R2 validado com escrita, leitura e exclusão de um objeto temporário.
- Smokes reais aprovados para importação/worker, pagamentos sandbox e integrações/marketing.
- Fechamento da API V1 aprovado: outbox real, CEP, 121 caminhos OpenAPI e gates integrais; detalhes em `FECHAMENTO_API_V1.md`.
- Credenciais operacionais permanecem apenas no `.env` ignorado; `.env.example` contém somente placeholders.

## Bloqueios reais

- Gateway real foi deliberadamente adiado pelo proprietário; o contrato agnóstico e o sandbox estão prontos.
- Integrações reais com transportadoras, dados finais da loja, domínios, TLS e imagens de container serão definidos depois; regras de frete e gestão de entregas já estão na API.
- Drill de restauração depende de `pg_dump`/`pg_restore` e banco temporário.
- Credenciais que tenham sido compartilhadas fora do `.env` devem ser rotacionadas antes da produção.
- A política local do projeto proíbe publicação externa antes da homologação e autorização explícita.
