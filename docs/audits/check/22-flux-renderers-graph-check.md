# 22 flux-renderers-graph 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flux-renderers-graph/src/` 排除 `*.test.*` 后共 11 个文件约 1356 行（graph-renderer.tsx 649 / graph-definitions.ts 180 / xyflow-canvas.tsx 131 / graph-layout.ts 133 / graph-search.ts 62 / graph-store.ts 71 / graph-node.tsx 41 / schemas.ts 63 / index.ts 17 / test-support.ts 50 / styles.css 59）。**精读覆盖率 100%**（按文件）。技术栈核实：包装 **`@xyflow/react` 12.10.2（React Flow）+ `dagre` 0.8.5**，非 g6/cytoscape；dagre 仅用于 hierarchy 布局投影，主线程同步执行。除源码外核对了：`docs/references/quick-reference.md`、`docs/components/graph/design.md`（含 §2 决策表 / §6 畸形数据硬契约 / §8.2 句柄失败路径表）、`flux-react/src/render-nodes.tsx` 的 `resolveRendererSlotContent`（value-or-region 标准消费 helper）、`flux-compiler/src/schema-compiler/node-compiler.ts:186`（value-or-region 仅 SchemaInput 入 region）、`flux-i18n` zh-CN/en-US locale（`flux.graph.*` 六个 key 双语齐全）、`packages/theme-tokens/src/styles.css`（`--shadow-sm`/`--shadow-primary-sm` 均有定义）、`flux-core/src/types/schema.ts`（BaseSchema 含 name/label）、**`node_modules/.pnpm/@xyflow+system@0.0.76` 实际实现**（`createFilter`/`update()` 中 panOnScroll 对 wheel.zoom handler 的替换逻辑）——F-01 的关键证据来自库源码核实。
- 结论概览：**P0 x1 / P1 x2 / P2 x5 / P3 x8**。总体评价：该包分层干净（纯 helper graph-layout/graph-search、vanilla store、xyflow 只读适配层、根 renderer 编排），渲染器契约面大体合规——props.props/meta/regions/events/helpers 读取、事件镜像 ref + stable useCallback 防 xyflow 更新风暴、受控视口等值守卫、i18n key 双语齐全、无 store 直连、无 BEM、Button/Input 用 ui 组件、grep 面（addEventListener/destroy/as any/空 catch/硬编码中文 UI 串/requestAnimationFrame）全部干净。**问题集中在四处**：(1) `panOnScroll` 绑定 `pannable` 导致默认配置下滚轮只能平移、`zoomOnScroll` 成为死配置，直接违反 design §2「滚轮缩放」承诺（P0 F-01）；(2) 畸形数据 sanitize 只保护布局/边路径，渲染路径把未消毒的 rawNodes 直送 xyflow，缺 id / 重复 id 节点绕过 design §6 硬契约（P1 F-02）；(3) 默认 `layout:'flow'` 无布局算法且无坐标输入通道，节点按索引斜排、相邻节点框重叠（P1 F-03）；(4) fitView 重跑探测基于数量签名、focusNode 失败路径码缺失、empty 纯值分支未消费等契约漂移（P2 族）。

## P0 缺陷

### F-01 `panOnScroll={pannable}` 使 wheel.zoom handler 被 pan-on-scroll handler 整体替换：默认配置下滚轮不缩放只平移，`zoomOnScroll` 成为死配置，违反 design §2「滚轮缩放」承诺

- 位置：`packages/flux-renderers-graph/src/xyflow-canvas.tsx:114-116`；默认值来自 `graph-renderer.tsx:98-99`（`zoomable !== false`、`pannable !== false`）
- 关键源码摘录（xyflow-canvas.tsx:114-118）：
  ```tsx
  panOnDrag = { pannable };
  panOnScroll = { pannable };
  zoomOnScroll = { zoomable };
  zoomOnPinch = { zoomable };
  zoomOnDoubleClick = { zoomable };
  ```
- 推理链（输入 → 路径 → 错误结果）：
  1. 输入：schema 不写 `pannable`/`zoomable`（两者默认 true，graph-renderer.tsx:98-99），用户在画布上滚动鼠标滚轮。
  2. 路径：`panOnScroll=true` 传入 React Flow → `@xyflow/system` `XYPanZoom.update()`（node_modules/.pnpm/@xyflow+system@0.0.76/dist/esm/index.js:2913-2929）：`const isPanOnScroll = panOnScroll && !zoomActivationKeyPressed && ...; const wheelHandler = isPanOnScroll ? createPanOnScrollHandler(...) : createZoomOnScrollHandler(...)` —— **panOnScroll 为 true 时 wheel handler 被 pan 处理器整体替换**，`zoomOnScroll` 只参与 `createFilter` 的放行判断，不再决定滚轮行为。滚轮事件走 `createPanOnScrollHandler`（默认 `panOnScrollMode: 'free'`，deltaX+deltaY 双向平移）；仅 ctrl+wheel 走 `pinchZoom` 分支才缩放。
  3. 错误结果：默认配置下滚轮 = 平移而非缩放，`zoomable` prop 对滚轮完全失效；design.md §2 决策表明写「视口交互（zoom+/zoom-/fitView/拖拽平移/**滚轮缩放**）→ 实现」，契约落空。`xyflow-canvas.test.tsx` 的 mock 只断言 `zoomOnScroll` prop 透传（第 18/102 行），未覆盖 `panOnScroll`，测试无法拦截。
- 影响：图查看器第一交互（滚轮缩放）在默认 schema 下不可用；作者关 `pannable:false` 才能恢复滚轮缩放，但同时又失去拖拽平移——两个开关语义被库内优先级静默劫持。
- 修复方向：去掉 `panOnScroll` 绑定（拖拽平移已由 `panOnDrag={pannable}` 覆盖，滚轮语义归还 `zoomOnScroll`）；若确需滚轮平移模式，增设独立 schema 开关（如 `wheelPan`，默认 false）并在 design 文档登记裁定。补一条真实 ReactFlow 实例（非 mock）的 wheel 行为测试。

## P1 隐患

### F-02 畸形节点 sanitize 只作用于布局/边路径，渲染路径把 rawNodes 直送 xyflow：缺 id 节点以 `id: undefined` 下发（React key undefined/重复），重复 id 节点产生 key 冲突与 nodeLookup 覆盖，绕过 design §6 硬契约

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:49-54`（normalizeNodes 仅过滤非对象）、`484-505`（canvasNodes 直接 map rawNodes）；对照 `graph-layout.ts:32-61`（sanitizeGraphData 过滤缺 id 节点，但其 `sanitized.nodes` 只用于 dagre，不用于渲染）
- 关键源码摘录（graph-renderer.tsx:484-491）：
  ```ts
  return rawNodes.map((node, index) => {
    const position =
      projection.positions.get(node.id) ?? { ... };
    return {
      id: node.id,            // 未消毒：可能 undefined 或重复
      type: 'graphNode' as const,
  ```
- 推理链（输入 → 路径 → 错误结果）：
  1. 输入：`nodes: [{ label: 'x' }, { label: 'y' }]`（缺 id）或 `nodes: [{ id: 'a', label: '1' }, { id: 'a', label: '2' }]`（重复 id）。`normalizeNodes` 只做 `typeof entry === 'object'` 过滤，两者全部通过。
  2. 路径：`computeGraphLayout → sanitizeGraphData` 会把缺 id 节点从 sanitized.nodes 剔除（graph-layout.test.ts:90-98 有单测），但 `canvasNodes` 用的是 **rawNodes** 而非 sanitized.nodes；缺 id 节点得到 `id: undefined`，其出入边被 sanitize 跳过（引用不存在节点）。`nodeByIdRef`（graph-renderer.tsx:145）以 `node.id`（undefined/重复值）为键建 Map，后写覆盖先写；`searchGraphNodes` 也会把 undefined/重复 id 推入 matchNodeIds。
  3. 错误结果：缺 id 场景——多个节点共享 React key `undefined`（React duplicate key 告警、xyflow nodeLookup 键冲突导致实际只渲染一个），点击/搜索/定位在 `nodeByIdRef` 中命中的永远是"最后一个"；重复 id 场景——xyflow 受控 nodes 数组含两个同 id 项，nodeLookup 相互覆盖、React key 重复，选中态 `selectedNodeId === node.id` 同时点亮两个节点。design §6「节点缺 id → 过滤并计入 skippedEdges 场景」的硬契约在渲染路径未执行。
- 影响：常见脏数据（API 返回缺 id/重复 id）导致静默丢节点、key 冲突告警、选中/搜索/定位错乱；「渲染永不抛错」成立但契约语义被绕过，且 layout 层已有正确实现却未被渲染路径复用，形成"半截 sanitize"。
- 修复方向：渲染路径改用 `projection` 暴露的 sanitized.nodes（让 `computeGraphLayout` 同时返回 `layoutedNodes`），或 normalizeNodes 直接按 sanitize 规则过滤缺 id/去重重复 id 并计入 skippedEdges 告警；补 renderer 级测试（当前只有 layout 纯函数测试覆盖该契约）。

### F-03 默认 `layout:'flow'` 无布局算法：节点全部落入索引斜排 fallback，步长小于节点最小尺寸导致相邻节点框重叠，且 GraphNode 无 x/y 坐标通道，「位置由调用方给定」的前提无实现支撑

- 位置：`packages/flux-renderers-graph/src/graph-layout.ts:128-132`（flow 分支返回空 positions）、`graph-renderer.tsx:26-27, 485-489`（fallback 步长 40/32）、`schemas.ts:13-20`（GraphNode 无 x/y 字段）；design §2「双布局模式（flow 自由 DAG / hierarchy 层级）」、§4.2 默认 `'flow'`
- 关键源码摘录（graph-layout.ts:128-132 + graph-renderer.tsx:486-489）：
  ```ts
  return {
    positions: new Map<string, GraphPosition>(),   // flow：恒空
    layoutedEdges: sanitized.edges,
    ...
  };
  // graph-renderer.tsx fallback：
  const position = projection.positions.get(node.id)
    ?? { x: 24 + index * FLOW_NODE_SPREAD_X,       // 40
         y: 24 + index * FLOW_NODE_SPREAD_Y };     // 32
  ```
- 推理链（输入 → 路径 → 错误结果）：
  1. 输入：schema 不写 `layout`（默认 `'flow'`，graph-definitions.ts:74），`nodes` ≥ 2 个、`edges` 任意。
  2. 路径：flow 分支 positions 恒为空 Map → 每个节点都走 fallback 斜排坐标 `(24+40i, 24+32i)`。graph-layout.ts:111 注释宣称「flow 模式直通 xyflow 内置布局（**位置由调用方给定**）」，但 `GraphNode` 接口无 x/y 字段、renderer 也从不读取节点自带坐标——**调用方没有任何途径给定位置**。节点实际渲染尺寸：`.nop-graph-node` min-width 120px（styles.css:19）、高约 36px+（padding 8×2 + 13px 文本）。
  3. 错误结果：x 步长 40 < 最小宽 120（水平重叠 ≥80px）、y 步长 32 < 节点高（垂直重叠），相邻节点框大面积互相遮挡，形成"层叠卡片"而非图；且坐标与 edges 拓扑完全无关，任何 DAG 语义都不可读。50 节点即铺开 2000×1600px。
- 影响：组件**默认模式**即产出不可用的布局（example.json 因显式写 `layout:'hierarchy'` 才正常）；schema 无逃生通道（无 x/y、无 layout 参数），宿主只能全程用 hierarchy。
- 修复方向：flow 模式接入最小拓扑布局（如复用 dagre 去掉 rankdir 约束、或按执行序横向排布且步长 ≥ 节点宽+间距），或给 GraphNode 增加 `x`/`y` 可选字段并在 canvasNodes 优先读取；fallback 步长至少应 ≥ LAYOUT_NODE_DEFAULT_WIDTH + SEPARATION。

## P2 风险

### F-04 fitView 重跑探测键 `${nodes.length}:${edges.length}` 只看数量，依赖数组漏 `orientation`：同数量换数据或 LR↔TB 切换后不重新自适应，图可能整体跑出视口

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:350-360`
- 关键源码摘录：
  ```ts
  const dataRevision = `${rawNodes.length}:${rawEdges.length}`;
  useEffect(() => {
    if (!fitView) return;
    const instance = instanceRef.current;
    if (!instance) return;
    instance.fitView({ padding: FIT_VIEW_PADDING });
  }, [dataRevision, layoutMode, fitView]);
  ```
- 问题：探测签名只含数量——数据源刷新后节点集合整体替换但数量恰好相同（轮询刷新、同规模重查）时 `dataRevision` 不变、不 refit，旧视口对着新图可能完全偏移；`orientation` prop 变化会让 dagre 投影整体翻转（LR→TB 坐标轴互换，projection memo 已重算），但它不在依赖数组里，fitView 不重跑。design §4.2 明写 `fitView` 默认 true 的语义是「**初始/数据变化后**自适应视口」。
- 影响（特定条件 + 后果）：`fitView:true` + 数量不变的刷新或运行时切 `orientation` → 用户面对空白/偏移画布，需手动点 fit 按钮自救。
- 修复方向：探测键改用 projection 引用（memo 已保证内容变化才换引用）或 dataRevision 拼入 orientation；effect 依赖补 `orientation`。

### F-05 `focusNode` 失败路径偏离 design §8.2 契约：文档承诺 `node-not-found` 错误码，实现返回 `{ok:true, located:false}`；`fitView` 句柄在实例未挂载时也静默 `ok:true`

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:400-424`
- 关键源码摘录（graph-renderer.tsx:421-424）：
  ```ts
  case 'focusNode': {
    const nodeId = typeof payload?.nodeId === 'string' ? payload.nodeId : '';
    const located = nodeId.length > 0 && focusNodeByIdEvent(nodeId);
    return { ok: true, data: { located } };
  }
  ```
- 问题：design.md §8.2 失败路径表明确「`component:focusNode` | `nodeId` 不存在 → **`node-not-found` 错误**：定位回退 fitView 全图，不抛异常」，且 `docs/references/component-handle-vocabulary.md` 的全仓约定是失败路径返回 `{ok:false, code:'...'}`（如 `x1-focus-not-mounted` → `{ok:false, code:'not-mounted'}`）。实现返回 `{ok:true, data:{located:false}}`，宿主 action 无法按失败路径码分支，只能解包 data 自查。同类：`fitView` 分支 `instance?.fitView(...)` 在 instance 未就绪时直接 `{ok:true}`，成功与否不可分辨（测试第 299 行只断言 not throw）。
- 影响：句柄失败路径契约漂移；宿主写「定位失败则降级 UI」的逻辑无从判别。
- 修复方向：未命中时返回 `{ok:false, code:'node-not-found', data:{located:false}}`（或按 vocab 统一格式），fitView 无实例时返回 not-mounted 类 code；同步更新 design §8.2 与测试断言（当前测试第 203 行反向锁定了偏离行为）。

### F-06 `empty` value-or-region 只消费 region 分支：plain value（`empty: "自定义文案"`）被静默忽略，永远回退 `t('flux.common.noData')`

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:519-522`；对照 `flux-react/src/render-nodes.tsx:206-226` 的标准 helper
- 关键源码摘录：
  ```ts
  const emptyContent = props.regions.empty
    ? asReactNode(props.regions.empty.render())
    : t('flux.common.noData');
  ```
- 问题：字段规则是 `{ key: 'empty', kind: 'value-or-region' }`（graph-definitions.ts:174），编译器语义（node-compiler.ts:186）是 **SchemaInput 才提取为 region，纯值留在 resolved props**。renderer 只读 `props.regions.empty`，`empty: "暂无图谱"` 这类字符串走到 `resolved.empty` 后被丢弃。同仓库 chart 渲染器用标准 helper `resolveRendererSlotContent`（region → prop → meta → fallback）覆盖全部分支，graph 未复用。
- 影响：schema 作者写纯值空态不生效且无告警，属契约面静默缩窄；与 chart 行为不一致。
- 修复方向：改用 `resolveRendererSlotContent(props, 'empty', { fallback: t('flux.common.noData') })`，或在现有三元的 region 分支后补 `typeof resolved.empty === 'string'` 分支。

### F-07 `zoomOnDoubleClick={zoomable}` 与 `onNodeDoubleClick` 业务事件叠加：双击节点同时触发画布缩放动画与事件派发，宿主无法只收事件不缩放（suspect）

- 位置：`packages/flux-renderers-graph/src/xyflow-canvas.tsx:78-83, 118`；`graph-renderer.tsx:297-302`
- 关键源码摘录（xyflow-canvas.tsx:118 + 121-122）：
  ```tsx
  zoomOnDoubleClick={zoomable}
  ...
  onNodeClick={handleNodeClick}
  onNodeDoubleClick={handleNodeDoubleClick}
  ```
- 问题：`@xyflow/system` 的 dblclick.zoom 绑定在 viewport 根节点上（`d3Selection.on('dblclick.zoom')`），节点上的双击事件冒泡到 viewport 同样触发 d3 缩放。默认 `zoomable:true` 时双击任意节点 = 视口缩放动画 + `graph:node-double-click` 事件同时发生。design §8.1 将 `onNodeDoubleClick` 定位为「双击定位/展开详情」——业务动作伴随画布突然变焦，体验冲突；宿主想禁掉缩放只能关 `zoomable`，但那会连滚轮/pinch 缩放一起牺牲（在 F-01 修复后影响更大）。标 suspect：具体观感需 e2e 实感确认。
- 影响：双击详情类场景伴随非预期视口跳动。
- 修复方向：`zoomOnDoubleClick` 固定为 false（查看器场景双击语义让位给事件），或绑定独立 schema 开关并在 design 登记。

### F-08 选中/搜索态更新全量重建 canvasNodes 的 data 对象 + 视口每帧写回驱动整组件重渲染：千级节点图交互期 O(N) 节点重渲染（suspect，中小图无感）

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:128`（useStore 订阅 viewport）、`286-314`（无依赖 mirror effect）、`479-505`（canvasNodes memo 依赖 selectedNodeId/matchNodeIds）
- 关键源码摘录（graph-renderer.tsx:498-501）：
  ```ts
  return {
    ...
    data: {
      node, nodeId: node.id, index,
      selected: selectedNodeId === node.id,   // 任一节点选中 → 全部节点 data 换新引用
      ...
  ```
- 问题：单选一个节点 → `selectedNodeId` 变化 → canvasNodes memo 全量重建 → 所有节点的 `data` 都是新对象 → `memo(GraphNodeView)` 全部失效，N 个节点组件重渲染（实际只有 1 个 selected 变化）；搜索高亮 `matchNodeIds` 同理。叠加：`useStore(viewport)` 使每次滚轮/拖拽帧都重渲染 GraphRenderer（含无依赖 mirror effect 重赋值、搜索框/控制条 reconcile）。已有 `onlyRenderVisibleElements` 与 XyflowCanvas memo 缓解，且值相等守卫防了更新风暴——是开销放大而非死循环。
- 影响：百级节点内无感；千级节点（design §12 已把 >5k 列为后续）交互期可能掉帧。
- 修复方向：node data 按节点 diff（xyflow v12 受控 nodes 支持仅变更目标节点的 data 引用），或把 selected/matching 移到 node data 之外的 store selector 内消费；viewport 订阅下沉到只订阅视口的子组件。

## P3 提示

### F-09 `locateNode` 硬编码节点尺寸 `{width:180, height:56}`，与 `graph-layout.ts:21-22` 的 `LAYOUT_NODE_DEFAULT_WIDTH/HEIGHT` 重复定义

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:196`
- 摘录：`const size = { width: 180, height: 56 };`
- 问题：两处常量语义相同（dagre 布局尺寸 vs 定位居中补偿），一处调整另一处必漂移，定位中心会系统性偏移。修复：import 布局常量。

### F-10 节点 Handle 固定 Left/Right：`orientation:'TB'` 层级布局下边锚点与流向不匹配（视觉）

- 位置：`packages/flux-renderers-graph/src/graph-node.tsx:36-38`
- 摘录：`<Handle type="target" position={Position.Left} ... />` / `<Handle type="source" position={Position.Right} ... />`
- 问题：TB 模式节点按 y 轴分层，但边仍从右锚点出、左锚点入，连线呈"侧挂"形态。修复方向：经 node data 下发 orientation，TB 时改用 Top/Bottom。

### F-11 `levelMap` 无类型校验，非 object 值经 spread 按字符索引展开污染映射表；`minZoom >= maxZoom` 无校验

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:93-96, 103-104`
- 摘录：`() => ({ ...DEFAULT_LEVEL_MAP, ...(resolved.levelMap ?? {}) })`
- 问题：`resolved.levelMap` 为字符串（如表达式误绑）时 `{...('abc')}` 展开为 `{0:'a',1:'b',2:'c'}`，映射表被垃圾键污染（labelField 等兄弟字段都做了 typeof 校验，唯独 levelMap 漏了）；`minZoom:2, maxZoom:0.5` 时 d3 `scaleExtent` 反转行为未定义。低风险健壮性缺口。

### F-12 `label` schema 字段未入 fields 编译规则且 renderer 从不消费：design §4.2 声明的「渲染器级 aria-label」落空，根节点无 role/aria-label

- 位置：`packages/flux-renderers-graph/src/graph-definitions.ts:156-178`（fields 数组无 label 条目）、`graph-renderer.tsx:540-549`（根 div 无 aria 属性）
- 问题：design §4.2 写明 `label?: string; // 渲染器级 aria-label / 调试标识，缺省 'graph'`，实现既不编译也不读取，图容器对屏幕阅读器是无名区域（对照 chart-renderer.tsx:238 的 `aria-labelledby` 做法）。修复：fields 补 `{key:'label', kind:'prop'}`，根节点挂 `role="application"` + `aria-label`。

### F-13 控制条布局切换按钮直接显示内部枚举原文 `flow`/`hierarchy`，清空搜索按钮用文本 `×` 而非 ui 图标

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:596, 643`
- 摘录：`{layoutMode}`（按钮可见文本）；`<Button ...>×</Button>`
- 问题：i18n key `flux.graph.toggleLayout` 只用于 aria-label，可见文本是未翻译的原始枚举值；`×` 用字符当图标（aria-label 已具备，仅一致性/渲染基线问题，lucide 有 `X`/`LayoutGrid` 可用）。D7/D2 风格提示。

### F-14 edges-only 数据不进 empty 分支：nodes 为空、edges 非空时渲染一张空白画布而非空态

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:157`
- 摘录：`const empty = rawNodes.length === 0 && rawEdges.length === 0;`
- 问题：该输入域下所有边被 sanitize 判为 dangling 跳过，实际可渲染内容为空，但 `empty` 判定要求两者都为空 → 用户看到纯背景网格画布。design §6 只定义了「nodes 非空 edges 空」「两者都空」两档，未覆盖此档；按「有效渲染元素为 0 应进空态」的精神，现行为不优。

### F-15 xyflow selection 桥接为死路径：`elementsSelectable:false` 下 onSelectionChange 永远收到空集（无害冗余，suspect）

- 位置：`packages/flux-renderers-graph/src/xyflow-canvas.tsx:84-90, 109`；`graph-renderer.tsx:303`
- 问题：canvas 显式 `elementsSelectable={false}`（禁用 xyflow 选中状态机，注释说明了防互打的理由），xyflow 内部 selection 恒为空 → `handleSelectionChange` 只会以 `null` 调 mirror（`syncSelection(null)` 在无选中时等值短路）。真实选中同步全部走 onNodeClick/onPaneClick。测试第 190 行直接调 mock 的 onSelectionChange 才覆盖到该分支——死代码但保持了对 xyflow 行为变化的防御性，可留观。

### F-16 `initialViewportRef` 在首个 onMove 帧捕获，「初始视口」可能不是用户交互前状态（应挂 onMoveStart）

- 位置：`packages/flux-renderers-graph/src/graph-renderer.tsx:270-273`；`xyflow-canvas.tsx:101-102`（onMove 与 onMoveEnd 都接 handleMove，未接 onMoveStart）
- 摘录：`if (!initialViewportRef.current) { initialViewportRef.current = next; }`
- 问题：首个 onMove 回调携带的已是变换中/后的视口（fitView 动画首帧或拖拽第一个中间值），`resetView` 复位目标存在少量偏移；语义上「初始视口」应在交互开始前捕获。影响仅数像素级偏差，P3。

## 检查过程记录

1. **结构与技术栈核实**：`ls + wc` 确认 11 个非测试文件约 1356 行；`package.json` 确认依赖 `@xyflow/react ^12.10.2 + dagre ^0.8.5`（非 g6/cytoscape/SVG 自绘），dagre 为同步主线程布局（无 worker，design §9 已裁定本地执行，未单列为缺陷）。
2. **全文件精读**：10 个 ts/tsx + styles.css 逐行读完；4 个测试文件（graph-renderer.test.tsx 406 / xyflow-canvas.test.tsx 126 / graph-layout.test.ts 127 / graph-search.test.ts 54）通读以划定已断言行为、防止误报（F-05 的偏离行为被测试第 203 行锁定为现状）。
3. **契约面核对**：quick-reference.md 的 RendererComponentProps/hooks 消费模式逐项对照——props.props/meta/regions/events/helpers 读取合规、无 store 直连（包内 vanilla store 属 design §7 local state 裁定）、无 BEM（data-slot + data-level/data-selected/data-matching）、ui 组件（Button/Input）使用合规、事件 payload type 命名空间值（17-2）与 eventContracts 一致、node region bindings `{node, nodeId, index}` 与 `RenderRegionHandle.render({bindings})` 签名（flux-core render-fragment-types.ts:24-28）吻合。
4. **xyflow 库行为实证**（F-01/F-07/F-15 关键）：读 `node_modules/.pnpm/@xyflow+system@0.0.76/dist/esm/index.js` 的 `createFilter`（2819 行起）与 `XYPanZoom.update`（2909 行起），确认 `isPanOnScroll` 为 true 时 wheel handler 被 `createPanOnScrollHandler` 整体替换、`zoomOnScroll` 退化为放行判断；dblclick.zoom 绑定在 viewport 根、节点事件冒泡触发。
5. **编译语义核对**（F-06）：`flux-compiler/src/schema-compiler/node-compiler.ts:186` 确认 value-or-region 仅 SchemaInput 提取 region、纯值留 props；`flux-react/src/render-nodes.tsx:206-231` 确认标准消费 helper 覆盖 region→prop→meta→fallback；chart-renderer.tsx:100-115 为正确用法参照。
6. **i18n / 主题核对**（D7 反误报）：`flux-i18n` zh-CN/en-US 的 `graph.*` 六 key 与 `flux.common.noData` 双语齐全；`theme-tokens/src/styles.css` 确认 `--shadow-sm`/`--shadow-primary-sm` 已定义，styles.css 引用有效。
7. **生命周期/泄漏检查**（D3）：无自有 addEventListener/interval/rAF（xyflow 内部自理）；`componentRegistry.register` 返回值正确用作 effect cleanup；store 无需 dispose；回调稳定性（mirror ref + stable useCallback）与受控视口等值守卫均有意识处理——无泄漏类缺陷。
8. **grep 扫描**：`addEventListener|removeEventListener|destroy|dispose|requestAnimationFrame|setInterval|setTimeout`、`as any`、空 catch、UI 字符串硬编码中文——源码（除注释）全部零命中；中文仅存在于注释（合规）。
9. **构建边界**（D8 反误报）：`tsconfig.build.json` exclude 已正确剔除 `*.test.*` 与 `test-support*`，测试基建不会进 dist。
10. **severity 校准**：F-01 定 P0（默认配置必现 + 库源码实证 + design 契约明文）；F-02/F-03 定 P1（完整推理链但分别限于脏数据输入/默认布局可用性，非崩溃）；F-04~F-08 定 P2（特定条件触发或有 suspect 标注）；文档注释与实现矛盾但无行为后果者归 P3。
