# 维度 04: 状态所有权与单一事实来源

## 第 1 轮（初审）

### [维度04-01] Table/CRUD scope-backed 列设置无法表达显式空集合

- **文件**: `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:50-69`; `packages/flux-renderers-data/src/crud-renderer-ownership.ts:90-93`
- **证据片段**:
  ```ts
  const orderedColumns = useMemo(
    () =>
      normalizeOrderedColumns(
        orderedStatePath
          ? scopeOrderedColumns?.length
            ? scopeOrderedColumns
            : defaultOrderedColumns
          : localOrderedColumns,
        defaultOrderedColumns,
      ),
  ```
  ```ts
  const visibleColumns = state.toggledColumns?.length ? state.toggledColumns : defaultColumnNames;
  const orderedColumns = state.orderedColumns?.length ? state.orderedColumns : defaultColumnNames;
  const visibleSet = new Set(visibleColumns);
  return orderedColumns.filter((name) => visibleSet.has(name));
  ```
- **严重程度**: P1
- **现状**: scope owner 明确写入 `[]` 时，table 主渲染路径和 CRUD 摘要路径都用 `.length` 判断回退到默认列。
- **风险**: “隐藏全部列”或外部 owner 明确设置空列集合无法表达，UI 与 `$crud.visibleColumnNames` 摘要和 owner state 分裂。
- **建议**: 区分 `undefined`/非数组与显式空数组；owner path 有数组值时直接采用，包括 `[]`。ordered columns 也需要明确空顺序语义。
- **为什么值得现在做**: column settings state paths 是 live interaction-owner 主路径，修复范围窄且可加回归测试。
- **误报排除**: 不是局部 UI state tradeoff；scope-backed path 是外部事实来源。
- **参考文档**: `docs/components/table/design.md`, `docs/components/crud/design.md`
- **复核状态**: 子项复核通过

## 深挖第 2 轮追加

第 2 轮确认 table 主渲染路径与 CRUD 摘要路径是同一 owner-state 语义缺陷，最终合并为 [维度04-01]，不重复计数。

## 维度复核结论

- [维度04-01]: 保留 (P1)。独立复核确认 `.length` fallback 同时影响 table render 和 CRUD status summary。

## 子项复核结论

- [维度04-01]: 成立 (P1)。显式 `[]` owner state 会被默认值覆盖，影响单一事实来源。

## 最终保留项

| 编号  | 严重程度 | 文件                                                                                 | 一句话摘要                                |
| ----- | -------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| 04-01 | P1       | `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts:50-69` | scope-owned 列显隐/顺序空数组被默认列覆盖 |
