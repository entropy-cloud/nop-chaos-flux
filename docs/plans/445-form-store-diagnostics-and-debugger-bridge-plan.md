# 445 Form Store Diagnostics And Debugger Bridge Plan

> Plan Status: completed
> Last Reviewed: 2026-06-12
> Source: `docs/architecture/form-store-diagnostics.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/performance-diagnostics-and-e2e-design.md`, `docs/logs/2026/06-12.md`
> Related: successor debugger bridge plan required before any debugger automation landing

## Purpose

Define and land a runtime-owned diagnostics surface for form store commits so focused tests and diagnostics pages can measure commit counts and changed paths directly, while future debugger automation can consume the same normalized runtime-owned truth without relying on ad-hoc probes or misusing render events as store truth.

## Current Baseline

- `FormStoreApi` already provides fine-grained production subscription APIs such as `subscribeToPath(path, listener)`, but it does not expose a first-class diagnostics snapshot for commit bursts.
- `nop-debugger` already exposes structured automation for render/action/api/error surfaces, but it does not directly expose authoritative form-store commit counts or changed-path summaries.
- Focused tests can subscribe to `form.store` directly today, which proves the underlying signal exists, but that signal is not normalized into a shared framework diagnostics contract.
- Recent `condition-builder` debugging showed that user-visible “slow” interactions can be misdiagnosed without a reliable way to compare visual behavior against actual store commit activity.

## Goals

- Add a bounded, runtime-owned form-store diagnostics surface that records commit count and changed-path metadata when explicitly enabled.
- Define how that surface is queried from tests, diagnostics pages, and debugger automation.
- Preserve the performance requirement that disabled diagnostics stay explicitly gated and near-zero-cost.
- Align architecture/reference docs so future work does not re-invent store observers ad hoc.

## Non-Goals

- Replace React Profiler or page-level commit measurement.
- Add always-on deep state snapshots for every form store write.
- Generalize the first implementation to every store type in the repo.
- Ship a permanent verbose timeline of all commits in ordinary playground mode.

## Scope

### In Scope

- `flux-core` types needed for form-store diagnostics contracts
- `flux-runtime` form-store capture and bounded snapshot/report API
- documented runtime API shape that a successor debugger-bridge slice can consume without reopening runtime ownership
- focused regression tests and diagnostics-page wiring where needed
- owner-doc and reference-doc updates for the live contract

### Out Of Scope

- non-form store diagnostics (`page`, `surface`, generic scope stores)
- redesign of existing render monitor semantics
- broad debugger UX redesign unrelated to store diagnostics
- landing the full debugger automation bridge in the same owner plan
- diagnostics-page wiring beyond proof that the runtime API is consumable

## Failure Paths

| Scenario                    | Trigger                                              | Expected Behavior                                                                                                  | Retry | User-visible Result                                             |
| --------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----- | --------------------------------------------------------------- |
| diagnostics-disabled        | host does not enable store diagnostics               | no capture, no commit buffer allocation beyond minimal gate state                                                  | n/a   | no extra diagnostics surface                                    |
| diagnostics-buffer-overflow | one scenario exceeds bounded recent-commit retention | oldest entries drop, `droppedCommitCount` increments                                                               | n/a   | diagnostics report shows bounded recent history plus drop count |
| projected-path-ambiguity    | projected/prefixed store writes occur                | diagnostics report owner/public path coordinates truthfully or use wildcard if exact path precision is unavailable | n/a   | automation sees truthful changed paths, not fake precision      |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`

Reason:

- This plan changes a hot-path runtime contract and defines an automation-facing diagnostics surface. Focused automated proof is required for gating, retention, changed-path truth, and session semantics.

## Execution Plan

### Phase 1 - Contract And Owner Routing

Status: completed
Targets: `docs/architecture/form-store-diagnostics.md`, `docs/architecture/{debugger-runtime.md,performance-diagnostics-and-e2e-design.md,performance-design-requirements.md,form-validation.md}`, `docs/references/form-validation-runtime-types.md`

- Item Types: `Decision | Proof`

- [x] Confirm the final owner boundary for store diagnostics capture (`flux-runtime`) versus consumption (`nop-debugger`, tests, diagnostics pages).
- [x] Decide the minimum public contract: session controls, snapshot shape, bounded retention semantics, changed-path truth rules, and disabled-mode gating expectations.
- [x] Explicitly record that capture belongs at runtime-owned commit/publication boundaries rather than debugger-side observation or ad-hoc broad subscribers.
- [x] Route any required cross-links or normative notes into existing debugger/performance/form docs without duplicating history or plan prose.

Exit Criteria:

- [x] `docs/architecture/form-store-diagnostics.md` states the live target contract, session semantics, and owner boundaries clearly.
- [x] Related owner docs reflect the new routing and do not contradict the new contract.
- [x] `docs/references/form-validation-runtime-types.md` is updated if the public types surface changes; otherwise `No owner-doc update required` is explicitly adjudicated for the reference file in the implementation phase.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Runtime Diagnostics Capture

Status: completed
Targets: `packages/flux-core/src/types/`, `packages/flux-runtime/src/form-store.ts`, related form-store helpers/tests

- Item Types: `Fix | Decision | Proof`

- [x] Add the exported diagnostics types/config needed for runtime-owned store commit capture.
- [x] Implement explicit session control plus gated, bounded form-store commit capture in the runtime/store layer without deep snapshot cloning on the hot path.
- [x] Ensure captured metadata is truthful about changed paths and changed kinds, including wildcard fallback where exact precision is unavailable.
- [x] Add focused tests covering disabled mode, session start/stop/clear behavior, bounded commit counts, retention/drop behavior, and projected/public path semantics where applicable.

Exit Criteria:

- [x] Runtime exposes explicit session controls and a bounded store diagnostics surface with explicit disabled-mode gating.
- [x] Focused tests prove commit capture count/path behavior and retention rules.
- [x] Related owner docs/reference docs updated if the exported runtime contract changed; otherwise `No owner-doc update required` is explicitly recorded with justification.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Successor Bridge Routing

Status: completed
Targets: `docs/plans/` successor ownership, cross-doc routing notes

- Item Types: `Decision | Follow-up`

- [x] Decide the minimum debugger/automation exposure model that the runtime surface must support, without requiring the bridge to land in this owner plan.
- [x] Record explicit successor ownership for debugger automation wiring and any diagnostics-page integration that depends on the runtime surface.
- [x] Update routing/discoverability docs so the new architecture owner doc is findable from normal docs entry points.

Exit Criteria:

- [x] The successor path for debugger/automation bridge work is explicit and does not leave plan closure ambiguous.
- [x] No live contract text in this plan implies the bridge already exists if it has not landed.
- [x] `docs/index.md` routing and any necessary architecture navigation surfaces point readers to `docs/architecture/form-store-diagnostics.md` as the store-diagnostics owner doc.
- [x] `No owner-doc update required` is explicitly adjudicated for unaffected bridge docs in this plan.
- [x] `docs/logs/` corresponding date entry is updated.

## Deferred But Adjudicated

- `out-of-scope improvement` - extending the same diagnostics contract to page/surface/generic scope stores. Why not blocking closure: the immediate supported gap is specifically form store commit truth, and widening owner scope now would blur v1 ownership. Successor ownership: future follow-up plan if form-store diagnostics proves the pattern.
- `watch-only residual` - richer debugger panel timeline/visualization for store diagnostics. Why not blocking closure: the runtime-owned capture surface is the prerequisite contract; visualization can remain absent without invalidating the runtime truth surface. Successor ownership: a named debugger bridge/UX follow-up plan after runtime diagnostics land.

## Closure Gates

- [x] All in-scope contract decisions for form-store diagnostics are documented and consistent across owner docs.
- [x] Runtime-owned store diagnostics capture is explicitly gated and bounded.
- [x] Runtime-owned store diagnostics includes explicit session controls.
- [x] Focused automated proof covers the core diagnostics surface.
- [x] Successor ownership for debugger/automation bridging is explicit and non-ambiguous.
- [x] Docs routing points to `docs/architecture/form-store-diagnostics.md` as the live owner doc.
- [x] `pnpm typecheck` passes.
- [x] `pnpm build` passes.
- [x] `pnpm lint` passes.
- [x] `pnpm test` passes if the implementation changes behavior covered by focused or full tests.
- [x] `docs/logs/` entries are updated.
- [x] Independent closure audit completed before marking the plan `completed`.

## Closure

Status Note: Runtime-owned form-store diagnostics, bounded session controls, projected/public path translation, focused proof, successor routing, and owner-doc sync are all landed. Final workspace verification is full green, so the plan can now close honestly.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: initial audit `ses_145ab055fffesnldY6tJcShGsr` caught the then-open external/full-suite blocker and owned-store proof gap; final fresh-context closure audit `ses_1456e5ffdffesJhOJ3OlYIa17t` verified the remaining blocker had narrowed to a lint issue, after which `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` were all rerun successfully and recorded in `docs/logs/2026/06-12.md`.

Follow-up:

- no remaining plan-owned work
