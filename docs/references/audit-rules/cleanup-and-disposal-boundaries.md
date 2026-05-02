# Cleanup And Disposal Boundaries

## Purpose

This rule captures recurring failures where timers, queued continuations, or async completions outlive disposal/unmount and recreate state changes after cleanup.

Use it when reviewing reactions, effects, timers, async continuations, or owner disposal logic.

## Scope

Apply this rule when code changes touch any of the following:

- timers, debounced work, or microtask scheduling
- reaction/runtime disposal paths
- async effects with cleanup
- owner dispose/unmount logic that cancels in-flight work

## Required Pattern

### 1) Cleanup must guard both active resources and already-queued continuations

- Clearing a timer or aborting a request is not enough if an already-scheduled continuation can still run and recreate side effects.
- Disposal invariants must remain true even for queued microtasks and delayed callbacks.
- Code must not assume “if callback is running, owner is still active.”

Review checks:

- Search for timers plus queued continuations in the same flow.
- Check whether cleanup guards the continuation itself, not just the original resource.
- Verify disposal flags or abort state are checked at the final mutation point.

### 2) Post-disposal completions must be gated before mutating shared state

- Async completion paths must confirm the owner is still active before publishing state.
- Mounted/disposed checks are separate from success/failure semantics and must be explicit.
- Cleanup should prevent both stale success and stale failure publication.

Review checks:

- Trace success and failure completion paths after unmount/dispose.
- Confirm both branches gate mutations on active ownership.
- Add focused tests that dispose/unmount before queued work completes.

## Allowed Exceptions

- Truly synchronous work with no queued continuation does not need a separate disposal gate.
- Process-lifetime singletons may omit unmount semantics only when they are explicitly singleton-scoped.

## Review Checklist

- Cleanup covers queued continuations as well as active resources.
- Post-disposal success and failure paths are both gated before mutation.
- Focused tests cover disposal before delayed or queued completion.

## Evidence From This Repository

- `docs/bugs/28-reaction-debounce-timer-leak-on-dispose.md`
- `docs/analysis/2026-05-01-deep-audit-full-2/summary.md`
- `docs/analysis/2026-05-02-deep-audit-full-3/06-async-safety.md`

## Primary Architecture Anchors

- `docs/architecture/action-interaction-state.md`
- `docs/architecture/performance-design-requirements.md`
