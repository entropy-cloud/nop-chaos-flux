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
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    eyebrow: 'Form Control',
    description: 'Condition builder renderer: embedded/picker modes, AND/OR/NOT toggles, field search, nested groups, unique fields, custom operators.'
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    eyebrow: 'CodeMirror 6',
    description: 'Code editors for expression, SQL, JSON, JavaScript, CSS, HTML. Syntax highlighting, auto-completion, themes, line numbers, folding, and read-only mode.'
  }
];

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-[800px] text-center p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">NOP Chaos Flux</p>
        <h1 className="m-0 mb-2 text-[clamp(32px,5vw,56px)] leading-none">Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-8">
          Select a testing scenario below. Each page isolates a specific area of the framework for focused development and debugging.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mt-6">
          {NAV_CARDS.map((card) => (
            <button
              key={card.id}
              className="group relative overflow-hidden text-left p-6 rounded-[20px] bg-[var(--nop-nav-surface)] border border-[var(--nop-nav-border)] cursor-pointer transition-[transform,box-shadow,border-color] duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[var(--nop-nav-shadow)] hover:border-[var(--nop-nav-hover-border)]"
              onClick={() => onNavigate(card.id)}
            >
              <p className="mb-2 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-accent-muted)]">{card.eyebrow}</p>
              <h2 className="mb-2 text-xl font-bold text-[var(--nop-text-strong)]">{card.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">{card.description}</p>
              <span className="absolute right-4 bottom-4 text-xl text-[var(--nop-accent)] opacity-0 -translate-x-1 transition-all duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100 group-hover:translate-x-0">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
