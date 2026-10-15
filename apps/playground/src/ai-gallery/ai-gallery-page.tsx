import { Suspense, useState } from 'react';
import { Button, Drawer, DrawerContent, Spinner, cn, useIsMobile } from '@nop-chaos/ui';
import { ChevronDown, ChevronRight, Menu } from 'lucide-react';
import {
  AI_GALLERY_ENTRIES,
  groupAiGalleryByPhase,
  type AiGalleryEntry,
  type AiGalleryPhase,
} from './ai-gallery-model';
import { AI_GALLERY_REGISTRY } from './ai-gallery-registry';

interface AiGalleryPageProps {
  activeDemoId: string | null;
  onSelectDemo: (id: string) => void;
  onBack: () => void;
}

const grouped = groupAiGalleryByPhase();

function resolveActiveEntry(id: string | null): AiGalleryEntry | null {
  if (!id) return null;
  return AI_GALLERY_ENTRIES.find((entry) => entry.id === id) ?? null;
}

function NavGroup({
  phase,
  label,
  entries,
  activeDemoId,
  onSelectDemo,
}: {
  phase: AiGalleryPhase;
  label: string;
  entries: AiGalleryEntry[];
  activeDemoId: string | null;
  onSelectDemo: (id: string) => void;
}) {
  const hasActive = entries.some((entry) => entry.id === activeDemoId);
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'w-full flex items-center justify-between px-2 py-1.5 rounded-md',
          'text-[10px] font-bold uppercase tracking-wider cursor-pointer',
          'hover:bg-[var(--nop-nav-surface)] transition-colors duration-100',
          hasActive ? 'text-[var(--nop-accent)]' : 'text-[var(--nop-accent-muted)]',
        )}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        data-testid={`ai-nav-group-${phase}`}
      >
        <span>{label}</span>
        <span className="flex items-center gap-1 opacity-60">
          <span className="text-[9px] font-normal normal-case tracking-normal">
            {entries.length}
          </span>
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
                activeDemoId === entry.id
                  ? 'bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-medium'
                  : 'text-[var(--nop-body-copy)] hover:bg-[var(--nop-nav-surface)] hover:text-[var(--nop-text-strong)]',
              )}
              onClick={() => onSelectDemo(entry.id)}
              aria-current={activeDemoId === entry.id ? 'true' : undefined}
              data-testid={`ai-nav-${entry.id}`}
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
      <p className="text-2xl font-bold text-[var(--nop-text-strong)]">AI Scenarios</p>
      <p className="text-sm leading-relaxed text-[var(--nop-body-copy)] max-w-sm">
        Select an AI demo from the left panel to see its live scenario.
      </p>
      <p className="text-xs text-[var(--nop-body-copy)] opacity-60">
        {AI_GALLERY_ENTRIES.length} demos available
      </p>
    </div>
  );
}

export function AiGalleryPage({ activeDemoId, onSelectDemo, onBack }: AiGalleryPageProps) {
  const activeEntry = resolveActiveEntry(activeDemoId);
  const DemoComponent = activeDemoId ? AI_GALLERY_REGISTRY[activeDemoId] : null;
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleSelect = (id: string) => {
    onSelectDemo(id);
    setDrawerOpen(false);
  };

  const sidebarBody = (
    <>
      <div className="p-4 border-b border-[var(--nop-nav-border)] shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="mb-3 text-xs text-[var(--nop-accent)] hover:underline cursor-pointer bg-transparent border-none p-0"
          onClick={onBack}
          data-testid="ai-gallery-back"
        >
          ← Back to Home
        </Button>
        <p className="uppercase tracking-[0.14em] text-[10px] font-bold text-[var(--nop-accent-muted)]">
          AI Scenarios
        </p>
        <p className="text-xs text-[var(--nop-body-copy)] mt-0.5">
          {AI_GALLERY_ENTRIES.length} demos · {grouped.length} phases
        </p>
      </div>
      <nav className="flex-1 min-h-0 overflow-y-auto p-2" data-testid="ai-gallery-nav">
        {grouped.map(({ phase, meta, entries }) => (
          <NavGroup
            key={phase}
            phase={phase}
            label={meta.label}
            entries={entries}
            activeDemoId={activeDemoId}
            onSelectDemo={handleSelect}
          />
        ))}
      </nav>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden" data-testid="ai-gallery">
      {isMobile ? (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Open navigation"
            data-testid="ai-gallery-menu"
            className="absolute left-2 top-2 z-30"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <Drawer direction="left" open={drawerOpen} onOpenChange={setDrawerOpen}>
            <DrawerContent size="xs" data-testid="ai-gallery-sidebar-drawer">
              <div className="flex h-full flex-col">{sidebarBody}</div>
            </DrawerContent>
          </Drawer>
        </>
      ) : (
        <aside
          className="w-[260px] shrink-0 border-r border-[var(--nop-nav-border)] bg-[var(--nop-hero-bg)] flex flex-col h-screen"
          data-testid="ai-gallery-sidebar"
        >
          {sidebarBody}
        </aside>
      )}

      <main className="flex-1 min-h-0 overflow-hidden" data-testid="ai-gallery-main">
        {DemoComponent && activeEntry ? (
          <div className="h-full overflow-auto" data-testid={`ai-gallery-demo-${activeEntry.id}`}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full">
                  <Spinner />
                </div>
              }
            >
              <DemoComponent onBack={onBack} />
            </Suspense>
          </div>
        ) : (
          <EmptyState />
        )}
      </main>
    </div>
  );
}
