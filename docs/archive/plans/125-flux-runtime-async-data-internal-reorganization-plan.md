# 125 Flux Runtime Async-Data Internal Reorganization Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/api-data-source.md`, `docs/architecture/form-validation.md`, `docs/plans/110-api-request-and-cache-hygiene-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/124-runtime-compat-removal-and-boundary-cleanup-plan.md`
> Related: `docs/plans/110-api-request-and-cache-hygiene-plan.md`, `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`, `docs/plans/124-runtime-compat-removal-and-boundary-cleanup-plan.md`

## Purpose

在不新建 `flux-request-runtime` / `flux-data-runtime` package、不改变 author-visible runtime contract、也不混入新的 boundary redesign 的前提下，把 `packages/flux-runtime/src/` 内已经形成的 request + data-source + reaction + async-governance runtime-owned 子域收口成清晰的包内目录结构，并同步修正单元测试与文档锚点，使后续是否拆成独立 package 可以建立在更稳定的 live baseline 之上。

## Current Baseline

- `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md` 已完成 action-core extraction，并明确 request/source/reaction 与 action 的边界已经硬化到可继续评估后续 request/data-runtime owner 的程度，但并未执行 request/data-runtime 的物理重组。
- `docs/plans/124-runtime-compat-removal-and-boundary-cleanup-plan.md` 已关闭 compiler/action compatibility residue，当前剩余的 `request-runtime.ts`、`request-runtime-adaptor.ts`、`api-cache.ts`、`data-source-runtime.ts`、`source-registry.ts`、`reaction-runtime.ts`、`async-governance.ts` 都是 runtime-owned baseline，而不是待删除的 compat residue。
- `docs/plans/120-runtime-async-governance-convergence-plan.md` 已把 owner-level async governance baseline 收口到 `flux-runtime`，其 contract types 在 `flux-core`，实现现已落在 `packages/flux-runtime/src/async-data/async-governance.ts`，当前 consumers 仍是 runtime-owned async owners (`data-source`, `reaction`, async validation)。
- `docs/architecture/flux-runtime-module-boundaries.md` 已把 request execution、source/reaction runtime、host infrastructure、form runtime 分别记录为不同 owner clusters；本次执行已把 async-data 子域从 `packages/flux-runtime/src/*.ts` 顶层扁平分布收口到 `packages/flux-runtime/src/async-data/`。
- 当前首轮 async-data regrouping 的核心文件应限于：`request-runtime.ts`, `request-runtime-adaptor.ts`, `api-cache.ts`, `async-governance.ts`, `data-source-runtime.ts`, `data-source-runtime-utils.ts`, `data-source-state.ts`, `source-registry.ts`, `reaction-runtime.ts`。`scope-change.ts` 与 `status-owner.ts` 虽然服务 source/reaction 路径，但在 `docs/architecture/flux-runtime-module-boundaries.md` 中仍被描述为 focused helpers，本计划首轮不把它们强行并入 async-data 目录，以避免把内部重组扩大成新的 owner 设计。
- 当前直接或间接覆盖这些路径的测试仍分散在 `packages/flux-runtime/src/__tests__/request-runtime.test.ts`, `request-runtime-polling.test.ts`, `reaction-runtime.test.ts`, `runtime-reactions.test.ts`, `runtime-sources.test.ts`, `runtime-sources-refresh.test.ts`, `runtime-sources-merge.test.ts`, `runtime-validation.test.ts`, 以及现已移动到 `packages/flux-runtime/src/async-data/api-cache.test.ts` 的 cache unit test；其中 `request-runtime.test.ts` 已改为直接导入 `../async-data/request-runtime`。
- `packages/flux-runtime/src/index.ts` 当前导出仍保持薄入口；`runtime-factory.ts` 仍是总装入口。当前痛点不是 public API 漂移，而是 runtime 内部子域分布扁平，导致 owner grouping、测试组织、以及 future package extraction audit 都需要重复做路径级梳理。

## Delta From Earlier Plans

- Plan 123 已拥有 action-core extraction、request/source/reaction seam hardening、以及“可描述为 focused modules”的边界冻结；本计划不重开这些语义决策，只处理 `flux-runtime` 包内剩余 runtime-owned async-data 文件的物理布局。
- Plan 124 已拥有跨 package 的 compat cleanup、owner-based test re-homing、以及 mis-owned tests 的迁移；本计划不再做跨 package test movement，只允许 `flux-runtime` 包内测试跟随实现路径做 same-package import rewrites or colocated moves。
- Plan 110 与 Plan 120 已冻结 request/cache/polling hygiene baseline 和 owner-level async-governance baseline；本计划必须把它们视为 preserved semantics，而不是可顺手调整的实现细节。

## Goals

- 把 runtime-owned async-data 子域收口为明确的包内目录结构，使 request, cache, async governance, source, reaction 的代码位置与文档 owner 说明一致。
- 保持 `packages/flux-runtime/src/index.ts` 的 public export surface 稳定，不把本次重组扩大成 package boundary redesign。
- 让 `runtime-factory.ts`、`action-adapter.ts`、以及其他 runtime consumers 通过更清晰的包内 import 路径接入 async-data 子域，而不是继续依赖顶层扁平文件分布。
- 同步修正受路径移动影响的单元测试，包括测试文件位置、测试 import、以及 any focused barrel/index exports needed only for internal package structure.
- 更新 active docs 和 daily log，使 `flux-runtime-module-boundaries.md` 等文档能够直接指向新的包内目录结构。
- 为后续是否需要单独的 `flux-data-runtime` / `flux-request-runtime` successor plan 提供更低噪声的 live baseline，但不提前承诺一定拆包。

## Non-Goals

- 不创建新的 workspace package，不改变 monorepo package topology。
- 不修改 `ActionSchema`、`DataSourceSchema`、`ReactionSchema`、`RendererRuntime`、`ActionContext` 等 public contract。
- 不在本计划中重写 request/data-source/reaction/form 的语义，只做物理重组与边界收口。
- 不重新打开 plan 120 的 async-governance semantics，也不把 owner-level async governance 迁移到 `@nop-chaos/flux-action-core`。
- 不将 form runtime、page runtime、surface runtime、imports/host infrastructure、`scope-change.ts`、`status-owner.ts` 一起纳入本轮目录重组，除非仅为修正 import path 而发生最小连带修改。
- 不借本次目录重组顺手处理新的性能优化、behavior fixes、或 package extraction。

## Scope

### In Scope

- `packages/flux-runtime/src/index.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/runtime-action-helpers.ts`
- async-data target files:
  - `packages/flux-runtime/src/request-runtime.ts`
  - `packages/flux-runtime/src/request-runtime-adaptor.ts`
  - `packages/flux-runtime/src/api-cache.ts`
  - `packages/flux-runtime/src/async-governance.ts`
  - `packages/flux-runtime/src/data-source-runtime.ts`
  - `packages/flux-runtime/src/data-source-runtime-utils.ts`
  - `packages/flux-runtime/src/data-source-state.ts`
  - `packages/flux-runtime/src/source-registry.ts`
  - `packages/flux-runtime/src/reaction-runtime.ts`
- affected runtime tests under `packages/flux-runtime/src/__tests__/` and colocated tests such as `packages/flux-runtime/src/api-cache.test.ts`
- active docs and daily logs required to freeze the new internal layout baseline

### Out Of Scope

- new package creation under `packages/`
- `packages/flux-runtime/src/form-runtime*.ts` physical regrouping
- `packages/flux-runtime/src/page-runtime.ts`, `surface-runtime.ts`, `imports.ts`, `import-stack.ts`, `action-scope.ts`, `component-handle-registry.ts` physical regrouping
- `@nop-chaos/flux-action-core`, `@nop-chaos/flux-compiler`, `@nop-chaos/flux-react`, or renderer package boundary changes beyond import-path fixes caused by the internal move

## Design Position

### 1. This is an internal reorganization plan, not a package extraction plan

The owner result of this plan is a cleaner package-internal topology under `packages/flux-runtime/src/`, not a new workspace package. Closure requires that the codebase become easier to reason about as `runtime facade + internal subdomains`, but does not require that request/data runtime become independently publishable.

### 2. Request, source, reaction, and async governance move together as one runtime-owned subdomain

This plan treats the following files as one regrouping unit because they form a single runtime-owned async-data chain rather than unrelated utilities:

- request execution (`request-runtime.ts`, `request-runtime-adaptor.ts`)
- request/cache support (`api-cache.ts`)
- owner-level async governance (`async-governance.ts`)
- source runtime and state (`data-source-runtime.ts`, `data-source-runtime-utils.ts`, `data-source-state.ts`, `source-registry.ts`)
- reaction runtime (`reaction-runtime.ts`)

The plan must not move only one or two of these files while leaving the rest behind in a way that makes ownership harder to read than the current baseline. Focused helpers that still read better at the top level under the current architecture baseline stay out of scope for this first regrouping pass.

### 2.1 Frozen target layout for this plan

The target layout for execution is:

```text
packages/flux-runtime/src/
  async-data/
    async-governance.ts
    reaction-runtime.ts
    request-runtime.ts
    request-runtime-adaptor.ts
    api-cache.ts
    api-cache.test.ts
    data-source-runtime.ts
    data-source-runtime-utils.ts
    data-source-state.ts
    source-registry.ts
```

This plan may add one thin internal `index.ts` under `async-data/` only if it replaces multiple same-package relative imports with one stable internal import path. It must not add a new second public surface parallel to `packages/flux-runtime/src/index.ts`.

### 3. Tests are part of the owner baseline, not post-hoc cleanup

Because several `flux-runtime` tests currently import moved files by relative path, test realignment is a first-class execution slice. This includes:

- updating relative imports after file moves
- deciding whether any tests should move with the implementation to preserve colocated ownership
- keeping runtime-focused tests in `flux-runtime` rather than creating cross-package test leakage
- rerunning focused package tests before full-workspace verification

### 3.1 Test migration matrix

The execution baseline for tests is:

| Test file                                                             | Handling in this plan                                                                | Reason                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| `packages/flux-runtime/src/api-cache.test.ts`                         | move with implementation to `packages/flux-runtime/src/async-data/api-cache.test.ts` | colocated direct unit for moved module                            |
| `packages/flux-runtime/src/__tests__/request-runtime.test.ts`         | stay in `src/__tests__/`, rewrite relative imports to new request-runtime path       | direct request-runtime unit coverage, still runtime-owned         |
| `packages/flux-runtime/src/__tests__/request-runtime-polling.test.ts` | stay in `src/__tests__/`, no movement expected unless helper imports change          | runtime integration via public runtime entry                      |
| `packages/flux-runtime/src/__tests__/reaction-runtime.test.ts`        | stay in `src/__tests__/`, rewrite imports only if needed                             | runtime reaction integration coverage                             |
| `packages/flux-runtime/src/__tests__/runtime-reactions.test.ts`       | stay in `src/__tests__/`                                                             | runtime integration coverage                                      |
| `packages/flux-runtime/src/__tests__/runtime-sources.test.ts`         | stay in `src/__tests__/`                                                             | runtime integration coverage                                      |
| `packages/flux-runtime/src/__tests__/runtime-sources-refresh.test.ts` | stay in `src/__tests__/`                                                             | runtime integration coverage                                      |
| `packages/flux-runtime/src/__tests__/runtime-sources-merge.test.ts`   | stay in `src/__tests__/`                                                             | runtime integration coverage                                      |
| `packages/flux-runtime/src/__tests__/runtime-validation.test.ts`      | stay in `src/__tests__/`                                                             | protects plan 120 async-governance behavior from structural drift |

No test may move out of `@nop-chaos/flux-runtime` as part of this plan.

### 3.2 Preserved behavior invariants

Execution and closure must explicitly preserve:

- Plan 110 request/cache/polling behavior for request dedup, shared serialization, and polling cadence
- Plan 120 async-governance publish-gate, supersession, and diagnostics behavior for source/reaction/async validation
- existing thin package entry semantics in `packages/flux-runtime/src/index.ts`

### 4. Public exports stay thin; internal barrels may be introduced only when they reduce import churn

`packages/flux-runtime/src/index.ts` should remain a thin package entry. Internal `index.ts` barrels under the new subdirectory are allowed only when they reduce package-internal churn and make future extraction easier. They should not become giant re-export surfaces that blur subdomain boundaries again.

## Execution Plan

### Phase 1 - Baseline Audit And Target Layout Freeze

Status: completed
Targets: `packages/flux-runtime/src/`, `docs/architecture/flux-runtime-module-boundaries.md`, affected tests

- [x] Audit the live import graph for all async-data in-scope files so the move plan is based on current repo usage rather than inferred grouping.
- [x] Confirm the fixed target layout in section `2.1 Frozen target layout for this plan` against the live repo before moving files.
- [x] Record the exact list of tests that directly import moved files and the tests that only depend on the behavior through runtime-factory/runtime entry points, using the matrix in section `3.1 Test migration matrix` as the starting baseline.
- [x] Confirm that no in-scope file currently forms a hidden cycle that would be made worse by directory moves.

Exit Criteria:

- [x] The execution notes name the exact source files that will move and the exact test files that require import rewrites or same-package relocation.
- [x] The file list in `2.1 Frozen target layout for this plan` is either confirmed or revised explicitly before Phase 2 starts.
- [x] `scope-change.ts` and `status-owner.ts` are explicitly recorded as out of scope for this plan unless the plan file itself is revised first.

### Phase 2 - Async-Data Directory Reorganization

Status: completed
Targets: in-scope async-data files under `packages/flux-runtime/src/`

- [x] Create the target subdirectory structure for the async-data runtime group.
- [x] Move the in-scope async-data implementation files into the new subdirectory structure with minimal code changes beyond import rewrites.
- [x] Add thin internal barrels only where they reduce import churn or clarify grouping. No internal barrel was needed after the move.
- [x] Update package-internal imports in `runtime-factory.ts`, `action-adapter.ts`, `runtime-action-helpers.ts`, and moved modules to point at the new layout.

Exit Criteria:

- [x] The following implementation files no longer exist at the top level: `src/request-runtime.ts`, `src/request-runtime-adaptor.ts`, `src/api-cache.ts`, `src/async-governance.ts`, `src/data-source-runtime.ts`, `src/data-source-runtime-utils.ts`, `src/data-source-state.ts`, `src/source-registry.ts`, `src/reaction-runtime.ts`.
- [x] The same implementation files exist at the exact paths listed in `2.1 Frozen target layout for this plan`.
- [x] No package-internal import still references the pre-move paths for those files.
- [x] `packages/flux-runtime/src/index.ts` exports the same public API surface as before the move.

### Phase 3 - Unit Test And Focused Verification Realignment

Status: completed
Targets: affected tests in `packages/flux-runtime/src/__tests__/`, colocated tests, `packages/flux-runtime/package.json`

- [x] Move or rewrite tests whose relative imports break after the file move.
- [x] Keep request/cache/source/reaction/async-governance test ownership aligned with the new implementation layout without pushing them into unrelated packages.
- [x] Add or update focused tests only where needed to prove the reorganization preserved behavior and import reachability. No new behavior tests were needed beyond path realignment.
- [x] Run targeted `flux-runtime` test commands for moved-path coverage before full workspace verification.

Exit Criteria:

- [x] `packages/flux-runtime/src/async-data/api-cache.test.ts` exists and passes.
- [x] `packages/flux-runtime/src/__tests__/request-runtime.test.ts` uses the new request-runtime import path.
- [x] No test file in `packages/flux-runtime/src/` references `../request-runtime`, `./api-cache`, `../data-source-runtime`, `../source-registry`, `../reaction-runtime`, or `../async-governance` once those modules have moved.
- [x] Focused verification passes with the exact command set below before full-workspace verification:
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/request-runtime.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/request-runtime-polling.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/reaction-runtime.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/runtime-reactions.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/runtime-sources.test.ts src/__tests__/runtime-sources-refresh.test.ts src/__tests__/runtime-sources-merge.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/__tests__/runtime-validation.test.ts`
  - [x] `pnpm --filter @nop-chaos/flux-runtime test -- src/async-data/api-cache.test.ts`

### Phase 4 - Docs Sync And Boundary Baseline Update

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`, related docs, `docs/logs/`

- [x] Update active docs so code anchors point at the new async-data directory layout instead of the previous flat `src/*.ts` paths.
- [x] Clarify in docs that this work is an internal reorganization baseline, not evidence that request/data runtime has already become a separate package owner.
- [x] Record the layout decision and rationale in the daily log.

Exit Criteria:

- [x] `docs/architecture/flux-runtime-module-boundaries.md` points at the new async-data paths instead of the pre-move top-level files.
- [x] No active doc still treats `packages/flux-runtime/src/request-runtime.ts`, `api-cache.ts`, `async-governance.ts`, `data-source-runtime.ts`, `data-source-runtime-utils.ts`, `data-source-state.ts`, `source-registry.ts`, or `reaction-runtime.ts` as current top-level anchors.
- [x] Active docs continue to describe `async-governance.ts` as a `flux-runtime` internal shared helper/substrate rather than evidence of a new request/data package owner.
- [x] The daily log links the reorganization plan to the code/documentation baseline.

### Phase 5 - Verification And Closure Audit

Status: completed
Targets: full workspace verification, closure evidence

- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the reorganization lands.
- [x] Perform an independent closure audit that checks moved implementation files, updated imports, affected tests, active docs, and preserved plan 110/120 behavior baselines against the final layout.
- [x] If the closure audit finds remaining layout debt, keep the plan open and record the remaining debt explicitly instead of declaring the new structure "good enough". The independent audit reported no structural findings beyond missing closure evidence, which is now recorded here.

Exit Criteria:

- [x] Full workspace verification passes after the structural move.
- [x] An independent reviewer or fresh subagent confirms that the new layout matches the documented owner baseline and that the plan did not reopen package-extraction scope.
- [x] Any leftover extraction-oriented work is explicitly deferred to a successor plan rather than hidden inside this one.

## Validation Checklist

- [x] runtime-owned request/cache/source/reaction/async-governance files are grouped under the new async-data layout
- [x] `packages/flux-runtime/src/index.ts` remains a thin package entry
- [x] package-internal imports no longer depend on obsolete top-level paths for moved async-data files
- [x] affected unit tests are updated to the new file locations or import paths
- [x] focused `flux-runtime` verification is completed for moved paths
- [x] plan 110 request/cache/polling behavior remains unchanged
- [x] plan 120 async-governance publish-gate and diagnostics behavior remains unchanged
- [x] active docs are updated to the new code anchors
- [x] daily log updated with the reorganization decision
- [x] independent subagent / independent reviewer closure audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed. The async-data subdomain now lives under `packages/flux-runtime/src/async-data/`, package-internal imports and affected tests/docs follow the new layout, workspace verification passed, and an independent closure audit confirmed the change stayed within internal reorganization scope rather than reopening package extraction.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_24d3fd00dffeIYmlp05ydvsClq`
- Evidence: closure audit found no structural/path issues and confirmed the only missing gap was closure evidence itself; after recording full verification and this audit, the plan matches its documented exit criteria. Supporting paths: `packages/flux-runtime/src/async-data/*.ts`, `packages/flux-runtime/src/__tests__/request-runtime.test.ts`, `packages/flux-runtime/src/async-data/api-cache.test.ts`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/dependency-tracking.md`, `docs/logs/2026/04-22.md`.

Follow-up:

- If the regrouped async-data layout proves stable and closed over time, a separate successor plan may evaluate whether it should become `flux-data-runtime` or `flux-request-runtime`.
- Form/page/host-infrastructure regrouping, if still desired later, must be handled by a separate focused plan rather than expanded into this one during execution.
