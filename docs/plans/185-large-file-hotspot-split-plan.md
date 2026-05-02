# 185 Large File Hotspot Split Plan

> Plan Status: planned
> Last Reviewed: 2026-05-02
> Source: `docs/plans/182-deep-audit-full-3-mechanical-fixes-plan.md`, live code in `packages/flux-runtime/src/async-data/api-data-source-controller.ts`, `packages/flux-renderers-form/src/field-utils.tsx`, `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx`, `docs/references/refactoring-guidelines.md`
> Related: `docs/references/refactoring-guidelines.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`, `docs/components/spreadsheet-page/design.md`

## Purpose

把当前仍保留的三个高价值超大文件拆成职责清晰的模块，同时保持行为与公共 surface 不变。这个 owner surface 是纯 refactoring hygiene：不混入新的语义设计、不顺手扩大到其它 residual，只收口这三个已被多轮审计反复命中的热点文件。

## Current Baseline

- `packages/flux-runtime/src/async-data/api-data-source-controller.ts` 当前约 530 行，混合了 request sequencing、async-governance settle、cache、polling、state publication、stop condition、start/stop/reset orchestration。
- `packages/flux-renderers-form/src/field-utils.tsx` 当前约 501 行，混合了 field binding 读取、adapter in/out、validation behavior、field presentation、hidden-field policy、controller hooks。
- `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx` 当前约 607 行，把 toolbar actions、visual groups、find/replace panel、cell editor、comment editor 和 props/type declarations 全部堆在一个组件文件里。
- `docs/references/refactoring-guidelines.md` 已要求基于 live repo audit 为大文件治理写清超大文件清单、拆分阈值和验证方式；当前这三处仍是明确的 plan-owned 热点。
- `Plan 166`、`Plan 170`、`Plan 182` 已分别修改过这些热点附近的局部行为，但都没有完成结构性文件拆分。

## Goals

- 把 3 个热点文件拆成职责清晰的模块，同时保持现有 public API 和运行时行为不变。
- 让原始 orchestrator/root file 降到“薄协调文件”规模，默认目标为不超过约 260 行。
- 为每个拆分后的 owner surface 保留 focused regression coverage，避免“拆分后只剩组织变化、没有行为验证”。
- 同步必要的 owner docs 和开发日志，确保新的模块边界可追溯。

## Non-Goals

- 不在本计划里改变 data-source、field controller、spreadsheet toolbar 的功能语义。
- 不把本计划与 renderer typing、async stale-result、subscription precision 等其它 residual 合并。
- 不处理本计划之外的其它大文件或测试文件拆分。
- 不创建新 package 或改变 workspace package boundary。

## Scope

### In Scope

- `packages/flux-runtime/src/async-data/api-data-source-controller.ts`
- `packages/flux-renderers-form/src/field-utils.tsx`
- `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx`
- new helper/modules created directly around those three files
- focused tests that protect each split surface
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/renderer-runtime.md`
- `docs/components/spreadsheet-page/design.md`
- `docs/references/refactoring-guidelines.md`

### Out Of Scope

- any file not listed above
- semantic redesign of the affected controllers/renderers
- renderer typing migration
- detail/variant async sequencing work
- broader hot-path subscription work

## Execution Plan

### Phase 1 - Split The Async Data-Source Controller

Status: planned
Targets: `packages/flux-runtime/src/async-data/api-data-source-controller.ts`, new async-data helper modules, focused tests, `docs/architecture/flux-runtime-module-boundaries.md`

- [ ] Create focused modules first for request execution/settle, state publication, and polling/refresh orchestration while keeping the old controller file intact until the new pieces verify.
- [ ] Replace the current monolith with a thin coordinator that delegates to those extracted modules without changing the public `createDataSourceController(...)` surface.
- [ ] Add or refresh focused tests for refresh dedup, stale request handling, polling, stop conditions, and reset/start/stop behavior.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `api-data-source-controller.ts` is reduced to a thin coordinator file with a target size at or below ~260 lines.
- [ ] The extracted async-data modules have clear single-responsibility boundaries and preserve existing controller behavior under focused tests.
- [ ] `docs/architecture/flux-runtime-module-boundaries.md` is updated to reflect the new async-data module layout.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Split Field Utilities By Responsibility

Status: planned
Targets: `packages/flux-renderers-form/src/field-utils.tsx`, new field-utils helper modules, focused tests, `docs/architecture/renderer-runtime.md`, `docs/references/refactoring-guidelines.md`

- [ ] Extract focused modules for field binding reads, async/sync field handlers, field presentation/validation behavior, and hidden-field policy.
- [ ] Keep the public export surface stable so existing renderer imports can continue to use the current package entry points.
- [ ] Add or refresh focused tests for `useFieldPresentation`, `useFieldHandlers`, and `useHiddenFieldPolicy` after the split.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `field-utils.tsx` is reduced to a thin orchestrator/barrel file with a target size at or below ~260 lines.
- [ ] Extracted modules separate binding, presentation, handler, and hidden-policy responsibilities without behavior drift.
- [ ] `docs/architecture/renderer-runtime.md` and/or `docs/references/refactoring-guidelines.md` are updated for any new stable module-ownership guidance introduced by the split.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Split Spreadsheet Toolbar Composition

Status: planned
Targets: `packages/spreadsheet-renderers/src/spreadsheet-toolbar.tsx`, new toolbar submodules, focused tests, `docs/components/spreadsheet-page/design.md`

- [ ] Extract type/config definitions and visual subcomponents for toolbar groups, find/replace UI, and cell/comment editor UI.
- [ ] Keep `SpreadsheetToolbarProps` and the top-level component contract stable while reducing the root file to a thin composition shell.
- [ ] Add or refresh focused tests for toolbar actions, conditional panels, and in-scope interactive sections after the split.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `spreadsheet-toolbar.tsx` is reduced to a thin composition file with a target size at or below ~260 lines.
- [ ] Toolbar submodules cleanly separate action groups and auxiliary panels without changing the public prop contract.
- [ ] `docs/components/spreadsheet-page/design.md` is updated if the new composition boundary or stable test hooks become part of the documented baseline.
- [ ] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Verification And Closure Audit

Status: planned
Targets: in-scope packages, focused tests, this plan

- [ ] Run focused verification for each split surface.
- [ ] Run required workspace verification after the refactors land.
- [ ] Perform an independent closure audit against the live repo.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Focused verification is recorded for each split surface.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining in-scope large-file hotspot work owned by this plan.
- [ ] `docs/logs/` 对应日期条目已更新。

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。关闭流程详见本 guide 的 `When Closing The Plan` 和 `Closure Audit Rule`。

- [ ] All 3 hotspot files are reduced to thin composition/orchestrator files.
- [ ] Public behavior and export surfaces remain stable under focused tests.
- [ ] Relevant owner docs are updated to reflect the new module boundaries.
- [ ] Focused verification is complete.
- [ ] Independent closure audit is complete and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending execution.

Closure Audit Evidence:

- Reviewer / Agent: TBD
- Evidence: TBD

Follow-up:

- Remaining large-file work outside this 3-file hotspot set must be handled by separate owner plans rather than expanding this plan mid-flight.
- Otherwise, no remaining plan-owned work.
