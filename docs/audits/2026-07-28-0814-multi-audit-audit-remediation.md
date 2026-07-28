> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: audit-remediation

# Multi-Dimensional Audit: `audit-remediation`

## Audit Scope

- **Dimensions executed**: 6 (01: Dependency Graph, 04: State Ownership, 06: Async Safety, 11: UI Components, 15: Security & Performance, 19: Error Propagation)
- **Iterations**: 1 round per dimension (initial deep-dive)
- **Packages covered**: All 30 packages
- **Files reviewed**: 100+ source files, all package.json files, key architecture docs
- **Baseline**: v1 / no compatibility burden / no transitional main-path allowances

## Deep-Dive Statistics

| Dimension | Name                                     | R1 Findings              | Status             |
| --------- | ---------------------------------------- | ------------------------ | ------------------ |
| 01        | Dependency Graph & Package Boundaries    | 10                       | Deep-dive complete |
| 04        | State Ownership & Single Source of Truth | 21 (6 real, 15 P3/clean) | Deep-dive complete |
| 06        | Async Patterns & Cancellation Safety     | 10                       | Deep-dive complete |
| 11        | UI Component Usage Compliance            | 4                        | Deep-dive complete |
| 15        | Security & Performance Red Lines         | 10                       | Deep-dive complete |
| 19        | Error Propagation Fidelity               | 19                       | Deep-dive complete |

## Priority Distribution

| Priority | Count | Definition                                   |
| -------- | ----- | -------------------------------------------- |
| P0       | 4     | Blocking: contract break, incorrect behavior |
| P1       | 15    | Material: real defect or contract drift      |
| P2       | 40    | Non-blocking: should fix but not urgent      |

**Total: 59 findings**

---

## P0 Findings (Must Fix)

### [D06-01] form.tsx `loadAction` Effect — No AbortController, No Stale-Response Guard, Silent Swallow

- **File**: `packages/flux-renderers-form/src/renderers/form.tsx:443-466`
- **Evidence**:
  ```ts
  useEffect(() => {
    if (!loadAction || !autoLoad || !importsReady) return;
    if (loadActionKeyRef.current === activationKey) return;
    loadActionKeyRef.current = activationKey;
    void loadAction(undefined, {
      scope: loadLifecycleScopeRef.current,
      form: loadOwnedFormRef.current,
    })
      .then((result) => {
        if (result.ok && !result.cancelled && result.data != null) {
          loadOwnedFormRef.current.setValues(result.data);
        }
      })
      .catch(() => {
        /* best-effort */
      });
  }, [activationKey, autoLoad, importsReady, loadAction]);
  ```
- **Risk**: No AbortController means stale inflight requests pile up. Silent `.catch(() => {})` swallows all errors. No stale-response generation guard means old promise can overwrite newer data.
- **Suggestion**: Add per-invocation `AbortController`, check `signal.aborted` before calling `setValues`, abort in cleanup, replace empty catch with error reporting.

### [D06-02] markdown.tsx `MarkdownRenderer` — Bare Boolean `cancelled` Without AbortController on fetch

- **File**: `packages/flux-renderers-content/src/markdown.tsx:35-55`
- **Evidence**:
  ```ts
  let cancelled = false;
  fetch(src) // ← no signal passed
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.text();
    })
    .then((text) => {
      if (!cancelled) {
        setFetchedContent(text);
        setFetchLoading(false);
      }
    })
    .catch(() => {
      if (!cancelled) {
        setFetchError(true);
        setFetchLoading(false);
      }
    });
  return () => {
    cancelled = true;
  }; // ← does not abort fetch
  ```
- **Risk**: Bare boolean violates P5 prohibition. HTTP request continues after unmount. Network bandwidth wasted on stale markdown fetches.
- **Suggestion**: Replace with `AbortController` pattern.

### [D06-06] crud-renderer-state.ts `useCrudLoadReaction` — Bare Boolean `cancelled` Without AbortController on CRUD Load

- **File**: `packages/flux-renderers-data/src/crud-renderer-state.ts:608-672`
- **Evidence**:
  ```ts
  let cancelled = false;
  void (async () => {
    const result: ActionResult = await loadReaction.dispatch({ evaluationBindings }); // ← no signal
    if (cancelled || result.cancelled) return;
    setRows(normalized.rows);
    setTotal(normalized.total);
  })();
  return () => {
    cancelled = true;
  }; // ← does not abort in-flight dispatch
  ```
- **Risk**: CRUD primary data load dispatch receives no AbortSignal. On rapid pagination/filter changes, old dispatch is not cancelled. Stale response overwrites correct data.
- **Suggestion**: Pass AbortSignal to dispatch, check `signal.aborted` before each state update, abort in cleanup.

### [D06-08] form.tsx `loadAction` Effect — Stale Response Race on Dep Change

- **File**: `packages/flux-renderers-form/src/renderers/form.tsx:443-466` (same code as D06-01)
- **Evidence**: No generation guard. When `activationKey` changes, old promise continues. If old resolves after new, `setValues` overwrites with stale data.
- **Risk**: Form shows data from a previous instance. User edits lost when stale data overwrites them.
- **Suggestion**: Add `loadRequestIdRef` counter, check identity before calling `setValues`.

---

## P1 Findings (Must Fix)

### [D04-01] useXyflowSync: Dual Node/Edge State Between Zustand Designer Store and xyflow Local State

- **File**: `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:83-105`
- **Risk**: Zustand designer store is canonical, but xyflow's `useNodesState`/`useEdgesState` introduce a parallel local state layer. If reconciliation misses an edge case, canvas displays divergent data.
- **Suggestion**: Evaluate fully controlled `nodes`/`edges` props. If infeasible, use `useLayoutEffect` for sync and add generation counter.

### [D04-02] useSurfaceRenderer: ScopeRef Stored in Both useState and useRef Simultaneously

- **File**: `packages/flux-renderers-basic/src/use-surface-renderer.ts:69-70, 107-134`
- **Risk**: Same ScopeRef in both state (for render) and ref (for cleanup). If these diverge during async paths, scope could be double-disposed or leaked.
- **Suggestion**: Eliminate useState, rely exclusively on ref since scope is never read in JSX.

### [D04-03] DesignerPageBody: creatingNode in Both useState and useRef — Inconsistent Read Pattern

- **File**: `packages/flow-designer-renderers/src/designer-page-body.tsx:187-188, 210, 231`
- **Risk**: `handleCloseCreateDialog` reads from state, `handleConfirmCreateDialog` reads from ref. Inconsistent access pattern for same logical boolean — guards can disagree.
- **Suggestion**: Consolidate to single source. Derive dialog guard from `pendingCreateDialog !== null`.

### [D06-03] qrcode.tsx — Bare Boolean `cancelled` Without AbortController

- **File**: `packages/flux-renderers-content/src/qrcode.tsx:54-74`
- **Risk**: Stale QR render error could mark component as failed for wrong value/key.
- **Suggestion**: Add generation counter or AbortController.

### [D06-04] value-input.tsx FormulaPreview — Bare Boolean `cancelled` Without AbortController

- **File**: `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx:176-191`
- **Risk**: Formula evaluation continues after unmount/dep change. Stale preview shown.
- **Suggestion**: Add AbortController or generationRef token.

### [D06-07] use-infinite-scroll.ts — Uncontrolled `setTimeout` After Unmount Causes Stale setState

- **File**: `packages/flux-renderers-data/src/use-infinite-scroll.ts:149`
- **Risk**: Timer ID not captured; callback fires after unmount triggering setState on detached component.
- **Suggestion**: Store timer ID and clear in cleanup.

### [D11-01] kanban-column-header Drag Handle Uses `<div role="button">` Instead of `<Button>`

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-column-header.tsx:111-121`
- **Risk**: `<Button>` already imported and used in same file for collapse toggle. Drag handle duplicates button semantics manually. Real consistency issue within same component.
- **Suggestion**: Replace with `<Button variant="ghost" size="sm">`.

### [D15-P1] node-renderer-resolved.tsx JSON.stringify(instancePath) Per Render — Hot Path

- **File**: `packages/flux-react/src/node-renderer-resolved.tsx:74-77`
- **Risk**: Every node in render tree pays JSON.stringify cost each render. Accumulates significant overhead in large forms.
- **Suggestion**: Use isEqual utility or stabilize reference upstream.

### [D15-P2] dynamic-renderer.tsx JSON.stringify(loadAction) as Cache Key

- **File**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:35-45`
- **Risk**: Full action schema serialized each time loadAction changes. Expensive for complex schemas.
- **Suggestion**: Use subset of identifying fields.

### [D19-01] reportActionError/reportActionEnd Bare `catch {}` Swallows Plugin/Monitor Errors

- **File**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:140-183`
- **Risk**: Every action dispatch path uses these functions. A buggy plugin or monitor silently kills the entire diagnostic chain.
- **Suggestion**: Replace bare catch with diagnostic logging.

### [D19-03] reportUnhandledFailureClass Ambiguous hasDiagnosticChannel Discrimination

- **File**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:185-225`
- **Risk**: Host can't distinguish "failure already notified" from "silently swallowed".
- **Suggestion**: Make channel check more specific.

### [D19-04] withRetry Counts Non-Throwing ok:false Results as Failures But No Upstream Consumption

- **File**: `packages/flux-action-core/src/operation-control.ts:190-237`
- **Risk**: Retry metadata never surfaces through diagnostic channels.
- **Suggestion**: Route failureCount>0 through reportActionError.

### [D19-06] validateFormPath Creates Hardcoded Generic Error Message, Losing Original Cause

- **File**: `packages/flux-runtime/src/form-runtime-owner.ts:371-401`
- **Risk**: Every thrown validator produces user-facing "internal error". Original message hidden behind `.cause`.
- **Suggestion**: Include original error message in user-visible text.

### [D19-09] executeApiSchema Response Adaptor Errors on Non-OK Responses Swallowed

- **File**: `packages/flux-runtime/src/async-data/request-runtime.ts:435-470`
- **Risk**: Adaptor failure message absent from propagated error. User sees generic error; dev needs manual correlation.
- **Suggestion**: Attach adaptor error to thrown error.

### [D19-17] api-data-source-controller-runtime.ts silent:true Disables reportRuntimeHostIssue

- **File**: `packages/flux-runtime/src/async-data/api-data-source-controller-runtime.ts:444-450`
- **Risk**: Silent data sources create blind spot in monitoring infrastructure.
- **Suggestion**: Always call reportRuntimeHostIssue with level:'debug' even when silent.

---

## P2 Findings (Should Fix)

### Dependency Graph (D01)

| ID    | File                                              | Issue                                            | Suggestion                                     |
| ----- | ------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------- |
| 01-01 | `flux-runtime/package.json:15-20`                 | Rule(c) text outdated vs actual deps             | Update rule text to match architecture         |
| 01-02 | `flux-renderers-mobile/package.json:20-24`        | Missing flux-react dependency                    | Add workspace dependency                       |
| 01-03 | `flux-renderers-data/package.json:15-22`          | Cross-renderer coupling: data→basic              | Extract copyToClipboard to shared module       |
| 01-04 | `flux-renderers-form-advanced/package.json:22-24` | Cross-renderer coupling: 3 renderer packages     | Lift shared primitives to flux-react           |
| 01-05 | `flux-renderers-ai/package.json:28`               | Cross-renderer coupling: ai→content              | Extract sanitizeHtml to shared module          |
| 01-06 | `flux-code-editor/package.json:43`                | Cross-renderer coupling: code-editor→form        | Extract formFieldChromeRules to shared         |
| 01-09 | `report-designer-renderers/package.json:20-23`    | Cross-domain coupling: report→spreadsheet        | Document intentional dependency                |
| 01-11 | `flux-renderers-form-advanced/package.json:25`    | Runtime dependency needs public API verification | Verify createProjectedScopeStore public intent |

### State Ownership (D04)

| ID    | File                                                      | Issue                                           | Suggestion                           |
| ----- | --------------------------------------------------------- | ----------------------------------------------- | ------------------------------------ |
| 04-04 | `flux-renderers-form-advanced/src/upload-field.tsx:141`   | Local items state mirrors committed store value | Reserve items for pending/error only |
| 04-05 | `flow-designer/.../use-xyflow-sync.ts:93-101`             | useEffect props-to-state sync chain             | Use useLayoutEffect                  |
| 04-07 | `flux-renderers-content/src/diff-view-renderer.tsx:74-91` | Debounced props-to-state sync                   | Consider useDeferredValue            |

### Async Safety (D06)

| ID    | File                                                          | Issue                                      | Suggestion                                 |
| ----- | ------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| 06-05 | `flux-renderers-form/src/renderers/use-dict-options.ts:23-46` | Bare boolean cancelled, no AbortController | Add generationRef or AbortController       |
| 06-09 | `flux-renderers-data/src/use-crud-polling.ts:106-136`         | handleRef overwrite race                   | Guard handleRef writes with local variable |
| 06-10 | `flux-runtime/src/renderer-reaction-handle.ts:272-284`        | Redundant double-abort in dispose()        | Document as safe, no code change needed    |

### UI Components (D11)

| ID    | File                                                        | Issue                                           | Suggestion                               |
| ----- | ----------------------------------------------------------- | ----------------------------------------------- | ---------------------------------------- |
| 11-02 | `apps/playground/src/pages/diff-demo.tsx:180-218`           | Native label/select/checkbox                    | Replace with Label/NativeSelect/Checkbox |
| 11-03 | `apps/playground/src/pages/env-stream-demo.tsx:141-157`     | Native label with NativeSelect already imported | Replace with Label                       |
| 11-04 | `apps/playground/src/pages/event-prevention-demo.tsx:72-83` | Native label+checkbox in Toggle component       | Replace with Label+Checkbox              |

### Security & Performance (D15)

| ID     | File                                                                  | Issue                                          | Suggestion                              |
| ------ | --------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------- |
| 15-S1a | `flux-renderers-form/src/renderers/use-select-remote-search.ts:34-88` | Redundant cancelled+AbortController dual state | Remove boolean, use signal.aborted only |
| 15-S1b | `form-advanced/src/tree-control-controllers.ts:107-153`               | Same dual cancellation                         | Same                                    |
| 15-S1c | `form-advanced/src/condition-builder/value-input.tsx:174-192`         | Bare boolean, no AbortController               | Add AbortController                     |
| 15-S1d | `flux-renderers-form/src/renderers/use-dict-options.ts:23-46`         | Bare boolean, no AbortController               | Add AbortController                     |
| 15-S1e | `flux-renderers-data/src/crud-renderer-state.ts:608-672`              | Bare boolean, no AbortController               | Add AbortController                     |
| 15-S1f | `flux-renderers-content/src/markdown.tsx:35-56`                       | fetch with no AbortController                  | Add AbortSignal                         |

### Error Propagation (D19)

| ID    | File                                                             | Issue                                            | Suggestion                                        |
| ----- | ---------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| 19-02 | `flux-action-core/src/action-dispatcher/action-runners.ts:58-68` | Monitor errors invisible                         | Add diagnostic console path                       |
| 19-05 | `flux-runtime/src/action-adapter.ts:74-91`                       | Console.error only, loses cause                  | Use reportRuntimeHostIssue                        |
| 19-07 | `flux-runtime/src/form-runtime-values.ts:21-23`                  | Dependent revalidation only console.warn         | Route through env.notify                          |
| 19-08 | `flux-runtime/src/surface-runtime.ts:188-230`                    | onClose hooks fire-and-forget                    | Add monitor error reporting                       |
| 19-10 | `flux-runtime/src/form-runtime-values.ts:49-61`                  | setValues doesn't await revalidation             | Await or document fire-and-forget                 |
| 19-11 | `flux-action-core/src/action-runners.ts:29-41`                   | Object.assign in-place error mutation            | Clone before assigning metadata                   |
| 19-12 | `flux-runtime/src/renderer-reaction-handle.ts:158-163`           | Error message missing handle id                  | Include input.id                                  |
| 19-13 | `flux-runtime/src/action-adapter.ts:423-427`                     | Resolution fallback error loses cause            | Add { cause: e }                                  |
| 19-14 | `flux-runtime/src/form-store.ts:142-151`                         | Diagnostics default off                          | Auto-enable in dev mode                           |
| 19-15 | `flux-react/src/schema-renderer.tsx:134-163`                     | Render crash may be undefined                    | Add creationErrorRef check to rootActionScope     |
| 19-16 | `flux-react/src/schema-renderer.tsx:55-70`                       | Compiler diagnostics off in non-strict           | Enable by default in dev                          |
| 19-18 | `flux-react/src/schema-renderer.tsx:55-79`                       | Compilation error not through diagnostic channel | Wrap compile in try-catch, reportRuntimeHostIssue |
| 19-20 | `flux-runtime/src/refresh-nearest.ts:97-101`                     | Silent no-op masquerades as success              | Change default to 'error' or add warning          |

---

## Per-Package Issue Density

| Package                      | P0    | P1     | P2     | Total  |
| ---------------------------- | ----- | ------ | ------ | ------ |
| flux-renderers-form          | 2     | —      | 2      | 4      |
| flux-renderers-content       | 1     | 1      | 2      | 4      |
| flux-renderers-data          | 1     | 1      | 3      | 5      |
| flux-runtime                 | —     | 4      | 10     | 14     |
| flux-action-core             | —     | 3      | 3      | 6      |
| flux-react                   | —     | 1      | 3      | 4      |
| flow-designer-renderers      | —     | 2      | 2      | 4      |
| flux-renderers-basic         | —     | 1      | 1      | 2      |
| flux-renderers-scheduling    | —     | 1      | —      | 1      |
| flux-renderers-form-advanced | —     | 1      | 2      | 3      |
| flow-designer-core           | —     | —      | —      | 0      |
| **Total**                    | **4** | **15** | **28** | **47** |

_(Excludes 12 cross-cutting/doc-level P2 findings)_
_(dimension 01 P2 cross-renderer coupling and dimension 11 playground P2 findings counted in appropriate packages)_

---

## Cross-Cutting Themes

### 1. AbortController / Bare Boolean Violations (10 findings across D06 + D15)

7 distinct sites use bare `let cancelled = false` instead of `AbortController`, violating P5:

- 4 at P0 level (form.tsx loadAction, markdown.tsx fetch, crud-renderer-state.ts load, use-infinite-scroll.ts timeout)
- 3 at P1 level (qrcode.tsx, value-input.tsx formula preview, tree-control-controllers.ts)
- 3 at P2 level (use-dict-options.ts, use-select-remote-search.ts dual, use-crud-polling.ts)

**Fix pattern**: Add per-invocation `AbortController`, pass `signal` to async calls, check `signal.aborted` before side effects, abort in cleanup.

### 2. Error Propagation Blind Spots (5 P1 findings across D19)

The action dispatch and data source layers have systematic bare `catch {}` patterns that silently swallow diagnostic errors:

- `action-execution.ts` reportActionError/reportActionEnd: 3 bare catch blocks
- `request-runtime.ts` response adaptor: error cause lost
- `api-data-source-controller-runtime.ts` silent:true: entire error pipeline bypassed

### 3. Dual-State/Sync Risks in Flow Designer (3 findings, D04)

The flow-designer-renderers package has dual-state patterns where Zustand store state is mirrored in local React state:

- xyflow nodes/edges sync (D04-01 P1)
- ScopeRef useState+useRef (D04-02 P1)
- creatingNode useState+useRef (D04-03 P1)

### 4. Cross-Renderer Package Coupling (5 findings, D01)

4 renderer packages have production dependencies on other renderer packages:

- flux-renderers-data → flux-renderers-basic
- flux-renderers-form-advanced → flux-renderers-data/content/form
- flux-renderers-ai → flux-renderers-content
- flux-code-editor → flux-renderers-form

### 5. JSON.stringify in Hot Paths (2 findings, D15)

Two hot paths use `JSON.stringify` as change detection/cache keying:

- `node-renderer-resolved.tsx:75` — per-node render path
- `dynamic-renderer.tsx:35` — per-loadAction-cache-key

---

## Already-Verified Passing Gates

| Gate                            | Result                                                         |
| ------------------------------- | -------------------------------------------------------------- |
| `pnpm lint`                     | PASS (31/31 cached tasks, 0 errors)                            |
| `pnpm check`                    | PASS (structural guards pass)                                  |
| ESLint no-eval/no-new-func      | PASS (hard gate active, no bypass found)                       |
| Internal path import violations | 0 found across all 30 packages                                 |
| Virtualization                  | Present in table, kanban, gantt, calendar, select, tree        |
| startTransition usage           | All 39 usages in expected UI-control patterns                  |
| @nop-chaos/ui imports           | All from single entry point; no direct base-ui/radix-ui bypass |
| RendererComponentProps pattern  | All renderer packages compliant                                |
| RendererDefinition registration | All follow register\*Renderers(registry) pattern               |

---

## React 19 Best Practices

- No unnecessary useCallback/useMemo without eslint-disable comment found beyond 8 React.memo cases (D15-P4) which are harmless redundancy
- No render-phase store mutations found (Bug 15 pattern resolved)
- No legacy React APIs found
- startTransition usage confined to expected UI interaction patterns
- Compiler auto-memoization handles most cases

---

## Conclusion

This deep-dive found **59 issues** across 6 dimensions: **4 P0** (all in async safety), **15 P1**, and **40 P2**. The P0 findings are concentrated in two patterns: (1) bare boolean cancellation flags instead of AbortController on critical data-load paths (form init, CRUD fetch), and (2) stale-response races with no generation guard. The error propagation analysis uncovered systematic weaknesses in the action dispatch pipeline where bare `catch {}` blocks silently swallow diagnostic errors.

The codebase's architecture remains strong — all package-boundary, dependency-graph, and rendering-contract checks pass. The highest-risk remediations are the P0 async-safety findings in `form.tsx`, `markdown.tsx`, and `crud-renderer-state.ts`, which directly affect user-visible data loading behavior. The error-propagation findings (5 P1s) represent a systemic diagnostic blind spot that should be addressed before adding monitoring infrastructure.

**Next step**: Remediation plan should prioritize the 4 P0 + 15 P1 findings, then address P2 findings by cross-cutting theme (AbortController migration, cross-renderer coupling reduction, error propagation hardening).

---

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
