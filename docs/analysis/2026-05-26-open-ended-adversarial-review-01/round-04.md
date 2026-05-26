# Open-Ended Adversarial Review — 2026-05-26 — Round 04

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: renderer-created event scopes, structural loop evaluation scopes, runtime scope disposal  
**Discovery source**: lifecycle audit after spotting short-lived scopes created for event/evaluation payloads without matching disposal

---

## Finding 1: Several renderers create one-off child scopes for event/evaluation payloads and never dispose them; repeated interactions can accumulate runtime-owned scopes

- **Where**:
- `docs/architecture/renderer-runtime.md:243-249`
- `packages/flux-runtime/src/runtime-factory.ts:347-373`
- `packages/flux-runtime/src/scope.ts:224-295,378-409,559-566`
- `packages/flux-renderers-basic/src/tabs.tsx:221-233`
- `packages/flux-renderers-basic/src/loop.tsx:82-94,105-117`
- `packages/flux-renderers-basic/src/recurse.tsx:82-95`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx:84-105`
- `packages/flux-renderers-data/src/table-renderer/table-event-context.ts:6-22`
- **What**: `helpers.createScope(...)` now creates a runtime-owned child scope, records an owned disposer, and, for non-isolated scopes, may create a composite store with parent subscriptions that only release on scope disposal. The documented lifecycle contract says renderer-owned child scopes must be explicitly disposed when no longer materialized. Several call sites create ephemeral scopes for a single event or expression evaluation and never call `helpers.disposeScope(...)`: tabs `onChange`, table event contexts, report field-panel keyboard insertion, and loop/recurse `itemData` evaluation. These scopes are not retained in React state, not attached to a mounted subtree, and not passed through a lifecycle owner that can dispose them later.
- **Why it matters**: every tab change, table event, report field keyboard insert, or loop itemData evaluation can add an owned scope entry that survives until full runtime disposal. The memory footprint of one scope is small, but these are hot interaction/render paths; loop/recurse can create one per item per render, and event scopes can be created indefinitely during a session. If an action or expression running against such a scope registers source/reaction work under that temporary scope id, those sidecars also depend on `disposeScopeTree(scope.id)` for cleanup, but no one calls it. This is the same class of lifecycle leak the table row-scope work already fixed, now reappearing in “short-lived context scope” form.
- **Confidence**: Very likely
- **Non-duplication note**: previous scope findings covered row-scope cache disposal, old `createChildScope` id collisions, and surface/import binding scopes. The current defect is different: even after scope ids are unique and row caches dispose correctly, one-off event/evaluation scopes have no ownership handle and no explicit teardown.

## Round Assessment

This round exposed a design tension in `helpers.createScope`: it is used both for retained materialized child scopes and as a convenient “temporary evaluation context” factory. The lifecycle contract only fits the first use. The second use needs either automatic disposal around the action/evaluation call or a non-owning overlay mechanism such as `evaluationBindings` / `withEvaluationBindings`.

Immediate improvement direction: stop using owned scopes for ephemeral event payloads where `evaluationBindings` is enough, and provide a helper such as `withTemporaryScope(...)` for cases that truly need a `ScopeRef` during one async action. For loop/recurse `itemData`, evaluate against a disposable temporary scope in `try/finally` or switch to an overlay scope that does not register with runtime-owned disposers.

## Blind-Spot Self-Assessment

This round did not prove a concrete retained subscription count in a running browser session. The code-level lifecycle mismatch is clear, but measuring heap/scope registry growth under repeated loop renders and tab changes would help prioritize the remediation order.
