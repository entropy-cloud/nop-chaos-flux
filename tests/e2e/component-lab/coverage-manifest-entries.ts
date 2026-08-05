/**
 * Component Lab E2E Coverage Manifest Entries
 *
 * Data-only half of the coverage manifest. Kept in its own module so
 * coverage-manifest.ts stays under the workspace max-lines lint budget as
 * the component-lab route table grows. See coverage-manifest.ts for the
 * public API surface.
 */

import type { RendererCoverageEntry } from './coverage-manifest';

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
    primaryScenario: 'Host table quick edit + save + echo (bug 73 pattern)',
    notes: 'Verify quick-edit writeback submits the EDITED value via quickSaveItemAction (bug 73 pattern); lazy children fail+retry and selection covered in c4-1-host-surfaces.spec.ts',
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
    id: 'pagination',
    title: 'Pagination',
    tier: 'read',
    primaryScenario: 'Host pagination drives a list data flow (C4.3 Phase 3)',
    notes: 'Verify standalone pagination page switching publishes statusPath and drives the controlled list slice',
  },
  {
    id: 'statistics',
    title: 'Statistics',
    tier: 'read',
    primaryScenario: 'Basic statistics',
    notes: 'Verify the numeric total summary renders with the nop-statistics marker and data-total attribute',
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
  {
    id: 'grid',
    title: 'Grid',
    tier: 'read',
    primaryScenario: 'Host nested grid with responsive columns (C5.1 Phase 3)',
    notes:
      'Verify explicit 2D grid layout: marker-only root, responsive column switching, nested grid cells',
  },
  {
    id: 'collapse',
    title: 'Collapse',
    tier: 'write',
    primaryScenario: 'Host collapse three-way ownership switching (C5.1 Phase 3)',
    notes:
      'Verify local/controlled/scope expand-state ownership: local toggle, controlled scope echo, scope valueStatePath writeback',
  },
  {
    id: 'wizard',
    title: 'Wizard',
    tier: 'write',
    primaryScenario: 'Host wizard step validation with embedded form (C5.1 Phase 3)',
    notes:
      'Verify layered interaction/lifecycle: embedded form validation blocks advancement, async gates, dialog-hosted wizard chain',
  },
  {
    id: 'button-group',
    title: 'Button Group',
    tier: 'write',
    primaryScenario: 'Host button-group selection + onChange payload (C5.2 Phase 3)',
    notes:
      'Verify single-selection toggle with mutual exclusion (data-selected) and the onChange payload {value, selectedKeys, selectionMode} reaching host scope (C5.2)',
  },
  {
    id: 'dropdown-button',
    title: 'Dropdown Button',
    tier: 'edit',
    primaryScenario: 'Host CRUD row dropdown-button menu (C5.2 bug 73 pattern)',
    notes:
      'Verify CRUD row menu openDialog edit submits the CURRENT row value — bug 73 pattern re-verifying the 08-02 row-scope isolation fix (C5.2)',
  },
  {
    id: 'steps',
    title: 'Steps',
    tier: 'write',
    primaryScenario: 'Host steps three-way ownership switching (C5.2 Phase 3)',
    notes:
      'Verify local/controlled/scope current-step ownership: local toggles, controlled scope echo without mutation, scope valueStatePath writeback (C5.2)',
  },
  {
    id: 'timeline',
    title: 'Timeline',
    tier: 'read',
    primaryScenario: 'Host timeline display modes (C5.2 Phase 3)',
    notes:
      'Verify display-only timeline: left/alternate modes, reverse order, horizontal orientation, marker-only roots, no owner state (C5.2)',
  },
  {
    id: 'markdown',
    title: 'Markdown',
    tier: 'read',
    primaryScenario: 'Basic markdown with GFM table',
    notes:
      'Verify react-markdown + GFM rendering; dynamic content sanitize re-verification and env.fetcher remote src in c6-1-host-surfaces.spec.ts (C6.1)',
  },
  {
    id: 'html',
    title: 'HTML',
    tier: 'read',
    primaryScenario: 'Basic html with sanitize gate',
    notes:
      'Verify the DOMPurify gate strips scripts; dynamic update sanitize re-verification (bug 73 pattern) in c6-1-host-surfaces.spec.ts (C6.1)',
  },
  {
    id: 'json-view',
    title: 'JSON View',
    tier: 'write',
    primaryScenario: 'Host json-view null empty + dynamic value update (C6.1)',
    notes:
      'Verify null empty state and scope-driven value updates between object tree and null (C6.1)',
  },
  {
    id: 'link',
    title: 'Link',
    tier: 'write',
    primaryScenario: 'Host link onClick + href coexist + javascript: href stripped (C6.1)',
    notes:
      'Verify onClick dispatch alongside native navigation, and javascript: href rendered without an href attribute (C6.1)',
  },
  {
    id: 'image',
    title: 'Image',
    tier: 'write',
    primaryScenario: 'Host image fail + retry on src update (C6.1 host-img-lifecycle)',
    notes:
      'Verify error fallback on missing src and retry recovery when the scope-bound src switches to a valid source (C6.1)',
  },
  {
    id: 'card',
    title: 'Card',
    tier: 'write',
    primaryScenario: 'Host card onClick + inner button action (C6.2)',
    notes:
      'Verify whole-card onClick dispatch and the inner actions-region button dispatching its own action (C6.2)',
  },
  {
    id: 'cards',
    title: 'Cards',
    tier: 'write',
    primaryScenario: 'Host cards selection modes + item action (C6.2 bug 73 pattern)',
    notes:
      'Verify local-only selection (single/multiple/none) with onSelectionChange reports, per-row onItemClick, and embedded item action row-scope isolation in c6-2-host-surfaces.spec.ts (C6.2 bug 73 pattern)',
  },
  {
    id: 'empty',
    title: 'Empty',
    tier: 'write',
    primaryScenario: 'Host empty actions CTA (C6.2)',
    notes:
      'Verify the actions-region CTA button dispatches its action and the report flips (C6.2)',
  },
  {
    id: 'progress',
    title: 'Progress',
    tier: 'write',
    primaryScenario: 'Host progress clamp on scope update (C6.2)',
    notes:
      'Verify value over max / negative values clamp (aria-valuenow + value display) and follow scope updates (C6.2)',
  },
  {
    id: 'spinner',
    title: 'Spinner',
    tier: 'write',
    primaryScenario: 'Host spinner visible toggle (C6.2)',
    notes:
      'Verify meta.visible scope toggle removes the spinner node entirely (C6.2)',
  },
  {
    id: 'separator',
    title: 'Separator',
    tier: 'read',
    primaryScenario: 'Host separator orientations + decorative (C6.2)',
    notes:
      'Verify horizontal/vertical aria-orientation, labelled variant and decorative aria-hidden mapping (C6.2)',
  },
  {
    id: 'alert',
    title: 'Alert',
    tier: 'write',
    primaryScenario: 'Host alert close + embedded actions (C6.3)',
    notes:
      'Verify closable close hides the node and the onClose action args read ${level} from the event payload (evaluationBindings), plus the actions-region button dispatching its own action (C6.3)',
  },
  {
    id: 'mapping',
    title: 'Mapping',
    tier: 'write',
    primaryScenario: 'Host mapping rows + item region (C6.3 bug 73 pattern)',
    notes:
      'Verify mapping inside repeated card rows resolves each row\'s own scope value (row pollution re-verification) and the item region template + embedded action on hit (C6.3 bug 73 pattern)',
  },
  {
    id: 'status',
    title: 'Status',
    tier: 'write',
    primaryScenario: 'Host status in dialog scope (C6.3)',
    notes:
      'Verify status inside an openDialog surface evaluates the opened row\'s scope values and projects the levelMap semantic color (C6.3)',
  },
  {
    id: 'audio',
    title: 'Audio',
    tier: 'write',
    primaryScenario: 'Host media in dialog + error fallback (C6.4 bug 73 pattern)',
    notes:
      'Verify audio/video inside an openDialog surface: data-URI audio loads normally, a missing video src shows the error fallback and fires onLoadError (C6.4 bug 73 pattern)',
  },
  {
    id: 'video',
    title: 'Video',
    tier: 'write',
    primaryScenario: 'Host media in dialog + error fallback (C6.4 bug 73 pattern)',
    notes:
      'Verify the shared media dialog host scenario: native video error fallback + onLoadError inside a dialog (C6.4 bug 73 pattern)',
  },
  {
    id: 'carousel',
    title: 'Carousel',
    tier: 'write',
    primaryScenario: 'Host carousel external control + onChange payload (C6.4)',
    notes:
      'Verify external ComponentHandle next/prev/setValue drive the active slide and the onChange action args read ${activeIndex} (evaluationBindings) and ${slides.length} (scope); autoplay toggle scenario in c6-4-host-surfaces.spec.ts (C6.4)',
  },
  {
    id: 'qrcode',
    title: 'QR Code',
    tier: 'write',
    primaryScenario: 'Host qrcode value update + canvas redraw (C6.4)',
    notes:
      'Verify scope-driven value updates re-render the canvas (toDataURL differs), empty value shows the empty fallback and a valid value recovers (C6.4)',
  },
  {
    id: 'diff-view',
    title: 'Diff View',
    tier: 'write',
    primaryScenario: 'Host diff in dialog + line click (C6.5 bug 73 pattern)',
    notes:
      'Verify diff-view inside an openDialog surface: split view renders and a real line click dispatches onLineClick with ${lineNumber}|${side}|${type} args resolved; cross-file clamp, reaction wiring and expand/collapse in c6-5-host-surfaces.spec.ts (C6.5)',
  },
  {
    id: 'pull-refresh',
    title: 'Pull Refresh',
    tier: 'write',
    primaryScenario: 'Host pull-refresh in dialog + onRefresh payload (C7 bug 73 pattern)',
    notes:
      'Verify pull-refresh inside an openDialog surface: a synthesized pull past the threshold dispatches onRefresh with ${direction}|${threshold} args resolved from the payload (C7)',
  },
  {
    id: 'infinite-scroll',
    title: 'Infinite Scroll',
    tier: 'write',
    primaryScenario: 'Host infinite-scroll in dialog + immediateCheck (C7 bug 73 pattern)',
    notes:
      'Verify infinite-scroll inside an openDialog surface: immediateCheck fires onLoadMore with ${source} resolved; failure + retry path in c7-host-surfaces.spec.ts (C7)',
  },
  {
    id: 'swipe-cell',
    title: 'Swipe Cell',
    tier: 'write',
    primaryScenario: 'Host swipe-cell row action (C7)',
    notes:
      'Verify repeated list rows with swipe-cell: swipe reveals the action region, clicking the action button dispatches onAction with ${side}|${index} resolved (row scope isolation, C7)',
  },
  {
    id: 'countdown',
    title: 'Countdown',
    tier: 'write',
    primaryScenario: 'Host countdown finish (C7)',
    notes:
      'Verify a 1.5s countdown reaches zero: data-finished flips true and onFinish dispatches with ${type} = finish resolved (C7)',
  },
  {
    id: 'notice-bar',
    title: 'Notice Bar',
    tier: 'write',
    primaryScenario: 'Host notice-bar close + click (C7)',
    notes:
      'Verify the closable bar hides after onClose, the clickable bar exposes role=button and dispatches onClick, and the static bar stays a non-focusable role=status region (C7)',
  },
  {
    id: 'ai-chat',
    title: 'AI Chat',
    tier: 'write',
    primaryScenario: 'Host AI chat in dialog + streaming (C8.1 bug 73 pattern)',
    notes:
      'Verify ai-chat inside an openDialog surface: send + mock streaming render the assistant bubble in the dialog (bug 73 pattern, C8.1)',
  },
  {
    id: 'ai-message-list',
    title: 'AI Message List',
    tier: 'read',
    primaryScenario: 'Host streaming message list (C8.1)',
    notes:
      'Verify the streaming message list keeps stable data-slot/data-role markers and aria-busy tracks the engine turn (C8.1)',
  },
  {
    id: 'ai-bubble',
    title: 'AI Bubble',
    tier: 'read',
    primaryScenario: 'Host bubble with timestamp + markdown (C8.1)',
    notes:
      'Verify a standalone ai-bubble renders markdown content with nop-ai-bubble marker, data-role/data-placement and the ai-bubble-timestamp <time> element (C8.1)',
  },
  {
    id: 'ai-sender',
    title: 'AI Sender',
    tier: 'write',
    primaryScenario: 'Host sender submit + word limit (C8.1)',
    notes:
      'Verify standalone ai-sender Enter-submits the trimmed draft, fires onSubmit { text } and the word limit counter flips to destructive over the cap (C8.1)',
  },
  {
    id: 'ai-conversations',
    title: 'AI Conversations',
    tier: 'write',
    primaryScenario: 'Host conversation list + onConversationChange (C8.1)',
    notes:
      'Verify the sidebar item click dispatches onItemClick with the conversation payload and ai-chat fires onConversationChange on activeConversationId change (C8.1)',
  },
  {
    id: 'ai-tool-call',
    title: 'AI Tool Call',
    tier: 'write',
    primaryScenario: 'Host tool-call in dialog + status transition (C8.2 bug 73 pattern)',
    notes:
      'Verify ai-tool-call inside an openDialog surface transitions running → success with args expand/collapse (bug 73 pattern), and a wired HITL approval cannot double-submit on rapid double click (C8.2)',
  },
  {
    id: 'ai-attachments',
    title: 'AI Attachments',
    tier: 'write',
    primaryScenario: 'Host attachments in dialog + validation (C8.2 bug 73 pattern)',
    notes:
      'Verify ai-attachments inside an openDialog surface: real file pick renders the thumbnail, remove works, over-limit fires onError (bug 73 pattern); a javascript: URL in a controlled value never becomes an anchor (C8.2)',
  },
  {
    id: 'ai-citations',
    title: 'AI Citations',
    tier: 'write',
    primaryScenario: 'Host citation popover + onSourceClick payload (C8.2)',
    notes:
      'Verify inline [N] markers render, the popover source card shows the title/url, and onSourceClick dispatches ${index}|${source.title} through the dispatch ctx (C8.2)',
  },
  {
    id: 'ai-feedback',
    title: 'AI Feedback',
    tier: 'write',
    primaryScenario: 'Host feedback echo + onAction payload (C8.2)',
    notes:
      'Verify like/dislike toggle the data-active presence attribute locally and onAction dispatches ${action}|${message.id} through the dispatch ctx (C8.2)',
  },
  {
    id: 'ai-token-usage',
    title: 'AI Token Usage',
    tier: 'read',
    primaryScenario: 'Host token usage render + onClick payload (C8.2)',
    notes:
      'Verify metadata.usage renders total/prompt/completion, the missing-usage placeholder carries data-empty, and onClick dispatches ${usage.total_tokens} through the dispatch ctx (C8.2)',
  },
  {
    id: 'ai-prompts',
    title: 'AI Prompts',
    tier: 'write',
    primaryScenario: 'Host prompts in dialog + onSelect payload (C8.3 bug 73 pattern)',
    notes:
      'Verify ai-prompts inside an openDialog surface: clicking a prompt item dispatches onSelect and ${item.label}|${index} resolves through the dispatch ctx (C8.3)',
  },
  {
    id: 'ai-suggestions',
    title: 'AI Suggestions',
    tier: 'write',
    primaryScenario: 'Host suggestions popover overflow + onSelect payload (C8.3)',
    notes:
      'Verify popover overflow collapse (+N trigger) expands and clicking an overflow item dispatches onSelect with the global index; ${item.text}|${index} resolves via ctx (C8.3)',
  },
  {
    id: 'ai-voice-input',
    title: 'AI Voice Input',
    tier: 'write',
    primaryScenario: 'Host voice input degradation path (C8.3)',
    notes:
      'Verify the unsupported-browser degradation: disabled marker button + data-unsupported and onError dispatches ${reason} = unsupported via ctx (C8.3)',
  },
  {
    id: 'ai-welcome',
    title: 'AI Welcome',
    tier: 'write',
    primaryScenario: 'Host welcome footer region + nested component (C8.3)',
    notes:
      'Verify the footer value-or-region renders nested schema components and the embedded button dispatches its action (region evaluation + events, C8.3)',
  },
];
