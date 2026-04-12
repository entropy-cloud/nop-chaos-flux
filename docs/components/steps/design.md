# Steps 组件设计

## 1. 组件定位

- `steps` 是轻量步骤进度 renderer。
- 它主要用于展示当前步骤与整体进度，不承担完整多步流程 owner 语义；完整流程仍由 `wizard` 承担。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `steps`。
- Flux 需明确 `steps` 是展示型/轻交互型组件，而不是多步骤提交生命周期 owner。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'steps'`
- 预期归属 `@nop-chaos/flux-renderers-basic`

## 4. schema 设计

- 建议正式字段为 `items`、`value`、`defaultValue`、`valueOwnership`、`valueStatePath`、`orientation`。

## 5. 字段分类

- `items`、`value`、`defaultValue`、`valueOwnership`、`valueStatePath`、`orientation`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `items` 中每一项建议包含 `title`、`description`、`status`。

## 7. 运行期状态归属

- 当前步骤属于 `steps` 自己的交互状态；真正的业务步骤提交生命周期应由 `wizard` 或 form owner 负责。

## 8. 事件、动作与组件句柄能力

- 推荐事件为 `onChange`。

## 9. 数据源、表达式、导入能力接入点

- `items` 和当前值可由表达式或 source-enabled value 提供。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-steps` marker。

## 11. 实现拆分建议

- item 归一化、值桥接、visual primitive 适配分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和 `wizard` 重新发生 owner 混叠。
