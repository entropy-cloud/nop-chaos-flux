import { ALL_SHARED_RENDERER_ROUTES, DOMAIN_RENDERER_ROUTES } from './route-model.js';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages/complex-pages-model.js';
import {
  DOMAIN_HOME_FAMILY,
  HOME_FAMILY_META,
  HOME_FAMILY_ORDER,
  isAggregateFamily,
  type HomeFamilyId,
} from './home-families.js';

export type HomeNavigationTarget =
  | { kind: 'lab' }
  | { kind: 'showcase' }
  | { kind: 'ai-gallery' }
  | { kind: 'domain'; domainId: string };

export interface HomeNavCard {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  target: HomeNavigationTarget;
}

export interface HomeNavSection {
  id: string;
  label: string;
  description: string;
  cards: HomeNavCard[];
}

/**
 * Home cards are a pure derivation of the route registries — the single source
 * of truth is `DOMAIN_RENDERER_ROUTES` plus the two aggregate galleries. The
 * scenario-family layer (`home-families.ts`) turns the flat derivation into
 * labelled sections; the `ai` family collapses into one aggregate card that
 * opens the AI gallery shell. Add a domain entry (or flip `homeVisible`) there;
 * never hand-maintain card lists.
 */
function buildSections(): HomeNavSection[] {
  const byFamily = new Map<HomeFamilyId, (typeof DOMAIN_RENDERER_ROUTES)[number][]>();

  for (const entry of DOMAIN_RENDERER_ROUTES) {
    if (entry.homeVisible === false) continue;
    const family = DOMAIN_HOME_FAMILY[entry.id];
    if (!family) continue;
    const list = byFamily.get(family);
    if (list) list.push(entry);
    else byFamily.set(family, [entry]);
  }

  const sections: HomeNavSection[] = [
    {
      id: 'galleries',
      label: 'Galleries',
      description: 'Aggregated verification surfaces that cover many scenarios at once.',
      cards: [
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
      ],
    },
  ];

  for (const family of HOME_FAMILY_ORDER) {
    const entries = byFamily.get(family);
    if (!entries || entries.length === 0) continue;
    const meta = HOME_FAMILY_META[family];

    if (isAggregateFamily(family)) {
      sections.push({
        id: family,
        label: meta.label,
        description: meta.description,
        cards: [
          {
            id: 'ai-gallery',
            title: 'AI Scenarios',
            eyebrow: `AI Renderers (${entries.length})`,
            description:
              'Bundled AI gallery: conversation core, agentic tools, widgets, multimodal input, and coverage — grouped by phase with an embedded preview area.',
            target: { kind: 'ai-gallery' },
          },
        ],
      });
      continue;
    }

    sections.push({
      id: family,
      label: meta.label,
      description: meta.description,
      cards: entries.map((entry) => ({
        id: entry.id,
        title: entry.title,
        eyebrow: entry.eyebrow,
        description: entry.description,
        target: { kind: 'domain', domainId: entry.id } as HomeNavigationTarget,
      })),
    });
  }

  return sections;
}

export const HOME_NAV_SECTIONS: HomeNavSection[] = buildSections();

/** Flattened view (kept for guard tests and consumers that only need the card set). */
export const HOME_NAV_CARDS: HomeNavCard[] = HOME_NAV_SECTIONS.flatMap((section) => section.cards);
