export default function AdminLogin() {
  return (
    <main>
      <section className="context">
        <p className="eyebrow">Ecommerce Engine</p>
        <h1>Operação clara, sem atalhos frágeis.</h1>
        <p>O painel será conectado somente a endpoints reais, com RBAC, MFA e auditoria.</p>
      </section>
      <section className="login" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Ambiente local</p>
          <h2 id="login-title">Acesso administrativo</h2>
        </div>
        <form>
          <label htmlFor="email">E-mail</label>
          <input id="email" type="email" autoComplete="username" disabled placeholder="Disponível na Etapa 4" />
          <label htmlFor="password">Senha</label>
          <input id="password" type="password" autoComplete="current-password" disabled placeholder="••••••••" />
          <button type="button" disabled>Autenticação em preparação</button>
        </form>
        <p className="note">Nenhuma credencial demonstrativa foi criada nesta etapa.</p>
      </section>
    </main>
  );
}
