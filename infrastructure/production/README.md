# Artefatos de produção

- `compose.vps1.yml`: storefront público, sem banco ou Redis.
- `compose.vps2.yml`: API, painel, worker e Redis privado.
- `../nginx/storefront.conf` e `../nginx/core.conf`: exemplos de upstream HTTP atrás do Cloudflare/TLS.

Use tags imutáveis por digest ou versão nas variáveis `*_IMAGE`. O arquivo `.env.production` da VPS 2 deve existir somente no servidor, com permissões restritas, e nunca ser versionado. Substitua todos os domínios `example.com` antes da homologação.

Regras mínimas de firewall:

- liberar SSH apenas para IPs administrativos;
- liberar 80/443 apenas para o proxy e, quando possível, para faixas publicadas pelo Cloudflare;
- não publicar 3000, 3001, 4000, 5432 ou 6379 na internet;
- manter PostgreSQL e R2 externos acessíveis apenas pelas credenciais de menor privilégio;
- ativar logs, alertas de readiness, uso de disco/memória, falhas do worker e crescimento da DLQ.

Estes arquivos são templates locais. Não autorizam deploy, DNS, TLS ou alteração de firewall.
