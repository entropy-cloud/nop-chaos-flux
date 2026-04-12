import { describe, expect, it } from 'vitest';
import {
  ALL_SHARED_RENDERER_ROUTES,
  BASIC_RENDERER_ROUTES,
  FORM_RENDERER_ROUTES,
  DATA_RENDERER_ROUTES,
  DOMAIN_RENDERER_ROUTES,
  parseRoute,
  buildRoute,
  type RouteSpec
} from './route-model';
import { RENDERER_LAB_REGISTRY } from './component-lab/renderer-lab-registry';
import { basicRendererDefinitions } from '@nop-chaos/flux-renderers-basic';
import { formRendererDefinitions } from '@nop-chaos/flux-renderers-form';
import { dataRendererDefinitions } from '@nop-chaos/flux-renderers-data';

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
    expect(parseRoute('#/lab/object-field')).toEqual({ kind: 'lab-renderer', rendererId: 'object-field' });
  });

  it('parses #/flow-designer as domain route', () => {
    expect(parseRoute('#/flow-designer')).toEqual({ kind: 'domain', domainId: 'flow-designer' });
  });

  it('parses #/report-designer as domain route', () => {
    expect(parseRoute('#/report-designer')).toEqual({ kind: 'domain', domainId: 'report-designer' });
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
    expect(buildRoute({ kind: 'lab-renderer', rendererId: 'array-field' })).toBe('#/lab/array-field');
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
    { kind: 'domain', domainId: 'debugger-lab' }
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
      expect(routeIds.has(def.type), `basic renderer '${def.type}' missing from route inventory`).toBe(true);
    }
  });

  it('form renderer routes cover all registered form renderer types', () => {
    const routeIds = new Set(FORM_RENDERER_ROUTES.map((r) => r.id));
    for (const def of formRendererDefinitions) {
      expect(routeIds.has(def.type), `form renderer '${def.type}' missing from route inventory`).toBe(true);
    }
  });

  it('data renderer routes cover all registered data renderer types', () => {
    const routeIds = new Set(DATA_RENDERER_ROUTES.map((r) => r.id));
    for (const def of dataRendererDefinitions) {
      expect(routeIds.has(def.type), `data renderer '${def.type}' missing from route inventory`).toBe(true);
    }
  });

  it('inventory includes all composite form renderers', () => {
    const compositeIds = ['object-field', 'array-field', 'variant-field', 'detail-field', 'detail-view'];
    const routeIds = new Set(FORM_RENDERER_ROUTES.map((r) => r.id));
    for (const id of compositeIds) {
      expect(routeIds.has(id), `composite form renderer '${id}' missing from route inventory`).toBe(true);
    }
  });

  it('total shared renderer count matches live registry sizes', () => {
    const liveTotal = basicRendererDefinitions.length + formRendererDefinitions.length + dataRendererDefinitions.length;
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
      expect(routeIds.has(id), `lab registry entry '${id}' has no matching route inventory entry`).toBe(true);
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
    for (const pageId of ['flow-designer', 'report-designer', 'debugger-lab', 'condition-builder', 'code-editor', 'word-editor']) {
      expect(domainIds.has(pageId), `domain page '${pageId}' missing from domain route inventory`).toBe(true);
    }
  });
});
