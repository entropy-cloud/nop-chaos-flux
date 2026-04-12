# Date Range 组件设计

## 1. 组件定位

- `date-range` 是范围日期字段家族的 canonical Flux owner，用来统一承接日期、日期时间、时间范围输入。
- 它存在的目的，是避免把 `input-date-range`、`input-datetime-range`、`input-time-range` 长期保留成三套并行 canonical type。

## 2. 与 AMIS 或既有产品的能力对照

- 它承接 AMIS `input-date-range`、`input-datetime-range`、`input-time-range` 三个历史 type。
- Flux 正式契约应保留一个稳定范围字段 family，并用明确模式字段区分 date/datetime/time。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'date-range'`
- 预期归属 `@nop-chaos/flux-renderers-form`
- 预期 `wrap: true`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`rangeKind`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`、`utc`、`shortcuts`。
- `rangeKind` 建议取值 `date`、`datetime`、`time`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`rangeKind`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`、`utc`、`shortcuts`: `value`
- `onChange`: `event`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。
- `date-range` 首版不开放自由 regions。

## 7. 运行期状态归属

- 范围值与校验状态归最近表单或 owner scope。
- 临时起止选择态属于字段内部交互状态。

## 8. 事件、动作与组件句柄能力

- 继续走标准字段写回路径与统一 field handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 范围限制、快捷项和禁用态可由表达式或静态值控制。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-date-range` marker。

## 11. 实现拆分建议

- 范围值归一化、日期/时间模式适配、field bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 最大风险是再次回到三个并行 canonical type，导致日期家族 contract 分裂。
