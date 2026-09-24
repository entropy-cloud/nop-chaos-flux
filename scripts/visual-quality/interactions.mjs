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
    { action: 'clickText', text: '节点/边摘要' },
    { action: 'waitFor', selector: '[data-testid="summary-node-task"]' },
    { action: 'clickText', text: 'Task Node' },
    { action: 'waitFor', selector: '.nop-designer-node-card--active' },
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
  // --- R2-2b wave1 (content 前半) wave-merged keys ---
  'lab-alert': [
    { action: 'click', selector: '[data-testid="alert-close"]' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-audio': [
    { action: 'clickText', text: 'Open media dialog' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'lab-card': [
    { action: 'clickText', text: 'Inner action' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-cards': [
    { action: 'clickText', text: 'Alpha' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-carousel': [
    { action: 'clickText', text: 'Next (handle)' },
    { action: 'waitFor', ms: 800 },
  ],
  'lab-diff-view': [
    { action: 'clickText', text: 'Open diff dialog' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'lab-empty': [
    { action: 'click', selector: '[data-testid="c6c2-empty-cta"]' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-html': [
    { action: 'clickText', text: 'Set malicious content' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-image': [
    { action: 'clickText', text: 'Set valid src' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-json-view': [
    { action: 'click', selector: "[aria-label='expand JSON']" },
    { action: 'waitFor', ms: 300 },
  ],
  // --- R2-2b wave2 (content 后半) wave-merged keys ---
  'lab-markdown': [
    { action: 'clickText', text: 'Set malicious content' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-progress': [
    { action: 'clickText', text: 'Set 250' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-qrcode': [
    { action: 'clickText', text: 'Set value A' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-spinner': [
    { action: 'clickText', text: 'Hide spinner' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-status': [
    { action: 'clickText', text: 'Details' },
    { action: 'waitFor', selector: '[data-testid="c6c3-dialog-status"]' },
  ],
  'lab-video': [
    { action: 'clickText', text: 'Open media dialog' },
    { action: 'waitFor', selector: '[data-testid="c6c4-dialog-video-error"]' },
  ],
  // --- R2-2b wave3 (data 前半) wave-merged keys ---
  'lab-batch-bar': [
    { action: 'click', selector: '[data-testid^="scenario-crud-host"] [data-slot="table-select-cell"] [data-slot="checkbox"]' },
    { action: 'waitFor', selector: '[data-testid="lab-bar-crud"]' },
    { action: 'clickText', text: '取消选择' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-pagination': [
    { action: 'click', selector: '[data-testid="demo-pagination-simple"] [data-slot="pagination-link"][data-page="2"]' },
    { action: 'waitFor', ms: 300 },
    { action: 'setAttribute', selector: '[data-testid="demo-pagination-with-size"] select', value: '50' },
  ],
  'lab-data-source': [
    { action: 'clickText', text: 'Refresh users' },
    { action: 'waitFor', ms: 500 },
    { action: 'clickText', text: 'Retry load' },
    { action: 'waitFor', ms: 500 },
  ],
  'lab-list': [
    { action: 'click', selector: '[data-testid="demo-list-single"] [data-slot="list-item"]' },
    { action: 'waitFor', selector: '[role="dialog"]' },
    { action: 'press', key: 'Escape' },
    { action: 'click', selector: '[data-testid^="scenario-pagination-via"] button' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-chart': [
    { action: 'clickText', text: 'Update data' },
    { action: 'waitFor', ms: 500 },
    { action: 'clickText', text: 'Clear data' },
    { action: 'waitFor', ms: 500 },
  ],
  'lab-echarts': [
    { action: 'clickText', text: 'Load Apr-Jun batch' },
    { action: 'waitFor', ms: 800 },
  ],
  'lab-crud': [
    { action: 'click', selector: '[data-testid^="scenario-crud-quick-edit"] tbody button' },
    { action: 'waitFor', selector: '[role="dialog"]' },
    { action: 'press', key: 'Escape' },
    { action: 'click', selector: '[data-testid^="scenario-crud-selection-refresh"] [data-slot="table-select-cell"] [data-slot="checkbox"]' },
    { action: 'waitFor', ms: 400 },
    { action: 'click', selector: "[data-testid^='scenario-host-crud-paging'] [data-slot='pagination-link']:has-text('2')" },
    { action: 'waitFor', ms: 500 },
  ],
  // --- R2-2b wave4 (data 后半) wave-merged keys ---
  'lab-query-filter': [
    { action: 'clickText', text: '搜索' },
    { action: 'waitFor', ms: 500 },
    { action: 'clickText', text: '重置' },
    { action: 'waitFor', ms: 500 },
    { action: 'click', selector: '[data-testid="scenario-collapsible-filter"] [data-slot="query-filter-collapse"] button' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-table': [
    { action: 'click', selector: '[data-testid="scenario-table-with-sortable-text-columns"] thead th button' },
    { action: 'waitFor', ms: 500 },
    { action: 'click', selector: '[data-testid="scenario-header-search-and-filter-controls"] thead th button' },
    { action: 'waitFor', selector: '[data-slot="table-filter-option"]' },
    { action: 'click', selector: '[data-slot="table-filter-option"]' },
    { action: 'waitFor', ms: 500 },
    { action: 'clickText', text: '2' },
    { action: 'waitFor', ms: 500 },
  ],
  'lab-tree': [
    { action: 'click', selector: '[data-testid="scenario-expand-collapse-org-tree"] button[aria-expanded="true"]' },
    { action: 'waitFor', ms: 500 },
  ],
  // --- R2-2b wave5 (layout) wave-merged keys ---
  'lab-button-group': [
    { action: 'clickText', text: 'Tag 1' },
    { action: 'waitFor', ms: 250 },
    { action: 'clickText', text: 'Option 2' },
    { action: 'waitFor', ms: 250 },
  ],
  'lab-collapse': [
    { action: 'clickText', text: 'Panel A' },
    { action: 'waitFor', selector: '[data-slot="collapse-content"]' },
    { action: 'clickText', text: 'Single Y' },
    { action: 'waitFor', ms: 450 },
  ],
  'lab-dropdown-button': [
    { action: 'clickText', text: 'Actions' },
    { action: 'waitFor', selector: '[data-slot="dropdown-menu-content"]' },
    { action: 'press', key: 'Escape' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-steps': [
    { action: 'clickText', text: 'Two' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-wizard': [
    { action: 'clickText', text: '下一步' },
    { action: 'waitFor', ms: 400 },
    { action: 'clickText', text: '上一步' },
    { action: 'waitFor', ms: 400 },
    { action: 'clickText', text: 'Open wizard dialog' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  // --- R2-2b wave6 (mobile) wave-merged keys ---
  'lab-countdown': [{ action: 'waitFor', ms: 2500 }],
  'lab-infinite-scroll': [
    { action: 'clickText', text: 'Open mobile host dialog' },
    { action: 'waitFor', selector: '[data-testid="c7-dialog-is"]' },
    { action: 'waitFor', ms: 800 },
  ],
  'lab-notice-bar': [
    { action: 'click', selector: '[data-testid="c7-notice-close-close"]' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-pull-refresh': [
    { action: 'clickText', text: 'Open mobile host dialog' },
    { action: 'waitFor', selector: '[data-testid="c7-dialog-pr"]' },
  ],
  // --- R2-2c wave1 (ai 前半) wave-merged keys ---
  'lab-ai-attachments': [
    { action: 'click', selector: '[data-testid="c82-attach-open"]' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
  ],
  'lab-ai-bubble': [
    { action: 'click', selector: '[data-slot="ai-action-copy"]' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-ai-chat': [
    { action: 'click', selector: '[data-testid="c8-dialog-open"]' },
    { action: 'waitFor', selector: '[data-slot="dialog-surface"]' },
    { action: 'clickText', text: '批准' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-ai-citations': [
    { action: 'click', selector: "[data-slot='ai-citation-trigger'][data-citation-index='1']" },
    { action: 'waitFor', selector: '[data-slot="ai-citation-card"]' },
    { action: 'press', key: 'Escape' },
  ],
  'lab-ai-conversations': [
    { action: 'click', selector: "[data-slot='ai-conversations-item'][data-id='c2'] [data-slot='ai-conversations-item-button']" },
    { action: 'waitFor', ms: 300 },
    { action: 'click', selector: "[data-slot='ai-conversations-item'][data-id='c1'] [data-slot='ai-conversations-rename']" },
    { action: 'waitFor', selector: '[data-slot="ai-conversations-rename-input"]' },
    { action: 'clickText', text: '删除会话' },
  ],
  'lab-ai-feedback': [
    { action: 'click', selector: '[data-slot="ai-feedback-like"]' },
    { action: 'waitFor', ms: 200 },
    { action: 'click', selector: '[data-slot="ai-feedback-dislike"]' },
    { action: 'waitFor', ms: 200 },
    { action: 'click', selector: '[data-slot="ai-feedback-copy"]' },
    { action: 'waitFor', ms: 300 },
  ],
  'lab-ai-message-list': [
    { action: 'waitFor', ms: 400 },
    { action: 'click', selector: '[data-slot="ai-scroll-to-bottom"]' },
  ],
  // --- R2-2c wave2 (ai 后半) wave-merged keys ---
  'lab-ai-sender': [
    { action: 'click', selector: '[data-slot="ai-sender"] textarea' },
    { action: 'press', key: 'a' },
  ],
  'lab-ai-prompts': [
    { action: 'clickText', text: 'Open prompts dialog' },
    { action: 'waitFor', selector: '[data-slot="ai-prompts-item"]' },
    { action: 'clickText', text: 'Summarize' },
  ],
  'lab-ai-suggestions': [
    { action: 'clickText', text: '+2' },
    { action: 'waitFor', selector: '[data-slot="popover-content"]' },
    { action: 'clickText', text: 'Refine' },
  ],
  'lab-ai-token-usage': [{ action: 'click', selector: '[data-testid="c82-token"]' }],
  'lab-ai-tool-call': [
    { action: 'clickText', text: '批准' },
    { action: 'clickText', text: 'Open tool-call dialog' },
    { action: 'waitFor', selector: '[data-testid="c82-tool-in-dialog"]' },
    { action: 'clickText', text: 'Mark success' },
  ],
  'lab-ai-voice-input': [
    { action: 'click', selector: '[data-slot="ai-voice-input"]' },
    { action: 'waitFor', ms: 800 },
  ],
  'lab-ai-welcome': [{ action: 'clickText', text: 'Ask something' }],
  // --- R2-2c wave3 (scheduling) wave-merged keys ---
  'lab-barcode-input': [
    { action: 'waitFor', ms: 800 },
    { action: 'click', selector: '[data-testid="c9-barcode-submit"]' },
    { action: 'waitFor', selector: '[data-slot="barcode-validation-error"]' },
    { action: 'clickText', text: 'Submit' },
    { action: 'waitFor', ms: 400 },
  ],
  'lab-calendar': [
    { action: 'waitFor', ms: 800 },
    { action: 'click', selector: '[data-testid="c9-cal-open"]' },
    { action: 'waitFor', selector: '.nop-calendar' },
    { action: 'clickText', text: '周' },
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: '月' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-gantt': [
    { action: 'waitFor', ms: 800 },
    { action: 'click', selector: '[data-testid="c9-gantt-open"]' },
    { action: 'waitFor', selector: '.nop-gantt' },
    { action: 'clickText', text: '适应' },
    { action: 'waitFor', ms: 600 },
    { action: 'clickText', text: '今日' },
    { action: 'waitFor', ms: 600 },
  ],
  'lab-kanban': [
    { action: 'waitFor', ms: 800 },
    { action: 'click', selector: '[data-testid="c9-kanban-open"]' },
    { action: 'waitFor', selector: '.nop-kanban' },
    { action: 'clickText', text: 'Card Alpha' },
    { action: 'waitFor', ms: 400 },
    { action: 'press', key: 'Space' },
    { action: 'waitFor', ms: 300 },
    { action: 'press', key: 'ArrowRight' },
    { action: 'waitFor', ms: 200 },
    { action: 'press', key: 'Space' },
    { action: 'waitFor', ms: 600 },
  ],
  // --- R2-2c wave4 (可视化宿主 demo 载体) wave-merged keys ---
  'dashboard-demo': [
    { action: 'waitFor', selector: '[data-testid="bi-dashboard"]', ms: 800 },
    { action: 'click', selector: '[data-testid="editor-mode-toggle"]' },
    { action: 'waitFor', selector: '[data-slot="dashboard-panel"]' },
    { action: 'waitFor', ms: 600 },
  ],
  'graph-demo': [
    { action: 'waitFor', selector: '.nop-graph', ms: 2000 },
    { action: 'clickText', text: 'Focus Error Node' },
    { action: 'waitFor', ms: 800 },
  ],
  'map-demo': [
    { action: 'waitFor', selector: '.nop-map canvas', ms: 2000 },
    { action: 'click', selector: '.ol-zoom button' },
    { action: 'waitFor', ms: 600 },
  ],
  // --- R2-2c wave5 (设计器/编辑器宿主 demo 载体) wave-merged keys ---
  'scada-demo': [
    { action: 'waitFor', selector: '[data-slot="scada-canvas-canvas"]' },
    { action: 'clickText', text: '故障' },
    { action: 'waitFor', ms: 600 },
  ],
  'scada-editor-demo': [
    { action: 'waitFor', selector: '[data-slot="scada-editor-canvas"]' },
    { action: 'clickText', text: '撤销' },
  ],
  'spreadsheet': [
    { action: 'waitFor', selector: '.nop-spreadsheet-page' },
    { action: 'click', selector: "table td[data-row='0'][data-col='1']" },
    { action: 'press', key: 'b' },
    { action: 'waitFor', ms: 300 },
  ],
  'word-editor': [
    { action: 'waitFor', selector: '.nop-word-editor-page' },
    { action: 'clickText', text: '页眉' },
    { action: 'waitFor', ms: 400 },
  ],
};
