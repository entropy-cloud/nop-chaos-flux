> Audit Status: closed
> Audit Type: open-ended
> Mission: scheduling
> Remediation Plans: `docs/plans/2026-07-21-2100-1-dead-module-cleanup-scheduling-content.md` (F-51, F-52, F-53, F-59), `docs/plans/2026-07-21-2100-2-scheduling-package-hardening.md` (F-55, F-56), `docs/plans/2026-07-21-2100-3-convention-alignment-scheduling-content.md` (F-54, F-57, F-58)
> Date: 2026-07-21
> Source perspectives: Dead code cleaner + contract archaeologist + React 19 enforcer + CSS auditor + cross-boundary messenger

## Pre-check: Prior Audit Coverage

Verified against 50 prior findings across 6 audit rounds (2026-07-20 rounds 1-4: F-01–F-38; 2026-07-21 round 001: F-39–F-45; 2026-07-21 round 1920: F-46–F-50). 33 of 38 from the first batch resolved; 6 of 7 from 001 resolved; all 5 from 1920 unresolved.

Additionally ran the full test suite: **855/855 tests pass** (627 scheduling + 228 content/diff-view), zero failures, zero skipped, zero flaky indicators. The codebase is in a healthy "all tests green" state despite the issues below.

---

## F-51: `gantt/gantt-search.ts` is completely dead — zero imports anywhere in the codebase

**Location**: `packages/flux-renderers-scheduling/src/gantt/gantt-search.ts` (entire file, 11 lines)

**What**: The file exports a single function `searchTasks(tasks: GanttTask[], query: string): GanttTask[]`. A codebase-wide search for any import of `gantt-search` returns zero results — not even a test file imports it. The file compiles and ships as part of the package, but its function is never called.

**Why care**: Dead code in the production source tree creates:

1. Misleading API surface — a future developer searching for "how does Gantt search work" finds this module and assumes it's the active implementation, wasting time understanding dead code
2. Bundled dead weight — the 11 lines are minimal but set a precedent; no automated check prevents more dead code from accumulating
3. Missing feature — the Gantt UI has a filter/search bar (`filter-bar.tsx`), but it doesn't use `gantt-search.ts`. Either the filter bar's search implementation was replaced and the old file was left behind, or the file was pre-written in anticipation of a feature that was never wired

**Confidence**: Certain

---

## F-52: `gantt/components/multi-select.tsx` is dead — only imported by its own test file

**Location**: `packages/flux-renderers-scheduling/src/gantt/components/multi-select.tsx` (entire component)

**What**: The component exports `createMultiSelectState`, `handleMultiSelectClick`, `clearSelection`, `selectAll` — a multi-select interaction model for Gantt. The only production import of anything from this module is in `multi-select.test.ts` (its test file). Zero renderers, hooks, or other modules reference it.

S3.9 in `roadmap-scheduling.md` claims multi-select (Shift+Click range selection, batch drag) is "done", but the implementation code is entirely disconnected from the Gantt render pipeline.

**Why care**: This is an entire feature module that compiles, is tested, but is never wired to the UI. It represents:

1. **Delivered-but-unreachable feature** — work was done (code written, tested) but the integration step (connecting it to Gantt's keyboard handler, selection state, and drag system) was never completed
2. **Roadmap misrepresentation** — S3.9 claims "done" but the multi-select interaction is completely absent from the shipped component
3. **Maintenance burden** — tests may fail if the module API changes during refactoring, forcing unnecessary test fixes for dead code

**Confidence**: Certain

---

## F-53: `diff-view/components/diff-virtual-list.tsx` is dead — zero production imports

**Location**: `packages/flux-renderers-content/src/diff-view/components/diff-virtual-list.tsx` (entire file)

**What**: Exports `DiffVirtualList` (a `FixedSizeList` wrapper) and `shouldVirtualize` (threshold check). A codebase-wide search finds zero production imports. The diff-view renderer and split/unified view components handle virtual scrolling via `@tanstack/react-virtual`'s `useVirtualizer` directly, not through this module.

S9.6 in `roadmap-scheduling.md` claims "大文件虚拟滚动：virtualizationThreshold: 500" is "done". The code exists but is completely disconnected from the render pipeline.

**Why care**: Same pattern as F-51/F-52 — the module is compiled, exported, and tested but never instantiated. Three instances of this pattern across two packages suggest a systemic gap in the delivery process: code is written to meet work-item checkboxes, but integration is not verified.

**Confidence**: Certain

---

## F-54: Zero scheduling renderers use standard `@nop-chaos/flux-react` hooks — convention violation

**Location**: All 5 renderers across scheduling and content/diff-view packages

| Renderer     | File                     | flux-react hooks used                       | Standard hooks mandated by AGENTS.md                                                                                                                             |
| ------------ | ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gantt        | `gantt.tsx`              | `RenderRegionHandle` (type only)            | `useRendererRuntime`, `useRenderScope`, `useScopeSelector`, `useActionDispatcher`, `useCurrentForm`, `useCurrentPage`, `useRenderFragment`, `useCurrentNodeMeta` |
| KanbanBoard  | `kanban-board.tsx`       | NONE                                        | Same 8 hooks                                                                                                                                                     |
| Calendar     | `calendar.tsx`           | NONE                                        | Same 8 hooks                                                                                                                                                     |
| BarcodeInput | `barcode-input.tsx`      | `useCurrentForm`, `useInputComponentHandle` | Same 8 hooks (2/8)                                                                                                                                               |
| DiffView     | `diff-view-renderer.tsx` | NONE                                        | Same 8 hooks                                                                                                                                                     |

**What**: AGENTS.md explicitly mandates: "**NEVER** access stores directly in renderers. Use the standard hooks" and lists 8 hooks. Only barcode-input uses any (2 of 8). The other three scheduling renderers and the diff-view renderer use zero flux-react hooks. They rely entirely on direct `props.props`/`props.meta`/`props.events`/`props.meta` destructuring and custom local hooks.

Additionally, ALL five renderers miss the `helpers` property in their destructuring — `helpers` provides `render()`, `evaluate()`, `dispatch()` for runtime operations:

```typescript
// Current pattern (gantt.tsx:46)
const { props: resolved, meta, regions, events } = props; // missing helpers

// Mandated pattern
const { props: resolved, meta, regions, events, helpers } = props;
```

**Why care**: This is an explicit convention violation. The project's AGENTS.md says "NEVER create ad-hoc React contexts or prop-drilling chains for data these hooks already provide." The scheduling renderers don't create ad-hoc contexts (that was fixed), but they also don't use the standard hooks — meaning they can't access runtime, scope, dispatch, or form data through the established patterns.

This creates two problems:

1. **Portability**: If the runtime changes how `props.props`/`meta`/etc. are provided, all scheduling renderers break silently. Renderers using standard hooks are insulated by the hook abstraction.
2. **Maintenance inconsistency**: Every other renderer package follows the convention (basic, form, form-advanced, data, layout, mobile). Scheduling and content are outliers.

**Confidence**: Certain

---

## F-55: 6 CSS classes used in TSX have no definition in any stylesheet

**Location**: Multiple files

| Missing class                     | Used in                    | Line(s) |
| --------------------------------- | -------------------------- | ------- |
| `nop-kanban-column-resize-handle` | `kanban-column-header.tsx` | 44, 66  |
| `nop-kanban-card-tag`             | `kanban-card-tags.tsx`     | 51      |
| `nop-kanban-card-members`         | `kanban-card-tags.tsx`     | 64      |
| `nop-kanban-card-member`          | `kanban-card-tags.tsx`     | 69      |
| `nop-input-text`                  | `barcode-input.tsx`        | 151     |
| `nop-input-group`                 | `barcode-input.tsx`        | 153     |

**What**: These classes are applied to DOM elements via `className={...}` but have no corresponding CSS rule in any stylesheet in the entire `packages/` tree. They render as bare class names with zero visual effect.

**Why care**:

- `nop-kanban-column-resize-handle`: The column resize feature (S7.1, claimed "done") has a drag handle with no visible styling — users see no resize affordance. It may appear as an invisible 1px-wide hot zone.
- `nop-kanban-card-tag`/`nop-kanban-card-members`/`nop-kanban-card-member`: Card tag pills and member avatars render without any visual distinction — they appear as plain unstyled text, not pills or chips.
- `nop-input-text`/`nop-input-group`: These classes are expected from the form renderer's styling system. The barcode-input expects inherited CSS from form renderers that may not be loaded in all contexts. If used outside a form context (standalone), the input is completely un styled.

**Confidence**: Certain

---

## F-56: 21 CSS definitions in scheduling stylesheets are dead — zero TSX usage

**Location**: `calendar.css`, `gantt.css`, `kanban.css`

**Breakdown by sub-domain**:

**Calendar (13 dead definitions)**:

- `.nop-calendar-virtual-scroll`, `.nop-calendar-skeleton`, `.nop-calendar-skeleton-row`, `.nop-calendar-empty`, `.nop-calendar-skeleton-matrix`, `.nop-calendar-skeleton-cell`, `.nop-calendar-empty-state`, `.nop-batch-preview-grid`, `.nop-calendar-type-selector-overlay`, `.nop-calendar-confirm-overlay`, `.nop-batch-scheduler-date-input`, `.nop-calendar-drag-over`, `.nop-cross-day-highlight`

**Gantt (4 dead definitions)**:

- `.nop-gantt-bar-ghost`, `.nop-gantt-drop-indicator`, `.nop-gantt-empty`, `.nop-gantt-bar-milestone-stroke`

**Kanban (4 dead definitions)**:

- `.nop-kanban-dragging`, `.nop-kanban-drop-indicator`, `.nop-kanban-search`, `.nop-kanban-search:focus`

**What**: These CSS rules are defined in the stylesheet but no TSX/TS file applies them via `className`. They serve zero visual purpose at runtime.

**Why care**:

1. **Bundle bloat**: An estimated ~2-3 KB of CSS is shipped but never applied. The scheduling CSS totals ~713 lines; ~8-10% is dead.
2. **Maintenance confusion**: A future developer adding a skeleton loader might write duplicate CSS not realizing `.nop-calendar-skeleton` already exists and is unused. Or they might refactor skeleton handling and break the dead-but-still-present CSS, wasting debugging time.
3. **Feature ambiguity**: `.nop-gantt-drop-indicator` shows intent for drag-and-drop visual feedback, but the actual drag system (`useGanttDrag`) doesn't apply this class. Either the CSS was written pre-emptively (and drag indicators are missing) or the feature was removed but CSS was not cleaned up.

**Confidence**: Certain

---

## F-57: `diff-line.tsx` uses `dangerouslySetInnerHTML` on user-supplied content — safe today, fragile pattern

**Location**: `packages/flux-renderers-content/src/diff-view/components/diff-line.tsx:47-50`

**What**: The `DiffLineComponent` renders user-supplied diff content via `dangerouslySetInnerHTML`:

```tsx
<span className="nop-diff-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
```

where `contentHtml` comes from `highlightedHtml` (prop from parent) or `generateLineContentHtml(content, type, inlineTokens)`.

**Current safety audit**: Both code paths properly escape HTML. `escapeHtml()` in `syntax-highlight.ts` escapes `&<>"'`. `generateLineContentHtml` calls `escapeHtml()` first, then wraps with known-safe `<span>` tags. The `highlight()` function only produces safe HTML by passing all user text through `escapeHtml()`. **Not currently exploitable.**

**Why care**: The pattern is fragile for three reasons:

1. **Single-point-of-failure**: If any future change to `generateLineContentHtml` or the `highlight()` / `syntax-highlight.ts` code removes the `escapeHtml` call (e.g., to "optimize" by assuming input is always trusted), the diff-view becomes a stored XSS vector. There is no runtime CSP or sanitizer as a second layer.
2. **Data flow opacity**: The `contentHtml` prop is passed in from parent components (`diff-split-view.tsx`, `diff-unified-view.tsx`). A reader cannot tell from `diff-line.tsx` alone whether the HTML is safe — they must trace through two layers of function calls to verify escaping.
3. **Schema data source**: Diff content comes from the schema (`oldContent`/`newContent`), which in a low-code platform may come from untrusted remote sources. The current code handles this correctly, but the pattern invites regression.

**Contrast with F-53 in prior audit**: The diff-view F-20 reported "zero CSS class definitions" — this is a different class of issue (security-sensitive pattern, not CSS) and was not covered.

**Recommended fix**: Add an explicit comment on line 49 explaining why `dangerouslySetInnerHTML` is safe here (both paths escape), so future maintainers know not to remove escaping. Better: centralize the sanitized HTML construction and ban raw `dangerouslySetInnerHTML` in code review.

**Confidence**: Likely (the risk is in future regressions, not current exploitability)

---

## F-58: `diff-line.tsx` uses `React.memo` — violates React 19 / React Compiler convention (P3 - convention)

**Location**: `packages/flux-renderers-content/src/diff-view/components/diff-line.tsx:17`

**What**: The `DiffLineComponent` is wrapped in `React.memo` with a custom comparison function `areDiffLinePropsEqual`. The project's React 19 baseline (AGENTS.md, `react19-best-practices-review.md`) states:

- "React Compiler automatically handles memoization"
- "Do **not** add `useCallback` or `useMemo` by default"
- "Hand-written memoization is redundant unless accompanied by `eslint-disable-next-line react-compiler/react-compiler`"

This file has no `eslint-disable` annotation for the compiler. The custom comparator is 12 lines and manually compares 8 props — exactly the type of work React Compiler handles automatically.

**Why care**: While functionally harmless (React Compiler treats redundant wrappers as identity-stable no-ops), this contradicts published coding conventions. Combined with F-44 (45+ useCallback/useMemo in scheduling), it shows the scheduling and content packages were written without React Compiler awareness. The diff-view `React.memo` is just one additional instance.

**Confidence**: Certain

---

## F-59: 855 tests pass — but this masks dead code coverage gaps

**Location**: Entire `@nop-chaos/flux-renderers-scheduling` and `@nop-chaos/flux-renderers-content` test suites

**What**: All 627 scheduling tests + 228 content/diff-view tests pass. However:

- `gantt-search.ts` has zero tests (dead code with no coverage)
- `multi-select.tsx` tests exist but only test the module in isolation — no integration test verifies it's connected to the Gantt UI
- `diff-virtual-list.tsx` has no tests (dead code with no coverage)
- The coverage threshold in `vitest.config.ts` is now enforced via `--coverage` flag (F-38 fixed), but the threshold is 80%, which permits the dead code to be uncovered

**Why care**: The all-green test suite creates a false sense of completeness. Three entire modules (`gantt-search.ts`, `multi-select.tsx`, `diff-virtual-list.tsx`) are untested or tested-only-in-isolation. Combined with the `--passWithNoTests` flag, empty or dead module test files would silently pass. The 80% threshold doesn't guard against modules that are compiled but never wired.

**Confidence**: Certain

---

## Cross-Round Summary

| ID   | Severity | File                                                                    | Issue                                                                                    |
| ---- | -------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| F-51 | P2       | `gantt/gantt-search.ts` (entire)                                        | Completely dead file — zero imports across codebase                                      |
| F-52 | P2       | `gantt/components/multi-select.tsx` (entire)                            | Feature component only imported by its own test — S3.9 "done" but unwired                |
| F-53 | P2       | `diff-view/components/diff-virtual-list.tsx` (entire)                   | Dead virtual-list wrapper — S9.6 "done" but unwired                                      |
| F-54 | P2       | All 5 renderer entry files                                              | Zero standard `@nop-chaos/flux-react` hooks used; all miss `helpers` destructuring       |
| F-55 | P2       | `kanban-column-header.tsx`, `kanban-card-tags.tsx`, `barcode-input.tsx` | 6 CSS classes used in TSX but no CSS definition exists                                   |
| F-56 | P2       | `calendar.css`, `gantt.css`, `kanban.css`                               | 21 CSS definitions with zero TSX usage (dead CSS)                                        |
| F-57 | P3       | `diff-view/components/diff-line.tsx:47-50`                              | `dangerouslySetInnerHTML` on user content — safe today via `escapeHtml`, fragile pattern |
| F-58 | P3       | `diff-view/components/diff-line.tsx:17`                                 | `React.memo` with custom comparator — redundant with React Compiler                      |
| F-59 | P3       | Full test suite                                                         | 855 tests pass but 3 dead modules flow through the test gap                              |

**Totals**: 9 new findings (0 P0, 4 P2, 3 P3)

**Cumulative (all scheduling audit rounds)**: 59 findings (50 prior + 9 new). 39 resolved, 20 open.

### Key Patterns Detected

1. **Dead/stub module syndrome** (F-51, F-52, F-53): Three modules across two packages that are compiled, sometimes tested, but never wired to any renderer. The common cause: work items were completed at the module level but integration was never verified. The roadmap reports these as "done". Only F-14 (GanttEditor dead) was previously caught — three more instances have now been found through import-graph analysis.

2. **CSS class asymmetry** (F-55, F-56): 6 classes used but not defined (missing visual features), 21 classes defined but not used (dead CSS). The scheduling package's CSS has drifted from its TSX code — features were added to JSX without corresponding CSS, and CSS was written for features that were never wired.

3. **Hook convention isolation** (F-54): The scheduling and content packages are the ONLY renderer packages that don't use `@nop-chaos/flux-react` hooks. Every other package (basic, form, form-advanced, data, layout, mobile) follows the convention. This is not a random oversight — it suggests these packages were created when the hook API was still being defined, or by a developer unfamiliar with the convention.

### Blindness Self-Assessment

This round found the above issues by:

- Import-graph scanning (grep for import paths) — caught 3 dead modules
- CSS cross-reference (TSX class names vs. stylesheet definitions) — caught 6 missing + 21 dead definitions
- Import list analysis — caught missing flux-react hooks
- Security pattern review — caught dangerous innerHTML pattern

What this round likely missed:

1. **Bundle composition**: Did not run `vite build --mode analyze` again to measure whether tree-shaking removes the 3 dead modules from production bundles
2. **Accessibility**: Did not audit keyboard navigation, ARIA roles, or screen reader output for any scheduling component
3. **Edge case testing**: Did not test calendar with zero resources, Gantt with circular dependency links, or Kanban with 10,000 cards
4. **Cross-package type safety**: Did not verify `RendererComponentProps<GanttSchema>` generic narrowing at the boundary between flux-core, flux-react, and scheduling
5. **i18n coverage of recently added keys**: Did not verify that the i18n fixes for Calendar shift types (reported as partially fixed in F-19) are complete and cover all user-facing strings
6. **Error boundary coverage**: Did not verify that error boundaries exist for each scheduling sub-domain
7. **Performance profiling at scale**: Did not run the O(n²) critical-path algorithm or Gantt store revision system under realistic load

Best starting point for next round: E2E browser test execution measuring actual rendering correctness + performance profiling of Gantt store reactivity + bundle composition analysis confirming tree-shaking removes the 3 dead modules.
