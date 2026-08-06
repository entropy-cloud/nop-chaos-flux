# Input Time 组件设计

## 1. 组件定位

- `input-time` 是单值时间字段 renderer。
- 它负责一天内时间点的选择，不负责日期语义。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-time`，并吸收 `native-time` 变体为同一 canonical family。
- Flux 应优先沿用日期家族统一命名，只在时间字段中保留最少必要差异。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-time'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`valueFormat`、`displayFormat`、`minTime`、`maxTime`、`required`。
- **displayFormat 语义（2026-08-03 C2.4 收敛）**：原生 `<input type="time">` 的显示格式由浏览器固定为 `HH:mm`（含 `ss` 时 `HH:mm:ss`）；`displayFormat` 仅参与秒分辨率决策（`valueFormat`/`displayFormat` 任一含 `ss` 时原生输入启用秒粒度），不改变原生控件的显示字形。存储始终由 `valueFormat` 决定。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`valueFormat`、`displayFormat`、`minTime`、`maxTime`、`required`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。

## 7. 运行期状态归属

- 值与校验状态归最近表单或 owner scope。
- 打开态和临时面板状态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 继续走标准字段写回路径和统一 field handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 最小/最大时间和禁用态可由表达式求值。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-time` marker。
- 根节点被 FieldFrame 包裹：`data-slot="field-control"` 由 FieldFrame 输出，根节点不再重复（内部 `nop-date-control` 亦不输出）。

## 11. 实现拆分建议

- 时间值解析与字段桥接分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是把时间字段的格式命名和日期/日期时间家族割裂开。
