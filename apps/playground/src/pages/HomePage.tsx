import type { PageId } from './types';

interface NavCard {
  id: PageId;
  title: string;
  eyebrow: string;
  description: string;
}

const NAV_CARDS: NavCard[] = [
  {
    id: 'flux-basic',
    title: 'Flux Basic',
    eyebrow: 'Core Renderers',
    description: 'Forms, actions, dialogs, tables, data binding, validation, API requests, and renderer fundamentals.'
  },
  {
    id: 'flow-designer',
    title: 'Flow Designer',
    eyebrow: 'Visual Workflow',
    description: 'Designer page, toolbar, inspector, canvas, node palette, edge connections, and designer actions.'
  },
  {
    id: 'report-designer',
    title: 'Report Designer',
    eyebrow: 'Spreadsheet + Metadata',
    description: 'Report template page, field panel, inspector shell, namespaced actions, and report metadata bindings.'
  },
  {
    id: 'debugger-lab',
    title: 'Debugger Lab',
    eyebrow: 'DevTools',
    description: 'Debugger API, event timeline, network trace, interaction diagnostics, and automation hooks.'
  }
];

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="app-shell app-shell--home">
      <section className="hero-card hero-card--home">
        <p className="eyebrow">NOP Chaos Flux</p>
        <h1>Playground</h1>
        <p className="body-copy">
          Select a testing scenario below. Each page isolates a specific area of the framework for focused development and debugging.
        </p>
        <div className="nav-grid">
          {NAV_CARDS.map((card) => (
            <button
              key={card.id}
              className="nav-card"
              onClick={() => onNavigate(card.id)}
            >
              <p className="nav-card__eyebrow">{card.eyebrow}</p>
              <h2 className="nav-card__title">{card.title}</h2>
              <p className="nav-card__copy">{card.description}</p>
              <span className="nav-card__arrow">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
