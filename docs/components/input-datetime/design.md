# Input Datetime 组件设计

## 1. 组件定位

- `input-datetime` 是单值日期时间字段 renderer。
- 它承接“一个时间点”的输入语义，不替代范围时间轴或排班编辑。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-datetime`。
- Flux 正式契约应优先保留与日期字段一致的命名模型，并只在需要时额外补充时间格式字段。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-datetime'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`valueFormat`、`displayFormat`、`timeFormat`、`minDate`、`maxDate`、`utc`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`valueFormat`、`displayFormat`、`timeFormat`、`minDate`、`maxDate`、`utc`、`required`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- `input-datetime` 不开放自由 regions。

## 7. 运行期状态归属

- 字段值与校验状态归最近的表单或 owner scope。
- 面板打开态和临时选择态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 继续走统一字段写回与 handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 范围限制、只读和禁用态可由表达式驱动。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-datetime` marker。

## 11. 实现拆分建议

- 日期时间解析、选择器适配、field bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是和 `input-date`、`input-time` 之间重新形成不一致命名。
