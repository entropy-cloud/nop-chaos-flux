# 26 flow-designer-core 实现代码检查报告

- 检查日期：2026-08-20
- 范围：`packages/flow-designer-core/src/` 全部 29 个非测试源文件（约 5583 行），排除 `*.test.*` 与 `__tests__/`。对照文档：`docs/architecture/flow-designer/design.md`、`collaboration.md`、`canvas-adapters.md`。交叉验证了 `packages/flow-designer-renderers/src/` 的调用路径（仅读取，未修改）。
- 结论概览：**P0 x1 / P1 x3 / P2 x8 / P3 x13**。
- 总评：core 的纯函数层（selection、transactions、history 的栈操作、tree-projection 的测量/放置）质量较高、不可变更新纪律好。主要风险集中在三处：(1) `setViewport` 把视图平移写入 undo 历史，且经由 React Flow `onMove` 每帧触发，直接污染并冲掉 50 条上限的编辑历史（F-01，P0）；(2) tree session 拿到的是 `transactionStack` 创建时刻的值快照而非 getter，tree 命令的事务边界静默失效（F-02）；(3) 若干 hook 改写路径（`beforeConnect`、`beforeDelete`）绕过约束检查。死代码 `core-shell-commands.ts` 与 `design.md` 声明的分支数约束（maxBranches 等）完全未实现属于契约漂移。文件行数均低于 `pnpm check` 的 700 行红名单阈值，无未登记超限文件。

---

## P0 缺陷

### F-01 viewport 平移每帧写入 undo 历史并全文档深拷贝，编辑历史被冲掉（D1 正确性 + D6 性能）

位置：`packages/flow-designer-core/src/core/shell-controls.ts:136-147`（行为本体）；同构副本 `core-shell-commands.ts:89-102`；触发链在 `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-canvas.tsx:298-303` 与 `designer-canvas.tsx:385-391`。

```ts
function setViewport(newViewport: { x: number; y: number; zoom: number }) {
  if (!setShellViewport(args.shellState, newViewport)) {
    return;
  }

  const currentDoc = args.getDocument();
  args.setDocument({ ...currentDoc, viewport: args.shellState.viewport });
  if (args.getTransactionDepth() === 0) args.pushHistory();
  args.emit({ type: 'viewportChanged', viewport: args.shellState.viewport });
  args.emit({ type: 'documentChanged', doc: args.getDocument() });
  args.updateDirtyState();
}
```

问题：`setViewport` 每次调用都 `setDocument`（revision+1，文档变脏）并 `pushHistory()`。`pushHistoryEntry`（`core/history.ts:38-63`）对整个 `GraphDocument` 做 `cloneDocument` 深拷贝，且 `core.ts:130` 的 `maxHistorySize = 50` 固定不可配。

推理链（输入 → 路径 → 错误结果）：

1. 输入：graph 模式下用户用指针平移/缩放画布约 1 秒（极普通操作）。
2. 路径：React Flow `onMove` 在手势期间每帧触发（`designer-xyflow-canvas.tsx:298`，`onMove` 与 `onMoveEnd` 都绑定 `handleViewportChange`，无节流）→ `use-xyflow-interactions.ts:116-125` 归一化后调 `props.onViewportChange` → `designer-canvas.tsx:390` `dispatch({ type: 'setViewport' })` → `designer-command-adapter-graph.ts:172-186` 直接同步调 `core.setViewport` → 每帧执行 `pushHistory` + 全文档 `structuredClone`。
3. 错误结果：a) 60fps 手势 1 秒即产生约 60 条 viewport 历史记录，超过 50 条上限后**真实的编辑历史被逐出，undo 变成"撤销上一次半帧的平移"**，用户按 50 次 undo 也回不到上一次节点编辑；b) 1000+ 节点大图（design.md 12.5 明确压力场景）下每帧对全文档 nodes/edges data 做 `structuredClone`，主线程卡顿；c) 每帧 emit `documentChanged` + `dirtyChanged` 驱动全量快照重算。

影响：核心 undo/redo 语义在常规画布操作后损坏；大图性能退化；文档 dirty 状态因纯视图操作翻脏。

修复方向：viewport 不进 undo 历史（视图状态与文档编辑分离，undo 只恢复文档结构；或仅在 `onMoveEnd` 提交且与上一条历史 coalesce / 标记为可合并的 viewport-only entry）。深拷贝时可结构共享 nodes/edges 引用（仅顶层 spread + viewport 字段替换），并给 `maxHistorySize` 提供配置面。注意 canvas-adapters.md 的 "onMove 和 onMoveEnd 都归一化为 onViewportChange" 契约不变，只改 core 侧历史策略。

---

## P1 隐患

### F-02 tree session 持有 `transactionStack` 值快照，tree 命令的事务边界完全失效（D1 正确性 / D2 契约）

位置：`packages/flow-designer-core/src/core.ts:651-655`（传值处）；`packages/flow-designer-core/src/tree-session-impl.ts:155, 213-222`（消费处）。

```ts
// core.ts:635-670（节选）——对象字面量简写 = 按值传递创建时刻的快照
      historyState,
      savedTreeDocument,
      savedRevision,
      transactionStack,
```

```ts
// tree-session-impl.ts:213-222 —— 读取的是快照数组
    if (ctx.transactionStack.length === 0) {
      ctx.pushHistory();
    }
    ...
    if (ctx.transactionStack.length === 0) {
      ctx.emitTreeChanged(projection.view.tree, notifyReason);
    }
```

问题：`core.beginTransaction`（core.ts:507-520）通过 `beginTransactionState` 返回**新数组**并重新赋值闭包变量 `transactionStack = nextState.stack`，而 tree session context 在 core 创建时持有的是旧（空）数组引用。对比 node/edge 命令上下文（core.ts:258-260）正确使用了 `get transactionStack() { return transactionStack; }` getter。

推理链：tree 模式下 `beginTransaction('batch')` → 闭包 `transactionStack` 指向新数组 `[txn]`，ctx 里仍是旧空数组 → 事务内执行 `insertChainNode` 等 tree 命令 → `runTreeCommand` 读 `ctx.transactionStack.length === 0` 为 true → 每条 tree 命令各自 `pushHistory()` + `emitTreeChanged('command')` → `commitTransaction` 时栈空又 push 一条 → 一个逻辑事务产生 N+1 条 undo 记录，commit 前 host writeback 也逐条发出。违反 design.md 10.1"复合操作可包裹在同一 transaction 中"与 17.5"undo/redo 恢复配对 tree+graph view"。

影响：当前 renderers 尚未在事务中组合 tree 命令（`designer-command-adapter.ts` 逐条直调），属潜伏缺陷；但 `beginTransaction/commitTransaction/rollbackTransaction` 已通过 `designer-action-provider.ts:481-495` 暴露为 schema action，一旦宿主 schema 在 tree 模式把 tree 命令包进事务即触发。附带问题：同一路径传入的 `historyState`、`savedTreeDocument`、`savedRevision` 也是值快照死字段（tree surface 从不读它们），`getAcceptedHostEpoch` 在整个仓库无消费者（renderer 的 epoch 防护在 `tree-session.ts` 自行维护）。

修复方向：`buildTreeSessionContext` 的输入接口对 `transactionStack`（以及需要的话 history/saved 状态）改用 getter（与 `getDoc`/`getDocRevision` 同模式），删除无人消费的死字段。

### F-03 `duplicateNode` 对 `maxInstances: 'unlimited'` 类型永远失败（D1 正确性）

位置：`packages/flow-designer-core/src/core/graph-command-gate.ts:103-109`。

```ts
function checkMaxInstancesLocal(type: string): boolean {
  const nodeType = ctx.normalizedConfig.nodeTypes.get(type);
  if (!nodeType) return true;
  const max = nodeType.constraints?.maxInstances;
  if (max === undefined) return true;
  return ctx.getDoc().nodes.filter((node) => node.type === type).length < Number(max);
}
```

问题：`maxInstances` 类型为 `number | 'unlimited'`（types.ts:158-167）。此处 `Number('unlimited')` 为 `NaN`，`length < NaN` 恒为 false → 复制被拒。而 `addNode` 走的 `checkMaxInstances`（`core/constraints.ts:19-28`）显式处理了 `'unlimited'`，两个实现不一致。

推理链：节点类型配置 `constraints: { maxInstances: 'unlimited' }` → 工具栏/快捷键触发 `designer:duplicateSelection` → `duplicateNode` → `checkMaxInstancesLocal` 返回 false → 返回 null（无 reason）→ 复制功能对该类型完全不可用；同类型的 `addNode` 却正常。

影响：特定配置下 duplicate 功能静默失效，且两套 max 检查实现漂移易再犯。

修复方向：删除本地重复实现，`duplicateNode` 复用 `core/constraints.ts` 的 `checkMaxInstances`。

### F-04 `beforeConnect` hook 改写端点后，maxIncoming/maxOutgoing/allowIncoming/allowOutgoing 不再复查（D1 正确性）

位置：`packages/flow-designer-core/src/core-edge-commands.ts:44-67`（检查在 hook 之前）与 `69-102`（hook 改写后仅重跑 `validateEdgeConnection`）。

```ts
if (targetNode) {
  const targetType = ctx.normalizedConfig.nodeTypes.get(targetNode.type);
  if (targetType?.constraints?.allowIncoming === false) {
    return null;
  }
  const maxIn = targetType?.constraints?.maxIncoming;
  if (maxIn !== undefined && countIncomingEdges(ctx.doc, target) >= maxIn) {
    return null;
  }
}
// ... 之后 beforeConnect 可改写 source/target（81-84 行），再进入 validateEdgeConnection
```

问题：节点级连接数/方向约束只对 hook 改写**前**的 source/target 检查；改写后的端点只重验存在性/自环/重复边（`validateEdgeConnection` 不含 maxIncoming/maxOutgoing/allowIncoming/allowOutgoing）。

推理链：配置 `beforeConnect` hook 把 target 从 A 改写为 B（hook 契约允许，types.ts:47-61 返回值即改写语义）→ 检查用旧 target A → B 的 `maxIncoming`/`allowIncoming` 未检查 → 可对 B 创建超限入边或给禁入节点接入边，产生违反配置约束的文档。

影响：宿主配置 hook 改写端点时约束被绕过，产出的文档违反声明的连接约束。

修复方向：把 44-67 行的端点约束检查移到 hook 改写之后（与 `validateEdgeConnection` 同阶段），对最终 source/target 检查一次。

---

## P2 风险

### F-05 `emit` 无监听器异常隔离，一个 listener 抛错中断后续事件与命令后半段（D5 错误处理）

位置：`packages/flow-designer-core/src/core.ts:144-148`。

```ts
function emit(event: DesignerEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}
```

问题：命令实现里 `pushHistory → emit(historyChanged) → emitMutation → emit(documentChanged) → updateDirtyState` 是序列（如 `core-node-commands.ts:75-79`）。任一 listener 抛异常：后续 listener 不再收到事件、命令剩余 emit 不执行，但 `doc` 已被 `setDocument` 修改 → 状态与事件流撕裂；`designer-store-adapter.ts:21-27` 的 cached 快照也因此停在过去值。design.md 13.1/14 要求事件与错误分层，未提及隔离，但这是事件总线的基础健壮性要求。

影响：单个坏订阅者（宿主集成常见）可让整个命令链半途断裂且难以定位。

修复方向：`emit` 内 try/catch 包裹每个 listener，异常转 `lifecycleHookError` 类事件或受控日志，不中断遍历。

### F-06 `deleteNodeCommand` 的 `beforeDelete` 改写 id 后无存在性复查，产生幽灵历史与假脏（D1 正确性）

位置：`packages/flow-designer-core/src/core-node-commands.ts:136-168`。

```ts
  const nodeIndex = ctx.doc.nodes.findIndex((n) => n.id === nodeId); // hook 改写前查询
  ...
  if (ctx.normalizedConfig.hooks?.beforeDelete) {
    ...
      nodeId = result.id;   // hook 可改写 id
  }
  ctx.setDocument(removeNodeFromDocument(ctx.doc, nodeId)); // 用改写后的 id 删除
```

问题：`removeNodeFromDocument` 总是返回新对象（spread + filter），即使 id 不存在、内容未变，`setDocument` 的引用比较也判为"已变更"→ revision+1、`pushHistory`、emit `nodeDeleted`/`documentChanged` → 一条什么都没删的历史记录 + dirty 假阳性。对照 `deleteEdgeCommand`（`core-edge-commands.ts:221-224`）在 hook 改写后重新 `findIndex` 复查，node 版本缺失同样的防护。另外 minInstances 检查（144 行）也在改写前针对旧 id，改写后可绕过。

影响：宿主 hook 改写返回不存在/受保护的 id 时，历史与脏状态被污染。

修复方向：与 edge 版本对齐——hook 改写后重新解析节点存在性与 minInstances，再决定是否继续。

### F-07 `pushHistory` 深拷贝失败（structuredClone 抛错）导致命令状态撕裂（D5 错误处理）

位置：`packages/flow-designer-core/src/core/clone.ts:3-8`；命令序列如 `core-node-commands.ts:75-79`。

```ts
function cloneValue<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}
```

问题：`GraphNode.data` 类型为 `Record<string, unknown>`，宿主 defaults/hook/inspector 写入的 data 若含函数、class 实例、DOM 引用等不可克隆值，`cloneDocument → structuredClone` 抛 `DataCloneError`。此时 `setDocument` 已完成（doc 已更新），`pushHistory` 抛异常向上冒泡：`documentChanged`/`dirtyChanged` 未发、history 未记录，调用方拿到异常但文档已变；`designer-store-adapter` 的 cached 停在旧值。tree 校验层有 `isJsonSafeTreePayload` 前置防护，graph 路径完全没有任何等价检查。

影响：特定 data 载荷下单次命令造成 doc/history/事件三者不一致。

修复方向：在 `addNode`/`updateNode` 输入边界校验或清洗 data（或 clone 失败降级 + 受控错误事件），不要让 pushHistory 的异常逃逸到命令中部。

### F-08 `copySelection` 多选时只复制 active 一个节点，剪贴板模型与批量选择模型脱节（D2 契约）

位置：`packages/flow-designer-core/src/core.ts:355-357`；`core/shell-controls.ts:42-51`；`designer-core-types.ts` 的 selection 含 `selectedNodeIds: string[]`。

```ts
function copySelection(): void {
  if (assertReadonly('copySelection')) return;
  shellControls.copySelection(selectionState.selectedNodeIds[0] ?? null);
}
```

问题：design.md 3.1 把 `copySelection / pasteClipboard` 归入"选择态和批量操作模型"，而实现只取 `selectedNodeIds[0]`。`setSelection`/`toggleNodeSelection` 支持多选（features.multiSelect 可开启，xyflow shift 多选拖动后 Ctrl+C）→ 粘贴只出现 1 个节点，其余静默丢失，且剪贴板不含任何边。另注意 `copySelection` 在 readonly 下被 `assertReadonly` 拒绝——复制是非破坏性操作，与 `toggleGrid`/`setViewport` 不设 readonly 的口径不一致。

影响：多选复制语义缺失（用户可感知），readonly 下连复制也被禁。

修复方向：剪贴板升级为 `{ nodes: GraphNode[], edges: GraphEdge[] }` 结构，粘贴时整体平移并重生成 id；readonly 放开 copy。

### F-09 design.md 声明的分支数/结构约束（maxBranches/minBranches/allowBranches/allowChild/isTerminal）在 core 内零执行（D2 契约）

位置：类型定义 `types.ts:114-122`；全包 grep 无任何执行点（`tree-structure.ts`、`tree-validation.ts` 均不检查）。

```ts
export interface TreeNodeTypeTreeConfig {
  allowBranches?: boolean;
  maxBranches?: number;
  minBranches?: number;
  allowChild?: boolean;
  isTerminal?: boolean;
  ...
}
```

问题：design.md 17.3 明确"分支数量受 `TreeNodeTypeConfig.tree.maxBranches` / `minBranches` 约束"。实际：`insertBranchPairInTree`（tree-structure.ts:234-261）不检查 `allowBranches`，且直接 `source.branches = branches` **覆盖已有分支及其全部子树**；`addBranchInTree`（286-305）不检查 `maxBranches`；`insertChainNodeInTree`（196-213）不检查 `isTerminal`/`allowChild`。`validateTreeDocument` 也不做这些结构校验。renderers 层同样无 `maxBranches` 引用。约束目前纯粹是类型装饰。

影响：对已有分支的节点再次调用 `insertBranchPair` 会静默丢弃现有分支子树（数据丢失路径）；配置了分支数上限/终态节点的宿主约束全部失效。

修复方向：在 `tree-structure` 各写操作前检查节点类型 tree 配置；`insertBranchPair` 遇已有 branches 时返回 `constraint` 失败而非覆盖；或在 `validateTreeDocument` 统一强制并在文档中更新契约。

### F-10 tree 模式 `rollbackTransaction` 恢复了树但不发 `treeChanged`，宿主写回链路失联（D1 正确性）

位置：`packages/flow-designer-core/src/core.ts:552-580`。

```ts
    transactionStack = result.stack;
    replaceDocument(result.snapshotBefore, getCurrentRevision(historyState) ?? docRevision);
    if (result.treeSnapshotBefore) {
      currentTreeDocument = cloneTreeDocumentValue(result.treeSnapshotBefore);
    }
    ...
    emit({ type: 'documentChanged', doc });
    emit({ type: 'historyChanged', ... });
```

问题：rollback 恢复 `currentTreeDocument` 后只 emit document/history/dirty。而 renderer 侧唯一把 core 树变化写回宿主的通道是 `treeChanged` 事件（`designer-tree-mode.tsx:97-102` 订阅后 `session.enqueueTreeChange`）。undo/redo/restore 都补发了 `emitTreeChanged(..., 'undo'|'redo'|'restore')`，rollback 漏发。

影响：tree 模式触发 `designer:rollbackTransaction` 后，core 内树已回滚、宿主持久化树仍是回滚前状态，两者漂移（后续一次 undo 的 treeChanged 会造成跳变）。

修复方向：rollback 分支在恢复 tree 后同样 `emitTreeChanged(emit, currentTreeDocument, 'restore')`（或新增 'rollback' reason 并同步 renderer 过滤逻辑）。

### F-11 readonly 下 `layoutNodes` 直接改 doc 且不发 `documentChanged`，快照链路过期（D1 正确性）

位置：`packages/flow-designer-core/src/core.ts:488-493`。

```ts
if (isReadonly) {
  doc = nextDoc;
  emit({ type: 'viewportChanged', viewport: shellState.viewport });
  return;
}
```

问题：readonly 分支绕过 `setDocument`（revision 不变，可接受）但只 emit 了 `viewportChanged`——viewport 并没有变。依赖事件刷新的 `designer-store-adapter` cached 快照不会更新，`getSnapshot()` 对订阅者永远返回布局前的旧 doc；同时 readonly 文档的节点位置被实际修改，与 readonly 语义冲突（position 是 GraphDocument 持久化字段，见 design.md 6.1）。

影响：readonly 画布触发自动布局后 UI 数据源过期；readonly 保障出现缺口。

修复方向：readonly 下拒绝 layoutNodes（返回失败原因）或至少 emit `presentationChanged`/`documentChanged` 并明确该子语义。

### F-12 `elk-layout.ts` 模块级单例 ELK 实例 + `sideEffects: false` 声明冲突，多实例共享主线程引擎（D6 性能 / D8 结构）

位置：`packages/flow-designer-core/src/elk-layout.ts:4`；`package.json:5`。

```ts
import ELK from 'elkjs/lib/elk.bundled.js';
...
const elk = new ELK();
```

问题：a) `elk.bundled.js` 是无 worker 的主线程实现，多个 designer 实例的 layout 请求在同一实例上串行阻塞主线程，与 canvas-adapters.md"instance-owned"的 ELK 请求模型（owner 已实例化，引擎未隔离）不完全对齐；b) 包声明 `"sideEffects": false`，而导入该模块即执行 `new ELK()` 的顶层副作用，tree-shaking 语义与实际不符（消费者仅 import 类型/其它导出时打包器可能提前或延后实例化，行为不确定）。另 `layoutWithElk` 对 `elk.layout` 的 rejection 无捕获，错误处理完全依赖调用方。

影响：大图布局阻塞所有并发 designer 实例；打包语义隐患。

修复方向：改为惰性工厂（`getElkEngine()`）或每次 layout 创建/复用可注入实例；核对 sideEffects 声明。

---

## P3 提示

### F-13 `core-shell-commands.ts` 是无人引用的死代码（D8 结构）

`packages/flow-designer-core/src/core-shell-commands.ts`（102 行）与 `core/shell-controls.ts` 功能重复（copy/paste/grid/palette/inspector/viewport），src 内零 import（仅 dist 构建产物）。两份同构实现意味着任何 shell 行为修改要改两处（F-01 即两处同病）。建议删除。

### F-14 空 `beginTransaction` + `commit` 也会 push 一条相同内容的幽灵历史（D1）

`core/transactions.ts:34-77` 的 `shouldPushHistory` 只看栈是否清空，不看文档是否变更；`pushHistoryEntry` 无条件 append。begin 后立即 commit → history 多一条内容相同的 entry → 用户按 undo "无反应"一次。建议 commit 时对比文档引用/revision 是否变化再 push。

### F-15 `generateId` / `createTreeNodeId` 非加密随机，碰撞面存在（D1）

`core/clone.ts:10-12`（`Date.now()-7 位 base36`）与 `tree-structure.ts:64-66`（`seed:6 位`）。同毫秒批量 paste 数百节点时生日碰撞概率约 1e-5 量级，一旦碰撞会产生重复 id 文档（graph 侧无 duplicate-id 校验，tree 侧才有）。建议换 `crypto.randomUUID()`。

### F-16 `normalizeConfig` 对重复 nodeType/edgeType id 静默后者覆盖（D5）

`core/config.ts:4-5` 的 `new Map(config.nodeTypes.map(...))`。config normalize 错误（design.md 14 的错误分层第一类）目前完全缺位：无重复 id、无未知引用（palette.groups.nodeTypes 指向不存在类型）检查。

### F-17 事件命名漂移：`nodes:moved` / `nodes:updated` vs design.md 13.1 事件清单（D2）

`types.ts:366-367` 与 `core-node-commands.ts:182, 198` 使用 `nodes:moved`/`nodes:updated`（冒号命名空间风格），文档清单是 `nodeMoved` 等（与现有 `nodeMoved` 单节点事件并存于同一联合类型）。两套风格并存易让订阅者漏听。

### F-18 `deleteBranchInTree` / `deleteNodeRecursive` 的失败 reason 语义失真（D1）

`tree-structure.ts:314-319`：分支存在但低于保底数量时返回 `'missing-node'`（应为 `constraint`）；`deleteNodeRecursive` 对有分支的 child 返回 false 映射为 `missing-node`。调用方无法区分"目标不存在"与"目标不可删"。

### F-19 `relayoutTree` 不检查 readonly 且用全量 `JSON.stringify` 对比幂等（D6）

`tree-session-impl.ts:299-321`：对比 `runTreeCommand` 的 readonly 拒绝口径不一致；`JSON.stringify({nodes, edges})` 全量对比与 design.md 12.4"避免每次 JSON.stringify 全文档比较"精神相悖（一次性操作，量级可接受）。

### F-20 `replaceTreeFromHost` 成功后不发 `treeChanged`（D2 suspect）

`tree-session-impl.ts:243-297`。host 驱动的替换由调用方自知，且 renderer session 的 epoch 检查在自身状态上（`tree-session.ts:345-366`），core 的 epoch 只做格式校验不做单调性/冲突判断（`'tree-host-conflict'` 错误码定义了但 core 未用）。当前链路自洽，但 core API 防护依赖调用方纪律，集成方直接调 `core.replaceTreeFromHost` 可乱序回放。标注 suspect：若 future 集成绕过 session 层需要补 core 级 epoch 单调检查。

### F-21 `cloneTreeValue` 手写克隆对 `Date`/`Map` 等非 JSON 值损坏（`Date → {}`）（D1）

`tree-structure.ts:13-25`：`Object.entries(new Date())` 为空 → 变成 `{}`。与 JSON round-trip（Date → ISO string）行为不一致。tree 文档有 `isJsonSafeTreePayload` 前置校验兜底，graph 文档无校验（见 F-07）。

### F-22 `duplicateNode`/`pasteClipboard`/`addNode` 的 data 浅合并导致新旧节点共享嵌套引用（D1）

`graph-command-gate.ts:128-132` 把 `source.data` 直传，`core-node-commands.ts:72` `data: { ...nodeType.defaults, ...data }` 只做顶层合并。core 自身全部不可变更新所以内部安全，但宿主/hook 原地修改嵌套对象会同时污染复制源与副本、剪贴板。建议在 duplicate/paste 入口做 `structuredClone(data)`。

### F-23 snapshot 的 activeNode/activeEdge 用线性 `find`（D6）

`core/snapshot.ts:71-76`：doc 每次变更后 `getSnapshot` 对 nodes、edges 各一次 O(n) 扫描；1000+ 节点下叠加高频 documentChanged（参见 F-01 放大）值得换 id 索引。design.md 12.3 已建议维护邻接/lookup 索引，`countIncomingEdges`/`countOutgoingEdges`（constraints.ts:11-17）同样每次 addEdge 全表扫描，与文档的"邻接索引"建议未落地。

### F-24 超 500 行文件评估线（D8）

`tree-projection.ts` 680 行、`core.ts` 672 行、`types.ts` 510 行，超过 AGENTS.md"500 行应评估提取"线，但均低于 `check:oversized-code-files` 的 700 行红名单阈值（scripts/check-oversized-code-files.mjs:12），无未登记红。`core.ts` 同时承担 graph core 工厂 + tree session 装配 + shell 命令转发，后续增长会先触碰 700 线，建议把 tree session 装配段（635-670 行）独立模块。

### F-25 `undo`/`redo` 在事务进行中未被拒绝，语义未定义（D1）

`core.ts:309-353`：事务中 undo 会 `replaceDocument` 到历史项，而事务栈的 `snapshotBefore` 仍是旧值，随后的 `rollbackTransaction` 会再次覆盖文档，事件序列交叉。当前 renderers 不产生该组合，建议在事务深度 > 0 时拒绝并返回原因（与 `commitTransaction` 的 `unavailable` 语义对齐）。

---

## 检查过程记录

1. 通读 `docs/architecture/flow-designer/design.md`（684 行）、`collaboration.md`、`canvas-adapters.md`，建立契约基线（事务边界 10.1、端口校验顺序第 8 节、性能策略 12.x、tree mode 17.x、ELK/plus-button 实例所有权）。
2. 读 `package.json`（依赖 flux-core、elkjs，peer zustand）与 `src/` 结构（29 个非测试文件、5583 行），确认无 React 依赖，符合 design.md 3.1"纯图运行时"边界。
3. 全量精读 29 个源文件：`core.ts`、`core/`（history/clone/transactions/snapshot/selection/selection-controller/shell-state/shell-controls/node-operations/edge-operations/constraints/config/config-migration/viewport/graph-command-gate）、`core-node-commands.ts`、`core-edge-commands.ts`、`core-shell-commands.ts`、`designer-core-types.ts`、`types.ts`、`index.ts`、`adapters/designer-store-adapter.ts`、`elk-layout.ts`、`tree-domain.ts`、`tree-session-impl.ts`、`tree-projection.ts`、`tree-structure.ts`、`tree-validation.ts`。
4. 交叉验证 renderers 调用链（只读）：`use-xyflow-interactions.ts`（确认 moveNode 仅 drag-stop 提交、viewport 无节流）、`designer-xyflow-canvas.tsx`（onMove 每帧绑定）、`designer-canvas.tsx`（dispatch 路径）、`designer-command-adapter*.ts`（事务仅用于 deleteSelection；tree 命令逐条直调；setViewport 无缓冲）、`designer-tree-mode.tsx` + `tree-session.ts`（treeChanged 是唯一宿主写回通道；epoch 单调检查在 session 层）。据此对 F-01 定级 P0、F-02 定级 P1（潜伏）、F-20 降为 suspect。
5. 反误报核验：a) `pushHistoryEntry` 的 `slice(1)` 裁剪与 historyIndex 不自增的组合经数值推演确认正确；b) `checkMinInstances` 的 `>` 比较语义正确；c) tree-projection.ts:324-327 的 split 线 clamp 使用 `SPLIT_HALF_GAP_MIN_TB`（未按 LR 切换）经代数推演确认所有路径结果折叠为 `A + splitGap/2`，方向常量被对称抵消，无行为差异——降级为不报（误导性死复杂度，不构成缺陷）；d) rollback 的 `getCurrentRevision` 语义推演正确。
6. 红名单核对：`scripts/check-oversized-code-files.mjs` 阈值 700 行，本包最大文件 680 行，`docs/logs/2026/08-06.md` 登记的 14 文件红名单不含本包，D8 无未登记命中。
7. 未运行任何 pnpm 命令、未修改 packages/ 下任何文件；本报告为唯一产出文件。
