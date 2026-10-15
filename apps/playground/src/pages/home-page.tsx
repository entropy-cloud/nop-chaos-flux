import {
  HOME_NAV_SECTIONS,
  type HomeNavCard,
  type HomeNavigationTarget,
} from '../home-cards.js';
import { Button, cn } from '@nop-chaos/ui';

interface HomePageProps {
  onNavigate: (target: HomeNavigationTarget) => void;
}

function scrollToSection(id: string) {
  if (typeof document === 'undefined') return;
  document.getElementById(`home-section-${id}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function HomeCard({
  card,
  onNavigate,
  featured = false,
}: {
  card: HomeNavCard;
  onNavigate: (target: HomeNavigationTarget) => void;
  featured?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      data-home-card={card.id}
      onClick={() => onNavigate(card.target)}
      className={cn(
        'group relative flex h-full w-full flex-col items-start justify-start gap-0 overflow-hidden rounded-2xl border text-left whitespace-normal cursor-pointer ring-0',
        'border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)]',
        'transition-[transform,box-shadow,border-color] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]',
        'hover:-translate-y-0.5 hover:border-[var(--nop-nav-hover-border)] hover:shadow-[var(--nop-nav-shadow)]',
        featured ? 'min-h-[168px] p-6' : 'min-h-[132px] p-5',
      )}
    >
      <span className="mb-2.5 inline-flex max-w-full items-center truncate rounded-full border border-[var(--nop-nav-border)] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--nop-accent-muted)]">
        {card.eyebrow}
      </span>
      <span
        className={cn(
          'mb-1.5 block font-bold text-[var(--nop-text-strong)]',
          featured ? 'text-lg' : 'text-base',
        )}
      >
        {card.title}
      </span>
      <span className="block w-full text-[13px] leading-relaxed text-[var(--nop-body-copy)] line-clamp-3">
        {card.description}
      </span>
      <span className="pointer-events-none absolute right-5 top-5 text-lg text-[var(--nop-accent)] opacity-0 -translate-x-1 transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] group-hover:translate-x-0 group-hover:opacity-100">
        →
      </span>
    </Button>
  );
}

function SectionHeader({ label, description, count }: { label: string; description: string; count: number }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <span className="h-4 w-1 rounded-full bg-[var(--nop-accent)] opacity-70" aria-hidden />
      <h2 className="m-0 text-lg font-bold text-[var(--nop-text-strong)]">{label}</h2>
      <span className="rounded-full border border-[var(--nop-nav-border)] px-2 py-0.5 text-[11px] font-medium text-[var(--nop-body-copy)] opacity-80">
        {count}
      </span>
      <p className="m-0 w-full text-[13px] leading-relaxed text-[var(--nop-body-copy)] opacity-75">
        {description}
      </p>
    </div>
  );
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="min-h-screen px-6 py-10 flex justify-center">
      <div className="w-full max-w-[1200px]">
        <header className="mb-7 text-center">
          <p className="mb-2.5 uppercase tracking-[0.16em] text-xs font-semibold text-[var(--nop-eyebrow)]">
            NOP Chaos Flux
          </p>
          <h1 className="m-0 mb-2 text-[clamp(30px,4.4vw,48px)] font-bold leading-none text-[var(--nop-text-strong)]">
            Playground
          </h1>
          <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-[var(--nop-body-copy)]">
            Every scenario is one focused page. Pick a family below, or jump straight to what you
            need.
          </p>
        </header>

        <nav
          className="sticky top-0 z-20 -mx-2 mb-9 flex gap-2 overflow-x-auto border-b border-[var(--nop-nav-border)] bg-[var(--nop-hero-bg)] px-2 py-3 backdrop-blur"
          aria-label="Scenario families"
        >
          {HOME_NAV_SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              onClick={() => scrollToSection(section.id)}
              className="shrink-0 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] px-3 py-1 text-xs font-medium text-[var(--nop-body-copy)] cursor-pointer transition-colors duration-150 hover:border-[var(--nop-nav-hover-border)] hover:text-[var(--nop-text-strong)]"
            >
              {section.label}
            </button>
          ))}
        </nav>

        <div className="flex flex-col gap-11">
          {HOME_NAV_SECTIONS.map((section) => (
            <section
              key={section.id}
              id={`home-section-${section.id}`}
              data-home-section={section.id}
              className="scroll-mt-24 text-left"
            >
              <SectionHeader
                label={section.label}
                description={section.description}
                count={section.cards.length}
              />
              <div
                className={cn(
                  'grid gap-4',
                  section.id === 'galleries'
                    ? 'sm:grid-cols-2'
                    : 'grid-cols-[repeat(auto-fill,minmax(240px,1fr))]',
                )}
              >
                {section.cards.map((card) => (
                  <HomeCard
                    key={card.id}
                    card={card}
                    onNavigate={onNavigate}
                    featured={section.id === 'galleries'}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
