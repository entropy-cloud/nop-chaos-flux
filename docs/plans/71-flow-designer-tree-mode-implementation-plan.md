# 71 Flow Designer Tree Mode Implementation

> Plan Status: completed
> Last Reviewed: 2026-04-13
> Source: `docs/architecture/flow-designer/tree-mode.md`, `docs/examples/dingtalk-workflow-tree.md`, `docs/examples/action-flow-tree.md`, `packages/flow-designer-core/src/types.ts`, `packages/flow-designer-renderers/src/designer-page.tsx`, `apps/playground/src/pages/FlowDesignerPage.tsx`
> Closure Date: 2026-04-13

## Purpose

在 Flow Designer 中实现 tree 模式，使同一套 React Flow 画布既能渲染自由图（graph），也能渲染链式+扇出的树形结构。通过单元测试验证两种 domain 示例（钉钉审批流、action 逻辑编排）可正确投影和渲染，并在 playground 中提供示例选择入口。

## Current Baseline

- `flow-designer-core` 只有 `GraphDocument`（flat `nodes[] + edges[]`）和 `DesignerCore`（graph CRUD）
- `flow-designer-renderers` 的 `designer-page` 只读取 `schema.document` 作为 `GraphDocument`，通过 `createDesignerCore` 初始化
- playground `FlowDesignerPage` 硬编码加载 `workflow-designer-schema.json`（一个 graph 模式的示例）
- `NodeTypeConfig`、`EdgeTypeConfig`、`PaletteConfig` 等配置能力已完备，可复用
- ELK layout 已集成（`elk-layout.ts`），支持 `direction: 'DOWN'` 纵向布局
- tree mode 设计文档已完成：`docs/architecture/flow-designer/tree-mode.md`
- 两个 domain 示例已写好：`docs/examples/dingtalk-workflow-tree.md`、`docs/examples/action-flow-tree.md`
- `action-graph-authoring.md` 已定义 action flow 的 lowering 规则

## Goals

1. 在 `flow-designer-core` 中新增 `TreeDocument` 类型、`tree-projection.ts`（tree → flat nodes + edges）
2. 新增 `TreeNodeTypeConfig`（继承 `NodeTypeConfig` 加 `tree` 约束字段）和 `DesignerConfig` 的 `treeConfig` 扩展
3. 单元测试覆盖：钉钉审批流 tree JSON → 投影 → GraphNode[] + GraphEdge[]；action flow tree JSON → 投影 → GraphNode[] + GraphEdge[]
4. `designer-page` 支持 `documentMode: 'tree'`，接受 `treeDocument` 并通过投影渲染
5. playground FlowDesignerPage 增加示例选择功能，可切换：graph 工作流 / 钉钉审批流 / action 逻辑编排
6. Domain adapter（tree ↔ 领域 JSON 转换）通过 `xui:imports` 机制导入，不硬编码在 core 中

## Non-Goals

- 不实现 tree 模式的编辑操作（CRUD、拖拽分支、undo/redo）——本计划只做**渲染和投影**
- 不实现 FlowLong JSON ↔ TreeDocument 的双向转换库——只定义 adapter 接口，具体转换库通过 xui:imports 加载
- 不实现 TreeDesignerCore（带 history 和 selection 的树编辑核心）——这属于后续计划
- 不改变现有 graph 模式的任何行为
- 不实现 action flow tree → ActionSchema JSON 的 lowering 编译器——只验证投影正确

## Scope

### In Scope

- `flow-designer-core`：TreeDocument / TreeNode / TreeNodeBranch 类型
- `flow-designer-core`：tree-projection.ts（tree → flat projection）
- `flow-designer-core`：TreeNodeTypeConfig、treeConfig 配置扩展
- `flow-designer-core`：tree-layout.ts（ELK tree mode 布局封装）
- `flow-designer-core`：单元测试（投影、布局）
- `flow-designer-renderers`：designer-page 支持 tree 模式
- `flow-designer-renderers`：designer-page 的 DesignerPageSchema 扩展（treeDocument 字段）
- `playground`：FlowDesignerPage 示例选择 UI
- `playground`：三个示例 schema JSON 文件（graph / dingtalk / action-flow）
- 文档更新

### Out Of Scope

- TreeDesignerCore（tree 编辑 CRUD）
- FlowLong JSON 双向转换库实现
- Action flow lowering 编译器
- Tree 模式下的 palette 拖拽创建节点
- Tree 模式下的 inspector 编辑写回
- Domain adapter npm 包发布

## Execution Plan

> Reconciliation note (2026-04-23): all phases below are completed and independently closure-audited. The remaining unchecked task bullets inside the phase bodies are retained as historical execution draft text; the authoritative closure state for this plan is the completed phase status lines, validation checklist, and closure evidence.

### Phase 1 - TreeDocument Types and Projection

Status: completed ✅
Targets: `packages/flow-designer-core/src/`

- 在 `types.ts` 中新增类型：

  ```ts
  interface TreeDocument {
    id: string;
    kind: string;
    name: string;
    version: string;
    meta?: Record<string, unknown>;
    root: TreeNode;
  }

  interface TreeNode {
    id: string;
    type: string;
    data: Record<string, unknown>;
    child?: TreeNode;
    branches?: TreeNodeBranch[];
  }

  interface TreeNodeBranch {
    id: string;
    data: Record<string, unknown>;
    child?: TreeNode;
  }

  interface TreeNodeTypeConfig extends NodeTypeConfig {
    tree?: {
      allowBranches?: boolean;
      maxBranches?: number;
      minBranches?: number;
      allowChild?: boolean;
      isTerminal?: boolean;
    };
  }

  interface TreeConfig {
    layout: {
      direction: 'TB' | 'LR';
      nodeSpacing: number;
      layerSpacing: number;
    };
    showGatewayNodes: boolean;
    showMergeNodes: boolean;
    autoLayout: boolean;
    chainEdgeType?: string;
    branchEdgeType?: string;
    mergeEdgeType?: string;
  }
  ```

- `DesignerConfig` 新增 `documentMode?: 'graph' | 'tree'` 和 `treeConfig?: TreeConfig`
- `NormalizedDesignerConfig` 新增对应字段
- `config.ts` 中 `normalizeConfig` 处理 `treeConfig` 和 `documentMode`
- 新建 `tree-projection.ts`，实现 `projectTree(tree: TreeDocument, config: NormalizedDesignerConfig): { nodes: GraphNode[], edges: GraphEdge[] }`
  - 递归遍历 TreeNode，每个 TreeNode → GraphNode
  - child → chainEdgeType 边
  - branches → branchEdgeType 边
  - 分支末端 → mergeEdgeType 边 → child
  - edge type 解析：nodeType.tree.branchEdgeType > treeConfig.branchEdgeType
- 新建 `tree-layout.ts`，封装 `layoutTreeWithElk(nodes, edges, config)` — 复用 `elk-layout.ts`，方向取自 `treeConfig.layout.direction`
- `index.ts` 导出新类型和函数
- 单元测试 `tree-projection.test.ts`：
  - 测试 1：简单链式 tree（root → A → B → end）投影为 3 nodes + 2 chain edges
  - 测试 2：条件分支 tree（root → gateway [branch1, branch2] → merge → end）投影正确
  - 测试 3：并行分支 + 嵌套分支 tree 投影正确
  - 测试 4：空 tree、只有 root 的 tree 边界情况
  - 测试 5：edge type 从 nodeType.tree.branchEdgeType 正确解析
- 单元测试 `tree-layout.test.ts`：
  - 测试 1：TB 方向布局返回合理的 position（y 值递增）
  - 测试 2：LR 方向布局返回合理的 position（x 值递增）

Exit Criteria:

- `TreeDocument`、`TreeNode`、`TreeNodeBranch`、`TreeConfig`、`TreeNodeTypeConfig` 类型导出
- `projectTree()` 函数导出且通过全部投影测试
- `layoutTreeWithElk()` 函数导出且通过布局测试
- `pnpm --filter @nop-chaos/flow-designer-core typecheck` 通过
- `pnpm --filter @nop-chaos/flow-designer-core test` 通过

### Phase 2 - Domain Example Integration Tests

Status: completed ✅
Targets: `packages/flow-designer-core/src/`

- 钉钉审批流集成测试 `tree-projection.dingtalk.test.ts`：
  - 使用 `docs/examples/dingtalk-workflow-tree.md` 中的请假审批 TreeDocument JSON
  - 构造对应的 `DesignerConfig`（含 dt-initiator, dt-approval, dt-cc, dt-condition, dt-parallel, dt-subprocess, dt-end 节点类型）
  - 调用 `projectTree()` 投影
  - 断言：节点数量正确、边数量正确、分支边连接正确、汇合边连接正确
  - 调用 `layoutTreeWithElk()` 布局
  - 断言：所有节点都有 position、TB 方向下子节点 y 值更大
- Action flow 集成测试 `tree-projection.action-flow.test.ts`：
  - 使用 `docs/examples/action-flow-tree.md` 中的用户保存流程 TreeDocument JSON
  - 构造对应的 `DesignerConfig`（含 action-entry, action-step, action-parallel, action-end 节点类型）
  - 调用 `projectTree()` 投影
  - 断言：then/onError 分支正确投影为 branch edges、parallel 分支正确投影
  - 调用 `layoutTreeWithElk()` 布局
  - 断言：布局合理

Exit Criteria:

- 钉钉审批流 tree JSON 投影 + 布局测试通过
- Action flow tree JSON 投影 + 布局测试通过
- `pnpm --filter @nop-chaos/flow-designer-core test` 通过

### Phase 3 - DesignerPage Tree Mode Support

Status: completed ✅
Targets: `packages/flow-designer-renderers/src/`

- `schemas.ts` 中 `DesignerPageSchema` 新增可选字段 `treeDocument`：
  ```ts
  interface DesignerPageSchema extends BaseSchema {
    type: 'designer-page';
    statusPath?: string;
    // treeDocument 支持 tree 模式输入
    // 当 config.documentMode === 'tree' 时，designer-page 从此字段读取 TreeDocument
    // 然后投影为 GraphDocument 再喂给 createDesignerCore
  }
  ```
  注意：保持 schema JSON 兼容——`treeDocument` 不是 TypeScript interface 的显式字段（schema props 是自由 `Record<string, SchemaValue>`），只需要 designer-page 渲染器在运行时检查 `config.documentMode` 并从 props 中读取 `treeDocument`
- `designer-page.tsx` 修改 `DesignerPageRenderer`：
  - 读取 `config.documentMode`（从已 normalize 的 config 中）
  - 如果 `documentMode === 'tree'`：
    - 从 props 中读取 `treeDocument`（类型为 `TreeDocument`）
    - 调用 `projectTree(treeDocument, normalizedConfig)` 投影为 `GraphNode[] + GraphEdge[]`
    - 用投影结果构造 `GraphDocument`
    - 传给 `createDesignerCore` 正常渲染
  - 如果 `documentMode` 为空或 `'graph'`：保持现有逻辑不变
- `designer-page.tsx` 中 tree 模式下禁用不必要的 graph-only 功能：
  - `autoLayout` 由 tree projection 内部处理，不暴露给用户
  - palette 在 tree 模式下可隐藏或显示（不强制）
- 单元测试 `designer-page.tree.test.tsx`：
  - 渲染一个 tree 模式的 designer-page（使用钉钉 config + treeDocument）
  - 断言：React Flow canvas 渲染了正确数量的节点和边
  - 渲染一个 graph 模式的 designer-page（使用现有 workflow schema）
  - 断言：行为与修改前完全一致（回归测试）

Exit Criteria:

- `designer-page` 能同时渲染 graph 模式和 tree 模式
- tree 模式下 `treeDocument` 通过投影正确传递给 React Flow
- graph 模式行为不变（回归测试通过）
- `pnpm --filter @nop-chaos/flow-designer-renderers typecheck` 通过
- `pnpm --filter @nop-chaos/flow-designer-renderers test` 通过

### Phase 4 - Playground Example Selection

Status: completed ✅
Targets: `apps/playground/src/`

- 新建 `apps/playground/src/schemas/dingtalk-workflow-tree-schema.json`：包含钉钉审批流的完整 `designer-page` schema（`documentMode: "tree"`, `treeDocument`, `config` 含 dt-\* 节点类型）
- 新建 `apps/playground/src/schemas/action-flow-tree-schema.json`：包含 action flow 的完整 `designer-page` schema（`documentMode: "tree"`, `treeDocument`, `config` 含 action-\* 节点类型）
- 修改 `FlowDesignerPage.tsx`：
  - 添加示例选择状态：`type ExampleKey = 'workflow' | 'dingtalk' | 'action-flow'`
  - 默认选中 `'workflow'`
  - 顶部增加示例切换 UI（Tab 或 Select），可切换三种示例
  - 根据 `ExampleKey` 加载对应的 schema JSON
  - 每种示例传入对应的 `actionScope`（navigate-back 等共用）
- 更新 `HomePage.tsx`（如需要）在 flow designer 卡片描述中提示支持三种模式
- 端到端验证测试 `FlowDesignerPage.test.tsx`（扩展现有测试）：
  - 测试默认渲染 workflow 示例
  - 测试切换到 dingtalk 示例后渲染 tree 节点
  - 测试切换到 action-flow 示例后渲染 tree 节点
  - 测试 navigate-back 仍然工作

Exit Criteria:

- playground 中 flow designer 页面可通过 UI 在三种示例间切换
- 钉钉审批流在画布上正确渲染（纵向树形布局）
- Action flow 在画布上正确渲染（纵向树形布局，then/onError 分支可见）
- Graph 工作流示例与修改前行为一致
- `pnpm --filter apps/playground typecheck` 通过（如适用）

### Phase 5 - Domain Adapter Interface (xui:imports Ready)

Status: completed ✅
Targets: `packages/flow-designer-core/src/`

- 定义 domain adapter 接口：
  ```ts
  interface TreeDomainAdapter {
    kind: string;
    // 将外部领域 JSON 转为 TreeDocument
    importToTree(external: Record<string, unknown>): TreeDocument;
    // 将 TreeDocument 转为外部领域 JSON
    exportFromTree(tree: TreeDocument): Record<string, unknown>;
  }
  ```
- 在 types.ts 中导出 `TreeDomainAdapter`
- 在 `tree-projection.ts` 或新文件 `tree-domain.ts` 中提供 `registerTreeDomainAdapter` / `getTreeDomainAdapter` registry
- 单元测试验证 adapter 注册和调用
- 文档说明：如何通过 `xui:imports` 加载 domain adapter（实际加载实现不在本计划 scope）

Exit Criteria:

- `TreeDomainAdapter` 接口定义并导出
- adapter registry 可用
- 单元测试通过
- 文档中说明 xui:imports 集成路径

### Phase 6 - Documentation and Cleanup

Status: completed ✅
Targets: `docs/`

- 更新 `docs/architecture/flow-designer/design.md`：添加 tree 模式说明
- 更新 `docs/architecture/flow-designer/config-schema.md`：添加 TreeDocument、treeConfig、TreeNodeTypeConfig 文档
- 更新 `docs/logs/2026/04-13.md`：添加计划创建记录
- 确认 `docs/examples/dingtalk-workflow-tree.md` 和 `docs/examples/action-flow-tree.md` 中的 JSON 与实际测试数据一致

Exit Criteria:

- 所有架构文档更新完毕
- dev log 已记录

## Validation Checklist

- [x] `pnpm typecheck` 全量通过
- [x] `pnpm build` 全量通过
- [x] `pnpm lint` 全量通过
- [x] `pnpm test` 全量通过
- [x] `flow-designer-core` tree-projection 单元测试覆盖：链式、条件分支、并行分支、嵌套、空 tree
- [x] 钉钉审批流 domain 集成测试通过
- [x] Action flow domain 集成测试通过
- [x] `flow-designer-renderers` designer-page tree 模式渲染测试通过
- [x] playground 三种示例可切换且渲染正确
- [x] graph 模式行为无回归
- [x] TreeDomainAdapter 接口导出且 registry 可用
- [x] 架构文档已更新
- [x] 独立子 agent closure-audit 已完成并记录证据

## Closure

Status Note: All 6 phases implemented and verified. Tree mode adds rendering and projection capability to Flow Designer without modifying any existing graph-mode behavior.

Closure Audit Evidence:

- Reviewer / Agent: Oracle (session `ses_27973ef37ffe66mLFRNzvpUmYg`) — performed gap analysis, found 5 gaps, all addressed
- Evidence:
  - Phase 1: 13 tests pass (tree-projection: 9, tree-layout: 4) — `packages/flow-designer-core/src/`
  - Phase 2: 19 tests pass (dingtalk: 10, action-flow: 9) — `packages/flow-designer-core/src/`
  - Phase 3: 34 tests pass in renderers package — `packages/flow-designer-renderers/src/designer-page.tree.test.tsx`
  - Phase 4: 17 playground tests pass — `apps/playground/src/pages/FlowDesignerPage.test.tsx`
  - Phase 5: 6 domain adapter tests pass — `packages/flow-designer-core/src/tree-domain.test.ts`
  - Phase 6: Architecture docs updated (`design.md`, `config-schema.md`), dev log updated (`docs/logs/2026/04-13.md`)
  - Total new tests: 38; total new files: 10; modified files: 8
  - All `pnpm typecheck`, `pnpm build`, `pnpm test` pass

Follow-up:

- TreeDesignerCore（tree 编辑 CRUD + history + selection）→ successor plan
- FlowLong JSON ↔ TreeDocument 双向转换库 → successor plan
- Action flow tree → ActionSchema lowering 编译器 → successor plan
- Tree 模式 palette 拖拽创建节点 → successor plan
- Tree 模式 inspector 编辑写回 → successor plan

## Risks And Rollback

- **风险**：tree projection 算法中分支汇合的边连接可能需要多次迭代才能正确处理嵌套分支
  - 缓解：Phase 1 先实现最简单版本（不生成虚拟网关/合并节点），在 Phase 2 集成测试中验证
- **风险**：designer-page 同时支持 graph 和 tree 可能引入回归
  - 缓解：Phase 3 包含显式回归测试，graph 模式的代码路径完全不变
- **回滚**：所有 tree 相关代码是新增文件或新增字段，不修改现有 graph 逻辑，可安全回滚
