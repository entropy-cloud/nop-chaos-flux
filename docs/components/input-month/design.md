# Input Month 组件设计

## 1. 组件定位

- `input-month` 是月份字段 family 的 canonical owner。
- 它统一承接单月与月范围 authoring，不再保留第二个 canonical `input-month-range` type。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-month` 与 `input-month-range`。
- Flux 正式契约应使用一个 family 再通过模式区分单值或范围。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-month'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`selectionMode`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`、`shortcuts`。
- **shortcuts 语义（2026-08-03 C2.4 收敛）**：快捷项 `{ label, start, end }` 以值格式（valueFormat）书写，渲染为控件行下方的内联按钮。`single` 模式取 `start` 提交（经 min/max clamp）；`range` 模式双端提交（`end` 必填，缺失项被过滤；两端经 `normalizePeriodRange` 归一 start≤end）。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`selectionMode`、`valueFormat`、`displayFormat`、`delimiter`、`minDate`、`maxDate`、`shortcuts`: `value`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。

## 7. 运行期状态归属

- 值和校验状态归最近表单或 owner scope。

## 8. 事件、动作与组件句柄能力

- 继续沿用统一字段写回与 handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 最小/最大月份与 shortcuts 可由表达式控制。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-month` marker。

## 11. 实现拆分建议

- 单月/范围模式适配与 field bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是让月范围重新演化成第二个 canonical type。
