# 30 flow-designer-renderers 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flow-designer-renderers/src/` 排除 `*.test.*` 与 `__tests__/` 后 59 个实现文件共 9632 行。**精读覆盖率约 90%**（5632 行画布/宿主/面板/命令链/dingflow 全量精读 + manifest 声明段扫读；4 个 test-support 文件共 463 行确认无生产引用后仅扫描；`designer-manifest.ts` 502 行读前 120 行 + 契约段定位核验，其余为纯声明数据）。先读 `docs/architecture/flow-designer/design.md`、`docs/architecture/flow-designer/canvas-adapters.md`、`package.json`；交叉验证 `packages/flow-designer-core/src/core-shell-commands.ts`、`core/history.ts`、`core/graph-command-gate.ts`、`core/constraints.ts`、`core-node-commands.ts`、`designer-core-types.ts`（跨包 F-01/F-03 暴露面核实）、`packages/flux-react/src/workbench/hooks.ts`（useHostScope 稳定性）、`packages/flux-runtime/src/node-runtime.ts`（props 投影）、`packages/ui/src/lib/icon-utils.ts`（resolveLucideIcon null 兜底）、`packages/flux-i18n/src/locales/en-US.ts`（i18n key 抽查）、`apps/playground/src/schemas/taskflow-workflow-schema.json`（graph 模式消费方存在性）。
- 结论概览：**P0 x2 / P1 x5 / P2 x9 / P3 x8**。总评：架构纪律整体执行良好——命令归一化（canvas 手势 → bridge 回调 → command adapter → core）、`DesignerContextValue` 稳定性设计（designerScope 经 useHostScope 稳定 ref，ctx 不随快照变化）、ELK/plus-button 的 instance-owner 隔离、事件监听与定时器清理、`as any`/`@ts-ignore`/空 catch 零命中，均与 design.md/canvas-adapters.md 对齐。但有两处主路径破坏：**graph 模式 `updateNodeData` 命令在 command adapter 三层 switch 中无任何处理分支，节点属性编辑全链路失败**（P0，本包独立缺陷），以及 **onMove 每帧无节流直通 `setViewport`，把 26 号报告 F-01 的"每帧 pushHistory + 全文档深拷贝"核心缺陷 100% 暴露**（P0 暴露面结论）。P1 集中在大图性能（节点/边组件未 memo + 每快照全量重建对象数组）、tree 模式调试 toast 遗留生产路径、跨包 F-03 消费侧（duplicate 命中坏实现且错误原因误报）、hover 即改选中等。任务背景中的"属性面板草稿串写"未成立（inspector 为受控直写无草稿态，选中切换闭包捕获 nodeId 无串写路径），但发现其引申问题：逐键 dispatch 污染 undo 历史 + 泛化字段类型污染（P2）。

## P0 缺陷

### F-01 graph 模式 `updateNodeData` 命令无处理分支：默认 inspector / designer-field / `designer:updateNodeData` action 的节点属性编辑全链路失败

- 位置：`packages/flow-designer-renderers/src/designer-command-adapter.ts:25`（TREE_OWNED_COMMANDS 含 updateNodeData）、`designer-command-adapter.ts:166-169`（仅 tree 分支）、`designer-command-adapter-graph.ts:39-201`（graph-only switch 无此 case）、`designer-command-adapter.ts:306-313`（default 兜底）
- 关键源码摘录（designer-command-adapter.ts:101-104 + 306-313）：
  ```ts
  function executeTreeCommand(command: DesignerCommand): DesignerCommandResult | undefined {
    if (!isTreeMode || !isTreeOwned(command)) {
      return undefined;          // graph 模式直接返回 undefined
    }
  ```
  ```ts
  default:
    return createFailure(
      core,
      t('flux.flowDesigner.command.unsupportedCommand', {
        command: (command as { type: string }).type,
      }),
      'unavailable',
    );
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：graph 模式（`config.documentMode === 'graph'`，playground `taskflow-workflow-schema.json` 即此模式且含 14 处 inspector 配置）下，用户在默认 inspector 修改节点名称（`designer-inspector.tsx:350-356` 的 label Input onChange）→ `dispatch({ type: 'updateNodeData', nodeId, data: { label } })`。
  2. 路径：`DesignerContext.dispatch`（`designer-page-inner.tsx:44-48`，直接等于 `commandAdapter.execute` + 失败 notify）→ `execute()`（designer-command-adapter.ts:196）→ ① `executeTreeCommand` 因 `!isTreeMode` 返回 undefined（:102-104）→ ② `executeGraphOnlyCommand` 的 switch 只有 addEdge/addNode/deleteEdge/deleteNode/duplicateNode/moveNode/reconnectEdge/setViewport/**updateEdgeData** 九个 case（designer-command-adapter-graph.ts grep 确认），无 `updateNodeData` → ③ 主 switch（:216-305）同样无此 case → default。
  3. 错误结果：返回 `createFailure('unsupportedCommand', 'unavailable')` → `notifyCommandFailure`（designer-context.ts:96-119）弹 warning toast，节点数据永不更新、历史无新条目。同样命中的还有 `designer-field.tsx:35`（inspector schema 主路径控件）与 `designer-action-provider.ts:380-392`（`designer:updateNodeData` action 也走同一个 `adapter.execute`，schema inspector 的写路径全断）。
- 佐证（非误报）：
  - core 明确提供 `updateNode(nodeId, data)`（`flow-designer-core/src/designer-core-types.ts:25`，graph-command-gate 中 graph 模式可用）却无任何渲染层调用；
  - 不对称证据：`updateEdgeData` 同时有 graph case（designer-command-adapter-graph.ts:190-199 调 `core.updateEdge`）且在 GRAPH_ONLY_COMMANDS 中，而 `updateNodeData` 只进了 TREE_OWNED_COMMANDS——是典型遗漏而非有意设计；
  - `designer-manifest.ts:264-273` 把 `updateNodeData` 作为 host capability 发布（"Update node data (partial merge)"，无模式限制），design.md §9.1 明言 "schema inspector 的写路径已经可以稳定复用 designer:\* action"——契约声明与实现漂移；
  - 测试缺口：全包 grep `updateNodeData` 仅 `designer-command-adapter.tree.test.ts:199` 覆盖 tree 路径，graph 路径零覆盖。
- 影响：graph 模式下所有节点数据编辑（label/description/泛化字段/自定义 inspector 表单）静默失效并伴随误导性"不支持的命令"警告；tree 模式不受影响。
- 修复方向：在 `executeGraphOnlyCommand` 增加 `case 'updateNodeData'`（校验节点存在后调 `core.updateNode`，对齐 updateEdgeData 写法），将 `updateNodeData` 移出/并存于 TREE_OWNED_COMMANDS 语义；补 graph 模式回归测试（inspector label 编辑 + designer:updateNodeData action）。

### F-02 onMove 每帧无节流直通 `setViewport`：26 号报告 F-01（每帧 pushHistory + 全文档深拷贝）在渲染层 100% 暴露，且 undo 历史被 viewport 帧污染

- 位置：`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:298-303`（onMove 与 onMoveEnd 同样直通）、`designer-xyflow-canvas/use-xyflow-interactions.ts:116-125`、`designer-canvas.tsx:385-391`、`designer-command-adapter-graph.ts:172-189`
- 关键源码摘录（designer-xyflow-canvas.tsx:298-303 + use-xyflow-interactions.ts:116-125）：
  ```tsx
  onMove={(_event, nextViewport) =>
    handleViewportChange(nextViewport as XyflowViewportChange)
  }
  onMoveEnd={(_event, nextViewport) =>
    handleViewportChange(nextViewport as XyflowViewportChange)
  }
  ```
  ```ts
  function handleViewportChange(nextViewport: XyflowViewportChange) {
    const normalized = normalizeViewportChange(nextViewport);
    if (!normalized) {
      return;
    }
    if (!viewportsEqual(viewport, normalized)) {
      onViewportChange(normalized, undefined); // 立即上抛，无 rAF/节流/去抖
    }
  }
  ```
- 输入 → 路径 → 错误结果推理链：
  1. 输入：用户在画布上拖拽平移或滚轮缩放（React Flow v12 的 `onMove` 随 d3-zoom 事件每帧触发）。
  2. 路径：`onMove`（每帧）→ `handleViewportChange`：唯一门控是与**受控 viewport prop** 的 epsilon(0.001) 比较——平移中每帧位移远大于 0.01px，比较恒不相等、门控形同虚设 → `onViewportChange`（designer-canvas.tsx:385-391）**立即** `dispatch({ type: 'setViewport' })` → `executeGraphOnlyCommand` case 'setViewport'（designer-command-adapter-graph.ts:172-174）直接 `core.setViewport`。
  3. 错误结果（消费 26 号报告 F-01 已定性的 core 缺陷）：core `setViewportCommand`（`flow-designer-core/src/core-shell-commands.ts:89-102`）每次执行 `ctx.setDocument({...doc, viewport})` + 无事务时 `ctx.pushHistory()` → `pushHistoryEntry`（`core/history.ts:38-60`）`cloneDocument(doc)` **全文档深拷贝**。即：每帧 1 次全文档克隆 + 1 条 undo 历史 + 1 次 doc 引用更换。doc 引用更换使 `DesignerCanvasContent` 的快照比较（designer-canvas.tsx:86-101）判为变化 → 整个 canvas 链每帧重渲染（叠加 F-03 的全量节点重建）。更严重的语义后果：undo 历史被 viewport 逐帧填充，用户平移画布后按 Ctrl+Z 撤销的是"半像素 viewport 位移"而不是文档编辑。
- 暴露面结论（对应任务要求）：**渲染层零节流、零 rAF 合并、零 moveEnd-only 提交、零事务包裹**；`onMoveEnd` 与 `onMove` 走同一处理，未做"手势结束才提交"的区分。minimap 点击导航（use-minimap-navigation.ts:68-75）也各自触发一次 dispatch（单次，无放大）。
- 修复方向（渲染层可独立完成的部分）：`onMove` 只做受控视口本地记账（或直接不绑定），仅 `onMoveEnd` dispatch `setViewport`；或对 dispatch 做 rAF 合帧；同时在 command adapter 侧为 `setViewport` 增加与上次提交值的 epsilon 去重（复用 xyflow-utils 的语义而非 helpers 的严格 `===`）。根治（viewport 不进 undo 历史 / 不克隆全文档）属 core 侧 26 号 F-01 范畴。

## P1 隐患

### F-03 大图性能：`DesignerXyflowNode`/`DesignerXyflowEdge` 未 memo，且每次快照全量重建节点/边对象数组——任何快照变更（含 F-02 的每帧 viewport 回推）触发全部节点/边重渲染

- 位置：`packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:28`（无 memo 包装）、`designer-xyflow-canvas/designer-xyflow-edge.tsx:18`（无 memo 包装）、`designer-xyflow-canvas/xyflow-utils.ts:50-114`、`designer-xyflow-canvas/designer-xyflow-canvas.tsx:159-166`
- 关键源码摘录（xyflow-utils.ts:58-87，节选）：
  ```ts
  return snapshot.doc.nodes.map((node) => {
    ...
    return {
      ...
      id: node.id,
      type: 'designerNode',
      position: { ...node.position },      // 每次全新对象
      selected: snapshot.selection.activeNodeId === node.id,
      data: {
        ...(node.data ?? {}),              // 每次全新 data 引用
  ```
- 条件 + 后果：`snapshotNodes`/`snapshotEdges` 的 useMemo 依赖 `props.snapshot`——core 每次发布新快照（F-02 下为每帧）即全量 map 生成**全新节点/边对象**（含全新 `data` 引用）；React Flow 按 node 对象引用判定重渲染，两个主组件又未 `React.memo`，且节点内部 `nodeRenderData` useMemo 依赖 `props.data`（每帧新引用）恒失效 → `RenderNodes` schema 片段每帧全量重渲染。1000+ 节点图（design.md §12.5 明示的压力场景）在 pan/zoom 时每帧 O(n) 对象创建 + O(n) 组件重渲染。同包 `DingFlowEdge` 已用 `memo`（ding-flow-edge.tsx:114）证明此为遗漏而非约定；未开启 `onlyRenderVisibleElements` 视口虚拟化（全包 grep 零命中）。
- 附带（use-xyflow-sync.ts:90-91）：`useEdgesState(snapshotEdges)` 的 state 值被解构丢弃（`[, , onEdgesChangeInternal]`），`onEdgesChangeInternal` 只更新这份**永不参与渲染的死状态**，却每次边变更触发一次无意义组件重渲染。
- 影响：大图交互卡顿；design.md §12.4"更新单节点数据只替换该节点引用"的结构共享策略在 xyflow 投影层失效。
- 修复方向：`DesignerXyflowNode`/`DesignerXyflowEdge` 包 `React.memo`（自定义比较忽略函数 props）；`createXyflowNodes` 按节点缓存（node 未变则复用上次投影对象，结构共享）；删除死掉的 edges state（直接受控 `renderedEdges`）；评估大图开启 `onlyRenderVisibleElements`。

### F-04 tree 模式调试 toast 遗留生产渲染路径：每次快照变更向 `env.notify` 发送全文档 JSON dump

- 位置：`packages/flow-designer-renderers/src/designer-page-body.tsx:152-157`、`tree-layout-debug.ts:38-53`
- 关键源码摘录（designer-page-body.tsx:152-157 + tree-layout-debug.ts:52）：
  ```tsx
  useEffect(() => {
    if (!isTreeMode) {
      return;
    }
    emitTreeLayoutDebugSnapshot(env, statusSnapshot);
  }, [env, isTreeMode, statusSnapshot]);
  ```
  ```ts
  env?.notify?.('info', `[flow-designer tree-layout] ${JSON.stringify(payload)}`);
  ```
- 条件 + 后果：`statusSnapshot = useDesignerSnapshot(core)` 订阅**完整快照**——tree 模式下每次选中节点、加删节点、面板折叠等任何快照变更都会弹出一个 info 级 toast，内容是全节点/全边的 JSON 序列化（`[flow-designer tree-layout] {...}`）。既是 UX 破坏（每次点击弹出巨型提示）也是每快照 O(n+e) 的 JSON.stringify 开销；无任何 debug 开关门控。
- 影响：tree 模式（DingFlow 主示例）所有交互被调试噪声污染；docs/logs 中未检索到该调试仪器的登记说明。
- 修复方向：加显式 debug 开关（config.features 或 env 调试通道）默认关闭；或删除该 effect（保留 `emitTreeLayoutDebugSnapshot` 供测试显式调用）。

### F-05 跨包 F-03 消费侧核实：UI 复制按钮命中坏的 `maxInstances: 'unlimited'` 实现，且渲染层把失败误报为 "Unknown node"

- 位置：本包 `designer-command-adapter-graph.ts:97-108`（duplicateNode 失败映射）；core 侧 `flow-designer-core/src/core/graph-command-gate.ts:103-109`（坏实现）与 `core/constraints.ts:19-27`（好实现）
- 关键源码摘录（designer-command-adapter-graph.ts:97-105 + graph-command-gate.ts:106-108）：
  ```ts
  case 'duplicateNode': {
    const node = core.duplicateNode(command.nodeId);
    if (!node) {
      return createFailure(
        core,
        t('flux.flowDesigner.command.unknownNode', { nodeId: command.nodeId }),
        'missing-node',            // 节点明明存在，误报
  ```
  ```ts
  const max = nodeType.constraints?.maxInstances;
  if (max === undefined) return true;
  return ctx.getDoc().nodes.filter((node) => node.type === type).length < Number(max);
  // Number('unlimited') === NaN → count < NaN 恒 false
  ```
- 消费侧结论（对应任务要求）：本包 UI 的复制入口全部收敛到 `core.duplicateNode`（节点工具栏 `designer-xyflow-node.tsx:100` actionScope.onDuplicate → dispatch duplicateNode；toolbar/action 同路），即命中 **graph-command-gate 的 `checkMaxInstancesLocal` 坏实现**：配置 `maxInstances: 'unlimited'` 的节点类型（语义上最宽松）**永远无法复制**，静默返回 null；而添加走 `core.addNode` → `addNodeCommand` → `constraints.ts checkMaxInstances`（正确尊重 'unlimited'）。同一配置下"能添加、不能复制"。渲染层雪上加霜：duplicate 失败被统一映射为 `missing-node` + "Unknown node: <id>" 错误信息——节点明明存在，用户收到完全误导的报错（对比 addNode 路径有 `inferAddNodeFailure` 区分 'constraint'，duplicate 没有）。
- 影响：unlimited 类型节点复制功能静默失效 + 错误信息误导排查方向。
- 修复方向：根因（core 双实现漂移）归 26 号 F-03；本包应修 duplicateNode 失败映射——区分"节点不存在"与"约束拒绝"（core.duplicateNode 返回语义不足以区分时，先 `hasNode` 预检再按 addNode 的 infer 模式给出 'constraint' reason）。

### F-06 节点卡片 hover 即 dispatch `selectNode`：悬停改写全局选中态

- 位置：`packages/flow-designer-renderers/src/designer-node-card.tsx:44-50, 85`
- 关键源码摘录（designer-node-card.tsx:44-50 + 85）：
  ```tsx
  function handleFocus(event: React.MouseEvent) {
    event.stopPropagation();
    if (!summary) {
      return;
    }
    dispatch({ type: 'selectNode', nodeId: summary.id });
  }
  ...
  onClick={handleClick}
  onMouseEnter={handleFocus}
  ```
- 条件 + 后果：`designer-node-card` 用于摘要/列表视图；鼠标**滑过**任意卡片即触发 `selectNode`——切换 activeNode（inspector 面板内容跟随切换、画布 selected 高亮变化），无点击意图。函数名 handleFocus 却没有任何键盘 focus 处理（`onFocus` 未绑定）。用户在列表中移动鼠标浏览时选中态被连续抢占；若 inspector 正在编辑某节点，滑过其他卡片会切走编辑目标（配合 F-01，graph 模式下编辑本来也写不进去，tree 模式下真实影响选中上下文）。
- 影响：hover 副作用违反最小惊讶；浏览即改状态。
- 修复方向：删除 `onMouseEnter` 上的 dispatch；如需预览高亮，用本地 hover 态 + CSS；键盘路径补 `onFocus` 或仅保留 click。

### F-07 tree 模式加号菜单默认数据硬编码：非 approval 类型新节点 label 一律错误显示 "CC"

- 位置：`packages/flow-designer-renderers/src/dingflow/dingflow-command-dispatch.ts:21, 33-35, 52, 60`
- 关键源码摘录（dingflow-command-dispatch.ts:14-22）：
  ```ts
  if (sourceKind === 'slot') {
    const [ownerId, branchId] = sourceId.slice('slot:'.length).split(':');
    return {
      type: 'insertBranchChild',
      ownerId,
      branchId,
      nodeType: type,
      data: { label: type === 'dt-approval' ? 'Approver' : 'CC', desc: 'Please set' },
    };
  }
  ```
- 条件 + 后果：加号菜单项来自 `config.nodeTypes` 过滤（`shouldIncludeInTreeAddMenu`，`designer-node-appearance.ts:70-81`），内置优先表包含 `dt-parallel`/`dt-subprocess`/`action-step` 等；但默认 data 只认识两种类型——除 `dt-approval` 外**所有类型**（含 dt-cc 恰好对、dt-parallel/dt-subprocess 明确错）的 label 都硬编码为 `'CC'`，desc 为英文 `'Please set'`；`dt-condition` 分支硬编码 `{ title: 'Condition', desc: 'Please set' }`（:33-35）。同一段逻辑在文件内重复三次（slot/merge/chain 路径）。既是 i18n 违规（绕过 `t()`）也是正确性缺陷：默认配置下从加号菜单添加"并行分支"节点，画布上显示标签 "CC"。
- 影响：任意非 DingTalk-approval 域的 tree 配置新节点默认标签错误；英文串直接进入画布。
- 修复方向：默认 data 从 `nodeType.defaults` / `resolveNodeTypeMeta(nodeType).label` 派生（菜单项已算出正确的本地化 label，却没有传下去）；desc 走 i18n key。

## P2 风险

### F-08 inspector 受控直写的两个引申缺陷：泛化字段把 number/boolean 改写为 string；逐 keystroke 一条 undo 历史

- 位置：`packages/flow-designer-renderers/src/designer-inspector.tsx:83-105, 399-417`、`designer-field.tsx:82-88`
- 关键源码摘录（designer-inspector.tsx:92-101，节选）：
  ```tsx
  <Input
    type="text"
    value={String(value ?? '')}
    onChange={(e) =>
      dispatch({
        type: 'updateNodeData',
        nodeId: activeNode.id,
        data: { [key]: e.target.value }, // 一律 string 写回
      })
    }
  />
  ```
- 问题：① 无 `inspector.body` 的节点走 `renderGenericFields`，把 `activeNode.data` 的所有标量键渲染为 text Input：boolean 显示 "true"、number 显示 "220"，用户一编辑即以 string 写回——类型污染。具体后果：`data.width` 被 `xyflow-utils.ts:12-18 toFiniteNumber` 按 number 读取，变 string 后解析失效，节点尺寸静默回退默认。`designer-field` 的 number fieldType（:82-88）同样 `String(value)` 进、string 出，无 `Number()` 转换。② 每个 keystroke dispatch 一次 `updateNodeData` → core 每次提交一条历史（tree 模式 `updateTreeNodeData`，graph 模式修复 F-01 后同样），undo 一次只回退一个字符；design.md §10.1 要求复合操作进统一事务，连续输入未合并。草稿串写本身未成立（受控无草稿、闭包捕获 nodeId），但逐键历史是其替代缺陷面。
- 修复方向：泛化字段按 typeof 分派控件（number→number Input + Number() 转换，boolean→Switch，跳过内部键 width/height/size）；连续编辑用 `designer:beginTransaction/commit` 或失焦/去抖提交合并历史。

### F-09 minimap 导航监听时序竞态 + 越权改写库内部 DOM

- 位置：`packages/flow-designer-renderers/src/designer-xyflow-canvas/use-minimap-navigation.ts:26-33, 35-85`
- 关键源码摘录（use-minimap-navigation.ts:29-32）：
  ```ts
  const minimapSvg = surfaceRef.current?.querySelector('.react-flow__minimap svg');
  if (minimapSvg && minimapSvg.getAttribute('preserveAspectRatio') !== 'none') {
    minimapSvg.setAttribute('preserveAspectRatio', 'none');
  }
  ```
- 问题：两个 effect 都靠一次性 `querySelector('.react-flow__minimap svg')` 获取 SVG——effect 运行时若 MiniMap 尚未挂载（ReactFlow 惰性渲染、`showMinimap` 依赖的 features 变化、异步初始化），querySelector 返回 null 直接 return，**永不重试**，minimap 点击导航与 preserveAspectRatio 修正双双静默失效（suspect：默认挂载时序通常赶得上，但依赖库内部渲染顺序，无重试/MutationObserver 兜底）。强写 `preserveAspectRatio='none'` 属于对库私有 DOM 的越权 hack，xyflow 升级改结构即静默失效。`window mouseup` 捕获阶段监听有正确清理（:81-84）。
- 修复方向：监听绑定挂到稳定的容器上做事件委托（closest('.react-flow\_\_minimap')），或用 ResizeObserver/MutationObserver 等待 SVG 出现；preserveAspectRatio 修正改为 CSS 或在上游配置解决。

### F-10 `syncLocalNodesWithSnapshot` 在 state updater 内突变 ref：非纯 updater，StrictMode/并发重放下行为依赖调用次数

- 位置：`packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-sync.ts:40-44, 53-62, 93-101`
- 关键源码摘录（use-xyflow-sync.ts:53-62，节选）：
  ```ts
  const committedSignature = lastCommittedPositions.get(snapNode.id);
  if (committedSignature && snapshotSignature === committedSignature) {
    lastCommittedPositions.delete(snapNode.id);   // render 阶段突变 ref
    const mergedNode = mergeSnapshotNode(localNode, snapNode);
  ```
- 问题：`setLocalNodes(currentNodes => syncLocalNodesWithSnapshot(..., lastCommittedPositionsRef.current))`——updater 在 render 阶段执行且可能被 StrictMode 双调/并发渲染重放；首次调用删除 `lastCommittedPositions` 条目后，第二次以相同输入调用走 `changed = true; return snapNode` 分支，**两次输出不同**（违反 updater 纯性要求）。当前因拖拽提交位置与快照位置一致通常无可见差异，但 core 若对 position 做 clamp/取整差异，dev StrictMode 下节点会闪回快照位置；这是 React 并发模式下未定义行为的种子，也违背 canvas-adapters.md "快照回推必须允许 no-op 合并" 实现的初衷。
- 修复方向：把"消费提交签名"移出 updater——先在 effect 中计算要保留本地位置的 id 集合，再调用纯 merge，effect 末尾统一清理 ref。

### F-11 双 `viewportsEqual` 同名异义 + EDGE 错误串与 core 重复定义（含 "playground example" 泄漏）

- 位置：`packages/flow-designer-renderers/src/designer-xyflow-canvas/xyflow-utils.ts:128-137`（epsilon 0.001）vs `designer-command-adapter-helpers.ts:68-73`（严格 `===`）；`designer-command-adapter-helpers.ts:8-10`
- 关键源码摘录（designer-command-adapter-helpers.ts:8-10, 68-73）：
  ```ts
  const EDGE_SELF_LOOP_ERROR = 'Self-loop edges are not supported in the playground example.';
  const EDGE_MISSING_NODE_ERROR = 'Edges must connect existing nodes.';
  const EDGE_DUPLICATE_ERROR = 'Duplicate edges are not supported in the playground example.';
  ...
  return left.x === right.x && left.y === right.y && left.zoom === right.zoom;
  ```
- 问题：① 同名函数两套语义：adapter 的 setViewport 'unchanged' 判定用严格相等——core 若对 viewport 做任何舍入，提交前后比较恒不等，'unchanged' 快路径失效（并与 F-02 的去抖缺口叠加）；语义 drift 是典型的双实现演化隐患。② 三个 EDGE\_\* 错误串与 `flow-designer-core/src/core/constraints.ts:3-5` 逐字重复（双份维护），文案自称 "playground example" 却在通用设计器库包中直发用户，且绕过 `t()`（同文件其余错误已走 i18n）。`inferAddNodeFailure` 的 `Unknown node type: ...` 同为英文模板串。
- 修复方向：统一引用 core 的判定/文案或收敛为单一实现；错误串改 i18n key 并删除 "playground" 字样。

### F-12 toolbar 订阅结果丢弃：为触发重渲染订阅了整份 `doc` 引用

- 位置：`packages/flow-designer-renderers/src/designer-toolbar.tsx:53-61`
- 关键源码摘录（designer-toolbar.tsx:53-61）：
  ```tsx
  useDesignerSnapshotSelector<ToolbarSnapshot>((state) => ({
    canUndo: state.canUndo,
    ...
    doc: state.doc,
  }), shallowEqual);           // 返回值未赋给任何变量
  ```
- 问题：调用结果被整体丢弃——组件不读它；订阅唯一作用是"doc 变了就重渲染以重算模板 items"。代价：选择器包含 `doc` 全引用，任何文档变化（拖拽提交、F-02 下每帧 viewport 回推产生的新 doc）都重渲染 toolbar 并重跑 `resolveToolbarValue` 表达式求值；同时这是一段意图不明的半死代码（阅读者无法判断是漏了消费还是纯触发器）。
- 修复方向：删除该订阅，改为订阅模板 items 实际引用的字段（canUndo/canRedo/isDirty 等，不含 doc），或在注释/命名上明确"重算触发器"意图。

### F-13 root stable surface 违反 design.md：deprecated `createFlowDesignerRegistry` 在根入口导出，unstable 反而没有

- 位置：`packages/flow-designer-renderers/src/index.tsx:29-31`、`unstable.ts`（全文无此导出）
- 关键源码摘录（index.tsx:29-31）：
  ```ts
  export { createFlowDesignerRegistry } from './renderer-definitions.js';
  ```
- 问题：design.md §3.2 明确 "命名漂移的 `createFlowDesignerRegistry()` 只保留在 `@nop-chaos/flow-designer-renderers/unstable` 作为 deprecated legacy alias，不再属于 root stable surface"；实际 root `index.tsx` 仍在导出（`renderer-definitions.ts:349-354` 标了 @deprecated 但位置不对），`unstable.ts` 倒未导出——文档与实现双向漂移。root surface 冻结契约被打破。
- 修复方向：从 index.tsx 移除该导出，移入 unstable.ts（保留 @deprecated）；或反向修订 design.md 并登记。

### F-14 通用 host projection 携带领域字段 `taskflowEdgeKind`

- 位置：`packages/flow-designer-renderers/src/designer-host-projection.ts:65, 240-246`
- 关键源码摘录（designer-host-projection.ts:240-246）：
  ```ts
  const edges = businessEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourcePort: e.sourcePort,
    taskflowEdgeKind: e.data?.taskflowEdgeKind as string | undefined,
  }));
  ```
- 问题：design.md §6.4 明言 flow-designer 不应知道 domain 语义；通用投影契约 `edgeSummaryShape` 与投影实现硬编码 taskflow 域字段（且形状声明为必有字段却可能为 undefined）。`designer-node-appearance.ts:4-49` 的 dt-_ 内置色板/优先表、`dingflow-command-dispatch.ts` 的 dt-_ 分支属同类（可辩护为 built-in default generator，但投影契约层不应有域字段）。
- 修复方向：taskflowEdgeKind 下沉到 domain adapter/配置驱动的投影扩展（如 projection extensions 由 config 声明）。

### F-15 inspector 删除分支按钮硬编码 `branchItems.length <= 2` 禁用，未读 `minBranches` 配置

- 位置：`packages/flow-designer-renderers/src/designer-inspector.tsx:190`
- 关键源码摘录（designer-inspector.tsx:184-197，节选）：
  ```tsx
  <Button
    ...
    disabled={branchItems.length <= 2}
    onClick={() =>
      dispatch({ type: 'deleteBranch', ... })
  ```
- 问题：design.md §17.3/17.4 约束分支数量由 `TreeNodeTypeConfig.tree.maxBranches/minBranches` 决定；UI 硬编码"至少 2 分支"。配置 `minBranches: 1` 的节点类型仍无法删到 1 分支（UI 比配置更严，形成契约漂移）；反之若 core 允许更大最小值，UI 放行后由 core 拒绝，错误反馈路径不一致。
- 修复方向：disabled 条件改读 `nodeType.tree?.minBranches ?? 2`。

### F-16 `DingFlowCanvasOverlay` 全仓零引用死代码，加号菜单 items 构造逻辑三处重复

- 位置：`packages/flow-designer-renderers/src/dingflow/ding-flow-canvas-overlay.tsx`（160 行）、`designer-canvas.tsx:171-190`、`dingflow/ding-flow-canvas-overlay.tsx:48-67`
- 关键源码摘录（ding-flow-canvas-overlay.tsx 与 designer-canvas.tsx 中逐字重复的 menuItems 构造，两处 `config.nodeTypes.filter(shouldIncludeInTreeAddMenu).sort(compareTreeMenuNodeTypes).map(...)`）：
  ```ts
  const menuItems = useMemo<DingFlowMenuItem[]>(
    () =>
      config.nodeTypes
        .filter(shouldIncludeInTreeAddMenu)
        .sort(compareTreeMenuNodeTypes)
  ```
- 问题：`DingFlowCanvasOverlay` 未被任何生产代码或 dingflow/index.ts 导出引用（grep 全仓零消费），其 overlay 渲染职责已由 `designer-xyflow-canvas.tsx` 的 `TreeModeOverlays` 承接；菜单 items 构造在 designer-canvas.tsx 与该死代码文件各一份逐字重复（未来改菜单逻辑只改一处必漂移）。死代码 160 行占包体 1.7%。
- 修复方向：删除 `ding-flow-canvas-overlay.tsx`；菜单 items 构造提取为共享 helper（designer-node-appearance 旁）。

## P3 提示

### F-17 用户可见英文硬编码串（i18n 漏网）

- 位置汇总：`designer-xyflow-node.tsx:175, 225, 347`（`Node ${label}`/`Selected `/`Empty branch slot for`/`Node actions for`）、`designer-xyflow-edge.tsx:94-95, 146`（`${source} to ${target}`/`Edge …`/`Edge actions for`）、`designer-toolbar.tsx:223`（`'Back'` 回退）、`dingflow/ding-flow-add-node-menu.tsx:84`（`aria-label="Add node"`）、`designer-tree-mode.tsx:126`（`Tree host input rejected: …`）、`tree-session.ts:172, 279, 283, 289`（host-issue 英文文案）、`designer-page-body.tsx:280-289`（`Create dialog submit action …`）。design.md §3.2 a11y 契约要求稳定 aria-label，但未豁免 i18n；同文件其他标签均已走 `t()`，这些是漏网。修复：统一换 key。

### F-18 palette 杂项：每渲染重建 Map、文本三角形指示器、重复添加节点完全重叠

- 位置：`designer-palette.tsx:33`（`new Map(nodeTypes.map(...))` 未 memo）、`:112`（`'▼'/'▶'` 裸字符且无 aria-hidden，读屏会念字符名）、`:48-63`（连续点击"添加"总落在 `activeNode.position + (220,0)` 同一点，新节点完全重叠不可见；core 的 duplicateNode 用 +48 错位）。修复：memo Map；Collapsible 自带指示器或图标组件 + aria-hidden；插入坐标叠加累加偏移。

### F-19 render-ports 边界：非法 position 静默回退、Escape 取消只能从源端口触发

- 位置：`render-ports.tsx:267`（`POSITION_MAP[port.position ?? 'top']` 对非法值返回 undefined，Handle 静默用库默认，无诊断）、`:104-121`（Escape 仅当焦点在 pending 源端口时取消连线；焦点在目标端口按 Escape 无效——design.md §8 键盘等价路径的取消可达面偏窄）。修复：非法 position 走 diagnostic；Escape 在存在 pendingConnection/reconnecting 时任意端口可取消。

### F-20 画布手势自环连接静默吞掉，无用户反馈

- 位置：`use-xyflow-interactions.ts:127-131`（`handleConnect` 对 `source === target` 直接 return）。core 路径拒绝连接会经 notifyCommandFailure 弹警告，手势层拦截则无任何提示，两路反馈不一致。修复：走完整 onStart/onComplete 让 core 统一拒绝并提示，或在手势层给出同等提示。

### F-21 BEM 风格元素类名与硬编码色

- 位置：`designer-node-card.tsx:88-100, 108`（`__icon/__info/__title/__meta/__position/__state`）、`designer-edge-row.tsx:89-100`（`__flow/__source/__arrow/__target`）——AGENTS "No BEM"（marker `nop-designer-node-card` 已有，`__` 元素后缀属 BEM 残留）；`dingflow/ding-flow-edge.tsx:100`（分支标签 `border-[#15bc83] bg-white text-[#15bc83]` 硬编码 DingTalk 绿 + 白底，暗色主题下突兀，违背 theme-compatibility CSS 变量基线）。修复：改 data-slot 语义名 + 主题变量。

### F-22 超 500 行文件 3 个（warn 档，未超 ERROR 线、未注册豁免）

- 位置：`designer-page-body.tsx` 615 行、`designer-action-provider.ts` 547 行、`designer-manifest.ts` 502 行。`scripts/check-oversized-code-files.mjs` WARN_LINES=500 / ERROR_LINES=700，三者均处 warn 档且不在 OVERSIZED_EXEMPTIONS（该名单只登记 >700 豁免），docs/logs 亦无对应注册——即 `pnpm check:oversized-code-files` 输出中为未注册 warn 命中。按 AGENTS "文件超 500 行应评估拆分"：page-body 可拆 JSON 面板与 create-dialog 两块；action-provider 的 invoke 巨型 switch 可按命令族拆分；manifest 为纯声明数据可暂缓但需登记。

### F-23 tree 会话杂项：digest "LRU" 实为 FIFO、config 变更被忽略、session 重建丢队列

- 位置：`tree-session.ts:110-119`（`touchLocalDigest` 对既有 digest 重新 set 不改变 Map 插入序，淘汰是插入序 FIFO 而非最近使用序，名实不符——热点 digest 早插入仍被逐出，echo 检测窗口比设计预期小，可能把本应 stale-echo 的回包判成 conflict）；`designer-tree-mode.tsx:49-51`（core/config 经 useState 初始化一次，host 换 config 对象被静默忽略，需 remount，未见文档登记）；`:111`（effect 依赖含 `props.helpers`/`actionScope`/`props.node.scope` 身份，任一不稳定即整会话重建并清空 pending 写回队列——当前宿主应稳定，标 suspect）。

### F-24 其余小项：MiniMap 内联函数 props、designer-field disabled 读取通道

- 位置：`designer-xyflow-canvas.tsx:375-376`（`nodeColor={() => …}`/`nodeStrokeColor={() => …}` 每渲染新引用，MiniMap 无法靠 props 浅比较跳过重渲染，叠加 F-03 每帧放大）；`designer-field.tsx:25`（`props.props.disabled === true` 读 prop 通道而非契约表的 `props.meta.disabled`——框架 meta 投影（node-runtime.ts:283-315 projectRendererFacingMeta 注入 disabled）使其当前可工作，但绕过标准通道，且 'disabled' 未声明进 renderer-definitions 的 fields 列表，依赖隐式透传）。

## 检查过程记录

1. **文档基线**：先读 `docs/architecture/flow-designer/design.md`（684 行全量）与 `canvas-adapters.md`（160 行全量），提取契约锚点：命令归一化单向流、bridge 回调面、ELK/plus-button instance-owner、失败意图保留、tree mode 投影边界、性能策略 §12、host scope §11、root stable surface §3.2。
2. **结构盘点**：`find + wc` 列出 59 个源文件 9632 行（排除 _.test._ 与 **tests**），按画布核心 → 宿主链 → 面板 → tree → dingflow → 定义/清单分层排读。
3. **精读（全量）**：designer-xyflow-canvas/ 全部 9 文件、canvas-bridge、designer-canvas、designer-command-adapter 三件套 + command-types、designer-action-provider、designer-page-body/inner/page/page-helpers、designer-inspector/toolbar/palette/field、designer-tree-mode、tree-session、designer-host-projection、designer-node-appearance、designer-canvas-focus、designer-summary-helpers、designer-node-card/edge-row、designer-icon、renderer-definitions、schemas、index/unstable、tree-layout-debug、use-designer-shortcuts、use-designer-auto-layout、dingflow/ 全部 11 文件。
4. **跨包核实**：core 的 setViewport/pushHistory/cloneDocument（F-02 暴露链）、graph-command-gate vs constraints 双 maxInstances 实现（F-05）、updateNode 存在性（F-01 佐证）；flux-react useHostScope 稳定 ref（排除 ctxValue 每快照重渲染的疑点，反误报）；flux-runtime resolveNodeProps meta 投影（校准 F-24 判级）；ui resolveLucideIcon 恒有 Circle 兜底（排除 DesignerIcon 崩溃疑点，反误报）。
5. **模式扫描**：`as any`/`@ts-ignore`/空 catch 全包 **0 命中**；非空断言仅 2 处且均有前置守卫；addEventListener/setTimeout 清理逐处核验（仅 ding-flow-add-node-menu.tsx:57 关菜单回焦 timeout 无清理，回调可选链安全，不单列）；addEventListener 共 5 处全部成对清理；CJK 硬编码 0 命中；i18n key 抽查（addNode/editNode/duplicateNode/deleteEdge/selectEdge/defaultPort/portLabel 等）在 en-US locale 全部存在；`onlyRenderVisibleElements` 0 命中；memo 仅 DingFlowEdge 1 处（F-03 佐证）。
6. **结构核对**：test-support 4 文件（463 行）无生产引用（index-test-support 未列入 package.json exports）；超限文件对照 `scripts/check-oversized-code-files.mjs`（500/700 线 + 豁免名单）与 docs/logs（见 F-22）。
7. **反误报裁决**：草稿串写疑点——inspector 全部受控直写、onChange 闭包捕获当时 activeNode.id，无跨节点串写路径，判不成立（转化为 F-08 逐键历史/类型污染）；onSelectionChange 回环——lastSelectionRef 去重后 onPaneClick 二次 clearSelection 幂等，判无环；tree session dispatchNext 双重空队列检查——第二个守卫承接 flushCoalesced 推入，非死代码；useHostScope 每快照换 ref 疑点——store.getSnapshot 返回稳定 scope、数据原地 replace，ctxValue 不放大，判不成立。
8. **测试缺口标注**：graph 模式 updateNodeData（F-01）、duplicateNode + maxInstances:'unlimited'（F-05）、minimap 导航绑定时机（F-09）三处均无任何测试覆盖。
