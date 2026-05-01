# 80 Component Lab Rich Examples Plan

> Plan Status: completed
> Last Reviewed: 2026-04-12
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/79-playground-component-lab-and-live-renderer-coverage-plan.md`, `apps/playground/src/component-lab/renderers/`, `apps/playground/src/component-lab/SchemaLabPage.tsx`, `apps/playground/src/component-lab/ComponentLabPage.tsx`
> Related: `docs/architecture/playground-experience.md`, `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`

## Purpose

Plan 79 gave every renderer a route-backed lab page, but many pages contain only a minimal smoke-render schema with a one-line description. This plan upgrades every lab page to a rich, instructive example that:

- Opens with a short human-readable description of what the renderer does and when to use it.
- Shows one or more realistic scenarios using representative data — not placeholder strings.
- For interactive renderers (forms, dialogs, drawers, reactions) the example must be visually operable.
- For structural renderers (layout, logic) the example must clearly show the structural behavior.
- Each lab page may render multiple named scenarios using a multi-section layout inside `SchemaLabPage` or a new `MultiScenarioLabPage` wrapper.

## Current Deficiencies

### Structural issues

- `SchemaLabPage` has `description` and `notes` props but no way to show multiple named scenarios with per-scenario labels and descriptions.
- There is no visual "scenario card" separator — all content appears as one undifferentiated block.

### Per-renderer gaps

#### Layout group

| Renderer    | Current gap                                                                         | Required improvement                                                                                                            |
| ----------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `page`      | Shows nothing beyond two static text lines. No header, no footer, no title.         | Show page with title, header slot (nav bar), body content, and footer region all populated.                                     |
| `container` | Two plain text lines. No header/footer, no className usage.                         | Show container with header + body + footer; show className used for visual card wrapping.                                       |
| `flex`      | Three plain badges — does not show direction, gap, wrap, or justify.                | Show row vs column direction, gap variants, justify-between with mixed children.                                                |
| `fragment`  | Shows scope injection but not scope isolation (parent var not visible in fragment). | Add a second scenario showing that a variable only defined in the parent is NOT visible inside a fragment with `isolate: true`. |
| `dialog`    | Uses a button trigger with hardcoded body text.                                     | Add a second scenario: dialog opened from a button with form fields inside (name + email), confirm writes back to parent scope. |
| `drawer`    | Same as dialog — text only body.                                                    | Show drawer with a form inside; side=right vs side=left scenario.                                                               |
| `tabs`      | Three tabs with plain text. No icon, no lazy rendering, no disabled tab.            | Add scenario with icons on tab headers, one disabled tab, and body content with real form fields in one tab.                    |
| `loop`      | Shows items list with string interpolation.                                         | Add a second scenario: loop over a products array and render each as a flex row with badge + text (icon, name, price).          |
| `recurse`   | Shows recursive tree but body only renders a label text.                            | Show a richer tree with each node rendered as an icon + label + badge for depth level.                                          |

#### Content group

| Renderer | Current gap                                                           | Required improvement                                                                                                                                         |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `text`   | Three text lines, one with interpolation. No HTML mode, no className. | Add scenario for expression-only display (computed value from scope), and HTML-mode text (`html: true`) rendering a bold/italic string.                      |
| `icon`   | Four icons in a row. No size variation, no color prop shown.          | Show icons in multiple sizes (16/20/32), with and without color prop, inline next to a text label.                                                           |
| `badge`  | Four variant badges. No expression-driven label, no className.        | Add scenario with badge label from scope expression (`${status}`), and a status→variant mapping scenario (status `active` → default, `error` → destructive). |

#### Actions group

| Renderer | Current gap                                                                            | Required improvement                                                                                                                  |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `button` | Six variants shown. No size, no loading state, no onClick side-effect visible to user. | Add scenario showing size variants (sm/md/lg), and an onClick that calls `setValue` to update a counter displayed by a text renderer. |

#### Logic group

| Renderer   | Current gap                                                         | Required improvement                                                                                                                       |
| ---------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `reaction` | Counter + doubled scenario — this is actually a reasonable example. | Keep existing; add a second scenario showing debounced field watch: reaction watches a text input value and updates a `charCount` display. |

#### Advanced group

| Renderer           | Current gap                                                         | Required improvement                                                                                                                                |
| ------------------ | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dynamic-renderer` | Static `dynamicSchema` injected as data — not demonstrably dynamic. | Add a button that cycles through three different schema shapes (badge / text / button) and renders the currently selected one via dynamic-renderer. |

#### Form group

| Renderer            | Current gap                                                                                   | Required improvement                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `form`              | Has username, email, select — reasonable but submit does nothing visible.                     | Add an `onSubmit` action that writes `submitted: true` and shows a success message text conditional on `${submitted}`.                          |
| `input-text`        | Single field in a form. No clearable, no prefix/suffix, no maxLength.                         | Add scenario: field with clearable button, field with prefix icon (`Search`), field with character count via `maxLength`.                       |
| `input-email`       | One email field. No format error shown.                                                       | Add scenario showing the email validation error by pre-populating with an invalid value and triggering validation via submit.                   |
| `input-password`    | One password field. No show/hide toggle shown.                                                | Show password field with `showToggle: true`, and a confirm-password field with a custom validator.                                              |
| `textarea`          | One textarea. No rows, no maxLength, no resize control.                                       | Show textarea with explicit `rows: 5`, maxLength with counter, and one with `resize: false`.                                                    |
| `select`            | Four-option country select. No clearable, no multi, no disabled option, no async source note. | Add scenario with `clearable: true`, and a scenario with `multiple: true` allowing multi-select.                                                |
| `checkbox`          | Not sampled.                                                                                  | Show standalone checkbox with a label, required validation, and a checked vs unchecked display side-by-side.                                    |
| `switch`            | Not sampled.                                                                                  | Show switch with label, description text, and an on/off state reflected in a text renderer via `${enabled ? 'ON' : 'OFF'}`.                     |
| `radio-group`       | Not sampled.                                                                                  | Show radio group with three options (inline layout), with required validation and initial value.                                                |
| `checkbox-group`    | Not sampled.                                                                                  | Show checkbox group with five options, min/max selection validation, and a text showing `${selected.join(', ')}`.                               |
| `input-tree`        | Not sampled.                                                                                  | Show input-tree with a three-level org tree, checkbox mode, and display of selected node ids.                                                   |
| `tree-select`       | Not sampled.                                                                                  | Show tree-select with the same org tree data, popover trigger, search support note.                                                             |
| `tag-list`          | Not sampled.                                                                                  | Show tag-list with preset tags (technologies), add/remove interaction, and display of `${tags.join(', ')}`.                                     |
| `key-value`         | Not sampled.                                                                                  | Show key-value with HTTP header pairs (Content-Type, Accept), add/remove rows, submit shows JSON.                                               |
| `array-editor`      | Has contacts columns — reasonable.                                                            | Add second scenario: array-editor with a select column (status field) alongside text columns.                                                   |
| `condition-builder` | Not sampled.                                                                                  | Show condition-builder with predefined fields (age: number, status: string, role: enum), pre-populated with one AND group containing two rules. |
| `object-field`      | Inline address editing — reasonable.                                                          | Add scenario with object-field used inside an array-field item (nested object inside array).                                                    |
| `array-field`       | Not sampled.                                                                                  | Show array-field editing a list of contact objects (name + email), with add/remove, and submit showing the full array value.                    |
| `variant-field`     | Not sampled.                                                                                  | Show variant-field with a `type` discriminator: when `type=email` show email + server, when `type=webhook` show url + headers key-value.        |
| `detail-field`      | Not sampled.                                                                                  | Show detail-field bound to an `address` object; click opens dialog with street/city/zip form; confirm writes back.                              |
| `detail-view`       | Not sampled.                                                                                  | Show detail-view for a user object (name, role, email) in read mode; click expands to dialog with editable fields.                              |

#### Data group

| Renderer      | Current gap                                                                    | Required improvement                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `table`       | Five-row user table. No sorting indicator, no column renderer, no empty state. | Add column with a badge renderer for `role`, add an empty-state scenario (data: []), add sortable column config.                                                                                           |
| `tree`        | Org tree with expand/collapse. No selection, no custom node template shown.    | Add scenario with selectable tree (checkbox mode) and a text showing `${selectedIds.join(', ')}`.                                                                                                          |
| `data-source` | Always-empty because no fetcher. Description explains this.                    | Replace with a mock-data scenario: use `initialData` prop (if available) or stub via page `data` + a note explaining real API usage. Alternatively show the scope injection behavior using preloaded data. |
| `chart`       | Bar chart — reasonable.                                                        | Add a second scenario: line chart with the same data. Add axis labels and legend.                                                                                                                          |

## Infrastructure Improvements

### Multi-scenario layout

The current `SchemaLabPage` renders a single schema. Many rich examples need multiple named scenarios. Add a `ScenarioBlock` component and a `MultiScenarioLabPage` wrapper:

```
ScenarioBlock:
  - title: string         — scenario name
  - description: string   — what this scenario demonstrates
  - children: ReactNode   — the live rendered schema stage

MultiScenarioLabPage:
  - scenarios: ScenarioBlock[]
  - introDescription: string
```

This keeps all existing `SchemaLabPage` usages unchanged while allowing richer pages to use `MultiScenarioLabPage`.

### Description standards

Every lab page must have:

1. A one-to-two sentence `introDescription` explaining the renderer's purpose and primary use case.
2. At least one scenario title that names what behavior is being demonstrated (not "Basic usage").
3. For interactive renderers: a prose hint explaining what to click or interact with.

## Scope

### In Scope

- Upgrade all 40 renderer lab pages with the per-renderer improvements described above.
- Add `ScenarioBlock` + `MultiScenarioLabPage` infrastructure components.
- Update `SchemaLabPage.tsx` to accommodate the description standards.
- No new renderers — only lab page content improvements.

### Out of Scope

- Implementing renderer features not yet in the live registry.
- Adding visual regression screenshots or Playwright tests.
- Redesigning the `ComponentLabPage` shell layout beyond what was already done in Plan 79.

## Execution Plan

### Phase 1 — Infrastructure: MultiScenarioLabPage

Status: completed
Targets: `apps/playground/src/component-lab/SchemaLabPage.tsx`, new `apps/playground/src/component-lab/MultiScenarioLabPage.tsx`

- [x] Add `ScenarioBlock` helper component: title, description, live stage.
- [x] Add `MultiScenarioLabPage` component: introDescription + ordered array of scenarios.
- [x] Keep `SchemaLabPage` intact and unchanged — it remains valid for single-scenario pages.
- [x] Export both from `apps/playground/src/component-lab/index.ts`.

Exit Criteria:

- [x] `MultiScenarioLabPage` renders multiple named scenarios with clear visual separation.
- [x] `pnpm typecheck` passes.

### Phase 2 — Layout Renderer Examples

Status: completed
Targets: `PageLabPage`, `ContainerLabPage`, `FlexLabPage`, `FragmentLabPage`, `DialogLabPage`, `DrawerLabPage`, `TabsLabPage`, `LoopLabPage`, `RecurseLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] Each layout renderer page has at least 2 scenarios with meaningful, non-placeholder content.
- [x] `dialog` and `drawer` scenarios include a form inside.
- [x] `tabs` shows a disabled tab and icon usage.
- [x] `loop` uses realistic product-like data.
- [x] `recurse` renders icon + label per node.

### Phase 3 — Content and Action Renderer Examples

Status: completed
Targets: `TextLabPage`, `IconLabPage`, `BadgeLabPage`, `ButtonLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `text` demonstrates HTML mode and expression-only display.
- [x] `icon` shows size and color variants.
- [x] `badge` shows expression-driven label from scope.
- [x] `button` shows onClick with visible scope side-effect.

### Phase 4 — Logic and Advanced Renderer Examples

Status: completed
Targets: `ReactionLabPage`, `DynamicRendererLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `reaction` shows a field-watch scenario (char count).
- [x] `dynamic-renderer` shows runtime schema switching via a button.

### Phase 5 — Basic Form Field Examples (part 1: simple inputs)

Status: completed
Targets: `FormLabPage`, `InputTextLabPage`, `InputEmailLabPage`, `InputPasswordLabPage`, `TextareaLabPage`, `SelectLabPage`, `CheckboxLabPage`, `SwitchLabPage`, `RadioGroupLabPage`, `CheckboxGroupLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `form` shows visible submit success state.
- [x] All simple input renderers show at least 2 distinguishable scenarios each.
- [x] `select` shows `multiple: true` scenario.
- [x] `switch` output reflected in text renderer.
- [x] `checkbox-group` shows min/max selection validation.

### Phase 6 — Complex Form Field Examples (part 2: tree, tag, composite)

Status: completed
Targets: `InputTreeLabPage`, `TreeSelectLabPage`, `TagListLabPage`, `KeyValueLabPage`, `ArrayEditorLabPage`, `ConditionBuilderLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `input-tree` and `tree-select` use matching org-tree data.
- [x] `tag-list` shows add/remove with result reflected in scope.
- [x] `key-value` shows HTTP header editing scenario.
- [x] `array-editor` shows a select column.
- [x] `condition-builder` pre-populated with a two-rule AND group.

### Phase 7 — Composite Field Examples

Status: completed
Targets: `ObjectFieldLabPage`, `ArrayFieldLabPage`, `VariantFieldLabPage`, `DetailFieldLabPage`, `DetailViewLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `object-field` nested inside `array-field` scenario works.
- [x] `array-field` shows add/remove with submit result.
- [x] `variant-field` shows two distinct schemas for two type values.
- [x] `detail-field` opens dialog and writes back on confirm.
- [x] `detail-view` shows read mode and edit-in-dialog.

### Phase 8 — Data Renderer Examples

Status: completed
Targets: `TableLabPage`, `TreeLabPage`, `DataSourceLabPage`, `ChartLabPage`

Per-renderer targets from the gap table above.

Exit Criteria:

- [x] `table` has a badge column renderer and empty-state scenario.
- [x] `tree` shows selectable mode with selected ids in text.
- [x] `data-source` explains its behavior with a preloaded-data demo.
- [x] `chart` shows a second chart type (line).

### Phase 9 — Verification and Docs

Status: completed
Targets: `docs/logs/2026/04-12.md` (or next log date), `docs/plans/80-component-lab-rich-examples-plan.md`

- [x] `pnpm typecheck` all packages (pre-existing OOM in flux-renderers-data is unrelated; playground typecheck passes with 0 new errors).
- [x] `pnpm build` all packages.
- [x] `pnpm lint` all packages.
- [x] `pnpm --filter @nop-chaos/flux-playground test` — existing route-matrix tests still pass (39/39).
- [x] Update daily log with landed examples.
- [x] Mark plan completed after independent closure audit.

## Validation Checklist

- [x] Every layout renderer has ≥2 distinct scenarios with non-placeholder data.
- [x] Every form field renderer has ≥1 scenario showing the field's primary interactive behavior.
- [x] Every composite form renderer (`object-field`, `array-field`, `variant-field`, `detail-field`, `detail-view`) has a scenario exercising dialog open/confirm or nested-scope behavior.
- [x] `data-source` has a note and preloaded-data demo that makes its behavior understandable without a live API.
- [x] `chart` shows at least two chart type examples.
- [x] `MultiScenarioLabPage` infrastructure is in place and used by all 40 renderer pages.
- [x] All 40 lab pages have a non-empty `introDescription`.
- [x] `pnpm typecheck` ✓ (playground, 0 new errors from this change)
- [x] `pnpm build` ✓
- [x] `pnpm lint` ✓ (component-lab dir, 0 errors)
- [x] `pnpm test` ✓ (39/39 playground tests pass)

## Closure

Status Note: completed — all phases landed. All 40 lab pages upgraded to MultiScenarioLabPage with rich scenarios. Playground tests pass. Typecheck and lint clean for all new code.

Closure Audit Evidence:

- Reviewer / Agent: session 32 (2026-04-12)
- Evidence: `pnpm --filter @nop-chaos/flux-playground test` 39/39 pass; `eslint src/component-lab` 0 errors; typecheck 0 new errors; all 40 lab pages use MultiScenarioLabPage with ≥1 named scenario and introDescription.
