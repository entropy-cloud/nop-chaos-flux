# 维度 11：UI 组件使用合规性

## 第 1 轮（初审）

### [维度11-01] spreadsheet grid 把可点击 header 直接做成原生可聚焦 `<th>`，而不是在结构单元中使用 `Button`

- **文件**: `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:474-519`
- **证据片段**:
  ```tsx
  <th
    className="ss-row-header ss-header-corner"
    tabIndex={0}
    aria-label="Select entire sheet"
    onClick={onSelectAll}
    onKeyDown={(event) => {
      if (event.key === 'Enter' || event.key === ' ') {
  ```
- **严重程度**: P2
- **现状**: 原生表头元素自己承担 button 语义与键盘逻辑，而同文件行头路径已经使用了 `Button`。
- **风险**: 交互语义分叉、键盘逻辑重复、与共享 Button contract 脱节。
- **建议**: 保留 `<th>` 结构，但在其中放置全宽 `Button` 承载交互。
- **为什么值得现在做**: 这是当前 live host surface 上的真实一致性/a11y 收敛点。
- **误报排除**: 不是要替换整个 spreadsheet 原生 table 结构；问题仅在 header 把 `<th>` 本身做成交互控件。
- **历史模式对应**: raw element used where UI primitive already exists.
- **参考文档**: `AGENTS.md`、`packages/ui/src/index.ts`
- **复核状态**: 未复核

## 深挖第 2 轮追加

未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度11-01]：保留 (P2)。交互 header 应使用 `Button` 承载语义与行为。
- 虚拟化 spacer `<tr>` 候选已驳回：该处是 inert padding row，`TableRow` 不是合适替代。

## 最终保留项

| 编号  | 严重程度 | 文件                                                              | 一句话摘要                                      |
| ----- | -------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| 11-01 | P2       | `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:474-519` | clickable header 直接由原生 `<th>` 承担交互语义 |
