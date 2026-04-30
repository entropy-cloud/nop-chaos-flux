# 155 Architecture Owner-Doc Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-04-30
> Source: `docs/analysis/2026-04-30-architecture-doc-code-consistency-audit.md`, `docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/complex-control-host-protocol.md`

## Purpose

把 `docs/architecture/` 与 live code 收敛到同一套 owner-doc 基线，并明确区分三类情况：文档落后于代码、代码落后于文档、以及 mixed-owner drift。计划完成时，相关 owner docs 必须回到“只描述当前最终设计状态”的要求，且 closure 需要独立审计证明。

## Current Baseline

- `docs/analysis/2026-04-30-architecture-doc-code-consistency-audit.md` 已完成一次基于 top-level precedence 的全量审计，并通过多轮独立子 agent 复核达成一致。
- 当前确认的收敛类型分为三类：
  - 文档落后于代码：`docs/architecture/word-editor/design.md`、`docs/architecture/flow-designer/api.md`、`docs/architecture/flow-designer/runtime-snapshot.md`、`docs/architecture/flow-designer/config-schema.md`、`docs/architecture/report-designer/design.md`、`docs/architecture/report-designer/config-schema.md`、`docs/architecture/playground-experience.md`、`docs/architecture/field-frame.md`
  - 代码落后于文档：`packages/flux-renderers-data/src/crud-renderer.tsx` 中 `${$form.values}` 违反 `docs/architecture/form-external-publication-and-reserved-bindings.md`
  - mixed-owner drift：样式文档族关于 root marker 与 default-spacing 的冲突、`docs/references/architecture-doc-status-matrix.md` 的 owner 集合滞后、Report Designer family docs 的 live-vs-future owner 边界混写
- 顶层判定准则已经固定：`docs/architecture/frontend-programming-model.md` 为 top-level normative precedence；`docs/architecture/flux-design-principles.md` 为 governing principles；`docs/architecture/flux-dsl-vm-extensibility.md` 与 `docs/architecture/complex-control-host-protocol.md` 为 complex-host/platform-extension owner docs。
- 当前尚未把这些结论执行为完整对齐改动；计划 155 负责收口本轮明确列出的 owner-doc / code drift，不重新定义顶层架构。

## Goals

- 修正本轮审计中已确认的 owner-doc drift，使相关 `docs/architecture/` 文件只描述当前最终设计状态。
- 修正 `${$form.values}` 这一处明确的 code-lagging-behind-docs 行为，使 live code 重新符合 owner contract。
- 修正 `docs/references/architecture-doc-status-matrix.md` 与当前 routed owner-doc 集合的滞后问题。
- 在计划关闭前，通过独立子 agent 完成 fresh post-execution closure audit，并把证据写回 plan / log。

## Non-Goals

- 不重新设计 Flux top-level programming model、primitive closure 或 complex-host overall architecture。
- 不处理本轮审计之外的新 architecture redesign 提案。
- 不把所有 `docs/architecture/` 文档逐字重写一遍；只处理已审计确认的 drift slice。
- 不在本计划中引入新的复杂控件协议或新的 workbench 通用对象模型。

## Scope

### In Scope

- `docs/architecture/word-editor/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/runtime-snapshot.md`
- `docs/architecture/flow-designer/config-schema.md`
- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/config-schema.md`
- `docs/architecture/report-designer/README.md`
- `docs/architecture/report-designer/api.md`
- `docs/architecture/report-designer/contracts.md`
- `docs/architecture/playground-experience.md`
- `docs/architecture/field-frame.md`
- `docs/architecture/styling-system.md`
- `docs/architecture/renderer-markers-and-selectors.md`
- `docs/architecture/container-spacing-design.md`
- `docs/references/architecture-doc-status-matrix.md`
- `packages/flux-renderers-data/src/crud-renderer.tsx`
- 相关 tests / verification needed to prove the code-side `$form` contract fix
- corresponding execution-date `docs/logs/` entry

### Out Of Scope

- 新增 architecture families 或大规模目录迁移
- Report Designer / Flow Designer / Word Editor 的新功能实现
- 与本轮 owner-doc drift 无关的 playground visual redesign
- 清理所有 stale `dist/` 产物

## Execution Plan

### Phase 1 - Owner-Doc And Contract Baseline Fixes

Status: completed
Targets: `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, `docs/architecture/container-spacing-design.md`, `docs/architecture/report-designer/README.md`, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/config-schema.md`, `docs/architecture/report-designer/api.md`, `docs/architecture/report-designer/contracts.md`, `docs/references/architecture-doc-status-matrix.md`, `docs/index.md`, `docs/components/report-designer-page/design.md`, `docs/architecture/action-scope-and-imports.md`

- [x] Reconcile the styling-family baseline first so root-marker/default-spacing ownership is no longer contradictory across owner docs.
- [x] Update the Report Designer family docs in scope so current live renderer-contract facts, future/reference material, and family-vs-component ownership boundaries are explicitly distinguished.
- [x] If `report-designer/api.md` and `contracts.md` remain future/reference docs, update their routing/entrypoint references in scoped owner docs so they are not still presented as active live-owner reading paths.
- [x] Update `docs/references/architecture-doc-status-matrix.md` so the concrete missing active docs found by the audit are no longer omitted.

Exit Criteria:

- [x] `docs/architecture/styling-system.md`, `docs/architecture/renderer-markers-and-selectors.md`, and `docs/architecture/container-spacing-design.md` no longer directly contradict each other about shipped marker-rooted default CSS.
- [x] `docs/architecture/report-designer/design.md` and `docs/architecture/report-designer/config-schema.md` no longer present stale current-looking renderer schema shape such as `spreadsheet?: SpreadsheetConfig`.
- [x] `docs/architecture/report-designer/config-schema.md` no longer describes the expression adapter contract in a way that conflicts with live framework-agnostic core code.
- [x] `docs/architecture/report-designer/api.md` / `contracts.md` are either clearly labeled as target/reference material or rewritten so they no longer blur live owner-doc precedence.
- [x] If `docs/architecture/report-designer/api.md` / `contracts.md` remain target/reference docs, scoped routing docs (`docs/architecture/report-designer/README.md`, `docs/index.md`, `docs/components/report-designer-page/design.md`, `docs/architecture/action-scope-and-imports.md`) no longer present them as live-owner reading paths without qualification.
- [x] `docs/references/architecture-doc-status-matrix.md` includes at least the concrete omissions `capability-projection-manifest.md`, `capability-contract-model.md`, `node-level-compile-time-transforms.md`, and `word-editor/design.md`.
- [x] Related `docs/architecture/` files are updated to final-design wording only.
- [x] The corresponding execution-date `docs/logs/` entry is updated.

### Phase 2 - Current-State Doc Convergence

Status: completed
Targets: `docs/architecture/word-editor/design.md`, `docs/architecture/flow-designer/api.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/architecture/playground-experience.md`, `docs/architecture/field-frame.md`

- [x] Rewrite the scoped current-state docs so they match the audited live code facts without reopening top-level architecture.
- [x] Update `word-editor` doc model text to match live domain model boundaries.
- [x] Update Flow current-state docs to match live save/export/minimap behavior, multi-select facts, branch-aware host scope, and node-body binding shape.
- [x] Remove stale route counts and planned-vs-landed wording from the scoped docs.

Exit Criteria:

- [x] `docs/architecture/word-editor/design.md` no longer describes a `WordDocument` shape that conflicts with live core code.
- [x] `docs/architecture/flow-designer/api.md` no longer describes stale save/export/minimap implementation notes.
- [x] `docs/architecture/flow-designer/runtime-snapshot.md` no longer claims single-select-only behavior and now reflects branch-aware host scope fields.
- [x] `docs/architecture/flow-designer/config-schema.md` no longer documents a stale node-body binding shape.
- [x] `docs/architecture/playground-experience.md` no longer hardcodes stale route counts.
- [x] `docs/architecture/field-frame.md` no longer describes landed behavior in this plan’s scope as future or incomplete.
- [x] Related `docs/architecture/` files are updated to final-design wording only.
- [x] The corresponding execution-date `docs/logs/` entry is updated.

### Phase 3 - Code Contract Fix And Verification

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer.tsx`, focused tests for CRUD query-form behavior, repo-wide `$form.values` search boundary, `docs/architecture/form-external-publication-and-reserved-bindings.md` if wording needs a small sync note

- [x] Remove or replace `${$form.values}` usage in CRUD query-form submit flow so the implementation respects the owner contract that `$form` is summary-only.
- [x] Add or update focused tests proving CRUD query-form submit behavior without `${$form.values}`.
- [x] Verify with repo-observable search that no package-level consumer in the checked scope still uses `\$form.values`.
- [x] Re-run required verification for code changes.

Exit Criteria:

- [x] No package-level consumer in the checked repo scope treats `$form` as a values object, verified by search over `packages/**` for `\$form.values` plus updated code paths.
- [x] Focused tests cover the corrected CRUD query-form behavior.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` succeed after the code change.
- [x] Related docs remain aligned with the resulting implementation.
- [x] The corresponding execution-date `docs/logs/` entry is updated.

### Phase 4 - Independent Closure Audit

Status: completed
Targets: `docs/plans/155-architecture-owner-doc-convergence-plan.md`, `docs/analysis/2026-04-30-architecture-doc-code-consistency-audit.md`, scoped docs/code changed by this plan, corresponding execution-date `docs/logs/` entry

- [x] Launch fresh independent subagent closure audit(s) after execution is complete.
- [x] Re-check every phase exit criterion against live repo state, not just implementation notes.
- [x] Record repeated audit evidence and resolve any final disagreements before marking the plan completed.

Exit Criteria:

- [x] Fresh independent subagent review confirms the scoped doc/code drift for this plan is resolved or explicitly moved out of scope.
- [x] Repeated audit evidence is recorded with task ids and outcomes in this plan and/or the corresponding daily log.
- [x] Every Phase in this plan is marked `completed` before plan-level closure.
- [x] The corresponding execution-date `docs/logs/` entry is updated with closure-audit evidence.

## Validation Checklist

- [x] The scoped owner docs now distinguish `docs lagging behind code`, `code lagging behind docs`, and mixed-owner drift outcomes correctly
- [x] Report Designer family docs and component owner docs no longer blur renderer-contract ownership in this plan’s scope
- [x] Styling-family docs no longer directly contradict shipped default-spacing behavior
- [x] `docs/references/architecture-doc-status-matrix.md` contains the concrete missing active docs named in this plan
- [x] `${$form.values}` contract violation is removed from live code
- [x] Focused verification for changed code paths is complete
- [x] Repeated independent subagent audits have been completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Audit Evidence Log

- Plan review round 1: independent subagent review `ses_223ae0ac6ffettZASzIsc9xdOk` flagged plan-shape and scope issues; revised plan before execution.
- Plan review round 2: independent subagent review `ses_223ae0abdffeKQDHudrH7GXlEb` accepted the revised execution plan as ready to run.
- Post-execution audit round 1: independent closure audit `ses_22342d974ffef0vdxeis4rSqyT` found two remaining blockers: an unqualified `report-designer/contracts.md` reference in `docs/architecture/action-scope-and-imports.md` and missing focused validation-block coverage / closure recording.
- Post-execution audit round 2: focused Phase 3 audit `ses_2230ab8c3ffeOkAf2sjqUV7SGF` passed after the validation-block regression test was added, and final closure audit `ses_2230ab8d6ffeugnf1CYh2cCUGH` confirmed all scoped doc/code drift was resolved. Final repo verification then passed with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

## Closure

Status Note: completed. The scoped owner-doc drift, CRUD `$form` contract violation, routing/matrix cleanup, and closure-audit evidence are all landed and re-verified against live repo state.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audits `ses_22342d974ffef0vdxeis4rSqyT`, `ses_2230ab8c3ffeOkAf2sjqUV7SGF`, and `ses_2230ab8d6ffeugnf1CYh2cCUGH`
- Evidence: round 1 found the final doc qualification + validation-test gaps; those were fixed in `docs/architecture/action-scope-and-imports.md` and `packages/flux-renderers-data/src/__tests__/data-crud-state-interactions.test.tsx`. Round 2 confirmed the Phase 3 contract fix and full plan scope were closed. Final repo verification passed: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.

Follow-up:

- If additional architecture drift is found outside this plan’s scoped files after closure, record it in `docs/analysis/` or move it to a successor plan instead of reopening this closed plan without a new baseline.
- No remaining plan-owned work.
