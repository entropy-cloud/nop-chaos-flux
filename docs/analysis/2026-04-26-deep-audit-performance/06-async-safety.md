# 06 Async Safety

## Scope

- Dimension 06 first pass focused on runtime async controllers, schema preparation, source-value hooks, and submit/validation cancellation behavior.
- Independent review re-checked the highest-risk findings against the live code.

## Review Summary

- First-pass candidate count: 5
- Independently reviewed: 2 high-risk items + 1 downgraded chain issue
- Retained: 2
- Downgraded: 1
- Rejected: 0

## Retained Findings

### [Dimension06] `api-data-source-controller` can mark a run succeeded before mapping/publish work finishes, then swallow the real failure
- **Status**: Retained
- **Files**:
  - `packages/flux-runtime/src/async-data/api-data-source-controller.ts:259-274`
  - `packages/flux-runtime/src/async-data/api-data-source-controller.ts:331-351`
  - `packages/flux-runtime/src/async-data/api-data-source-controller.ts:393-426`
- **Severity**: P1
- **Async operation**: Data-source request completion, cache-hit publish path, and result mapping/publish.
- **Race/failure scenario**:
  1. The request or cache lookup succeeds.
  2. The controller calls `settleRunIfNeeded(... { outcome: 'succeeded' })` before result mapping and publish finish.
  3. `applyResultMapping(...)` or `publishData(...)` throws.
  4. The catch block sees the run as no longer current and returns early, skipping failure-state publication and telemetry.
- **Evidence**:
```ts
// packages/flux-runtime/src/async-data/api-data-source-controller.ts:259-274
const settledRun = settleRunIfNeeded(run, requestSequence, { outcome: 'succeeded' });
...
const mappedValue = applyResultMapping({ ... payload: cached.data });
publishData(mappedValue);
latestSettledRequestSequence = Math.max(latestSettledRequestSequence, requestSequence);
```
```ts
// packages/flux-runtime/src/async-data/api-data-source-controller.ts:331-351
const settledRun = settleRunIfNeeded(run, requestSequence, { outcome: 'succeeded' });
...
const mappedValue = applyResultMapping({ ... payload: response.data });
publishData(mappedValue);
updateState((current) => ({ ...current, status: 'success', ... }));
```
```ts
// packages/flux-runtime/src/async-data/api-data-source-controller.ts:393-426
const settledRun = settleRunIfNeeded(run, requestSequence, {
  outcome: 'failed',
  error: caughtError
});
...
if (run && input.asyncGovernance && !input.asyncGovernance.isCurrentRun(run) && !settledRun) {
  updateState((current) => current);
  return;
}
...
reportRuntimeHostIssue({ env: runtime.env, error: caughtError, phase: 'api' });
```
- **User-visible failure**: The controller can leave the async-governance bookkeeping or local state on a success path while a real mapping/publish error is neither surfaced as failure state nor reported through telemetry.
- **Independent review outcome**: Keep. This is a concrete observable-failure bug, not a theoretical cancellation style issue.

### [Dimension06] Schema preparation remains non-abortable across the `SchemaRenderer` -> `prepareSchema` chain
- **Status**: Downgraded and retained
- **Files**:
  - `packages/flux-react/src/schema-renderer.tsx:146-190`
- **Severity**: P3
- **Async operation**: Schema import preloading / preparation.
- **Current state**: `SchemaRenderer` uses a local `disposed` boolean to ignore stale results because the `prepareSchema` API does not accept an `AbortSignal`.
- **Evidence**:
```ts
// packages/flux-react/src/schema-renderer.tsx:146-190
useEffect(() => {
  let disposed = false;
  ...
  void prepare(props.schema, {
    schemaUrl: props.schemaUrl,
  }).then((result) => {
    if (disposed) {
      return;
    }
    setPreparedImports(result.preparedImports);
  }).catch((error) => {
    if (disposed) {
      return;
    }
    ...
  });

  return () => {
    disposed = true;
  };
}, [runtime, props.schema, props.schemaUrl, props.env, hasSchemaImports]);
```
- **Risk**: Schema switches or unmounts still allow background preloading work to continue. The code avoids stale state writes, but it does not stop the work itself.
- **Independent review outcome**: Keep only as a low-severity chain-level cancellation gap. The real issue is the missing abort plumbing on `prepareSchema`, not a local misuse of an existing signal-aware API.

## Independently Confirmed Non-Issues

- `packages/flux-react/src/node-source-prop-controller.ts` uses `AbortController`, aborts prior runs, guards post-resolution updates, and aborts on dispose.
- `packages/flux-code-editor/src/source-resolvers.ts` uses `AbortController` correctly and reports failures into observable state.
- `packages/flux-runtime/src/form-runtime-submit-flow.ts:70-76` still has the submit-entry concurrency guard expected by `docs/bugs/07-submit-concurrent-guard-fix.md`.
