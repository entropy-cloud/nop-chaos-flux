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
- 本文档只定义 TreeDocument 数据模型、隐含 group merge 语义、TreeProjection（tree → graph 投影）、以及 tree 模式下的配置扩展
- tree 模式复用 graph 模式的 NodeTypeConfig 渲染能力和 EdgeTypeConfig 边样式，不引入新的渲染概念

## Core Claim

Tree 模式和 graph 模式共享同一个 React Flow 画布，但 DingFlow 一类 tree domain 不是“任意树”，而是更窄的 structured process tree：

- **graph 模式**：用户自由创建 nodes 和 edges，表达任意有向图
- **tree 模式**：数据是结构化流程树（链式 `child` + 扇出 `branches` + branch-group 隐含 merge），通过投影层展平为 nodes + edges 后喂给 React Flow

两者在渲染层都表现为 `GraphNode[]` + `GraphEdge[]` → React Flow，但交互语义不同：

- graph 模式允许自由创建和重连 edges
- tree 模式必须通过结构化命令编辑 sequence、branch group 和 continuation，不应把 React Flow 暴露成自由 graph 编辑器

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
        └── child?: TreeNode    # 该分支的子树

implicit merge(branches)        # 整个 branch group 汇合后，再流向当前节点的 downstream child
```

| 原语                   | 含义                                        | 对应可视化                                 |
| ---------------------- | ------------------------------------------- | ------------------------------------------ |
| `child`                | 链式序列，A → B → C                         | 纵向/横向直线连接                          |
| `branches`             | 从一个节点扇出 N 条分支                     | 分叉连接                                   |
| `TreeNodeBranch.child` | 每条分支独立的子树                          | 分支内的纵向序列                           |
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
  version: string;
  meta?: Record<string, unknown>;
  root: TreeNode;
}
```

### TreeNode

```ts
interface TreeNode {
  id: string;
  type: string; // → TreeNodeTypeConfig.id
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

### 设计决策

| 决策                                    | 理由                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `branches` 是 `TreeNode` 的字段         | 树形语义中分支从属于分叉节点，不是独立实体                                                             |
| 分支汇合是隐含语义，不是必需持久化节点  | DingFlow / structured concurrency 的 continuation 天然是“branch group 结束后回到单一下游 continuation” |
| `data` 类型为 `Record<string, unknown>` | DSL 不绑定任何领域语义；condition、mode、priority 等全部是领域数据                                     |
| 没有 `parent` 反向引用                  | 纯树结构不需要；跨引用（route jump）在 `data` 层面用 id 处理                                           |
| `TreeNodeBranch` 没有 `type` 字段       | 分支项的身份由所属的 `TreeNode` 和 `data` 决定                                                         |
| 不设 `BranchMode` 枚举                  | 排他/并行/包容是执行语义，不是可视化结构，放 `data`                                                    |

## Config Extensions

Tree 模式复用现有 `NodeTypeConfig`（body、inspector、createDialog、appearance）的全部能力，仅增加结构约束。

### DesignerConfig 扩展

```ts
interface DesignerConfig {
  // ...existing fields...

  documentMode?: 'graph' | 'tree';

  treeConfig?: {
    layout: {
      direction: 'TB' | 'LR'; // Top-Bottom (钉钉) 或 Left-Right
      nodeSpacing: number;
      layerSpacing: number;
    };
    showGatewayNodes: boolean; // 是否显示虚拟网关节点
    showMergeNodes: boolean; // 是否显示虚拟合并节点
    autoLayout: boolean; // 树模式默认 true（每次修改后自动重排）
  };
}
```

### TreeNodeTypeConfig

```ts
interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: {
    allowBranches?: boolean; // 该类型是否允许扇出分支
    maxBranches?: number; // 最大分支数
    minBranches?: number; // 最小分支数（如果允许 branches）
    allowChild?: boolean; // 是否允许链式子节点
    isTerminal?: boolean; // 叶节点，不可有 child
  };
}
```

`NodeTypeConfig` 上的 `body`、`inspector`、`createDialog`、`quickActions`、`appearance` 全部原样复用，无变化。

当前实现补充：

- 默认 inspector 已优先渲染 `nodeType.inspector.body`，renderer 不再为 tree-domain 节点维护单独的领域表单分支
- tree 模式 canvas 上的 add-node 菜单项集合直接从 `config.nodeTypes` 派生，而不是维护独立的 renderer 节点目录
- renderer 仅保留窄的 fallback 过滤/排序逻辑，确保 terminal/root-only 类型不会误出现在添加菜单里

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

// 节点类型级别覆盖
interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: {
    // ...
    branchEdgeType?: string; // 该类型节点的分支边样式覆盖全局
  };
}
```

查找优先级：`TreeNodeTypeConfig.tree.branchEdgeType` > `treeConfig.branchEdgeType` > 默认。

## Tree Projection

Tree → React Flow 的投影是 tree 模式的核心桥梁。

### 投影算法概要

```
TreeDocument
  → TreeProjection.project(tree, config)
  → { nodes: GraphNode[], edges: GraphEdge[] }
  → React Flow 渲染
```

投影只做 3 件事：

1. **展平**：递归遍历 TreeNode，每个 TreeNode 产出一个 GraphNode
2. **连线**：根据 child 和 branches 产出 GraphEdge
3. **布局**：调用 ELK/dagre 计算 position

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
visit(node, parentIds):
  // 1. 当前节点
  emit GraphNode(id=node.id, type=node.type, data=node.data)

  // 2. 有分支
  if node.branches:
    for each branch:
      // 可选：emit 虚拟网关节点（如 treeConfig.showGatewayNodes）
      // 从当前节点（或网关）连边到 branch.child
      if branch.child:
        visit(branch.child, [node.id])
        emit edge: node.id → branch.child.id (type=branchEdgeType)

    // 汇合：所有分支末端 → node.child
    if node.child:
      // 可选：emit 虚拟合并节点
      // 收集所有分支的最深叶节点 → mergeNode → node.child
      visit(node.child, allBranchLeafIds)
      emit edges: leafIds → node.child.id (type=mergeEdgeType)

  // 3. 无分支，纯链式
  else if node.child:
    visit(node.child, [node.id])
    emit edge: node.id → node.child.id (type=chainEdgeType)
```

### 布局

当前 tree mode 的真实基线不是“单纯把投影结果交给 ELK”，而是两层布局职责：

1. **结构化 tree layout（默认/同步路径）**
2. **ELK auto-layout（显式自动布局按钮和初始 mount 后的异步增强路径）**

也就是说，tree mode 平时必须先有一套稳定、可同步执行、与 TreeDocument 结构严格一致的 nested-tree 布局；ELK 只是后续增强，不是唯一真相。

#### Why

钉钉工作流和 Action orchestration 的视觉预期不是“任意 DAG 分层图”，而是更接近 `wflow-web-next` DingFlow 的嵌套树：

- branch owner 自己占据一层
- 下方是一组 branch columns
- 每个 branch column 内部继续递归渲染自己的 chain / nested branch group
- 所有 branch 完成后，continuation 居中落到整组 branch fan-out 的下方，再继续向下

如果只根据投影后的 edges 做普通 graph layering，很容易让 continuation 看起来“只是某个 merge target”，而不是 branch group 的统一后继。

#### Structured Tree Layout Variables

当前实现位于 `packages/flow-designer-core/src/tree-layout.ts` 的 `layoutStructuredTree()`，核心变量是轴抽象而不是写死 `x/y`：

- `cross`: 横向展开轴（`direction: 'TB'` 时等价于 `x`；`direction: 'LR'` 时等价于 `y`）
- `main`: 主流程推进轴（`direction: 'TB'` 时等价于 `y`；`direction: 'LR'` 时等价于 `x`）
- `crossStart`: 当前子树在 cross 轴上的起点
- `mainStart`: 当前节点在 main 轴上的起点
- `allocatedCross`: 当前节点/子树可使用的 cross 轴宽度
- `nodeSpacing`: sibling branch columns 之间的间距
- `layerSpacing`: 节点与其 child / branch group / continuation 之间沿 main 轴的层间距

节点尺寸来自 `NodeTypeConfig.appearance.minWidth/minHeight`；若未提供，则退回默认值。

#### Measurement Pass

先递归测量每棵子树占用的包围盒：

```text
measure(node):
  nodeSize = size(node)

  if no branches:
    child = measure(node.child?)
    cross = max(nodeSize.cross, child.cross)
    main  = nodeSize.main + gap(child)

  if has branches:
    branchMeasures = measure(branch.child) for each branch
    branchesCross = sum(branch.cross) + spacing between columns
    branchesMain = max(branch.main)
    child = measure(node.child?)  // continuation subtree

    cross = max(nodeSize.cross, branchesCross, child.cross)
    main  = nodeSize.main
            + layerSpacing
            + branchesMain
            + gap(continuation child)
```

这里的关键点是：

- branch group 的 cross 尺寸由所有 branch columns 的总宽度决定
- branch group 的 main 尺寸由“最深 branch”决定
- continuation 不属于任何单一 branch，而属于整个 branch group 之后的统一后继

#### Placement Pass

测量完成后再递归放置：

```text
place(node, crossStart, mainStart, allocatedCross):
  place node itself at the center of allocatedCross

  if no branches and has child:
    place child centered below node

  if has branches:
    branchesSpan = total measured width of all branch columns
    branchCrossCursor = center(branchesSpan within allocatedCross)

    for each branch:
      place branch subtree in its own column
      advance branchCrossCursor by branchWidth + nodeSpacing

    branchBottom = max(bottom of every branch subtree)

    if continuation exists:
      place continuation centered below the full branch group
```

因此 continuation 的对齐基线是“整组 branches 的包围盒中心”，不是任一条 merge edge 的几何平均值，也不是某个 graph layer 的局部中心。

#### Resulting Invariants

当前实现保证这些结构不变量：

- chain child 一定沿 `main` 轴继续推进
- sibling branches 一定共享同一 branch row 起点
- branch owner 的 continuation 一定在所有 branch subtree 的最下方之后
- nested branch group 必须完全落在其所属 branch column 内部
- `TB` 和 `LR` 只是轴映射不同，结构算法相同

#### Relationship With ELK

`layoutTreeWithElk()` 仍然保留，用于 tree mode 的异步 auto-layout。但它现在是增强层，不应推翻结构化 tree layout 的 owner 语义。

因此当前推荐理解是：

- `layoutStructuredTree()` owns the semantic nested-tree baseline
- `layoutTreeWithElk()` may refine the projected graph presentation
- 如果两者结果冲突，以结构化 tree 的 branch/continuation 语义为准，后续应让 ELK 配置向这个语义靠拢，而不是反过来削弱 tree 结构

#### Implementation Notes

- 初始 tree document 投影使用 `computeTreeModeDocument()`，先 `projectTree()` 再 `layoutStructuredTree()`。
- tree commands（add branch / move branch / insert chain node 等）修改 `TreeDocument` 后，也走同一条“重新投影 + 结构化 tree layout”路径。
- 这保证首次渲染、属性更新、以及界面交互后的结果共享同一位置变量和同一树形语义。

### 反向：Graph → Tree

编辑操作（拖拽节点、添加分支）在 tree 层面操作 TreeDocument，不需要从 graph 反向重建 tree。投影是单向的：

```
编辑操作 → 修改 TreeDocument → 重新投影 → 更新 React Flow
```

## DesignerPageSchema 扩展

```ts
interface DesignerPageSchema {
  type: 'designer-page';
  id?: string;
  title?: string;

  // 二选一
  document?: GraphDocumentInput; // graph 模式（现有）
  treeDocument?: TreeDocumentInput; // tree 模式（新增）

  config: DesignerConfig;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
}
```

`designer-page` 渲染器根据 `config.documentMode` 决定使用哪条输入路径，但两种模式最终都落到同一个 `DesignerCore` API：

- `graph`：直接以 `document` 初始化 `DesignerCore`
- `tree`：先把 `treeDocument` 投影成 `GraphDocument`，然后在页面生命周期内复用同一个 `DesignerCore`，后续 tree 输入变化通过 `core.replaceDocument(projectedDoc, treeDocument)` 同步

因此 tree 模式当前冻结基线是：`selection`、`history (undo/redo)`、`snapshot`、以及 `save()` / `restore()` 在 tree 编辑前后保持连续。`TreeDocument` 是 owner truth，history entry 与 saved baseline 都必须同时记录 owner tree 与 projected graph；undo/redo 与 restore 都不能只回滚 graph projection 而把 owner tree 留在更“新”的版本。clipboard 仍由 core 提供单节点 copy/paste，但本文档不再把它写成 tree-mode closure 的额外共享承诺。

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
- 每种 domain 通过自己的 `DesignerConfig.kind` + `TreeNodeTypeConfig` 定义专用节点类型

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

- `TreeDocument`、`TreeNode`、`TreeNodeBranch`、`TreeConfig`、`TreeDomainAdapter` 已在 `flow-designer-core` 中定义
- tree projection 和 tree-mode `designer-page` 主路径已接线；渲染器可接受 `treeDocument` 并复用同一个 `DesignerCore`/workbench shell
- tree-mode 当前已覆盖基础 tree contract、投影渲染、以及本地 tree 编辑态回写

## Remaining Gaps

- 钉钉 `FlowLong JSON ↔ TreeDocument` 双向 domain adapter 仍是后续 domain 落地项
- action-flow 的 `TreeDocument → ActionSchema` lowering 仍是后续 domain 落地项
- domain-specific save/export and profile-level authoring surfaces 仍需各自 family doc 单独收口

## Related Documents

- `docs/architecture/flow-designer/design.md` — 整体分层架构
- `docs/architecture/flow-designer/config-schema.md` — GraphDocument、NodeTypeConfig 完整定义
- `docs/architecture/action-algebra-formal-spec.md` — Action Schema 执行语义
- `docs/architecture/action-graph-authoring.md` — Action 可视化设计器的 lowering 规则
- `docs/examples/dingtalk-workflow-tree.md` — 钉钉工作流 tree 配置示例
- `docs/examples/action-flow-tree.md` — Action flow tree 配置示例
