# Json View 组件设计

## 1. 组件定位

- `json-view` 是结构化 JSON 数据查看 renderer。
- 它用于调试、审计和结构化数据展示，不是通用代码编辑器。

## 2. 与 AMIS 或既有产品的能力对照

- 已 shipped：注册于 `flux-renderers-content`（`content-renderer-definitions.ts`），复用 UI 层 `JsonViewer`。
- 支持折叠层级、复制与只读展示（`value`、`collapsed`、`showCopy`、`empty`）。

## 3. Flux 中的 renderer/type 定义

- 实际 `type: 'json-view'`
- 实际归属 `@nop-chaos/flux-renderers-content`

## 4. schema 设计

- 建议字段为 `value`、`collapsed`、`showCopy`、`empty`。

## 5. 字段分类

- `value`、`collapsed`、`showCopy`: `value`
- `empty`: `value-or-region`

## 6. regions 与 slot 约定

- 仅保留 `empty` 作为空态区。

## 7. 运行期状态归属

- 展开折叠态可支持 `local` 或 `controlled`，首版建议本地管理。

## 8. 事件、动作与组件句柄能力

- 可支持 `component:copy` 与 `onCopy`。

## 9. 数据源、表达式、导入能力接入点

- `value` 可来自任意表达式结果或 source-enabled value。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-json-view` marker。

## 11. 实现拆分建议

- 数据格式化、展开态管理和复制行为分离。

## 11.1 复制定时器生命周期

复制成功后重置 `copied` 标志的定时器在卸载时必须清理（消除 pending `setCopied`），并在重新复制前清除上一个定时器（避免快速双击叠加定时器）。实现用 ref 持有 timer id + unmount cleanup（见 `docs/plans/2026-06-25-0510-2-new-package-advertised-contract-and-lifecycle-honesty-plan.md` WS-C，S2）。

## 12. 风险、取舍与后续阶段

- 大对象渲染性能需要关注，避免把它当作通用大数据树控件使用。
