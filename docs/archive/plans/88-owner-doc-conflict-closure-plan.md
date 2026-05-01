# 88 Owner Doc Conflict Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-04-14
> Source: `docs/analysis/2026-04-14-flux-architecture-principle-consistency-and-performance-review.md`, `docs/architecture/api-data-source.md`, `docs/architecture/dependency-tracking.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-binding-and-renderer-contract.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/scoped-render-slots.md`, `docs/architecture/security-design-requirements.md`, `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/report-designer/api.md`
> Related: `docs/plans/72-field-binding-and-renderer-contract-unification-plan.md`, `docs/plans/82-architecture-contract-implementation-convergence-plan.md`, `docs/plans/87-remaining-architecture-convergence-successor-plan.md`

## Purpose

收口当前仍存在的少数 architecture owner-doc 冲突，让文档树在以下 5 个点上只说一套契约：

- `dependsOn` 当前基线
- `label` / `title` 的 normalized channel 归属
- region render API 的规范入口与兼容入口
- runtime permission 边界
- report/spreadsheet action namespace 的 owner 模型

这份计划只做文档 owner-contract 收口，不做新的运行时重构。

## Current Baseline

- 当前代码已经支持 `dependsOn`，且实现为 explicit roots first、runtime fallback second。
- 当前代码中的 `META_FIELDS` 已不包含 `name` / `label` / `title`，而 renderer definitions 已广泛把 `title` 建模为 `prop` 或 `value-or-region`。
- `RenderRegionHandle` 的 live types 和 React 实现处于兼容双轨：`render()` / `bindings` 为目标入口，`instantiate()` / `data` 仍保留兼容语义，`scopeKey` 仍是 live advanced option。
- 当前代码基本不存在独立的 runtime permission subsystem；host 可以投影 permission 结果，但 Flux runtime 本身不承担权限语义。
- 当前 report/spreadsheet 页面已通过 page-owned `ActionScope.registerNamespace(...)` 注册 `report-designer:*` / `spreadsheet:*` namespace，而不是通过全局 runtime action registry。
- 因此当前剩余问题主要是 owner docs wording 与 live baseline 不一致，而不是代码还未选择方向。

## Goals

- 让 5 个冲突点在 owner docs 中各自只有一套当前基线。
- 明确区分“规范入口”和“兼容入口”，避免把兼容路径继续写成并列主契约。
- 保持与 live code 一致，不为了简化文档而把文档改回旧实现或旧抽象。
- 把这次收口记录到计划、分析和 daily log 中，便于后续 closure audit。

## Non-Goals

- 不改动 runtime / React / renderer 代码。
- 不在本计划中关闭更大范围的 architecture audit 或 successor plans。
- 不新增新的 permission/runtime/import 模型。
- 不重写所有相关文档，只修正当前冲突点的 owner wording。

## Scope

### In Scope

- `docs/architecture/api-data-source.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/scoped-render-slots.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`
- `docs/architecture/report-designer/api.md`
- `docs/plans/88-owner-doc-conflict-closure-plan.md`
- `docs/logs/2026/04-14.md`

### Out Of Scope

- runtime or renderer code changes
- unrelated architecture cleanup outside the 5 targeted conflicts
- broad wording/style rewrites with no contract effect

## Execution Plan

### Workstream 1 - Dependency Baseline Closure

Status: completed
Targets: `docs/architecture/api-data-source.md`, `docs/architecture/dependency-tracking.md`

- [x] Update `dependency-tracking.md` so the convergence path no longer claims `dependsOn` does not exist.
- [x] Keep the future section focused on remaining work after explicit roots landed: diagnostics, deeper optimization, row reconciliation.
- [x] Ensure both docs describe the same live baseline: explicit roots first, runtime fallback second.

Exit Criteria:

- [x] No active owner doc still says `dependsOn` is absent.
- [x] `api-data-source.md` and `dependency-tracking.md` now describe the same current runtime behavior.

### Workstream 2 - Renderer And Slot Contract Closure

Status: completed
Targets: `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/scoped-render-slots.md`

- [x] Remove `label` from the `meta` examples in `renderer-runtime.md` and align the wording with the frozen field-binding contract.
- [x] Rewrite region render examples so `render({ bindings, instancePath })` is the normative path.
- [x] Keep `data` / `instantiate()` / `scopeKey` documented only as compatibility or advanced/internal carriers, not as competing primary contracts.

Exit Criteria:

- [x] `renderer-runtime.md` no longer implies `label` is part of stable global `meta`.
- [x] Slot/region docs now present one primary render API and clearly mark compatibility paths.

### Workstream 3 - Runtime Boundary Closure

Status: completed
Targets: `docs/architecture/flux-dsl-vm-extensibility.md`, `docs/architecture/report-designer/api.md`

- [x] Align `flux-dsl-vm-extensibility.md` with the security doc by removing runtime permission semantics from the recommended boundary table.
- [x] Rewrite report/spreadsheet API wording away from `register*Actions(runtime)` and toward page-owned action-namespace providers registered on `ActionScope`.
- [x] Keep the API doc compatible with live code and host-owned namespace registration semantics.

Exit Criteria:

- [x] No active owner doc still implies Flux runtime performs permission decisions.
- [x] `report-designer/api.md` matches the live `ActionScope.registerNamespace(...)` owner model.

## Validation Checklist

- [x] The five targeted owner-doc conflicts are closed or reclassified with one clear current baseline.
- [x] Related docs/examples now use one primary wording for region render APIs.
- [x] `docs/logs/2026/04-14.md` records the execution and decisions.
- [x] Independent closure audit completed in a fresh task session and recorded in this plan or log.
- [x] No code changes were made in this plan; full-workspace `pnpm` verification is not plan-owned and remains out of scope.

## Closure

Status Note: the plan-owned owner-doc conflicts are now closed. The targeted docs converge on one current baseline for dependency roots, field-channel ownership, region-render APIs, runtime permission boundaries, and report/spreadsheet namespace ownership.

Closure Audit Evidence:

- Reviewer / Agent: fresh `explore` subagent closure audit
- Evidence: task `ses_2737aaa1fffe2Z0NS4x1XWr7FO` initially found two remaining in-scope drifts (`renderer-runtime.md` stale `meta.label`; `scoped-render-slots.md` old `data/scopeKey` examples). Those were corrected in the same execution pass, after which the targeted scope matched the plan exit criteria. Supporting execution notes were recorded in `docs/logs/2026/04-14.md`.

Follow-up:

- No remaining plan-owned doc conflict work. Any further architecture drift that remains is implementation or broader audit debt and stays under `docs/plans/87-remaining-architecture-convergence-successor-plan.md` where applicable.
