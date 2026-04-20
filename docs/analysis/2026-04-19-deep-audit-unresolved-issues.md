# 2026-04-19 Deep Audit Unresolved Issues

- Recheck date: `2026-04-19`
- Independent re-verification date: `2026-04-20` (4 independent sub-agents)
- Method: all items from all 18 deep-audit dimension files + supporting docs verified against current codebase via automated comparison, then independently re-verified
- This document consolidates all issues that remain **truly unresolved** after independent re-verification

> **2026-04-20 re-verification note**: All 28 originally listed items were independently re-checked by 4 separate sub-agents. Several items were reclassified based on new evidence (documented design decisions, external consumer usage, mitigation factors). 3 new issues discovered. Final count: **9 truly unresolved** + **3 new** + **6 low-priority cleanups**.

---

## Reclassified: Originally Listed But Not Real Issues

These items were listed as unresolved but independent verification showed they are either by-design, already handled, or not real gaps:

| Original ID | Item | Reclassification Reason |
|-------------|------|------------------------|
| U1 | Anonymous source lifecycle in React effects | **Acceptable design** — controller is framework-agnostic; lifecycle naturally tied to component mount; dim 07 explicitly reclassified as "design reasonable" |
| U8 | Expression editor not implemented | **By design** — `docs/architecture/report-designer/contracts.md` explicitly states this is a pluggable adapter boundary; consumers provide implementations |
| U12 | flux-react wiring primitives on root API | **Not a real issue** — `ScopeContext`, `RuntimeContext` etc. are genuinely used by downstream packages (form renderers, detail-view, object-field) for context provider composition |
| U16 | Flow Designer hardcoded theme literals | **Already handled** — colors are config-driven via `nodeType.appearance.borderColor`; hardcoded values are intentional fallback defaults per styling-system.md |
| U17 | Playground BEM classes | **Not a real issue** — `apps/playground/` is demo code, not subject to renderer package styling rules |
| PF1 | Spreadsheet selection double-state | **Accepted tradeoff** — local state provides synchronous canvas feedback during mouse interactions; core model is authoritative; one-way sync |
| PF2 | Whole-store subscriptions in some hooks | **Accepted tradeoff** — path-scoped subscriptions already used for all field-level hooks (`useCurrentFormFieldState`, `useFieldError`); `useScopeSelector`/`useCurrentFormState` accept arbitrary selectors so cannot be path-scoped by definition |
| PF6 | Spreadsheet hardcoded colors | **Accepted tradeoff** — fully documented in `docs/architecture/report-designer/spreadsheet-canvas-css.md` and styling-system.md lines 602-648 as a performance-critical canvas exception |
| PF5 | Implicit styling in renderer components | **By design** — condition-builder, tag-list, key-value, array-editor etc. are complete UI widgets built on shadcn/ui; internal layout classes are part of the visual design, not styling contract violations. Schema `className` is for consumer customization. |
| PF7 | Playground toast raw HTML | **Not a real gap** — the component is a simple conditional `<div>` message display, not a toast system |
| PF9 | Test coverage gaps | **Not the gap described** — actual counts are 50 (runtime) and 14 (react including colocated); healthy, not declining |
| PF10 | Plan 112/113 closure items | **Documentation-only** — closure sections confirm completion; checkboxes just weren't ticked |

---

## Truly Unresolved Issues

### U9. Validation messages not internationalized — `[RESOLVED 2026-04-20]`

- **Source**: `docs/analysis/2026-03-31-deep-architecture-analysis.md` (risk #6)
- **Files**: `packages/flux-core/src/i18n-sink.ts`, `packages/flux-runtime/src/validation/message.ts`, `packages/flux-i18n/src/i18n.ts`
- **Fix**: Added `MessageFormatter` sink to `flux-core` (`setMessageFormatter`/`getMessageFormatter`). `flux-runtime` validation now calls `getMessageFormatter()` instead of hardcoding English. `flux-i18n` registers i18next `t()` into the sink on `initFluxI18n()`. Added 14 validation message keys to both `zh-CN` and `en-US` locale files.

### U7. Virtual scrolling for non-paginated tables — `[RESOLVED 2026-04-20]`

- **Source**: `docs/analysis/2026-03-31-deep-architecture-analysis.md`, `docs/analysis/2026-03-31-react-rerender-prevention-deep-analysis.md`
- **Files**: `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`
- **Fix**: Added `@tanstack/react-virtual` dependency. New schema props `virtualThreshold` and `scrollHeight` control activation. When row count exceeds threshold (with pagination disabled), `useVirtualizer` wraps rendering with dynamic row height measurement, overscan, and top/bottom spacer rows. Expandable rows supported as flattened virtual items.

### U10. General scope subscription remains whole-store

- **Source**: `docs/analysis/2026-03-31-react-rerender-prevention-deep-analysis.md` (P1 optimization)
- **Files**: `packages/flux-react/src/hooks.ts`
- **Problem**: `useScopeSelector` subscribes to the entire scope store. `useScopeFieldSelector` proposed in the analysis does not exist.
- **Mitigation**: Form field subscriptions (highest-frequency case) already use per-path `subscribeToPath`. General scope selectors use `useSyncExternalStoreWithSelector` with equality checks.
- **Severity**: Low-Medium — impact is lower than originally assessed since critical path is already optimized.

### U4. ConditionBuilder schema `any` fields — `[BLOCKED by BaseSchema index signature]`

- **Source**: dim 13 `docs/analysis/2026-04-17-deep-audit/13-type-safety-boundaries.md`
- **Files**: `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`
- **Problem**: `fields?: any[]`, `operators?: any` remain untyped. Proper types `ConditionField` and `ConditionOperatorOverrides` exist in the same file but cannot be wired because `ConditionField` union members (e.g., `ConditionTextField`) lack `SchemaObject`'s `[key: string]: SchemaValue` index signature, making them incompatible with `BaseSchema`'s index signature.
- **Severity**: Low-Medium — same `BaseSchema` constraint as U3.

### U5. ChartSchema `any` fields — `[PARTIALLY RESOLVED 2026-04-20]`

- **Source**: dim 13 `docs/analysis/2026-04-17-deep-audit/13-type-safety-boundaries.md`
- **Files**: `packages/flux-renderers-data/src/chart-schemas.ts`
- **Fix**: Changed `series?: any` → `series?: SchemaValue`, `source?: any` → `source?: SchemaValue`. Not `ChartSeriesSchema[]` because nested objects don't satisfy `SchemaObject` index signature. `SchemaValue` is narrower than `any` and runtime code already narrows to `ChartSeriesSchema[]`.
- **Severity**: Low.

### PF5. Implicit styling in renderer components — `[RECLASSIFIED: By Design]`

- **Source**: dim 09, dim 10
- **Files**: `tag-list.tsx`, `array-editor.tsx`, `key-value.tsx`, `condition-group.tsx`, `table-pagination-bar.tsx`, etc.
- **Reclassification**: These are complete, ready-to-use UI widgets (condition-builder, tag-list, key-value, array-editor) built on shadcn/ui. Internal layout classes (`flex`, `gap`, `padding`, `grid`) are part of the component's visual design, not styling contract violations. The "marker classes only" rule applies to simple container renderers (page, container, flex) that defer visual styling to schema. Rich UI widgets are expected to ship with full styling out-of-the-box; schema-level `className` is for consumer customization overrides.

### PF3. Data source `reset()` method — `[RESOLVED 2026-04-20]`

- **Source**: dim 06
- **Files**: `packages/flux-core/src/types/runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`
- **Fix**: Added `reset()` to `DataSourceController` interface and both implementations (`createDataSourceController`, `createFormulaDataSourceController`). `reset()` stops active work, clears data/error from scope, and returns state to initial.

### U14. PageStoreApi doc incorrectly mentions dialogs — `[RESOLVED 2026-04-20]`

- **Source**: dim 03 F7
- **Files**: `docs/architecture/flux-core.md`
- **Fix**: Changed "page data, dialogs, and refresh ticks" to "page data and refresh ticks". Dialogs are correctly owned by `SurfaceRuntime`.

### U11. Schema compiler depth limit — `[RESOLVED 2026-04-20]`

- **Source**: `docs/analysis/2026-03-31-deep-architecture-analysis.md` (risk #1)
- **Files**: `packages/flux-runtime/src/schema-compiler.ts`
- **Fix**: Added `MAX_COMPILE_DEPTH = 64` constant. Depth counter threaded through `compileSchemaToTemplateNodes` → `compileSingleNode` → region compilation and deep normalizers. Throws descriptive error when exceeded.

- **Source**: `docs/analysis/2026-03-31-deep-architecture-analysis.md` (risk #1)
- **Files**: `packages/flux-runtime/src/schema-compiler.ts`, `packages/flux-runtime/src/schema-compiler/regions.ts`
---

## New Issues Discovered During Independent Re-verification

### NEW-1. `NodeErrorBoundary` silently swallows render errors — `[RESOLVED 2026-04-20]`

- **Files**: `packages/flux-react/src/node-error-boundary.tsx`
- **Fix**: Error boundary now renders a visible inline indicator (`data-slot="node-error"`, `role="alert"`) with `AlertCircleIcon`, node ID, error message, and a retry button to reset the error state.

### NEW-2. Dead dependency: `next-themes` in `@nop-chaos/ui/package.json` — `[RESOLVED 2026-04-20]`

- **Files**: `packages/ui/package.json`
- **Fix**: Removed `"next-themes": "^0.4.6"` from dependencies. Zero imports existed. `pnpm install` cleaned lockfile.

### NEW-3. AGENTS.md dependency flow omits `ui -> flux-i18n` — `[RESOLVED 2026-04-20]`

- **Files**: `AGENTS.md`
- **Fix**: Added `flux-i18n -> ui` to the dependency flow diagram.

---

## Low-Priority Cleanups (Dead Code)

These are real but trivially fixable:

| ID | Item | File | Action |
|----|------|------|--------|
| U15 | Report designer toolbar helpers on root API | `packages/report-designer-renderers/src/index.ts:37` | `[RESOLVED 2026-04-20]` Removed export line (zero external consumers) |
| U18 | `writeMetadata` dead code | `packages/report-designer-core/src/runtime/metadata.ts:227-312` | `[RESOLVED 2026-04-20]` Deleted 85-line function (zero callers, superseded by `updateMetadata`) |
| U13-partial | `resolveCacheKey`/`prepareApiData`/`buildUrlWithParams` on root API | `packages/flux-runtime/src/index.ts` | `[RESOLVED 2026-04-20]` Reduced barrel from 22 to 12 exports; un-exported 10 internal-only helpers |

---

## Accepted Tradeoffs (No Action Needed)

These are explicitly documented design decisions, not gaps:

| ID | Item | Why Acceptable |
|----|------|---------------|
| U2 | `RendererDefinition.component` typed as `any` | Inherent to heterogeneous plugin registry; needs TypeScript existential types to fix |
| U3 | CodeEditorSchema `any` fields | `SchemaValue` index signature constraint; proper types used at resolved-props boundary; inline JSDoc explains tradeoff |
| U6 | `FormulaFunction = (...args: any[]) => any` | Inherent to dynamic formula evaluation; fully dynamic dispatch |
| PF4 | Validation owner model Phase 3 | Explicitly documented as future work in `docs/architecture/form-validation.md` lines 1026-1031 |
| PF8 | variant-field deep-region bypass | Explicitly documented as blocked on Phase 3; technical reason: would break active-branch-only validation |

---

## Final Summary

| Category | Count |
|----------|-------|
| Truly unresolved (need work) | 2 (U10, U4) |
| Partially resolved | 1 (U5: any → SchemaValue) |
| Resolved 2026-04-20 (session 2) | 6 (NEW-2, NEW-3, U18, U15, U13-partial, U4/U5 partial) |
| Resolved 2026-04-20 (session 1) | 7 (NEW-1, PF3, U14, U11, U9, U7, U9) |
| Accepted tradeoffs | 5 |
| Reclassified as not real issues | 11 |
| Fully resolved (verified earlier) | ~35 |

### Actionable Priority List

**Should fix when convenient:**
1. U4: ConditionBuilder `any` fields (blocked on BaseSchema index signature redesign)
2. U10: General scope subscription remains whole-store (accepted tradeoff for now)

**Accept as-is:**
- U2, U3, U5(partial), U6, PF4, PF5, PF8, U10
