import React, { useState } from 'react';
import { Badge, Button, cn } from '@nop-chaos/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
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
  '@nop-chaos/flux-renderers-form-advanced': 'form-advanced',
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

function NavGroup({
  category,
  entries,
  activeRendererId,
  onSelectRenderer,
}: {
  category: RendererCategory;
  entries: RendererRouteEntry[];
  activeRendererId: string | null;
  onSelectRenderer: (id: string) => void;
}) {
  const hasActive = entries.some((e) => e.id === activeRendererId);
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
          'text-[10px] font-bold uppercase tracking-wider cursor-pointer',
          'hover:bg-[var(--nop-nav-surface)] transition-colors duration-100',
          hasActive
            ? 'text-[var(--nop-accent)]'
            : 'text-[var(--nop-accent-muted)]'
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{CATEGORY_LABELS[category]}</span>
        <span className="flex items-center gap-1 opacity-60">
          <span className="text-[9px] font-normal normal-case tracking-normal">{entries.length}</span>
          {open
            ? <ChevronDown className="w-3 h-3" />
            : <ChevronRight className="w-3 h-3" />}
        </span>
      </Button>
      {open && (
        <div className="mt-0.5">
          {entries.map((entry) => (
            <Button
              key={entry.id}
              variant="ghost"
              size="sm"
              className={cn(
                'w-full text-left px-2 py-1.5 rounded-lg text-sm cursor-pointer transition-colors duration-100',
                'flex items-center justify-between gap-1',
                activeRendererId === entry.id
                  ? 'bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-medium'
                  : 'text-[var(--nop-body-copy)] hover:bg-[var(--nop-nav-surface)] hover:text-[var(--nop-text-strong)]'
              )}
              onClick={() => onSelectRenderer(entry.id)}
              data-testid={`nav-renderer-${entry.id}`}
            >
              <span className="truncate">{entry.title}</span>
              <span className="shrink-0 text-[9px] text-[var(--nop-accent-muted)] opacity-60">
                {PACKAGE_SHORT[entry.sourcePackage] ?? ''}
              </span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ComponentLabPage({ activeRendererId, onSelectRenderer, onBack }: ComponentLabPageProps) {
  const activeEntry = resolveActiveEntry(activeRendererId);
  const LabPage = activeRendererId ? RENDERER_LAB_REGISTRY[activeRendererId] : null;

  return (
    <div className="flex h-screen overflow-hidden" data-testid="component-lab">
      <aside className="w-[240px] shrink-0 border-r border-[var(--nop-nav-border)] bg-[var(--nop-hero-bg)] flex flex-col h-screen" data-testid="component-lab-sidebar">
        <div className="p-4 border-b border-[var(--nop-nav-border)] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 text-xs text-[var(--nop-accent)] hover:underline cursor-pointer bg-transparent border-none p-0"
            onClick={onBack}
            data-testid="component-lab-back"
          >
            ← Back to Home
          </Button>
          <p className="uppercase tracking-[0.14em] text-[10px] font-bold text-[var(--nop-accent-muted)]">Component Lab</p>
          <p className="text-xs text-[var(--nop-body-copy)] mt-0.5">{ALL_SHARED_RENDERER_ROUTES.length} renderers</p>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2" data-testid="component-lab-nav">
          {grouped.map(({ category, entries }) => (
            <NavGroup
              key={category}
              category={category}
              entries={entries}
              activeRendererId={activeRendererId}
              onSelectRenderer={onSelectRenderer}
            />
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto" data-testid="component-lab-main">
        {LabPage && activeEntry ? (
          <div className="p-6" data-testid={`component-lab-renderer-${activeEntry.id}`}>
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
                <h1 className="text-2xl font-bold text-[var(--nop-text-strong)] m-0" data-testid="component-lab-renderer-title">{activeEntry.title}</h1>
                <p className="text-[11px] text-[var(--nop-body-copy)] opacity-60 mt-0.5 font-mono" data-testid="component-lab-renderer-id">{activeEntry.id}</p>
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
