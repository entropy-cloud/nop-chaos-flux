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

| 原语 | 含义 | 对应可视化 |
|------|------|-----------|
| `child` | 链式序列，A → B → C | 纵向/横向直线连接 |
| `branches` | 从一个节点扇出 N 条分支 | 分叉连接 |
| `TreeNodeBranch.child` | 每条分支独立的子树 | 分支内的纵向序列 |
| implicit group merge | 分支组结束后隐含汇合到单一下游 continuation | 汇合线 / merge overlay，不一定是持久化节点 |

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
  id: string
  kind: string              // 域标识："dingtalk-workflow", "action-flow", "decision-tree"
  name: string
  version: string
  meta?: Record<string, unknown>
  root: TreeNode
}
```

### TreeNode

```ts
interface TreeNode {
  id: string
  type: string              // → TreeNodeTypeConfig.id
  data: Record<string, unknown>

  // 结构字段
  child?: TreeNode
  branches?: TreeNodeBranch[]
}
```

### TreeNodeBranch

```ts
interface TreeNodeBranch {
  id: string
  data: Record<string, unknown>   // label, condition, priority, branchType… 全部放 data
  child?: TreeNode
}
```

### 设计决策

| 决策 | 理由 |
|------|------|
| `branches` 是 `TreeNode` 的字段 | 树形语义中分支从属于分叉节点，不是独立实体 |
| 分支汇合是隐含语义，不是必需持久化节点 | DingFlow / structured concurrency 的 continuation 天然是“branch group 结束后回到单一下游 continuation” |
| `data` 类型为 `Record<string, unknown>` | DSL 不绑定任何领域语义；condition、mode、priority 等全部是领域数据 |
| 没有 `parent` 反向引用 | 纯树结构不需要；跨引用（route jump）在 `data` 层面用 id 处理 |
| `TreeNodeBranch` 没有 `type` 字段 | 分支项的身份由所属的 `TreeNode` 和 `data` 决定 |
| 不设 `BranchMode` 枚举 | 排他/并行/包容是执行语义，不是可视化结构，放 `data` |

## Config Extensions

Tree 模式复用现有 `NodeTypeConfig`（body、inspector、createDialog、appearance）的全部能力，仅增加结构约束。

### DesignerConfig 扩展

```ts
interface DesignerConfig {
  // ...existing fields...

  documentMode?: 'graph' | 'tree'

  treeConfig?: {
    layout: {
      direction: 'TB' | 'LR'    // Top-Bottom (钉钉) 或 Left-Right
      nodeSpacing: number
      layerSpacing: number
    }
    showGatewayNodes: boolean      // 是否显示虚拟网关节点
    showMergeNodes: boolean        // 是否显示虚拟合并节点
    autoLayout: boolean            // 树模式默认 true（每次修改后自动重排）
  }
}
```

### TreeNodeTypeConfig

```ts
interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: {
    allowBranches?: boolean        // 该类型是否允许扇出分支
    maxBranches?: number           // 最大分支数
    minBranches?: number           // 最小分支数（如果允许 branches）
    allowChild?: boolean           // 是否允许链式子节点
    isTerminal?: boolean           // 叶节点，不可有 child
  }
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
    chainEdgeType?: string     // child 链式连接引用的 EdgeTypeConfig.id
    branchEdgeType?: string    // branches 扇出连接引用的 EdgeTypeConfig.id
    mergeEdgeType?: string     // 分支汇合连接引用的 EdgeTypeConfig.id
  }
}

// 节点类型级别覆盖
interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: {
    // ...
    branchEdgeType?: string    // 该类型节点的分支边样式覆盖全局
  }
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

投影后调用现有 `elk-layout.ts`，配置 `'elk.direction': 'DOWN'` 即为钉钉风格纵向树。树模式 `autoLayout` 默认为 true，每次数据变更后重新投影 + 重排。

### 反向：Graph → Tree

编辑操作（拖拽节点、添加分支）在 tree 层面操作 TreeDocument，不需要从 graph 反向重建 tree。投影是单向的：

```
编辑操作 → 修改 TreeDocument → 重新投影 → 更新 React Flow
```

## DesignerPageSchema 扩展

```ts
interface DesignerPageSchema {
  type: 'designer-page'
  id?: string
  title?: string

  // 二选一
  document?: GraphDocumentInput       // graph 模式（现有）
  treeDocument?: TreeDocumentInput    // tree 模式（新增）

  config: DesignerConfig
  toolbar?: SchemaInput
  inspector?: SchemaInput
}
```

`designer-page` 渲染器根据 `config.documentMode` 决定使用哪条数据路径和哪个 Core 实现：

- `graph`：现有 `DesignerCore`，直接管理 `nodes[]` + `edges[]`
- `tree`：新增 `TreeDesignerCore`，内部持有 `TreeDocument`，通过投影产出 `GraphNode[] + GraphEdge[]`

两个 Core 共享：selection、history (undo/redo)、clipboard、snapshot、toolbar/inspector 渲染。

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

| 场景 | 推荐模式 | 理由 |
|------|---------|------|
| 钉钉审批流 | tree | 链式 + 扇出，天然树形 |
| Action flow | tree | 主链 + 条件扇出 + 并行扇出，3 个原语覆盖全部控制流 |
| BPMN 流程 | graph | 任意连线、环路、多入多出 |
| 状态机 | graph | 状态之间任意转换 |
| 逻辑决策树 | tree | 二叉/多叉条件分支 |
| 规则引擎 | tree | 规则集 + 条件分支 + 动作 |

判断标准：如果编辑时用户不需要"在两个已有节点之间画一根任意连线"，用 tree。

## Implementation Phases

### Phase 1: TreeDocument 类型 + TreeProjection

- 定义 `TreeDocument`、`TreeNode`、`TreeNodeBranch` 类型
- 实现 `tree-projection.ts`：tree → flat nodes + edges
- 验证：手动构造 TreeDocument JSON，通过投影在 React Flow 中渲染

### Phase 2: TreeDesignerCore

- 树形 CRUD 操作：添加/删除/移动节点、添加/删除分支
- 复用 DesignerCore 的 history、selection、clipboard
- 验证：通过 designer actions 操作 TreeDocument

### Phase 3: designer-page 支持 tree 模式

- `DesignerPageSchema` 接受 `treeDocument`
- `designer-page` 渲染器根据 `documentMode` 选择 Core
- 完整的树形编辑器页面（palette、inspector、toolbar）

### Phase 4: Domain adapters

- 钉钉：FlowLong JSON ↔ TreeDocument 双向转换
- Action flow：TreeDocument → ActionSchema lowering

## Related Documents

- `docs/architecture/flow-designer/design.md` — 整体分层架构
- `docs/architecture/flow-designer/config-schema.md` — GraphDocument、NodeTypeConfig 完整定义
- `docs/architecture/action-algebra-formal-spec.md` — Action Schema 执行语义
- `docs/architecture/action-graph-authoring.md` — Action 可视化设计器的 lowering 规则
- `docs/examples/dingtalk-workflow-tree.md` — 钉钉工作流 tree 配置示例
- `docs/examples/action-flow-tree.md` — Action flow tree 配置示例
