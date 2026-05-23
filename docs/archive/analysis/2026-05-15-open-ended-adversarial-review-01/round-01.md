# Open-Ended Adversarial Review — 2026-05-15 — Round 1

This round started from lifecycle and owner-boundary signals returned by independent code exploration. I de-duplicated against the recent 2026-05-13/14 open-ended reviews and the reopened-design adjudication file, then kept only candidates that are either new or materially sharper residuals of earlier issues.

## Finding 1: Action Dispatcher Teardown Still Does Not Settle Debounced Dispatches

**Where**

- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:277-297` returns the promise created by `scheduleDebounce(...)` for actions with `control.debounce`.
- `packages/flux-core/src/utils/debounce.ts:28-40` stores each pending promise's `resolve` / `reject` callbacks in the pending debounce entry.
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts:553-557` clears timers and clears `ctx.pendingDebounces`, but never resolves or rejects those stored promises.
- `packages/flux-runtime/src/runtime-factory.ts:483-525` disposes pages, surfaces, forms, imports, sources, reactions, and API requests, but never calls `actionDispatcher.dispose()`.
- `docs/analysis/2026-05-04-adversarial-review.md:123-144` previously reported the broader missing-dispose problem; the live code now has a dispatcher `dispose()` method, but the runtime still does not call it and the method itself would leave awaiters pending.

**What**

There are two teardown holes in the debounced action path:

1. Runtime disposal still does not invoke the action dispatcher's cleanup path, so pending debounced timers can survive the renderer runtime that created them.
2. Even if that cleanup is wired tomorrow, the current `dispose()` implementation only calls `clearTimeout(...)` and clears the map. The promises returned from `runtime.dispatch(...)` for those debounced actions remain neither resolved nor rejected forever.

This means cleanup can either be absent entirely or, if partially fixed, convert a delayed action into a permanently pending async contract.

**Why It Matters**

`dispatch(...)` is a public async boundary. Form submits, host integrations, action chains, and tests can legitimately `await` it. A runtime teardown caused by route changes, schema replacement, surface closure, or test cleanup should produce a terminal result such as `{ cancelled: true }`, not a promise that never settles.

The previous review identified the missing runtime-to-dispatcher disposal as a live issue. The residual here is sharper: the newly present dispatcher cleanup is not yet wired, and it is not semantically complete even if wired because it drops pending promise resolvers. The mechanism that should prevent the old bug from recurring would still fail the dispatch API contract.

**Confidence**: Certain.

## Finding 2: Flow Designer `deleteSelection` Deletes Only the Active Item, Despite Multi-Select Support

**Where**

- `packages/flow-designer-core/src/designer-core-types.ts:50-54` exposes `toggleNodeSelection`, `toggleEdgeSelection`, `selectAllNodes`, `setSelection`, and `moveNodes`, so multi-selection is a first-class core concept.
- `packages/flow-designer-core/src/core/selection.ts:112-124` implements `selectAllNodeIds(...)` by filling `selectedNodeIds`.
- `packages/flow-designer-renderers/src/designer-action-provider.ts:338-346` exposes `selectAllNodes` and arbitrary `setSelection` through the namespaced action provider.
- `packages/flow-designer-renderers/src/use-designer-shortcuts.ts:64-67` maps the configured Delete shortcut to `{ type: 'deleteSelection' }`.
- `packages/flow-designer-renderers/src/designer-command-adapter.ts:145-155` implements `deleteSelection` by deleting only `snapshot.activeNode?.id` or only `snapshot.activeEdge?.id`, ignoring `snapshot.selection.selectedNodeIds` and `snapshot.selection.selectedEdgeIds`.

**What**

The public and keyboard command is named `deleteSelection`, but the implementation deletes one active node or one active edge. If the user selects all nodes, shift/toggle-selects multiple nodes, or a schema action calls `setSelection([...], [...])`, pressing Delete removes only the active item and leaves the rest of the selected set intact.

This is not a generic “dual state” complaint. The selected arrays are already in the snapshot and are used by other features; the command adapter simply chooses the active singleton path instead of the selected-set path.

**Why It Matters**

This breaks a basic canvas contract at the renderer/core boundary: selection-aware commands should operate on the selected set. Users can perform a multi-select operation that the UI/runtime claims to support, then the destructive command applies to only one item. That is surprising in normal graph editors and especially dangerous for schema-driven automation because `designer:setSelection` followed by `designer:deleteSelection` does not delete the selection it just set.

Fixing this also needs care: deleting several nodes individually can create multiple history entries and repeated relayouts unless the adapter batches through a transaction or a core-level delete-selection primitive.

**Confidence**: High.

## Finding 3: `detail-view` Writes Invalid Transformed Commits to the Parent Before Rejecting Them

**Where**

- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:264-304` applies transformed commit results to `parentForm` / `parentScope` first, including `patch`, `updates`, and whole-value replacement.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:306-317` validates only after that parent write has already happened.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:401-416` keeps the draft open when `applyCommitResult(...)` returns `false`, but the parent write is not rolled back.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-transform-concurrency.test.tsx:231-284` verifies that a page-scope detail-view stays open when async `transformOutAction` returns an invalid final value, but it does not assert that the parent scope remains unchanged.
- `docs/architecture/value-adaptation-and-detail-field.md:529-567` describes `transformOutAction` as producing an owner-applied commit result and says `detail-view` should manage draft lifecycle so content edits do not directly mutate external scope.

**What**

The detail draft can reject a transformed commit visually while still leaking that rejected value into the parent owner. For `scopePath: 'summary'` and a transform result like `{ updates: { title: '' } }`, `applyCommitResult(...)` writes `summary.title = ''` into the parent scope/form first. Only afterward does it validate the committed draft and return `false`. The dialog remains open with an error, but sibling renderers, data sources, status publications, and subsequent parent validation now see the invalid parent value.

This is a different residual from older findings about missing non-form revalidation. The current code does re-enter validation paths, and there is even a regression test proving the draft stays open. The bug is the ordering/atomicity boundary: rejection does not undo the already-published parent write.

**Why It Matters**

The staged draft contract is supposed to isolate invalid edits until confirm/commit succeeds. In the current path, `transformOutAction` can turn a locally valid draft into an invalid external value and publish it anyway. That produces the worst user-facing state: the UI says “not committed, please fix this”, while the application data has already changed.

This can break derived widgets outside the dialog, trigger data-source refreshes from invalid data, or allow a later submit path to race against the leaked parent value. A robust commit path should validate the candidate result before publishing it, or apply it through a transactional owner API that can reject without changing the parent snapshot.

**Confidence**: High.

## Round Summary

The common pattern in this round is incomplete terminal semantics. Debounced dispatch cleanup prevents execution but not promise settlement; Flow Designer selection commands expose multi-select but terminate on a singleton active item; `detail-view` visually rejects a commit but has already published the rejected value. In all three cases, the visible API name says one thing while the terminal state transition does less than the contract implies.

## Blind-Spot Self-Assessment

I did not run focused tests for these paths. The static evidence is strong, but follow-up tests should cover: awaited debounced dispatch during runtime dispose, Delete after `selectAllNodes`, and parent scope value after invalid `detail-view` transformed commit rejection.
