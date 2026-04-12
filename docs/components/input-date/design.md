# Input Date 组件设计

## 1. 组件定位

- `input-date` 是单值日期字段 renderer。
- 它负责日期选择与格式化，不承担时间范围、多值集合或富排班等更重语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-date`，并吸收 `native-date` 这类宿主原生变体为同一 canonical family。
- Flux 应优先统一 `valueFormat`、`displayFormat`、`minDate`、`maxDate` 这类最终字段，而不是长期保留多套历史别名。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-date'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`valueFormat`、`displayFormat`、`minDate`、`maxDate`、`utc`、`clearable`、`required`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`valueFormat`、`displayFormat`、`minDate`、`maxDate`、`utc`、`clearable`、`required`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- `input-date` 首版不开放自由 regions。

## 7. 运行期状态归属

- 值与校验状态归 `FormRuntime` 或最近 owner scope。
- 打开态和临时面板状态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 变化事件通过标准字段写回路径完成。
- 如需句柄，优先复用 `component:focus`、`component:setValue` 等统一 field 能力。

## 9. 数据源、表达式、导入能力接入点

- 最小/最大日期和禁用态可由表达式驱动。
- 该字段不拥有请求协议。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-date` marker。
- 视觉层应复用共享日期选择 primitive，而不是在 renderer 里硬编码布局。

## 11. 实现拆分建议

- 日期解析/格式化、field bridge、弹层交互适配分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把单值日期字段和日期范围字段再次混成一类。
