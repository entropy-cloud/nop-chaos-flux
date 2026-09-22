// plan 491 Phase 3: explicit interaction registry for the visual matrix
// runner. Each entry maps a route id to ordered interaction steps executed
// between screenshots (element/intermediate states). Steps are declared
// explicitly per page — no heuristic clicking.
//
// KEY DISCIPLINE: keys MUST be exact inventory page ids (pages.json) — the
// runner looks up INTERACTIONS[route.id] and silently skips unknown keys
// (plan 491 closure audit M1).
//
// R2-1a expansion (plan 492 Phase 1): overlay-bearing complex pages register
// their primary dialog/drawer so the runner can reproduce the interaction
// state; pages whose walkthrough recorded no programmatically drivable
// overlay carry no entry (trim reason lives in their evidence cards).

export const INTERACTIONS = {
  home: [{ action: 'waitFor', ms: 800 }],
  'flow-designer': [
    { action: 'waitFor', ms: 2000 },
    { action: 'clickText', text: 'JSON' },
    { action: 'waitFor', selector: '[data-slot="designer-json-panel"]' },
  ],
  // --- R2-1a complex pages (waitFor anchor + primary overlay where the
  // walkthrough wave reports confirmed a programmatically drivable one) ---
  'antdpro-list': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'antdpro-detail-basic': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
  ],
  'antdpro-form-dialog': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
    { action: 'clickText', text: '新建订单' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'standard-crud': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
    { action: 'clickText', text: '新增' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'master-detail': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
  ],
  'approval-tasks': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
  ],
  'form-wizard': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'complex-form': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'notion-database': [
    { action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 },
  ],
  'airtable-grid': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'stripe-payments': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'linear-issues': [{ action: 'waitFor', ms: 1500 }],
  'linear-board': [{ action: 'waitFor', selector: '[data-testid="complex-page-title"]', ms: 15000 }],
  'sundial-workbench': [{ action: 'waitFor', ms: 1500 }],
};
