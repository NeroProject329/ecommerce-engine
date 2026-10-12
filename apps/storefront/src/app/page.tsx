import { StatusCard } from '@ecommerce/ui';

const foundations = [
  ['API modular', 'Health check operacional na porta 4000.'],
  ['Contratos tipados', 'Schemas compartilhados e validação nas fronteiras.'],
  ['Local-first', 'Nenhum serviço externo é necessário nesta etapa.'],
] as const;

export default function StorefrontHome() {
  return (
    <main>
      <nav aria-label="Navegação principal">
        <a className="brand" href="#inicio">E/Engine</a>
        <span>Fundação local</span>
      </nav>
      <section className="hero" id="inicio">
        <p className="kicker">Ecommerce Engine · Etapa 1</p>
        <h1>Uma base comercial pronta para crescer com segurança.</h1>
        <p className="lead">
          Storefront, administração, API e worker independentes, unidos por contratos claros.
        </p>
        <a className="cta" href="#fundacao">Ver fundação</a>
      </section>
      <section className="grid" id="fundacao" aria-label="Fundamentos implementados">
        {foundations.map(([title, description], index) => (
          <StatusCard key={title} eyebrow={`0${index + 1}`} title={title}>
            <p>{description}</p>
          </StatusCard>
        ))}
      </section>
    </main>
  );
}
