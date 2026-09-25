import { ALL_SHARED_RENDERER_ROUTES, DOMAIN_RENDERER_ROUTES } from './route-model.js';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages/complex-pages-model.js';

export type HomeNavigationTarget =
  | { kind: 'lab' }
  | { kind: 'showcase' }
  | { kind: 'domain'; domainId: string };

export interface HomeNavCard {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  target: HomeNavigationTarget;
}

/**
 * Home cards are a pure derivation of the route registries — the single source
 * of truth is `DOMAIN_RENDERER_ROUTES` plus the two aggregate galleries. Add a
 * domain entry (or flip `homeVisible`) there; never hand-maintain card lists.
 */
export const HOME_NAV_CARDS: HomeNavCard[] = [
  {
    id: 'component-lab',
    title: 'Component Lab',
    eyebrow: `All Renderers (${ALL_SHARED_RENDERER_ROUTES.length})`,
    description:
      'Route-backed gallery for every live Flux renderer. Left-side navigation, focused scenarios, and per-renderer verification.',
    target: { kind: 'lab' },
  },
  {
    id: 'complex-pages',
    title: 'Complex Pages',
    eyebrow: `Real-World Scenarios (${COMPLEX_PAGE_ENTRIES.length})`,
    description:
      'Real-world business page gallery: standard CRUD, tree-driven table, inline edit, advanced query, master-detail with multiple sub-tables, multi-step wizard, multi-fieldset linked form, and dashboard. Left category menu, right per-page demo.',
    target: { kind: 'showcase' },
  },
  ...DOMAIN_RENDERER_ROUTES.filter((entry) => entry.homeVisible !== false).map((entry) => ({
    id: entry.id,
    title: entry.title,
    eyebrow: entry.eyebrow,
    description: entry.description,
    target: { kind: 'domain', domainId: entry.id } as HomeNavigationTarget,
  })),
];
