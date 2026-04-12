# Input Table 组件设计

## 1. 组件定位

- `input-table` 是表格式对象数组字段 renderer。
- 它把表格展示和字段编辑结合在一起，但值 owner 仍然是表单字段体系。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-table`。
- Flux 应优先复用 `table` 的列/行语义和 composite-field 的值/验证语义，而不是重新做一套混合大组件协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-table'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`columns`、`rowKey`、`addable`、`removable`、`reorderable`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`columns`、`rowKey`、`addable`、`removable`、`reorderable`、`required`: `value`
- `onAdd`、`onRemove`、`onReorder`: `event`

## 6. regions 与 slot 约定

- 列内容应优先走标准列定义与受控 region key，而不是任意函数型 cell renderer。

## 7. 运行期状态归属

- 字段值与验证归 composite-field owner。
- 表格选择、展开等交互如果需要，应明确是否属于 `input-table` 自己的局部交互态。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:addRow`、`component:removeRow`、`component:moveRow`。

## 9. 数据源、表达式、导入能力接入点

- 行数据来自字段值本身，不由组件再引入第二条请求协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-table` marker。

## 11. 实现拆分建议

- field owner bridge、table projection、row editing bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和通用 `table` 及 `array-editor` 两边都重复建模。
