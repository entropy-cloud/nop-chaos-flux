# Designer Palette 组件设计

## 1. 组件定位

- `designer-palette` 是 Flow Designer 左侧节点 palette renderer。
- 它负责展示 node types、拖拽入口和分类组织。

## 2. 与 AMIS 或既有产品的能力对照

- 当前已落地为独立 renderer，并被 `designer-page` 的工作台壳层直接消费。
- 搜索、收藏和分组折叠属于后续增强。

## 3. Flux 中的 renderer/type 定义

- `type: 'designer-palette'`
- `sourcePackage: '@nop-chaos/flow-designer-renderers'`

## 4. schema 设计

- 当前最小 schema 为空壳 type。
- 长期建议把 palette 的过滤器、分组策略和空态文案作为可选字段，但核心节点定义仍应来自 `config.nodeTypes`。

## 5. 字段分类

- 现阶段无稳定公开字段。

## 6. regions 与 slot 约定

- 首版不开放自由 regions。
- palette item 的视觉呈现应由 node type config 或专用 node card renderer 承接。

## 7. 运行期状态归属

- palette 折叠态属于 designer snapshot。
- 本地 hover、drag preview 为临时 UI 状态。

## 8. 事件、动作与组件句柄能力

- 主要通过拖拽和 `designer:addNode` 一类动作与 core 交互。

## 9. 数据源、表达式、导入能力接入点

- palette 数据来自 designer config，不应再单独发请求。

## 10. 样式与 DOM marker 约定

- 根节点保留 `nop-designer-palette` marker。
- 节点预览卡视觉应与 canvas 节点卡保持同一设计语言。

## 11. 实现拆分建议

- 分组列表、拖拽 MIME 协议和 item 呈现拆分。

## 12. 风险、取舍与后续阶段

- palette 一旦承担过多编辑逻辑，会与 inspector/canvas 边界混乱，需要保持“入口列表”定位。