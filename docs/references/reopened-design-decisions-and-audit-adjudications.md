# Reopened Design Decisions And Audit Adjudications

## Purpose

This file records design decisions and audit adjudications that were repeatedly rediscovered, reopened, or misclassified in later reviews.

- Use it to reduce repeat churn in deep audits, open-ended reviews, and remediation plans.
- Do not treat it as a blanket exemption list.
- A candidate finding that matches one of the patterns below may still be valid, but the reviewer must first explain why the current case escapes the recorded decision boundary.

## How To Use

Read this file when:

- a candidate finding looks similar to an issue that has already been debated multiple times
- a review is about to report a dual-state, wrapper, or owner-boundary problem that feels historically familiar
- a plan is trying to own a defect family that may already belong to another active or closed owner plan

When a candidate issue matches one of the entries below:

1. check the cited owner docs, plans, and logs first
2. distinguish the already-adjudicated baseline from any still-live residual
3. only keep the new finding when the live code still violates the supported baseline or the new issue is materially different from the already-decided one

## V1 Override

These adjudications prevent duplicate reporting of already-routed or already-fixed issues. They must not be used as a blanket defense for live compatibility layers, transitional mirrors, or partial migrations when the active audit baseline explicitly declares `v1 / no compatibility burden / no transitional main-path allowances`.

Under that v1 baseline:

- a previously tolerated transition may become an invalid current design
- "accepted tradeoff for the current baseline" only applies if the current baseline still says so
- reviewers should still avoid duplicate historical reports, but must not preserve live suboptimal design solely because it was once accepted during migration

## Adjudications

### 1. Wrapped Secondary Actions Stay Non-Labelable

- Scope: `packages/flux-renderers-form-advanced/src/wrapped-field-action.tsx` and callers such as condition-builder wrapped controls
- Supported baseline: wrapped secondary actions inside `.nop-field` / `FieldFrame` shells remain non-labelable button-like controls; do not mechanically convert them to real `<Button>` / `<button>` elements
- Why this keeps getting reopened: raw `span[role="button"]` looks like a generic UI-component violation when viewed without field-shell semantics
- What is still valid to report: keyboard activation bugs, missing ARIA semantics, broken disabled behavior, or handler typing problems
- What is not valid to reopen without new evidence: “replace it with `<Button>` because the repo prefers shadcn/ui controls”
- Primary evidence:
  - `docs/logs/2026/05-03.md`
  - `docs/plans/212-renderer-workbench-contract-and-accessibility-closure-plan.md`

### 2. Declarative Surface Historical Double-State Fixes Already Belong To Plan 211

- Scope: `packages/flux-renderers-basic/src/use-surface-renderer.ts`
- Supported baseline: the earlier pseudo-controlled `localOpen` / runtime-open split and duplicate closed-summary publication were already routed to plan `211`; later reviews must not report them again as if they were unowned fresh defects
- Why this keeps getting reopened: surface lifecycle bugs often look similar at a glance, especially when multiple effects touch close / publish paths
- What is still valid to report: a distinct residual defect that remains after the historical fix, such as the later close-reopen hazard from overlapping effect cleanup on scope churn
- What is not valid to reopen without new evidence: “surface still has two sources of truth” when the live code no longer uses the old `localOpen` pattern
- Primary evidence:
  - `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`
  - `docs/logs/2026/05-06.md`
  - `docs/architecture/surface-owner.md`

### 3. `NodeRenderer` Render-Phase Side Effects And Hot-Path Typing Are Different Problems

- Scope: `packages/flux-react/src/node-renderer.tsx`
- Supported baseline: moving prepared-import installation and namespace registration out of render phase was a plan-`211` runtime/react integration fix; remaining `as any` hot-path casts are a separate type-safety residual
- Why this keeps getting reopened: both issues live in the same file and are easy to collapse into one vague “NodeRenderer still has problems” report
- What is still valid to report: live hot-path `as any`, broken generic narrowing, or new render-time mutation introduced after the 211 fix
- What is not valid to reopen without new evidence: the already-fixed render-phase prepared-import installation defect
- Primary evidence:
  - `docs/plans/211-runtime-state-reactivity-and-safety-closure-plan.md`
  - `docs/logs/2026/05-06.md`
  - `docs/architecture/renderer-runtime.md`

### 4. Review-Confirmed Dual-State Tradeoffs Need Explicit Routing, Not Mechanical Re-Reporting

- Scope: review findings such as `object-field`, `table-quick-edit-controller`, and `designer-page` props-to-state or local-draft caches
- Supported baseline: not every review-confirmed dual-state smell is automatically a current must-fix defect; some are accepted tradeoffs, some belong to future owner convergence, and some are separate from adjacent observability or lifecycle bugs
- Why this keeps getting reopened: “dual state” is a strong pattern trigger, and later reviews often stop after spotting mirrored local state without checking owner docs or the earlier adjudication
- What is still valid to report: a live supported-baseline violation, data loss, invalid owner/publication behavior, or a newly proven user-visible failure mode
- What is not valid to reopen without new evidence: a known draft cache or transitional state mirror that earlier review already classified as an acceptable tradeoff for the current baseline
- Primary evidence:
  - `docs/analysis/2026-05-06-deep-audit-full/04-state-ownership.md`
  - `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md`

### 5. Summary Themes Do Not Replace Item-By-Item Ownership Adjudication

- Scope: any review or plan that consumes both `summary.md` and `review-results.md`
- Supported baseline: when source documents disagree on counts or grouping, closure must use an explicit item list plus explicit owner/adjudication routing; a summary theme list is not enough to silently exclude review-confirmed items
- Why this keeps getting reopened: reviewers anchor on the convenient summary grouping and forget that `review-results.md` may keep a wider or differently grouped confirmed set
- What is still valid to report: an item that has no explicit owner, no explicit deferral, and no explicit “already-owned elsewhere” adjudication
- What is not valid to do: assume “not in the summary theme set” means “does not need routing”
- Primary evidence:
  - `docs/analysis/2026-05-06-deep-audit-full/summary.md`
  - `docs/analysis/2026-05-06-deep-audit-full/review-results.md`
  - `docs/plans/217-deep-audit-2026-05-06-confirmed-defect-remediation-plan.md`

## Maintenance

- Add a new entry only when the same design decision or adjudication has already caused repeated reopen/re-report churn.
- Prefer citing owner docs, plans, and logs over retelling full historical narratives.
- If the supported baseline changes, update or remove the entry promptly so this file does not become a stale exemption list.
