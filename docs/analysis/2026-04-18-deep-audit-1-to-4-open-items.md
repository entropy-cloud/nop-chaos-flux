# 2026-04-18 Deep Audit 1-4 Final Disposition Record

## Purpose

This document replaces the earlier open-items note for `docs/analysis/2026-04-17-deep-audit-{1,2,3,4}/`.

Its job is no longer to hold an active backlog. Its job is to record the final disposition for each remaining item owned by Plan 115 so these same issues do not keep reappearing as if they were still untriaged.

## Final Status Rule

Each item below is recorded as exactly one of:

- `resolved`
- `closed-no-further-action`

No item in this record remains `deferred`, `pending`, or implicitly awaiting another future audit pass.

## Earlier Closed Items

These items were already fixed before the final-closure pass:

- `array-editor` / `key-value` delete double-write behavior.
- dependent-field `system` revalidation replacing `clearErrors()`.
- table filter shared `Set` mutation.
- CRUD `queryForm` render path mismatch.
- CRUD docs/examples using stale `actionType` wording.
- `TagListRenderer` direct `currentForm.store.getState()` access.
- active architecture/doc drift around `TemplateNode` / `CompiledTemplate` naming.

## Final Item Dispositions

### A1. Hidden-field stale error cleanup

Status: `resolved`

- Live issue confirmed: `notifyFieldHidden()` only tracked hidden state and optional value clearing, but did not immediately clear stored field errors or `validating` state.
- Fix landed in:
  - `packages/flux-runtime/src/form-runtime-field-ops.ts`
- Verification:
  - added coverage in `packages/flux-runtime/src/__tests__/hidden-field-policy.test.ts`
- Result:
  - hidden transitions now immediately invalidate pending field runs and clear stale visible error/validating state for fields that should stop participating while hidden.

### A2. Runtime-only async validation stale suppression

Status: `resolved`

- Live issue confirmed: the runtime-registration-only validation paths did not guard against stale completion publication the way compiled async validation already did.
- Fix landed in:
  - `packages/flux-runtime/src/form-runtime-validation.ts`
- Result:
  - runtime registration root/child validation now uses generation/run guards before publishing results.

### A3. CRUD selection summary drift

Status: `resolved`

- Live issue confirmed: `CrudRenderer` kept a local `selectedRowKeys` state that was not connected to the table's actual scope-owned selection state, so `$crud.selectionCount` and related summary fields drifted.
- Fix landed in:
  - `packages/flux-renderers-data/src/crud-renderer.tsx`
  - `packages/flux-renderers-data/src/__tests__/data-crud.test.tsx`
- Result:
  - CRUD summary now follows scope-owned selection state instead of a disconnected local mirror.

### A4. `operation-control` retry/backoff abort awareness

Status: `resolved`

- Live issue confirmed: retry/backoff waits inside `withRetry()` did not observe aborts once a delay had already started.
- Fix landed in:
  - `packages/flux-runtime/src/operation-control.ts`
  - `packages/flux-runtime/src/request-runtime.ts`
- Result:
  - retry delay waits are now abort-aware, and request-control callers can propagate `AbortSignal` through the retry layer.

### A5. Table `loadingSlot` metadata gap

Status: `resolved`

- Live issue confirmed: `table-renderer.tsx` resolves `loadingSlot`, but the renderer definition did not declare the field metadata, so compiler/runtime slot modeling was incomplete.
- Fix landed in:
  - `packages/flux-renderers-data/src/index.tsx`
- Result:
  - table now declares `loadingSlot` as a `value-or-region` field with `regionKey: 'loadingSlot'`.

### A6. Condition Builder private i18n

Status: `closed-no-further-action`

- Recheck result:
  - the subsystem still uses its own local text table in `packages/flux-renderers-form-advanced/src/condition-builder/i18n.ts`
  - but that text layer is package-local, localized, and supports explicit override injection through `setI18nOverrides(...)`
  - there is no current evidence that it blocks product language switching or causes an actual live-user regression in the active repo baseline
- Closure rationale:
  - forcing a migration into `@nop-chaos/flux-i18n` now would be a cleanup preference, not a clearly justified defect fix
  - the audit item should not stay open indefinitely as if it were a proven runtime bug

### A7. Word Editor hardcoded English

Status: `resolved`

- Live issue confirmed: active Word Editor surfaces still contained user-visible English strings such as back/save labels, unsaved-change confirm text, expand labels, and word-count text.
- Fix landed in:
  - `packages/flux-i18n/src/locales/{en-US.ts,zh-CN.ts}`
  - `packages/word-editor-renderers/src/WordEditorPage.tsx`
  - `packages/word-editor-renderers/src/preview/DocPreviewPage.tsx`
  - test update in `packages/word-editor-renderers/src/__tests__/doc-preview-page.test.tsx`
- Result:
  - the active page and preview shell now use the unified i18n baseline for these strings.

### A8. Word Editor autosave second-source issue

Status: `closed-no-further-action`

- Recheck result:
  - the canonical persistence path already saves through `saveDocument(bridge, { charts, codes })` in `WordEditorPage.tsx` and through the `word-editor:save` action provider
  - the `onAutosave` callback from `EditorCanvas` updates a host-side snapshot used for preview/status projection, not the authoritative persisted save path
- Closure rationale:
  - there is snapshot duplication, but not a confirmed data-loss or canonical-write bug on the current live save path
  - keeping this item open as a defect would overstate the problem

### A9. `data-source-runtime` `stopWhen` behavior

Status: `resolved`

- Live issue confirmed: `checkStopCondition()` swallowed evaluation exceptions and continued polling as if nothing happened.
- Fix landed in:
  - `packages/flux-runtime/src/data-source-runtime.ts`
  - `packages/flux-runtime/src/__tests__/request-runtime-polling.test.ts`
- Result:
  - `stopWhen` evaluation failures now surface as runtime error state, notify the host, and stop polling instead of silently continuing.

### A10. Oversized-file / public-surface residual items

Status: `closed-no-further-action`

Sub-item decisions:

- `packages/flux-runtime/src/data-source-runtime.ts`
  - `closed-no-further-action`
  - rationale: current remaining size is tied to one cohesive owner surface that was still actively modified in this plan; no separate refactor is justified without a new concrete maintainability failure.

- `packages/flow-designer-renderers/src/index.tsx`
  - `closed-no-further-action`
  - rationale: current root export surface is broad but intentional for the package's host-bridge/design integration role; no live bug or verification blocker was reproduced from this exposure alone.

- `packages/report-designer-renderers/src/index.ts`
  - `closed-no-further-action`
  - rationale: exported helpers remain part of the current package integration surface; no active misuse or broken contract was reproduced.

- `packages/word-editor-renderers/src/index.ts`
  - `closed-no-further-action`
  - rationale: the package currently acts as a full integration surface for the editor family, and narrowing exports now would be speculative cleanup rather than a defect fix.

## Supporting Docs Updated During Final Closure

- `docs/plans/115-deep-audit-1-to-4-final-closure-plan.md`
- `docs/logs/2026/04-17.md`
- `docs/architecture/form-validation.md`
- `docs/components/table/design.md`

## Notes

- The `showErrorOn` item from deep-audit-4 remains a documentation/architecture-baseline issue, not a bounded code-fix item for the current live runtime. That conclusion was already recorded during the earlier recheck and is not reopened here.
- This file is intentionally a final disposition record, not a future backlog.
