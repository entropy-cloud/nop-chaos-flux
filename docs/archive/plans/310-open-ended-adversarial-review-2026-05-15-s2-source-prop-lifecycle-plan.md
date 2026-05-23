# 310 Open-Ended Adversarial Review 2026-05-15 Session2 Source Prop Lifecycle Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-01.md` (Finding 3, global Finding 3), `docs/analysis/2026-05-15-open-ended-adversarial-review-02/round-02.md` (Finding 5, global Finding 9)
> Related: `docs/plans/307-open-ended-adversarial-review-2026-05-15-session2-owner-routing-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

Fix two coupled findings across the source-prop React hook and its live controller path: (1) source-prop traversal must be cycle-safe both during render-time detection and during enabled nested source-entry collection, and (2) the source-prop lifecycle must cleanly swap between active and idle controller states when `hasSourceProps` transitions `true -> false -> true`.

## Current Baseline

- `packages/flux-react/src/use-node-source-props.ts:22-38` originally traversed `Object.values(propsValue)` with no cycle detection. If `propsValue` contained a circular reference, the render-phase detection path could block indefinitely during `useMemo`.
- `packages/flux-react/src/node-source-prop-controller.ts:70-98,121-126` originally used recursive nested source-entry collection with no cycle detection. Even after render-time detection was hardened, cyclic graphs with reachable nested source schemas could still recurse forever on the live enabled controller path.
- `packages/flux-react/src/use-node-source-props.ts:51-60`: Two `useEffect` calls manage source prop lifecycle. The first early-returns when `hasSourceProps` is `false` without cleaning the previous `controller.run()` state. The second only disposes when `controller` reference changes (stable across `hasSourceProps` transitions), so stale `SourceObserver` data and `AbortController` persist until unmount or re-enable.
- The controller (`createNodeSourcePropController` in `node-source-prop-controller.ts`) holds `currentSnapshot.value` (may contain large response data), subscription listeners, and an internal `AbortController` — all of which leak across the `true→false` transition.
- No existing tests cover either the circular-reference guard or the subscription cleanup path.

## Goals

- Prevent render-phase freezing from circular `propsValue` references in `hasSourceProps`.
- Ensure the `hasSourceProps` `true→false` transition clears stale observer state and aborts in-flight work via a safe reset/recreate strategy, while terminal `dispose()` remains valid for unmount.
- Add focused tests for both fixes.
- If a small traversal hardening guard is kept beyond the recorded circular-reference fix, label it explicitly as defense-in-depth rather than treating it as part of the original finding.

## Non-Goals

- No change to the `createNodeSourcePropController` internal architecture (e.g., no rewrite to controlled lifecycle outside React).
- No change to how `sourcePropKeys` are determined by the compiler.
- No change to `SourceObserver` contract in `flux-core`.

## Scope

### In Scope

- `packages/flux-react/src/use-node-source-props.ts`
- `packages/flux-react/src/node-source-prop-controller.ts`
- Corresponding test file (`use-node-source-props.test.ts` or colocated `*.test.ts`).

### Out Of Scope

- Other hooks in `packages/flux-react/src/` with similar transition-sensitive lifecycle patterns.
- `node-source-prop-controller.ts` internal refactoring.
- Other adversarial-review findings (owned by Plans `308`-`314`).

## Execution Plan

### Phase 1 - Fix hasSourceProps Circular Reference Guard

Status: completed
Targets: `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-react/src/node-source-prop-controller.ts`

- Item Types: `Fix`

- [x] Add a `Set<object>` (`visited`) in the `hasSourceProps` `useMemo` callback to track already-traversed objects.
- [x] After `const current = stack.pop()`, add: `if (typeof current === 'object' && current !== null) { if (visited.has(current)) continue; visited.add(current); }`.
- [x] Verify that the early `sourcePropKeys.some(...)` check (line 18) is not affected — it runs before the BFS and is not part of this change.
- [x] Verify the change does not alter behavior on tree-shaped (non-circular) `propsValue` — the `visited` set only skips objects already encountered, which for a tree means no skips.
- [x] If a traversal depth cap is retained as additional hardening, record it explicitly in `docs/logs/2026/05-15.md` as defense-in-depth beyond the recorded finding rather than as a required part of closure.

Exit Criteria:

- [x] Circular `propsValue` no longer blocks render, and traversal still preserves source detection semantics for reachable source schemas inside cyclic graphs on both the render-time detection path and the live enabled controller path.
- [x] All existing `useMemo` dependencies (`[propsValue, sourcePropKeys]`) remain unchanged.
- [x] `No owner-doc update required` — behavior change is a defensive guard, not a contract change. If any docs reference the BFS, update; otherwise no change.
- [x] `docs/logs/2026/05-15.md` updated.

### Phase 2 - Fix Source Prop Subscription Cleanup

Status: completed
Targets: `packages/flux-react/src/use-node-source-props.ts`

- Item Types: `Fix`

- [x] Keep steady-state `hasSourceProps === true` updates (`propsValue` / `scope` changes) on the normal `controller.run(propsValue, scope)` path without terminally disposing the controller on every rerun.
- [x] Because `controller.dispose()` clears the underlying observer listener set, do **not** keep the same subscribed controller instance alive after a terminal `dispose()`. Since controller internals are out of scope, this plan uses an explicit recreate strategy: when `hasSourceProps` flips `true→false`, dispose the old active controller and swap the hook onto an inert replacement controller/subscription surface for the disabled interval; when it flips back `false→true`, recreate a fresh live controller so `useSyncExternalStore` re-subscribes to a non-dead listener set.
- [x] Add a dedicated transition guard (for example `prevHasSourcePropsRef`) so cleanup/reset only happens on `true→false` transition and on unmount, not on ordinary `true→true` effect reruns caused by new `propsValue` or `scope` references.
- [x] Reject implementations that terminally dispose the observer on every `propsValue` or `scope` change while `hasSourceProps` remains true, since that would broaden the bug beyond the recorded defect.
- [x] Keep unmount cleanup on the terminal `dispose()` path.

Exit Criteria:

- [x] When `hasSourceProps` transitions from `true` to `false`, stale `SourceObserver` snapshot data is cleared and in-flight requests are aborted without leaving the hook subscribed to a dead controller.
- [x] During the disabled interval (`hasSourceProps === false`), the hook is attached only to an inert replacement controller/subscription surface, not to the disposed live controller instance.
- [x] When `hasSourceProps` transitions back from `false` to `true`, source props work correctly because the hook recreates a fresh live controller/subscription path and `useSyncExternalStore` is subscribed to it.
- [x] Normal `hasSourceProps === true` reruns caused by `propsValue` or `scope` changes do not dispose the controller as a side effect.
- [x] Normal unmount cleanup still fires.
- [x] No double-dispose crashes or assertion errors.
- [x] `No owner-doc update required` — this is a lifecycle bug fix, not a contract change.
- [x] `docs/logs/2026/05-15.md` updated.

### Phase 3 - Add Focused Tests

Status: completed
Targets: `packages/flux-react/src/__tests__/use-node-source-props.test.tsx`

- Item Types: `Fix | Proof`

- [x] Find or create the test file for `use-node-source-props`. Search for existing tests first.
- [x] Extract the traversal into a local pure helper (still in `use-node-source-props.ts`) so cycle handling can be tested with a bounded unit test rather than an unbounded render-time hang assertion.
- [x] Add test: circular `propsValue` does not freeze — call the extracted traversal helper with a self-referential object and verify it terminates and returns within a bounded assertion path.
- [x] Add test: cyclic `propsValue` that still contains a real source schema continues to detect that source correctly after the visited-set fix.
- [x] Add test: `hasSourceProps` `true→false` transition clears stale observer state and aborts in-flight work without leaving `useSyncExternalStore` subscribed to a dead listener set.
- [x] Add test: `hasSourceProps` `false→true→false` cycle — verify the hook recreates a live controller/subscription path on re-enable and clears it again on disable.
- [x] Add test: normal `hasSourceProps` non-transitional usage is unaffected — verify behavior matches existing expectations.
- [x] Add test: `hasSourceProps` stays `true` while `propsValue` changes — verify `controller.run()` updates without an intermediate `dispose()`.
- [x] If a max-depth guard is retained as extra hardening, add a separate test and log it explicitly as defense-in-depth beyond the recorded finding.

Exit Criteria:

- [x] All new tests pass.
- [x] All existing tests still pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] `No owner-doc update required` — this phase is proof-only unless a retained hardening item changes documented behavior.
- [x] `docs/logs/2026/05-15.md` updated.

## Closure Gates

- [x] Circular `propsValue` no longer freezes the render phase — verified by test.
- [x] Source prop subscriptions are cleaned up on `hasSourceProps` `true→false` transition — verified by test.
- [x] `hasSourceProps` `false→true→false` cycle is handled correctly — verified by test.
- [x] All existing tests pass.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes.
- [x] No in-scope live defect is silently deferred to follow-up.
- [x] Independent closure audit completed and recorded.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

None currently.

## Closure

Status Note: Closed after independent audit confirmed that both the render-time detection path and the live enabled controller path are cycle-safe, that the hook correctly swaps between live and idle controllers across `hasSourceProps` disable/re-enable transitions, and that explicit `false -> true -> false` regression proof now matches the claimed lifecycle contract with no remaining in-scope debt.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d50fda95ffejnNfxlR091V7am`
- Evidence: Independent closure audit re-read Plan `310`, `docs/logs/2026/05-15.md`, `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-react/src/node-source-prop-controller.ts`, and `packages/flux-react/src/__tests__/use-node-source-props.test.tsx`, and confirmed both owned source-prop defects are closed on the current baseline, including explicit `false -> true -> false` lifecycle coverage, with no remaining in-scope debt.

Follow-up:

- No follow-up required; this plan owns only the source-prop cycle-detection and transition-cleanup fixes plus their focused proof.
