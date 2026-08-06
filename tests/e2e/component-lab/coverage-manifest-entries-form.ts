/**
 * Component Lab E2E Coverage Manifest Entries — Form family
 *
 * Form-section entries of the coverage manifest, split out of
 * coverage-manifest-entries.ts so each module stays under the workspace
 * max-lines budget. Aggregated by coverage-manifest-entries.ts (single entry
 * point unchanged); consumed via coverage-manifest.ts.
 */

import type { RendererCoverageEntry } from './coverage-manifest';

export const COMPONENT_LAB_COVERAGE_MANIFEST: RendererCoverageEntry[] = [
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
    primaryScenario: 'Host form remote lazy children + retry (bug 73 pattern)',
    notes:
      'Expand a deferChildren node, children load from the remote childrenSource; failure shows inline error + retry, retry succeeds; submit echoes the committed value (C3.5)',
  },
  {
    id: 'tree-select',
    title: 'Tree Select',
    tier: 'write',
    primaryScenario: 'Host form remote lazy children + retry (bug 73 pattern)',
    notes:
      'Same host scenario as input-tree (shared lazy-children mechanism); select a lazy node and submit (C3.5)',
  },
  {
    id: 'editor',
    title: 'Editor',
    tier: 'write',
    primaryScenario: 'Host form editor edit + submit (bug 73 pattern)',
    notes:
      'Type/format in the WYSIWYG editor, submit; the echo publishes the committed HTML; sanitize boundary keeps script payloads out (C3.5)',
  },
  {
    id: 'input-file',
    title: 'Input File',
    tier: 'write',
    primaryScenario: 'Host form upload success + failure (bug 73 pattern)',
    notes:
      'Upload a file through the mock env fetcher (success), then a failing one (error state, value stays clean), submit echoes the committed url (C3.5)',
  },
  {
    id: 'input-image',
    title: 'Input Image',
    tier: 'write',
    primaryScenario: 'Host form image upload success + failure (bug 73 pattern)',
    notes:
      'Image upload writes back the url, thumbnail preview renders; failure path shows error without polluting the value (C3.5)',
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
];
