# 维度 11：UI 组件使用一致性

## 第 1 轮（初审）

未发现需报告问题。

已复核并排除的 suspect leads：

- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`
  - 结论：不保留。
  - 原因：这里是 spreadsheet 的自包含高性能表格/网格 surface，依赖原生 table 结构、merged cell、resize handle、virtual spacer row/col 等语义；`@nop-chaos/ui` 的 `Table` 封装不是等价替代。
- `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`
  - 结论：不保留。
  - 原因：命中的原生 `<tr>` 是 virtualization spacer row，而不是业务行；使用 `TableRow` 反而会把样式语义附着到占位结构节点。
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx`
  - 结论：不保留。
  - 原因：隐藏 file input 需要 `ref` 驱动点击；当前更像 `@nop-chaos/ui` primitive 能力缺口，而不是 owner 无理由绕过 shared component。

## 检查范围

- `AGENTS.md`
- `packages/*renderers*/src/**/*.tsx`
- `apps/playground/src/**/*.tsx`

结论：本轮未确认真实的 shared UI primitive bypass 问题。

## 维度复核结论

- 结论: 保持零发现。
- 理由: 复核后未发现新的强支撑问题。`packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` 的原生 `<table>/<tr>/<td>/<th>` 仍属于 spreadsheet surface 的核心语义结构，并依赖 merged cell、virtual spacer、ARIA grid 和 resize handle 等能力，不是无理由绕过 shared UI primitive。`packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx` 中命中的原生 `<tr>` 仅用于 virtualization padding，真实数据行仍走 `@nop-chaos/ui` 表格 primitive。`packages/word-editor-renderers/src/toolbar/insert-controls.tsx` 的隐藏 file input 也属于必要的原生入口，而不是一致性违规。

## 子项复核结论

- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`: 不新增，维持特殊高性能表格 surface 判断。
- `packages/flux-renderers-data/src/table-renderer/table-body-rows.tsx`: 不新增，原生 `<tr>` 仅为 virtualization spacer。
- `packages/word-editor-renderers/src/toolbar/insert-controls.tsx`: 不新增，隐藏 file input 属必要原生入口。
- `apps/playground/src`: 未见新的生产代码级 shared UI primitive bypass。

## 最终保留项

| 编号 | 严重程度 | 文件 | 一句话摘要 |
| ---- | -------- | ---- | ---------- |
