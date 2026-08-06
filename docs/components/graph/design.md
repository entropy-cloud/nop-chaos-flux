# Graph 组件设计

> 状态：implemented（renderer 已落地于 `@nop-chaos/flux-renderers-graph`，2026-08-05；plan `docs/plans/2026-08-04-2030-1-g1-graph-viewer-plan.md`）
> 来源调研：`docs/analysis/complex-controls/research-graph.md`（ArbiterOS trace 图需求 + React Flow 选型）
> 画布参考：`docs/architecture/flow-designer/canvas-adapters.md`（flow-designer 已落地 `@xyflow/react` 12.10.2 桥接模式）

## 1. 组件定位

- `graph` 是**只读交互式图查看器** renderer，把结构化的节点/边数据渲染为可缩放、可平移、可搜索、可选择的 DAG/网络图。
- 典型场景：AI agent trace 可视化（Langfuse trace graph 形态）、依赖关系图、流程链路巡检、拓扑/血缘展示。
- 它是**展示 + 导航**组件，不是图编辑器：无增删改节点/边语义（编辑语义归属 flow-designer，见 §2 决策表与 `research-graph.md` §4）。
- 数据经 `data-source` / scope 单向注入（`nodes`/`edges`），**不声明任何挂载时自动请求字段**（遵循 roadmap 请求下沉规则）。

## 2. 与 AMIS 或既有产品的能力对照

AMIS 无原生图查看器组件（echarts graph series 只覆盖少量图形态，无自由视口交互）。参考产品：Langfuse trace graph（ArbiterOS 治理 UI）、React Flow 生态。

### Flux 决策表

> Flux 决策主语。列：`能力 | 采纳 | 不采纳 | 理由`。

| 能力                                                               | 采纳                           | 不采纳     | 理由                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 节点/边渲染（DAG 展示）                                            | **实现**                       | —          | 核心定位。`nodes`/`edges` 两个 SchemaValue 注入，缺省空数组。                                                                                                                                |
| 节点模板 `node` region（绑定 `node`/`nodeId`/`index`）             | **实现**                       | —          | 节点内容自定义（如 trace 节点展示模型名 + level badge）。未提供 region 时回退 labelField 文本。                                                                                              |
| 视口交互（zoom+/zoom-/fitView/拖拽平移/滚轮缩放）                  | **实现**                       | —          | React Flow 原生能力；`zoomable`/`pannable` 开关 + `showControls` 内置控制条。                                                                                                                |
| 双布局模式（`flow` 自由 DAG / `hierarchy` 层级）                   | **实现**                       | —          | Langfuse 双模式（Execution Flow / Hierarchy）需求。`layout: 'flow' \| 'hierarchy'`；hierarchy 经 dagre 分层布局投影。运行时切换经 component handle `setLayout`（§8）。                       |
| 节点搜索（本地子串匹配 label/type/level + Enter/Shift+Enter 循环） | **实现**（`searchable: true`） | —          | 展示图导航头号需求（Langfuse 节点搜索）。本地子串匹配覆盖查看场景；远程搜索归 data-source（同 tree 裁定）。搜索期间节点高亮 + 循环跳转，不写本地展开态（图无展开态，直接 scrollTo + 选中）。 |
| 级别高亮（`levelField` + `levelMap` 值→语义级）                    | **实现**                       | —          | trace 风险快速识别（ERROR/POLICY_VIOLATION 红色）。默认映射表见 §4；语义词汇复用 `variant-vocabulary.md` 的 `info/success/warning/danger`。节点根 marker 发布 `data-level="<语义级>"`。      |
| 选中态发布（onNodeClick / onSelectionChange）                      | **实现**                       | —          | 联动分析面板等宿主组合职责（§8 示例）。多观察点循环切换是**宿主组合职责**（事件 + scope 管理索引），graph 只派发完整 node 数据，不内置业务索引语义。                                         |
| 空态（`empty` value-or-region）                                    | **实现**                       | —          | nodes/edges 均为空时渲染 empty slot（缺省 `t('flux.common.noData')`），显式空态永不抛错（同 chart DD1）。                                                                                    |
| 节点拖拽 / 边重连 / 编辑（增删改/undo/redo）                       | —                              | **不采纳** | 编辑语义归属 `flow-designer`（`research-graph.md` §4 边界裁定）。graph 只读，不引入编辑状态机与命令栈。                                                                                      |
| 边自定义渲染 `edge` region                                         | —                              | **不采纳** | 首版边仅 label 文本 + `animated` 样式；自定义边渲染（如弯曲箭头/条件标签）归后续评估，避免首版双重渲染通道。                                                                                 |
| 组件级 `api` / `initFetch` / 远程布局服务                          | —                              | **不采纳** | 请求下沉 `data-source` + action（roadmap 请求下沉规则；tree/chart 同裁定）。布局算法本地执行，不依赖远程服务。                                                                               |
| 大数据视口裁剪                                                     | **计划实现（需显式开启）**     | —          | `@xyflow/react` 的 `onlyRenderVisibleElements` 默认 `false`（视口外节点/边默认仍渲染），首版需显式开启；属元素级裁剪非完整虚拟化。超大数据（>5k 节点）再评估自定义虚拟化，非首版范围。       |
| amis 字符串脚本事件                                                | —                              | **不采纳** | Flux action schema 统一处理（`onXxx: ActionSchema`）。                                                                                                                                       |
| 力导向布局（`force`）                                              | P3 deferred                    | —          | trace/血缘场景 dagre 分层已覆盖；力导向（如社群发现）无明确需求，归后续。                                                                                                                    |
| 图分析算法（最短路径/社区检测）                                    | —                              | **不采纳** | 超出展示组件定位；出现分析需求时独立评估 Cytoscape/G6（`research-graph.md` §3.2/§3.3）。                                                                                                     |

### 2.1 关键裁定（实现依据）

1. **画布引擎**：`@xyflow/react`（复用 flow-designer 同版本 12.10.2，无新增依赖），桥接模式参照 `flow-designer-renderers/src/designer-xyflow-canvas/`。graph 只读：不注册编辑类交互（connect/drag/delete），禁用节点拖拽与连接手柄。
2. **hierarchy 布局**：dagre 起步（轻量、与 React Flow 组合常见），按 `orientation`（`LR`/`TB`，默认 `LR`）分层；数据变化时增量重布局（依赖变化才重跑，避免每渲染都布局）。elkjs 作为 P2 候选（更高质量布局），不改变 schema。
3. **搜索 open-state/焦点模型**：graph 无展开态，搜索只需「匹配节点高亮 + 循环定位（fitView 到匹配节点 + 选中 + 节点闪烁 marker）」。循环索引是 renderer 内部 local 状态（`data-state="searching"` 发布），不清零不写 scope（同 tree E3 的「搜索期间不写本地态」原则的镜像：graph 的本地态是搜索索引本身）。
4. **多观察点循环**：不内置。`onNodeClick` 事件每次派发 `{ nodeId, node }`（node 为完整节点数据，业务字段在 `data` 容器，见 §4.1）；宿主在事件 action 中管理循环索引（scope 存 `cycleIndex`），渲染器不感知。裁定理由：循环语义是业务领域（trace 特有）而非通用图能力。

## 3. Flux 中的 renderer/type 定义

- `type: 'graph'`
- `category: 'data'`
- source package: **`@nop-chaos/flux-renderers-graph`（已落地，2026-08-05）**
  - 理由：引入 `@xyflow/react` + `dagre` 两个重型依赖，放进被广泛引用的 `flux-renderers-data` 会污染通用包 bundle（chart 的 recharts 已在 data 包，不宜再叠加）；参照 `flow-designer-renderers` 独立包 + `flux-renderers-scheduling` 的包级依赖隔离先例。
- 主要 region: `node`
- 可选 region: `empty`

## 4. schema 设计

### 4.1 数据模型（运行期）

```ts
interface GraphNode {
  id: string;
  label?: string; // labelField 缺省读取字段
  type?: string; // 节点类型（搜索/分组用，trace: model_call / tool_call 等）
  level?: string; // levelField 缺省读取字段，值经 levelMap 映射为语义级
  data?: Record<string, unknown>; // 业务数据（node region 绑定 node.data.*）
  [key: string]: unknown;
}

interface GraphEdge {
  id?: string; // 缺省生成 `${source}->${target}#${index}`
  source: string;
  target: string;
  label?: string;
  type?: string;
  animated?: boolean; // 执行流边动画（trace 场景）
}
```

> 注：`level` 是**业务原始判别字段**（如 trace 的 `error`），不是语义级词汇本身；语义级词汇为 `info/success/warning/danger`（`variant-vocabulary.md` 的 StatusLevel），经 `levelMap` 映射（§4.2）。

### 4.2 GraphSchema

```ts
interface GraphSchema extends BaseSchema {
  type: 'graph';
  label?: string; // 渲染器级 aria-label / 调试标识，缺省 'graph'
  nodes: SchemaValue; // GraphNode[]，缺省 []
  edges: SchemaValue; // GraphEdge[]，缺省 []
  layout?: 'flow' | 'hierarchy'; // 默认 'flow'
  orientation?: 'LR' | 'TB'; // 默认 'LR'；仅 hierarchy 生效
  labelField?: string; // 默认 'label'
  typeField?: string; // 默认 'type'
  levelField?: string; // 默认 'level'
  levelMap?: Record<string, string>; // 节点 level 值 → 语义级（info/success/warning/danger）
  fitView?: boolean; // 默认 true：初始/数据变化后自适应视口
  zoomable?: boolean; // 默认 true
  pannable?: boolean; // 默认 true
  selectable?: boolean; // 默认 true；**单选模型**（禁用 React Flow 默认多选与 shift/ctrl 框选）
  searchable?: boolean; // 默认 false
  showControls?: boolean; // 默认 true：内置缩放控制条（zoom+ / zoom- / fitView / layout 切换）
  minZoom?: number; // 默认 0.2
  maxZoom?: number; // 默认 2
  node?: SchemaInput; // 节点模板 region
  empty?: SchemaInput; // 空态 value-or-region
}
```

**默认 levelMap**（作者可覆盖扩展）：

```ts
const defaultLevelMap = {
  error: 'danger',
  policy_violation: 'danger',
  warning: 'warning',
  success: 'success',
  info: 'info',
};
```

- 语义级 → 视觉：`danger` 红、`warning` 琥珀、`success` 绿、`info` 默认；节点 marker 发布 `data-level="<语义级>"`，样式类经 Tailwind 语义 token 映射（不硬编码色值，遵循 styling-system）。
- `levelMap` 未命中的值：不发布 `data-level`，走默认节点样式。

### 4.3 node region 绑定

node region 模板内可用绑定（参照 tree node region 模式）：

| 绑定     | 说明                                    |
| -------- | --------------------------------------- |
| `node`   | 当前节点完整数据（含 data.\* 业务字段） |
| `nodeId` | 节点 id                                 |
| `index`  | 节点在 nodes 数组中的索引               |

> 表达式书写注意：region 模板内绑定经 runtime 的 `$slot` slot-frame 机制注入（同 list `item` region），表达式中以 `$slot.<绑定名>` 引用，如 `"text": "${$slot.node.label}"`（与 `example.json` 一致）。

## 5. 字段分类

- `nodes`、`edges`、`layout`、`orientation`、`label`、`labelField`、`typeField`、`levelField`、`levelMap`、`fitView`、`zoomable`、`pannable`、`selectable`、`searchable`、`showControls`、`minZoom`、`maxZoom`: `value`
- `node`: `region`
- `empty`: `value-or-region`
- `onNodeClick`、`onNodeDoubleClick`、`onSelectionChange`: `event`

## 6. regions 与 slot 约定

- `node`: 节点内容模板。region 提供时优先于 labelField 回退路径；region 未声明时节点渲染 labelField 文本 + level 语义边/填充色。
- `empty`: 空态 slot。`nodes` 与 `edges` 均为空时渲染（缺省 `t('flux.common.noData')`）。
- 不提供 `edge` region（§2 不采纳行）。
- **畸形数据处理硬契约**（同 chart DD1 原则，渲染永不抛错）：边引用不存在的节点 → 跳过该边并 dev 模式告警；`nodes` 非空而 `edges` 为空 → 正常渲染孤立节点；`nodes`/`edges` 均为空 → empty slot（§10）。

## 7. 运行期状态归属

| State                      | Ownership | 说明                                                                                                                                                  |
| -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 视口（zoom/pan/center）    | local     | 内部 state（React Flow 受控 viewport），不写 scope；经 component handle 控制                                                                          |
| 布局模式（flow/hierarchy） | local     | 初始值来自 schema `layout`；运行时 schema prop 变化单向同步 store（22-06，值不等才写回）；命令式切换经 `component:setLayout` 句柄（§8.2），不外发事件 |
| 搜索词 + 匹配循环索引      | local     | 内部 state，不写 scope（搜索期间的高频更新不订阅风暴）                                                                                                |
| 选中节点                   | local     | 高亮渲染内部化；经 `onSelectionChange`/`onNodeClick` 事件发布，宿主用 action 自行落 scope                                                             |
| 空态/加载态                | local     | 派生自 nodes/edges 数据与 data-source 状态                                                                                                            |

**判定依据（INV-4）**：以上状态均为「渲染器内部交互状态」，无跨组件读取需求 → 保持 local，不升级 scope；跨组件命令式控制经 component handle（§8）；宿主同步经事件（§8）。

## 8. 事件、动作与组件句柄能力

### 8.1 事件（`onXxx: ActionSchema`）

| 事件                | payload                                                                          | 说明                                                       |
| ------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `onNodeClick`       | `{ nodeId, node }`（node 为完整节点数据）                                        | 单次点击派发；多观察点循环由宿主 action 管理索引（§2.1-4） |
| `onNodeDoubleClick` | `{ nodeId, node }`                                                               | 双击定位/展开详情                                          |
| `onSelectionChange` | `{ nodeId: string \| null, node: GraphNode \| null }`（取消选中时两者均为 null） | 选中变化发布，联动分析面板等宿主组合                       |

> 注：graph 为**单选模型**（见 §4.2 `selectable`）——禁用 React Flow 默认多选与 shift/ctrl 框选，`onSelectionChange`/`onNodeClick` 永远承载单节点。

### 8.2 组件句柄（`component:<method>`）

| Handle                | args                                | 说明                                          |
| --------------------- | ----------------------------------- | --------------------------------------------- |
| `component:zoomIn`    | —                                   | 缩放 +1 档                                    |
| `component:zoomOut`   | —                                   | 缩放 -1 档                                    |
| `component:fitView`   | `{ padding? }`                      | 自适应整个图                                  |
| `component:resetView` | —                                   | 复位到初始视口                                |
| `component:setLayout` | `{ layout: 'flow' \| 'hierarchy' }` | 运行时切换布局模式（外部工具栏联动）          |
| `component:focusNode` | `{ nodeId }`                        | 定位并选中节点（表格行点击 → 图定位联动场景） |
| `component:search`    | `{ keyword: string }`               | 激活搜索并定位（外部搜索框接入场景）          |

**句柄失败路径契约**（对齐 `component-handle-vocabulary.md`）：

| Handle                | 失败路径                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------ |
| 全部句柄              | 组件未挂载 → 调用方拿不到 ref（ref 为 null），宿主必须判空；句柄本身不抛错                             |
| 全部句柄              | 画布处于不可见状态（如被隐藏容器包裹）→ 视口操作仍按坐标执行，定位结果可能不可见（宿主负责可见性编排） |
| `component:focusNode` | `nodeId` 不存在 → `node-not-found` 错误：定位回退 fitView 全图，不抛异常                               |
| `component:setLayout` | 非法 `layout` 值 → 忽略并保持当前布局（`layout` 值校验失败走 schema 校验前置拦截）                     |
| `component:search`    | `keyword` 为空串 → 清空搜索态（等价于取消搜索）；`keyword` 无匹配 → 保持搜索激活，无节点高亮           |
| `component:search`    | 与 `searchable: false` 共存：句柄**始终可用**（`searchable` 仅控制内置搜索框显示，不影响外部句柄）     |

### 8.3 联动示例（分析面板）

```json
{
  "type": "graph",
  "id": "traceGraph",
  "nodes": "${trace.nodes}",
  "edges": "${trace.edges}",
  "searchable": true,
  "onSelectionChange": {
    "action": "setValue",
    "args": { "path": "selectedNode", "value": "${node}" }
  }
}
```

宿主在 `selectedNode` 下方渲染分析面板（dialog/detail-view + markdown），经 `onSelectionChange` 落 scope 后响应式更新。

## 9. 数据源、表达式、导入能力接入点

- 数据由 `data-source` / scope 提供 `nodes`/`edges`（`${trace.nodes}` 表达式或 source-enabled value）。**renderer 零请求字段**（roadmap 请求下沉规则）。
- 布局算法（dagre）与搜索匹配（子串）均为本地纯函数，不依赖网络。
- 表达式复用 `FormulaCompiler`；`levelMap` 值可为表达式（如 `${config.levelMap}`），支持运行时调整。

## 10. 样式与 DOM marker 约定

| 位置     | Marker / 约定                                                                                                 |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| 根节点   | `nop-graph`（Layout vs Widget：graph 是 Widget，自样式但主题 token 化）                                       |
| 视口容器 | `data-slot="graph-viewport"`                                                                                  |
| 节点容器 | `data-slot="graph-node"` + `data-level="<语义级>"` + `data-selected`（选中时）+ `data-matching`（搜索命中时） |
| 节点标签 | `data-slot="graph-node-label"`                                                                                |
| 边容器   | 首版不发布（默认 xyflow 边渲染，label + animated；自定义边渲染归 deferred，见 §2）                            |
| 控制条   | `data-slot="graph-controls"`                                                                                  |
| 搜索框   | `data-slot="graph-search-input"`；搜索激活态根节点 `data-state="searching"`                                   |
| 空态     | `data-slot="graph-empty"`                                                                                     |

- 语义色经 Tailwind token（`border-danger-*` 等），不硬编码色值。
- 状态用 `data-*` / `aria-*`（presence-only），禁止 BEM modifier。

## 11. 实现拆分建议

实现细节（renderer 骨架、region 编译、data-slot、测试布局）参照 `renderer-implementation-guidelines.md` 与 `flux-renderers-layout` 先例。

**实现裁定（2026-08-05，plan `2026-08-04-2030-1` Phase 2）：**

1. **共享 helper 边界**：graph 的 layout/search 纯 helper **首版保持在 graph 包内**（`graph-layout.ts`/`graph-search.ts`），不抽到 flux-core 共享层——当前仅 graph 一处消费；若未来 steps/timeline 复用图布局再提升（`components/timeline` 独立 plan，届时评估）。
2. **画布桥接**：**不直接复用** flow-designer 的 `canvas-bridge.tsx`（其含编辑态连接/拖拽/命令适配，graph 只读须裁剪），参照其桥接模式新写只读 `xyflow-canvas.tsx`（节点拖拽/连接手柄/多选/框选全部禁用，视口受控）。

```
packages/flux-renderers-graph/src/
├── index.ts                 # 入口 + registerGraphRenderers
├── graph-definitions.ts     # RendererDefinition（fields/propContracts/eventContracts）
├── schemas.ts               # GraphSchema / GraphNode / GraphEdge 类型
├── graph-renderer.tsx       # 根 renderer：视图层组装
├── graph-layout.ts          # 纯 helper：dagre 分层投影（nodes/edges → 坐标）
├── graph-search.ts          # 纯 helper：子串匹配 + 循环索引
├── graph-store.ts           # 包内 store：视口/布局模式/搜索/选中（Zustand vanilla）
├── xyflow-canvas.tsx        # @xyflow/react 画布适配层（参照 designer-xyflow-canvas）
└── graph-node.tsx           # 节点渲染：node region 编译 / label 回退 + level 语义类
```

- 纯 helper（layout/search）单测友好，不依赖 React。
- 画布适配层隔离 `@xyflow/react` 依赖，便于未来换引擎。
- store 参照 `flow-designer-core/src/core/` 的拆分模式（INV-4）。

## 12. 风险、取舍与后续阶段

| 项                                | 取舍与后续                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 依赖体积（xyflow + dagre）        | 独立包隔离，不污染 data 包；xyflow 复用仓库既有版本，dagre 轻量（~50KB）                                         |
| hierarchy 布局质量                | dagre 起步；elkjs（P2）提升跨层边质量，不改变 schema                                                             |
| 大数据量（>5k 节点）              | React Flow 视口裁剪兜底；虚拟化增强归后续                                                                        |
| 多观察点循环 / 业务索引语义       | 明确归宿主组合（§2.1-4），graph 不内置；如多产品复现再评估 `cycleIndex` 事件增强                                 |
| edge region / 力导向 / 图分析算法 | 均 deferred（§2 不采纳/后续行）                                                                                  |
| examples.manifest.json 标注       | 已翻转 `runtime`（2026-08-05，plan `2026-08-04-2030-1`）；roadmap G1 `planned→done` 由该 plan closure audit 翻转 |

## 13. 原则审计（日期：2026-08-04，审计人：nop-app-erp agent）

### INV-1 IO 边界

- 已列出 IO：无外部 IO。数据经 props/data-source 注入；布局/搜索本地计算；无 fetch/WS/持久化/路由。
- 归位情况：不适用（零 IO）。
- 例外项：无。

### INV-2 新 IO 类型

- 是否触发：否（本地纯展示组件，不扩 RendererEnv）。

### INV-3 复用边界

- 表单：不涉及（无表单语义）。
- 数据请求：不涉及（数据经 data-source）。
- 弹框：不涉及（分析面板由宿主 dialog 组合）。
- UI 元素：节点模板/控制条/空态用 `@nop-chaos/ui`（Badge/Button/Tooltip 等），禁止 raw HTML。
- 表达式：`FormulaCompiler`（`${trace.nodes}`、levelMap 表达式）。
- 画布：`@xyflow/react`（复用 flow-designer 同版本与桥接模式，非重造）。

### INV-4 内部 state 边界

- state 清单 + ownership 分类表：见 §7（全部 local，无 scope-owned）。
- projection 通道选择：事件（onSelectionChange/onNodeClick）发布选中；component handle（zoomIn/zoomOut/fitView/resetView/setLayout/focusNode/search）命令式控制。

### INV-5 契约边界

- contract drift 检查：`(props: RendererComponentProps<GraphSchema>) => RendererRenderOutput`；数据读 props.props/meta/regions/events；响应式读走 selector hooks；无平行组件协议；无 render 期 scope.get。

### Checklist A-G 勾选状态

- A IO 边界：✅ 全部通过（零 IO，见 INV-1）
- B 复用边界：✅ 全部通过（见 INV-3）
- C 内部 state 边界：✅（§7 + INV-4）
- D 契约边界：✅（INV-5）
- E 扩展点边界：✅ region（node/empty）+ event + component handle；无实现细节字段
- F 样式边界：✅（§10 marker/data-slot/data-level；Widget 自样式 token 化）
- G 包结构：✅ 已勾选（2026-08-05，plan `2026-08-04-2030-1`：package.json/tsconfig/alias/root ref/register 全部落地，playground 注册 + e2e 全绿）

### 例外与未决项

- 无未决项。`focusNode` 的「定位 + 选中 + 闪烁」动画细节留实现计划裁定（非契约）。
