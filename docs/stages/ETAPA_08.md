# ETAPA 08 — Promoções e preços

## 1. Objetivo

Entregar cálculo monetário determinístico, promoções segmentadas, cupons e histórico auditável de preço.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado

- Cálculo monetário inteiro e determinístico em centavos.
- Seleção não cumulativa de promoção por prioridade, percentual e ID.
- Promoções por loja, categoria, produto ou variante e janela temporal.
- Cupons com percentual, subtotal mínimo, teto, vigência e limite de usos.
- Alteração administrativa de preço com histórico auditável.
- Cotação pública consolidando linhas, promoções e cupom.

## 4. Validações

- 4 testes do pacote de comércio aprovados.
- Typecheck, lint e build da API aprovados.
- Smoke real Railway `STAGE8_PRICING_FLOW_OK` aprovado.
- O smoke confirmou histórico 12.000→10.000, promoção de 10%, cupom limitado e total final correto.

## 5. Próxima tarefa exata

Implementar carrinho, reserva de estoque, frete, checkout e pedidos.
