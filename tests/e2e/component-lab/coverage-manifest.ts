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
    primaryScenario: 'Tabs with icons and a disabled tab',
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
    primaryScenario: 'Single-value select with clearable and disabled option',
    notes: 'Open select, choose an option, verify selected value is reflected',
  },
  {
    id: 'checkbox',
    title: 'Checkbox',
    tier: 'write',
    primaryScenario: 'Multiple checkboxes with live scope display',
    notes: 'Toggle email checkbox, verify live text changes from OFF to ON',
  },
  {
    id: 'switch',
    title: 'Switch',
    tier: 'write',
    primaryScenario: 'Switch with state reflected in text renderer',
    notes: 'Toggle switch, verify "Feature is: ON" text updates',
  },
  {
    id: 'radio-group',
    title: 'Radio Group',
    tier: 'write',
    primaryScenario: 'Horizontal inline layout with live selection display',
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
    primaryScenario: 'Pre-populated technology tags',
    notes: 'Verify pre-populated tags are visible in live text',
  },
  {
    id: 'key-value',
    title: 'Key Value',
    tier: 'write',
    primaryScenario: 'HTTP header editing',
    notes: 'Verify pre-populated rows are visible; add a row and verify it appears',
  },
  {
    id: 'array-editor',
    title: 'Array Editor',
    tier: 'write',
    primaryScenario: 'Contact list with text columns',
    notes: 'Verify pre-populated rows are visible',
  },
  {
    id: 'condition-builder',
    title: 'Condition Builder',
    tier: 'write',
    primaryScenario: 'Simple single-rule AND group',
    notes: 'Verify initial rule is visible; change a value to verify mutation',
  },
  {
    id: 'object-field',
    title: 'Object Field',
    tier: 'write',
    primaryScenario: 'Inline address editing',
    notes: 'Verify pre-populated sub-fields are visible and editable',
  },
  {
    id: 'array-field',
    title: 'Array Field',
    tier: 'write',
    primaryScenario: 'Contact list with submit result display',
    notes: 'Add a contact row, fill name + email, submit, verify count changes',
  },
  {
    id: 'variant-field',
    title: 'Variant Field',
    tier: 'write',
    primaryScenario: 'Notification config — email, SMS, or webhook',
    notes: 'Switch type selector to SMS, verify phone field becomes visible',
  },
  {
    id: 'detail-field',
    title: 'Detail Field',
    tier: 'edit',
    primaryScenario: 'User profile editing via dialog',
    notes: 'Click Edit, change First Name, confirm, verify new name in viewer slot',
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
    id: 'table',
    title: 'Table',
    tier: 'read',
    primaryScenario: 'Table with badge column renderer and sortable columns',
    notes: 'Verify user rows and badge column are visible',
  },
  {
    id: 'tree',
    title: 'Tree',
    tier: 'write',
    primaryScenario: 'Selectable tree with selected IDs display',
    notes: 'Click a tree node checkbox, verify selectedIds live text updates',
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
    primaryScenario: 'Bar chart with axis labels and legend',
    notes: 'Verify chart container renders (SVG or canvas element is present)',
  },
];

/** Quick lookup by renderer id */
export const COVERAGE_BY_ID = new Map<string, RendererCoverageEntry>(
  COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => [e.id, e]),
);

/** All renderer ids covered by this manifest */
export const COVERED_RENDERER_IDS = new Set(COMPONENT_LAB_COVERAGE_MANIFEST.map((e) => e.id));
