# Input Year 组件设计

## 1. 组件定位

- `input-year` 是年份字段 renderer。
- 它负责单值年份选择，不与日期、月份或季度字段混淆。

## 2. 与 AMIS 或既有产品的能力对照

- 对应 AMIS `input-year`。
- Flux 应让年份家族延续日期字段一致的命名和 owner 语言。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'input-year'`
- 预期归属 `@nop-chaos/flux-renderers-form`

## 4. schema 设计

- 建议正式字段为 `name`、`label`、`valueFormat`、`displayFormat`、`minDate`、`maxDate`。

## 5. 字段分类

- `label`: `value-or-region`
- `name`、`valueFormat`、`displayFormat`、`minDate`、`maxDate`: `value`

## 6. regions 与 slot 约定

- `label` 复用统一 field frame。

## 7. 运行期状态归属

- 值与校验状态归最近表单或 owner scope。

## 8. 事件、动作与组件句柄能力

- 继续沿用统一字段写回与 handle 语言。

## 9. 数据源、表达式、导入能力接入点

- 最小/最大年份可由表达式控制。

## 10. 样式与 DOM marker 约定

- 根节点输出 `nop-input-year` marker。

## 11. 实现拆分建议

- 年份值归一化和 field bridge 分开实现。

## 12. 风险、取舍与后续阶段

- 主要风险是让年份字段继续依赖宿主原生控件模式而失去统一 contract。
