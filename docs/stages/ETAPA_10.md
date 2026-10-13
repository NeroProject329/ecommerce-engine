# ETAPA 10 — Pagamentos

## 1. Objetivo

Implementar abstração de gateway, tentativas idempotentes, webhooks autenticados, captura, falha e estorno.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado e validado

- Contrato de gateway desacoplado e gateway sandbox determinístico.
- Cobrança pública protegida pelo token opaco do pedido.
- Tentativa idempotente, captura e resposta segura persistidas.
- Captura transacional consome reservas e baixa estoque uma única vez.
- Webhook HMAC SHA-256 autenticado, resumido e deduplicado.
- Estorno parcial/total protegido por RBAC e MFA, com auditoria.
- Valores monetários permanecem em centavos inteiros.
- 26 testes da API, 2 testes do pacote e smoke Railway `STAGE10_PAYMENTS_FLOW_OK` aprovados.

## 4. Decisão sobre gateways reais

Por decisão do responsável pelo projeto em 12/10/2026, adaptadores de gateways externos ficam para uma etapa posterior. Cada provedor será implementado sobre o contrato já validado, sem alterar o domínio de pedidos e pagamentos.

## 5. Próxima tarefa exata

Implementar a operação administrativa da Etapa 11.
