# ADR-0001 — Arquitetura inicial e entrega incremental

- Data: 2026-10-11
- Status: aceita para planejamento de Etapa 0
- Motivação: especificar Contexto Mestre V1 de forma testável, reduzir erros no Windows e manter alta velocidade sem antecipar deploy.

## Decisões

1. **Monólito modular NestJS** com worker separado via BullMQ; não separar microsserviços antes de necessidade medida.
2. Multi-loja por `storeId`, domínio verificado e tenant-awareness por FK/queries; sem marketplace de terceiros.
3. Quatro apps (`storefront`, `admin`, `api`, `worker`), onze pacotes base da V1. Nenhum pacote de Product Collector dentro deste repo.
4. Product Collector envia JSON M2M versionado e idempotente para `POST /v1/integrations/catalog/batches`; backend processa mídias de forma assíncrona.
5. Dinheiro em centavos, sem float; desconto decimal (`DECIMAL`) e política de promoção não acumulável por padrão.
6. Pedido e pagamento gravados em PostgreSQL; outbox e inbox para entrega ao menos uma vez com consumo idempotente; Redis não é fonte de verdade financeira.
7. Banco remoto Railway apenas Dev opcional, com fallback Docker PostgreSQL e proteção de migrations; Contabo só na homologação/produção.
8. Scripts PowerShell para operações/pastas/testes; código fonte fornecido arquivo por arquivo. Nunca gerar projeto inteiro por `.ps1` gigante.
9. Matriz de compatibilidade inicial Node 24 LTS, pnpm 11, Next 16, Nest 11, Prisma 7, TypeScript 5.9 e Turbo 2; patches exatos de pacotes serão fixados no lockfile ao instalar com testes. Atualização major exige ADR.
10. APIs REST v1 com respostas previsíveis, problemas RFC 9457, schemas Zod e OpenAPI produzido/testado durante a implementação.

## Alternativas consideradas

- Microsserviços desde o início: rejeitado por overhead operacional e de consistência, sem ganho comprovado.
- PostgreSQL na VPS principal: rejeitado por isolamento, disponibilidade e estratégia de recuperação estabelecidos na V1.
- Collector embutido no repo de e-commerce: rejeitado explicitamente pelo Contexto Mestre.
- Montar projeto com script que escreve todos os fontes: rejeitado por preferência operacional e dificuldade de depuração.
- Deploy na Contabo antes de homologar localmente: proibido pela V1.

## Consequências

- Menor complexidade inicial e maior capacidade de teste.
- Disciplina de contratos, isolamento por loja e testes de concorrência são obrigatórios.
- Maior número de pequenas entregas manuais, compensado por identificação precisa de erros e facilidade de continuidade.
- Estimativas de escala e recuperação serão revisadas após benchmarks e restore real, não inferidas do planejamento.
