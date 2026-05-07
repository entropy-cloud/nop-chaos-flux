# 15 Security Performance

- 深挖轮次: 3
- 深挖发现数: 8
- 维度复核: 2 保留 / 4 降级 / 2 驳回
- 子项复核: 已完成高风险性能条目复核

## 第 1 轮初审

- `simpleTreeLayout()` 在 `mergeTargets` 循环内反复 `edges.filter(...)`

## 深挖第 2 轮追加

- `ui/chart.tsx` 通过 `dangerouslySetInnerHTML` 形成样式注入面
- `simpleTreeLayout()` 还有 `queue.shift()` 与 `O(N*E)` 深度计算
- `tree-commands.ts` 用 `JSON.parse(JSON.stringify(...))` 整树克隆

## 深挖第 3 轮追加

- `validation-collection.ts` `queue.shift/unshift`
- `flow-designer` `constraints.ts` 连线约束反复 `edges.filter(...).length`
- `spreadsheet-core` 多处 JSON 深拷贝位于核心路径
- `report-designer-core` 多处 JSON 深拷贝位于核心路径

## 维度复核结论

保留:

- `simpleTreeLayout()` `mergeTargets` 循环内 `edges.filter(...)`
- `simpleTreeLayout()` `queue.shift()` 与 `O(N*E)` 深度计算

降级:

- `ui/chart.tsx` 样式注入面
- `tree-commands.ts` 整树 JSON 克隆
- `spreadsheet-core` JSON 深拷贝路径
- `report-designer-core` JSON 深拷贝路径

驳回:

- `validation-collection.ts` 作为运行时红线
- `constraints.ts` 作为当前红线路径

## 子项复核结论

降级:

- `flow-designer` tree-layout 问题从“主交互热路径红线”降为“fallback/次级路径但仍应修的性能债”

## 最终保留项

### [维度15] `simpleTreeLayout()` 仍包含多处可定位的平方级/近平方级扫描路径

- **文件**: `packages/flow-designer-core/src/tree-layout.ts`
- **严重程度**: P1
- **现状**: `mergeTargets` 循环内 `edges.filter(...)`、BFS `queue.shift()`、`N * E` 深度松弛都仍存在
- **风险**: tree 布局 fallback 路径在中大图上退化明显，后续更难定位性能抖动来源
- **建议**: 预索引 incoming edges、改用游标队列/双端队列、用更接近 DAG 拓扑的深度计算
- **复核状态**: 子项复核通过
