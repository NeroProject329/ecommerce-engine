# FECHAMENTO DA API V1

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA NO ESCOPO APROVADO**

## Escopo encerrado

- Perfil do cliente, endereços, favoritos e histórico de pedidos.
- Exportação administrativa de clientes em JSON ou Markdown.
- Carrinho e checkout com cupom, cálculo de frete e regras persistidas por loja.
- Consulta de CEP via ViaCEP com fallback para BrasilAPI.
- Configurações estruturadas de empresa, contato, endereço, marca, redes, políticas e SEO.
- Gestão de entregas, transportadora, rastreio, previsão, estados e atualização em lote.
- Templates de notificações e eventos transacionais de cadastro, recuperação, pedido, pagamento, envio, cancelamento e estorno.
- Campanhas de marketing respeitando o consentimento mais recente do cliente.
- Outbox processada pelo worker com claim, retentativas, backoff e dead-letter.
- Webhooks de saída assinados, histórico de entregas e proteção contra SSRF.
- Rate limit distribuído no Redis, com fallback local somente em teste/desenvolvimento sem Redis.
- Paginação e filtros nas listagens principais.
- Idempotência nas operações críticas de checkout, pagamentos, webhook, importação e estorno.
- Reconciliação de pagamentos e reprocessamento de importações e eventos da outbox.
- Operações administrativas de exclusão, arquivamento, ordenação e lote.
- OpenAPI 3.1 com 121 caminhos ativos, autenticações, envelopes, erros e schemas comuns.

## Evidências de validação

- Migration `20261012230000_api_completion` aplicada no PostgreSQL Railway; 11 migrations no total e nenhuma pendente.
- Consumidor da outbox validado no banco real com transição `PENDING -> PROCESSING -> PUBLISHED` e limpeza do evento temporário.
- API compilada e executada localmente na porta 4101.
- `/health/live` retornou `ok`.
- `/health/ready` retornou `ready`, com PostgreSQL `up`.
- Consulta real do CEP `01001000` retornou São Paulo pelo ViaCEP; o fallback BrasilAPI também foi testado.
- Gates do monorepo aprovados: lint 15/15, typecheck 25/25, testes 25/25 tarefas e build 15/15.
- API: 15 arquivos e 42 testes aprovados; worker: 2 arquivos e 3 testes aprovados.

## Limites deliberados

- Exclusão/anonimização de conta foi retirada do escopo pelo proprietário.
- Gateway de pagamento real continua adiado; o contrato agnóstico e o sandbox permanecem prontos.
- Integrações com transportadoras reais não foram escolhidas; a API de regras, cotação e gestão operacional está pronta.
- URL pública definitiva das mídias, domínio, TLS e publicação serão definidos na etapa de produção.
- Product Collector continuará como monorepo separado e consumirá a API de integração existente.

