# Checklist de homologação e publicação

## Gates técnicos

- [ ] Credenciais expostas na conversa foram rotacionadas.
- [ ] Gateway real escolhido, adaptador implementado e certificado em sandbox do provedor.
- [ ] R2 criado com CORS, lifecycle, credenciais mínimas e domínio de mídia.
- [ ] Imagens Docker construídas, escaneadas e identificadas por digest.
- [ ] Migrations aplicadas por job único no ambiente de homologação.
- [ ] Backup produzido e restaurado em banco temporário com tempos registrados.
- [ ] `VALIDAR_HOMOLOGACAO.ps1` aprovado em HTTPS.
- [ ] Importação Product Collector, worker, checkout e webhook testados ponta a ponta.
- [ ] Alertas de erro, latência, fila, banco e disco configurados.

## Gates de negócio e privacidade

- [ ] Loja real, catálogo, fretes, política de troca, privacidade e termos aprovados.
- [ ] Jornada mobile/desktop revisada por responsável humano.
- [ ] Consentimentos, opt-out e retenção de PII revisados.
- [ ] Pedido de baixo valor testado e estornado no gateway real.
- [ ] Responsáveis por incidente e rollback definidos.

## Publicação

Publicação exige autorização explícita depois de todos os itens acima. O processo promove imagens já homologadas, valida health/readiness, libera tráfego progressivamente e mantém rollback para o digest anterior. Este projeto não foi publicado automaticamente.
