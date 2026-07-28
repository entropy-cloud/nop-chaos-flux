> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: audit-remediation

# Multi-Dimensional Audit: `audit-remediation`

## Audit Scope

- **Dimensions executed**: 4 (03: API Surface, 09: Renderer Contract, 14: Test Coverage & Quality, 16: Doc-Code Consistency)
- **Iterations**: 2 rounds per dimension (initial + deep-dive)
- **Packages covered**: All 30 packages
- **Files reviewed**: 60+ renderer components sampled, all package exports, 10+ architecture docs, schedule/E2E tests, 4 vitest configs
- **Baseline**: v1 / no compatibility burden / no transitional main-path allowances

## Deep-Dive Statistics

| Dimension | Name                               | R1 Findings | R2 Findings | Total | Status                                 |
| --------- | ---------------------------------- | ----------- | ----------- | ----- | -------------------------------------- |
| 03        | API Surface & Contract Consistency | 5           | 5           | 10    | Deep-dive complete                     |
| 09        | Renderer Contract Compliance       | 6           | 2           | 8     | Deep-dive complete (value convergence) |
| 14        | Test Coverage & Quality            | 10          | 3           | 13    | Deep-dive complete (value convergence) |
| 16        | Doc-Code Consistency               | 2           | 0           | 2     | Deep-dive complete (zero findings R2)  |

## Priority Distribution

| Priority | Count | Definition                                   |
| -------- | ----- | -------------------------------------------- |
| P0       | 1     | Blocking: contract break, incorrect behavior |
| P1       | 6     | Material: real defect or contract drift      |
| P2       | 20    | Non-blocking: should fix but not urgent      |
| P3       | 6     | Trivial: doc nits, minor consistency         |

**Total: 33 findings**

---

## P0 Findings (Must Fix)

### [D09-01] CRUD Renderer Reads Raw `props.schema` at Runtime — Compile-Once Violation

- **File**: `packages/flux-renderers-data/src/crud-renderer.tsx:512`
- **Evidence**:
  ```ts
  const rawSchema = props.schema as CrudSchema;
  // ...
  if (listMode === 'list') {
    return { ...base, item: rawSchema.item /* ... */ };
  }
  return { ...base, card: rawSchema.card /* ... */ };
  ```
- **Severity**: P0 — confirmed compile-once violation via live code verification and suspect scanner
- **Risk**: Bypasses the compilation pipeline for schema-bearing nested properties (`item`, `card`). Fragile under refactoring; schema structural changes may not be reflected in compiled output
- **Suggestion**: Model `item` and `card` as `deepFields` on the CRUD `RendererDefinition`, or compile them into dedicated region handles on `TemplateNode`
- **Review**: Verified against live code at line 512

---

## P1 Findings (Must Fix)

### [D03-01] flow-designer-renderers `./unstable` Exports Overlap with Stable Barrel

- **File**: `packages/flow-designer-renderers/src/unstable.ts:1-34`
- **Evidence**: `extendFlowDesignerRegistry`, `flowDesignerRendererDefinitions`, `registerFlowDesignerRenderers` are exported from BOTH the stable barrel AND `./unstable` subpath
- **Risk**: Defeats the purpose of the unstable boundary — consumers can accidentally root on the unstable path for stable APIs, blocking lifecycle management
- **Suggestion**: Remove duplicates from `unstable.ts`. Flux-react's unstable subpath documents the correct contract: only symbols not yet in the stable barrel

### [D03-10] report-designer-renderers Uses `RendererDefinition<any>[]` — No Schema Type Safety

- **File**: `packages/report-designer-renderers/src/renderers.tsx:204`
- **Evidence**:
  ```ts
  export const reportDesignerRendererDefinitions: RendererDefinition<any>[] = [...]
  ```
- **Risk**: Completely disables compile-time contract checking between schema types, fields, prop contracts, and component props for 7 definitions. No other package uses this pattern
- **Suggestion**: Replace with `RendererDefinition[]` (defaults to `BaseSchema`) at minimum. Ideally define specific schema interfaces for each definition

### [D09-02] NodeFrameWrapper Reads `templateNode.schema` for `frameWrap` at Runtime

- **File**: `packages/flux-react/src/node-frame-wrapper.tsx:16-25`
- **Evidence**:
  ```ts
  const frameWrapMode = resolveFrameWrapMode(
    props.definitionWrap,
    (props.templateNode.schema as { frameWrap?: ... }).frameWrap,
  );
  ```
- **Risk**: Compile-once principle violation. `frameWrap` should be resolved into compiled `meta` during NodeRenderer resolution pass
- **Suggestion**: Promote `frameWrap` into resolved `meta` (e.g., `meta.frameWrap`)

### [D09-06] DetailField Uses Imperative `parentScope.get(name)` in Render Path

- **File**: `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx:157-158`
- **Evidence**:
  ```ts
  if (typeof parentScope?.get === 'function') {
    return parentScope.get(name);
  }
  ```
- **Risk**: Bypasses reactive subscription model. May return stale values or miss scope writes
- **Suggestion**: Replace `parentScope.get(name)` with `useScopeSelector` subscribing to the specific field path

### [D14-01] Scheduling Render Tests Mock Integration Boundary — "Green Shell Over Broken Core"

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.test.tsx:6-35`
- **Evidence**: All 4 interaction hooks (`useGanttDrag`, `useGanttLinkDraw`, `useGanttScroll`, `useGanttKeyboard`) AND `@nop-chaos/flux-react` (3 hooks) are mocked. Tests verify component shell presence only
- **Risk**: Matches the pattern from bug #71 where mocked integration boundaries masked 12 P0s. The disconnect between store creation and component was the root cause
- **Suggestion**: Add at least one integration test per scheduling component using `createSchemaRenderer` with realistic schema asserting DOM output

### [D14-05] Scheduling E2E Tests Assert Structural Presence, Not Correct Rendering

- **File**: `tests/e2e/calendar-demo.spec.ts:48-59`
- **Evidence**: Calendar event test uses conditional assertion that silently passes if no events render. Kanban E2E does not test drag-and-drop. Calendar allows 100 console errors
- **Risk**: All scheduling E2E tests can pass while the rendered output is broken (per bug #71)
- **Suggestion**: Add assertions for specific bar positions/counts (Gantt), card drag-reorder (Kanban), event block count/position (Calendar)

---

## P2 Findings (Should Fix)

### API Surface (D03)

| ID     | File                                               | Issue                                                                                                   | Suggestion                                                              |
| ------ | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| D03-02 | `flux-react/src/unstable.ts`                       | Re-exports stable `@nop-chaos/flux-runtime` APIs under `./unstable` label                               | Remove; consumers should import from `@nop-chaos/flux-runtime` directly |
| D03-03 | `flux-renderers-data/src/index.tsx`                | Leaks internal `createCrudNormalizedSourceContext`                                                      | Remove from barrel; internal utility only                               |
| D03-04 | `flux-renderers-basic/src/index.tsx`               | Exposes generic `copyToClipboard` utility                                                               | Move to `@nop-chaos/ui`                                                 |
| D03-05 | `flux-renderers-content/src/index.ts`              | Exposes internal XSS `sanitizeHtml`                                                                     | Move to `@nop-chaos/ui` or keep internal                                |
| D03-06 | `flux-react/src/index.tsx:102`                     | Stable barrel re-exports `createFormComponentHandle` and `createReadonlyScopeBinding` from flux-runtime | Remove; imports directly from flux-runtime                              |
| D03-07 | `flux-renderers-form-advanced/src/index.tsx:61-80` | `as RendererDefinition[]` cast discards specific schema generics                                        | Use type-safe helper or document the type hole                          |
| D03-08 | `flux-renderers-data/src/index.tsx:5`              | `export * from './crud-schema.js'` leaks `normalizeCrudSchema` and `createDefaultCrudStatusSummary`     | Use `export type *` or move functions to internal module                |

### Renderer Contract (D09)

| ID     | File                                                                                | Issue                                                           | Suggestion                                                     |
| ------ | ----------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| D09-03 | `flux-renderers-form/src/renderers/form.tsx:143-145`                                | Reads `templateNode.schemaUrl` at runtime                       | Attach to compiled metadata on TemplateNode                    |
| D09-04 | test-support files in form/form-advanced                                            | `props.schema.name` fallback reads                              | Remove fallback; test-supports should supply name explicitly   |
| D09-05 | `flux-renderers-data/src/crud-renderer.tsx:547`                                     | Hardcoded `flex flex-col gap-4` on widget                       | Acceptable per pattern 8 — no action needed                    |
| D09-07 | `icon-picker.tsx:212`, `transfer-renderer.tsx:380`, `select-mobile-renderer.tsx:58` | Raw `<button>` where `Button` from ui already imported and used | Replace with `<Button variant="ghost">`                        |
| D09-08 | `textarea-renderer.tsx:71`                                                          | `useEffect` for synchronous `scrollHeight` measurement          | Change to `useLayoutEffect` (matching pattern in text.tsx:103) |

### Test Coverage (D14)

| ID     | File                               | Issue                                              | Suggestion                                                                         |
| ------ | ---------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| D14-02 | `calendar-layout-utils.test.ts:87` | Calendar layout tests assert implementation values | Add DOM-based assertions verifying actual rendered layout                          |
| D14-03 | 28 files (48 suspect hits)         | Module-top mutable `let` leaks state across tests  | Convert to `beforeEach` scoped variables; add `beforeEach(() => { counter = 0; })` |
| D14-04 | 16 patches across 10 files         | Global patches without cleanup                     | Use `afterEach(() => { vi.restoreAllMocks(); })` and `vi.stubGlobal()`             |
| D14-06 | `calendar-demo.spec.ts`            | `allowConsoleErrors(100)` masks real failures      | Remove blanket allowance; use `assertTrackedPageErrors(page)` like Gantt tests     |
| D14-09 | `barcode-scanner-overlay.test.tsx` | No integration test for scanner overlay wiring     | Add E2E test verifying camera viewport element renders                             |
| D14-10 | Tooling gap                        | 48 test-global-leak suspects unenforced            | Graduate to pre-commit lint gate or add to `pnpm lint` with tracked exemptions     |

### Doc-Code Consistency (D16)

| ID     | File                                        | Issue                                                                                                        | Suggestion                                                                |
| ------ | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| D16-01 | `docs/architecture/form-validation.md:575`  | `ValidationContributor` reference points to `renderer-core.ts` but defined in `renderer-definition-types.ts` | Update doc to reference actual definition file                            |
| D16-02 | `docs/architecture/renderer-runtime.md:472` | `RendererDefinition` field definitions referenced at wrong file                                              | Update to reference `renderer-definition-types.ts` or clarify inheritance |

---

## P3 Findings (Trivial / Non-Blocking)

| ID     | File                                                  | Issue                                                                           |
| ------ | ----------------------------------------------------- | ------------------------------------------------------------------------------- |
| D03-09 | All 16 CSS subpath exports                            | CSS export format inconsistency (string vs conditional object)                  |
| D14-07 | flux-bundle, flux-i18n, theme-tokens, tailwind-preset | Low test-file count packages adequate for scope (informational)                 |
| D14-08 | flux-runtime test files                               | Large flat describe blocks mixing cross-domain concerns                         |
| D14-11 | `packages/flux-core/vitest.config.ts`                 | Coverage tracking omits 18 source files; `nested-regions.ts` has zero tests     |
| D14-12 | `packages/flux-formula/vitest.config.ts`              | compile/ subdirectory + ast.ts excluded from coverage; no direct test isolation |
| D14-13 | `tests/e2e/diff-perf.spec.ts:6-7`                     | `allowConsoleErrors(100)` masking failures during perf measurement              |

---

## Per-Package Issue Density

| Package                      | P0    | P1    | P2     | P3    | Total  |
| ---------------------------- | ----- | ----- | ------ | ----- | ------ |
| flux-renderers-data          | 1     | —     | 3      | —     | 4      |
| flux-renderers-form-advanced | —     | 1     | 2      | —     | 3      |
| flux-react                   | —     | 1     | 2      | —     | 3      |
| flow-designer-renderers      | —     | 1     | —      | —     | 1      |
| report-designer-renderers    | —     | 1     | —      | —     | 1      |
| flux-renderers-scheduling    | —     | 2     | 2      | —     | 4      |
| flux-renderers-basic         | —     | —     | 1      | —     | 1      |
| flux-renderers-content       | —     | —     | 1      | —     | 1      |
| flux-renderers-form          | —     | —     | 2      | —     | 2      |
| flux-core                    | —     | —     | —      | 1     | 1      |
| flux-formula                 | —     | —     | —      | 1     | 1      |
| tests/e2e/                   | —     | 1     | 3      | 1     | 5      |
| docs/                        | —     | —     | 2      | —     | 2      |
| **Total**                    | **1** | **6** | **20** | **3** | **30** |
| _(excl. cross-cutting)_      | —     | —     | —      | 3     | 3      |

---

## Cross-Cutting Themes

### 1. Compile-Once Principle Violations (3 findings)

3 distinct sites read raw schema at runtime instead of consuming compiled props/meta:

- `crud-renderer.tsx:512` (P0) — `props.schema.item`/`card`
- `node-frame-wrapper.tsx:16-25` (P1) — `templateNode.schema.frameWrap`
- `form.tsx:143-145` (P2) — `templateNode.schemaUrl`

### 2. Scheduling Integration Test Gap (3 findings)

The scheduling package has the weakest test-to-production correspondence:

- Unit tests mock all interaction hooks (D14-01, P1)
- E2E tests assert structural presence only (D14-05, P1)
- Calendar E2E suppresses console errors (D14-06, P2)

### 3. Unstable Subpath Contract Drift (2 findings)

Two packages (`./unstable`) have overlapping or misleading exports:

- flow-designer-renderers duplicates stable APIs (D03-01, P1)
- flux-react re-labels stable APIs as unstable (D03-02, P2)

### 4. Pass-Through Re-exports Creating Muddy Ownership (3 findings)

Three renderer packages re-export items that belong in other packages:

- `flux-react` re-exports flux-runtime functions (D03-06, P2)
- `flux-renderers-basic` re-exports clipboard utility (D03-04, P2)
- `flux-renderers-content` re-exports sanitize utility (D03-05, P2)

### 5. Schema Type Safety Erosion (2 findings)

- report-designer-renderers uses `RendererDefinition<any>[]` (D03-10, P1)
- form-advanced casts array to `RendererDefinition[]` losing generics (D03-07, P2)

---

## Already-Verified Passing Gates

| Gate                                        | Result                                                        |
| ------------------------------------------- | ------------------------------------------------------------- |
| `pnpm check:active-doc-code-anchors`        | PASS (295 active docs, zero broken anchors)                   |
| `pnpm check:workspace-manifest-deps`        | PASS (all source imports declared)                            |
| `pnpm check:package-css-exports`            | PASS (16 CSS subpaths resolved)                               |
| `pnpm check:audit-hardcoded-type-dispatch`  | PASS (0 suspects)                                             |
| `pnpm check:audit-missing-renderer-markers` | PASS (0 suspects)                                             |
| Internal path import violations             | 0 found across all 30 packages                                |
| All 30 packages have tests                  | PASS                                                          |
| RendererComponentProps pattern              | All 9 renderer packages compliant                             |
| RendererDefinition registration             | All 9 renderer packages follow `register*Renderers(registry)` |

---

## React 19 Best Practices

- **D09-08**: `textarea-renderer.tsx` uses `useEffect` for synchronous DOM measurement — should use `useLayoutEffect`. This is the only React 19 compliance issue found.
- No unnecessary useCallback/useMemo found (React Compiler handles auto-memoization)
- No render-phase store mutations found (Bug 15 pattern is resolved)
- All event handlers use `void props.events.onXxx?.()` pattern

---

## Automated Checks Coverage

**Suspect scanners that produced useful results**:

- `check:audit-runtime-raw-schema-reads` → confirmed D09-01 (P0)
- `check:audit-test-global-leaks` → 48 suspects, confirmed D14-03/D14-04 (both P2)
- `check:audit-fieldframe-bypasses` → correctly rejected per calibration pattern 9
- `check:audit-styling-suspects` → AI & spreadsheet CSS flagged, scoped correctly

**Suggested new automation**:

1. Unstable-subpath duplicates: check that `./unstable` exports do not overlap with stable barrel
2. RendererDefinition<any> detection: flag packages using `RendererDefinition<any>` as hard violation
3. `props.schema` read in renderer components: harder gate for compile-once violations
4. `allowConsoleErrors(N)` with N > 0 in E2E tests: warn about suppressed failures
5. Coverage-config whitelist audit: flag packages using file-level whitelists instead of globs

---

## Conclusion

The codebase is in good overall health with strong architectural foundations. The most critical issue (P0) is the compile-once violation in CRUD renderer. The scheduling test gap (2 P1s) is the highest-risk follow-up area per bug #71 precedent. Documentation-accuracy is high (zero broken anchors across 295 active docs).

**Next step**: Remediation plan should prioritize P0 + P1 items, then batch P2 items by cross-cutting theme.

---

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
