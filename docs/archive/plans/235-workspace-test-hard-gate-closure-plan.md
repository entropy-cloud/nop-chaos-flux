# 235 Workspace Test Hard-Gate Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-deep-audit-full/{02-module-responsibility.md,14-test-coverage.md,summary.md}`
> Related: `docs/plans/{225-test-hardening-follow-up-plan.md,234-deep-audit-2026-05-08-critical-closure-program-plan.md}`

## Purpose

收口 2026-05-08 deep audit 已确认的 workspace test hard-gate 问题：4 个 `>700` 测试文件与当前失败的 `pnpm check:oversized-code-files`。

完成态要求：4 个超限测试文件都按稳定行为 owner 拆分，workspace hard gate 恢复通过，且 focused tests 证明拆分没有丢 coverage surface。

## Current Baseline

- `14-01`~`14-04` 与 `02-01` 已被独立复核和子项复核确认为 hard-gate defects。
- 4 个原始超限测试文件已经按稳定行为 owner 拆分完成：
- `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`
- `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`
- `packages/flux-compiler/src/schema-compiler-diagnostics.test.ts`
- `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.test.ts`
- 本轮 closure audit 又发现 `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` 超过 `700` 行；该文件现已拆分，tree-mode coverage 已移至 `packages/flow-designer-renderers/src/designer-command-adapter.tree.test.ts`。
- 当前 `pnpm check:oversized-code-files` 已恢复为 `53 warnings, 0 errors`。

## Goals

- 让 `pnpm check:oversized-code-files` 恢复通过。
- 按行为 owner 拆分 4 个超限测试文件，不丢失 coverage surface。
- 为每个拆分点补最小 focused proof，确保测试入口和 helper 组织仍清晰。

## Non-Goals

- 不处理默认 e2e 集合中的诊断 spec、截图 spec、固定 sleep 等其他 retained P2/P3 测试问题。
- 不把 test refactor 扩大成全仓测试目录重组工程。
- 不修改生产代码语义，除非拆分测试时发现必须修复的真实测试 harness 缺陷。

## Scope

### In Scope

- `packages/flux-renderers-data/src/__tests__/use-table-controls.test.tsx`
- `packages/flux-renderers-form/src/__tests__/form-submit-actions.test.tsx`
- `packages/flux-compiler/src/schema-compiler-diagnostics.test.ts`
- `packages/flux-runtime/src/__tests__/runtime-dialogs-scope.test.ts`
- 新建同目录 focused test files / shared test support
- 受影响的 test support imports

### Out Of Scope

- 其他 retained 测试质量项（14-05 及以后）
- 任何生产运行时设计修改
- docs 之外的广义 automation redesign

## Execution Plan

### Phase 1 - Split Data And Form Oversized Tests

Status: completed
Targets: `packages/flux-renderers-data/src/__tests__/*`, `packages/flux-renderers-form/src/__tests__/*`

- Item Types: `Fix | Proof`

- [x] [Fix] 将 `use-table-controls.test.tsx` 按 pagination / selection / sort-filter-expand 等稳定 controller owner 拆分。
- [x] [Fix] 将 `form-submit-actions.test.tsx` 按 submit / init / validation-blocked / surface-scope 行为轴拆分。
- [x] [Proof] focused verification：拆分后对应 package tests 全部通过，且原 coverage surface 仍可从新文件名直接定位。

Exit Criteria:

- [x] 两个文件都降到 hard threshold 以下。
- [x] focused package tests 通过。
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Split Compiler And Runtime Oversized Tests

Status: completed
Targets: `packages/flux-compiler/src/*.test.ts`, `packages/flux-runtime/src/__tests__/*`

- Item Types: `Fix | Proof`

- [x] [Fix] 将 `schema-compiler-diagnostics.test.ts` 按 diagnostics / namespace / host-action validation / strict-mode 责任面拆分。
- [x] [Fix] 将 `runtime-dialogs-scope.test.ts` 按 dialog / drawer / surface teardown / scope publication 责任面拆分。
- [x] [Proof] focused verification：对应 package tests 与 shared helpers 仍稳定，拆分后行为边界更清晰。

Exit Criteria:

- [x] 两个文件都降到 hard threshold 以下。
- [x] focused package tests 通过。
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 3 - Restore Hard Gate And Closure Proof

Status: completed
Targets: workspace verification, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] 运行 `pnpm check:oversized-code-files` 并确认 workspace hard gate 恢复通过。
- [x] [Proof] 运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] [Decision] 独立 closure audit 确认没有通过“挪文件名但保留同类 mega bucket”来伪装关闭。

Exit Criteria:

- [x] `pnpm check:oversized-code-files` 通过。
- [x] Workspace verification 通过。
- [x] 独立 closure audit 明确确认无 silent scope drop。
- [x] No owner-doc update required.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] 所有 in-scope `>700` 测试文件已拆分并低于 hard threshold。
- [x] `pnpm check:oversized-code-files` 通过。
- [x] focused verification 证明原测试行为 surface 未静默丢失。
- [x] 不存在把 hard-gate issue 降级为 advisory 或 future follow-up 的情况。
- [x] owner-doc adjudication 已完成，并显式记录为 `No owner-doc update required`。
- [x] 独立 closure audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

### Other Retained Test-Quality Items

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: 本计划只处理当前 hard-gate P0/P1；默认 e2e 诊断 spec、截图 spec、固定 sleep 等 retained P2/P3 必须由独立 owner plan 承接，不能混进 hard-gate split 计划。
- Successor Required: yes
- Successor Path: future owner-scoped follow-up plan

## Closure

Status Note: Completed. The original four oversized test buckets and the newly surfaced `designer-command-adapter.test.ts` overflow were all split into stable behavior-owned files, the workspace hard gate is green again, and the independent closure audit found no silent scope drop.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task `ses_1f3d7d6fcffeN1812fS1mT7gvS`
- Evidence: refreshed audit confirmed `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` was split with tree-mode coverage moved to `packages/flow-designer-renderers/src/designer-command-adapter.tree.test.ts`; `pnpm check:oversized-code-files` now reports `53 warnings, 0 errors`; focused proof passed via `pnpm --filter @nop-chaos/flow-designer-renderers exec vitest run src/designer-command-adapter.test.ts src/designer-command-adapter.tree.test.ts`; final workspace verification passed via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- no remaining plan-owned work.
