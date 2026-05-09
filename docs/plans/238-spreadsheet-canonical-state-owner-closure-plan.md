# 238 Spreadsheet Canonical State Owner Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-09
> Source: `docs/analysis/2026-05-08-deep-audit-full/{04-state-ownership.md,summary.md}`
> Related: `docs/plans/{223-reactive-and-async-follow-up-closure-plan.md,234-deep-audit-2026-05-08-critical-closure-program-plan.md}`

## Purpose

收口 2026-05-08 deep audit 已确认的 spreadsheet canonical state-owner critical defect：renderer-local row/column sizing state 仍绕过 core document resize owner。

完成态要求：spreadsheet 行列尺寸的持久化事实源回到 core document / commands，renderer 只消费 canonical owner，并有 focused proof 保证 resize、history、re-render 语义一致。

## Current Baseline

- `04-01` 已经过维度复核与子项复核，确认为 P1 单一事实来源违约。
- `use-resize.ts` 现在从 `snapshot.activeSheet?.columns/rows` 读取 committed sizing，并只在拖拽期间叠加 transient preview state；commit path 统一 dispatch 到 spreadsheet core resize commands。
- 该问题不属于 validation-owner、async cancellation、或 accessibility family，应该由单独的 spreadsheet canonical owner plan 收口。

## Goals

- 让 row/column sizing 的 canonical fact source 回到 spreadsheet core document / command path。
- 去掉 renderer-local 持久 sizing state 对 canonical owner 的绕过。
- 用 focused proof 锁定 resize、history、reload 后的行为一致性。

## Non-Goals

- 不重做 spreadsheet grid 的全部交互模型。
- 不吸收 unrelated spreadsheet accessibility/performance cleanup。
- 不把计划扩大为 report designer 全量 architecture redesign。

## Scope

### In Scope

- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts`
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
- `packages/spreadsheet-core/src/**` 中与 row/column sizing / commands 直接相关的最小文件集
- focused tests
- 受影响 docs: `docs/architecture/report-designer/design.md` 或显式 `No owner-doc update required`

### Out Of Scope

- spreadsheet keyboard model / a11y
- spreadsheet performance hot-path optimization
- unrelated report designer selection or toolbar work

## Execution Plan

### Phase 1 - Canonical Resize Owner Convergence

Status: completed
Targets: renderer resize path, spreadsheet core commands/state

- Item Types: `Fix | Proof`

- [x] [Fix] 把 row/column size 的持久写入统一到 core document / resize commands，去掉 renderer-local persistent owner。
- [x] [Fix] 让 grid 只消费 canonical sizing state，而不是本地平行状态。
- [x] [Proof] focused tests：resize、history、reload/重新渲染路径都读取同一 canonical owner。

Exit Criteria:

- [x] canonical resize owner 已统一。
- [x] focused regression tests 通过。
- [x] `No owner-doc update required`。本轮修复把 live implementation 拉回 spreadsheet core canonical owner，不改变 report/spreadsheet 设计文档里的支持语义。
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] 运行 in-scope focused tests。
- [x] [Proof] 运行 `pnpm typecheck`、`pnpm build`、`pnpm lint`、`pnpm test`。
- [x] [Decision] 独立 closure audit 确认 renderer-local sizing owner 已移除，不存在平行事实源残留。

Exit Criteria:

- [x] 所有 focused verification 通过。
- [x] Workspace verification 通过。
- [x] 独立 closure audit 明确通过。
- [x] 受影响 owner docs 已更新，或显式记录 `No owner-doc update required`。
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] `04-01` 已修复且 canonical owner 恢复为 spreadsheet core。
- [x] focused verification 已完成并保留为 closure blocker。
- [x] 受影响 owner docs 已同步到 live baseline，或每个 phase 已显式记录 `No owner-doc update required`。
- [x] 不存在被静默降级到 deferred / follow-up 的 in-scope defect。
- [x] 独立 closure audit 已完成并记录证据。
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Closure

Status Note: Completed. Spreadsheet resize now reads committed sizing from the spreadsheet core snapshot, commits back through core resize commands, and focused proof confirms both row and column resize write back to the canonical owner.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit task `ses_1f3d7d6fcffeN1812fS1mT7gvS`
- Evidence: refreshed audit confirmed `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-resize.ts` reads committed row/column sizes from `snapshot.activeSheet` and commits through core commands, while `packages/spreadsheet-renderers/src/__tests__/grid-selection.test.tsx:237-295` proves both column and row resize commit back to spreadsheet core state; final workspace verification passed via `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.

Follow-up:

- no remaining plan-owned work.
