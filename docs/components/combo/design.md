# Combo 组件设计

## 1. 组件定位

- `combo` 是复合值字段容器，用来编辑重复对象项或小型复合结构。
- 它属于 advanced form family，不是 `array-editor` 的简单别名。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `combo`。
- Flux 应优先把它放在当前 object/array/composite field 体系内理解，而不是复制历史表单大组件行为面。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'combo'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`items`、`itemSchema`、`multiple`、`addable`、`removable`、`reorderable`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`items`、`multiple`、`addable`、`removable`、`reorderable`: `value`
- `itemSchema`: `region`
- `onAdd`、`onRemove`、`onReorder`: `event`

## 6. regions 与 slot 约定

- `itemSchema` 是单项复合字段模板区域。

## 7. 运行期状态归属

- 值和校验状态归最近表单或 composite-field owner runtime。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:addItem`、`component:removeItem`、`component:moveItem`。

## 9. 数据源、表达式、导入能力接入点

- 初值和重复项配置可由表达式驱动。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-combo` marker。

## 11. 实现拆分建议

- item runtime、数组操作桥接、field chrome 分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是与现有 object/detail/array family 重复建模。
