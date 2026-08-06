# Flow Designer Tree Mode

## Purpose

本文档定义 Flow Designer 的 tree 模式——一种与 graph 模式并列的结构化流程树（structured process tree）文档结构，用于描述链式序列、扇出分支，以及分支组隐含 merge 后继续流向下游 `child` 的流程配置。

Use it when you need to:

- 理解 tree 模式的数据模型和结构原语
- 为新的 domain（钉钉工作流、逻辑决策树、规则引擎等）编写 tree 配置
- 理解 structured process tree 如何投影为 React Flow 可渲染的 nodes + edges
- 判断某个 domain 应该使用 tree 模式还是 graph 模式

## Position

- `docs/architecture/flow-designer/design.md` 拥有 Flow Designer 的整体分层架构
- `docs/architecture/flow-designer/config-schema.md` 拥有 GraphDocument、NodeTypeConfig、EdgeTypeConfig 的完整定义
- 本文档只定义 TreeDocument 数据模型、隐含 group merge 语义、单一 tree projection（tree → graph 投影）、以及 tree 模式的 host session 协议
- tree 模式复用 graph 模式的 NodeTypeConfig 渲染能力和 EdgeTypeConfig 边样式，不引入新的渲染概念

## Core Claim

Tree 模式和 graph 模式共享同一个 React Flow 画布，但 DingFlow 一类 tree domain 不是“任意树”，而是更窄的 structured process tree：

- **graph 模式**：用户自由创建 nodes 和 edges，表达任意有向图
- **tree 模式**：数据是结构化流程树（链式 `child` + 扇出 `branches` + branch-group 隐含 merge），通过唯一投影层展平为 nodes + edges 后喂给 React Flow

两者在渲染层都表现为 `GraphNode[]` + `GraphEdge[]` → React Flow，但交互语义不同：

- graph 模式允许自由创建和重连 edges
- tree 模式必须通过结构化命令编辑 sequence、branch group 和 continuation，不应把 React Flow 暴露成自由 graph 编辑器

**唯一布局算法**：tree mode 的全部路径（初始 mount、每次结构命令、host 替换、显式 relayout）只调用一个 core-private 的 `projectAndLayoutTree()`。ELK 只服务 graph mode，tree mode 不再调用 ELK 或任何图启发式布局。

### Branch Selection

tree mode 还允许一种 graph mode 没有的结构选择：branch-level selection。

约束：

- branch selection 只在 `documentMode === 'tree'` 时存在
- branch 不是独立持久化 graph node，因此 branch selection 不是 `activeNode` 的替代品，而是附着在 branch owner 之下的结构选择
- 当 `activeBranchId` 存在时，`activeNodeId` 必须指向拥有该 branch group 的 branch owner
- `activeBranch` 是 branch header summary（`id`、`data`、first child summary），不是 branch subtree 的完整副本
- inspector / toolbar / schema actions 可以同时读取 `activeNode` 和 `activeBranch`，前者表示当前 branch owner，后者表示当前 branch focus

## Structural Primitives

structured process tree 的全部拓扑只需要 3 个显式结构字段，加 1 个隐含结构语义：

```
TreeNode
├── child?: TreeNode            # 链式序列：下一个节点
└── branches?: TreeNodeBranch[] # 扇出分支：从当前节点展开 N 条子树
    └── each: TreeNodeBranch
        └── child?: TreeNode    # 该分支的子树（缺失 = 合法空分支 → 虚拟 slot）

implicit merge(branches)        # 整个 branch group 汇合后，再流向当前节点的 downstream child
```

| 原语                   | 含义                                        | 对应可视化                                 |
| ---------------------- | ------------------------------------------- | ------------------------------------------ |
| `child`                | 链式序列，A → B → C                         | 纵向/横向直线连接                          |
| `branches`             | 从一个节点扇出 N 条分支                     | 分叉连接                                   |
| `TreeNodeBranch.child` | 每条分支独立的子树（可选）                  | 分支内的纵向序列；缺失时投影为虚拟 slot    |
| implicit group merge   | 分支组结束后隐含汇合到单一下游 continuation | 汇合线 / merge overlay，不一定是持久化节点 |

这 3 个原语足以描述：

- **钉钉审批流**：发起人 → 审批 → 条件/并行分支组 → 隐含汇合 → 抄送 → 结束
- **Action flow**：主链 → parallel 扇出 → then/onError 条件扇出 → 继续
- **逻辑决策树**：根决策 → 条件分支 → 子决策 → 叶子动作
- **规则引擎**：规则集 → 规则分支 → 动作

所有领域差异通过 `data: Record<string, unknown>` 承载，DSL 不解释审批、路由或执行语义本身；DSL 只拥有 structured branch group 与隐含 merge 语义。

## Data Model

### TreeDocument

```ts
interface TreeDocument {
  id: string;
  kind: string; // 域标识："dingtalk-workflow", "action-flow", "decision-tree"
  name: string;
  version: string; // canonical "1.0.0"（"1.0" 会在入口规范化为 "1.0.0"）
  meta?: Record<string, unknown>;
  root: TreeNode;
}
```

### TreeNode

```ts
interface TreeNode {
  id: string;
  type: string; // → NodeTypeConfig.id
  data: Record<string, unknown>;

  // 结构字段
  child?: TreeNode;
  branches?: TreeNodeBranch[];
}
```

### TreeNodeBranch

```ts
interface TreeNodeBranch {
  id: string;
  data: Record<string, unknown>; // label, condition, priority, branchType… 全部放 data
  child?: TreeNode;
}
```

`TreeNodeBranch.child` 可选：缺失表示尚未配置 child 的合法 draft branch，投影为虚拟 empty slot。

### 设计决策

| 决策                                    | 理由                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `branches` 是 `TreeNode` 的字段         | 树形语义中分支从属于分叉节点，不是独立实体                                                             |
| 分支汇合是隐含语义，不是必需持久化节点  | DingFlow / structured concurrency 的 continuation 天然是“branch group 结束后回到单一下游 continuation” |
| `data` 类型为 `Record<string, unknown>` | DSL 不绑定任何领域语义；condition、mode、priority 等全部是领域数据                                     |
| 没有 `parent` 反向引用                  | 纯树结构不需要；跨引用（route jump）在 `data` 层面用 id 处理                                           |
| `TreeNodeBranch` 没有 `type` 字段       | 分支项的身份由所属的 `TreeNode` 和 `data` 决定                                                         |
| 不设 `BranchMode` 枚举                  | 排他/并行/包容是执行语义，不是可视化结构，放 `data`                                                    |
| 空分支保留 `child?` 语义                | 空分支是合法 draft 状态；投影为虚拟 slot + 连通 merge，不产生 phantom owner edge                       |

## Config Extensions

Tree 模式复用现有 `NodeTypeConfig`（body、inspector、createDialog、appearance）的全部能力，仅增加结构约束。

`NodeTypeConfig.body` 内的 flex / text / icon 节点可直接书写 `data-slot` 与任意 `data-*` 属性（如 `data-node-variant`），渲染器会原样转发到 DOM 根元素（见 `docs/architecture/renderer-markers-and-selectors.md`「Schema-Authored Data Attributes」节），供配套 CSS（如 playground 的 `flow-designer-nodes.css`）按 `[data-slot='dt-node'][data-node-variant='approval']` 选择器做 schema 驱动的卡片视觉。terminal 节点（`tree.isTerminal`）不渲染 body，走内置圆点+标签形态。

### DesignerConfig 扩展（版本 1.1.0）

```ts
interface DesignerConfig {
  // ...existing fields...

  documentMode?: 'graph' | 'tree';

  treeConfig?: {
    layout: {
      direction: 'TB' | 'LR'; // Top-Bottom (钉钉) 或 Left-Right
      nodeSpacing: number; // 非负整数
      layerSpacing: number; // 期望值而非绝对值；低于安全下限时按 60/134/204/120 生效
    };
    showGatewayNodes: boolean; // 保留字段（当前未实现展示）
    showMergeNodes: boolean; // 保留字段（当前未实现展示）
    chainEdgeType?: string;
    branchEdgeType?: string;
    mergeEdgeType?: string;
    emptyBranchSize?: { width: number; height: number }; // 默认 220×80；TB ≥120×52，LR ≥140×32
  };
}
```

- `treeConfig.autoLayout` 已删除（legacy `1.0.0` 配置迁移时移除）；structured tree layout 在 tree mode 是**必选投影步骤**，`layerSpacing` 是期望值而非绝对值。
- 版本迁移：`1.0` / `1.0.0` → `1.1.0`；新 config authoring/export 使用 `1.1.0`。

### NodeTypeConfig.tree

```ts
interface NodeTypeConfig {
  // ...existing fields...
  tree?: {
    allowBranches?: boolean; // 该类型是否允许扇出分支
    maxBranches?: number; // 最大分支数
    minBranches?: number; // 最小分支数（如果允许 branches）
    allowChild?: boolean; // 是否允许链式子节点
    isTerminal?: boolean; // 叶节点，不可有 child
    branchEdgeType?: string; // 该类型节点的分支边样式覆盖全局
    layoutSize?: { width: number; height: number }; // 固定布局 footprint（有限正整数）
  };
}
```

- `layoutSize` 是 tree mode 的权威节点 footprint；兼容期回退 `appearance.minWidth/minHeight`（已标记 deprecated），再回退 220×80。仓库内所有 tree 示例必须显式 author `layoutSize`。
- `TreeNodeTypeConfig` 保留为 deprecated type alias，normalized nodeTypes 使用统一 `NodeTypeConfig`。
- 无效 `layoutSize` / `emptyBranchSize` 使整个投影返回 `invalid-layout-size`，不静默修正。

### 边样式配置

Tree 模式的边由结构隐含生成（不是用户手动画的），但样式需要可配置：

```ts
interface DesignerConfig {
  treeConfig?: {
    // ...
    chainEdgeType?: string; // child 链式连接引用的 EdgeTypeConfig.id
    branchEdgeType?: string; // branches 扇出连接引用的 EdgeTypeConfig.id
    mergeEdgeType?: string; // 分支汇合连接引用的 EdgeTypeConfig.id
  };
}
```

查找优先级：`NodeTypeConfig.tree.branchEdgeType` > `treeConfig.branchEdgeType` > 默认。

**DingFlow tree edge 禁止**：`markerEnd`、`animated`、schema label/body、`defaults` 中的 label/body，以及 `strokeDasharray`（dashed/dotted 均不受支持）。edge type 只允许 `stroke` / `strokeWidth` / `strokeStyle`（仅 solid）/ `color`。`TreeNodeBranch.data.label` 是合法分支数据，不视为 edge label。违规返回 `unsupported-tree-edge-decoration`。

**分支线标签**：split edge 渲染时若 `edge.data.label`（来自 `TreeNodeBranch.data.label`，投影时合并进 edge data）为非空字符串，`DingFlowEdge` 在水平线段中点渲染钉钉式标签 pill（白底、`#15bc83` 绿字/边框、rounded-full、max-width 160px 单行截断、`pointer-events: none`）。TB 布局标签位于 split 线上方居中（x=边中点、y=lineMain），LR 布局位于竖直分割线右居中（x=lineMain、y=边中点）。chain/merge 边不渲染标签。

**features 接线**：`DesignerFeatures.minimap` / `DesignerFeatures.controls` 控制画布 MiniMap 与 Controls 的显隐（缺省 true，`false` 显式关闭），由 `designer-canvas` 从 `config.features` 传给画布。Controls 使用 React Flow `position="top-left"`（画布左上角），MiniMap 默认右下角；定位用组件原生 prop，不用 CSS 覆盖（react-flow 面板规则无 layer，会击败 `@layer utilities` 内的定位规则）。

## Tree Projection

Tree → React Flow 的投影是 tree mode 的核心桥梁，且是**唯一**桥梁。

### 投影算法概要

```
TreeDocument
  → projectAndLayoutTree(tree, normalizedConfig)   // core-private，单一入口
  → { ok: true, view: { tree, document } } | { ok: false, error }
  → React Flow 渲染
```

一次确定性调用完成：

1. 校验/规范化 tree（JSON-safe payload、duplicate/reserved ID、unknown type、cycle、size/spacing）
2. 递归测量 subtree（main/cross 轴抽象）
3. 递归放置 node 与虚拟 branch slot（固定 footprint、整数锚点）
4. 生成 projected nodes/edges，并为每条边写入只读 runtime 几何 `__fdTree`
5. 校验 tree edge decoration 白名单

`projectAndLayoutTree` 不是 root export；renderer 只能通过 `createTreeDesignerCore`、tree commands、`replaceTreeFromHost` 与 `relayoutTree` 间接触发。`createDesignerCore(GraphDocument, …)` 收到 `documentMode: 'tree'` 时抛 `tree-core-factory-required`。

### Hidden Group Merge

当节点同时拥有 `branches` 和 `child` 时，`child` 不是某一条 branch 的直接 child，而是整个 branch group 的 continuation：

```text
source
  ├─ branch A subtree ─┐
  ├─ branch B subtree ─┤
  └─ branch C subtree ─┘
            ↓
        implicit merge
            ↓
        source.child
```

这意味着：

- 分支叶子到 continuation 的 merge 边是投影结果，不是用户自由画出来的结构
- merge overlay / merge add button 是 branch group 的 UI affordance，不代表持久化 graph 节点
- tree mode 不应向用户暴露“任意给两个节点加一条边”来制造 merge

### 展平规则

```
visit(node):
  emit GraphNode(id=node.id, type=node.type, data=node.data)

  if node.branches:
    for each branch:
      if branch.child: visit(branch.child) + emit split edge node→branch.child
      else:            emit 虚拟 slot node + emit split edge node→slot
    if node.child:
      for each branch leaf/slot: emit merge edge leaf→node.child
      visit(node.child)
  else if node.child:
    emit chain edge node→node.child
    visit(node.child)
```

虚拟 slot：

- ID namespace：`__fd_internal__/slot/<owner>/<branch>`；输入校验拒绝业务 ID 使用该前缀
- node type：`__fd-tree-empty-slot`；data 固定 `{ __fdVirtual: 'empty-branch', ownerId, branchId }`
- 使用 `treeConfig.emptyBranchSize`（默认 220×80；TB ≥120×52，LR ≥140×32）
- owner→slot 生成 split edge；存在 continuation 时 slot→continuation 生成 merge edge；绝不产生 phantom owner→continuation merge edge
- slot 由 renderer 内建组件渲染（`unknown-node-type` 校验的唯一豁免类型），不可作为 active business node；点击 affordance 打开 `DingFlowAddNodeMenu`，选择经 defaults/createDialog/submitAction 成功后 dispatch `insertBranchChild`

### 布局

tree mode 的布局是**投影的一部分**，不是独立增强层。算法使用轴抽象而不是写死 `x/y`：

- `cross`: 横向展开轴（`TB` 时等价于 `x`；`LR` 时等价于 `y`）
- `main`: 主流程推进轴（`TB` 时等价于 `y`；`LR` 时等价于 `x`）

#### 安全间距公式

- `MIN_CHAIN_GAP = 60`（`BTN_CENTER_DIST 36 + BTN_DIAMETER/2 14 + HANDLE_SIZE/2 6 + CONTROL_CLEARANCE 4`）
- `MIN_SPLIT_GAP(TB) = 134`、`MIN_SPLIT_GAP(LR) = 204`（split half-gap 67/102）
- `MIN_MERGE_GAP = 2 * (36 + 14 + 8 + ceil(maxGroupStrokeWidth/2))`，默认组按 focused 3px → 120
- 生效间距：`max(config.layerSpacing, 下限)`；layerSpacing 低于下限时 ordinary chain=60、TB split=134、LR split=204、merge=120
- split/merge 线使用各自所在间隙的中点；所有坐标最终 `Math.round()`

#### Measurement Pass

先递归测量每棵子树占用的包围盒（固定 footprint + 生效间距）。

#### Placement Pass

测量完成后再递归放置：

```text
place(node, crossStart, mainStart, allocatedCross):
  place node itself at the center of allocatedCross

  if no branches and has child:
    place child centered below node (chainGap)

  if has branches:
    branchesSpan = total measured width of all branch columns
    branchCrossCursor = center(branchesSpan within allocatedCross)
    for each branch: place branch subtree in its own column; empty branch → slot
    branchBottom = max(bottom of every branch subtree)
    if continuation exists:
      place continuation centered below the full branch group (mergeGap)
```

因此 continuation 的对齐基线是“整组 branches 的包围盒中心”，不是任一条 merge edge 的几何平均值。

#### Resulting Invariants

- chain child 一定沿 `main` 轴继续推进
- sibling branches 一定共享同一 branch row 起点
- 同组所有 split edges 共享同一 `splitMain`；同组所有 merge edges 共享同一 `mergeMain`；二者不同
- merge 横向/纵向段位于整组 branch subtree 之后，不穿节点
- branch owner 的 continuation 一定在所有 branch subtree 的最下方之后
- nested branch group 必须完全落在其所属 branch column 内部
- `TB` 和 `LR` 只是轴映射不同，结构算法相同
- 除允许交集白名单（自身源/目标端点、同组共享 stem、node-attached + 与其 own stem、add-condition pill 与 split 线、merge + 与 continuation stem、slot 内部包含）外，节点/控件/连线零正面积相交

### Runtime Geometry（`__fdTree`）

每条 projected edge 携带只读 runtime 几何，供 DingFlow 渲染层使用：

```ts
interface TreeEdgeRuntimeGeometry {
  kind: 'chain' | 'split' | 'merge';
  direction: 'TB' | 'LR';
  ownerId?: string;
  branchId?: string;
  continuationId?: string;
  lineMain?: number; // split/merge 共享线
  fanoutCross?: number;
}
```

- `__fdTree` 是保留 runtime projection data：内部 snapshot/activeEdge/edge binding 可观察，但不属于 TreeDocument/domain data；tree mode 禁止 `updateEdgeData` 写入
- graph export 保持原 GraphDocument；tree export 序列化 `currentTreeDocument`，不含 `__fd*` 或虚拟节点
- host projection（`designer-host-projection.ts`）剥离虚拟节点及其 incident edges、`__fd*` 与 stale selection，counts 从 sanitized business graph 重算

### 反向：Graph → Tree

编辑操作在 tree 层面操作 TreeDocument，不需要从 graph 反向重建 tree。投影是单向的：

```
编辑命令 → core tree command → projectAndLayoutTree → 原子替换配对 view → 更新 React Flow
```

## Tree Core Session And Host Writeback

### 工厂

```ts
createTreeDesignerCore(initialTreeDocument, config, options): TreeCoreCreationResult
//  = { ok: true, core: DesignerCore } | { ok: false, error: TreeProjectionError }
```

- 工厂唯一调用 config migration + `projectAndLayoutTree`；失败返回结构化 error，不创建 error core
- 初始化 history/saved baseline **之前**安装验证 pair
- `DesignerCore` 是 session draft owner；domain model 仍是最终持久化 owner

### Host 协议

schema 字段：`treeDocument`、`treeDocumentEpoch`、`treeDocumentAckSessionId`、`treeDocumentAckDispatchId`、`treeDocumentChangeAction`。

- 每个 tree renderer mount 生成不可复用 UUID `treeDocumentSessionId`
- 所有会改变 tree 的 command / undo / redo / restore 创建有序 writeback item；renderer 严格串行 dispatch：只有队首收到 host acknowledgement 后才发送下一项
- pending FIFO 最多 32 项（`{dispatchId, tree, digest, sourceCommandCount}`）；相邻 deep-equal 文档去重
- 有界 `locallyEmittedDigests` LRU（最多 256 个 digest）；epoch 缺省时 delayed echo 仅覆盖该窗口，超出窗口的 host 回显必须提供严格递增 epoch
- 队列满时合并最新 draft 到单个 `coalescedUnsentTree` 并报告一次 `tree-host-backpressure`；容量释放后 coalesced 项追加到 FIFO 尾部，绝不越过队首
- host epoch **优先**：有效且严格大于 `lastAcceptedHostEpoch` 时先验证/migrate/project，再原子替换 pair、清空 pending/coalesced、重置 history/saved baseline
- 仅 epoch 缺省或 `<= lastAcceptedHostEpoch` 时使用 ack 规则：sessionId + 队首 dispatchId + digest 三者匹配才移除队首；旧 session/较小 dispatchId 为 stale no-op；当前 session 更大 ID 或 digest 不匹配返回 `tree-host-invalid-ack`
- 无 ack 字段时，deep-equal current/stale-digest echo 兼容；其余不同 prop 返回 `tree-host-conflict`
- host 不提供 change action 时不建立 pending 队列；session 内编辑/save/export 仍可用，但不同 host prop 仍需 epoch 严格增长才能替换
- action completion 使用 `flux-action-core` 的 canonical `classifyActionResult`：success 保留队首等 ack；neutral/cancelled/failure 移除队首（不重试），分别报告 info/info/error host issue
- 每次 dispatch 捕获 `sessionGeneration`；epoch replacement / ack / unmount / key remount 使旧 generation 失效，旧 completion 完全 no-op
- `save`、`relayout`、初始 load 不发 change action

### 结构命令

tree mode 下这些 graph mutation 全部被 core gate 拒绝（no-op / null / `unavailable` + `mutationRejected` 诊断）：`addNode`、`updateNode`、`moveNode`、`moveNodes`、`updateMultipleNodes`、`duplicateNode`、`deleteNode`（graph）、`addEdge`、`reconnectEdge`、`updateEdge`、`deleteEdge`、`pasteClipboard`、`layoutNodes`、`replaceDocument`、`replaceDocumentFromHost`。

允许的结构动作（core tree 命令）：

- `insertChainNode(sourceId, nodeType, data?)`
- `insertChainNodeAtMerge(targetId, nodeType, data?)`
- `insertBranchPair(sourceId, condNodeType, condData?)`
- `addBranch(nodeId, branchData?, childType?, childData?)`
- `deleteBranch(nodeId, branchId)`（受最小分支数约束）
- `moveBranch(nodeId, branchId, direction)`
- `deleteTreeNode(nodeId)`（结构重写矩阵）
- `updateTreeNodeData(nodeId, data)`
- `updateBranchData(nodeId, branchId, data)`
- `insertBranchChild(ownerId, branchId, nodeType, data?)`（仅空分支成功）
- `relayoutTree()`（presentation-only：不 push history、不设 dirty、不发 change action；坐标变化仅发 `presentationChanged`）

`deleteTreeNode` 重写矩阵：

| 目标上下文                                | 结果                                                      | 失败           |
| ----------------------------------------- | --------------------------------------------------------- | -------------- |
| root                                      | 永远拒绝                                                  | `constraint`   |
| 普通 chain node（无 branches）            | 用其 `child` 替换它在 parent 的 child 引用                | `missing-node` |
| branch subtree 内普通 node（无 branches） | splice 到所属 branch/parent；branch 首节点删除后变空 slot | `missing-node` |
| branch owner（有 branches）               | 永远拒绝                                                  | `constraint`   |
| continuation node 且无 branches           | 普通 chain splice；不触碰 owner 的 branches               | `missing-node` |
| virtual empty slot                        | 不是业务 TreeNode；删除由 `deleteBranch` 完成             | `unavailable`  |

## DesignerPageSchema 扩展

```ts
interface DesignerPageSchema {
  type: 'designer-page';
  id?: string; // key 变化触发 remount 并使用新 config
  title?: string;

  // 二选一
  document?: GraphDocumentInput; // graph 模式（现有）
  treeDocument?: TreeDocumentInput; // tree 模式（新增）

  treeDocumentEpoch?: number; // 有限非负整数
  treeDocumentAckSessionId?: string;
  treeDocumentAckDispatchId?: number;
  treeDocumentChangeAction?: ActionSchema | ActionSchema[];

  config: DesignerConfig;
  readOnly?: boolean;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
}
```

- `treeDocumentChangeAction` 完整进入 authoring/compile surface：TypeScript schema、renderer definition prop contract、formal validation、resolved prop bindings、action failure host issue
- action dispatch bindings：`{ treeDocument, reason, commandType?, sessionId, dispatchId }`；`reason` 冻结为 `'command' | 'undo' | 'redo' | 'restore' | 'coalesced'`
- mounted session 的 config 冻结为首次 resolved config snapshot；后续 prop config 变化不热应用，仅当 designer-page `key`/`id` 改变时 remount
- 非法 epoch/ack 返回 `invalid-tree-document-epoch` / `invalid-tree-document-ack`，不替换 pair

## Domain Examples

Tree DSL 本身不解释领域语义。以下是不同 domain 如何复用同一套结构原语：

### 钉钉工作流 (`kind: "dingtalk-workflow"`)

- `data` 放审批模式、审批人、条件表达式、超时策略等
- `branches` 上的 `data.conditionList` 表达 OR-of-ANDs 条件
- `data.mode` 表达排他/并行/包容（执行语义，设计器不关心）
- 完整示例见 `docs/examples/dingtalk-workflow-tree.md`

### Action Flow (`kind: "action-flow"`)

- `data` 放 action name、args、when、retry、timeout 等
- `branches` 上的 `data.branchType` 区分 `then` / `onError` / `parallel`
- `then`/`onError` 本质上是条件分支扇出——运行时根据 ActionResult 类别走其中一条
- Lowering 规则：tree → `ActionSchema` JSON，见 `docs/examples/action-flow-tree.md`
- Action Algebra 规范见 `docs/architecture/action-algebra-formal-spec.md`

### 决策树 / 规则引擎 / 其他

- `data` 放布尔表达式、特征匹配规则、动作定义等
- 结构完全相同，只有 `data` 的 schema 不同
- 每种 domain 通过自己的 `DesignerConfig.kind` + `NodeTypeConfig` 定义专用节点类型

## Tree vs Graph 选择指南

| 场景        | 推荐模式 | 理由                                               |
| ----------- | -------- | -------------------------------------------------- |
| 钉钉审批流  | tree     | 链式 + 扇出，天然树形                              |
| Action flow | tree     | 主链 + 条件扇出 + 并行扇出，3 个原语覆盖全部控制流 |
| BPMN 流程   | graph    | 任意连线、环路、多入多出                           |
| 状态机      | graph    | 状态之间任意转换                                   |
| 逻辑决策树  | tree     | 二叉/多叉条件分支                                  |
| 规则引擎    | tree     | 规则集 + 条件分支 + 动作                           |

判断标准：如果编辑时用户不需要"在两个已有节点之间画一根任意连线"，用 tree。

## Current Baseline

- `createTreeDesignerCore` 工厂、配置版本迁移（1.0/1.0.0 → 1.1.0）、单一 `projectAndLayoutTree`、tree payload 验证、pair history、中央 mutation gate 已在 `flow-designer-core` 落地
- 虚拟 empty branch slot、`__fdTree` runtime 几何、min-gap 公式、`insertBranchChild`、`deleteTreeNode` 重写矩阵已落地
- renderer tree session（sessionId / FIFO / ack / epoch / LRU / coalescing）、host projection sanitization、tree 命令 adapter 封口已落地
- DingFlow TB/LR 渲染（handles/paths/overlays/plus button/slot affordance）只消费 `__fdTree` 几何
- playground tree schemas 与 docs examples 已迁移到 config 1.1.0 + 显式 `layoutSize`，无 authored `treeConfig.autoLayout`

## Remaining Gaps

- 钉钉 `FlowLong JSON ↔ TreeDocument` 双向 domain adapter 仍是后续 domain 落地项
- action-flow 的 `TreeDocument → ActionSchema` lowering 仍是后续 domain 落地项
- domain-specific save/export and profile-level authoring surfaces 仍需各自 family doc 单独收口
- `showGatewayNodes` / `showMergeNodes` 展示实现保留为独立 successor（见 plan 453 Deferred But Adjudicated）

## Related Documents

- `docs/architecture/flow-designer/design.md` — 整体分层架构
- `docs/architecture/flow-designer/config-schema.md` — GraphDocument、NodeTypeConfig 完整定义
- `docs/architecture/flow-designer/dingflow-visual-spec.md` — DingFlow TB/LR 视觉与几何规范
- `docs/architecture/action-algebra-formal-spec.md` — Action Schema 执行语义
- `docs/architecture/action-graph-authoring.md` — Action 可视化设计器的 lowering 规则
- `docs/examples/dingtalk-workflow-tree.md` — 钉钉工作流 tree 配置示例
- `docs/examples/action-flow-tree.md` — Action flow tree 配置示例
