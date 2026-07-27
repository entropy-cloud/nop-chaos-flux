# Round 2 — Historical Bug Family → Regression Coverage Gap Check

> **Audit Phase**: MA4.1 (Core + Runtime Test Coverage)
> **Date**: 2026-07-27
> **Scope**: flux-core, flux-formula, flux-compiler, flux-action-core, flux-runtime, flux-react, flux-bundle
> **Method**: Bug note audit + source-level defect family identification

---

## Historical Regression Gaps

### Finding R2-1 — Submit concurrency guard only covers `submit()`, not `validateForm()` and other mutating async methods

- **Severity**: P2
- **Category**: 历史回归缺口
- **Defect Family**: Mutating async methods lack concurrency guards, allowing re-entrant calls to clobber in-flight state
- **Known Bug Ref**: `docs/bugs/07-submit-concurrent-guard-fix.md`
- **Test files**: `packages/flux-runtime/src/__tests__/bug-submit-race.test.ts` (submit only)
- **Status**: Partial regression coverage — `submit()` alone is guarded in `form-runtime.ts:248` and tested, but `validateForm()` has no analogous guard
- **Why coverage is misleading**: The bug note explicitly says "all mutating async methods (`submit`, `validateForm`) that have side effects should have a concurrency guard." Only `submit()` was guarded. `validateForm()` at `form-runtime.ts` entry point has no `validating` flag check, so rapid parallel validation calls can overwrite each other's error results (same destructive-merge class as Bug 08).
- **Recommendation**: Add validating gate at `validateForm()` entry analogous to submit's `if (store.getState().submitting) return { ok: false, cancelled: true }`. Add a regression test firing two `validateForm()` calls concurrently, asserting the second returns `cancelled` or that errors from both runs are preserved.

---

### Finding R2-2 — `setLastChange` contract gap for non-`setValue`/`setValues` mutation paths

- **Severity**: P2
- **Category**: 历史回归缺口
- **Defect Family**: Form mutation paths that omit `setLastChange` cause `useSyncExternalStoreWithSelector` to skip re-render for repeated same-path writes
- **Known Bug Ref**: `docs/bugs/30-form-runtime-setvalue-setlastchange-missing-rerender-fix.md`
- **Test files**: `packages/flux-renderers-form/src/renderers/detail-view.test.tsx` (tests `setValue`/`setValues` only)
- **Status**: Partial regression coverage — `setValue` and `setValues` are tested, but `applyExternalErrors`, `resetField`, array operations (`appendValueOp`, `removeValueOp`, etc.), and `setInitialValues` paths are not audited for `setLastChange` calls
- **Why coverage is misleading**: The bug note warns "Every code path that modifies form values must call `setLastChange` before the corresponding store write." Source grep at `packages/flux-runtime/src/form-runtime.ts` shows `setLastChange` is called in: `scope.setSnapshot` (line 145), `scope.update` (line 175), `setValue` (line ~530), `setValues` (line ~580). But `applyExternalErrors` (in `form-runtime-owner.ts:319-340`) updates `externalErrors` on the store via `setPathErrors` without calling `setLastChange`. Array ops (`appendValueOp` in `form-runtime-array-ops.ts`) call `setLastChange` only through `buildArrayCtx`'s injected `setLastChange` — this is fragile because the injection is indirect.
- **Recommendation**: Audit every store write in `form-runtime.ts`, `form-runtime-owner.ts`, `form-runtime-array-ops.ts`, and `form-runtime-values.ts` for `setLastChange` presence. Add a runtime assertion (dev-only) that `store.subscribe` callbacks always see a new `lastChange` reference after any field-write path.

---

### Finding R2-3 — Derived-snapshot identity instability in `useSyncExternalStore` bridges (systemic pattern, only one fix)

- **Severity**: P1
- **Category**: 缺少负面场景 / 跨层断层
- **Defect Family**: Any `getSnapshot()` returning a derived object (not the raw store state) can cause React 19 infinite re-render if identity is not stable across unchanged states
- **Known Bug Ref**: `docs/bugs/32-react19-external-store-derived-snapshot-loop-fix.md`
- **Test files**: `packages/spreadsheet-renderers/src/bridge.test.ts` (covers `spreadsheet-renderers` bridge only)
- **Status**: Ad-hoc fix — only the spreadsheet bridge was fixed after a manifest failure. No systematic audit of all `getSnapshot()` implementations across the core+runtime packages
- **Why coverage is misleading**: The bug is a system-level contract violation, not a local one. The fix only addresses `spreadsheet-renderers/src/bridge.ts`. Other `getSnapshot()` implementations that return derived objects include: `ScopeStore.subscribe` → `listener(state.lastChange)` in `scope.ts:52-63` — this passes `lastChange` directly (stable), OK. But `form-runtime.ts:142-168`'s `scope.store.subscribe` creates a closure that captures `lastChange` from the enclosing scope — because `setLastChange` creates a new object each time, this is a new reference each subscription notification, which is fine for React 19's `useSyncExternalStore` (the store dispatches new references on every change). However, the `scope.readVisible()` method used by `useRenderNodeProps` creates a derived object each call — if this were ever passed to `useSyncExternalStore`, it would trigger the same bug. No test verifies this contract for runtime scope subscriptions.
- **Recommendation**: Add a contract test (`packages/flux-react/src/__tests__/hook-contracts.test.tsx`) that verifies `getSnapshot` stability for all store subscriptions used in renderer hooks (`useRenderScope`, `useScopeSelector`, `useCurrentForm`, `useCurrentPage`). Run under React 19 dev mode and assert no infinite-loop warning.

---

### Finding R2-4 — `structuralWhen` consumption gap represents a class of compiler→runtime dead-field hazards

- **Severity**: P2
- **Category**: 历史回归缺口
- **Defect Family**: Compiled fields on `TemplateNode` that the runtime never reads are silent contract gaps — a field can be compiled, documented, and present in the type system but inert at runtime
- **Known Bug Ref**: `docs/bugs/51-structuralwhen-runtime-react-handoff-contract-fix.md`
- **Test files**: `packages/flux-react/src/__tests__/schema-renderer-runtime-monitoring.test.tsx` (1 test)
- **Status**: Partial — the `structuralWhen` field itself is now consumed. But no systemic audit of all `TemplateNode` fields has been done to identify other dead fields
- **Why coverage is misleading**: The fix addressed only the one known dead field. The bug note warns: "when adding new compiled fields to TemplateNode, always verify the runtime consumption point exists." There is no mechanism to detect future dead fields. A grep of `packages/flux-runtime/src/node-runtime.ts` shows it reads: `structuralWhen`, `renderer`, `props`, `regions`, `initialBody`. But other `TemplateNode` fields like `frame`, `label`, `hint`, `description`, `remark`, `initFetch`, `messages`, `static`, `placeholder`, `clearValueOnHidden`, `validateOnChange`, `validateOnBlur`, `required`, `validations`, `pattern`, `format`, `rules`, `converters` etc. are consumed at the renderer level or higher — they are NOT dead, but there is no single test proving the compiler→runtime handoff is complete for each field.
- **Recommendation**: Add an automated contract test that iterates all `TemplateNode` field names from the type definition and asserts each is either (a) consumed in `node-runtime.ts` or (b) documented as a renderer-level field in the renderer contract test suite. This prevents silent dead fields on future refactors.

---

### Finding R2-5 — Reaction lifecycle dispose-timer race pattern found and fixed once; other timer-rich async patterns not audited

- **Severity**: P1
- **Category**: 缺少负面场景
- **Defect Family**: Any closure scheduled via microtask (`Promise.resolve().then(fn)`) or timer (`setTimeout`) inside a registration/lifecycle function must check `disposed`/`aborted` as its first statement; downstream guards are insufficient
- **Known Bug Ref**: `docs/bugs/28-reaction-debounce-timer-leak-on-dispose.md`
- **Test files**: `packages/flux-runtime/src/__tests__/reaction-runtime.test.ts` (3 tests cover the debounce-timer dispose race)
- **Status**: Covered for `reaction-runtime.ts:invoke`. But the same structural issue exists in `api-data-source-controller.ts` — `schedulePoll()` uses `setTimeout` → `runRequest()`, and if `stop()` is called during the poll timer window, the `finally` block can reschedule a new poll before checking `mutable.stopped` (though the check exists at the line 66 `if (!mutable.stopped)`, the timer callback itself has no `aborted` guard at entry). The difference: in reaction runtime, the guard is at `invoke()` entry; in data source controller, the guard is at `schedulePoll()` re-entry but not at the timer callback entry. If a timer fires after `stop()` cleared the timer reference but before JS event loop processes it, a ghost poll cycle can start.
- **Recommendation**: Add `if (mutable.stopped) return;` at the entry of the `setTimeout` callback in `api-data-source-controller.ts:61` (before `evaluateSendOnGate`). Add a fake-timer test that verifies `setTimeout` count drops to 0 after `stop()` races a pending poll.

---

### Finding R2-6 — Shared dedupe state in subscriber closures is tested per-bug but not scanned systemically

- **Severity**: P2
- **Category**: 历史回归缺口
- **Defect Family**: In-subscriber dedupe state that is shared across subscribers (not per-subscriber) causes partial-staleness — some subscribers miss updates because a prior subscriber updated the shared cache
- **Known Bug Ref**: `docs/bugs/53-imported-region-composite-scope-shared-dedupe-fix.md`
- **Test files**: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts` (1 test: "notifies all child composite subscribers for one parent update")
- **Status**: The per-subscriber dedupe fix is in place and tested. But the pattern of "shared dedupe state in subscription" is a general risk not mechanically detectable
- **Why coverage is misleading**: The bug was found reactively through a specific `detail-view` scenario. There is no audit of all `subscribe()` implementations across `scope.ts`, `form-store.ts`, `source-registry.ts`, `reaction-runtime.ts` for similar shared-dedupe anti-patterns. For example, `form-store.ts`'s `subscribe` uses `createStore` from zustand which has per-listener dedupe — this is safe. `reaction-runtime.ts:458-468` uses `input.scope.store?.subscribe()` which delegates to scope's store — safe per the fix. But `source-registry.ts`'s observer notification could have similar shared-state issues.
- **Recommendation**: Add a systemic scan rule (custom eslint or TypeScript lint) that flags any `subscribe()` closure capturing a variable declared outside the closure-within-a-factory-function pattern (i.e., captures across multiple subscriber creation call sites). Document the "per-subscriber dedupe" invariant in `docs/architecture/scope-subscription-guidelines.md`.

---

### Finding R2-7 — `onActionError` / `onActionFinish` diagnostic chain still has silent-failure path

- **Severity**: P1
- **Category**: 跨层断层
- **Defect Family**: Action dispatch error notification depends on `onActionError` callback or plugin presence; when neither exists, `caughtFailureResults` optimization skips `notify('error')` — errors can vanish silently
- **Known Bug Ref**: `docs/bugs/69-action-expression-eval-failure-silently-swallowed.md`
- **Test files**: `packages/flux-action-core/src/__tests__/action-dispatcher-error-guard.test.ts`
- **Status**: The `reportUnhandledFailureClass` fix at `action-execution.ts:211-214` adds a `hasDiagnosticChannel` check — if no diagnostic channel exists, fall through to `notify('error')`. But the decision logic is inverted: it only notifies when diagnostics are ABSENT. When diagnostics ARE present AND the result is in `caughtFailureResults`, it still skips `notify`. This means any host that provides `onActionError` gets silent failures if the catch block already marked the result. The line `if (hasDiagnosticChannel && caughtFailureResults.has(result)) { return; }` means — "if there's a diagnostic channel AND the error was caught, don't notify the user". The assumption is that `onActionError` will fire, but `onActionError` may not be a user-visible channel (e.g., it logs to console, not toast). The current logic assumes `onActionError` is always user-visible, which is not contractually guaranteed.
- **Recommendation**: Split the notification contract: `notify('error', ...)` is always appropriate for user-visible failures from action arg eval errors, regardless of `onActionError` presence. Remove the `hasDiagnosticChannel && caughtFailureResults.has(result)` skip in `reportUnhandledFailureClass` — or at minimum, only skip when `onActionError` explicitly returns `{ handled: true }`.

---

## New Defect Families From Codebase Scanning

### Finding R2-8 — Empty catch blocks create silent error paths across all core+runtime packages

- **Severity**: P2
- **Category**: 缺少负面场景
- **Defect Family**: Empty or log-only catch blocks that silently swallow errors without structured failure routing
- **Known Bug Ref**: `MA3-F01` (container-hooks.ts:87), plus 3 additional empty `catch {}` blocks in runtime
- **Test files**:
  - `packages/flux-react/src/__tests__/container-hooks.test.ts` — tests container resolution success paths only, **no test for the `componentRegistry.resolve()` throwing case**
  - No tests for `request-runtime.ts:241`, `blob-download.ts:18,87`, `api-data-source-controller.ts:36` error paths
- **Status**: All 4 empty-catch sites (container-hooks.ts:87, request-runtime.ts:241, blob-download.ts:18 and 87, api-data-source-controller.ts:36) have zero test coverage for the catch path
- **Why coverage is misleading**: These catches are "benign" in isolation — they handle `JSON.stringify`, `decodeURIComponent`, `componentRegistry.resolve` failures with safe fallbacks. But collectively they create a culture of silent error handling: no log, no diagnostic, no structured failure. If any of these calls starts throwing for unexpected reasons (e.g., a corrupted component registry state), the silence masks the root cause. Specifically `container-hooks.ts:87` — the `componentRegistry.resolve` can throw on ambiguous component names; a silent fallback to `null` means the container element is not found, and the component renders without correct container positioning with no error visible.
- **Recommendation**: Add `console.warn` to each empty catch with a descriptive message referencing the specific operation. Change `container-hooks.ts:87` from `catch {}` to `catch { console.warn('[container-hooks] resolveContainerElement failed for', containerId); }` as already recommended by MA3-F01. Then add a test for each: mock `componentRegistry.resolve` to throw and verify the fallback returns `null` (for container-hooks), verify `appendParamValues` recovers from a non-serializable object (for request-runtime), etc.

---

### Finding R2-9 — `scope.update()` writes `lastChange` before `store.setValue()`, but `form.scope.update()` has the reverse order

- **Severity**: P3
- **Category**: 缺少负面场景
- **Defect Family**: Inconsistent order of `setLastChange` vs. store write across scope and form scope implementations — `setLastChange` before write vs. after write
- **Known Bug Ref**: Bug 30 fix established the invariant: "`setLastChange` → `store.write`. Never reverse this order or omit `setLastChange`"
- **Test files**: None for ordering contract
- **Status**: No test verifies the ordering invariant across all mutation paths
- **Why coverage is misleading**: In `scope.ts:42-51`, `setSnapshot` sets `lastChange` AND the new snapshot in a single `store.setState` — atomic. In `form-runtime.ts:144-153`, the form scope's `setSnapshot` also sets lastChange via closure then calls `store.setValues`. Both are correct. But in `form-runtime.ts:169-181`, `scope.update` calls `setLastChange({...})` (line 175) and then `store.setValue(path, value)` (line 180) — this is correct ordering. However, `form-runtime.ts:295+`'s `thisForm.setValue` path (around line 530-550) follows `setLastChange` → `store.batchUpdate` which is correct. But if someone refactors these to use `store.setState` directly or changes the store write to be async, the ordering could silently invert. No test asserts that `store.getState().lastChange` from within a subscriber always reflects the latest write.
- **Recommendation**: Add a contract test (`packages/flux-runtime/src/__tests__/form-runtime-commits.test.ts` or similar) that subscribes to form store, calls `setValue`, and asserts `getLastChange().paths` includes the written path. This makes the ordering invariant testable rather than implicit.

---

### Finding R2-10 — Data source polling has a timer-leak race at stop/finally boundary

- **Severity**: P2
- **Category**: 缺少负面场景
- **Defect Family**: `schedulePoll` creates a `setTimeout` whose callback enters `runRequest()` → `.finally()` → `schedulePoll()`; if `stop()` clears the timer between timer creation and callback execution, the `.finally()` can reschedule a new poll, effectively re-arming a stopped controller
- **Known Bug Ref**: Analogous to Bug 28 (reaction debounce timer leak) but in data source controller
- **Test files**: `packages/flux-runtime/src/__tests__/request-runtime.test.ts`, `runtime-sources-lifecycle.test.ts` — no test for stop-vs-poll-timer race
- **Status**: No test coverage for the timer lifecycle race condition
- **Why coverage is misleading**: The `.finally()` guard (`if (!mutable.stopped)`) is correct for the reschedule-after-request path, but it does not protect against the timer-fire-after-stop path. The `setTimeout` callback at line 61 has no `if (mutable.stopped) return;` at entry. Even though `clearTimeout` in `stop()` removes the timer, if the event loop has already placed the callback in the macrotask queue (between timer expiry and `clearTimeout`), the callback will execute and can see `mutable.stopped = true` but still enter `runRequest()` because the guard is only at reschedule time, not at callback entry. In practice `clearTimeout` prevents this for timers that haven't fired, but if the timer fires synchronously during the `clearTimeout` call (possible in some environments), the race exists.
- **Recommendation**: Add `if (mutable.stopped) return;` as the first line of the `setTimeout` callback at `api-data-source-controller.ts:61`. Add a fake-timer test that verifies `vi.getTimerCount() === 0` after calling `stop()` with a pending interval.

---

### Finding R2-11 — Async governance `settleRun` can be called after `clearOwner` (double-settle race)

- **Severity**: P2
- **Category**: 缺少负面场景
- **Defect Family**: Multiple settle paths for the same async run can race if dispose and settle run concurrently
- **Known Bug Ref**: Bug 28 established the "dispose race" pattern for reactions, but the async governance store has similar vulnerabilities
- **Test files**: `packages/flux-runtime/src/__tests__/async-governance.test.ts`
- **Status**: Existing tests cover normal settle paths but do not test the race where `dispose()` (which calls `clearOwner`) fires between two `settleRun` calls for the same handle
- **Why coverage is misleading**: In `reaction-runtime.ts:550`, `ownedRegistration.dispose()` calls `input.asyncGovernance?.clearOwner(...)`. But `runReaction` (async, with `await` at line 247) could be settling a run handle through `settleRun` concurrently. If `dispose()` clears the owner between the `await` returning and the `settleRun` call, the settle targets a now-unregistered owner. The `asyncGovernance` store may handle this gracefully (no-op for unknown owner), but there's no test proving this invariant.
- **Recommendation**: Add a test that starts a long-running reaction action, disposes the reaction immediately, and asserts that no unhandled rejection or `settleRun` error occurs. Specifically, create a reaction with a `watch` expression, trigger it, and call `dispose()` before the action dispatch completes (mock `dispatch` to return a never-settling promise).

---

### Finding R2-12 — `continueOnError` compilation produces an explicit failure surface but only the catching path is tested

- **Severity**: P2
- **Category**: 缺少负面场景
- **Defect Family**: When `SchemaFieldRule.compile` throws in tolerant mode, the node is replaced with a synthetic compile-failure renderer — but downstream runtime does not expect this renderer type in all code paths (e.g., debugger, registry traversal)
- **Known Bug Ref**: `docs/bugs/58-custom-field-compile-failure-surface-fix.md`
- **Test files**: `packages/flux-compiler/src/schema-compiler-renderer-contracts.test.ts` — verifies strict mode throws and tolerant mode produces a failure surface
- **Status**: The compiler fix is tested, but there is no cross-layer test that the synthetic failure surface renderer actually renders without crashing, and that the debugger can inspect its CID
- **Why coverage is misleading**: The test only verifies that the compiler produces a different node type (`compile-failure`). It does not verify that (a) this node type is registered in the renderer registry, (b) that the runtime can render it without crashing, (c) that the debugger's `inspectCid` works on failure-surface nodes, (d) that the failure surface shows the original schema type in debug output. These are contract gaps between compiler output and runtime consumption.
- **Recommendation**: Add a test `packages/flux-react/src/__tests__/schema-renderer-contracts.test.tsx` that provides a schema fragment with a throwing custom field compiler, renders in `continueOnError` mode, and asserts: (1) no crash, (2) DOM contains a failure indicator, (3) `runtime.inspectCid` returns the failure node with correct `originalSchemaType`.

---

### Finding R2-13 — `import-stack` error handling uses catch-and-rethrow for pending module dedup but no test for cascading failure to concurrent consumers

- **Severity**: P3
- **Category**: 缺少负面场景
- **Defect Family**: When multiple concurrent callers await the same pending module import, and the import fails, all callers receive the same error. The pending entry is cleared after the first failure. This is correct behavior but untested.
- **Known Bug Ref**: None
- **Test files**: `packages/flux-runtime/src/__tests__/import-stack.test.ts` — covers `resolveCache` success paths
- **Status**: No test for the concurrent-failure-propagation scenario
- **Why coverage is misleading**: The success path tests verify that two callers awaiting the same pending module both get the module. But if the module load fails, the first caller's catch clears the pending entry (line 135), and the second caller's catch also runs (it was awaiting the same promise). There's no test proving that (a) both callers receive the error, (b) the pending entry is cleaned up for both, (c) a third caller after both failures starts a fresh load (not getting a cached rejection). The `moduleCache.getPending(key)` → `await existing` pattern at lines 117-124 relies on `Promise` identity — a single rejected promise is shared among all awaiters. This is correct in JavaScript (multiple `.then`/`.catch` on the same rejected promise each get the rejection) but is an untested contract.
- **Recommendation**: Add a test that creates 3 concurrent `resolveCache` calls for the same key, causes the loader to reject, and asserts: all 3 reject, the pending entry is removed from the cache, and a subsequent fresh call retries the load.

---

### Finding R2-14 — `createScopeStore` subscription uses referential equality but `setSnapshot` always creates a new `lastChange` object — no test for strict-equality skip optimization

- **Severity**: P3
- **Category**: 缺少负面场景
- **Defect Family**: The `subscribe` callback in `scope.ts:53-63` already checks `state.snapshot === previousState.snapshot && state.lastChange === previousState.lastChange` to avoid redundant notifications. But there's no test that multiple successive `store.setState` calls with identical data are collapsed into a single notification.
- **Known Bug Ref**: Bug 32 is related (snapshot identity), but this is the scope store's own dedupe
- **Test files**: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts` — tests "replace with identical data is a no-op" (line 183)
- **Status**: Partial — one test covers `replace` with identical data. But `setSnapshot` with same snapshot data through the `scope.store.setSnapshot` path is not tested.
- **Why coverage is misleading**: The test only covers the `scope` object's `replace` method (which calls `setSnapshot`). It does not test that calling `scope.store.setSnapshot(sameData, change)` twice is idempotent — i.e., the second call does not produce a new snapshot object, and subscribers are not notified unnecessarily. The optimization relies on the caller checking `Object.is(oldValue, value)` before calling `setSnapshot` (e.g., `form-runtime.ts:172` does this for `update`), but not all callers may do this.
- **Recommendation**: Add a test that directly calls `scope.store.setSnapshot(identicalData, change)` twice and verifies that the subscriber fires exactly once (only for the first call where snapshot reference actually changes).

---

## Cross-Layer Structural Gaps

### Finding R2-15 — `useNodeScopes` microtask-guarded disposal has stacking risk under rapid mount/unmount cycles

- **Severity**: P2
- **Category**: 跨层断层
- **Defect Family**: `useEffect` cleanup fires `queueMicrotask(() => { ... runtime.releaseActionScope(disposedScope); })`. If a component is mounted, unmounted, and remounted synchronously (e.g., by React key change), multiple microtask-disposal closures accumulate, each holding a stale `nodeActionScope` reference
- **Known Bug Ref**: Bug 46 established the microtask-guard pattern for `use-node-scopes.ts`
- **Test files**: `packages/flux-react/src/__tests__/form-owner-cleanup.test.tsx` — covers form cleanup but not action-scope/registry cleanup under rapid remount
- **Status**: No test for rapid mount/unmount of components that use `useNodeScopes` with `actionScopePolicy: 'new'` or `componentRegistryPolicy: 'new'`
- **Why coverage is misleading**: Each mount creates a new `useMemo`'d scope/registry, and each unmount's cleanup queues a microtask to dispose it. If the sequence is mount→unmount→mount→unmount, there are 2 pending microtasks when only 1 `mountedRef` flag should be `false`. The guard `!mountedRef.current || activeNodeActionScopeRef.current !== disposedScope` correctly prevents the first unmount's microtask from disposing the second mount's scope (because `activeNodeActionScopeRef.current` was updated to the new scope). But the microtask still runs the comparison — it's not a functional error but creates unnecessary GC pressure and closure capture. The real risk: if the `activeNodeActionScopeRef.current !== disposedScope` check fails due to a bug (e.g., the ref is not updated before the microtask runs), the wrong scope could be disposed.
- **Recommendation**: Add a test using React's `StrictMode` + rapid key change that mounts a `NodeRenderer` with `actionScopePolicy: 'new'` and verifies: (1) after 3 rapid remounts, no `releaseActionScope` is called with a scope that matches the currently-active scope; (2) all scopes except the last active one are eventually released. Use `vi.fn(runtime.releaseActionScope)` to instrument.

---

### Finding R2-16 — Composite scope parent-change notification uses zustand `subscribe` but the child-scope `subscribe` does not filter parent-changes by dependency set

- **Severity**: P2
- **Category**: 缺少负面场景
- **Defect Family**: When a parent scope changes, the composite child scope's subscribe callback fires for ALL parent changes, not just those matching the child's dependency set. The filtering happens at the renderer level (`NodeRenderer`'s `scopeChangeHitsDependencies`), not at the subscription level, creating unnecessary notification traffic.
- **Known Bug Ref**: Bug 53 fixed the dedupe but did not address the notification filtering
- **Test files**: `packages/flux-runtime/src/__tests__/scope-ownership-lexical-and-nested.test.ts` — tests that notification happens, not that it is filtered
- **Status**: No test for notification filtering efficiency
- **Why coverage is misleading**: This is a performance concern, not correctness — the existing tests prove correct notification delivery. But wasted notification traffic can cause systemic re-renders in deeply nested scope trees with many children. An imported subtree with 20 independent child subscribers would all re-evaluate their selectors for every parent scope change, even those affecting only paths none of them depend on. The scope store has no mechanism to ask "does this change affect this subscriber's dependencies?" — each subscriber must compute that themselves.
- **Recommendation**: While not a correctness bug, document this architectural limitation in `docs/architecture/scope-subscription-guidelines.md` and consider adding a benchmark test (`scope-read-benchmark.test.ts` already exists at `packages/flux-runtime/src/__tests__/scope-read-benchmark.test.ts`) that measures subscriber notification amplification in a deep scope tree.

---

## Summary

| Finding | Severity | Category     | Package               | Core Issue                                                     |
| ------- | -------- | ------------ | --------------------- | -------------------------------------------------------------- |
| R2-1    | P2       | 历史回归缺口 | flux-runtime          | `validateForm()` missing concurrency guard                     |
| R2-2    | P2       | 历史回归缺口 | flux-runtime          | `setLastChange` not audited for all mutation paths             |
| R2-3    | P1       | 缺少负面场景 | flux-react/runtime    | No systemic `getSnapshot` identity stability test              |
| R2-4    | P2       | 历史回归缺口 | flux-compiler/runtime | No systemic compiler→runtime dead-field detection              |
| R2-5    | P1       | 缺少负面场景 | flux-runtime          | Data source poll timer has same dispose-race as bug 28         |
| R2-6    | P2       | 历史回归缺口 | flux-runtime          | Shared-dedupe-in-subscriber risk not systemically scanned      |
| R2-7    | P1       | 跨层断层     | flux-action-core      | `onActionError` presence doesn't guarantee user-visible error  |
| R2-8    | P2       | 缺少负面场景 | flux-react/runtime    | 4 empty catch blocks with no test for catch path               |
| R2-9    | P3       | 缺少负面场景 | flux-runtime          | No test for `setLastChange`→`store.write` ordering invariant   |
| R2-10   | P2       | 缺少负面场景 | flux-runtime          | Data source poll timer race on stop/finally                    |
| R2-11   | P2       | 缺少负面场景 | flux-runtime          | Double-settle race on async governance during dispose          |
| R2-12   | P2       | 缺少负面场景 | flux-compiler/react   | Failure-surface renderer untested in full rendering pipeline   |
| R2-13   | P3       | 缺少负面场景 | flux-runtime          | Concurrent import failure propagation untested                 |
| R2-14   | P3       | 缺少负面场景 | flux-runtime          | Scope store dedupe optimization untested                       |
| R2-15   | P2       | 跨层断层     | flux-react            | Microtask-guarded disposal stacking under rapid remount        |
| R2-16   | P2       | 缺少负面场景 | flux-runtime          | No dependency-gated subscription filtering in composite scopes |

### Priority Recommendations (for MR2 planning)

1. **R2-5 (P1)** and **R2-10 (P2)** — Data source poll timer dispose-race: single-line fix + fake-timer test. Low effort, high confidence.
2. **R2-7 (P1)** — Action error notification: remove `hasDiagnosticChannel && caughtFailureResults.has(result)` skip. One-line logic change + one test update. Low effort, high impact.
3. **R2-3 (P1)** — Derived snapshot stability test: add a contract test for all scope `getSnapshot` paths under React 19. Medium effort (test construction), prevents a hard hang.
4. **R2-1 (P2)** — `validateForm()` concurrency guard: follow the exact pattern of `submit()`'s guard. Low effort, symmetric fix.
5. **R2-8 (P2)** — Empty catch warnings: add `console.warn` to 4 sites. Low effort, improves debuggability.
6. **R2-15 (P2)** — `useNodeScopes` stacking risk: add a test, no code change needed (the guard logic is correct, just untested).
