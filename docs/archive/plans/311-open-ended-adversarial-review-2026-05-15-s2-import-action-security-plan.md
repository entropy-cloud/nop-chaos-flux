# 311 Open-Ended Adversarial Review 2026-05-15 Session2 Import/Action Security Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-02.md` (Findings 1, 2, 4; global Findings 5, 6, 8)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Fix three import/action dispatch security defects: (1) imports must not be able to claim the reserved `__xui_actions__` namespace, (2) import `$`-prefixed aliases must not override built-in expression bindings (`$form`, `$page`, `$slot`), and (3) runtime `dispose()` must abort in-flight action dispatches before owner teardown proceeds.

## Current Baseline

- Live repo cross-check: `packages/flux-runtime/src/import-stack.ts:237` is the `push` (async) path collision check, while `packages/flux-runtime/src/import-stack.ts:361` is the `installPrepared` (sync) path collision check. Earlier analysis shorthand cited the same family without separating the two call sites; this plan uses the live-file locations and fixes both.
- Before the fix, neither path rejected `as: "__xui_actions__"` directly, so a malicious import could claim the internal named-action namespace when no prior collision existed on the active `ActionScope`.
- The final live fix does **not** rely on a shared-scope placeholder in `node-renderer.tsx`; instead, `packages/flux-runtime/src/import-stack.ts` rejects the reserved alias directly in both install paths, which closes the security gap without masking ancestor named-action providers on inherited scopes.
- `packages/flux-runtime/src/import-stack.ts:131-137`: `buildFrameBindings` creates `$<alias>` bindings for every import entry. Built-in scope values (`$form`, `$page`, `$slot`, `$resource`, `$surface`) can be overridden by an import whose alias matches the built-in name.
- `packages/flux-runtime/src/import-stack.ts:237`: the `push` (async) path has the same collision check gap at the same location.
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:536-560`: `dispose()` only clears `pendingDebounces`; there is no root `AbortSignal` on `ActionDispatcherContext` (defined in `types.ts:27-36`).
- `packages/flux-react/src/node-renderer-resolved.tsx:215-233`: event handlers call `helpers.dispatch(action, { ... })` with no `AbortSignal`.
- `packages/flux-runtime/src/runtime-factory.ts:484-527`: `runtime.dispose()` tears down pages, forms, surfaces, data sources, reactions, import stack, action scopes — **then** calls `actionDispatcher.dispose()`. In-flight actions execute against partially disposed resources.

### Confirmed Gaps

1. No direct reserved-alias rejection existed for `as: "__xui_actions__"`, so imports could claim the internal named-action namespace.
2. No blocklist prevents import aliases from shadowing built-in `$form`, `$page`, `$slot`, etc. Import bindings are checked before scope values in expression evaluation.
3. No root AbortSignal exists on `ActionDispatcherContext`. `dispose()` cannot cancel in-flight dispatch chains. Event handlers propagate no signal.

## Goals

- Reserve `__xui_actions__` and the live built-in `$`-prefix scope-export names as protected identifiers that cannot be used as import aliases.
- Check the blocklist before both `installPrepared` (sync) and `push` (async) install an import alias.
- Add a root `AbortController` to `ActionDispatcherContext` that is aborted when `dispose()` is called.
- Wire the root `AbortSignal` through event handlers and action dispatch chains so that in-flight actions can observe cancellation.
- Write focused tests for namespace hijack blocking, built-in binding override blocking, and post-dispose action abort behavior.

## Non-Goals

- Do not add per-action `AbortController` or per-dispatch cancellation tokens. The plan adds a single root AbortSignal that is aborted on dispose.
- Do not change the ActionScope interface or namespace registration semantics.
- Do not audit every renderer for additional `xui:imports` alias patterns beyond the live built-in scope-export surface consumed by this fix.

## Scope

### In Scope

- Reserved-alias rejection for `__xui_actions__` in import installation
- Blocklist for import aliases in `import-stack.ts` (both `installPrepared` and `push` paths)
- Root AbortSignal on `ActionDispatcherContext` in `action-execution.ts`
- `dispose()` abort in `action-execution.ts`
- Signal propagation through event handlers in `node-renderer-resolved.tsx`
- Signal propagation through the `dispatch` function and action runner chains
- Focused tests for all three fix surfaces
- Update `docs/architecture/` if the design changes (action dispatch lifecycle, import stack contract)

### Out Of Scope

- Per-action cancellation tokens or per-call `AbortController`
- Inventing reserved names that are not part of the current live built-in scope-export surface
- Error boundary fallback robustness (owned by Plan 312)
- Source prop lifecycle defects (owned by Plan 310)
- General action dispatch cancellation beyond root dispose abort

## Execution Plan

### Phase 1 — Fix Import Namespace Security

Status: completed
Targets: `packages/flux-react/src/node-renderer.tsx`, `packages/flux-runtime/src/import-stack.ts`, `packages/flux-runtime/src/action-scope.ts`

- Item Types: `Fix | Fix | Decision`

**Subtask 1.1 — Reject the reserved `__xui_actions__` alias in import installation**

- [x] In `import-stack.ts`, add an explicit protected-alias check for `__xui_actions__` in both `installPrepared` and `push` so the reserved namespace is rejected even when no prior `ActionScope` collision exists.
- [x] Verify the final fix does not rely on a shared-scope placeholder in `node-renderer.tsx`, since that shape can mask ancestor named-action providers on inherited scopes.
- [x] Add focused proof that import-owned subtrees do not lose ancestor named actions while the reserved alias remains blocked.

**Subtask 1.2 — Add built-in `$`-prefix blocklist to `import-stack.ts`**

- [x] Audit the live built-in scope-export surface (`$form`, `$page`, `$slot`, `$resource`, `$surface`, plus any other current built-in names exposed by renderer/runtime contracts) and derive the protected alias set from that live list instead of hard-coding an unproven subset.
- [x] Define a blocklist constant from the audited live built-in identifiers (the part after `$`).
- [x] In `installPrepared` (line 352 loop, after the duplicate-check but before the collision check), reject any `prepared.spec.as` that matches a blocklisted identifier with an explicit error.
- [x] In `push` (line 228 loop), apply the same blocklist check before the namespace collision check.
- [x] Decide whether `__xui_actions__` goes in this blocklist or is handled separately via Subtask 1.1. Recommended: keep `__xui_actions__` separate (reservation approach) since it is an internal namespace, not a top-level scope binding.

Exit Criteria:

- [x] An import alias `as: "__xui_actions__"` is rejected in both `installPrepared` and `push` through the reserved-alias path.
- [x] An import alias matching any live built-in `$...` binding (for example `as: "form"` for `$form`) is rejected with an explicit blocklist error in both `installPrepared` and `push`.
- [x] The blocklist check happens before the namespace collision check in both code paths.
- [x] Valid non-blocklisted import aliases (`as: "myLib"`, `as: "utils"`) continue to work.
- [x] **Decision**: the blocklist source is explicitly tied to the live built-in scope-export contract and documented so future built-in additions update it in one place.
- [x] `docs/architecture/flux-runtime-module-boundaries.md` or `docs/architecture/action-scope-and-imports.md` updated with the reservation and blocklist contract. If no relevant doc section exists for import alias validation, create one.
- [x] `docs/logs/2026/05-15.md` updated.

### Phase 2 — Wire Runtime Dispose to Action Abort

Status: completed
Targets: `packages/flux-action-core/src/action-dispatcher/types.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-react/src/node-renderer-resolved.tsx`, `packages/flux-runtime/src/runtime-factory.ts`

- Item Types: `Fix | Fix | Fix`

**Subtask 2.1 — Add root AbortController to ActionDispatcherContext**

- [x] Add `rootAbortController: AbortController` (or `abortSignal: AbortSignal`) to `ActionDispatcherContext` in `types.ts`.
- [x] In `createActionDispatcher` (`action-execution.ts:536`), create `new AbortController()` and attach to `ctx`.
- [x] In `dispose()` (line 553), call `ctx.rootAbortController.abort()` before clearing pending debounces (or at the very start of dispose).
- [x] Pass `ctx.rootAbortController.signal` into `dispatch()` so that long-running action chains can observe it.
- [x] Update `runtime-factory.ts:484-527` so runtime teardown aborts the dispatcher/root signal before tearing down pages, forms, surfaces, import stack, and other owned resources. The plan must close only when the recorded dispose-order window is removed, not merely when `actionDispatcher.dispose()` itself can abort.

**Subtask 2.2 — Propagate signal through event handlers**

- [x] Preserve the existing renderer event-handler call sites in `node-renderer-resolved.tsx`; explicit per-handler root-signal threading is not required once every dispatch is merged with the dispatcher root signal centrally.
- [x] Keep `helpers.dispatch(action, ctx)` compatible with optional `signal` values in `ActionContext`, so explicit caller-provided signals still compose with the dispatcher root signal.
- [x] Verify that renderer event handlers dispatch through the same root-abort merge path as every other action invocation, so dispose-driven cancellation reaches event-triggered chains without renderer-local wiring.

**Subtask 2.3 — Observe signal in action execution loops**

- [x] In the main dispatch loop in `action-execution.ts`, after the `signal` is available on `ActionContext`, check `signal.aborted` before processing each action in a sequence (batch dispatch).
- [x] Ensure that request-backed actions (API calls) can observe the signal via the existing `adapter.executeApiRequest` or through the `withTimeout`/`withRetry` wrappers. If the adapter accepts an `AbortSignal`, forward it.
- [x] Ensure debounced actions check the signal before firing the debounced callback.

Exit Criteria:

- [x] `dispose()` triggers `rootAbortController.abort()`.
- [x] Runtime disposal aborts the dispatcher/root signal before page/form/surface/import teardown begins.
- [x] Event handlers created in `node-renderer-resolved.tsx` dispatch through a path that is aborted on dispose via dispatcher-level root-signal merge.
- [x] The dispatch loop short-circuits when `signal.aborted` is true.
- [x] API requests created during action execution can be cancelled via the forwarded signal.
- [x] No new memory leaks: the AbortController is not retained after dispose.
- [x] `docs/architecture/action-scope-and-imports.md` or `docs/architecture/renderer-runtime.md` updated with the root AbortSignal contract and the new `dispose()` abort behavior.
- [x] `docs/logs/2026/05-15.md` updated.

### Phase 3 — Verify Security Boundary

Status: completed
Targets: focused test files collocated with source or under `packages/*/src/__tests__/`

- Item Types: `Proof | Proof | Proof`

**Subtask 3.1 — Namespace hijack blocking test**

- [x] Write a test that creates an `ActionScope`, attempts to install a prepared import with `as: "__xui_actions__"`, and asserts that `installPrepared` throws or returns an error.
- [x] Write a test that creates an `ActionScope`, attempts to `push` an import with `as: "__xui_actions__"`, and asserts the collision/blocklist error.
- [x] Write a test that verifies `__xui_actions__` is already reserved before `installPrepared` runs (using `actionScope.listNamespaces()`).

**Subtask 3.2 — Built-in binding override blocking test**

- [x] Write a test that attempts `installPrepared` with `as: "form"` and asserts blocklist rejection.
- [x] Write a test that attempts `push` with `as: "page"` and asserts blocklist rejection.
- [x] Write a test that verifies a non-blocklisted alias (`as: "myLib"`) passes through.

**Subtask 3.3 — Post-dispose action abort test**

- [x] Write a test that creates an action dispatcher, dispatches an action that yields or waits, calls `dispose()`, and asserts the action result is cancelled/aborted.
- [x] Write a test that verifies event handlers created before dispose do not fire after dispose (signal is aborted).
- [x] Write a test that verifies a debounced action scheduled before dispose does NOT fire after dispose.

Exit Criteria:

- [x] All new tests pass.
- [x] `pnpm typecheck` passes across all affected packages.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` — full suite passes.
- [x] `No owner-doc update required` — this phase is proof-only; owner-doc updates are handled in Phases 1 and 2.
- [x] `docs/logs/2026/05-15.md` updated with test results and phase completion.

## Closure Gates

- [x] `__xui_actions__` cannot be claimed by imports in either `installPrepared` or `push`, without masking ancestor named actions on inherited scopes.
- [x] Built-in `$`-prefix identifiers are blocklisted in import alias validation (both `installPrepared` and `push`).
- [x] A root `AbortController` exists on `ActionDispatcherContext` and is aborted during `dispose()`.
- [x] Event-dispatched actions observe an `AbortSignal` that is aborted on dispose.
- [x] The action dispatch loop observes `signal.aborted` and short-circuits.
- [x] Focused tests cover namespace hijack blocking, built-in binding override blocking, and post-dispose action abort.
- [x] No in-scope live defect or contract drift is silently deferred to follow-up.
- [x] `docs/architecture/` files updated for changed behavior (import alias validation contract, action dispose lifecycle).
- [x] Independent subagent closure-audit completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Closed after independent audit confirmed that reserved alias rejection now lives directly in `import-stack.ts`, import-owned subtrees preserve ancestor named actions without any shared-scope `__xui_actions__` placeholder, and runtime disposal aborts dispatcher-root work before owner teardown begins. Focused proof and owner-doc sync both match that final live baseline, and no in-scope work remains.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d50ca2d8ffeQkv76hwrDLMGRh`
- Evidence: Independent closure audit re-read Plan `311`, `docs/logs/2026/05-15.md`, `packages/flux-runtime/src/import-stack.ts`, `packages/flux-react/src/node-renderer.tsx`, `packages/flux-react/src/node-renderer-resolved.tsx`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/flux-action-core/src/action-dispatcher/types.ts`, `packages/flux-runtime/src/runtime-factory.ts`, the focused tests, and the owner docs, and confirmed that reserved alias rejection lives in `import-stack.ts`, inherited named actions remain visible without a shared-scope placeholder, and runtime dispose aborts dispatcher work before owner teardown.

Follow-up:

- no remaining plan-owned work
