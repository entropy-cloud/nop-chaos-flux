import React from 'react';
import { ScrollArea, Badge, cn } from '@nop-chaos/ui';
import {
  ALL_SHARED_RENDERER_ROUTES,
  type RendererRouteEntry,
  type RendererCategory
} from '../route-model';
import { RENDERER_LAB_REGISTRY } from './renderer-lab-registry';

const CATEGORY_ORDER: RendererCategory[] = ['layout', 'content', 'actions', 'logic', 'advanced', 'form', 'data'];

const CATEGORY_LABELS: Record<RendererCategory, string> = {
  layout: 'Layout',
  content: 'Content',
  actions: 'Actions',
  logic: 'Logic',
  advanced: 'Advanced',
  form: 'Form',
  data: 'Data',
  domain: 'Domain'
};

const PACKAGE_SHORT: Record<string, string> = {
  '@nop-chaos/flux-renderers-basic': 'basic',
  '@nop-chaos/flux-renderers-form': 'form',
  '@nop-chaos/flux-renderers-data': 'data',
};

interface ComponentLabPageProps {
  activeRendererId: string | null;
  onSelectRenderer: (id: string) => void;
  onBack: () => void;
}

function groupByCategory(routes: RendererRouteEntry[]): Array<{ category: RendererCategory; entries: RendererRouteEntry[] }> {
  const map = new Map<RendererCategory, RendererRouteEntry[]>();

  for (const entry of routes) {
    const existing = map.get(entry.category);
    if (existing) {
      existing.push(entry);
    } else {
      map.set(entry.category, [entry]);
    }
  }

  return CATEGORY_ORDER
    .filter((cat) => map.has(cat))
    .map((cat) => ({ category: cat, entries: map.get(cat)! }));
}

const grouped = groupByCategory(ALL_SHARED_RENDERER_ROUTES);

function resolveActiveEntry(id: string | null): RendererRouteEntry | null {
  if (!id) return null;
  return ALL_SHARED_RENDERER_ROUTES.find((r) => r.id === id) ?? null;
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <p className="text-2xl font-bold text-[var(--nop-text-strong)]">Component Lab</p>
      <p className="text-sm leading-relaxed text-[var(--nop-body-copy)] max-w-sm">
        Select a renderer from the left panel to see its live scenario.
      </p>
      <p className="text-xs text-[var(--nop-body-copy)] opacity-60">
        {ALL_SHARED_RENDERER_ROUTES.length} renderers available
      </p>
    </div>
  );
}

export function ComponentLabPage({ activeRendererId, onSelectRenderer, onBack }: ComponentLabPageProps) {
  const activeEntry = resolveActiveEntry(activeRendererId);
  const LabPage = activeRendererId ? RENDERER_LAB_REGISTRY[activeRendererId] : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-[240px] shrink-0 border-r border-[var(--nop-nav-border)] bg-[var(--nop-hero-bg)] flex flex-col">
        <div className="p-4 border-b border-[var(--nop-nav-border)]">
          <button
            type="button"
            className="mb-3 text-xs text-[var(--nop-accent)] hover:underline cursor-pointer bg-transparent border-none p-0"
            onClick={onBack}
          >
            ← Back to Home
          </button>
          <p className="uppercase tracking-[0.14em] text-[10px] font-bold text-[var(--nop-accent-muted)]">Component Lab</p>
          <p className="text-xs text-[var(--nop-body-copy)] mt-0.5">{ALL_SHARED_RENDERER_ROUTES.length} renderers</p>
        </div>
        <ScrollArea className="flex-1">
          <nav className="p-2">
            {grouped.map(({ category, entries }) => (
              <div key={category} className="mb-3">
                <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--nop-accent-muted)]">
                  {CATEGORY_LABELS[category]}
                </p>
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-100',
                      'flex items-center justify-between gap-1',
                      activeRendererId === entry.id
                        ? 'bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-medium'
                        : 'text-[var(--nop-body-copy)] hover:bg-[var(--nop-nav-surface)] hover:text-[var(--nop-text-strong)]'
                    )}
                    onClick={() => onSelectRenderer(entry.id)}
                  >
                    <span className="truncate">{entry.title}</span>
                    <span className="shrink-0 text-[9px] text-[var(--nop-accent-muted)] opacity-60">
                      {PACKAGE_SHORT[entry.sourcePackage] ?? ''}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      <main className="flex-1 overflow-auto">
        {LabPage && activeEntry ? (
          <div className="p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {CATEGORY_LABELS[activeEntry.category]}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    {PACKAGE_SHORT[activeEntry.sourcePackage] ?? activeEntry.sourcePackage}
                  </Badge>
                </div>
                <h1 className="text-2xl font-bold text-[var(--nop-text-strong)] m-0">{activeEntry.title}</h1>
                <p className="text-[11px] text-[var(--nop-body-copy)] opacity-60 mt-0.5 font-mono">{activeEntry.id}</p>
              </div>
            </div>
            <LabPage />
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
