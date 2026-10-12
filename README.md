# Entrega — Ecommerce Engine, Etapa 0 + início da Etapa 1

**Data:** 11/10/2026  
**Destino no Windows:** `C:\Users\mathe\Downloads\ecommerce-engine`

Conteúdo:

- `docs/references/CONTEXTO_MESTRE_V1.pdf`: referência de 22 páginas, inalterada.
- `docs/CONTEXTO_MESTRE.md`: índice do contexto, invariantes e método.
- `docs/ETAPA_0_ARQUITETURA.md`: arquitetura, módulos, apps/packages, segurança, deploy futuro, riscos.
- `docs/MODELO_DADOS_V1.md`: entidades, relacionamentos, índices, dinheiro e consistência.
- `docs/CONTRATOS_API_V1.md`: mapa de API REST, grupos de acesso, erros e estados.
- `docs/INTEGRACAO_PRODUCT_COLLECTOR_V1.md`: contrato JSON, idempotência, fluxos, segurança.
- `docs/ETAPA_1_CRITERIOS.md`: plano de implementação unitária e aceite verificável.
- `docs/adr/0001-arquitetura-inicial.md`: decisões técnicas documentadas.
- `docs/STATUS_PROJETO.md`: checkpoint para novas conversas.
- `scripts/CRIAR_PASTAS_ETAPA_1.ps1`: **apenas** cria/valida diretórios, sem modificar códigos.

## Aplicar no projeto local

1. Extraia o conteúdo deste pacote dentro da pasta oficial `C:\Users\mathe\Downloads\ecommerce-engine` mantendo `docs/` e `scripts/`.
2. Inspecione os nomes antes de substituir qualquer arquivo existente (o pacote foi pensado para projeto novo).
3. Execute **apenas o script de pastas** após conferir seu conteúdo:

```powershell
Set-Location 'C:\Users\mathe\Downloads\ecommerce-engine'
powershell.exe -NoProfile -ExecutionPolicy Bypass -File '.\scripts\CRIAR_PASTAS_ETAPA_1.ps1'
```

4. Informe saída do comando. Próxima entrega será `package.json` completo, isolado, seguido de cada arquivo da configuração.

**Importante:** este pacote foi criado em ambiente de elaboração, não no seu Windows. Não houve execução do PowerShell no PC, instalação de dependências, build, testes reais de apps nem acesso ao Railway/Contabo.
