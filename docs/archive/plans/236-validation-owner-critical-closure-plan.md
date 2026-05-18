# 236 Validation Owner Critical Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-deep-audit-full/{08-validation.md,summary.md}`
> Related: `docs/plans/{224-validation-subtree-follow-up-plan.md,234-deep-audit-2026-05-08-critical-closure-program-plan.md}`

## Purpose

收口 2026-05-08 deep audit 已确认的 validation-owner critical defects：generic / projected / non-form validation owner 在值源、registration、child contract、commit revalidation 与 projected store 展示路径上的断裂。

完成态要求：non-form / generic owner 与 projected owner 的读取、注册、提交、重校验和展示路径语义一致，并有 focused regression tests 锁定。

## Current Baseline

- `08-01`、`08-02`、`08-03`、`08-06`、`08-09`、`08-11`、`08-12`、`08-13` 已经过维度复核与子项复核保留。
- 这些缺陷共享一个 owner family：generic/non-form validation owner 没有像 form owner 一样形成一致的 value source、projected path、registration refresh、child contract 与 commit/revalidation 生命周期。
- 当前问题横跨 `flux-runtime` validation owner、`flux-react` form hooks、以及 `flux-renderers-form-advanced` 的 `variant-field`、`detail-view`、`detail-field`、`object-field`、`tag-list`。

## Goals

- 让 generic/non-form validation owner 与 projected owner 的读写/展示/registration 生命周期对齐 live baseline。
- 修复 detail/object/variant/tag-list 在 non-form owner 下的 contract gap。
- 为每个 defect family 增加 focused regression coverage，并同步需要变更的 owner docs。

## Non-Goals

- 不处理本轮非 critical 的 validation P2 项，例如 `08-04`、`08-05`、`08-07`、`08-08`、`08-10`。
- 不重做整个 validation architecture 或重新定义 authoring 心智模型。
- 不吸收 spreadsheet state owner、async cancellation、或一般性 error-fidelity 修复。

## Scope

### In Scope

- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-runtime/src/*validation*`, `packages/flux-runtime/src/form-runtime-owner*.ts`, `packages/flux-runtime/src/projected-validation-runtime.ts`
- `packages/flux-react/src/hooks.ts`
- `packages/flux-react/src/hooks/use-form-hooks.ts`
- `packages/flux-renderers-form/src/field-utils/{field-handlers.tsx,field-presentation.tsx}`
- `packages/flux-renderers-form-advanced/src/{variant-field/**,detail-view/**,composite-field/object-field.tsx,tag-list.tsx}`
- 对应 tests
- 受影响 docs: `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`

### Out Of Scope

- 非 critical validation P2 follow-ups
- renderer styling / accessibility / event payload cleanup
- unrelated action/runtime error integrity fixes

## Execution Plan

### Phase 1 - Canonical Value Source And Projected Path Integrity

Status: completed
Targets: `flux-runtime` validation owner/projected runtime, `flux-react` hooks

- Item Types: `Fix | Proof`

- [x] [Fix] `08-01`、`08-02`、`08-03` 已完成：surface-root non-form owner 现在复用 live render scope；projected validation owner 现在提供 rebased store/scope/path 视图；bootstrapping validation owner 的 `validateAll` / `validateSubtree` 现在等待 owner 进入 active lifecycle 后再执行。
- [x] [Proof] focused tests 已补：`packages/flux-runtime/src/__tests__/runtime-dialogs-scope.dialog-actions.test.ts`、`packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.test.ts`、`packages/flux-runtime/src/__tests__/owner-validation-lifecycle-contracts.test.ts`。

Exit Criteria:

- [x] value source、projected path、transitional lifecycle contract 全部收敛。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。本轮 `08-01`/`08-03` 修复把 live code 拉回现有 owner baseline，没有改变文档声明的 public contract。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Non-Form Child Owner And Commit/Revalidation Closure

Status: completed
Targets: `variant-field`, `detail-view`, `detail-field`, `object-field`

- Item Types: `Fix | Proof`

- [x] [Fix] `08-06`、`08-09`、`08-12`、`08-13` 已完成：`variant-field` 现在通过 non-form owner 路由 hidden-path、child-contract 与 validation context；`detail-view` 非 form commit 后显式执行 parent validation owner revalidation，并在 confirm 期间临时屏蔽 child contract；`detail-field` 非 form commit 失败时保持 draft open；`object-field` 非 form async/sync final writeback 现在统一走 owner subtree revalidation helper。
- [x] [Proof] focused tests 已补：`packages/flux-renderers-form-advanced/src/detail-view/detail-revalidation.test.tsx`、`packages/flux-renderers-form-advanced/src/detail-view/detail-view-transform.test.tsx`、`packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx`、`packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx`、`packages/flux-renderers-form-advanced/src/composite-field/object-field-runtime.test.ts`。

Exit Criteria:

- [x] non-form child owner / commit / revalidation contract 已闭合。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。本轮修复收紧的是 non-form owner 执行路径，不改变文档里的 owner boundary 或 authoring semantics。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Runtime Registration Refresh Integrity

Status: completed
Targets: `packages/flux-react/src/hooks.ts`, `tag-list.tsx`, related runtime registration paths

- Item Types: `Fix | Proof`

- [x] [Fix] 已修复 `08-11`：`useCurrentFormModelGeneration()` 现在订阅 `currentForm ?? currentValidationScope` 的 generation channel，generic validation owner refresh 后 non-form runtime registration renderer 会重新执行 registration effect。
- [x] [Proof] focused tests：`packages/flux-react/src/__tests__/scope-and-reactivity.test.tsx` 覆盖 form owner 与 generic validation owner 两条 generation subscription 路径；`tag-list.tsx` 现有 registration effect 已稳定依赖该 generation 值。

Exit Criteria:

- [x] runtime registration refresh contract 已闭合。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。文档已声明 validation ownership 可脱离 `form`；本轮只是让 generation hook 对 generic owners 实现与文档一致。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 4 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] 运行 in-scope focused tests。
- [x] [Proof] 运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] [Decision] 执行独立 closure audit，确认没有把 in-scope validation owner defect 静默降级成 residual。

Exit Criteria:

- [x] 所有 focused verification 通过。
- [x] Workspace verification 通过。
- [x] 独立 closure audit 明确通过。
- [x] 受影响 owner docs 已更新，或显式记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope validation-owner critical defects 已修复。
- [x] focused verification 已完成并保留为 closure blocker。
- [x] 受影响 owner docs 已同步到 live baseline，或每个 phase 已显式记录 `No owner-doc update required`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope defect。
- [x] 独立 closure audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Non-Critical Validation Follow-Ups

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只收口 critical validation-owner set；其他 retained P2 validation findings 需要独立 owner 再排期。
- Successor Required: yes
- Successor Path: future validation follow-up plan

## Closure

Status Note: Completed. The remaining owner-lifecycle, non-form child-owner, and detail-field proof gaps were all closed on the live repo, and the independent closure audit found no remaining validation-owner blocker or silent deferral.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task `ses_1f3d7d6fcffeN1812fS1mT7gvS`
- Evidence: refreshed audit confirmed `08-02` via `packages/flux-runtime/src/__tests__/owner-validation-lifecycle-contracts.test.ts:74-158`, `08-06` via `packages/flux-renderers-form-advanced/src/variant-field/variant-field-owner-contract.test.tsx:80-136`, and `08-12` via `packages/flux-renderers-form-advanced/src/detail-view/detail-revalidation.test.tsx:181-246`; supporting focused proof also remains in `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.dialog-actions.test.ts`, `packages/flux-renderers-form-advanced/src/detail-view/projected-form-runtime.test.ts`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view-transform.test.tsx`, `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/object-field-runtime.test.ts`, and `packages/flux-react/src/__tests__/scope-and-reactivity.test.tsx`; final workspace verification passed via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- no remaining plan-owned work.
