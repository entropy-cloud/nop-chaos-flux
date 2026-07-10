import { useMemo, useState } from 'react';
import { Badge, Button, cn } from '@nop-chaos/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  COMPLEX_PAGE_CATEGORY_META,
  COMPLEX_PAGE_CATEGORY_ORDER,
  COMPLEX_PAGE_ENTRIES,
  type ComplexPageCategory,
  type ComplexPageEntry,
} from './complex-pages-model';
import { COMPLEX_PAGE_REGISTRY } from './complex-pages-registry';
import { createShowcaseEnv } from './shared/showcase-env';

interface ComplexPagesShowcaseProps {
  activePageId: string | null;
  onSelectPage: (id: string) => void;
  onBack: () => void;
}

function groupByCategory(): Array<{
  category: ComplexPageCategory;
  entries: ComplexPageEntry[];
}> {
  const map = new Map<ComplexPageCategory, ComplexPageEntry[]>();
  for (const entry of COMPLEX_PAGE_ENTRIES) {
    const existing = map.get(entry.category);
    if (existing) existing.push(entry);
    else map.set(entry.category, [entry]);
  }
  return COMPLEX_PAGE_CATEGORY_ORDER.filter((c) => map.has(c)).map((category) => ({
    category,
    entries: map.get(category)!,
  }));
}

function NavGroup({
  category,
  entries,
  activePageId,
  onSelectPage,
}: {
  category: ComplexPageCategory;
  entries: ComplexPageEntry[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
}) {
  const meta = COMPLEX_PAGE_CATEGORY_META[category];
  const hasActive = entries.some((e) => e.id === activePageId);
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
          'text-[11px] font-bold tracking-wide cursor-pointer',
          'hover:bg-[var(--nop-nav-surface)] transition-colors duration-100',
          hasActive ? 'text-[var(--nop-accent)]' : 'text-[var(--nop-accent-muted)]',
        )}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span>{meta.label}</span>
        <span className="flex items-center gap-1 opacity-60">
          <span className="text-[9px] font-normal">{entries.length}</span>
          {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
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
                activePageId === entry.id
                  ? 'bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-medium'
                  : 'text-[var(--nop-body-copy)] hover:bg-[var(--nop-nav-surface)] hover:text-[var(--nop-text-strong)]',
              )}
              onClick={() => onSelectPage(entry.id)}
              data-testid={`complex-nav-${entry.id}`}
            >
              <span className="truncate">{entry.title}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
      <p className="text-2xl font-bold text-[var(--nop-text-strong)]">Complex Pages</p>
      <p className="text-sm leading-relaxed text-[var(--nop-body-copy)] max-w-sm">
        从左侧选择一个复杂页面场景：标准 CRUD、树形导航表格、行内编辑、复杂查询、主从联动（多子表）、分步表单、多分组联动表单、仪表盘。
      </p>
      <p className="text-xs text-[var(--nop-body-copy)] opacity-60">
        {COMPLEX_PAGE_ENTRIES.length} 个真实业务页面 · {COMPLEX_PAGE_CATEGORY_ORDER.length} 个分类
      </p>
    </div>
  );
}

export function ComplexPagesShowcase({
  activePageId,
  onSelectPage,
  onBack,
}: ComplexPagesShowcaseProps) {
  const grouped = useMemo(() => groupByCategory(), []);
  const activeEntry = useMemo(
    () => COMPLEX_PAGE_ENTRIES.find((e) => e.id === activePageId) ?? null,
    [activePageId],
  );
  const PageComponent = activePageId ? COMPLEX_PAGE_REGISTRY[activePageId] : null;

  // A single shared env keeps the in-memory mock DB consistent across pages,
  // so a create/update in one list is observable after navigating.
  const { env } = useMemo(() => createShowcaseEnv(), []);

  return (
    <div className="flex h-screen overflow-hidden" data-testid="complex-pages-showcase">
      <aside
        className="w-[240px] shrink-0 border-r border-[var(--nop-nav-border)] bg-[var(--nop-hero-bg)] flex flex-col h-screen"
        data-testid="complex-pages-sidebar"
      >
        <div className="p-4 border-b border-[var(--nop-nav-border)] shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="mb-3 text-xs text-[var(--nop-accent)] hover:underline cursor-pointer bg-transparent border-none p-0"
            onClick={onBack}
            data-testid="complex-pages-back"
          >
            ← Back to Home
          </Button>
          <p className="uppercase tracking-[0.14em] text-[10px] font-bold text-[var(--nop-accent-muted)]">
            Complex Pages
          </p>
          <p className="text-xs text-[var(--nop-body-copy)] mt-0.5">
            {COMPLEX_PAGE_ENTRIES.length} 个真实业务页面
          </p>
        </div>
        <nav className="flex-1 min-h-0 overflow-y-auto p-2" data-testid="complex-pages-nav">
          {grouped.map(({ category, entries }) => (
            <NavGroup
              key={category}
              category={category}
              entries={entries}
              activePageId={activePageId}
              onSelectPage={onSelectPage}
            />
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-auto" data-testid="complex-pages-main">
        {PageComponent && activeEntry ? (
          <div className="p-6" data-testid={`complex-page-${activeEntry.id}`}>
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                    {COMPLEX_PAGE_CATEGORY_META[activeEntry.category].label}
                  </Badge>
                  {activeEntry.features.map((f) => (
                    <Badge key={f} variant="secondary" className="text-[10px]">
                      {f}
                    </Badge>
                  ))}
                </div>
                <h1
                  className="text-2xl font-bold text-[var(--nop-text-strong)] m-0"
                  data-testid="complex-page-title"
                >
                  {activeEntry.title}
                </h1>
                <p className="text-sm text-[var(--nop-body-copy)] opacity-70 mt-1 max-w-3xl">
                  {activeEntry.description}
                </p>
              </div>
            </div>
            <PageComponent env={env} />
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
