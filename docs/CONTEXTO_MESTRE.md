# CONTEXTO MESTRE — ECOMMERCE ENGINE

Versão da referência: **V1.0 — 10/10/2026**  
Estado: **planejamento técnico Etapa 0 consolidado; implementação local não iniciada**  
Raiz Windows oficial: `C:\Users\mathe\Downloads\ecommerce-engine`

## Hierarquia de referências

1. **Fonte normativa:** [`references/CONTEXTO_MESTRE_V1.pdf`](references/CONTEXTO_MESTRE_V1.pdf), 22 páginas, inalterada.
2. **Detalhamento de Etapa 0:** [`ETAPA_0_ARQUITETURA.md`](ETAPA_0_ARQUITETURA.md), [`MODELO_DADOS_V1.md`](MODELO_DADOS_V1.md), [`CONTRATOS_API_V1.md`](CONTRATOS_API_V1.md), [`INTEGRACAO_PRODUCT_COLLECTOR_V1.md`](INTEGRACAO_PRODUCT_COLLECTOR_V1.md).
3. **Decisões adicionais:** [`adr/0001-arquitetura-inicial.md`](adr/0001-arquitetura-inicial.md).
4. **Próxima fase e aceitação:** [`ETAPA_1_CRITERIOS.md`](ETAPA_1_CRITERIOS.md).
5. **Estado de execução entre conversas:** [`STATUS_PROJETO.md`](STATUS_PROJETO.md).

Se houver conflito entre a versão original e uma decisão nova, **não alterar silenciosamente a referência V1**. Registrar ADR com motivo, implicação, data e revisão.

## Invariantes

- Local-first; somente contratar/configurar VPS Contabo após homologação final.
- Produção futura: VPS 1 (somente storefront); VPS 2 (API, admin, worker, Redis); PostgreSQL gerenciado externo; R2 para mídias.
- PostgreSQL Railway **é possibilidade para Dev**, sujeita a franquia e limites do serviço; PostgreSQL Docker local deve funcionar também.
- Multi-loja por `storeId`, sem marketplace de vendedores terceiros na V1.
- REST `/v1`, contratos Zod, autenticação/RBAC, MFA administrativo, auditoria e segregação de integrações.
- Product Collector **pertence a outro monorepo**; esta base implementa apenas o contrato receptor e processamento assíncrono.
- Valores financeiros em unidades monetárias inteiras; precificação/estoque/pedidos calculados e validados no servidor.
- Outbox transacional para eventos críticos; Redis não é registro de compras.
- Código entregue em arquivos completos, **um de cada vez**. PowerShell restrito a criação de pastas, checagens, testes e rotinas operacionais — não gerar fontes em massa.
- Sem avanço de etapa diante de falhas de lint, typecheck, testes, build ou migrações aplicáveis.

## Ordem aprovada (fonte V1)

Etapas 0 a 17, conforme seção 18 do PDF. Etapa atual: **0 documentada e enviada para inclusão local; Etapa 1 iniciada apenas no preparo de diretórios**.

## Orientação para continuidade

Em nova conversa, consultar primeiro `docs/STATUS_PROJETO.md`, `docs/CONTEXTO_MESTRE.md` e o último documento `docs/stages/ETAPA_*.md`. Não pressupor que um comando foi executado no Windows sem receber o respectivo resultado. As verificações realizadas apenas no ambiente de elaboração são identificadas separadamente.
