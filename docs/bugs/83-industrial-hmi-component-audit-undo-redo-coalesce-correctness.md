# 83 Industrial HMI Component Audit — Undo/Redo Coalesce Correctness (redo truncation + payload integrity)

> Source: HCA10 P1-1 + P2-1（editor undo-redo 审计，test-first 修复，**两 finding 合并**）；审计记录 `docs/audits/2026-08-08-1230-hca10-editor-undo-redo.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

两条 coalesce/merge 窗口的不变量违约（同模块、同验证路径，合并归档）：

- **P1-1（redo 截断）**：`replaceUndoTop`（合并 undo 栈顶 entry，coalesce-merge）不清空 `redoStack` → undo 之后，一个可合并的编辑（同 nodeId + 同字段 + ≤500ms）会使 redo 错误地仍然可用，违反 U6（任何新提交丢弃 redo 分支）。
- **P2-1（载荷完整性）**：`singleNodeUpdate` coalesce 不拒绝携带 `variables` 或 `reordered` 的 diff → M2 合并只搬运 `updated` 字段，`variables` / `reordered` 载荷被静默丢弃。

## Diagnostic Method

- 诊断难度：两者都藏在 undo-redo 状态机语义里——P1-1 需理解「coalesce-merge 在语义上是新提交」，P2-1 需理解 coalesce 只构造 `updated` 而忽略其他载荷字段。
- 调查路径：HCA10 undo-redo 审计 dim 21（显示与定位正确性，含逆计算 / round-trip / 合并窗口 / 栈淘汰）逐项核对 → P1-1 `replaceUndoTop` 末尾无 `redoStack = []`；P2-1 `singleNodeUpdate` 只检查 added/removed/updated 计数，未检查 variables/reordered。
- 决定性证据：4 条 failing-first 测试（栈层 + 适配器层端到端）断言结果值——P1-1 redo 不可用；P2-1 variables/reordered 载荷保留。

## Root Cause

- **P1-1**：`undo-stack.ts` `replaceUndoTop` 语义上是新提交（coalesce-merge），按 U6 须像 `push` 一样截断 redo；但它只替换栈顶 entry，未 `this.redoStack = []`。
- **P2-1**：`operation-coalesce.ts` `singleNodeUpdate` 只校验 added/removed/updated 计数，未拒绝带 `variables` / `reordered` 的 diff；合并只构造 `updated`，故这些载荷被静默丢弃。
- 子系统：editor undo-redo（`undo-stack.ts` + `operation-coalesce.ts` + `undo-redo-adapter.ts`）。

## Fix

- **P1-1**：`editor/undo-redo/undo-stack.ts` `replaceUndoTop`（`:148`）末尾增 `this.redoStack = []`（与 push 同语义，对齐 `design-undo-redo.md` §4.5 + §12.1 U6）。
- **P2-1**：`editor/undo-redo/operation-coalesce.ts:107` `singleNodeUpdate` 增守卫 `if (diff.variables !== undefined || diff.reordered !== undefined) return undefined;`（拒绝合并无法完整搬运载荷的 diff）。

## Tests

- `src/editor/undo-redo/undo-stack.test.ts` — P1-1 栈层 failing-first：coalesce-merge 后 redo 不可用（断言结果值）。
- `src/editor/undo-redo/operation-coalesce.test.ts` — P2-1 failing-first：带 variables/reordered 的 diff 不被合并、载荷保留。
- 适配器层端到端测试覆盖两 finding 的 host 视角行为（断言结果值，非 not.toThrow）。

## Affected Files

- `packages/flux-renderers-industrial/src/editor/undo-redo/undo-stack.ts`
- `packages/flux-renderers-industrial/src/editor/undo-redo/operation-coalesce.ts`

## Notes For Future Refactors

- **coalesce-merge = 新提交**：任何「替换 / 合并栈顶」的操作必须截断 redo（U6），与 `push` 同语义。
- **coalesce 必须拒绝它无法完整搬运载荷的 diff**：合并逻辑只构造 `updated`，故带 `variables` / `reordered` 的 diff 必须被拒（否则载荷静默丢失）。
- 重构 coalesce / replaceUndoTop 时，两个不变量（redo 截断 + 载荷完整性）都要保留；failing-first 测试锁定之。
