# 124 Runtime Compat Removal And Boundary Cleanup Plan

> Plan Status: completed
> Last Reviewed: 2026-04-22
> Source: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/schema-file-validator.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/api-data-source.md`, `docs/plans/122-compiler-package-extraction-and-boundary-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`
> Related: `docs/plans/120-runtime-async-governance-convergence-plan.md`, `docs/plans/122-compiler-package-extraction-and-boundary-plan.md`, `docs/plans/123-flux-runtime-split-and-boundary-hardening-plan.md`

## Purpose

在 plan 122 与 123 已经把 compiler owner 与 action execution owner 物理拆出的前提下，本计划负责完成剩余的 boundary cleanup，明确采用 **first-version baseline**：

- 不保留历史兼容层
- 不保留 runtime package 对 compiler/action-core 的包装导出
- 不在 `flux-runtime` 内重复保留一份 legacy action executor / helper 实现
- 不让 docs 继续描述已经被 superseded 的 owner surface

这份计划的目标不是再讨论“是否值得拆包”，而是把 live repo 中已经确认属于 `flux-compiler` / `flux-action-core` 的 owner surface 真正清干净，并把 workspace imports、tests、docs 一次性改到新的稳定基线。

## Current Baseline

- 审计基线已确认：plan 122/123 的 closure note 对 compat cleanup 有过度表述，live repo 直到本计划执行前仍残留 runtime-side compat exports / duplicate action helpers / mis-owned compiler test。
- `@nop-chaos/flux-action-core` 已经存在，`runtime-factory.ts` 主路径已经从该包创建 action dispatcher。见 `packages/flux-runtime/src/runtime-factory.ts`。
- 本轮执行已删除 `packages/flux-runtime/src/action-runtime.ts`、`action-runtime-core.ts`、`action-runtime-handlers.ts`、`operation-control.ts`，并把 runtime internals 改为直接依赖 `@nop-chaos/flux-action-core`。
- 本轮执行已删除 runtime-side compiler compat exports，并将 `packages/flux-runtime/src/__tests__/schema-compiler-registry.test.ts` 迁移到 `packages/flux-compiler/src/schema-compiler-registry.test.ts`。
- `reaction-runtime.ts` 与 `data-source-runtime.ts` 已通过稳定端口调用共享 action dispatch，本身不构成 leftover；这类 runtime owner 文件应保留在 `flux-runtime`。
- active docs 仍需要与新 baseline 做最终同步，移除对已删除 runtime duplicate file 的 code anchor 和迁移措辞。

## Goals

- 把 `flux-runtime` 收口到 runtime facade + owner assembly + runtime-owned subsystems，不再承担 compiler/action-core 的兼容导出或 duplicated implementation。
- 删除 runtime 中对 compiler/action-core 的历史兼容包装，建立唯一正确 import path。
- 删除 runtime 中不再属于主路径的 legacy action executor 文件与 duplicated helper 逻辑。
- 让 generic async execution control 只保留一个 owner：`@nop-chaos/flux-action-core`。
- 明确并修正所有 workspace package 的 import 方向，使 downstream packages/tests/docs 不再把 `flux-runtime` 当作 compiler/action-core 的入口。
- 重新归位测试：compiler-owned tests 归 `flux-compiler`，runtime-owned integration tests 只验证 runtime facade / integration behavior。
- 更新 architecture docs、plan docs、daily log，使文档与 live repo 的 owner baseline 一致，不再保留迁移期措辞。

## Non-Goals

- 不在本计划中新增 `flux-request-runtime` 独立 package；request execution 仍保留在 `flux-runtime`。
- 不在本计划中重写 `ActionContext`、`RendererRuntime` facade、author-visible schema DSL。
- 不在本计划中改变 `reaction`、`data-source`、form/page/surface 的 owner 语义。
- 不在本计划中保留任何“为了兼容旧调用方式”的 runtime re-export、thin wrapper、reference copy、legacy fallback。
- 不在本计划中继续讨论 plan 122/123 是否应该存在；本计划只处理它们落地后的 cleanup 与 baseline 固化。

## Scope

### In Scope

- `packages/flux-runtime/src/index.ts`
- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/action-runtime.ts`
- `packages/flux-runtime/src/action-runtime-core.ts`
- `packages/flux-runtime/src/action-runtime-handlers.ts`
- `packages/flux-runtime/src/operation-control.ts`
- `packages/flux-runtime/src/request-runtime.ts`
- `packages/flux-runtime/src/action-adapter.ts`
- `packages/flux-runtime/src/runtime-action-helpers.ts`
- `packages/flux-action-core/src/`
- `packages/flux-compiler/src/`
- all workspace packages/tests/examples that currently import compiler APIs from `@nop-chaos/flux-runtime`
- compiler/runtime test placement under `packages/flux-runtime/src/**/*.test.ts` and `packages/flux-compiler/src/**/*.test.ts`
- related docs under `docs/architecture/`, `docs/index.md`, `docs/plans/122-*.md`, `docs/plans/123-*.md`, and `docs/logs/`

### Out Of Scope

- extracting request execution into a new package
- changing runtime async-governance semantics from plan 120
- changing public schema authoring syntax
- redesigning React host integration or import/module-cache topology

## Design Position

### 1. First-version baseline means one owner, one import path

本计划冻结以下规则：

1. compile APIs 的唯一 owner/import path 是 `@nop-chaos/flux-compiler`
2. action execution helpers / dispatcher / operation-control 的唯一 owner/import path 是 `@nop-chaos/flux-action-core`
3. `@nop-chaos/flux-runtime` 不再 re-export 上述 API
4. downstream packages/tests/docs 必须改到直接 owner import，而不是继续经过 runtime facade

### 2. Runtime keeps runtime-owned behavior only

`flux-runtime` 保留：

- runtime assembly
- request execution
- form/page/surface/source/reaction owners
- runtime adapter and host infrastructure

`flux-runtime` 不再保留：

- legacy action dispatcher implementation for reference
- duplicated action helper logic already owned by action-core
- duplicated operation-control helpers already owned by action-core
- compiler API compatibility exports

### 3. Tests follow owner semantics, not historical file placement

测试迁移规则：

1. compile-time behavior tests belong to `flux-compiler`
2. action-core behavior/unit tests belong to `flux-action-core` when they are not runtime integration tests
3. runtime package tests only keep runtime-owned integration behavior
4. 如果某个测试同时覆盖 compiler owner 与 runtime facade，必须显式拆成 owner test + integration test，而不是继续让一个 runtime-side file隐式承担两边责任

### 4. Docs must describe the post-cleanup baseline only

执行完成后，architecture docs 不再允许出现：

- “retained for reference”
- “temporary re-export”
- “migration compatibility layer”

除非文档明确是在记录历史 plan closure note；active architecture baseline 只能描述 cleanup 后的 live state。

## Execution Plan

### Phase 1 - Freeze Cleanup Baseline And Import Audit

Status: completed
Targets: `packages/flux-runtime/src/index.ts`, `packages/flux-runtime/src/action-runtime*.ts`, `packages/flux-runtime/src/operation-control.ts`, workspace imports, related tests/docs

- [x] Audit every live import of compiler APIs that still comes from `@nop-chaos/flux-runtime`.
- [x] Audit every live import of action helper/control logic that still comes from `packages/flux-runtime/src/action-runtime-core.ts` or `operation-control.ts`.
- [x] Classify all remaining runtime-side tests touching compiler behavior into owner tests versus runtime integration tests.
- [x] Record which current docs still describe compatibility or legacy retention rather than final ownership.

Exit Criteria:

- [x] The repo has an explicit list of compat exports, legacy files, duplicated helpers, and mis-owned tests that this plan will remove or re-home.
- [x] The cleanup baseline distinguishes intentional runtime-owned files from actual post-plan-122/123 drift.

### Phase 2 - Remove Runtime Compatibility Exports And Legacy Action Copies

Status: completed
Targets: `packages/flux-runtime/src/index.ts`, `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/operation-control.ts`

- [x] Remove compiler API re-exports from `@nop-chaos/flux-runtime`.
- [x] Delete `action-runtime.ts` and `action-runtime-handlers.ts` once all consumers are migrated to `@nop-chaos/flux-action-core`.
- [x] Delete or drastically shrink `action-runtime-core.ts` so that no action-core-owned helper remains duplicated inside runtime.
- [x] Remove `packages/flux-runtime/src/operation-control.ts` and make request/runtime code consume `@nop-chaos/flux-action-core` helpers directly.
- [x] Ensure no runtime file continues to carry “reference copy” code that is no longer on the main execution path.

Exit Criteria:

- [x] `@nop-chaos/flux-runtime` no longer exports compiler APIs.
- [x] No legacy action dispatcher implementation remains inside runtime.
- [x] Generic async execution control has exactly one live implementation owner: `@nop-chaos/flux-action-core`.

### Phase 3 - Rewire Runtime Internals And Workspace Imports To Direct Owners

Status: completed
Targets: `packages/flux-runtime/src/request-runtime.ts`, `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`, downstream packages/tests/examples

- [x] Rewire runtime internals to import action-core helpers directly from `@nop-chaos/flux-action-core` instead of local duplicates.
- [x] Update all workspace packages/tests/examples that import compiler APIs from runtime to import from `@nop-chaos/flux-compiler` directly.
- [x] Update any action-core helper consumers to import from `@nop-chaos/flux-action-core` directly instead of runtime-local files.
- [x] Remove any remaining same-package wrappers whose only purpose is to proxy another package owner.

Exit Criteria:

- [x] There is one obvious import path per owner surface across the workspace.
- [x] Runtime internals no longer depend on duplicated local copies of action-core helpers.
- [x] No package outside runtime imports compiler APIs through runtime.

### Phase 4 - Re-home Tests To Match Ownership

Status: completed
Targets: `packages/flux-runtime/src/**/*.test.ts`, `packages/flux-compiler/src/**/*.test.ts`, `packages/flux-action-core/src/**/*.test.ts`

- [x] Move compiler-owned tests out of `flux-runtime` and into `flux-compiler`.
- [x] Split mixed owner/integration tests where necessary so compiler/action-core behavior is asserted in the owning package, while runtime keeps only runtime integration coverage.
- [x] Add focused tests in `flux-action-core` if cleanup removes the last owner-level coverage for moved helpers.
- [x] Remove stale runtime-side tests whose only purpose was to cover compatibility exports or deleted legacy paths.

Exit Criteria:

- [x] No compiler-owned test remains misfiled under `flux-runtime`.
- [x] Runtime test suite no longer depends on compatibility exports or deleted legacy files.
- [x] Moved helper behavior remains covered in the correct owner package.

### Phase 5 - Docs, Plan Closure Corrections, And Verification

Status: completed
Targets: `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/schema-file-validator.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/index.md`, `docs/plans/122-*.md`, `docs/plans/123-*.md`, `docs/logs/2026/04-22.md`

- [x] Update architecture docs so they describe the post-cleanup owner baseline only.
- [x] Remove migration/compat wording from active docs and replace it with direct owner/import guidance.
- [x] Update plan 122 and 123 with explicit closure-note corrections or supersession notes where their completion text no longer matches the audited repo baseline.
- [x] Add daily log entries recording the cleanup baseline, key owner decisions, and follow-up expectations.
- [x] Run required verification after code changes: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`.
- [x] Perform an independent closure audit that checks imports, deleted legacy files, test placement, and docs for owner drift.

Exit Criteria:

- [x] Docs and code agree on the no-compat first-version baseline.
- [x] Plans 122 and 123 no longer overstate closure relative to the live repo.
- [x] Full workspace verification passes after cleanup.

## Validation Checklist

- [x] `@nop-chaos/flux-runtime` no longer re-exports compiler APIs.
- [x] No legacy action dispatcher / handler implementation remains in runtime.
- [x] `action-runtime-core.ts` no longer duplicates action-core-owned helpers, or the file is deleted if no runtime-owned residue remains.
- [x] `operation-control` lives only in `@nop-chaos/flux-action-core`.
- [x] All workspace imports use direct owner packages rather than runtime compatibility paths.
- [x] Compiler-owned tests are housed in `flux-compiler`; runtime keeps only runtime-owned integration coverage.
- [x] Architecture docs and docs index describe the corrected package ownership baseline.
- [x] Plan closure text for 122/123 is corrected to match the audited live repo.
- [x] `docs/logs/` updated with the cleanup decision record.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Independent closure audit recorded with evidence.

## Risks And Rollback

- Removing compatibility exports may cause broad import churn; this is intentional, but requires a complete workspace rewrite in one pass rather than partial migration.
- Deleting legacy action files too early could hide runtime consumers that still import local helpers; Phase 1 audit must identify all consumers before deletion.
- Test movement can accidentally reduce integration coverage if mixed-owner tests are moved wholesale without splitting intent.
- If cleanup discovers that some helper still genuinely belongs to runtime rather than action-core, that decision must be documented explicitly instead of leaving another duplicate copy in place.

## Closure

Status Note: Completed. `@nop-chaos/flux-runtime` no longer provides compiler or action-core compatibility surfaces, runtime-side duplicate action and operation-control implementations are removed, owner tests are re-homed, and active docs now describe the no-compat first-version baseline only.

Closure Audit Evidence:

- Reviewer / Agent: independent fresh-audit passes on 2026-04-22
- Evidence: first audit caught stale active-doc anchors that still described deleted runtime action files; second audit caught two remaining owner-text drifts plus one lint blocker in `packages/flux-compiler/src/schema-compiler-registry.test.ts`; all findings were fixed, and workspace verification passed with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` before closure.

Follow-up:

- If request execution later needs its own package, capture that in a separate successor plan instead of reopening compatibility cleanup.
- No other leftover compat work should remain inside plan 122 or 123 once this plan completes.
