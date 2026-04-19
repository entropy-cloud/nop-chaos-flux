# Flow Designer 架构设计

## 1. 目标与边界

### 1.1 核心目标

- 将现有 flow editor 提炼为通用可配置设计器能力
- 外部通过 JSON 配置定义 palette、节点、端口、连线、工具栏、属性编辑方式
- 复用现有 `SchemaRenderer` 体系，而不是平行再造一套页面渲染运行时
- 在运行时保持高性能，避免每次渲染都重新解释整份配置

### 1.2 非目标

- 不生成外部源码
- 不替换现有 flow-editor 实现示例（当前位于 playground 体系）
- 不把所有 UI 都做成 graph core 的内建逻辑
- 不把 `then` / `onError` / `parallel` 等任何特定业务语义内建到 `flow-designer` core 或通用 config DSL
- 不让 `flow-designer` 自己负责解释 domain-specific lowering、import/export、round-trip codec 或任意动态 JS 执行

## 2. 总体架构

Flow Designer 应实现为 `SchemaRenderer` 上的一层领域扩展。

```text
+---------------- SchemaRenderer Host ----------------+
|                                                     |
|  designer-page RendererDefinition                   |
|    |                                                |
|    +- toolbar region -> standard schema render      |
|    +- palette region -> designer palette renderer   |
|    +- canvas region  -> graph canvas renderer       |
|    +- inspector     -> standard schema render       |
|                                                     |
|  formulaCompiler / action dispatch / page runtime   |
|  form runtime / dialog host / plugin pipeline       |
+--------------------------+--------------------------+
                           |
                           v
+---------------- Flow Designer Core -----------------+
| graph document | node types | ports | role matcher  |
| constraints    | history    | selection | layout    |
| serialization  | validation | graph actions         |
+-----------------------------------------------------+
```

### 2.1 Current Implementation Note

The repository already has a working first slice, but that slice is implementation progress, not the architecture contract itself.

When checking implementation progress, use `runtime-snapshot.md` and code anchors. The rest of this document describes the target architecture baseline.

## 3. 模块拆分

### 3.1 `@nop-chaos/flow-designer-core`

职责：纯图运行时，不依赖 React，不依赖 `SchemaRenderer`。

建议包含：

- graph document 类型定义
- node type / edge type / port type 配置模型
- role 匹配和连接校验
- 节点/边增删改查
- undo/redo 历史
- 选择态和批量操作模型
- 布局接口
- 文档序列化、反序列化、迁移
- designer action 的底层执行器

权限边界：

- Flow Designer runtime 不负责权限表达式求值。
- 权限裁剪由上游平台在 schema 进入 runtime 前完成。
- core 仅处理图编辑约束与校验，不处理访问控制语义。

Representative implementation progress includes:

- `GraphDocument` / `GraphNode` / `GraphEdge` / `DesignerConfig`
- `createDesignerCore()`
- `addNode` / `updateNode` / `moveNode` / `duplicateNode` / `deleteNode`
- `copySelection` / `pasteClipboard`
- `addEdge` / `updateEdge` / `deleteEdge`
- `selectNode` / `selectEdge` / `clearSelection`
- `undo` / `redo` / `toggleGrid` / `save` / `restore` / `exportDocument()`
- 单一 `start` 节点约束

### 3.2 `@nop-chaos/flow-designer-renderers`

职责：与现有 `SchemaRenderer` 集成。

建议包含：

- `designer-page`、`designer-canvas`、`designer-palette` 等 `RendererDefinition`
- `createFlowDesignerRegistry()` 或 `registerFlowDesignerRenderers()`
- graph runtime 到 schema runtime 的桥接层
- 宿主 scope 注入
- `designer:*` action 注册
- 与 `@xyflow/react` 的适配

Representative implementation progress includes:

- `designer-page` renderer
- `designer-field` inspector 控件
- `designer-canvas` / `designer-palette` / `designer-node-card` / `designer-edge-row` 占位 renderer 定义
- `registerFlowDesignerRenderers(registry)` / `createFlowDesignerRegistry()`
- `designer-page` 在自身 action-scope 边界内注册 `designer` namespace provider，并让 toolbar/inspector 片段沿该边界执行
- 当前 `designer-page` 不只是在 React 树上把 toolbar/inspector 放在同一 action-scope 边界里，还会在 region render 调用时显式透传 host `scope` 与 `actionScope`，降低后续 render-path 调整时丢失 designer namespace 绑定的风险
- `designer-page.shortcuts`，用于在宿主层把键盘事件映射到已有 `designer:*` / shared action 链
- 单一 `@xyflow/react` canvas bridge，经由 `DesignerCanvasContent` host 映射到 command adapter dispatch

### 3.3 `@xyflow/react` 适配边界

`@xyflow/react` 只作为 canvas 交互与可视化适配层，不作为 graph 数据的第二 source of truth。

建议约束：

- graph runtime 持有：`document`、`viewport`、`selection`、`activeTarget`、history、dirty、clipboard、连接校验相关状态
- `@xyflow/react` 可持有：pointer capture、dragging 中间态、连线预览、节点尺寸测量、框选手势中的纯 UI 临时态
- `onNodesChange`、`onEdgesChange`、`onConnect`、selection change 等回调先归一化为 designer bridge command，再进入 `designer:*` action 或 core action executor
- canvas adapter 不直接写 graph store 的结构化 document 状态，避免双写和回调环
- runtime 快照回推到 canvas 时必须允许 no-op 合并，避免受控更新造成事件回环

## 4. 为什么不做独立引擎

参考 `packages/flux-react/src/index.tsx:479`，当前体系已经具备：

- registry 驱动 renderer 发现
- schema compile 和动态值编译缓存
- page/form runtime
- scope 上下文
- dialog host
- action dispatch
- plugin 生命周期

因此 Flow Designer 不应再重复发明：

- 独立表达式协议
- 独立属性面板表单协议
- 独立弹窗体系
- 独立按钮动作系统
- 独立页面级运行时

## 5. `designer-page` 组织模型

Flow Designer 的宿主 schema 采用一个根节点类型：`designer-page`。

推荐结构：

```ts
interface DesignerPageSchema {
  type: 'designer-page'
  id?: string
  title?: string
  document: GraphDocumentInput
  config: DesignerConfig
  toolbar?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

说明：

- `document` 是当前图文档初始值
- `config` 是 designer 专用配置，定义 nodeTypes、ports、edgeTypes 等领域规则
- `toolbar`、`inspector`、`dialogs` 是当前已实际挂载的 schema 片段，由 `SchemaRenderer` 渲染
- `dialogs` region 本身现在已经会被 `DesignerPageRenderer` 挂载；但通过共享 `dialog` action 打开的弹窗仍然是另一条 dialog runtime 路径，两者不应混为一谈

## 6. 数据模型分层

### 6.1 持久化文档

只保存稳定的 graph 文档：

- 文档元信息
- nodes
- edges
- 节点/边业务数据
- 可选 viewport

不保存：

- hover
- selection drawer open
- 临时校验错误展示状态
- 浮动工具栏显示状态

### 6.2 运行时状态

运行时状态由两层组成：

- graph runtime state：selection、history、clipboard、hover、active target
- schema runtime state：form/page/dialog/action 相关状态

二者必须分层，避免把 form runtime 再复制进 Zustand。

### 6.3 graph runtime 与 schema runtime 的桥接

桥接层负责把 graph runtime 暴露给 `designer-page` 下的 renderer shell 与 schema 片段，但必须保持单向职责清晰。

这里要区分两层含义：

- 目标架构：schema 片段可以通过固定宿主 scope 读取 designer 只读快照
- 当前实现：稳定快照已经存在，但主要通过 `DesignerContext` 暴露给 Flow Designer 自己的 React 子组件；schema 表达式 scope 还没有完整拿到同一组字段

当前代码真相请优先看 `docs/architecture/flow-designer/runtime-snapshot.md`。

目标态桥接约束如下：

- schema 片段通过固定宿主 scope 读取 graph runtime 的只读快照
- schema 片段通过 `designer:*` actions 提交写操作
- toolbar / inspector 片段当前已经显式收到该宿主 scope 与 action-scope；dialog 则通过共享 dialog runtime 继承打开它时的 action-scope，因此不会形成第二条 graph action 路径
- schema 层不得直接拿到底层 graph store 并原地修改 document
- bridge 对外暴露的是稳定快照与有限命令面，而不是整套 store 私有实现

### 6.4 通用 graph editor 与 domain 语义的边界

`flow-designer` 的核心定位是通用 graph editor，而不是某个具体 domain 的执行语义编辑器。

这意味着：

- `GraphDocument` 只表达通用图结构：`nodes`、`edges`、`ports`、实例 `data`
- `DesignerConfig` 只表达通用图配置：node type、edge type、palette、canvas、规则、宿主片段入口
- 某个 domain 如何把 graph lowering 成自己的目标 DSL，属于 designer 之外的 domain library / adapter 责任
- `flow-designer` 可以承载这些 domain library，但不拥有其解释权

对于动态定制平台，推荐分层：

- 平台固定代码提供 `designer-page`、graph runtime、schema runtime 和受控 `importLoader`
- schema 在宿主边界通过 `xui:imports` 声明所需的 domain library
- domain library 通过 namespaced action、owner-level semantic action、或 owner-specific adapter 参与工作流
- graph -> domain DSL 的 `parse` / `serialize` / `validate` / `import` / `export` 都由该动态库负责

重要约束：

- `flow-designer` 可以让 toolbar / inspector / dialogs 调用导入库能力
- 但 `flow-designer` 本身不应知道这些能力代表的是 action-flow、state machine、ETL pipeline 还是别的 domain
- domain-specific validator / codec / exporter 不应下沉进 `@nop-chaos/flow-designer-core`

推荐 bridge 最小能力：

- `getSnapshot()` - 读取当前 `doc`、`selection`、`activeNode`、`activeEdge`、runtime summary
- `dispatch(command)` - 提交归一化后的 designer 命令
- `subscribe(listener)` - 供 renderer shell 做局部订阅
- `emit(event)` - 向宿主和插件发布 designer 事件

## 7. 节点类型模型

节点类型采用 designer 专用 config，不直接退化成普通 renderer schema。但节点类型内部允许嵌入 schema 片段：
- `inspector.body` - 属性面板
- `createDialog.body` - 创建节点弹窗
- `quickActions` - 快速操作按钮
- `emptyState` - 空节点空状态提示

但 节点组件通过 `body: SchemaInput` 渲染，使用 AMIS Schema 组合现有 renderer
            - 内置节点图标通过 `icon` 字段（kebab-case 格式）
            - `label`、 `description` 秊外观样式
            - 边标签和说明节点类型
- **节点组件支持自定义 renderer**
  通过在 `nodeTypes[].body` 中使用自定义组件类型（如 `my-custom-node`），注册后通过 AMIS 渲染器引用。
            - 或在 `nodeTypes` 中配置一个使用内置组件
            - 通过 `nodeTypes[].appearance` 配置基础样式（颜色、边框等）
- 节点内部允许嵌入 schema 片段：
  - `inspector.body` - 属性面板
  - `createDialog.body` - 创建节点弹窗
  - `quickActions` - 快速操作按钮
- `emptyState` - 空节点空状态提示

## 8. 端口优先的连接模型

只做 node 级 role 不足以支撑复杂设计器，因此一开始就支持 port 级建模。

连接校验顺序：

1. 校验 source port / target port 是否存在
2. 校验端口方向是否正确
3. 校验 port roles 是否匹配
4. 若 port 未定义 role，则回退到 node role
5. 校验 maxConnections、self loop、multi edge、黑名单规则
6. 校验 edgeType 约束

这样可以支持：

- 一节点多入多出
- 条件分支
- 并行节点
- 端口级最大连接数
- 明确的 handle 定义

## 9. 属性编辑与创建流程

### 9.1 属性编辑

属性面板直接使用 schema 片段驱动，而不是单独维护字段引擎。

目标态推荐方式：

- inspector schema 使用固定宿主 scope 读取 `activeNode` / `activeEdge`
- 保存按钮触发 `designer:updateNodeData` / `designer:updateEdgeData`
- 校验复用现有 form runtime

现状补充：

- 默认 inspector 与 `designer-field` 当前直接消费 `DesignerContext.snapshot`
- 默认 inspector 现已优先渲染 `nodeType.inspector.body`；renderer 不再内置领域专属 inspector 表单，只保留名称/描述与通用标量字段 fallback
- schema inspector 的写路径已经可以稳定复用 `designer:*` action
- schema inspector 的读路径还不应在现状文档里写成“`${activeNode.*}` 已默认可用”；当前落地状态见 `docs/architecture/flow-designer/runtime-snapshot.md`
- tree 模式 add-node 菜单项集合现已直接从 `config.nodeTypes` 派生，renderer 只保留窄的 fallback 过滤与排序规则

### 9.2 两阶段创建

节点创建支持两种路径：

- 直接拖拽落图，使用默认值创建
- 若节点类型配置了 `createDialog.body`，则在创建前或创建后立即弹出创建表单

这样既保证简单节点的效率，也覆盖复杂节点初始化场景。

## 10. 动作体系

所有外围交互统一接入现有 action schema，并扩展 designer action。

建议的内建 action：

- `designer:addNode`
- `designer:deleteSelection`
- `designer:duplicateSelection`
- `designer:connect`
- `designer:disconnect`
- `designer:openInspector`
- `designer:closeInspector`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:autoLayout`
- `designer:fitView`
- `designer:undo`
- `designer:redo`
- `designer:exportDocument`
- `designer:setSelection`
- `designer:moveNodes`
- `designer:updateMultipleNodes`
- `designer:addEdge`
- `designer:beginTransaction`
- `designer:commitTransaction`
- `designer:rollbackTransaction`

好处：

- toolbar 按钮可直接触发
- inspector 表单可直接提交到 designer action
- 快捷键和浮动工具栏可复用同一动作分发链

### 10.1 事务与历史边界

Flow Designer 需要统一的事务边界，即使历史底层实现最终同时支持 patch 和 snapshot 两种存储方式。

必须满足：

- 拖拽一个或多个节点只产生一条逻辑历史记录
- 自动布局、批量删除、批量更新等复合操作可包裹在同一 transaction 中
- action handler 不得各自写出独立历史格式；必须进入统一 operation/history pipeline
- patch 与 snapshot 的取舍可以按 operation 类别决定，但 undo/redo 语义必须稳定

## 11. 固定宿主 Scope

本节描述的是当前已落地的 region-level host scope 架构，以及更广范围可见性仍未扩大的边界。

当前真实 snapshot 契约、`DesignerContext` 暴露面，以及哪些字段尚未进入 schema 表达式 scope，请先看 `docs/architecture/flow-designer/runtime-snapshot.md`。

当前为了让 schema 片段稳定工作，`designer-page` 已为 region 片段注入固定宿主 scope。

推荐暴露：

- `doc`：当前 graph 文档
- `selection`：当前选中摘要
- `activeNode`：当前激活节点
- `activeEdge`：当前激活边
- `runtime`：只读运行时能力摘要

因此 inspector 和 toolbar schema 可以稳定写成：

```json
{
  "type": "tpl",
  "tpl": "当前节点：${activeNode.data.label}"
}
```

## 12. 性能策略

### 12.1 编译优先

- designer 配置初始化时解析为 normalized config
- nodeTypes、ports、edgeTypes 预编译为索引结构
- schema 片段交由现有 schema compiler 编译
- graph action handler 预注册

### 12.2 局部订阅

- canvas 只订阅图状态
- inspector 主要订阅 `activeNode` / `activeEdge`
- palette 主要订阅 nodeTypes 和可创建性摘要
- 不让整个 designer 因单节点属性变动全局重渲染

### 12.3 缓存策略

- node type lookup 使用 Map
- port matcher 预编译为快速判定结构
- action handler 注册表常驻缓存
- schema fragment 使用编译结果复用
- edges 建议维护按 `source` / `target` / `port` 的邻接索引，避免高频连接校验退化为全表扫描

### 12.4 增量更新

- 更新单节点数据只替换该节点引用
- 历史记录按操作快照或 patch 管理
- 避免每次 `JSON.stringify` 全文档比较脏状态
- store selector 应优先依赖结构共享和浅比较，避免 inspector、palette、canvas 互相放大重渲染

### 12.5 大图场景

需要把 1000+ 节点和复杂连线视为明确压力场景，而不是实现后的补充优化。

建议约束：

- inspector 只订阅 active target，不订阅整份 document
- palette、minimap、selection overlay 各自使用独立 selector
- 自动布局、批量校验、导出可采用分批或延迟执行
- 对大图不默认承诺所有 UI 面板都随每次节点移动实时全量更新

## 13. 扩展机制

扩展优先级：

1. designer config
2. schema fragments
3. renderer registry
4. plugins

支持的扩展点：

- 自定义 node renderer
- 自定义 edge renderer
- 自定义 designer action
- 自定义 layout engine
- 自定义 document validator
- 自定义预设

### 13.1 事件与生命周期

除命令式 action 之外，还需要明确的事件与生命周期扩展点。

建议至少覆盖：

- `selectionChanged`
- `nodeAdded`
- `nodeMoved`
- `edgeConnected`
- `documentChanged`
- `validationFailed`
- `historyCommitted`

生命周期 hook 推荐区分两类：

- before hooks：允许拒绝或改写 create/connect/delete 等输入
- after hooks：只做观察、审计、同步、副作用派发

不要把这两类能力混在普通 store subscribe 里。

## 14. 错误处理与测试分层

需要把错误与测试边界写成实现约束，而不只是实现细节。

错误至少分为：

- config normalize / validate 错误
- migration 错误
- rule expression 错误
- graph action 执行错误
- canvas adapter / renderer 集成错误

测试建议分层：

- `core`：纯文档变换、连接校验、history、migration、rule evaluation、transaction 合并
- `renderers`：宿主 scope 注入、`designer:*` action 接线、schema inspector/createDialog 集成、canvas adapter 互操作

## 15. 与旧示例的关系

- 旧示例继续保留，作为单页演示和交互参考
- 新模块不直接侵入旧示例结构
- 现在已经有一个基于 `designer-page` 的 playground parity example，但它仍然是第一阶段 MVP，不代表已经完成全部 legacy parity

## 16. 推荐落地顺序

1. 定义 `core` 文档模型与配置模型
2. 实现 role/port matcher 和 graph action 基础能力
3. 实现 `designer-page`、`designer-canvas`、`designer-palette`
4. 接入 fixed scope 和 `designer:*` action
5. 用 schema 片段跑通 inspector / create dialog
6. 最后补齐 preset、layout、导出、验证

## 17. Tree Mode

### 17.1 概述

Tree Mode 是 Flow Designer 的投影视图能力，允许同一 React Flow 画布同时渲染图结构和树结构两种视图。

关键设计原则：

- 复用现有 graph runtime 和画布适配层，不创建第二套渲染路径
- `TreeDocument` 作为领域输入，投影到 `GraphDocument`，再通过 `createDesignerCore` 进入 React Flow
- 投影层是单向转换，不支持反向投影或树结构就地编辑
- Tree mode 当前仅支持渲染和投影，不提供树结构的 CRUD 编辑能力

### 17.2 数据流

Tree Mode 的数据流遵循以下转换链路：

```
TreeDocument (domain input)
  ↓ projectTree()
GraphDocument (runtime input)
  ↓ createDesignerCore()
DesignerCore (runtime instance)
  ↓ React Flow bridge
Canvas rendering
```

- `TreeDocument`：领域特定的树结构文档，定义在 `packages/flow-designer-core/src/types.ts`（288-340 行）
- `projectTree()`：投影函数，位于 `packages/flow-designer-core/src/tree-projection.ts`
- `GraphDocument`：通用图文档，由投影层生成
- `DesignerCore`：运行时实例，由 `createDesignerCore()` 创建
- React Flow：画布渲染层，通过现有 canvas bridge 集成

### 17.3 结构原语

Tree Mode 定义了三种核心结构原语：

#### `child`（链序列）
- 表示节点的单一后续链
- 投影为 `GraphNode` 的单个出边
- 链节点按顺序连接，支持条件分支前的线性执行路径

#### `branches`（扇出）
- 表示节点的多分支能力
- 投影为多个 `GraphNode` 实例，每个分支对应一个节点
- 分支数量受 `TreeNodeTypeConfig.tree.maxBranches` / `minBranches` 约束

#### `TreeNodeBranch.child`（分支子树）
- 表示单个分支的递归子结构
- 每个分支可以有独立的 `child` 或进一步 `branches`
- 投影时递归展开为完整的图结构

类型定义（`packages/flow-designer-core/src/types.ts`）：

```ts
interface TreeNode {
  id: string; type: string; data: Record<string, unknown>;
  child?: TreeNode; branches?: TreeNodeBranch[];
}

interface TreeNodeBranch {
  id: string; data: Record<string, unknown>; child?: TreeNode;
}
```

### 17.4 边类型解析

投影层在生成 `GraphEdge` 时，需要根据上下文解析边类型。解析优先级如下：

1. **节点级配置**：`TreeNodeTypeConfig.tree.branchEdgeType`
2. **树级配置**：`TreeConfig.chainEdgeType` / `branchEdgeType` / `mergeEdgeType`
3. **设计器默认**：`DesignerRules.defaultEdgeType`

具体规则：

- `chainEdgeType`：用于 `child` 链序列的边
- `branchEdgeType`：用于 `branches` 扇出的边
- `mergeEdgeType`：用于分支合并的边（当 `showMergeNodes: true` 时生效）

配置结构（`packages/flow-designer-core/src/types.ts`）：

```ts
interface TreeConfig {
  layout: { direction: 'TB' | 'LR'; nodeSpacing: number; layerSpacing: number };
  showGatewayNodes: boolean; showMergeNodes: boolean; autoLayout: boolean;
  chainEdgeType?: string; branchEdgeType?: string; mergeEdgeType?: string;
}

interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: { allowBranches?: boolean; maxBranches?: number; minBranches?: number;
           allowChild?: boolean; isTerminal?: boolean; branchEdgeType?: string };
}
```

### 17.5 布局

Tree Mode 的布局由 `layoutTreeWithElk()` 提供，封装了现有的 ELK 布局逻辑。

布局参数：

- `direction`：布局方向，从 `treeConfig.layout.direction` 读取（`'TB'` | `'LR'`）
- `nodeSpacing`：节点间距
- `layerSpacing`：层级间距

实现位置：`packages/flow-designer-core/src/tree-layout.ts`

当 `treeConfig.autoLayout: true` 时，投影完成后自动触发布局更新。

### 17.6 领域适配器模式

Tree Mode 支持通过领域适配器集成外部领域模型，实现树结构的导入导出。

#### 接口定义

```ts
interface TreeDomainAdapter {
  kind: string;
  importToTree(external: Record<string, unknown>): TreeDocument;
  exportFromTree(tree: TreeDocument): Record<string, unknown>;
}
```

#### 集成路径

1. **注册适配器**：在运行时通过适配器注册表注册 `TreeDomainAdapter` 实例
2. **schema 引用**：在 `designer-page` schema 中通过 `xui:imports` 声明所需的领域库
3. **运行时使用**：通过 namespaced action 或 owner-specific adapter 调用导入导出能力

实现位置：`packages/flow-designer-core/src/tree-domain.ts`

### 17.7 当前范围

Tree Mode 当前实现的范围和约束：

**已支持：**
- TreeDocument 到 GraphDocument 的投影
- React Flow 画布渲染
- 布局计算和自动布局
- 边类型解析和样式应用
- 领域适配器的导入导出能力

**不支持（非目标）：**
- TreeDocument 的就地编辑（CRUD）
- 反向投影（GraphDocument → TreeDocument）
- 树结构专用的交互语义（如拖拽调整分支顺序）
- Gateway 节点和 Merge 节点的可视化编辑

当 `DesignerConfig.documentMode` 设置为 `'tree'` 时，Flow Designer 进入 Tree Mode 视图，但底层仍然操作 `GraphDocument` 和 `DesignerCore` 实例。
