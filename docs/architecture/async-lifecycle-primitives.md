# Async Lifecycle Primitives

> Status: current design (plan 757, roadmap PH-4)
> Owner code: `packages/flux-core/src/utils/lifecycle/` (re-exported by `@nop-chaos/flux-runtime`)
> Invariant catalog: `docs/audits/async-lifecycle/invariant-catalog.md` (executable — see "Invariants")
> Related: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/backlog/ai-invariant-loop-roadmap.md`

## Problem

Forty bug notes (docs/bugs/ notes 121–159) in the AI conversation stack resolved to a small set of lifecycle gaps that were fixed over and over with hand-written, differently named guards:

| Recurring hand-written shape | Examples in the fixes                                                                             | Gap                                                                |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Write drain / ordering       | `pendingSavesRef` chains, per-id delete instead of atomic `clearAll`                              | a scheduled save could resurrect a record being deleted or cleared |
| Epoch / identity token       | `switchVersionRef`, `draft.abortController !== abortController`, `genRef`, `deletedDuringLoadRef` | a stale continuation wrote into a replaced or dead target          |
| Exit-path residue reset      | stamp-clear on every `return`/`break`/`throw`, vacuous-residue predicates                         | a failed or aborted turn left markers behind                       |
| Abort propagation            | per-yield `signal.aborted`, generator `.return()`, in-flight gate                                 | abort did not reach in-flight work                                 |
| Isolation                    | per-hook `try/catch`, whitelist + deep clone                                                      | a plugin error or write leaked into owner state                    |

The existing `composeAbortSignals` (`packages/flux-core/src/utils/abort-signals.ts`) covers signal composition only; none of the shapes above had a shared home, so each new call site re-derived them.

## Primitives

All five live in `packages/flux-core/src/utils/lifecycle/`, have no dependencies beyond the package (`invokeIsolated` uses `cloneDeep`), and know nothing about React or any engine.

### `createLifecycleGuard()`

```ts
const guard = createLifecycleGuard();
const token = guard.token(); // capture before awaiting
await something();
guard.guard(token, () => commit()); // skipped if invalidate() ran meanwhile
guard.invalidate(); // delete / clear / switch / dispose
```

A monotonic epoch. `isCurrent(token)` and `guard(token, fn)` compare the token's epoch with the current one; `guard` returns `undefined` without calling `fn` when the token is stale. Destructive transitions call `invalidate()` exactly once.

### `createWriteDrain()`

```ts
const drain = createWriteDrain();
void drain.enqueue(id, () => storage.save(snapshot)); // per-key serialisation
await drain.barrier(); // before delete / clearAll re-reads storage
drain.evict(id); // detach a key's chain
drain.pendingKeys();
```

Writes under the same key run one at a time in enqueue order; `barrier()` resolves only after every in-flight write (including rejected ones) settled; the `enqueue` promise carries the write's own result or error.

### `runWithExitResets(body, resets)`

```ts
await runWithExitResets(() => runTurn(), [clearPendingBranch, clearStreamingStamp]);
```

Resets run exactly once, in reverse registration order, on every exit path. The body's result or error is preserved; a reset that throws is attached as `cause` on the body error (or thrown after a successful body) rather than masking it.

### `linkDisposal(options)`

```ts
const link = linkDisposal({
  signal: ownerSignal,
  detach: () => unsubscribe(),
  generators: [stream],
  abort: () => controller.abort(),
});
link.dispose(); // detach -> generator.return() -> abort; idempotent
```

Teardown order is fixed: detach listeners first so nothing observes the abort and re-saves, then force-return in-flight generators (errors from `.return()` are swallowed so teardown cannot stall), then abort. A second `dispose()` is a no-op; aborting the linked external `signal` runs the same sequence once.

### `invokeIsolated(fn, args, { onError, cloneArgs? })`

```ts
await invokeIsolated(plugin.onTurnStart, [ctx], { onError: reportPluginError, cloneArgs: true });
```

Synchronous throws and asynchronous rejections both go to `onError`; the caller receives `undefined` instead of an exception. With `cloneArgs`, arguments are deep-cloned so the callee cannot write through into owner state.

## Invariants

`docs/audits/async-lifecycle/invariant-catalog.md` lists 13 invariants (LG/WD/ER/LD/II). Each row's Test ID is the first token of an `it(...)` title in `lifecycle-contracts.test.ts`; `invariant-catalog.test.ts` fails when the two sets differ in either direction. New invariants therefore require both a catalog row and a contract test — the table-completeness mechanism inherited from `docs/audits/ai-invariants/`. Scanner rule IDs (`AL-01`…) are reserved in the catalog and implemented by roadmap PH-6.

## Decisions

- **Zero-dependency utilities in `flux-core`, re-exported by `flux-runtime`** — same layering as `abort-signals.ts`; renderer packages import either entry.
- **Separate primitives instead of one "lifecycle controller" object** — the fixes show the shapes are used independently (a drain without epochs, resets without abort); composition is left to the call site.
- **Epoch tokens instead of per-turn `AbortController` identity compare** — tokens are cheap, serialisable, and work for non-abortable transitions (switch, rename, bootstrap merge) where no controller exists.
- **Fixed detach → return → abort order** — the only order that prevents the detach-after-abort re-save observed in bug note 138 (`docs/bugs/138-use-conversation-unmount-order-detach-before-abort-fix.md`); made non-configurable on purpose.

### Rejected alternatives

- _Another local helper inside `flux-renderers-ai`_ — would keep the "fix the instance, not the class" pattern the notes document; the primitives must be reusable by every renderer owner.
- _Wrapping everything in React effects/hooks_ — the engine and storage paths are not React-bound; a hook layer would re-introduce stale-closure hazards.
- _Using `AbortSignal` as the single mechanism_ — signals express cancellation, not write ordering or exit-path residue; two of the three recurring shapes are not cancellations.

## Relationship to earlier work

- **UR-8** (`docs/plans/635-cross-roadmap-ur8-async-safety-writeback-plan.md`) verified ten leaf-level abort fixes and documented dispose double-abort idempotency; those call sites are not rewritten — the primitives generalise their idioms, and `linkDisposal` encodes the idempotency contract.
- **ai-invariants ①–⑧** (`docs/audits/ai-invariants/invariant-catalog.md`) remain engine-local rules enforced by `check:ai-engine-invariants`; the catalog here is the framework-level generalisation they will migrate onto in PH-5/PH-6.
