# Phase 2: Independent Review Results

## Review Methodology

Each dimension's Phase 1 findings were independently re-verified by a separate agent that read actual source code and applied calibration patterns. Verdicts: CONFIRMED, DOWNGRADED, or REJECTED.

## P1 Findings Review

### Dim 04 — Word Editor EditorCanvas remount → **CONFIRMED P1**
- `word-editor-renderers/editor-canvas.tsx:148` useEffect deps include `charts`/`codes`
- Cleanup calls `bridge.unmount()` destroying editor + inserted content
- Every chart/code insertion triggers full teardown → rebuild from `initialDocument`
- Undo/redo history and cursor position also destroyed

### Dim 19 — submitForm bare catch → **CONFIRMED P1**
- `flux-runtime/action-adapter.ts:166-170` bare catch replaces ALL errors with "Form not found: ${formId}"
- If form IS found but invoke throws (validation/network/permission error), real error is lost
- Makes debugging form submission failures extremely difficult

### Dim 19 — compile-node fallback → **DOWNGRADED to P2**
- `compile-node.ts:59-69` calls `reportDiagnostic()` before fallback — error IS reported
- Fallback to raw string is intentional degraded-mode behavior

### Dim 19 — value-adapter silent swallow → **DOWNGRADED to P2**
- `value-adapter.ts:235-237` logs `console.warn` before fallback
- Behavior explicitly tested in `value-adapter.test.ts:119-155`

### Dim 14 — All 6 original P1s → **DOWNGRADED**
- flux-formula: 10 test files exercise public API covering all 8 internal modules
- flux-action-core: dispatcher tests exercise action-execution; runtime adapter tests cover built-in-actions
- flux-runtime validation: 6+ integration test files cover validation lifecycle
- flux-react node-renderer: tested through schema-renderer integration tests
- spreadsheet E2E: Downgraded to P2 (unit tests exist, E2E gap is real but not critical)
- flow-designer-renderers: Downgraded to P2 (core logic well-tested, visual components lower coverage typical)

## P2 Findings Summary

| Dimension | P2 Confirmed | P2 Downgraded | Key Items |
|-----------|-------------|---------------|-----------|
| 01 Dependency Graph | 4 | 0 | Ghost deps: word-editor→theme-tokens, 4 pkgs→flux-runtime, 4 pkgs→react-dom |
| 02 Module Responsibility | 0 | 2→P3 | schema-compiler already decomposed; form-store below limit |
| 04 State Ownership | 3 | 1 rejected | object-field, table-quick-edit, designer-page dual states |
| 05 Reactive Precision | 0 | 3→P3 | All selectors have proper equality guards |
| 06 Async Safety | 4 | 1→P3 | validateField void, source-registry warn, refreshDerivedState, initAction |
| 07 Lifecycle | 1 | 0 | Surface dual-effect overlap |
| 08 Validation | 1 | 1→P3 | Runtime-registered hidden fields skip hiddenFieldPolicy |
| 09 Renderer Contract | 4 | 0 | condition-builder, tag-list, key-value, array-editor missing className |
| 10 Styling | 0 | 2→P3 | Playground-specific colors; Pattern 8 widget layout |
| 11 UI Components | 1 | 1→P3 | WrappedFieldAction; ToolbarButton is deliberate |
| 12 Field & Slot | 0 | 2→P3 | Table header/footer works via fallback; xxxAction as prop is intentional |
| 13 Type Safety | 4 | 0 | __actionScope hidden channel, node-renderer as any, condition-builder any, Kbd→Mouse cast |
| 15 Security & Perf | 4 | 1 rejected | Cascade counter bug, initAction swallow, Select no virtualization, full broadcast |
| 16 Doc-Code | 0 | 2→P3 | Stale reference in negative context; internal hook not in docs |
| 17 Naming | 0 | 1→P3 | WrappedFieldAction clear from context |
| 20 Accessibility | 3 | 3→P3 | RadioGroup aria-required, CheckboxGroup role, ConditionBuilder ARIA |

## Overall Risk Assessment

| Risk Level | Dimensions |
|------------|-----------|
| MEDIUM | 04 (P1 remount), 06 (async swallowing), 09 (contract gap), 13 (type safety), 15 (cascade bug), 19 (P1 submitForm), 20 (WCAG) |
| LOW | 01, 02, 03, 05, 07, 08, 10, 11, 12, 14, 16, 17 |
