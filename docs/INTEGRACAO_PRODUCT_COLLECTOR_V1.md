# CONTRATO DE INTEGRAÇÃO — PRODUCT COLLECTOR V1

## Fronteira de projetos

- `product-collector`: monorepo **externo**, a desenvolver no futuro; responsável por coleta de fontes autorizadas, normalização e submissão de JSON.
- `ecommerce-engine`: recebe JSON validado em `/v1/integrations/catalog/`, autentica cliente máquina-máquina, mantém trilha de lote, processa itens e mídias em filas e devolve relatórios estruturados.
- **Não exigir ZIP nem download local pelo coletor**. URLs autorizadas são processadas por serviço backend/worker, com regras anti-SSRF e transferência ao R2.
- Implementação real: **Etapa 7**; contrato e portas reservados desde a Etapa 0/1.

## 1. Autenticação e escopos

Modelo V1 proposto: client credentials com `clientId` + segredo de alta entropia (armazenado somente em hash ou segredo cifrado pelo servidor), trocados por token curto e escopado a `storeId`, ou autenticação M2M equivalente assinada. O tipo exato será registrado na Etapa 4 antes de implementação. Escopos mínimos: `catalog:import:create`, `catalog:import:read`, `catalog:import:retry`. Cada cliente vincula-se a lojas permitidas e fontes autorizadas. Rate limit por client/store/IP, rotação e revogação.

## 2. API proposta

### POST `/v1/integrations/catalog/batches`

Headers:

```http
Authorization: Bearer <token-m2m>
Content-Type: application/json
Idempotency-Key: collector-storeA-sourceA-batch-20261011-0001
```

Exemplo de corpo (**dados totalmente fictícios**):

```json
{
  "contractVersion": "1.0",
  "batchId": "batch-20261011-0001",
  "storeId": "89bfcc22-3ce9-422d-a441-071230987500",
  "source": {
    "code": "authorized-supplier-example",
    "name": "Fornecedor Exemplo",
    "usageAuthorization": "licensed",
    "reference": "contract-reference-or-approval-code"
  },
  "submittedAt": "2026-10-11T12:00:00Z",
  "products": [
    {
      "externalProductId": "supplier-item-1001",
      "groupExternalId": "supplier-model-1001",
      "title": "Aparelho Exemplo",
      "description": "Descrição de demonstração.",
      "brand": "Marca de Exemplo",
      "categoryPath": ["Eletrônicos", "Smartphones"],
      "attributes": { "manufacturer": "Exemplo" },
      "sourceUrl": "https://supplier.example/item-1001",
      "media": [
        {
          "url": "https://assets.supplier.example/product-1001.jpg",
          "kind": "image",
          "role": "gallery"
        }
      ],
      "variants": [
        {
          "externalVariantId": "supplier-item-1001-black-128",
          "sku": "EXAMPLE-1001-BLK-128",
          "attributes": { "color": "Preto", "storage": "128 GB" },
          "priceCents": 199990,
          "currency": "BRL",
          "stockQuantity": 10,
          "weightGrams": 190,
          "media": []
        }
      ]
    }
  ]
}
```

Observações contratuais: `source.code` identifica uma fonte pré-cadastrada e autorizada para a loja; `batchId` identifica o lote da origem, e `externalProductId` + `externalVariantId` preservam identidade estável. URLs são referências para fetch posterior, **não** uma autorização genérica para acessar qualquer host. `priceCents` é inteiro não negativo; um produto pode ter N variantes; SKU deverá ser único no escopo da loja. Limites de tamanho, número de itens e mídia serão fixados por schema/benchmark antes de produção.

### Resposta aceita: HTTP 202

```json
{
  "data": {
    "id": "e1ba43c7-0d4c-487b-986d-651804f5fcb4",
    "batchId": "batch-20261011-0001",
    "status": "QUEUED",
    "receivedCount": 1,
    "statusUrl": "/v1/integrations/catalog/batches/e1ba43c7-0d4c-487b-986d-651804f5fcb4"
  },
  "meta": { "requestId": "req-example-001" }
}
```

HTTP 200/202 em envio repetido idêntico (com mesma identificação e hash) retorna **a mesma operação** sem criar lote novo. HTTP 409 `IDEMPOTENCY_PAYLOAD_MISMATCH` em mesmo identificador com payload diferente. HTTP 403 para client sem scope/loja/fonte, HTTP 413 para tamanho excedido, HTTP 422 para falha de validação, HTTP 429 para rate limit.

### GET `/v1/integrations/catalog/batches/:batchId`

```json
{
  "data": {
    "id": "e1ba43c7-0d4c-487b-986d-651804f5fcb4",
    "status": "PARTIALLY_COMPLETED",
    "receivedCount": 2,
    "processedCount": 2,
    "successCount": 1,
    "failedCount": 1,
    "startedAt": "2026-10-11T12:00:01Z",
    "finishedAt": "2026-10-11T12:00:04Z"
  }
}
```

### GET `/v1/integrations/catalog/batches/:batchId/items?status=FAILED&limit=50`

```json
{
  "data": [
    {
      "externalProductId": "supplier-item-1002",
      "status": "FAILED",
      "error": {
        "code": "MEDIA_SOURCE_NOT_ALLOWED",
        "path": "products[1].media[0].url",
        "message": "Host de mídia não autorizado para esta origem.",
        "retryable": false
      }
    }
  ],
  "meta": { "nextCursor": null, "hasMore": false }
}
```

### POST `/v1/integrations/catalog/batches/:batchId/retry`

Requer scope `catalog:import:retry`, registro de ator e filtro explícito de itens com falha reprocessável. Não reexecutar indiscriminadamente os itens concluídos.

## 3. Algoritmo de ingestão

1. Autenticar `clientId`/token e validar vínculo `storeId`.
2. Validar `contractVersion`, tamanho do corpo, limites por array, Zod e fonte.
3. Calcular hash canônico/consistente do payload aceito e consultar `(storeId, sourceId, batchId)`.
4. Em uma transação: criar registro `ImportBatch`, itens preliminares e `OutboxEvent` de aceite; confirmar transação.
5. Outbox publica job `catalog.import.batch`, e API retorna `202`, sem aguardar download.
6. Worker processa produtos idempotentemente; busca `ExternalIdentity` por loja/origem/external ID, respeita `groupExternalId`, upserta produto e variantes com locks/retries, salva erros por item.
7. Mídia é processada por jobs individuais com politicas anti-SSRF; hash SHA-256 e reutilização segura no R2; atualização da galeria após validação.
8. Finalizar lote somente quando estados esperados e políticas de mídia estejam definidos; publicar eventos de catálogo/cache; permitir reprocessamento seletivo.

**Sem partial writes invisíveis:** uma falha de item não deve invalidar todo o lote salvo se configuração `atomic=true` for explicitamente adotada futuramente. V1: atomicidade por item e relatório completo.

## 4. Conflitos com alterações manuais

Regra inicial proposta: campos que o operador marcou como `MANUAL_LOCKED` não são sobrescritos pelo coletor; campos `SOURCE_MANAGED` podem ser atualizados pela fonte dona da identidade; atualizações de preço e estoque podem ter políticas por loja e fonte, mas NUNCA substituir silenciosamente alterações manuais travadas. Registrar diff de campo, origem, timestamp e política. Sem merge por proximidade do nome.

## 5. Regras anti-SSRF / licenciamento

- Origem cadastrada previamente; `sourceUrl` serve como proveniência, não como redirect irrestrito.
- Somente HTTPS; allowlist de host por fonte/loja e resolução DNS revalidada; bloquear `127.0.0.0/8`, RFC1918, link-local, IPv6 local/loopback, IP de metadata e hosts internos.
- Respeitar redirects com limite de saltos e revalidação de destino; limite de tempo, de bytes e de tipos reais; evitar payloads bomba e arquivos executáveis.
- Incluir direitos/autorizações de uso das fotos, vídeos, descrições e marcas em metadados. A plataforma não presume que todo material na internet pode ser republicado.
- Logs redigidos e status por item sem revelar URLs internas, segredos, caminhos reais ou rastros de execução.

## 6. Critérios futuros de aceite (Etapa 7)

- Envio autorizado entra em fila e retorna 202; armazenamento e integração não dependem do coletor ficar conectado.
- Envio repetido não duplica produto/mídia nem aplica estoque duas vezes.
- Outro coletor/loja recebe 403/404 sem vazamento.
- Payload inválido retorna erros Zod serializáveis, sem 500.
- Reprocessamento não altera campos manuais protegidos.
- URL de mídia interna/privada é rejeitada com teste automatizado.
- Relatório mostra sucessos/erros e tempo de processamento por item/lote.
