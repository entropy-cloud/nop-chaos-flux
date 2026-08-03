/**
 * Component Lab E2E Coverage Manifest
 *
 * Code-backed coverage manifest for ALL_SHARED_RENDERER_ROUTES.
 * Each entry declares:
 *   - tier: 'read' | 'write' | 'edit'
 *   - primaryScenario: the scenario title to assert against
 *   - notes: optional explanation of what makes it interactive
 *
 * Tiers:
 *   read  – verify initial value or structure is visible (display-only)
 *   write – perform direct interaction (type/select/toggle/add/remove)
 *   edit  – open secondary surface (dialog/drawer), change data, confirm, verify writeback
 */

export type AssertionTier = 'read' | 'write' | 'edit';

export interface RendererCoverageEntry {
  id: string;
  title: string;
  tier: AssertionTier;
  primaryScenario: string;
  notes?: string;
}

export const COMPONENT_LAB_COVERAGE_MANIFEST: RendererCoverageEntry[] = [
  // --- Layout ---
  {
    id: 'page',
    title: 'Page',
    tier: 'read',
    primaryScenario: 'Page with title, header, body, and footer',
    notes: 'Display-only; verifies header/footer/body regions render',
  },
  {
    id: 'container',
    title: 'Container',
    tier: 'read',
    primaryScenario: 'Container with header, body, and footer',
    notes: 'Display-only; verifies header/body/footer slots',
  },
  {
    id: 'fragment',
    title: 'Fragment',
    tier: 'read',
    primaryScenario: 'Scope injection — fragment data merges with parent',
    notes: 'Display-only; verifies scope injection text is visible',
  },
  {
    id: 'flex',
    title: 'Flex',
    tier: 'read',
    primaryScenario: 'Row with space-between justify',
    notes: 'Display-only; verifies flex children render',
  },
  {
    id: 'dialog',
    title: 'Dialog',
    tier: 'edit',
    primaryScenario: 'Dialog with form fields and writeback',
    notes: 'Open dialog, fill form, confirm, verify submittedName appears in parent scope',
  },
  {
    id: 'drawer',
    title: 'Drawer',
    tier: 'edit',
    primaryScenario: 'Right drawer with form and writeback',
    notes: 'Open drawer, fill textarea, save, verify savedNote appears in parent scope',
  },
  {
    id: 'tabs',
    title: 'Tabs',
    tier: 'write',
    primaryScenario: 'Horizontal tabs (top)',
    notes: 'Click Team tab, verify team member content becomes visible',
  },
  {
    id: 'loop',
    title: 'Loop',
    tier: 'read',
    primaryScenario: 'Loop over a user list',
    notes: 'Display-only; verifies all loop items are rendered',
  },
  {
    id: 'recurse',
    title: 'Recurse',
    tier: 'read',
    primaryScenario: 'Simple recursive label tree',
    notes: 'Display-only; verifies recursive tree nodes render',
  },
  // --- Content ---
  {
    id: 'text',
    title: 'Text',
    tier: 'read',
    primaryScenario: 'Literal and interpolated text',
    notes: 'Verifies both literal and scope-interpolated text renders correctly',
  },
  {
    id: 'icon',
    title: 'Icon',
    tier: 'read',
    primaryScenario: 'Inline with text labels',
    notes: 'Verifies icon renders alongside text',
  },
  {
    id: 'badge',
    title: 'Badge',
    tier: 'read',
    primaryScenario: 'All badge variants',
    notes: 'Verifies all variant badges render',
  },
  // --- Actions ---
  {
    id: 'button',
    title: 'Button',
    tier: 'write',
    primaryScenario: 'onClick with visible scope side-effect (counter)',
    notes: 'Click Increment button, verify click count increments in text renderer',
  },
  // --- Advanced ---
  {
    id: 'scope-debug',
    title: 'Scope Debug',
    tier: 'read',
    primaryScenario: 'Live root scope probe',
    notes: 'Verifies scope-debug renders the current scope JSON and updates alongside local writes',
  },
  {
    id: 'dynamic-renderer',
    title: 'Dynamic Renderer',
    tier: 'write',
    primaryScenario: 'Runtime schema switching via buttons',
    notes: 'Click Show Text button, verify dynamicSchema.type changes to "text"',
  },
  // --- Logic ---
  {
    id: 'reaction',
    title: 'Reaction',
    tier: 'write',
    primaryScenario: 'Counter with derived doubled value',
    notes: 'Click Increment, verify both counter and doubled values update',
  },
  // --- Form ---
  {
    id: 'form',
    title: 'Form',
    tier: 'write',
    primaryScenario: 'Form with visible submit success state',
    notes: 'Fill username + email, submit, verify success message with submitted username',
  },
  {
    id: 'input-text',
    title: 'Input Text',
    tier: 'write',
    primaryScenario: 'Basic required and optional fields',
    notes: 'Submit empty required field, verify validation error appears',
  },
  {
    id: 'input-email',
    title: 'Input Email',
    tier: 'write',
    primaryScenario: 'Pre-populated with invalid value — submit to see error',
    notes: 'Click Submit immediately, verify email format error is visible',
  },
  {
    id: 'input-number',
    title: 'Input Number',
    tier: 'write',
    primaryScenario: 'Required numeric fields and stepper behavior',
    notes: 'Submit empty required field to verify validation, then use the stepper field to confirm numeric interaction',
  },
  {
    id: 'input-password',
    title: 'Input Password',
    tier: 'write',
    primaryScenario: 'New password with confirm-password validator',
    notes: 'Enter mismatched passwords, submit, verify "Passwords must match" error',
  },
  {
    id: 'textarea',
    title: 'Textarea',
    tier: 'write',
    primaryScenario: 'Basic required textarea',
    notes: 'Submit empty, verify required validation error',
  },
  {
    id: 'select',
    title: 'Select',
    tier: 'write',
    primaryScenario: 'Single-value select with inline options',
    notes: 'Open select, choose an option, verify selected value is reflected',
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    tier: 'write',
    primaryScenario: 'Multiple checkboxes with in-form live summary',
    notes: 'Toggle email checkbox, verify live text changes from OFF to ON',
  },
  {
    id: 'switch',
    title: 'Switch',
    tier: 'write',
    primaryScenario: 'Switch with in-form live summary',
    notes: 'Toggle switch, verify "Feature is: ON" text updates',
  },
  {
    id: 'radio-group',
    title: 'Radio Group',
    tier: 'write',
    primaryScenario: 'Horizontal inline layout with in-form live summary',
    notes: 'Click High radio, verify "Selected priority: high" live text',
  },
  {
    id: 'checkbox-group',
    title: 'Checkbox Group',
    tier: 'write',
    primaryScenario: 'Checkbox group with min/max selection validation',
    notes: 'Check TypeScript, verify live selection text updates',
  },
  {
    id: 'fieldset',
    title: 'Fieldset',
    tier: 'read',
    primaryScenario: 'Basic field grouping',
    notes: 'Verifies grouped fields render under a shared fieldset title',
  },
  {
    id: 'input-tree',
    title: 'Input Tree',
    tier: 'write',
    primaryScenario: 'Radio mode — single department selection',
    notes: 'Click a tree node, verify "Selected:" live text shows the value',
  },
  {
    id: 'tree-select',
    title: 'Tree Select',
    tier: 'write',
    primaryScenario: 'Single-value tree select with search',
    notes: 'Open trigger, select a node, verify "Selected:" live text updates',
  },
  {
    id: 'tag-list',
    title: 'Tag List',
    tier: 'write',
    primaryScenario: 'Host form tag toggle + submit (bug 73 pattern)',
    notes:
      'Toggle a tag and submit; the echo publishes the committed tag array (controlled echo stability); readOnly freezes tag-list/array-editor/key-value/icon-picker in one host form (C3.4)',
  },
  {
    id: 'key-value',
    title: 'Key Value',
    tier: 'write',
    primaryScenario: 'Host form key-value row edit + submit (bug 73 pattern)',
    notes:
      'Edit a row inline, add a row, submit; the echo publishes the committed key-value array (row edits reach the store in a real browser, C3.4)',
  },
  {
    id: 'array-editor',
    title: 'Array Editor',
    tier: 'write',
    primaryScenario: 'Host form array-editor + key-value edit + submit (bug 73 pattern)',
    notes:
      'Edit seeded rows inline, add a row to each, submit; the echo publishes both committed shapes (bug 73 pattern, C3.4)',
  },
  {
    id: 'icon-picker',
    title: 'Icon Picker',
    tier: 'write',
    primaryScenario: 'Host form icon picker select + submit (bug 73 pattern)',
    notes:
      'Open the popover, search and select an icon, submit; the echo publishes the committed icon value (C3.4)',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    tier: 'write',
    primaryScenario: 'Host form build conditions + submit (bug 73 pattern)',
    notes:
      'Verify condition tree editing: edit rule values, add rules/groups, submit publishes the committed condition shape; disabled/readOnly freeze every affordance (C3.3 P1-1); custom value editors write back and freeze when disabled (C3.3 P1-2)',
  },
  {
    id: 'object-field',
    title: 'Object Field',
    tier: 'write',
    primaryScenario: 'Object + array fields nested submit (bug 73 pattern)',
    notes:
      'Verify composite nested editing: object sub-fields + array rows edited, submit publishes committed shapes with row-scope isolation',
  },
  {
    id: 'array-field',
    title: 'Array Field',
    tier: 'write',
    primaryScenario: 'Read-only object + array fields submit (unchanged values)',
    notes:
      'Verify array editing (add/remove/submit) and readOnly propagation to item fields (C3.2 P1-3 / CX-8)',
  },
  {
    id: 'variant-field',
    title: 'Variant Field',
    tier: 'write',
    primaryScenario: 'Variant switch writes value + submit echo (bug 73 pattern)',
    notes:
      'Verify branch switch writes the variant value (value ownership) and the active branch editor follows; submit echoes committed shape',
  },
  {
    id: 'detail-field',
    title: 'Detail Field',
    tier: 'edit',
    primaryScenario: 'Projected dialog edit submit (bug 73 pattern)',
    notes:
      'Verify projected draft stays decoupled from host form until confirm; confirm writes back and submit echoes committed shape',
  },
  {
    id: 'detail-view',
    title: 'Detail View',
    tier: 'edit',
    primaryScenario: 'Report summary — text display with edit dialog',
    notes: 'Click Edit/expand, change title, confirm, verify updated title in viewer',
  },
  // --- Data ---
  {
    id: 'crud',
    title: 'Crud',
    tier: 'edit',
    primaryScenario: 'Basic CRUD shell',
    notes:
      'Verifies the CRUD shell renders and the radio-selection scenario keeps exactly one selected row while enabling selection-aware actions',
  },
  {
    id: 'table',
    title: 'Table',
    tier: 'read',
    primaryScenario: 'Table with sortable text columns',
    notes: 'Verify user rows and sortable column headers are visible',
  },
  {
    id: 'tree',
    title: 'Tree',
    tier: 'read',
    primaryScenario: 'Expand/collapse org tree',
    notes: 'Verify hierarchical tree nodes render in the initially expanded state',
  },
  {
    id: 'list',
    title: 'List',
    tier: 'write',
    primaryScenario: 'Single selection + onItemClick',
    notes:
      'Verify item region renders N entries, empty state shows fallback, and selectionMode single/multiple toggle aria-selected highlight',
  },
  {
    id: 'data-source',
    title: 'Data Source',
    tier: 'read',
    primaryScenario: 'Pre-loaded data via page scope (sandbox equivalent)',
    notes: 'Verify "Users loaded via page data: 3" text is visible',
  },
  {
    id: 'chart',
    title: 'Chart',
    tier: 'read',
    primaryScenario: 'Bar chart with configured axes and series',
    notes: 'Verify chart container renders from source data with live xAxis/yAxis config',
  },
  {
    id: 'combo',
    title: 'Combo',
    tier: 'write',
    primaryScenario: 'Nested combo multi-row submit (bug 73 pattern)',
    notes:
      'Verify repeated composite-item editing: row edit + add + submit publishes isolated committed rows',
  },
  {
    id: 'input-table',
    title: 'Input Table',
    tier: 'write',
    primaryScenario: 'Table multi-row edit submit (bug 73 pattern)',
    notes: 'Verify tabular object-array editing: cell edit + add row + submit committed shape',
  },
  {
    id: 'transfer',
    title: 'Transfer',
    tier: 'write',
    primaryScenario: 'Controlled value echo + onSelectAll (external scope update)',
    notes: 'Verify two-pane shuttle: external scope echo + checkAll/clear + onSelectAll event',
  },
  {
    id: 'picker',
    title: 'Picker',
    tier: 'edit',
    primaryScenario: 'CRUD-mode picker per-row isolation (bug 73 pattern)',
    notes:
      'Verify dialog-layer selection: open dialog, select candidate, confirm writeback; CRUD-mode per-row state isolation',
  },
];

/** Quick lookup by renderer id */
export const COVERAGE_BY_ID = new Map<string, RendererCoverageEntry>(
  COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => [e.id, e]),
);

/** All renderer ids covered by this manifest */
export const COVERED_RENDERER_IDS = new Set(COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => e.id));
