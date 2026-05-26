# Open-Ended Adversarial Review — 2026-05-26 — Round 02

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: validation-owner cancellation, public validation API shape, commit/subtree validation  
**Discovery source**: cancellation-path audit after following async validation from submit into public owner APIs

---

## Finding 1: Public `ValidationScopeRuntime` validation APIs cannot carry an abort signal, so commit/subtree validation cannot be cancelled even though the underlying runtime already supports it

- **Where**:
- `docs/architecture/form-validation.md:50-60,148-161,202-218,990-999`
- `packages/flux-core/src/types/runtime.ts:320-334,364-377`
- `packages/flux-runtime/src/form-runtime.ts:388-424,478-498`
- `packages/flux-runtime/src/form-runtime-owner.ts:340-430,555-621`
- `packages/flux-runtime/src/form-runtime-validation.ts:260-307,490-550,562-592`
- `packages/flux-runtime/src/runtime-owned-factories.ts:37-67`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:310-320,367-376,441-441`
- **What**: the low-level validation executor already accepts `{ signal }`: `validateCompiledField(...)` links the parent signal into its `validationAbortController`, `validatePath(...)` forwards options, and `validateForm(reason, { signal })` uses that path. `FormRuntime.submit()` is the only public path that exposes this by passing submit options into `validateForm(...)`. The exported owner contract does not: `ValidationScopeRuntime.validateAt(path, reason)`, `validateSubtree(path, reason)`, and `validateAll(reason)` have no options parameter. The `FormRuntime` compatibility methods also drop options for `validateAt` / `validateAll`, and `form-runtime-owner.validateSubtree(...)` calls `validatePath(...)` / `validateSubtreeByNode(...)` without any signal.
- **Why it matters**: many non-trivial commit paths do not call `submit()`. `detail-view` uses `draftForm.validateAll('commit' | 'submit')` and parent `validateSubtree(..., 'commit')`; composite fields call `owner.validateSubtree(path, 'commit')`; page/surface non-form owners are exposed as `ValidationScopeRuntime`. Those callers cannot cancel in-flight async rules when the dialog closes, the commit is superseded, or the owning surface is torn down. The architecture says async validation is centralized and cancellable, but cancellation is only available through the form-submit private/public seam, not through the owner API that the same architecture promotes for non-form scopes and subtree commits.
- **Confidence**: Certain
- **Non-duplication note**: this is not the previously reported action `cancelled` / `timedOut` failure-class drift. The issue here is that the validation owner API cannot express a cancellation request at all for `validateAt` / `validateSubtree` / owner `validateAll`, despite the runtime internals already supporting signal propagation.

## Round Assessment

This round found an API-surface bottleneck: the implementation has the hard part of async cancellation machinery, but the public owner contract only exposes it through submit. That creates an attractive nuisance where composite renderers correctly use owner-local validation APIs yet lose the cancellation behavior available to ordinary form submit.

Immediate improvement direction: add an options carrier to `ValidationScopeRuntime.validateAt`, `validateSubtree`, and `validateAll` and thread it through `createManagedValidationScopeRuntime`, projected validation runtimes, `FormRuntime` aliases, `validateSubtreeByNode`, and fallback subtree traversal. Existing callers need not pass a signal, but owner/surface/commit paths should be able to do so.

## Blind-Spot Self-Assessment

This round did not measure how many current commit/open/close flows own an `AbortController` that could be wired immediately. It also did not audit runtime registration callbacks (`validate` / `validateChild`) for their own cancellation support; those may be another residual after the public API accepts signals.
