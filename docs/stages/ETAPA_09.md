# ETAPA 09 — Carrinho, pedidos e frete

## 1. Objetivo

Implementar carrinho persistente, reserva concorrente de estoque, cotação de frete, checkout idempotente e criação de pedido com snapshots imutáveis.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado e validado

- Carrinho anônimo protegido por token opaco.
- Itens validados contra publicação, preço e estoque disponível.
- Cotação de frete persistida, limitada por validade e vinculada ao carrinho.
- Checkout com isolamento serializável e reserva atômica de estoque.
- Pedido, itens, histórico, remessa e snapshots imutáveis na mesma transação.
- Replay idempotente retorna o mesmo pedido sem nova reserva.
- Migration 9 adicionou localização explícita à reserva.
- 22 testes da API e smoke Railway `STAGE9_CHECKOUT_FLOW_OK` aprovados.

## 4. Próxima tarefa exata

Implementar gateways, tentativas, webhooks e estornos de pagamento.
