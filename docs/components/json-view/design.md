# Json View 组件设计

## 1. 组件定位

- `json-view` 是结构化 JSON 数据查看 renderer。
- 它用于调试、审计和结构化数据展示，不是通用代码编辑器。

## 2. 与 AMIS 或既有产品的能力对照

- 当前尚未实现，但 UI 组件层已有 `JsonViewer` 可复用。
- 折叠层级、复制和只读展示是首版高价值能力。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'json-view'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `value`、`collapsed`、`showCopy`、`empty`。

## 5. 字段分类

- `value`、`collapsed`、`showCopy`: `value`
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 仅保留 `empty` 作为空态区。

## 7. 运行期状态归属

- 展开折叠态可支持 `local` 或 `controlled`，首版建议本地管理。

## 8. 事件、动作与组件句柄能力

- 可支持 `component:copy` 与 `onCopy`。

## 9. 数据源、表达式、导入能力接入点

- `value` 可来自任意表达式结果或 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-json-view` marker。

## 11. 实现拆分建议

- 数据格式化、展开态管理和复制行为分离。

## 12. 风险、取舍与后续阶段

- 大对象渲染性能需要关注，避免把它当作通用大数据树控件使用。
