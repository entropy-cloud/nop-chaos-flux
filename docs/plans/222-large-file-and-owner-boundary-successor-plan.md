# 222 Module Boundary And Owner Boundary Successor Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-07
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,02-module-responsibility.md}`
> Related: `docs/plans/{185-large-file-hotspot-split-plan.md,220-cross-boundary-state-and-host-contract-closure-plan.md,221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md}`

## Purpose

承接 `full-8` 维度 02 的 retained module-boundary defects，把跨包深层耦合、第三方 API 泄露、root entry side-effect/boundary drift、以及一组长期膨胀的 owner-hotspot 文件收敛到更窄的模块边界。完成态要求：report designer 不再深耦合 spreadsheet internals，word-editor core 不再直接把第三方 API 作为自己的 public contract 暴露，`spreadsheet-renderers` root entry 与 `flux-i18n` headless/React surface 边界清晰，且 `schema-compiler.ts`、`word-editor-page.tsx`、`designer-page.tsx`、`designer-xyflow-canvas.tsx`、`hooks.ts`、`node-renderer.tsx` 都落成可审计的薄根文件或明确 owner-split。

## Current Baseline

- `docs/analysis/2026-05-07-deep-audit-full-8/02-module-responsibility.md` 的最终 retained set包括 8 组边界问题：`report-designer-renderers` 深耦合 spreadsheet internals、`word-editor-core` 第三方 API re-export、`spreadsheet-renderers/src/index.ts` root entry side effects/internal exports、`flux-i18n` headless/React adapter 未隔离、以及 `schema-compiler.ts`、`word-editor-page.tsx`、`designer-page.tsx`、`designer-xyflow-canvas.tsx`、`hooks.ts`、`node-renderer.tsx` 这组长期混合职责热点文件中的后续 split 热点。
- `220` 已关闭 report/word host-truth correctness defects；本计划只拥有 module-boundary 与 public-owner surface 的收敛，不重开 `220` 的 correctness 语义。
- `185` 已经固定了 thin orchestrator / focused helper 的拆分方法；本计划沿用该方法，不回退到把多类职责重新堆回单根文件。

## Goals

- 让 report designer 与 spreadsheet internals 的依赖边界回到 package-owned adapter/contract，而不是直接消费内部组合件。
- 将 `word-editor-core` 的第三方 public re-export 收敛为自有 adapter/types surface。
- 让保留的大文件热点形成更清晰的 owner boundary 和 focused proof。

## Non-Goals

- 不重开 `220` 已关闭的 report/word correctness baselines。
- 不把本计划扩大成全仓 architecture rewrite。
- 不接管 runtime ownership、validation、test hardening、accessibility、security/performance 族问题。

## Scope

### In Scope

- `packages/report-designer-renderers/src/{page-renderer.tsx,report-spreadsheet-canvas.tsx}` and directly affected adapter/helper modules
- `packages/word-editor-core/src/index.ts` and any new adapter/type surface created to replace third-party re-exports
- `packages/spreadsheet-renderers/src/index.ts`
- `packages/flux-i18n/src/{i18n.ts,hooks.ts,index.ts}`
- `packages/flux-compiler/src/schema-compiler.ts`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx`
- `packages/flux-react/src/{hooks.ts,node-renderer.tsx}`
- directly affected focused tests and owner docs for the above files

### Out Of Scope

- `220` owned report/word host-truth and spreadsheet action/provider correctness
- build/public export drift owned by `221`
- runtime/reactive/async/lifecycle/error propagation owned by `223`

## Execution Plan

### Workstream 1 - Freeze Carve-Outs And Target Boundaries

Status: completed
Targets: in-scope hotspot files, this plan, affected refactoring docs only if needed

- Item Types: `Decision | Proof`

- [x] [Decision] Re-audit each in-scope hotspot and freeze the target post-split owner boundary before editing code.
- [x] [Decision] Record the exact carve-out with `220` so refactors do not silently reopen already-closed correctness semantics.
- [x] [Proof] Capture the pre-split line-count and owner-mix baseline for each retained hotspot.

Exit Criteria:

- [x] Every in-scope hotspot has an explicit target boundary recorded in this plan.
- [x] The carve-out against `220` is explicit and auditable.
- [x] The pre-split baseline is recorded for closure re-audit.
- [x] `No owner-doc update required` is explicit unless this work introduces stable new split guidance.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Remove Cross-Package Boundary Leakage

Status: completed
Targets: report-designer, word-editor, spreadsheet root entry, and i18n boundaries, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Replace report-designer direct consumption of spreadsheet internals with a package-owned adapter/bridge boundary.
- [x] [Fix] Replace `word-editor-core` third-party re-exports with self-owned adapter/types that describe the supported public surface.
- [x] [Fix] Reduce `spreadsheet-renderers/src/index.ts` to a clear root entry boundary instead of a mixed CSS-side-effect/internal-composition export surface.
- [x] [Fix] Separate `flux-i18n` headless initialization from React adapter exports so the package boundary is explicit.
- [x] [Proof] Add focused proof that the new boundaries preserve supported behavior without reopening `220` correctness ownership.
- [x] [Decision] Update only the owner docs directly changed by the final boundary decision. `No owner-doc update required` for this slice because no active architecture doc describes these exact internal split surfaces today.

Exit Criteria:

- [x] Report-designer no longer depends on spreadsheet internals as a live owner boundary.
- [x] `word-editor-core` no longer treats the third-party package as its public API surface.
- [x] `spreadsheet-renderers/src/index.ts` and `flux-i18n` no longer mix the retained boundary families identified by the audit.
- [x] Focused tests prove the replacement boundaries preserve the supported baseline.
- [x] The owner docs directly changed by this plan are updated if the stable boundary changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Split Retained Hotspot Files

Status: completed
Targets: `schema-compiler.ts`, `word-editor-page.tsx`, `designer-page.tsx`, `designer-xyflow-canvas.tsx`, `hooks.ts`, `node-renderer.tsx`, related tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Split `schema-compiler.ts` by compile/prepare/validate responsibility.
- [x] [Fix] Split `word-editor-page.tsx` and `designer-page.tsx` into thinner page shells plus focused controller/host/panel helpers.
- [x] [Fix] Split `designer-xyflow-canvas.tsx` into thinner canvas shell plus focused viewport/overlay/DOM-patch helpers.
- [x] [Fix] Split `hooks.ts` and `node-renderer.tsx` into narrower owner modules.
- [x] [Proof] Add or update focused proof for each split surface so closure is not just file movement.
- [x] [Decision] Record whether each new boundary becomes part of the stable owner-doc baseline. `No owner-doc update required` for this slice because the split preserves the supported public surface without changing published architecture contracts.

Exit Criteria:

- [x] The retained hotspots no longer mix the owner families identified by the audit.
- [x] The root files land as thin orchestrators or equivalent honest shells.
- [x] Focused tests prove public behavior remains stable after the split.
- [x] Affected owner docs are updated where the stable module baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages/tests/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused verification for each boundary change after code/doc updates land.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc changes land.
- [ ] Perform an independent closure audit and fix any remaining in-scope owner-boundary ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for each landed split surface.
- [ ] Workspace verification passes.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope module-boundary defects from `full-8` are fixed.
- [x] The in-scope hotspot roots no longer mix the retained owner families.
- [x] Focused verification exists for each landed split surface.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected owner docs are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [ ] `pnpm test` (`flux-renderers-form-advanced` retains 10 pre-existing `detail-view` failures in 3 files; not introduced by this plan)

## Validation Checklist

- [x] `220` owned correctness semantics remain explicitly carved out.
- [x] Each split is justified by live owner-boundary evidence, not by line count alone.
- [x] Focused tests cover boundary behavior after the split.
- [x] No retained `full-8` module-boundary finding is left without an owner decision.

## Closure

Status Note: Workstreams 1-4 landed. Module boundaries were narrowed by moving spreadsheet CSS ownership out of the root barrel, introducing package-owned word-editor type aliases instead of direct third-party re-exports, adding optional headless `initFluxI18n({ react: false })` support, and splitting the retained hotspot files into thin orchestrators plus focused helpers. The plan remains open only because full workspace `pnpm test` still reports 10 pre-existing `flux-renderers-form-advanced` `detail-view` failures and an independent closure audit has not yet been recorded.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending independent closure audit; implementation verification completed with green `pnpm typecheck`, `pnpm build`, and `pnpm lint`.

Follow-up:

- Record independent closure audit after re-checking the retained pre-existing `flux-renderers-form-advanced` failures against live baseline.
