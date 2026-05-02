# 177 Deep Audit Doc Baseline Sync Plan

> Plan Status: completed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full/summary.md`, live doc/type verification of `docs/skills/deep-audit-prompts.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-core.md`, `packages/ui/package.json`, `packages/flux-core/src/types/renderer-hooks.ts`
> Related: `docs/plans/156-reference-doc-sync-and-audit-consensus-plan.md`, `docs/plans/176-deep-audit-residual-owner-assignment-plan.md`

## Purpose

Close the 2026-05-02 deep-audit residuals whose only remaining owner surface is current-baseline documentation and audit-handbook drift.

## Current Baseline

- `docs/skills/deep-audit-prompts.md:335-343` still tells dimension-01 audit agents that `ui` must not depend on any `@nop-chaos/*` package, but live `packages/ui/package.json:31-33` depends on `@nop-chaos/flux-i18n` and the same handbook already says shared reusable package dependencies should not be treated as boundary violations.
- `docs/architecture/renderer-runtime.md:575-605` and `:788-845` still document `RenderRegionHandle.instantiate()` and `RenderFragmentOptions.data` even though live `packages/flux-core/src/types/renderer-hooks.ts:22-84` exports neither surface.
- `docs/architecture/flux-core.md:155-160` still describes the pipeline as `RendererRuntime.instantiate(...)`, which no longer matches the live runtime contract.
- `docs/architecture/action-scope-and-imports.md:27,1368` and `docs/architecture/scope-ownership-and-isolation.md:320` still describe fragment child-scope creation through removed `render({ data })` / `options.data` wording even though live fragment scope creation now keys off `bindings`.
- `docs/references/renderer-interfaces.md` and `docs/references/terminology.md` mention `RenderRegionHandle` but do not currently reproduce the stale removed APIs, so the primary owner drift is in the handbook and architecture docs listed above.

## Goals

- Make the audit handbook's dependency-boundary rules match the live workspace package graph.
- Remove the stale removed region/fragment API wording from the active architecture docs.
- Keep the updated docs limited to current-baseline wording rather than future design or historical narrative.

## Non-Goals

- Do not change any production code.
- Do not broaden into unrelated doc drift outside the retained 2026-05-02 residuals above.
- Do not rewrite reference docs unless a targeted sync is required by these owner-doc changes.

## Scope

### In Scope

- `docs/skills/deep-audit-prompts.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/scope-ownership-and-isolation.md`
- any directly affected `docs/references/*` file only if needed for consistency
- `docs/logs/2026/05-02.md`

### Out Of Scope

- validation-owner docs
- report-designer docs
- word-editor docs
- implementation code

## Execution Plan

### Phase 1 - Audit Handbook Dependency Rule Sync

Status: completed
Targets: `docs/skills/deep-audit-prompts.md`, `docs/logs/2026/05-02.md`

- [x] Update the dimension-01 dependency rule table so it no longer misclassifies the live `ui -> flux-i18n` dependency or legitimate shared-package dependencies.
- [x] Reconcile the dimension-01 rules with the same file's shared audit guidance and with the current dependency flow baseline.

Exit Criteria:

- [x] `docs/skills/deep-audit-prompts.md` no longer contains contradictory dimension-01 dependency rules for the live package graph.
- [x] The updated wording still preserves the real dependency-boundary checks the audit should enforce.
- [x] `docs/logs/2026/05-02.md` records the handbook sync.

### Phase 2 - Region And Fragment API Doc Sync

Status: completed
Targets: `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-core.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/scope-ownership-and-isolation.md`, any directly affected reference doc, `docs/logs/2026/05-02.md`

- [x] Remove `RenderRegionHandle.instantiate()` and `RenderFragmentOptions.data` from the active architecture wording and examples.
- [x] Update `flux-core.md` so the top-level pipeline no longer references `RendererRuntime.instantiate(...)`.
- [x] Sync nearby active owner docs so fragment child-scope creation consistently uses `bindings`, not removed `data` wording.
- [x] If any nearby reference doc repeats the removed API wording after the owner-doc update, sync it in the same slice.

Exit Criteria:

- [x] `docs/architecture/renderer-runtime.md` matches the live `RenderRegionHandle` and `RenderFragmentOptions` types in `packages/flux-core/src/types/renderer-hooks.ts`.
- [x] `docs/architecture/flux-core.md` no longer describes the removed instantiate pipeline.
- [x] `docs/architecture/action-scope-and-imports.md` and `docs/architecture/scope-ownership-and-isolation.md` describe fragment child-scope creation through `bindings`.
- [x] Any in-scope reference doc touched for consistency matches the same final baseline.
- [x] `docs/logs/2026/05-02.md` records the architecture-doc sync.

## Validation Checklist

- [x] dimension-01 handbook rules match the live package graph
- [x] active architecture docs no longer document removed region/fragment APIs
- [x] independent review confirms no remaining plan-owned doc drift in scope
- [x] independent closure audit is completed and recorded

## Closure

Status Note: Completed after the active handbook and owner-doc baseline was re-synced to the live package graph and renderer hook types, and an independent closure audit confirmed no remaining plan-owned doc drift in scope.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent subagent closure audit
- Evidence: `ses_219ce8a42ffeGxMEURcUQTEJ3t` verified that the dimension-01 handbook rule matches `packages/ui/package.json`, the active owner docs no longer document removed `instantiate()` / fragment `data` APIs, the widened `bindings` wording is consistent across the in-scope architecture docs, and `docs/logs/2026/05-02.md` records the sync.

Follow-up:

- broader doc drift outside this narrow residual set should move through a separate successor plan rather than widening this one
