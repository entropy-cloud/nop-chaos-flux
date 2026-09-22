// plan 491 Phase 3: explicit interaction registry for the visual matrix
// runner. Each entry maps a route id to ordered interaction steps executed
// between screenshots (element/intermediate states). Steps are declared
// explicitly per page — no heuristic clicking. Initial coverage: the
// R2-1a complex-pages batch's representative overlays; each walkthrough
// batch extends this registry in its own plan.
//
// Step shapes:
//   { action: 'click', selector }        — click the first match
//   { action: 'clickText', text }        — click by role button/link name
//   { action: 'waitFor', selector, ms? } — wait for visibility (or ms)
//   { action: 'press', key }             — keyboard (e.g. Escape to close)
//   { action: 'setAttribute', selector, attr, value } — theme/force states

export const INTERACTIONS = {
  home: [{ action: 'waitFor', ms: 800 }],
  'flow-designer': [
    { action: 'waitFor', ms: 2000 },
    { action: 'clickText', text: 'JSON' },
    { action: 'waitFor', selector: '[data-slot="designer-json-panel"]' },
  ],
  // R2-1a complex pages (keys MUST be exact inventory page ids — the runner
  // looks up INTERACTIONS[route.id]; plan 491 closure audit M1).
  'antdpro-list': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'antdpro-detail-basic': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'airtable-grid': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'linear-board': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'sundial-workbench': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'notion-database': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
};
