# ETAPA 06 — Mídia

## 1. Objetivo

Implementar pipeline seguro de imagens com armazenamento abstrato, upload, importação por URL, deduplicação e rendições otimizadas.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Escopo

- Storage local para desenvolvimento e adaptador S3 compatível com Cloudflare R2.
- Validação por assinatura real do arquivo, tamanho e dimensões.
- Importação HTTPS com proteção contra SSRF e limite de resposta.
- Deduplicação por SHA-256 dentro da loja.
- Rendições WebP otimizadas e metadados persistidos.
- Associação ordenada a produtos e variantes.

## 4. Implementado

- Storage local para desenvolvimento e adaptador S3 compatível com Cloudflare R2.
- Validação por assinatura binária, tamanho máximo e limite de pixels.
- Importação HTTPS com resolução DNS, bloqueio de redes privadas, timeout e limite de streaming.
- Deduplicação por SHA-256 por loja.
- Rendimento WebP otimizado com rotação e metadados reais.
- Associação ordenada a produtos e variantes.
- Entrega pública com cache imutável e inclusão da mídia no catálogo público.
- Configuração R2 declarada sem persistir credenciais.

## 5. Validações

- 4 testes do pacote de mídia aprovados, incluindo transformação real via Sharp.
- 3 testes HTTP adicionais; suíte da API com 15 testes aprovados.
- Typecheck, lint e build aprovados.
- Smoke real Railway `STAGE6_MEDIA_FLOW_OK` aprovado e totalmente limpo ao final.
- Smoke confirmou upload, deduplicação, associação, entrega original/WebP e isolamento cross-tenant.

## 6. Próxima tarefa exata

Implementar contrato JSON versionado, lotes, itens, filas, atualização e relatórios de importação.
