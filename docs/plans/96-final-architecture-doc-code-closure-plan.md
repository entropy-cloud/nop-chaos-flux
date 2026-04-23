# 96 Final Architecture Doc-Code Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/architecture/flux-core.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-scope-and-imports.md`
> Related: `docs/plans/100-compiledschemanode-public-boundary-closure-plan.md`, `docs/plans/98-data-source-publication-and-dependency-declaration-closure-plan.md`, `docs/plans/99-flow-designer-capability-facade-closure-plan.md`

## Purpose

Own the final routing, reverse-update discipline, and closure-audit work for the remaining architecture areas identified by `docs/analysis/2026-04-16-architecture-transition-closure-review.md`.

This plan is intentionally not the implementation owner for every remaining code change. Its job is to keep the remaining closure work split into the right owner plans, require same-slice reverse doc updates, and prevent the repo from drifting back into broad transition language after successor slices land.

## Current Baseline

- The main render path is already `CompiledTemplate -> TemplateNode -> NodeInstance`; `CompiledSchemaNode` is now a public/tooling residue problem rather than the active render contract.
- `data-source` already has a `name`-first baseline, but compatibility lanes remain around `dataPath`, `mergeToScope`, and limited legacy publication paths.
- Dependency tracking is already root-normalized and `dependsOn` is explicit-first when present, but runtime fallback and diagnostics remain open follow-up.
- Flow Designer already publishes `designer:*` through `ActionScope`, but some schema-facing versus owner-internal capability boundaries are still mixed.
- These are three distinct owner surfaces, not one implementation slice. This master plan therefore routes execution to focused successor plans and owns the reverse-update / closure-audit discipline across them.

## Goals

- Keep the remaining closure work split by real owner boundary instead of reopening a new umbrella implementation plan.
- Require reverse updates to owner docs immediately after each successor slice lands.
- Require independent subagent review both for doc/code accuracy and for plan-closure quality before this master plan can close.
- Preserve balanced design: finish the settled architecture with the smallest durable implementation, not with new abstraction layers added for symmetry.

## Non-Goals

- Do not use this plan as the implementation checklist for all remaining code edits.
- Do not reopen already-landed architecture baselines such as the template-instance render path, root-normalized dependency tracking, or the existence of `ActionScope`.
- Do not keep unrelated leftovers under this file once they have a clear successor owner plan.

## Scope

### In Scope

- successor-plan routing for the remaining closure areas
- same-slice reverse doc update requirements for those successor plans
- final cross-doc consistency pass after successor work lands
- independent closure-audit evidence and final closure decision

### Out Of Scope

- direct ownership of the individual implementation tasks now split into successor plans
- any new architecture rewrite beyond the remaining settled closure areas

## Execution Plan

### Phase 1 - Successor Ownership Split

Status: completed
Targets: `docs/plans/97-compiledschemanode-public-boundary-closure-plan.md`, `docs/plans/98-data-source-publication-and-dependency-declaration-closure-plan.md`, `docs/plans/99-flow-designer-capability-facade-closure-plan.md`

- [x] Split the remaining closure work into focused successor owner plans instead of keeping four implementation surfaces under one file.
- [x] Keep `CompiledSchemaNode` public/tooling cleanup as its own owner plan.
- [x] Keep `data-source` publication closure and dependency declaration tightening together as one owner plan.
- [x] Keep Flow Designer capability-facade closure as its own owner plan.

Exit Criteria:

- [x] Each remaining implementation surface now has one explicit owner plan.
- [x] This master plan no longer acts as a broad implementation portfolio.

### Phase 2 - Reverse Update Discipline

Status: completed
Targets: successor plans, touched owner docs, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/logs/`

- [x] Require each successor plan to reverse-update its owner docs in the same slice as the implementation landing.
- [x] Require outdated or superseded wording to be marked explicitly when the baseline changes.
- [x] Record the reverse-update evidence in the daily log as successor slices land.

**Phase 2 Results (2026-04-16):**

All three successor plans completed reverse updates:
- Plan 100: `docs/architecture/flux-core.md` updated with CompiledSchemaNode boundary classification table
- Plan 98: Verified `docs/architecture/api-data-source.md` and `docs/architecture/dependency-tracking.md` already correct
- Plan 99: `docs/architecture/action-scope-and-imports.md` updated to clarify owner-internal behavior

Exit Criteria:

- [x] No successor-owned landing leaves stale transition wording behind in the relevant owner docs.
- [x] The daily log and/or successor plans cite the reverse-update evidence.

### Phase 3 - Final Cross-Doc Audit

Status: completed
Targets: `docs/architecture/flux-core.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-scope-and-imports.md`, successor plans, `docs/logs/`

- [x] Re-audit the owner docs against the live repo after the successor plans land.
- [x] Confirm there is no remaining plan-owned mismatch between current code and current owner-doc wording.
- [x] Update this master plan and the daily log with the closure baseline.

**Phase 3 Results (2026-04-16):**

Cross-doc audit completed. All four owner docs are consistent with live code:

| Doc | Status | Evidence |
|-----|--------|----------|
| `flux-core.md` | Consistent | CompiledSchemaNode boundary table at lines 315-349 |
| `api-data-source.md` | Consistent | name-first publication documented (lines 449-455) |
| `dependency-tracking.md` | Consistent | dependsOn precedence documented |
| `action-scope-and-imports.md` | Consistent | Flow Designer boundary clarified (lines 57, 975) |

Exit Criteria:

- [x] Owner docs describe the landed baseline and any deliberate compatibility remainder precisely.
- [x] No remaining drift is still owned by this master plan.

### Phase 4 - Independent Closure Audit

Status: completed
Targets: this plan, successor plans, `docs/logs/`

- [x] Run one independent subagent audit for doc/code accuracy in a fresh session.
- [x] Run a second independent subagent audit for closure quality and anti-overengineering in a separate fresh session.
- [x] Record both audit passes with concrete evidence before closing this plan.

**Phase 4 Results (2026-04-16):**

Both independent audits completed and passed:

1. **Doc/Code Accuracy Audit** (Session `ses_26aecbfc3ffezGY7JciUbYldUr`):
   - Successor plan completion: PASS (all 3 plans have Status: completed, closure evidence, validation items)
   - Documentation verification: PASS (flux-core.md, api-data-source.md, action-scope-and-imports.md all consistent)
   - Code spot-checks: PASS (`@internal` annotation, name-first publication, designer namespace provider)
   - **Overall: PASS**

2. **Closure Quality Audit** (Session `ses_26aeca2dfffegU4ldMrIMHPrv1`):
   - Overengineering check: PASS (zero code changes across all 3 successor plans, no new abstractions)
   - Closure discipline: PASS (explicit scope boundaries, complete checklists, clean follow-ups)
   - Plan drift: PASS (Plan 96 stayed routing-only, successors own implementation)
   - Remaining gaps: PASS (no hidden incomplete work, all "complete" claims verified)
   - **Overall: PASS**

Exit Criteria:

- [x] Two independent fresh-session audits are recorded with evidence.
- [x] Any remaining gaps are moved to explicit successor ownership before this plan is marked completed.

Exit Criteria:

- [x] Two independent fresh-session audits are recorded with evidence.
- [x] Any remaining gaps are moved to explicit successor ownership before this plan is marked completed.

## Documentation Follow-Up

- Successor plans must reverse-update owner docs in the same slice as implementation landing.
- If `docs/analysis/2026-04-16-architecture-transition-closure-review.md` stops being the current closure baseline, mark it superseded or update it explicitly.
- This plan closes only after the owner docs and successor plans point to one current baseline.

## Validation Checklist

- [x] successor ownership is explicit for every remaining closure surface
- [x] reverse updates completed for every landed successor slice
- [x] final owner-doc wording matches live code semantics
- [x] independent subagent review completed for doc/code accuracy
- [x] independent subagent review completed for plan-closure quality and anti-overengineering
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 96 is now complete. All three successor plans (100, 98, 99) have completed with independent closure audits. Two independent audits confirmed doc/code accuracy and closure quality for this master plan.

Closure Audit Evidence:

- Accuracy Audit Reviewer / Agent: Independent subagent session `ses_26aecbfc3ffezGY7JciUbYldUr`
- Accuracy Audit Evidence: All verification items passed - successor plan completion verified, documentation consistent with code, code spot-checks confirmed
- Closure-Quality Reviewer / Agent: Independent subagent session `ses_26aeca2dfffegU4ldMrIMHPrv1`
- Closure-Quality Evidence: All 4 audit areas passed - no overengineering (zero code changes), closure discipline maintained, no plan drift, no remaining gaps

Follow-up:

- No remaining master-plan-owned work. All successor plans confirm no additional work needed.
- Plan 97 (Comprehensive Audit Remediation) is a separate effort and not owned by this closure plan.
