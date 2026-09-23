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
  // --- R2-2a control batches (plan 496 Phase 1: wave-reported keys merged
  // serially by the main session; keys are lab-<type> carrier page ids) ---
  'lab-dialog': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: 'Open Dialog' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'lab-drawer': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: 'Open Right Drawer' },
    { action: 'waitFor', selector: '[data-slot="drawer-surface"]' },
  ],
  'lab-command-palette': [
    { action: 'waitFor', ms: 500 },
    { action: 'waitFor', selector: '[data-slot="command"]', ms: 3000 },
  ],
  'lab-recurse': [{ action: 'waitFor', ms: 800 }],
  'lab-scope-debug': [{ action: 'waitFor', ms: 800 }],
  'lab-tabs': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: 'Team' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-text': [{ action: 'waitFor', ms: 800 }],
  'lab-loop': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: 'Edit' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  // --- R2-2a wave3 (form 前半) wave-merged keys ---
  'lab-button-group-select': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Main' },
    { action: 'waitFor', selector: '[data-slot="button-group-select-item"][aria-pressed="true"]' },
  ],
  'lab-checkbox': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Continue' },
    { action: 'waitFor', selector: '[data-slot="field-error"]' },
  ],
  'lab-checkbox-group': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'TypeScript' },
    { action: 'waitFor', ms: 200 },
    { action: 'clickText', text: 'Submit' },
  ],
  'lab-date-range': [
    { action: 'waitFor', ms: 600 },
    { action: 'click', selector: '[data-testid="range-trigger"]' },
    { action: 'waitFor', selector: '[data-testid="range-popover"]' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-fieldset': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Advanced Settings' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-form': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Submit' },
    { action: 'waitFor', selector: '[data-slot="field-error"]' },
  ],
  'lab-hidden': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Submit' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-input-date': [
    { action: 'waitFor', ms: 600 },
    { action: 'click', selector: '[data-testid="date-trigger"]' },
    { action: 'waitFor', selector: '[data-testid="date-popover"]' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-input-datetime': [
    { action: 'waitFor', ms: 600 },
    { action: 'click', selector: '[data-testid="date-trigger"]' },
    { action: 'waitFor', selector: '[data-testid="date-popover"]' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-input-email': [
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: 'Submit to see validation error' },
    { action: 'waitFor', selector: '[data-slot="field-error"]' },
  ],
  'lab-input-month': [
    { action: 'waitFor', ms: 600 },
    { action: 'click', selector: '[data-testid="period-input-month"]' },
    { action: 'waitFor', ms: 400 },
  ],
  // --- R2-2a wave4 (form 后半) wave-merged keys ---
  'lab-input-number': [
    {
      action: 'click',
      selector: '[data-testid="scenario-required-numeric-fields-and-stepper-behavior"] [data-slot="stepper-increase"]',
    },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-input-password': [
    {
      action: 'click',
      selector: '[data-testid="scenario-reveal-password-toggle"] [data-slot="input-password-reveal"]',
    },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-markdown-editor': [
    { action: 'click', selector: '[data-testid="scenario-split-edit-preview"] [data-testid="md-toolbar-bold"]' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-radio-group': [
    { action: 'clickText', text: 'Enterprise' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-select': [
    {
      action: 'click',
      selector: '[data-testid="scenario-single-value-select-with-inline-options"] [data-slot="combobox-trigger"]',
    },
    { action: 'waitFor', selector: '[data-slot="combobox-content"]' },
    { action: 'clickText', text: 'Canada' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-switch': [
    { action: 'click', selector: '[data-testid="scenario-switch-with-in-form-live-summary"] [role="switch"]' },
    { action: 'waitFor', ms: 300 },
  ],
  // --- R2-2a wave5 (form-advanced 前半) wave-merged keys ---
  'lab-condition-builder': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '添加条件' },
    { action: 'waitFor', selector: '[data-slot="condition-item"]' },
    { action: 'click', selector: '[aria-label="条件字段"]' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-array-editor': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '添加项' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-array-field': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '添加项' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-combo': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '添加项' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-detail-field': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '编辑User Profile' },
    { action: 'waitFor', selector: '[data-slot="dialog-content"]' },
  ],
  'lab-detail-view': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '编辑Report Summary' },
    { action: 'waitFor', selector: '[data-slot="dialog-content"]' },
  ],
  'lab-editor': [
    { action: 'waitFor', ms: 800 },
    { action: 'clickText', text: '加粗' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-icon-picker': [
    { action: 'waitFor', ms: 800 },
    { action: 'click', selector: '[data-slot="icon-picker-trigger"]' },
    { action: 'waitFor', selector: '[data-slot="popover-content"]' },
  ],
  'lab-input-file': [{ action: 'waitFor', ms: 800 }],
  'lab-input-image': [{ action: 'waitFor', ms: 800 }],
  // --- R2-2a wave6 (form-advanced 后半) wave-merged keys ---
  'lab-input-table': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-sku-amount-table"] [data-slot="input-table-add"]',
    },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-picker': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-single-owner-pick"] [data-slot="picker-trigger"]',
    },
    { action: 'waitFor', selector: '[data-slot="picker-dialog-content"]' },
    { action: 'waitFor', ms: 500 },
    { action: 'click', selector: '[data-slot="picker-dialog-content"] [role="radio"]' },
    { action: 'waitFor', ms: 300 },
    { action: 'click', selector: '[data-slot="picker-confirm"]' },
  ],
  'lab-input-tree': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-radio-mode-single-department-selection"] [role="treeitem"]',
    },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-tree-select': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-single-value-tree-select-with-search"] [data-slot="tree-select-control"]',
    },
    { action: 'waitFor', selector: '[data-slot="tree-select-popover-options"]' },
    { action: 'waitFor', ms: 400 },
    { action: 'click', selector: '[data-slot="tree-select-popover-options"] [role="treeitem"]' },
  ],
  'lab-transfer': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-toggle-all-fires-onselectall"] [data-slot="transfer-toggle-all"]',
    },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-tag-list': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-pre-populated-technology-tags"] [data-slot="tag-list-control"] button',
    },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-key-value': [
    { action: 'clickText', text: '添加条目' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-object-field': [
    { action: 'click', selector: '[data-testid="scenario-stage-inline-address-editing"] input' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-variant-field': [
    {
      action: 'click',
      selector: '[data-testid="scenario-stage-variant-switch-writes-value-submit-echo-bug-73-pattern"] [data-slot="select-trigger"]',
    },
    { action: 'waitFor', ms: 400 },
  ],
};
