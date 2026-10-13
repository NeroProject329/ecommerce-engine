# ETAPA 15 — Backup e recuperação

- Data: 2026-10-12
- Estado: **IMPLEMENTADA; ENSAIO DE RESTAURAÇÃO PENDENTE**

## Entregas

- Backup lógico PostgreSQL em formato custom, sem owner/privilégios.
- Manifesto com tamanho, timestamp e SHA-256.
- Validação estrutural via `pg_restore --list` e conferência de hash.
- Restauração exige URL separada e chave explícita `-Execute`.
- Proteção fail-closed impede restauração quando destino e origem possuem o mesmo host, porta e banco.
- Runbook com RPO/RTO, retenção, incidente e checklist pós-restore.

## Limitação validada

Os scripts passaram na análise sintática PowerShell. Esta máquina não possui `pg_dump`/`pg_restore` e nenhum banco temporário foi autorizado, portanto o drill real permanece requisito de homologação.
