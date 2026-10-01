// @vitest-environment happy-dom

import { describe, expect, it } from 'vitest';
import { DOMAIN_ROUTE_PAGES } from './domain-route-pages.js';
import { DOMAIN_RENDERER_ROUTES } from './domain-route-entries.js';

// cq-6 Phase 3 reconciliation: metadata table vs page-wiring table must stay
// aligned, minus the deliberate not-found fixture (`dingtalk-flow-demo` has
// metadata but intentionally no page — app-route-resilience navigates to it
// and expects the domain-not-found screen).
const METADATA_WITHOUT_PAGE = new Set(['dingtalk-flow-demo']);

describe('domain route table completeness (cq-6 Phase 3)', () => {
  it('reconciles the page table with the metadata entries bidirectionally', () => {
    const pageIds = new Set(Object.keys(DOMAIN_ROUTE_PAGES));
    for (const entry of DOMAIN_RENDERER_ROUTES) {
      if (METADATA_WITHOUT_PAGE.has(entry.id)) {
        expect(pageIds.has(entry.id)).toBe(false);
        continue;
      }
      expect(pageIds.has(entry.id)).toBe(true);
    }
    for (const pageId of pageIds) {
      const entry = DOMAIN_RENDERER_ROUTES.find((candidate) => candidate.id === pageId);
      expect(entry).toBeDefined();
    }
  });

  it('registers a renderer function for every page id', () => {
    for (const [pageId, render] of Object.entries(DOMAIN_ROUTE_PAGES)) {
      expect(typeof render, `page ${pageId} must map to a render function`).toBe('function');
    }
  });
});
