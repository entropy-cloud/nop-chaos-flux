# E2E data-slot Selector Reference

> Status: active reference
> Last Reviewed: 2026-08-24
> Source: `docs/plans/2026-07-25-2-gantt-ai-e2e-test-coverage-and-fix-plan.md` Phase 3 (selector inventory)

Single place to look up the `data-slot` markers the e2e specs assert against. Specs should prefer these stable markers over generated class names. Add new markers here when a renderer introduces one that e2e relies on.

## Locating a node: testid vs data-slot

- `meta.testid` from the schema lands on the renderer's ROOT element, **the same element that carries the renderer's root `data-slot`**. Assert with a same-element locator:

  ```ts
  page.locator('[data-testid="cov-bubble-corner"][data-slot="ai-bubble"]'); // ✓
  page.locator('[data-testid="cov-bubble-corner"] [data-slot="ai-bubble"]'); // ✗ never matches
  ```

- Region children (header/footer/beforeMessages/…) render INSIDE the root, so descendant locators are correct for them.
- Radix `PopoverContent` portals render OUTSIDE the anchor subtree — use page-level locators for `[data-slot="ai-suggestions-overflow-list"]`, `[data-slot="ai-citation-card"]`, `[data-slot="ai-citation-empty"]`.

## Gantt (`packages/flux-renderers-scheduling/src/gantt/`)

| data-slot                                                                  | Element                                                                         |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `gantt`                                                                    | root container (also `role="grid"`, `tabindex="0"`, `aria-label`)               |
| `gantt-toolbar`                                                            | toolbar strip (buttons: − zoom-out, + zoom-in, Fit, Today)                      |
| `gantt-grid`                                                               | grid scroll container (`overflow-auto`; the virtualizer's scroll element)       |
| `gantt-grid-header` / `gantt-grid-header-cell`                             | column header row / cells                                                       |
| `gantt-grid-row`                                                           | task row (`data-task-id`, `data-depth`, `aria-level/setsize/posinset/selected`) |
| `gantt-grid-cell`                                                          | row cell                                                                        |
| `gantt-scale`                                                              | timescale (sticky)                                                              |
| `gantt-scale-cell`                                                         | scale label cell                                                                |
| `gantt-cell-grid` / `gantt-weekend`                                        | background cell grid / weekend column (`data-weekend="true"`)                   |
| `gantt-bars` / `gantt-bar`                                                 | bars container / bar (`data-task-id`, `data-bar-type=task\|project`)            |
| `gantt-bar-progress`                                                       | progress fill (`style.width` %)                                                 |
| `gantt-bar-link-handle`                                                    | drag-out link handle (`data-handle-side=start\|end`)                            |
| `gantt-markers` / `gantt-today`                                            | marker layer / today line + label                                               |
| `gantt-baseline-bar` / `gantt-baseline-deviation` / `gantt-baseline-label` | baseline family                                                                 |
| `gantt-link-delete-btn`                                                    | hover delete button (class `nop-gantt-link-delete-btn`)                         |

CSS classes: `nop-gantt-bar-text`, `nop-gantt-bar-ghost`, `nop-gantt-link-line`, `nop-gantt-bar-milestone-fill`. Milestones carry `data-bar-type="milestone"` on an SVG polygon (no `gantt-bar` slot). Editor dialog inputs: `id$="-edit-{text,start,end,duration,progress}"` inside `[role="dialog"]`. Splitter: `[role="separator"]` with `aria-valuenow/min/max`.

## AI renderers (`packages/flux-renderers-ai/src/renderers/`)

| data-slot                                                                                                                                                                             | Renderer                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `ai-chat-root` (+`data-state=idle\|processing\|completed\|error\|empty\|aborted`)                                                                                                     | ai-chat                                                                  |
| `ai-chat-header/-before/-after/-footer/-empty/-error`                                                                                                                                 | ai-chat regions/states                                                   |
| `ai-message-list` (+`data-empty`, `data-virtual`, `aria-busy`)                                                                                                                        | ai-message-list                                                          |
| `ai-message-list-error` / `ai-message-list-error-retry`                                                                                                                               | failed-turn banner (A-5 carrier)                                         |
| `ai-bubble` (+`data-role`, `data-placement`, `data-shape`, `data-streaming`, `data-error`, `data-editing`)                                                                            | ai-bubble                                                                |
| `ai-bubble-content/-avatar/-timestamp/-markdown/-code/-copy-code/-text/-loading/-error/-error-retry/-reasoning/-image/-image-item/-data-part/-data-part-id/-data-part-payload/-tools` | bubble content family                                                    |
| `ai-bubble-edit-toggle/-input/-submit/-cancel`                                                                                                                                        | user-message edit affordance                                             |
| `ai-bubble-branches/-branch-prev/-branch-counter/-branch-next`                                                                                                                        | branch picker                                                            |
| `ai-sender` (+`data-extension` when a rich-text extension mounts)                                                                                                                     | ai-sender                                                                |
| `ai-sender-input/-actions/-submit/-cancel/-count`                                                                                                                                     | sender parts (`count` shows `N/maxLength`, `text-destructive` when over) |
| `ai-conversations` / `-header/-create/-list/-item(-item-button)/-rename(-input)/-delete`                                                                                              | ai-conversations (`item` carries `data-active`, `aria-current`)          |
| `ai-welcome` (+`data-align`) / `-icon/-title/-description/-footer`                                                                                                                    | ai-welcome                                                               |
| `ai-prompts` (+`data-layout`, `data-empty`) / `-item(-label/-description/-badge)`                                                                                                     | ai-prompts                                                               |
| `ai-feedback` / `-like/-dislike/-copy/-refresh/-sources` (buttons carry `data-active` when voted)                                                                                     | ai-feedback                                                              |
| `ai-tool-call` (+`data-tool-status`, `data-approval`, `data-requires-approval`, `data-open`)                                                                                          | ai-tool-call                                                             |
| `ai-tool-call-toggle/-args/-approval/-approve/-reject`                                                                                                                                | tool-call parts (decided state: `[data-approval-decision]` badge)        |
| `ai-attachments` (+`data-mode`, `data-dragging`)                                                                                                                                      | ai-attachments                                                           |
| `ai-attachments-pick/-input/-list/-item/-thumb/-status/-remove/-upload`                                                                                                               | attachments parts                                                        |
| `ai-citations` (+`data-mode=inline\|list`)                                                                                                                                            | ai-citations                                                             |
| `ai-citation-trigger`(per-index `data-citation-index`)/`-card/-url/-open/-item/-empty`                                                                                                | citations parts                                                          |
| `ai-voice-input` (+`data-state=idle\|listening`, `data-unsupported`, `aria-pressed`)                                                                                                  | ai-voice-input                                                           |
| `ai-voice-input-wave` / `ai-voice-input-unavailable-badge`                                                                                                                            | voice parts                                                              |
| `ai-token-usage` (+`data-empty`)                                                                                                                                                      | ai-token-usage                                                           |
| `ai-token-usage-total/-prompt/-completion/-cost/-ring/-text`                                                                                                                          | usage parts                                                              |
| `ai-suggestions` (+`data-overflow=expand\|scroll\|popover`, `data-empty`)                                                                                                             | ai-suggestions                                                           |
| `ai-suggestions-item(-text)` / `ai-suggestions-overflow` / `ai-suggestions-overflow-list`                                                                                             | suggestions parts                                                        |

## Known non-obvious behaviors

- `ai-bubble-avatar` is a host-stylable marker (`aria-hidden`, empty) — assert `toBeAttached()`, not visibility.
- The bubble error renderer binds to a trailing assistant message; a failed turn whose residue is dropped surfaces via `ai-message-list-error` instead (FIND-03 / A-5).
- Schema-event `setValue` writes do not propagate to formula-bound nodes on pages that declare a page-level `xui:imports` (runtime import-overlay defect — `docs/bugs/163-import-overlay-captures-schema-event-setValue-writes.md`). Host connectors via page `data` instead.
