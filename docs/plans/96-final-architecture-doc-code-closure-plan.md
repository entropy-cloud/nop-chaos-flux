# 96 Final Architecture Doc-Code Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-04-16
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/architecture/flux-core.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-scope-and-imports.md`
> Related: `docs/plans/64-node-identity-memory-optimization-and-compiledschemanode-cleanup-plan.md`, `docs/plans/39-dependency-tracking-root-scope-implementation-plan.md`, `docs/plans/12-action-scope-imports-and-component-invocation-plan.md`, `docs/plans/87-remaining-architecture-convergence-successor-plan.md`

## Purpose

Own the final closure work for architecture areas where the design direction is already settled, the main runtime path is already mostly landed, but the live repo still contains compatibility residue, tooling residue, or mixed-adoption seams that keep owner docs and code from being fully aligned.

This plan is intentionally narrow in philosophy even though it spans several areas: it does not ask for conceptual completion at any cost. It asks for balanced closure. The goal is to finish the remaining code/doc mismatches with the smallest durable implementation that makes the current baseline true, keeps compatibility boundaries explicit, and removes stale transition language as each slice lands.

## Current Baseline

- The main render path is already `CompiledTemplate -> TemplateNode -> NodeInstance`; the remaining `CompiledSchemaNode` problem is public/tooling residue, not the primary render contract.
- Scope read semantics are already closed on `readOwn()` / `readVisible()` / `materializeVisible()`.
- Dependency tracking is already root-normalized; explicit `dependsOn` exists and is authoritative when present.
- Flow Designer already exposes a `designer` namespace provider through `ActionScope` for schema-visible actions.
- Remaining gaps are now concentrated in four places: `CompiledSchemaNode` public/tooling surface, `data-source` publication compatibility lanes, runtime dependency fallback and diagnostics, and Flow Designer mixed capability-facade/direct-core adoption.
- The owner docs listed in this plan now describe those areas as current baseline plus remaining gaps, not as broad future-convergence narratives.

## Goals

- Narrow or eliminate the remaining code/documentation mismatches in the four architecture closure areas identified by the transition-closure review.
- Require reverse updates to owner docs immediately after each closure slice lands, so docs do not lag behind implementation.
- Keep the implementation balanced: prefer the smallest maintainable closure that matches the settled design instead of introducing new general-purpose abstractions for conceptual neatness.
- Close this plan only after an independent closure audit confirms both code semantics and doc wording, not just interface presence.

## Non-Goals

- Do not reopen already-landed architecture decisions such as template-instance render-path split, root-normalized dependency tracking, or the existence of `ActionScope` itself.
- Do not turn this into a new umbrella architecture rewrite plan.
- Do not remove compatibility behavior blindly if live code, tests, or existing authoring still need it; compatibility lanes may remain if they are explicitly documented and intentionally narrowed.
- Do not introduce new large abstraction layers solely to make the architecture look more symmetrical on paper.

## Scope

### In Scope

- `CompiledSchemaNode` public/tooling boundary cleanup
- `data-source` publication contract closure around `name`, `dataPath`, and `mergeToScope`
- dependency declaration tightening around `dependsOn`, runtime fallback, and diagnostics
- Flow Designer schema-facing capability-facade closure where direct owner-shell calls still leak into ordinary semantic interaction paths
- reverse updates to owner docs and follow-up analysis/log entries for each landed slice

### Out Of Scope

- full debugger redesign
- a mandatory product-wide ban on all compatibility schema paths in one step
- forcing every owner-internal high-frequency Flow Designer interaction through action dispatch
- any new cross-cutting runtime framework introduced only for architectural purity

## Execution Plan

### Phase 1 - Compiler Artifact Boundary Cleanup

Status: planned
Targets: `packages/flux-core/src/types/renderer-compiler.ts`, `packages/flux-runtime/src/schema-compiler.ts`, `packages/nop-debugger/src/`, `docs/architecture/flux-core.md`

- [ ] Re-audit every remaining public or tooling-facing use of `CompiledSchemaNode` and classify it as required compiler diagnostics surface, debugger/tooling residue, or removable public leakage.
- [ ] Narrow the public teaching surface so `CompiledSchemaNode` is no longer presented as part of the runtime-facing render contract.
- [ ] Where possible, move debugger/tooling integration to `CompiledTemplate` / `TemplateNode` summaries instead of reinforcing direct compiled-node exposure.
- [ ] Reverse-update `docs/architecture/flux-core.md` immediately after the landing so the remaining `CompiledSchemaNode` status is described precisely, not historically.

Exit Criteria:

- [ ] The active runtime/render path no longer has owner-doc ambiguity about `CompiledSchemaNode`.
- [ ] Any remaining `CompiledSchemaNode` usage is explicitly documented as compiler/tooling-only or removed from the public surface.

### Phase 2 - Data-Source Publication Closure

Status: planned
Targets: `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `docs/architecture/api-data-source.md`

- [ ] Re-audit live `data-source` publication behavior for `name`, `dataPath`, `mergeToScope`, anonymous compatibility paths, and related diagnostics.
- [ ] Tighten the code and/or diagnostics so `name` remains the primary publication contract while `dataPath` and `mergeToScope` stay clearly narrowed compatibility lanes.
- [ ] Avoid expanding `mergeToScope` into a broader parallel publication model just for conceptual completeness.
- [ ] Reverse-update `docs/architecture/api-data-source.md` as soon as the live compatibility boundary changes.

Exit Criteria:

- [ ] The repo has one clearly documented main publication contract for `data-source`.
- [ ] Any surviving compatibility behavior is explicitly narrowed and no longer described with equal contract weight to `name`.

### Phase 3 - Dependency Declaration Tightening

Status: planned
Targets: `packages/flux-runtime/src/source-registry.ts`, `packages/flux-runtime/src/reaction-runtime.ts`, `packages/flux-runtime/src/data-source-runtime.ts`, `docs/architecture/dependency-tracking.md`, `docs/architecture/api-data-source.md`

- [ ] Re-audit how source/reaction initialization handles declared `dependsOn` versus runtime fallback today.
- [ ] Add the smallest useful diagnostics or authoring guidance needed to make declaration-first intent visible without overengineering a new dependency analysis subsystem.
- [ ] Keep the explicit-first / runtime-fallback baseline unless live evidence supports stricter enforcement; do not force a hard authoring requirement prematurely.
- [ ] Reverse-update `docs/architecture/dependency-tracking.md` and `docs/architecture/api-data-source.md` after each landing so fallback semantics and diagnostics status stay current.

Exit Criteria:

- [ ] The remaining gap is accurately reduced to a clearly defined declaration/diagnostics boundary rather than broad dependency-model ambiguity.
- [ ] Docs and code agree on whether fallback is allowed, why it exists, and what diagnostics exist.

### Phase 4 - Flow Designer Capability-Facade Closure

Status: planned
Targets: `packages/flow-designer-renderers/src/`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flow-designer/design.md`

- [ ] Audit which Flow Designer interactions are schema-facing semantic actions versus owner-internal lifecycle/canvas coordination.
- [ ] Move ordinary schema-owned semantic interactions toward `designer:*` where that is the established contract.
- [ ] Keep high-frequency canvas/editor coordination on the imperative owner path when that remains the balanced implementation choice.
- [ ] Reverse-update `docs/architecture/action-scope-and-imports.md` and any relevant Flow Designer owner doc after each landing.

Exit Criteria:

- [ ] Schema-facing Flow Designer behavior is described and implemented primarily through the `designer:*` capability facade.
- [ ] Remaining direct `core.*` usage is narrowed to explicit owner-internal responsibilities and documented as such.

### Phase 5 - Reverse Update And Closure Audit

Status: planned
Targets: touched owner docs, `docs/analysis/2026-04-16-architecture-transition-closure-review.md`, `docs/logs/`

- [ ] Re-audit all slices owned by this plan against the live repo instead of trusting intermediate notes.
- [ ] Update owner docs and analysis docs so outdated transition wording is either removed or explicitly marked as replaced.
- [ ] Record closure evidence in the daily log, including what was verified and which compatibility lanes remain, if any.
- [ ] Run at least two independent subagent review passes: one for doc/code accuracy, one for plan closure quality and anti-overengineering.

Exit Criteria:

- [ ] No plan-owned slice is still described with stale future-tense wording once the code has landed.
- [ ] Independent closure review confirms no remaining plan-owned work is hidden behind interface-only or wording-only completion.

## Documentation Follow-Up

- Every landed phase must include a same-slice reverse update to the relevant owner docs.
- If a prior analysis or plan statement becomes stale, mark it as superseded or outdated instead of leaving multiple active baselines in parallel.
- `docs/analysis/2026-04-16-architecture-transition-closure-review.md` should be updated or explicitly superseded when this plan materially changes the closure baseline.

## Validation Checklist

- [ ] Live code and owner docs agree on the active render-path contract versus any remaining compiler/tooling residue
- [ ] Live code and owner docs agree on `data-source` primary publication semantics and any surviving compatibility lanes
- [ ] Live code and owner docs agree on `dependsOn` precedence, runtime fallback, and diagnostics status
- [ ] Live code and owner docs agree on Flow Designer schema-facing capability routing versus owner-internal direct calls
- [ ] reverse updates completed for every landed slice
- [ ] independent subagent review completed for doc/code accuracy
- [ ] independent subagent review completed for plan closure quality and anti-overengineering
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after the live repo has been re-audited, reverse updates are finished, and an independent closure audit confirms there is no remaining plan-owned mismatch between the settled architecture docs and code.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- If any slice remains too broad or reveals a new independent owner boundary, move that remainder into a narrower successor plan instead of keeping this plan artificially open.
- Otherwise record that there is no remaining plan-owned work.
