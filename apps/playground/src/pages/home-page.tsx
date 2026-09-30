import { HOME_NAV_CARDS, type HomeNavigationTarget } from '../home-cards.js';
import { Button } from '@nop-chaos/ui';

interface HomePageProps {
  onNavigate: (target: HomeNavigationTarget) => void;
}

export function HomePage({ onNavigate }: HomePageProps) {
  return (
    <main className="min-h-screen flex items-start justify-center p-6">
      <section className="max-w-[1180px] w-full text-center p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          NOP Chaos Flux
        </p>
        <h1 className="m-0 mb-2 text-[clamp(32px,5vw,56px)] leading-none">Playground</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)] mb-8">
          Select a testing scenario below. Each page isolates a specific area of the framework for
          focused development and debugging.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 mt-6 text-left">
          {HOME_NAV_CARDS.map((card) => (
            <Button
              key={card.id}
              type="button"
              variant="ghost"
              data-home-card={card.id}
              className="group relative flex h-auto w-full flex-col items-start overflow-hidden rounded-[20px] border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-6 text-left whitespace-normal cursor-pointer justify-start gap-0 ring-0 transition-[transform,box-shadow,border-color] duration-160 ease-[cubic-bezier(0.4,0,0.2,1)] hover:-translate-y-0.5 hover:shadow-[var(--nop-nav-shadow)] hover:border-[var(--nop-nav-hover-border)]"
              onClick={() => onNavigate(card.target)}
            >
              {/* Flow (phrasing) content only: <button> forbids h2/p children. */}
              <span className="mb-2 block uppercase tracking-[0.14em] text-[11px] font-bold text-[var(--nop-accent-muted)]">
                {card.eyebrow}
              </span>
              <span className="mb-2 block text-xl font-bold text-[var(--nop-text-strong)]">
                {card.title}
              </span>
              <span className="block text-sm leading-relaxed text-[var(--nop-body-copy)]">
                {card.description}
              </span>
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
