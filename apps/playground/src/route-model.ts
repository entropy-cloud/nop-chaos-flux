import { LAYOUT_RENDERER_ROUTES } from './layout-renderer-routes.js';
import { CONTENT_RENDERER_ROUTES } from './content-renderer-routes.js';
import { MOBILE_RENDERER_ROUTES } from './mobile-renderer-routes.js';
import { AI_RENDERER_ROUTES } from './ai-renderer-routes.js';
import { SCHEDULING_RENDERER_ROUTES } from './scheduling-renderer-routes.js';
import { FORM_RENDERER_ROUTES } from './form-route-entries.js';
import { BASIC_RENDERER_ROUTES } from './basic-route-entries.js';
import { DATA_RENDERER_ROUTES } from './data-route-entries.js';
import { DOMAIN_RENDERER_ROUTES } from './domain-route-entries.js';

export type RendererCategory =
  | 'layout'
  | 'content'
  | 'actions'
  | 'logic'
  | 'advanced'
  | 'form'
  | 'data'
  | 'scheduling'
  | 'domain';

export interface RendererRouteEntry {
  id: string;
  title: string;
  category: RendererCategory;
  sourcePackage: string;
  description: string;
}

export interface DomainRouteEntry {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
}

export const ALL_SHARED_RENDERER_ROUTES: RendererRouteEntry[] = [
  ...BASIC_RENDERER_ROUTES,
  ...FORM_RENDERER_ROUTES,
  ...DATA_RENDERER_ROUTES,
  ...LAYOUT_RENDERER_ROUTES,
  ...CONTENT_RENDERER_ROUTES,
  ...MOBILE_RENDERER_ROUTES,
  ...AI_RENDERER_ROUTES,
  ...SCHEDULING_RENDERER_ROUTES,
];

export { FORM_RENDERER_ROUTES };
export { BASIC_RENDERER_ROUTES };
export { DATA_RENDERER_ROUTES };
export { DOMAIN_RENDERER_ROUTES };
export { LAYOUT_RENDERER_ROUTES };
export { CONTENT_RENDERER_ROUTES };
export { MOBILE_RENDERER_ROUTES };
export { AI_RENDERER_ROUTES };
export { SCHEDULING_RENDERER_ROUTES };

export type RouteSpec =
  | { kind: 'home' }
  | { kind: 'lab' }
  | { kind: 'lab-renderer'; rendererId: string }
  | { kind: 'domain'; domainId: string }
  | { kind: 'showcase' }
  | { kind: 'showcase-page'; pageId: string };

export function readDiagnosticsEnabled(search: string): boolean {
  const normalized = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(normalized).get('diagnostics') === '1';
}

export function parseRoute(hash: string): RouteSpec {
  const path = hash.startsWith('#') ? hash.slice(1) : hash;
  const segments = path.split('/').filter(Boolean);

  if (segments.length === 0) {
    return { kind: 'home' };
  }

  if (segments[0] === 'lab') {
    if (segments.length >= 2) {
      return { kind: 'lab-renderer', rendererId: segments[1] };
    }
    return { kind: 'lab' };
  }

  if (segments[0] === 'complex-pages') {
    if (segments.length >= 2) {
      return { kind: 'showcase-page', pageId: segments[1] };
    }
    return { kind: 'showcase' };
  }

  const domainIds = DOMAIN_RENDERER_ROUTES.map((r) => r.id);
  if (segments[0] && domainIds.includes(segments[0])) {
    return { kind: 'domain', domainId: segments[0] };
  }

  return { kind: 'home' };
}

export function buildRoute(spec: RouteSpec): string {
  switch (spec.kind) {
    case 'home':
      return '#/';
    case 'lab':
      return '#/lab';
    case 'lab-renderer':
      return `#/lab/${spec.rendererId}`;
    case 'domain':
      return `#/${spec.domainId}`;
    case 'showcase':
      return '#/complex-pages';
    case 'showcase-page':
      return `#/complex-pages/${spec.pageId}`;
  }
}
