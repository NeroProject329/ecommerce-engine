# Runbook — backup e recuperação

## Objetivos

- RPO proposto: 24 horas no lançamento; reduzir para 1 hora antes de tráfego crítico.
- RTO proposto: 4 horas no lançamento.
- PostgreSQL é a fonte autoritativa. Redis é transitório e reconstruível.

## Backup lógico

1. Disponibilize `pg_dump` compatível com o servidor.
2. Defina `DATABASE_URL` apenas no processo atual.
3. Execute `infrastructure/operations/BACKUP_POSTGRES.ps1`.
4. Valide com `VALIDAR_BACKUP_POSTGRES.ps1 -DumpPath <arquivo>`.
5. Guarde dump e manifesto SHA-256 em armazenamento privado, criptografado e separado.

O diretório `backups/` é ignorado pelo Git.

## Ensaio de restauração

1. Crie um banco temporário vazio e isolado.
2. Defina `RESTORE_DATABASE_URL` para esse banco, nunca para produção.
3. Valide o dump e execute `RESTAURAR_POSTGRES.ps1 -DumpPath <arquivo> -Execute`.
   O script compara host, porta e nome do banco com `DATABASE_URL` e interrompe com `RESTORE_TARGET_MATCHES_SOURCE` se a origem e o destino forem iguais.
4. Rode migration status, testes transacionais e readiness.
5. Registre duração, tamanho, hash e resultado; remova o banco temporário após aprovação.

## Incidente

1. Congele mutações da API e worker.
2. Preserve logs e identifique o último ponto consistente.
3. Restaure primeiro em ambiente isolado e valide contagens por loja, pedidos, pagamentos e estoque.
4. Troque a conexão somente após aprovação humana explícita.
5. Reprocesse outbox/inbox idempotentemente; Redis não é fonte de verdade.
6. Rotacione credenciais potencialmente expostas e produza relatório pós-incidente.

## Retenção proposta

- Diários: 14 dias; semanais: 8 semanas; mensais: 12 meses.
- Teste de restauração: mensal e antes de mudanças estruturais críticas.

As políticas automáticas do Railway devem ser confirmadas no painel antes da homologação; este runbook não presume snapshots habilitados.
