/**
 * Component Lab E2E Coverage Manifest Entries
 *
 * Data-only half of the coverage manifest. Kept in its own module so
 * coverage-manifest.ts stays under the workspace max-lines lint budget as
 * the component-lab route table grows. See coverage-manifest.ts for the
 * public API surface.
 *
 * Family entries are split by category into sibling modules
 * (coverage-manifest-entries-{form,data}.ts); this module keeps the smaller
 * structural families inline and aggregates everything into the single
 * COMPONENT_LAB_COVERAGE_MANIFEST export.
 */

import type { RendererCoverageEntry } from './coverage-manifest';
import { COMPONENT_LAB_COVERAGE_MANIFEST as FORM_COVERAGE_MANIFEST_ENTRIES } from './coverage-manifest-entries-form';
import { COMPONENT_LAB_COVERAGE_MANIFEST as DATA_COVERAGE_MANIFEST_ENTRIES } from './coverage-manifest-entries-data';

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
  ...FORM_COVERAGE_MANIFEST_ENTRIES,
  ...DATA_COVERAGE_MANIFEST_ENTRIES,
];
