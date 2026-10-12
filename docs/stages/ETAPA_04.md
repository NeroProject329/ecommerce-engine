# ETAPA 04 — Autenticação e permissões

## 1. Objetivo

Implementar autenticação de clientes e administradores, sessões revogáveis, recuperação de acesso, MFA administrativo e RBAC por loja.

## 2. Data e estado

- Data: 2026-10-12
- Estado: **CONCLUÍDA E VALIDADA**

## 3. Implementado

- Senhas com `scrypt`, salt aleatório e comparação em tempo constante.
- Tokens opacos de 256 bits, persistidos somente por hash SHA-256.
- Registro, login, logout, recuperação e redefinição de senha de clientes.
- Login, logout, recuperação e redefinição de senha de administradores.
- Enrollment e verificação TOTP; segredo MFA cifrado com AES-256-GCM.
- Sessões revogáveis e revogação global após redefinição de senha.
- RBAC por membership, `storeId`, permissão e MFA verificado.
- Oitava migration, `20261012190000_admin_recovery`, aplicada no Railway Dev.
- Rotas HTTP sob `/v1/customer/auth/*` e `/v1/admin/auth/*`.

## 4. Validações

- 5 testes do pacote `@ecommerce/auth` aprovados.
- 8 testes da API aprovados, incluindo autenticação de clientes e administradores.
- Smoke real `validate:stage4` aprovado duas vezes contra PostgreSQL Railway.
- Smoke cobriu registro, login, logout, MFA, RBAC, isolamento entre lojas e recuperação de ambas as identidades.
- Gates globais `lint`, `typecheck`, `test` e `build` aprovados em todos os workspaces.

## 5. Decisões de segurança

- Senhas e tokens brutos nunca são persistidos ou registrados em logs.
- A API não confiará em `storeId` fornecido isoladamente pelo browser.
- Ações administrativas sensíveis exigem sessão, membership ativa, permissão e MFA verificado.
- Recuperação utiliza token de uso único, hash no banco e expiração curta.
- A entrega do token por e-mail/SMS depende do adaptador de comunicação da Etapa 13; a mecânica de emissão e consumo já está validada.

## 6. Próxima tarefa exata

Implementar catálogo completo: categorias, marcas, produtos, variantes, preços, estoque e publicação segura.
