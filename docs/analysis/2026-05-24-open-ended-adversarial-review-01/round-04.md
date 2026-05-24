# Open-Ended Adversarial Review — 2026-05-24 — Round 04

**Execution date**: 2026-05-24
**Result directory**: `docs/analysis/2026-05-24-open-ended-adversarial-review-01/`
**Exploration areas**: `flux-action-core`, shared action-control semantics, cancellation/timeout control flow
**Discovery source**: fresh subsystem pass after intentionally leaving designer/report families and re-checking shared execution contracts

---

## Finding 1: Shared action engine treats `cancelled` / `timedOut` as a separate class, even though active docs define them as `failure-class`

- **Where**:
  - `docs/architecture/action-algebra-formal-spec.md:228-241,281-300`
  - `docs/architecture/action-scope-and-imports.md:571-583,601`
  - `packages/flux-action-core/src/action-core.ts:64-84,201-209`
  - `packages/flux-action-core/src/action-dispatcher/action-execution.ts:516-639`
  - `packages/flux-action-core/src/__tests__/cancelled-class-and-error-guard.test.ts:11-121`
- **What**: active docs explicitly define `failure-class` as `ok === false` **or** `cancelled === true` **or** `timedOut === true`, and say `onError` runs for `failure-class` while the main chain aborts unless `continueOnError` is set. Live runtime no longer follows that model. `classifyActionResult()` returns a separate `'cancelled'` class for cancelled/timed-out results. The dispatcher only runs `onError` when `resultClass === 'failure'`, and only aborts the main sequential chain on `'failure'`. The dedicated regression test file even locks in the divergent behavior by asserting that cancelled results skip `onError` and do not stop the chain.
- **Why it matters**: this is a cross-cutting semantic break in the shared action engine. Any schema author relying on documented timeout/cancellation behavior can write cleanup, fallback, or notification logic under `onError` and discover it never runs for timed-out/cancelled prerequisites. Worse, later actions in the same chain can continue after a timeout or cancellation without `continueOnError`, which means save/export/navigation side effects can run after a prerequisite was explicitly classified as failed by the docs.
- **Confidence**: Certain
- **Non-duplication note**: this is not a React or local renderer quirk and does not overlap the earlier designer/report findings. It is a shared runtime-control semantic drift between active architecture docs and the implementation/tests that currently define behavior.

## Round Assessment

This round found the highest-leverage pattern of the session: **the formal action algebra and the live action engine have diverged on the meaning of failure itself**. Because `cancelled`/`timedOut` are shared control semantics rather than one package's local detail, the blast radius is potentially much larger than any single host projection bug.

Immediate improvement direction: either restore the documented baseline by folding cancelled/timed-out results back into `failure-class` for `onError` and chain-abort decisions, or explicitly update the owner docs/spec to adopt the current three-way split and then audit all downstream assumptions that still rely on failure-class semantics.

## Blind-Spot Self-Assessment

This round focused on control-flow semantics and did not enumerate every built-in action or renderer surface that could be affected by the drift. A next pass would best start from concrete call sites that use `timeout`, request cancellation, or `onError` cleanup branches, to measure how many real schemas currently assume the documented failure-class model.
