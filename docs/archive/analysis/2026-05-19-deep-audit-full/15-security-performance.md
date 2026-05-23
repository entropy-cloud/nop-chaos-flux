# 维度 15: 安全与性能红线

## 第 1 轮（初审）

### [维度15-01] TreeRenderer 无虚拟化/懒渲染阈值，展开大树会全量递归挂载

- **文件**: `packages/flux-renderers-data/src/tree-renderer.tsx:299-325`
- **证据片段**:
  ```tsx
  {hasChildren ? (
    <CollapsibleContent>
      <div data-slot="tree-children" role="group">
        {childNodes.map((childNode, childIndex) => (
          <TreeNodeRenderer
            key={`${nodeKey}:${toNodeKey(childNode, keyField, childIndex)}`}
            owner={owner}
            node={childNode}
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1/P7
- **现状**: expanded child tree 递归渲染所有 child nodes，未提供 virtualization、lazy render threshold 或 large tree contract。
- **风险**: 组织/权限/菜单树等大数据在 expanded/initiallyExpanded 下会一次性创建大量 React nodes/DOM，键盘导航也会线性扫描。
- **建议**: 增加 `virtualThreshold`、lazy children 或 max initial render depth，并把 visible node model 扁平化后渲染。
- **为什么值得现在做**: table 已有 virtualization baseline，tree 是同类长集合组件。
- **误报排除**: 不是所有 map 都需虚拟化；tree schema 接收任意 data 且无小数据限制。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 维度复核通过

### [维度15-02] TabsRenderer 同时渲染所有 tab panel 和 region

- **文件**: `packages/flux-renderers-basic/src/tabs.tsx:177-203`
- **证据片段**:
  ```tsx
  const tabsPanels = (
    <>
      {items.map((item, index) => {
        const value = getItemValue(item, index);
        const regionOptions = createTabRegionOptions(item, index);
        const bodyRegion =
          typeof item.bodyRegionKey === 'string' ? props.regions[item.bodyRegionKey] : undefined;
  ```
- **严重程度**: P2
- **类别**: 性能
- **规则编号**: P1/P7
- **现状**: 对所有 tab 生成 `TabsContent` 并执行 toolbar/body region render，没有 active-only/lazy mount/keepAlive contract。
- **风险**: 隐藏 tab 的表格、表单、图表提前挂载并订阅，首屏成本和 runtime 压力随 tab 总数线性膨胀。
- **建议**: 默认只挂载 active tab，提供 `forceMount`/`keepAlive` 作为显式 opt-in。
- **为什么值得现在做**: v1 基线下适合尽早裁定 tabs lazy mount 语义，避免兼容负担。
- **误报排除**: 问题是 hidden region 子树被默认执行，不是 map 本身。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 维度复核通过

### [维度15-03] table column settings 渲染中重复线性查找形成 O(n²)

- **文件**: `packages/flux-renderers-data/src/table-renderer.tsx:299-312,359-370`
- **证据片段**:
  ```tsx
  {orderedColumns.map((key) => {
    const columnIndex = columns.findIndex(
      (column, index) => (column.name ?? `column-${index}`) === key,
    );
    if (columnIndex < 0) {
      return null;
    }
  ```
- **严重程度**: P3
- **类别**: 性能
- **规则编号**: P2
- **现状**: column settings UI 中 `orderedColumns.map` 内调用 `columns.findIndex` 与 `orderedColumns.indexOf`。
- **风险**: 宽表打开列设置时渲染成本平方级，交互弹层可能卡顿。
- **建议**: render 前构建 `Map<columnKey, { column, index }>`，map callback 使用 `orderedIndex` 参数。
- **为什么值得现在做**: 小范围优化，table 是高性能组件。
- **误报排除**: 复核保留为 P3，因为只发生在列设置 UI，不是主单元格热路径。
- **参考文档**: `docs/architecture/performance-design-requirements.md`
- **复核状态**: 已降级

## 深挖第 2 轮追加

维度 15：未发现新的高价值问题。深挖结束。

## 维度复核结论

- [维度15-01]: 保留 (P2)。tree expanded subtree 无 virtualization/lazy threshold。
- [维度15-02]: 保留 (P2)。tabs eager render all hidden region subtrees。
- [维度15-03]: 降级为 P3。column settings O(n²) 只在弹层路径。

## 子项复核结论

- P2/P3 项按维度复核归档；后续需组件契约裁定 lazy mount default 语义。

## 最终保留项

| 编号  | 严重程度 | 文件                                                          | 一句话摘要                                        |
| ----- | -------- | ------------------------------------------------------------- | ------------------------------------------------- |
| 15-01 | P2       | `packages/flux-renderers-data/src/tree-renderer.tsx:299-325`  | TreeRenderer expanded subtree 无虚拟化/懒渲染阈值 |
| 15-02 | P2       | `packages/flux-renderers-basic/src/tabs.tsx:177-203`          | TabsRenderer 默认挂载所有 hidden tab regions      |
| 15-03 | P3       | `packages/flux-renderers-data/src/table-renderer.tsx:299-312` | table column settings 存在局部 O(n²) 查找         |
