# 81 Industrial HMI Component Audit — Nested Child Node Validation Error Attribution

> Source: HCA8 P2-FE-1（editor panels 审计，test-first 修复）；审计记录 `docs/audits/2026-08-08-1230-hca8-editor-panels.md`。归档 plan `docs/plans/2026-08-08-1430-1-*.md`。

## Problem

- 当 group 的嵌套子节点（`symbols[N].children[M]`）有校验错误时，属性面板（inspector）把错误归因到错误字段。
- 形如 `symbols[N].children[M].field` 的错误，其 `fieldKey` 被错提为 `children[M]`，导致该嵌套字段的错误被静默丢失（不显示在对应字段上）。

## Diagnostic Method

- 诊断难度：表现为「校验错误没显示」，根因在 `fieldKey` 提取逻辑的返回值语义，不在校验本身。
- 调查路径：HCA8 editor panels 审计发现 `field-errors.ts` `findSymbolIndex` 对子节点返回**父节点的顶层索引**，而非递归 scope path → 生成的前缀是 `symbols[N].`（父）而非 `symbols[N].children[M]...`（完整 scope）。
- 决定性证据：交叉比对 `validate.ts:342` 的错误格式（`symbols[N].children[M]`），确认 fieldKey 前缀须与 validate 格式逐字对齐。

## Root Cause

- `field-errors.ts` `findSymbolIndex` 对嵌套子节点返回父节点的顶层数组索引，产生前缀 `symbols[N].`（父级）而非 `symbols[N].children[M]...`（完整 scope path）。
- 形如 `symbols[N].children[M].field` 的错误字符串不匹配该前缀 → `fieldKey` 提取失败 → 嵌套字段错误被静默丢弃。
- 跨边界：inspector（`field-errors.ts` 错误归因）↔ serialization validate（`validate.ts:342` 错误格式）。

## Fix

- `editor/inspector/field-errors.ts` — 用 `findSymbolScopePath`（递归，返回完整 scope path `symbols[N].children[M]...` + `${scopePath}.` 前缀）替换 `findSymbolIndex`，与 `validate.ts:342` 格式对齐。旧 `findSymbolIndex` 已移除。

## Tests

- `src/editor/inspector/field-errors.test.ts:70-73` — 2 条 failing-first 测试：选中 group 的子节点时，断言 `result.<field>` defined（正确归因）+ `result['children[0]']` undefined（旧错位归因不残留）。断言结果值，非 not.toThrow。

## Affected Files

- `packages/flux-renderers-industrial/src/editor/inspector/field-errors.ts`

## Notes For Future Refactors

- 错误归因路径格式必须与 `validate.ts` 的错误字符串格式逐字对齐（含嵌套 `children[M]` 层级）。
- 重构 field-error 路由 / `findSymbolScopePath` 时，保留递归 scope path 语义；新增校验错误格式时同步更新两侧。
