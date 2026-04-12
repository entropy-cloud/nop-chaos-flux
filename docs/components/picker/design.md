# Picker 组件设计

## 1. 组件定位

- `picker` 是弹层选择字段 renderer，用来通过内嵌表单、列表或局部页面选择最终值。
- 它是 advanced form family 的选择壳，不是通用 dialog 或 table 的别名。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `picker`。
- Flux 应优先用 `dialog` / `drawer` + field value owner 的组合语言表达它，而不是复制历史大而全 picker 协议。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'picker'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`valueKey`、`labelKey`、`pickerDialog`、`multiple`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`valueKey`、`labelKey`、`multiple`、`required`: `value`
- `pickerDialog`: `value`
- `onPick`: `event`

## 6. regions 与 slot 约定

- 首版可把 picker surface 保留为配置对象字段，而不是自由 region。

## 7. 运行期状态归属

- 字段值归表单 owner；打开态归内部 surface owner。

## 8. 事件、动作与组件句柄能力

- 推荐句柄为 `component:open`、`component:clear`。

## 9. 数据源、表达式、导入能力接入点

- picker 内部数据源与选择 UI 应继续复用 `dialog`、`table`、`list`、`tree` 等既有 owner 语义。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-picker` marker。

## 11. 实现拆分建议

- field bridge、surface bridge、selection result mapping 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是重新发明一套与 dialog/table/list 平行的子系统协议。
