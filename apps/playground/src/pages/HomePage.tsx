type NavigationTarget = 'component-lab' | 'flux-basic' | 'flow-designer' | 'dingtalk-flow-demo' | 'report-designer' | 'debugger-lab' | 'condition-builder' | 'code-editor' | 'word-editor' | 'performance-table';
import { Card } from '@nop-chaos/ui';

interface NavCard {
  id: NavigationTarget;
  title: string;
  eyebrow: string;
  description: string;
}

const NAV_CARDS: NavCard[] = [
  {
    id: 'component-lab',
    title: 'Component Lab',
    eyebrow: 'All Renderers',
    description: 'Route-backed gallery for every live Flux renderer. Left-side navigation, focused scenarios, and per-renderer verification.'
  },
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
    description: 'DingTalk approval flow, action flow, and general workflow editors with toolbar, palette, inspector, and canvas.'
  },
  {
    id: 'dingtalk-flow-demo',
    title: 'DingTalk Flow Demo',
    eyebrow: 'Style Prototype',
    description: 'Static DingTalk approval flow visual reference. See Flow Designer for the full tree-mode editor.'
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
  },
  {
    id: 'word-editor',
    title: 'Word Editor',
    eyebrow: 'Document Template',
    description: 'Word-like document editor with canvas 2D rendering, template expressions, formatting toolbar, and paper settings.'
  },
  {
    id: 'performance-table',
    title: 'Performance Table',
    eyebrow: 'Large Data Stress',
    description: '1000-row mixed-renderer table plus nested loop cards, aggregate formulas, scope-backed selection/pagination, and many mounted editable controls.'
  }
];

interface HomePageProps {
  onNavigate: (page: NavigationTarget) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-[860px] text-center p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">NOP Chaos Flux</p>
        <h1 className="m-0 mb-2 text-[clamp(32px,5vw,56px)] leading-none">Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-8">
          Select a testing scenario below. Each page isolates a specific area of the framework for focused development and debugging.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mt-6">
          {NAV_CARDS.map((card) => (
            <Card
              key={card.id}
              className="group relative overflow-hidden text-left p-6 rounded-[20px] bg-[var(--nop-nav-surface)] border border-[var(--nop-nav-border)] cursor-pointer transition-[transform,box-shadow,border-color] duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[var(--nop-nav-shadow)] hover:border-[var(--nop-nav-hover-border)] ring-0 gap-0"
              onClick={() => onNavigate(card.id)}
            >
              <p className="mb-2 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-accent-muted)]">{card.eyebrow}</p>
              <h2 className="mb-2 text-xl font-bold text-[var(--nop-text-strong)]">{card.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">{card.description}</p>
              <span className="absolute right-4 bottom-4 text-xl text-[var(--nop-accent)] opacity-0 -translate-x-1 transition-all duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100 group-hover:translate-x-0">→</span>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
