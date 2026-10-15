import { describe, expect, it } from 'vitest';
import {
  ALL_SHARED_RENDERER_ROUTES,
  BASIC_RENDERER_ROUTES,
  FORM_RENDERER_ROUTES,
  DATA_RENDERER_ROUTES,
  LAYOUT_RENDERER_ROUTES,
  CONTENT_RENDERER_ROUTES,
  MOBILE_RENDERER_ROUTES,
  AI_RENDERER_ROUTES,
  SCHEDULING_RENDERER_ROUTES,
  DOMAIN_RENDERER_ROUTES,
  parseRoute,
  buildRoute,
  type RouteSpec,
} from './route-model';
import { RENDERER_LAB_REGISTRY } from './component-lab/renderer-lab-registry';
import { HOME_NAV_CARDS, HOME_NAV_SECTIONS, type HomeNavCard } from './home-cards';
import {
  DOMAIN_HOME_FAMILY,
  HOME_FAMILY_META,
  HOME_FAMILY_ORDER,
  isAggregateFamily,
} from './home-families';
import { AI_GALLERY_ENTRIES } from './ai-gallery/ai-gallery-model';
import { AI_GALLERY_REGISTRY } from './ai-gallery/ai-gallery-registry';
import { COMPLEX_PAGE_ENTRIES } from './complex-pages/complex-pages-model';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { formAdvancedRendererDefinitions } from '@nop-chaos/flux-renderers-form-advanced';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';
import { layoutRendererDefinitions } from '@nop-chaos/flux-renderers-layout';
import { contentRendererDefinitions } from '@nop-chaos/flux-renderers-content';

describe('Route model - parseRoute', () => {
  it('parses empty hash as home', () => {
    expect(parseRoute('')).toEqual({ kind: 'home' });
    expect(parseRoute('#/')).toEqual({ kind: 'home' });
    expect(parseRoute('#')).toEqual({ kind: 'home' });
  });

  it('parses #/lab as lab', () => {
    expect(parseRoute('#/lab')).toEqual({ kind: 'lab' });
  });

  it('parses #/lab/text as lab-renderer with rendererId=text', () => {
    expect(parseRoute('#/lab/text')).toEqual({ kind: 'lab-renderer', rendererId: 'text' });
  });

  it('parses #/lab/object-field as lab-renderer with rendererId=object-field', () => {
    expect(parseRoute('#/lab/object-field')).toEqual({
      kind: 'lab-renderer',
      rendererId: 'object-field',
    });
  });

  it('parses #/complex-pages as showcase', () => {
    expect(parseRoute('#/complex-pages')).toEqual({ kind: 'showcase' });
  });

  it('parses #/complex-pages/dashboard as showcase-page with pageId=dashboard', () => {
    expect(parseRoute('#/complex-pages/dashboard')).toEqual({
      kind: 'showcase-page',
      pageId: 'dashboard',
    });
  });

  it('parses #/flow-designer as domain route', () => {
    expect(parseRoute('#/flow-designer')).toEqual({ kind: 'domain', domainId: 'flow-designer' });
  });

  it('parses #/report-designer as domain route', () => {
    expect(parseRoute('#/report-designer')).toEqual({
      kind: 'domain',
      domainId: 'report-designer',
    });
  });

  it('parses unknown routes as home', () => {
    expect(parseRoute('#/unknown-route')).toEqual({ kind: 'home' });
    expect(parseRoute('#/xyz')).toEqual({ kind: 'home' });
  });
});

describe('Route model - buildRoute', () => {
  it('builds home route', () => {
    expect(buildRoute({ kind: 'home' })).toBe('#/');
  });

  it('builds lab route', () => {
    expect(buildRoute({ kind: 'lab' })).toBe('#/lab');
  });

  it('builds lab-renderer route', () => {
    expect(buildRoute({ kind: 'lab-renderer', rendererId: 'button' })).toBe('#/lab/button');
    expect(buildRoute({ kind: 'lab-renderer', rendererId: 'array-field' })).toBe(
      '#/lab/array-field',
    );
  });

  it('builds showcase routes', () => {
    expect(buildRoute({ kind: 'showcase' })).toBe('#/complex-pages');
    expect(buildRoute({ kind: 'showcase-page', pageId: 'dashboard' })).toBe(
      '#/complex-pages/dashboard',
    );
  });

  it('builds domain routes', () => {
    expect(buildRoute({ kind: 'domain', domainId: 'flow-designer' })).toBe('#/flow-designer');
    expect(buildRoute({ kind: 'domain', domainId: 'debugger-lab' })).toBe('#/debugger-lab');
  });
});

describe('Route model - round-trip stability', () => {
  const specs: RouteSpec[] = [
    { kind: 'home' },
    { kind: 'lab' },
    { kind: 'lab-renderer', rendererId: 'button' },
    { kind: 'lab-renderer', rendererId: 'condition-builder' },
    { kind: 'domain', domainId: 'flow-designer' },
    { kind: 'domain', domainId: 'report-designer' },
    { kind: 'domain', domainId: 'debugger-lab' },
    { kind: 'domain', domainId: 'performance-table' },
    { kind: 'showcase' },
    { kind: 'showcase-page', pageId: 'dashboard' },
    { kind: 'showcase-page', pageId: 'master-detail' },
  ];

  for (const spec of specs) {
    it(`round-trips ${JSON.stringify(spec)}`, () => {
      const hash = buildRoute(spec);
      const reparsed = parseRoute(hash);
      expect(reparsed).toEqual(spec);
    });
  }
});

describe('Route inventory - live renderer coverage', () => {
  it('basic renderer routes cover all registered basic renderer types', () => {
    const routeIds = new Set(BASIC_RENDERER_ROUTES.map((r) => r.id));
    for (const def of basicRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `basic renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
  });

  it('form renderer routes cover all registered form renderer types', () => {
    const routeIds = new Set(FORM_RENDERER_ROUTES.map((r) => r.id));
    for (const def of formRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `form renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
    for (const def of formAdvancedRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `form-advanced renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
  });

  it('data renderer routes cover all registered data renderer types', () => {
    const routeIds = new Set(DATA_RENDERER_ROUTES.map((r) => r.id));
    for (const def of dataRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `data renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
  });

  it('layout renderer routes cover all registered layout renderer types (def-enumeration)', () => {
    const routeIds = new Set(LAYOUT_RENDERER_ROUTES.map((r) => r.id));
    for (const def of layoutRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `layout renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
  });

  it('content renderer routes cover all registered content renderer types (def-enumeration)', () => {
    const routeIds = new Set(CONTENT_RENDERER_ROUTES.map((r) => r.id));
    for (const def of contentRendererDefinitions) {
      expect(
        routeIds.has(def.type),
        `content renderer '${def.type}' missing from route inventory`,
      ).toBe(true);
    }
  });

  it('inventory includes all composite form renderers', () => {
    const compositeIds = [
      'object-field',
      'array-field',
      'variant-field',
      'detail-field',
      'detail-view',
    ];
    const routeIds = new Set(FORM_RENDERER_ROUTES.map((r) => r.id));
    for (const id of compositeIds) {
      expect(routeIds.has(id), `composite form renderer '${id}' missing from route inventory`).toBe(
        true,
      );
    }
  });

  it('total shared renderer count matches live registry sizes', () => {
    // 约定型示例路由（无对应 renderer definition，如 dashboard-filter 编排约定）
    // 计入 ALL_SHARED_RENDERER_ROUTES 但不计入 renderer definitions。
    const conventionOnlyRouteIds = new Set(['dashboard-filter']);
    const liveTotal =
      basicRendererDefinitions.length +
      formRendererDefinitions.length +
      formAdvancedRendererDefinitions.length +
      dataRendererDefinitions.length +
      LAYOUT_RENDERER_ROUTES.length +
      CONTENT_RENDERER_ROUTES.length +
      MOBILE_RENDERER_ROUTES.length +
      AI_RENDERER_ROUTES.length +
      SCHEDULING_RENDERER_ROUTES.length +
      conventionOnlyRouteIds.size;
    expect(ALL_SHARED_RENDERER_ROUTES.length).toBe(liveTotal);
  });
});

describe('Renderer lab registry - coverage matrix', () => {
  it('every shared renderer route has a lab page component', () => {
    for (const route of ALL_SHARED_RENDERER_ROUTES) {
      const component = RENDERER_LAB_REGISTRY[route.id];
      expect(component, `lab page missing for renderer '${route.id}'`).toBeDefined();
      expect(typeof component, `lab page for '${route.id}' must be a function`).toBe('function');
    }
  });

  it('lab registry has no orphaned entries missing from route inventory', () => {
    const routeIds = new Set(ALL_SHARED_RENDERER_ROUTES.map((r) => r.id));
    for (const id of Object.keys(RENDERER_LAB_REGISTRY)) {
      expect(
        routeIds.has(id),
        `lab registry entry '${id}' has no matching route inventory entry`,
      ).toBe(true);
    }
  });
});

describe('Domain route inventory', () => {
  it('all domain page ids are parseable as domain routes', () => {
    for (const domain of DOMAIN_RENDERER_ROUTES) {
      const hash = buildRoute({ kind: 'domain', domainId: domain.id });
      const parsed = parseRoute(hash);
      expect(parsed).toEqual({ kind: 'domain', domainId: domain.id });
    }
  });

  it('domain inventory includes all existing specialized topic pages', () => {
    const domainIds = new Set(DOMAIN_RENDERER_ROUTES.map((r) => r.id));
    for (const pageId of [
      'flow-designer',
      'report-designer',
      'spreadsheet',
      'debugger-lab',
      'condition-builder',
      'code-editor',
      'word-editor',
      'performance-table',
    ]) {
      expect(
        domainIds.has(pageId),
        `domain page '${pageId}' missing from domain route inventory`,
      ).toBe(true);
    }
  });
});

describe('Home entry registry - drift guards (missing-components L0.2)', () => {
  const domainCards = HOME_NAV_CARDS.filter(
    (card): card is HomeNavCard & { target: { kind: 'domain'; domainId: string } } =>
      card.target.kind === 'domain',
  );
  const domainCardIds = new Set(domainCards.map((card) => card.id));

  it('invariant 1: every domain entry has a home card, unless hidden or aggregate-collapsed', () => {
    for (const entry of DOMAIN_RENDERER_ROUTES) {
      const family = DOMAIN_HOME_FAMILY[entry.id];
      const collapsed = family ? isAggregateFamily(family) : false;
      if (entry.homeVisible === false || collapsed) {
        expect(
          domainCardIds.has(entry.id),
          `domain entry '${entry.id}' must not have its own home card ` +
            `(homeVisible:false or aggregate family)`,
        ).toBe(false);
      } else {
        expect(
          domainCardIds.has(entry.id),
          `domain entry '${entry.id}' missing from home cards — derive cards from the registry, never hand-maintain`,
        ).toBe(true);
      }
    }
  });

  it('invariant 1b: home domain cards never invent ids outside the domain registry', () => {
    const registryIds = new Set(DOMAIN_RENDERER_ROUTES.map((r) => r.id));
    for (const card of domainCards) {
      expect(
        registryIds.has(card.id),
        `home card '${card.id}' has no matching domain registry entry`,
      ).toBe(true);
    }
  });

  it('invariant 1c: aggregate card ids never collide with domain registry ids', () => {
    const registryIds = new Set(DOMAIN_RENDERER_ROUTES.map((r) => r.id));
    const aggregateIds = HOME_NAV_CARDS.filter((c) => c.target.kind !== 'domain').map((c) => c.id);
    for (const id of aggregateIds) {
      expect(
        registryIds.has(id),
        `aggregate card id '${id}' collides with a domain registry id (duplicate keys/selectors)`,
      ).toBe(false);
    }
  });

  it('invariant 2: aggregate lab card exists and lab ids stay covered by the lab registry', () => {
    const labCard = HOME_NAV_CARDS.find((card) => card.id === 'component-lab');
    expect(labCard, 'component-lab aggregate card missing from home cards').toBeDefined();
    expect(labCard?.target).toEqual({ kind: 'lab' });
    // 既有关键守卫保持：lab 路由清单 ↔ RENDERER_LAB_REGISTRY 双向覆盖见上方 describe 块。
    expect(ALL_SHARED_RENDERER_ROUTES.length).toBeGreaterThan(0);
  });

  it('invariant 3: aggregate showcase card exists and matches the complex-pages registry scale', () => {
    const showcaseCard = HOME_NAV_CARDS.find((card) => card.id === 'complex-pages');
    expect(showcaseCard, 'complex-pages aggregate card missing from home cards').toBeDefined();
    expect(showcaseCard?.target).toEqual({ kind: 'showcase' });
    // 条目级双向覆盖由 complex-pages.test.tsx 守卫；此处钉住合并卡规模一致。
    expect(showcaseCard?.eyebrow).toContain(`(${COMPLEX_PAGE_ENTRIES.length})`);
    expect(COMPLEX_PAGE_ENTRIES.length).toBeGreaterThan(0);
  });

  it('invariant 4: every home domain card round-trips through the route model', () => {
    for (const card of domainCards) {
      const hash = buildRoute({ kind: 'domain', domainId: card.target.domainId });
      expect(parseRoute(hash)).toEqual({ kind: 'domain', domainId: card.target.domainId });
    }
  });
});

describe('Home family IA (home reorganization)', () => {
  it('every home-visible domain entry is assigned a family', () => {
    for (const entry of DOMAIN_RENDERER_ROUTES) {
      if (entry.homeVisible === false) continue;
      expect(
        DOMAIN_HOME_FAMILY[entry.id],
        `home-visible entry '${entry.id}' has no family assignment`,
      ).toBeDefined();
    }
  });

  it('the family map never invents ids outside the home-visible domain registry', () => {
    const visibleIds = new Set(
      DOMAIN_RENDERER_ROUTES.filter((entry) => entry.homeVisible !== false).map((entry) => entry.id),
    );
    for (const id of Object.keys(DOMAIN_HOME_FAMILY)) {
      expect(visibleIds.has(id), `family map entry '${id}' has no home-visible domain entry`).toBe(
        true,
      );
    }
  });

  it('declared families are all real, ordered, and non-empty', () => {
    const used = new Set(Object.values(DOMAIN_HOME_FAMILY));
    for (const family of used) {
      expect(HOME_FAMILY_META[family], `family '${family}' missing from HOME_FAMILY_META`).toBeDefined();
      expect(HOME_FAMILY_ORDER, `family '${family}' missing from HOME_FAMILY_ORDER`).toContain(family);
    }
    for (const family of HOME_FAMILY_ORDER) {
      expect(used.has(family), `declared family '${family}' has no entries`).toBe(true);
    }
  });

  it('home sections render every card exactly once and cover all families + the galleries section', () => {
    const flattened = HOME_NAV_SECTIONS.flatMap((section) => section.cards);
    const flattenedIds = flattened.map((card) => card.id);
    expect(flattenedIds.sort()).toEqual(HOME_NAV_CARDS.map((card) => card.id).sort());
    expect(new Set(flattenedIds).size).toBe(flattenedIds.length);
    const sectionIds = HOME_NAV_SECTIONS.map((section) => section.id);
    expect(sectionIds).toContain('galleries');
    for (const family of HOME_FAMILY_ORDER) {
      expect(sectionIds, `section '${family}' missing from home sections`).toContain(family);
    }
  });

  it('aggregate families expose exactly one aggregate card with a non-domain target', () => {
    for (const family of HOME_FAMILY_ORDER) {
      if (!isAggregateFamily(family)) continue;
      const section = HOME_NAV_SECTIONS.find((candidate) => candidate.id === family);
      expect(section, `aggregate section '${family}' missing`).toBeDefined();
      expect(section!.cards).toHaveLength(1);
      expect(section!.cards[0].target.kind).not.toBe('domain');
    }
  });
});

describe('AI gallery inventory', () => {
  const aiFamilyIds = Object.entries(DOMAIN_HOME_FAMILY)
    .filter(([, family]) => family === 'ai')
    .map(([id]) => id)
    .sort();

  it('gallery entries match the ai family exactly', () => {
    expect(AI_GALLERY_ENTRIES.map((entry) => entry.id).sort()).toEqual(aiFamilyIds);
  });

  it('every gallery entry has a registered demo component and vice versa', () => {
    const entryIds = new Set(AI_GALLERY_ENTRIES.map((entry) => entry.id));
    for (const id of entryIds) {
      expect(AI_GALLERY_REGISTRY[id], `gallery demo missing for '${id}'`).toBeDefined();
    }
    for (const id of Object.keys(AI_GALLERY_REGISTRY)) {
      expect(entryIds.has(id), `registry entry '${id}' has no gallery entry`).toBe(true);
    }
  });

  it('gallery routes parse/build round-trip (index + every demo)', () => {
    expect(parseRoute('#/ai')).toEqual({ kind: 'ai-gallery' });
    expect(buildRoute({ kind: 'ai-gallery' })).toBe('#/ai');
    for (const entry of AI_GALLERY_ENTRIES) {
      const hash = buildRoute({ kind: 'ai-gallery-demo', demoId: entry.id });
      expect(hash).toBe(`#/ai/${entry.id}`);
      expect(parseRoute(hash)).toEqual({ kind: 'ai-gallery-demo', demoId: entry.id });
    }
  });
});
