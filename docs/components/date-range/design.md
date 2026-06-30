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
- **immediate-commit 契约（D7）**：选择/时间变更**立即** commit 并写回字段值（`commitRange` 每次交互都 `handlers.onChange`）。无 pending/preview state、无 confirm 按钮——显示值恒等于已提交值，因此「previewed-but-uncommitted 泄漏」不可发生。amis 式 confirm-step 在 Flux 是**设计差异（刻意不采纳）**，而非缺陷。

## 7.1 边界与校验契约（D4 / D6）

- **bound 独立性（D4）**：设一端时间分量**不**变异另一端。`setTimeOn('start', …)` 调 `commitRange(base, endDate)`（end 透传不变），`setTimeOn('end', …)` 调 `commitRange(startDate, base)`（start 不变）。`normalizeRange` 仅在两端均存在且 start>end 时 swap，**不**清零时间分量。datetime-range 两端的时间分量彼此独立存活。
- **required 两端校验（D6）**：范围值是单 delimited 字符串（`joinDateRange`，默认 `,`）。当 `required: true` 时，**两端均须非空**——仅设一端（值形如 `'2024-06-01,'`）视为未满足 required。
  - 裁定（option-a，validator 注册）：date-range renderer 经 `validation.collectRules` 在 `required: true` 时贡献 `{ kind: 'requiredRange', delimiter }` 规则。该规则**仅**在「部分填充」（一端非空、另一端空）时触发错误；全空由通用 `required` 规则处理，全填不触发。故任一状态至多一条 required 类错误。
  - 不采用 option-b（归一化使单端触发），因其会在非 required range 丢掉合法的半选值（regression 风险）。
- **start≤end 保证（D5）**：写时 `commitRange` 调 `normalizeRange`，两端均存在且 start>end 时 swap；读时亦 swap（`date-range-renderer.tsx:95-97`）。故存储值恒满足 start≤end。

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
