# Deep Audit Summary — 2026-05-06

**Scope**: Full 20-dimension deep audit of nop-chaos-flux codebase
**Method**: Iterative deep-dig (Phase 1) + independent code-verified review (Phase 2)
**Calibration**: 9 calibration patterns from `docs/references/deep-audit-calibration-patterns.md` applied

---

## Executive Summary

The codebase is fundamentally sound. No P0 findings. **Two P1 bugs** confirmed with clear fixes. 26 P2 findings confirmed across 10 dimensions, with 18 P2s downgraded after independent review. The most actionable cluster is the **async error swallowing** pattern (Dim 06) and the **widget renderer className contract gap** (Dim 09).

---

## P1 Findings (2)

### P1-1: Word Editor — Chart/code insertion triggers full editor remount

- **File**: `packages/word-editor-renderers/src/editor-canvas.tsx:148`
- **Root cause**: `charts` and `codes` in useEffect dependency array
- **Impact**: Every chart/code insertion destroys the editor (bridge.unmount), loses inserted content, undo/redo history, and cursor position
- **Fix**: Remove `charts`/`codes` from deps, pass via refs instead
- **Dimension**: 04 (State Ownership)

### P1-2: submitForm bare catch masks real errors as "Form not found"

- **File**: `packages/flux-runtime/src/action-adapter.ts:166-170`
- **Root cause**: Bare `catch {}` replaces all exceptions (including from `invoke('submit', ...)`) with generic "Form not found"
- **Impact**: Form submission validation/network/permission errors are irreversibly replaced with misleading message; original cause lost
- **Fix**: Narrow catch to resolve failures only, or preserve original error as `cause`
- **Dimension**: 19 (Error Propagation)

---

## P2 Findings by Theme (26 confirmed)

### Theme 1: Async Error Swallowing (6 items across Dim 06, 15, 19)

| #   | File                                                                        | Issue                                                                                        |
| --- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | `flux-renderers-form/src/renderers/form.tsx:271`                            | `initAction .catch(() => undefined)` silently discards all init errors                       |
| 2   | `flux-renderers-form/src/renderers/form.tsx:271`                            | Same code: `validateField void` discards async exceptions                                    |
| 3   | `flux-runtime/src/async-data/source-registry.ts:204`                        | `refresh().catch(console.warn)` — stale data displayed with no error indication              |
| 4   | `report-designer-core/src/core.ts:349`                                      | `void refreshDerivedState().catch(() => undefined)` — designer broken state with no feedback |
| 5   | `flux-runtime/src/async-data/source-registry.ts:198`                        | `sourceCascadeDepth` counter underflow weakens cascade protection                            |
| 6   | `flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:100` | `runSave` catch with only callback, no UI error state                                        |

### Theme 2: Renderer Contract — Missing className Merge (4 items, Dim 09)

| #   | File                        | Root element                                                   |
| --- | --------------------------- | -------------------------------------------------------------- |
| 1   | `condition-builder.tsx:110` | `cn('nop-condition-builder')` — missing `props.meta.className` |
| 2   | `tag-list.tsx:85`           | `cn('nop-tag-list', 'flex flex-wrap gap-2.5')` — missing merge |
| 3   | `key-value.tsx:357`         | `cn('nop-key-value', 'grid gap-3')` — missing merge            |
| 4   | `array-editor.tsx:294`      | `cn('nop-array-editor', 'grid gap-3')` — missing merge         |

**Fix**: Add `props.meta.className` to each `cn()` call. Same pattern, batch PR.

### Theme 3: Type Safety Gaps (4 items, Dim 13)

| #   | File                                                    | Issue                                                                            |
| --- | ------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `use-surface-renderer.ts:102`                           | `__actionScope` hidden `any` property on dispatch — fragile coupling             |
| 2   | `node-renderer.tsx:246,272,285`                         | `as any` casts on region.node and action in critical render path                 |
| 3   | `condition-builder/types.ts:144,156`                    | `fields?: any[]` / `operators?: any` when `ConditionField[]` exists in same file |
| 4   | `wrapped-field-action.tsx:87` + `toolbar-button.tsx:40` | `KeyboardEvent → MouseEvent` assertion                                           |

### Theme 4: Ghost Dependencies (8 items, Dim 01)

| #   | Package                                                            | Dependency              | Usage             |
| --- | ------------------------------------------------------------------ | ----------------------- | ----------------- |
| 1   | word-editor-renderers                                              | @nop-chaos/theme-tokens | Zero imports      |
| 2-5 | renderers-basic, form-advanced, data, word-editor                  | @nop-chaos/flux-runtime | Test-only imports |
| 6-9 | word-editor, flow-designer, spreadsheet, report-designer renderers | react-dom               | Zero src/ imports |

### Theme 5: Accessibility Gaps (3 items, Dim 20)

| #   | Component        | Missing                                             |
| --- | ---------------- | --------------------------------------------------- |
| 1   | RadioGroup       | `aria-required` on control, `role="alert"` on error |
| 2   | CheckboxGroup    | `role="group"`, `aria-required`                     |
| 3   | ConditionBuilder | ARIA role structure for nested groups               |

### Theme 6: Validation & State (3 items)

| #   | File                                 | Issue                                                                                 |
| --- | ------------------------------------ | ------------------------------------------------------------------------------------- |
| 1   | `form-runtime-validation.ts:435-449` | Runtime-registered hidden fields skip `hiddenFieldPolicy.validateWhenHidden` (Dim 08) |
| 2   | `use-surface-renderer.ts:230-264`    | Dual-effect overlap causes close-reopen during scope change (Dim 07)                  |
| 3   | `wrapped-field-action.tsx:92-103`    | Should use `<Button>` from `@nop-chaos/ui` (Dim 11)                                   |

---

## P2 Findings Downgraded After Review (18)

| Dimension                | Count   | Reason                                              |
| ------------------------ | ------- | --------------------------------------------------- |
| 02 Module Responsibility | 2       | Already decomposed / below line limit               |
| 05 Reactive Precision    | 3       | All selectors have proper equality guards           |
| 10 Styling               | 2       | Playground-specific / Pattern 8 compliant           |
| 12 Field & Slot          | 2       | Works via fallback / intentional design             |
| 14 Test Coverage         | 4→P2/P3 | Indirect coverage through integration tests         |
| 16 Doc-Code              | 2       | Stale reference in negative context / internal hook |
| 17 Naming                | 1       | Clear from usage context                            |
| 20 Accessibility         | 3       | aria-label exists / generic label present           |

---

## Dimension Risk Map

| Risk       | Dimensions                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- |
| **MEDIUM** | 04 (P1 remount), 06 (async swallowing), 09 (contract gap), 13 (type safety), 15 (cascade bug), 19 (P1 submitForm), 20 (WCAG) |
| **LOW**    | 01, 02, 03, 05, 07, 08, 10, 11, 12, 14, 16, 17, 18                                                                           |

---

## Recommended Fix Priority

1. **P1-1**: Word editor useEffect deps — high user impact, simple fix
2. **P1-2**: submitForm bare catch — debugging blocker, simple fix
3. **P2 Theme 1**: Async error swallowing — add `.catch()` logging/monitoring across 6 locations
4. **P2 Theme 2**: Widget renderer className — batch PR, 4 identical fixes
5. **P2 Theme 3**: Type safety — `__actionScope` hidden channel is architectural debt
6. **P2 Theme 5**: Accessibility — CheckboxGroup/RadioGroup/ConditionBuilder ARIA
7. **P2 Theme 4**: Ghost dependencies — package.json cleanup

---

## Files

All dimension findings saved to `docs/analysis/2026-05-06-deep-audit-full/`:

- `01-dependency-graph.md` through `20-accessibility.md` (per-dimension details)
- `review-results.md` (Phase 2 independent review verdicts)
- `summary.md` (this file)
