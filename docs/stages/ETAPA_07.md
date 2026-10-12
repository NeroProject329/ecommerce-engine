# ETAPA 07 — Importação JSON

## 1. Objetivo

Receber catálogos externos em contrato versionado, processar lotes de forma idempotente e fornecer progresso e erros auditáveis.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Escopo

- Contrato JSON V1 compartilhado e validado.
- Fontes de importação por loja e lotes idempotentes.
- Itens persistidos antes do enfileiramento.
- Fila BullMQ por item, tentativas e falhas seguras.
- Upsert por identidade externa sem duplicar produtos e variantes.
- Políticas de override manual/importação.
- Consulta de progresso e relatório por lote.

## 4. Implementado

- Contrato JSON V1 compartilhado, tipado e limitado.
- Hash canônico para idempotência e conflito em replay divergente.
- Fontes, lotes e itens persistidos antes do enfileiramento.
- Produtor BullMQ na API e consumidor concorrente no worker.
- Upsert por identidade externa de produto e variante.
- Atualização de categoria, marca, preço e estoque sem duplicação.
- Preservação de campos marcados com política `MANUAL_WINS`.
- Relatório de lote com progresso, tentativas e erros seguros.

## 5. Validações

- 3 testes do contrato, 18 testes da API e 3 testes do worker aprovados.
- Typecheck, lint e build da API e worker aprovados.
- Smoke real PostgreSQL + Redis `STAGE7_IMPORT_FLOW_OK` aprovado.
- O smoke confirmou fila, worker, replay idempotente, conflito, atualização e override manual.

## 6. Próxima tarefa exata

Implementar motor de preços, promoções e cupons.
