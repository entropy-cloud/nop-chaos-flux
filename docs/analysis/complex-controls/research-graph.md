# 图查看器（Graph Viewer）开源实现调研报告

> 日期：2026-08-04
> 调研背景：ArbiterOS 治理界面（Langfuse 定制版 trace 图）需求落地评估——Flux 需要只读交互式图查看器 renderer（`graph`）
> 参考仓库：`~/app/nop-chaos-flux`（flow-designer 已使用 `@xyflow/react` 12.10.2）、`~/ai/arbiteros`（需求来源：`assets/docs/visualization.md`；外部需求输入，不在本仓库内可验证）

---

## 1. 调研概要

| 项目                       | 许可       | 核心能力                                    | 渲染方式   | 关注点                                  |
| -------------------------- | ---------- | ------------------------------------------- | ---------- | --------------------------------------- |
| @xyflow/react (React Flow) | MIT        | 节点/边画布、缩放平移、视口内渲染、事件系统 | React 组件 | **已在 flow-designer 使用同版 12.10.2** |
| Cytoscape.js               | MIT        | 复杂图分析、布局算法丰富                    | canvas     | 命令式 API，与 React 声明式模型有摩擦   |
| vis-network                | MIT        | 力导向图、简单易用                          | canvas     | 功能偏轻，大型图性能一般                |
| AntV G6                    | MIT        | 图分析全功能（布局/交互/分析）              | canvas/SVG | 体积大，API 风格与 Flux 差异大          |
| ECharts graph series       | Apache-2.0 | 图关系 series（力导向/环形）                | canvas     | 交互能力有限（无自由平移/节点模板渲染） |

---

## 2. 需求来源：ArbiterOS / Langfuse trace 图

调研对象 `~/ai/arbiteros`（AI agent 治理内核）的 Langfuse 定制 UI（`assets/docs/visualization.md`）中，Tracing 页的交互式 trace 图是 Flux 组件库当前无法组合覆盖的唯一界面能力。核心交互需求：

| 需求         | 说明                                                                                  |
| ------------ | ------------------------------------------------------------------------------------- |
| 节点与边     | 观察点节点（observation）与执行流边（parent-child/时间序）构成 DAG                    |
| 双布局模式   | Execution Flow Graph（强调执行路径）↔ Hierarchy Graph（强调层级，默认）               |
| 视口交互     | 缩放 + / -、复位视图、全屏、拖拽平移、滚轮缩放                                        |
| 节点搜索     | 关键字匹配（name/type/level），Enter 下一个匹配、Shift+Enter 上一个                   |
| 节点选择     | 点击定位观察点；一节点映射多观察点时点击循环切换                                      |
| 级别高亮     | ERROR / POLICY_VIOLATION 节点红色高亮，快速识别风险                                   |
| 联动分析面板 | 选中 ERROR/WARNING/POLICY_VIOLATION 节点 → 底部右侧面板显示分析（输出/根因/修复建议） |

## 3. 候选方案评估

### 3.1 @xyflow/react（React Flow）— 推荐

- **仓库内已有先例**：`flow-designer-renderers` 依赖 `@xyflow/react ^12.10.2`（`packages/flow-designer-renderers/package.json:36`），画布适配层模式已验证（`canvas-adapters.md`、`canvas-bridge.tsx`）。
- 声明式 React 组件模型与 Flux renderer 契约对齐：节点模板可编译为 region 渲染。
- 内置视口交互（zoom/pan/fitView）、视口内节点裁剪渲染（大图性能）、事件系统（onNodeClick/onSelectionChange）。
- 布局需自配（dagre / elkjs），React Flow 本身不内置布局算法。
- **风险**：依赖体积中等；但复用仓库内既有版本，无新增依赖负担。

### 3.2 Cytoscape.js

- 布局算法丰富（dagre/elk 风格内置），适合图分析场景。
- 命令式 API（`cy.add(...)` / `cy.layout(...)`），与 Flux「schema → 编译 → React 声明式渲染」模型摩擦大；节点模板需自建 React 桥接（ports 到 DOM），复杂度高于 React Flow 的声明式 nodeTypes。

### 3.3 AntV G6

- 功能最全（布局/交互/分析/动画），但包体积显著大于 React Flow，且 API 体系（Graph 实例 + 命令式配置）与 Flux 运行时解耦成本高。

### 3.4 结论

**选型裁定：`@xyflow/react`**（复用 flow-designer 同版本、同画布适配模式），布局算法 **dagre** 起步（轻量、与 React Flow 生态组合常见），elkjs 作为 P2 候选（更高质量分层布局）。Cytoscape/G6 仅在出现「图分析算法」强需求时再评估。

---

## 4. 与 flow-designer 的边界（关键裁定）

`flow-designer` 是**设计期**画布：编辑语义（增删改节点/边、undo/redo、palette、inspector、host projection 双向写）。`graph` 是**运行期只读**图查看器：

| 维度     | flow-designer              | graph（新）                             |
| -------- | -------------------------- | --------------------------------------- |
| 语义     | 编辑（authoring）          | 展示 + 导航（viewing）                  |
| 数据流   | document 双向（host 投影） | 单向（nodes/edges 经 data-source 注入） |
| 节点渲染 | designer-node-card（摘要） | node region（schema 模板）              |
| 交互     | 选择/拖拽/连接/重排        | 选择/搜索/缩放/平移/模式切换            |
| 布局     | 作者自排 + tree 投影       | 运行时自动布局（flow/hierarchy）        |

**裁定**：不复用 flow-designer 的 editing 语义；仅复用其 `@xyflow/react` 版本与 canvas 桥接模式。两者并存不冲突（查看器可嵌入设计器预览场景）。

---

## 5. 需求映射与组件范围

| ArbiterOS trace 图需求 | graph 组件范围                                              | 备注                                                                 |
| ---------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 节点/边渲染            | `nodes` + `edges` SchemaValue                               | 数据经 data-source 注入（挂载零请求字段，遵循 roadmap 请求下沉规则） |
| 双布局模式             | `layout: 'flow' \| 'hierarchy'`                             | 运行时切换经 component handle `setLayout`                            |
| 视口交互               | `zoomable`/`pannable`/`fitView` + `showControls` 内置控制条 | React Flow 原生能力                                                  |
| 节点搜索               | `searchable: true` + 本地子串匹配                           | 交互模式参照 tree 搜索（E3）                                         |
| 级别高亮               | `levelField` + `levelMap` 值→语义级                         | 语义词汇复用 variant-vocabulary（danger/warning/...）                |
| 多观察点循环           | **不在组件内**                                              | 宿主经 onNodeClick 事件 + scope 组合（见 design.md §8）              |
| 分析面板联动           | `onSelectionChange`/`onNodeClick` 事件                      | 宿主经 action → setValue → 下方 panel 渲染                           |

---

## 6. 参考实现锚点

- `packages/flow-designer-renderers/src/designer-xyflow-canvas/` — React Flow 画布桥接先例
- `docs/architecture/flow-designer/canvas-adapters.md` — 画布适配层契约
- `docs/components/tree/design.md` §2.1 — tree 搜索 open-state 受控覆盖裁定（graph 搜索可参照）
- `docs/components/status/design.md` — levelMap 值→语义级映射先例
