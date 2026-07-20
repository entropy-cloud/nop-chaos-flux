type NavigationTarget =
  | 'component-lab'
  | 'complex-pages'
  | 'flux-basic'
  | 'flow-designer'
  | 'gantt'
  | 'kanban'
  | 'taskflow-designer'
  | 'dingtalk-flow-demo'
  | 'report-designer'
  | 'debugger-lab'
  | 'condition-builder'
  | 'code-editor'
  | 'word-editor'
  | 'performance-table'
  | 'm5-showcase'
  ;
import { Button } from '@nop-chaos/ui';

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
    description:
      'Route-backed gallery for every live Flux renderer. Left-side navigation, focused scenarios, and per-renderer verification.',
  },
  {
    id: 'complex-pages',
    title: 'Complex Pages',
    eyebrow: 'Real-World Scenarios',
    description:
      'Real-world business page gallery: standard CRUD, tree-driven table, inline edit, advanced query, master-detail with multiple sub-tables, multi-step wizard, multi-fieldset linked form, and dashboard. Left category menu, right per-page demo.',
  },
  {
    id: 'flux-basic',
    title: 'Flux Basic',
    eyebrow: 'Core Renderers',
    description:
      'Forms, actions, dialogs, tables, data binding, validation, API requests, and renderer fundamentals.',
  },
  {
    id: 'flow-designer',
    title: 'Flow Designer',
    eyebrow: 'Visual Workflow',
    description:
      'DingTalk approval flow, action flow, and general workflow editors with toolbar, palette, inspector, and canvas.',
  },
  {
    id: 'gantt',
    title: 'Gantt Chart',
    eyebrow: 'Scheduling',
    description:
      'Interactive Gantt chart with task grid, timeline, dependency links, drag-and-drop, zoom controls, and keyboard navigation.',
  },
  {
    id: 'kanban',
    title: 'Kanban Board',
    eyebrow: 'Scheduling',
    description:
      'Interactive Kanban board with column and card rendering, cross-column drag-and-drop, column reorder, card filtering, and add/delete cards and columns.',
  },
  {
    id: 'taskflow-designer',
    title: 'TaskFlow Designer',
    eyebrow: 'TaskFlow',
    description:
      'TaskFlow visual designer with graph and tree modes, nop-task DSL export/import/inspector.',
  },
  {
    id: 'dingtalk-flow-demo',
    title: 'DingTalk Flow Demo',
    eyebrow: 'Style Prototype',
    description:
      'Static DingTalk approval flow visual reference. See Flow Designer for the full tree-mode editor.',
  },
  {
    id: 'report-designer',
    title: 'Report Designer',
    eyebrow: 'Spreadsheet + Metadata',
    description:
      'Report template page, field panel, inspector shell, namespaced actions, and report metadata bindings.',
  },
  {
    id: 'debugger-lab',
    title: 'Debugger Lab',
    eyebrow: 'DevTools',
    description:
      'Debugger API, event timeline, network trace, interaction diagnostics, and automation hooks.',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    eyebrow: 'Form Control',
    description:
      'Condition builder renderer: embedded/picker modes, AND/OR/NOT toggles, field search, nested groups, unique fields, custom operators.',
  },
  {
    id: 'code-editor',
    title: 'Code Editor',
    eyebrow: 'CodeMirror 6',
    description:
      'Code editors for expression, SQL, JSON, JavaScript, CSS, HTML. Syntax highlighting, auto-completion, themes, line numbers, folding, and read-only mode.',
  },
  {
    id: 'word-editor',
    title: 'Word Editor',
    eyebrow: 'Document Template',
    description:
      'Word-like document editor with canvas 2D rendering, template expressions, formatting toolbar, and paper settings.',
  },
  {
    id: 'performance-table',
    title: 'Performance Table',
    eyebrow: 'Large Data Stress',
    description:
      'Same-environment comparative measurement page for a 1000-row paged table baseline plus nested loop cards, aggregate formulas, scope-backed selection/pagination, and many mounted editable controls.',
  },
  {
    id: 'm5-showcase',
    title: 'Mobile Showcase',
    eyebrow: 'M1–M5 All Mobile',
    description:
      'Comprehensive mobile component showcase: M5 native renderers (pull-refresh, infinite-scroll, swipe-cell, countdown, notice-bar) + M1 responsive controls + M2 touch adaptation + M3 layout skeletons + M4 data display + content/layout renderers.',
  },
];

interface HomePageProps {
  onNavigate: (page: NavigationTarget) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <section className="max-w-[860px] text-center p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          NOP Chaos Flux
        </p>
        <h1 className="m-0 mb-2 text-[clamp(32px,5vw,56px)] leading-none">Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-8">
          Select a testing scenario below. Each page isolates a specific area of the framework for
          focused development and debugging.
        </p>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mt-6">
          {NAV_CARDS.map((card) => (
            <Button
              key={card.id}
              type="button"
              variant="ghost"
              className="group relative flex h-auto w-full flex-col items-start overflow-hidden rounded-[20px] border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-6 text-left whitespace-normal cursor-pointer justify-start gap-0 ring-0 transition-[transform,box-shadow,border-color] duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[var(--nop-nav-shadow)] hover:border-[var(--nop-nav-hover-border)]"
              onClick={() => onNavigate(card.id)}
            >
              <p className="mb-2 uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-accent-muted)]">
                {card.eyebrow}
              </p>
              <h2 className="mb-2 text-xl font-bold text-[var(--nop-text-strong)]">{card.title}</h2>
              <p className="text-sm leading-relaxed text-[var(--nop-body-copy)]">
                {card.description}
              </p>
              <span className="absolute right-4 bottom-4 text-xl text-[var(--nop-accent)] opacity-0 -translate-x-1 transition-all duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:opacity-100 group-hover:translate-x-0">
                →
              </span>
            </Button>
          ))}
        </div>
      </section>
    </main>
  );
}
