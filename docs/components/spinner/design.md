# Spinner 组件设计

## 1. 组件定位

- `spinner` 是轻量加载指示 renderer。
- 它用于局部加载反馈，不承担 skeleton 或进度条的语义。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），复用 `@nop-chaos/ui` Spinner primitive。
- 极简基线：`label`（value-or-region）、`size`、`visible`（meta），不承担 skeleton 或进度条语义。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'spinner'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `label`、`size`、`visible`。

## 5. 字段分类

- `label`: `value-or-region`
- `size`、`visible`: `value`

## 6. regions 与 slot 约定

- 仅 `label` 可能需要 slot。

## 7. 运行期状态归属

- 无内部业务状态。

## 8. 事件、动作与组件句柄能力

- 默认无事件。

## 9. 数据源、表达式、导入能力接入点

- `visible` 与 `label` 可接表达式。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-spinner` marker。
- 视觉层复用 `@nop-chaos/ui` Spinner。

## 11. 实现拆分建议

- 仅需极薄的 UI 适配层。

## 12. 风险、取舍与后续阶段

- 需要避免与 `progress`、`skeleton` 的语义混淆。
