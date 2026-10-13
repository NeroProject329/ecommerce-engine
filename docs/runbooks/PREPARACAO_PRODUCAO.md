# Preparação de produção

## Serviços separados

- `api`: `infrastructure/docker/Dockerfile.api`, health `/health/live` e `/health/ready`.
- `worker`: `infrastructure/docker/Dockerfile.worker`, sem porta pública.
- `admin`: `infrastructure/docker/Dockerfile.admin`, porta 3001.
- `storefront`: `infrastructure/docker/Dockerfile.storefront`, porta 3000.
- PostgreSQL e Redis continuam serviços gerenciados e separados.
- `infrastructure/production/compose.vps1.yml`: topologia da VPS pública.
- `infrastructure/production/compose.vps2.yml`: topologia da VPS principal, com Redis persistente privado.
- `infrastructure/nginx/*.conf`: exemplos de proxy reverso; domínios são placeholders.

## Ordem segura

1. Criar ambiente de homologação sem apontar domínios públicos.
2. Configurar segredos fora do repositório e R2 privado/público conforme política.
3. Rodar migrations como job único antes de subir novas réplicas.
4. Subir API e validar readiness; depois worker, admin e storefront.
5. Executar smokes de tenant, importação, checkout e pagamento sandbox.
6. Somente após aprovação, promover a mesma imagem imutável para produção.

## Controles obrigatórios

- Em `NODE_ENV=production`, API falha ao iniciar sem PostgreSQL, Redis, chave de criptografia, segredo de webhook, CORS HTTPS e R2 completo.
- Worker falha ao iniciar sem PostgreSQL e Redis.
- Admin nega framing; storefront permite somente same-origin.
- Nenhum Dockerfile contém credencial ou URL do Railway.

## Pendências deliberadas

- Escolher e implementar gateway real.
- Confirmar plano, snapshots e política de retenção no Railway.
- Criar bucket R2 e credenciais limitadas.
- Definir domínios, TLS, observabilidade externa e alertas.
- Fazer ensaio de restauração em banco temporário.

Nenhuma publicação é autorizada por este documento.
