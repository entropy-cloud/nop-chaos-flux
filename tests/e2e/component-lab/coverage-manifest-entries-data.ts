/**
 * Component Lab E2E Coverage Manifest Entries — Data family
 *
 * Data-section entries of the coverage manifest, split out of
 * coverage-manifest-entries.ts so each module stays under the workspace
 * max-lines budget. Aggregated by coverage-manifest-entries.ts (single entry
 * point unchanged); consumed via coverage-manifest.ts.
 */

import type { RendererCoverageEntry } from './coverage-manifest';

export const COMPONENT_LAB_COVERAGE_MANIFEST: RendererCoverageEntry[] = [
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
  {
    id: 'gantt',
    title: 'Gantt',
    tier: 'write',
    primaryScenario: 'Host gantt in dialog + onTaskClick payload (C9 bug 73 pattern)',
    notes:
      'Verify gantt inside an openDialog surface: task bars render and a bar click dispatches onTaskClick with ${_taskId} resolved via the dispatch ctx (C9)',
  },
  {
    id: 'kanban',
    title: 'Kanban',
    tier: 'write',
    primaryScenario: 'Host kanban in dialog + onCardClick/onCardMove payload (C9 bug 73 pattern)',
    notes:
      'Verify kanban inside an openDialog surface: card click dispatches onCardClick with ${cardId}|${index} and a cross-column drag dispatches onCardMove (C9)',
  },
  {
    id: 'calendar',
    title: 'Calendar',
    tier: 'write',
    primaryScenario: 'Host calendar in dialog + loadAction + onEventClick payload (C9 bug 73 pattern)',
    notes:
      'Verify calendar inside an openDialog surface: loadAction fires on mount and an event block click dispatches onEventClick with ${event.id}|${event.title} (C9)',
  },
  {
    id: 'barcode-input',
    title: 'Barcode Input',
    tier: 'write',
    primaryScenario: 'Host barcode-input in form + validation + submit echo (C9)',
    notes:
      'Verify barcode-input in a form: manual input writes back to the form value, required validation blocks empty submit, and the submit action echoes the committed value (C9)',
  },
];
