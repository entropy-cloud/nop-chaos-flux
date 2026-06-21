# Component Package Reorganization Analysis

> Status: proposal
> Date: 2026-06-20
> Related: `package-splitting-strategy.md`, `roadmap.md`, `amis-baseline-matrix.md`

## 1. Problem Statement

The platform currently has ~55 stable L0 renderers across 4 packages. The roadmap adds 44 new components (W1-W4 + D1a). The core question: **where do new components live so that platform stability is not compromised by AI-generated, potentially low-quality code?**

Two competing concerns:

- **Technical coherence**: components that share runtime mechanisms should be co-located (existing `package-splitting-strategy.md` principle)
- **Stability isolation**: components that are experimental or AI-generated should be separable from stable platform code so they can be deleted or regenerated without version churn

## 2. Current State

### Existing packages (stable, platform-dependent)

| Package                        | Renderers                                             | LOC (incl tests) | Platform uses it?             |
| ------------------------------ | ----------------------------------------------------- | ---------------- | ----------------------------- |
| `flux-renderers-basic`         | 15 (page, container, flex, button, text, dialog, ...) | ~1,800           | Yes — playground registers it |
| `flux-renderers-form`          | 12 (form, fieldset, input-text, select, ...)          | ~15,800          | Yes — playground registers it |
| `flux-renderers-form-advanced` | 11 (array-editor, condition-builder, tag-list, ...)   | ~8,000           | Yes — playground registers it |
| `flux-renderers-data`          | 5 (table, tree, chart, crud, data-source)             | ~2,400           | Yes — playground registers it |

### New components (44 total, none implemented)

| Wave | Count | Components                                                              |
| ---- | ----- | ----------------------------------------------------------------------- |
| W1a  | 5     | markdown, html, link, image, json-view                                  |
| W1b  | 5     | separator, card, progress, spinner, empty                               |
| W1c  | 1     | list                                                                    |
| W2a  | 5     | service, pagination, cards, wizard, alert                               |
| W2b  | 4     | input-date, input-datetime, input-time, date-range                      |
| W3a  | 2     | grid, collapse                                                          |
| W3b  | 2     | button-group, dropdown-button                                           |
| W3c  | 2     | mapping, status                                                         |
| W3d  | 6     | input-month, input-quarter, input-year, input-file, input-image, editor |
| W4a  | 4     | audio, video, carousel, qrcode                                          |
| W4b  | 2     | steps, timeline                                                         |
| W4c  | 4     | combo, picker, transfer, input-table                                    |
| D1a  | 2     | designer-node-card, designer-edge-row                                   |

### Key finding: zero current consumption

None of the 44 new components are imported, registered, or referenced anywhere in `apps/playground/` or any designer package. The platform runs entirely on existing L0 renderers.

## 3. Which Components MUST Go Into Existing Packages?

A component is "platform-essential" if it extends an existing architectural pattern and would create architectural coupling if isolated. The test: **does it reuse a platform-owned runtime mechanism (form owner, composite-field staged owner, data-source scope, table row model) that would require a cross-package runtime import?**

### Must extend existing packages (19 components)

**`flux-renderers-form` — atomic date/time fields (7):**

| Component        | Why it must be here                                       |
| ---------------- | --------------------------------------------------------- |
| `input-date`     | Atomic field, same pattern as `input-text`/`input-number` |
| `input-datetime` | Same                                                      |
| `input-time`     | Same                                                      |
| `input-month`    | Same                                                      |
| `input-quarter`  | Same                                                      |
| `input-year`     | Same                                                      |
| `date-range`     | Atomic field with two-bound value, no sub-scope           |

Risk assessment: **low**. These follow the exact same pattern as existing form fields. They're small (~100-200 lines each), have no complex internal state, and failure means one field type doesn't work — not a platform crash.

**`flux-renderers-form-advanced` — composite value fields (7):**

| Component         | Why it must be here                                                       |
| ----------------- | ------------------------------------------------------------------------- |
| `combo`           | Reuses `object-field`/`array-field` staged owner semantics                |
| `picker`          | Reuses composite-field architecture                                       |
| `transfer`        | Reuses array-field + tree model                                           |
| `input-table`     | Reuses array-field + table row model                                      |
| `input-file`      | Composite field (file + metadata)                                         |
| `input-image`     | Composite field (image + crop + metadata)                                 |
| `editor`          | WYSIWYG rich text form field (TipTap), maps to AMIS input-rich-text       |
| `markdown-editor` | Markdown source edit + preview (Textarea + react-markdown), zero new deps |

Risk assessment: **medium**. These are complex (500-2000 lines each) and AI-generated quality may vary. But they MUST be here because they directly import from the composite-field architecture in this package.

**`flux-renderers-data` — data collection owners (3):**

| Component    | Why it must be here                 |
| ------------ | ----------------------------------- |
| `list`       | Reuses table/tree row + scope model |
| `service`    | Reuses data-source architecture     |
| `pagination` | Pairs with collection renderers     |

Risk assessment: **low-medium**. `service` reuses the data-source pattern; `list` and `pagination` are relatively simple wrappers.

**`flow-designer-renderers` — designer domain (2):**

| Component            | Why it must be here                         |
| -------------------- | ------------------------------------------- |
| `designer-node-card` | Schema already declared in designer package |
| `designer-edge-row`  | Same                                        |

### Purely application-level — safe to isolate (25 components)

These have no value/validation channel, no nested sub-scope, no platform-owned runtime mechanism. They're presentational wrappers around `@nop-chaos/ui` primitives.

| Category           | Components                                | Reuse                                |
| ------------------ | ----------------------------------------- | ------------------------------------ |
| Content display    | markdown, html, link, image, json-view    | text/icon/badge + ui primitives      |
| Container/feedback | separator, card, progress, spinner, empty | ui Card/Progress/Skeleton/Empty      |
| Value mapping      | mapping, status                           | text/badge                           |
| Data display       | cards, alert                              | ui primitives                        |
| Multimedia         | audio, video, carousel, qrcode            | third-party libs                     |
| Layout             | grid, collapse                            | flex/container composition           |
| Action grouping    | button-group, dropdown-button             | button + ui ButtonGroup/DropdownMenu |
| Process display    | steps, timeline                           | ui primitives                        |
| Flow container     | wizard                                    | flex/tabs navigation pattern         |

## 4. Options Analysis

### Option A: All new components into existing packages

| Criterion             | Assessment                                                            |
| --------------------- | --------------------------------------------------------------------- |
| Technical coherence   | Best — components co-located with their dependencies                  |
| Platform stability    | Worst — 44 AI-generated files pollute stable packages                 |
| Deletion/regeneration | Painful — must carefully remove from package without breaking exports |
| Build overhead        | High — platform builds include all experimental code                  |
| **Verdict**           | Rejected — this is the problem the user identified                    |

### Option B: Single `flux-renderers-extra` isolation package

All 44 components in one new package. Platform stable packages untouched.

| Criterion             | Assessment                                                                                                                                                       |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Technical coherence   | Poor — mixes dates, multimedia, layout, composite forms in one package                                                                                           |
| Platform stability    | Best — zero impact on stable packages                                                                                                                            |
| Deletion/regeneration | Trivial — delete the whole package or individual files                                                                                                           |
| Build overhead        | None for platform; opt-in for apps                                                                                                                               |
| Package size          | Large (~10,000+ lines), but all optional                                                                                                                         |
| Dependency issue      | **BLOCKER**: combo/input-table/transfer need composite-field imports from `form-advanced`; service needs data-source from `data`. Cross-package runtime imports. |
| **Verdict**           | Good for the 25 app-level components, but the 19 platform-essential components create dependency problems                                                        |

### Option C: Two new packages (`content` + `layout`) per existing strategy

This is the approach already documented in `package-splitting-strategy.md`.

| Criterion                 | Assessment                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Technical coherence       | Good — content and layout are distinct responsibilities                                                             |
| Platform stability        | Good — 25 components isolated from stable packages                                                                  |
| Deletion/regeneration     | Easy within each package                                                                                            |
| Build overhead            | None for platform; apps opt-in per category                                                                         |
| The 19 platform-essential | Still go into existing packages (form, form-advanced, data)                                                         |
| **Verdict**               | Technically correct but doesn't fully address the user's stability concern for the 19 platform-essential components |

### Option D: Hybrid — new packages + staging mechanism

Two new packages for app-level components (per Option C), PLUS a "staging" convention for the 19 platform-essential components.

The staging convention: new components in existing packages are registered behind a feature flag or in a separate entry point (`/experimental` subpath). They can be excluded from the default registration until proven stable.

| Criterion             | Assessment                                             |
| --------------------- | ------------------------------------------------------ |
| Technical coherence   | Best — components in the right package architecturally |
| Platform stability    | Good — experimental registration is opt-in             |
| Deletion/regeneration | Moderate — remove from staging list, no export churn   |
| Complexity            | Higher — staging mechanism adds config overhead        |
| **Verdict**           | Over-engineered for the current team size              |

## 5. Recommendation

**Adopt Option C (two new packages) with clear acceptance criteria for the 19 platform-essential components.**

### New packages

```
packages/
├── flux-renderers-basic          # STABLE — no new components
├── flux-renderers-form           # STABLE — extends with date/time fields only
├── flux-renderers-form-advanced  # STABLE — extends with composite fields only
├── flux-renderers-data           # STABLE — extends with list/service/pagination only
├── flux-renderers-content/       # NEW — 18 app-level display/feedback/media
├── flux-renderers-layout/        # NEW — 7 app-level layout/flow/action
├── flux-code-editor/             # unchanged
└── domain packages               # unchanged
```

### Rationale

1. **25 components fully isolated** in `content` + `layout`. Platform never imports them. Delete freely.
2. **19 components extend existing packages** — these follow established patterns (atomic form fields, composite fields, data owners). They're the "low risk" additions. If quality is poor, they fail closure audit and don't get promoted to `active` status.
3. **Mission driver handles quality**: the plan lifecycle (drafted → reviewed → active → completed) ensures only quality-verified components reach execution. Bad drafts are caught at REVIEW_PLANS.
4. **Matches existing strategy doc**: `package-splitting-strategy.md` already planned this exact split. No architectural surprise.

### Acceptance criteria for platform-essential additions

Before a new component is added to `flux-renderers-form`/`form-advanced`/`data`:

1. Must pass typecheck + build + lint for the entire package
2. Must have a working example in the component lab
3. Must pass the plan's closure audit (checklist + script check)
4. If deleted later, must not leave orphaned imports or type references

These criteria are already enforced by the mission driver's plan lifecycle.

### Component → Package Assignment (Final)

| Package                                  | New Components                                                                                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `flux-renderers-content` (NEW)           | markdown, html, link, image, json-view, separator, card, progress, spinner, empty, mapping, status, cards, alert, audio, video, carousel, qrcode |
| `flux-renderers-layout` (NEW)            | grid, collapse, button-group, dropdown-button, steps, timeline, wizard                                                                           |
| `flux-renderers-form` (extends)          | input-date, input-datetime, input-time, date-range, input-month, input-quarter, input-year                                                       |
| `flux-renderers-form-advanced` (extends) | combo, picker, transfer, input-table, input-file, input-image, editor                                                                            |
| `flux-renderers-data` (extends)          | list, service, pagination                                                                                                                        |
| `flow-designer-renderers` (extends)      | designer-node-card, designer-edge-row                                                                                                            |

**Totals**: 25 isolated (content + layout) + 19 extending existing + 2 designer = 46 slots for 44 components.

## 6. External Dependencies

Only **4 components** require new external npm dependencies. Three land in `flux-renderers-content` (isolated, opt-in), one in `flux-renderers-form-advanced`:

| Component  | Dependency                              | gzip size | Package                        | Platform risk                   |
| ---------- | --------------------------------------- | --------- | ------------------------------ | ------------------------------- |
| `markdown` | `react-markdown` + `remark-gfm`         | ~25-40 KB | `flux-renderers-content` (NEW) | Low — opt-in                    |
| `html`     | `dompurify`                             | ~17 KB    | `flux-renderers-content` (NEW) | Low — opt-in                    |
| `qrcode`   | `qrcode`                                | ~10 KB    | `flux-renderers-content` (NEW) | Low — opt-in                    |
| `editor`   | `@tiptap/react` + `@tiptap/starter-kit` | ~50-70 KB | `flux-renderers-form-advanced` | Medium — extends stable package |

The remaining 40 components need **zero new dependencies** — covered by existing workspace deps.

Notably, `editor` uses TipTap (~50-70KB gzip, MIT) for WYSIWYG rich text — maps to AMIS `input-rich-text`. `markdown-editor` is self-built with Textarea + react-markdown (zero new deps). WYSIWYG at the page level is handled by the separate `word-editor` domain package. This adds TipTap as the 4th new dependency (in `flux-renderers-form-advanced`).

## 7. What NOT to Do

1. **Do NOT add content/layout components to `flux-renderers-basic`**: `basic` is the structural foundation (page, container, flex, fragment). Content display and layout orchestration are different responsibilities. The existing strategy doc explicitly states "this package will not grow further."

2. **Do NOT create a single `flux-renderers-extra` grab-bag**: The 19 platform-essential components have real architectural dependencies (composite-field imports, data-source reuse). Isolating them breaks the dependency direction constraints.

3. **Do NOT defer package creation**: Create `flux-renderers-content` and `flux-renderers-layout` before adding any W1/W3/W4 components. Retrofitting package boundaries after implementation is painful.

4. **Do NOT mix content and layout into one package**: Content (read-only display) and layout (structural orchestration) have different change frequencies and dependency profiles. The existing strategy doc correctly separates them.
