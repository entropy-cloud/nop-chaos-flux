# 05 Reactive Precision

- 深挖轮次: 3
- 深挖发现数: 8
- 维度复核: 7 保留 / 1 降级 / 0 驳回
- 子项复核: 已完成高风险性能条目复核

## 第 1 轮初审

- `report-designer-renderers/src/inspector-shell-renderer.tsx` whole-scope 订阅
- `report-designer-renderers/src/field-panel-renderer.tsx` whole-scope 订阅

## 深挖第 2 轮追加

- `flow-designer` canvas full snapshot
- `flow-designer` inspector 订阅整个 `doc` 只取 counts
- `report-designer` toolbar whole-scope

## 深挖第 3 轮追加

- `flow-designer` toolbar selector 每次返回新对象且无 equalityFn
- `flow-designer` page shell full snapshot
- `report-designer` page renderer full core/full spreadsheet snapshot

## 维度复核结论

保留:

- `report` field panel whole-scope
- `flow designer` canvas full snapshot
- `flow designer` inspector whole doc
- `report designer` toolbar whole-scope
- `flow designer` toolbar selector 不稳定
- `flow designer` page shell full snapshot
- `report designer` page full snapshot

降级:

- `report inspector shell` whole-scope，但当前壳层较薄

## 子项复核结论

降级:

- `flow-designer` canvas full snapshot 从“高风险红线”降为“明确过宽订阅面”

## 最终保留项

### [维度05] Flow Designer 页面层与画布层仍依赖 full snapshot 订阅，放大无关状态更新

- **文件**: `packages/flow-designer-renderers/src/designer-canvas.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`
- **严重程度**: P2
- **现状**: canvas 与 page shell 都直接订阅 full snapshot，拖拽、selection、header/panel 状态更新彼此放大
- **风险**: 非相关状态也会唤醒重型 shell/canvas 路径，增加设计器交互成本
- **建议**: 拆成节点/边/viewport/grid/shell state 等多个精确 selector
- **复核状态**: 维度复核通过

### [维度05] Report Designer 多个面板仍 whole-scope 订阅

- **文件**: `packages/report-designer-renderers/src/field-panel-renderer.tsx`, `packages/report-designer-renderers/src/report-designer-toolbar.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`
- **严重程度**: P2
- **现状**: 字段面板、toolbar、page 根层都以整份 host/core snapshot 为订阅单位
- **风险**: cell 选择、preview、inspector 等局部变化会推动整个页面壳层与常驻面板重渲染
- **建议**: 将 host scope 投影与常驻 UI 收窄到最小 slice
- **复核状态**: 维度复核通过
