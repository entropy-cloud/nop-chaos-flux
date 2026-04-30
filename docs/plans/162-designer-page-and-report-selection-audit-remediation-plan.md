# 162 Designer Page And Report Selection Audit Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-01
> Source: `docs/analysis/2026-05-01-deep-audit-full/summary.md`, `docs/components/designer-page/design.md`, `docs/architecture/renderer-runtime.md`
> Related: `docs/plans/149-deep-audit-remediation-plan.md`

## Purpose

收口 2026-05-01 深度审核中两类可在本轮直接闭环的高置信问题：

- `designer-page` 的 renderer contract / state ownership 漂移
- report designer spreadsheet 选择同步未清理导致的 stale selection

同时同步两处已确认的文档漂移，避免本轮代码修正后 owner docs 继续失真。

## Current Baseline

- `packages/flow-designer-renderers/src/designer-page.tsx` 当前直接从 `props.schema` 读取 `config`、`document`、`treeDocument`、`statusPath`，与 `RendererComponentProps` 约定不一致。
- 同一文件在 tree mode 下把 `inputTreeDocument` 镜像进本地 state，并在 render 阶段执行 `setState`。
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx` 会把 spreadsheet selection 同步到 report `selectionTarget`，但清空 spreadsheet 选择时不会同步清空 report target。
- `docs/architecture/frontend-baseline.md` 当前 workspace 列表遗漏 `flux-compiler` 与 `flux-action-core`。
- `docs/plans/143-unit-test-coverage-80-percent-target-plan.md` 头部已标 `completed`，但正文仍保留 partial-complete wording。

## Goals

- 让 `designer-page` 通过 `props.props` 读取关键业务输入，并移除 render-phase props-to-state 同步。
- 让 report spreadsheet 选择桥接在 spreadsheet selection 清空时同步清空 report `selectionTarget`。
- 为上述行为补上 focused regression tests。
- 同步修正文档基线漂移与当天开发日志。

## Non-Goals

- 不处理本轮 audit 的全部 P1/P2 项。
- 不重构 `designer-page` 的 host-scope publication、toolbar typing、meta passthrough 等其他问题。
- 不处理 `schema-compiler-registry.test.ts` 拆分或其他大文件治理。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/flow-designer-renderers/src/schemas.ts`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/*test.tsx`
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`
- `packages/report-designer-renderers/src/renderers.integration.test.tsx`
- `docs/architecture/frontend-baseline.md`
- `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`
- `docs/logs/2026/05-01.md`

### Out Of Scope

- `designer-page` 的 host projection 精度问题
- report designer i18n fallback cleanup
- any / terminology / package-surface 其他 audit follow-ups

## Execution Plan

### Phase 1 - Fix Runtime Behavior

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/flow-designer-renderers/src/schemas.ts`, `packages/flow-designer-renderers/src/index.tsx`, `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx`

- [x] 将 `designer-page` 的 `config` / `document` / `treeDocument` / `statusPath` 切换到 `props.props` resolved channel
- [x] 移除 tree mode render-phase `setState`，改成 effect 驱动的 props sync
- [x] 在 spreadsheet selection 清空时同步 `core.setSelectionTarget(undefined)`，并避免误清默认 `sheet` baseline

Exit Criteria:

- [x] `designer-page` 不再直接从 `props.schema` 读取上述关键业务字段
- [x] tree mode 不再在 render 阶段调用 `setState`
- [x] report designer 在 spreadsheet 选择清空后不再保留 stale `selectionTarget`
- [x] 相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

### Phase 2 - Add Regression Coverage And Sync Docs

Status: completed
Targets: `packages/flow-designer-renderers/src/*.test.tsx`, `packages/report-designer-renderers/src/renderers.integration.test.tsx`, `docs/architecture/frontend-baseline.md`, `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`

- [x] 为 `designer-page` 新增/更新测试，覆盖 resolved props 与 tree-mode sync 行为
- [x] 为 report designer spreadsheet selection clear 新增回归测试，并同步旧 integration 预期到当前 baseline
- [x] 修正 `frontend-baseline.md` workspace 列表
- [x] 清理 Plan 143 中残留的 partial-complete wording，使其与 closure 状态一致

Exit Criteria:

- [x] focused tests 能直接证明两个代码问题已修复
- [x] 文档与 live code / live status 对齐
- [x] 相关 `docs/architecture/` 或 `docs/components/` 已更新为最终设计状态
- [x] `docs/logs/` 对应日期条目已更新

## Validation Checklist

- [x] `designer-page` 通过 `props.props` 读取关键宿主输入
- [x] report designer 选择清空同步已修复
- [x] focused verification 已完成
- [x] 独立子 agent / 独立审阅者 closure-audit 已完成并记录证据
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: completed after an independent closure audit re-checked the live code, scoped docs, and focused regression coverage. The remaining audit-owned gaps were closed by adding direct resolved-props/runtime regression coverage for `designer-page` and removing the last stale partial-complete wording from Plan 143.

Closure Audit Evidence:

- Reviewer / Agent: fresh general subagent closure audit `ses_21f5f2c0cffeRuNiMqgyS5L9Sr`
- Evidence: initial audit returned `FAIL` on missing direct `designer-page` regression coverage and one remaining Plan 143 wording drift; follow-up landed in `packages/flow-designer-renderers/src/designer-page.resolved-props.test.ts`, `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`, `packages/flow-designer-renderers/src/designer-page-shell.test.tsx`, `packages/flow-designer-renderers/src/index.tsx`, and `docs/plans/143-unit-test-coverage-80-percent-target-plan.md`, then focused verification passed again.

Implementation Evidence:

- `packages/flow-designer-renderers/src/designer-page.tsx` now reads `config` / `document` / `treeDocument` / `statusPath` through resolved renderer props and moves tree sync into an effect.
- `packages/flow-designer-renderers/src/index.tsx` now declares `statusPath` / `document` / `treeDocument` / `config` as `kind: 'prop'` fields so runtime prop resolution matches the renderer contract.
- `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx` now mirrors from `ssSnapshot.selection` directly so `kind: 'none'` clears only spreadsheet-driven report targets.
- Focused verification passed: `pnpm --filter @nop-chaos/flow-designer-renderers test -- designer-page.tree.test.tsx designer-page-shell.test.tsx`, `pnpm --filter @nop-chaos/report-designer-renderers test -- renderers.integration.test.tsx`.
- Closure-audit follow-up verification passed: `pnpm --filter @nop-chaos/flow-designer-renderers test -- designer-page.tree.test.tsx designer-page-shell.test.tsx designer-page.resolved-props.test.ts` and `pnpm --filter @nop-chaos/report-designer-renderers test -- renderers.integration.test.tsx`.
- Full verification passed sequentially: `pnpm typecheck && pnpm build && pnpm lint && pnpm test`.

Follow-up:

- No remaining Plan 162-owned work.
- Remaining audit items stay with their existing owner plans or future successor plans.
