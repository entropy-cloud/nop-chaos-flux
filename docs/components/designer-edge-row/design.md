# Designer Edge Row 组件设计

## 1. 组件定位

- `designer-edge-row` 是 Flow Designer 边信息列表的候选专用 renderer。
- 当前它和 `designer-node-card` 一样，属于已声明 schema 并已在 `flowDesignerRendererDefinitions` 中正式注册的 renderer，作为 designer-page 边界内的 schema 级边摘要展示（inspector / side panel 用）。

## 2. 与 AMIS 或既有产品的能力对照

- 它更接近 inspector 或 side panel 中的边摘要展示，而不是独立业务控件。

## 3. Flux 中的 renderer/type 定义

- 目标 `type: 'designer-edge-row'`
- 预期归属 `@nop-chaos/flow-designer-renderers`
- 当前状态：已注册（`packages/flow-designer-renderers/src/renderer-definitions.ts` 注册 `DesignerEdgeRowRenderer`，按 id 解析 edge 摘要、渲染 source→target、点击派发 `selectEdge` command）

## 4. schema 设计

- 当前最小字段是 `edgeId`。
- 后续建议补充 `sourceLabel`、`targetLabel`、`status`、`selected` 等投影字段。

## 5. 字段分类

- `edgeId`: `value`

## 6. regions 与 slot 约定

- 首版不建议开放自由 regions。
- 如果需要动作区，可后续增加受限 `actions` region。

## 7. 运行期状态归属

- 边选中态、校验态和标签投影都来自 designer snapshot。

## 8. 事件、动作与组件句柄能力

- 交互应转换为 designer command，如聚焦边、删除边。

## 9. 数据源、表达式、导入能力接入点

- 与 `designer-node-card` 一样，不直接接数据源。

## 10. 样式与 DOM marker 约定

- 建议保留 `nop-designer-edge-row` marker。

## 11. 实现拆分建议

- 边摘要投影、行渲染和动作桥接分离。

## 12. 风险、取舍与后续阶段

- ~~边列表组件是否独立公开，需要等 inspector 与 graph summary 需求稳定后再确定。~~ 已落地：host bridge 稳定（`HostProjectionContract`），inspector/graph summary 摘要需求已由稳定投影字段覆盖（`doc.edges[]`、`activeEdge`、`selection`）。renderer 已注册于 `flowDesignerRendererDefinitions`，落地 plan：`docs/plans/2026-06-25-0307-1-d1a-designer-node-card-edge-row-registration-plan.md`。
