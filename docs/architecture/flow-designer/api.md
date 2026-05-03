# Flow Designer API

## 1. 包边界

### `@nop-chaos/flow-designer-core`

负责纯图编辑运行时。

建议导出：

- `GraphDocument`
- `GraphNode`
- `GraphEdge`
- `DesignerConfig`
- `NodeTypeConfig`
- `EdgeTypeConfig`
- `PaletteGroupConfig`
- `DesignerSnapshot`
- `DesignerCommand`
- `createDesignerCore()`

可按阶段补齐的扩展内容：

- `PortConfig`
- `validateDesignerConfig()`
- `migrateDesignerDocument()`
- `createDesignerMigrationRegistry()`
- `DesignerMigrationError`

### `@nop-chaos/flow-designer-renderers`

负责和 `SchemaRenderer` 集成。

建议导出：

- `flowDesignerRendererDefinitions`
- `registerFlowDesignerRenderers(registry)`
- `createFlowDesignerRegistry()`
- `createDesignerActionProvider(core)`

- `designer:*` 动作不是通过 root `actionHandlers` 注入，也不是通过修改 built-in action switch 实现，而是由 `designer-page` 在自身 `ActionScope` 边界内注册 `designer` namespace provider。
- `designer-page` 负责创建 `DesignerCore`，并向内部 React renderer 子树暴露 `DesignerContext`；关于当前 snapshot 契约与 host scope 落地状态，见 `docs/architecture/flow-designer/runtime-snapshot.md`。
- `designer-page` 当前还会把 designer host `scope` 与当前 `actionScope` 显式传给 `toolbar` / `inspector` / `dialogs` region render，因此这些 schema 片段不是仅靠“位于同一 React 子树”才可用，而是明确绑定到同一份 designer snapshot 视图与 namespace 边界。
- 当前 `designer:save` 直接调用 `core.save()`；`designer:export` 直接返回 `core.exportDocument()` 的 JSON 字符串，当前 playground 通过本地 JSON dialog 展示导出结果而不是经 `env.functions.publishFlowExport` 回传。
- 当前 clipboard 也是 core 自身能力，先支持单节点 copy/paste，并通过 `designer:copySelection` / `designer:pasteClipboard` 对外暴露。
- 当前删除确认不通过专用 designer action 实现，而是由 `designer-page` 外围 schema 使用共享 `dialog` action 包装 `designer:deleteSelection`。
- 当前键盘快捷键也不通过 core 内建按键表实现，而是由 `designer-page.shortcuts` 在宿主层声明，再复用同一条 action dispatch 链。
- 当前窄屏响应式行为也留在 `designer-page` shell：renderer 负责根据 media query 把 inspector 切换成 canvas 下方的可展开面板，但 inspector schema 和 nodeTypes/edgeTypes 的字段片段不需要改写成移动端专用协议。
- 当前 minimap 已直接使用 React Flow 自带 `<MiniMap />`，而不是自定义 overview-only 实现。
- 当前导出后的结构检查仍由 host/example 决定，但展示路径是 renderer shell 中的本地 JSON dialog，不是 `env.functions.publishFlowExport` 回传链。
- 当前 React Flow 画布会把 connect / reconnect / selection / pane-click 等交互统一翻译到同一条命令链，不改变 core 作为唯一 graph mutation source of truth 的边界。
- 当前 host toolbar 还可以继续声明 document-level flow actions，例如 `designer:clearSelection`；这类动作依旧通过 `designer-page` 所在的本地 `ActionScope` 解析，而不是要求 renderer 自带一套页面命令按钮协议。
- 当前 pane-click 语义已经固定：空白 surface click 会归一化为退出 connect/reconnect intent 并清理 selection；这条语义直接由 React Flow pane 事件映射到共享命令边界。
- 当前 renderer 内部仍把 canvas 抽到单独 bridge 组件文件，`designer-page` 和 host scope 不需要感知底层实现；但这里的 bridge 现在只表示 React Flow 集成边界，不再代表多画布实现的公共切换点。
- 当前 bridge callback surface 已固定覆盖移动节点、viewport 调整、connection 和 reconnect：React Flow 通过显式 `onMoveNode`、`onViewportChange`、`onStartConnection`、`onCancelConnection`、`onCompleteConnection`、`onStartReconnect`、`onCancelReconnect`、`onCompleteReconnect` 回调把交互归一化成 command dispatch，而不是在 bridge 内自行维护第二份 graph mutation 状态。
- 当前 bridge host 对 connect/reconnect completion 失败也已固定语义：如果 `addEdge` / `reconnectEdge` 被 duplicate-edge、self-loop 或 missing-node 等共享约束拒绝，host 仍保持 pending connection source 或 reconnecting edge 的本地 intent 状态，让用户可以直接改选目标或取消，而不是失败后立即丢失当前操作上下文。

## 2. `designer-page` Schema

```ts
interface DesignerPageSchema {
  type: 'designer-page';
  id?: string;
  title?: string;
  document?: GraphDocumentInput;
  treeDocument?: TreeDocumentInput;
  config: DesignerConfig;
  statusPath?: string;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
}
```

说明：

- `config` 包含 `toolbar?: ToolbarConfig` 和 `shortcuts?: ShortcutsConfig`，详见 `config-schema.md`
- `statusPath` 用于向宿主外部发布 `DesignerHostStatusSummary`
- `config.toolbar` 只配置 built-in default toolbar 的 item 集合，不是完整 schema 容器
- `toolbar` / `inspector` / `dialogs` 是 page 级 schema override surfaces
- 当 `config.documentMode === 'tree'` 时，renderer 接收 `treeDocument`，先投影为 `GraphDocument`，再在稳定的 `DesignerCore` 上用 `replaceDocument(...)` 同步后续 tree 变化

`designer-page` 是宿主入口，不是普通容器的简单别名。它负责：

- 初始化 graph runtime
- 将 graph runtime 注入固定宿主 scope
- 渲染 palette、canvas、inspector 区域
- 在本地 `ActionScope` 内注册 `designer:*` actions
- 通过 `statusPath` 向宿主发布窄只读状态摘要

- `toolbar`、`inspector`、`dialogs` 都是普通 schema 片段，renderer 会显式给它们透传 host `scope` 与 `actionScope`
- 通过共享 `dialog` action 打开的弹窗仍走共享 dialog runtime；它们与常驻 `dialogs` region 不是同一条渲染路径，但会继承触发它的 action scope，因此 dialog 内也可以继续 dispatch `designer:*`

### `designer-page` bridge contract

`designer-page` 还负责建立 graph runtime 与 schema runtime 的 bridge。

最小接口：

```ts
interface DesignerBridge {
  getSnapshot(): DesignerHostSnapshot;
  subscribe(listener: () => void): () => void;
  dispatch(command: DesignerCommand): DesignerCommandResult;
  emit(event: DesignerEvent): void;
}
```

约束：

- schema 片段只读 bridge snapshot，不直接改 graph store
- graph 写操作必须通过 `dispatch(command)` 或映射后的 `designer:*` action
- `@xyflow/react` 回调先转换为 `DesignerCommand`，再进入 core 执行链
- canvas bridge 组件只消费 `snapshot` 和显式 bridge callbacks，例如 `onPaneClick`、`onNodeSelect`、`onEdgeSelect`、`onDuplicateNode`、`onDeleteNode`、`onDeleteEdge`、`onMoveNode`、`onViewportChange`、`onStartConnection`、`onCancelConnection`、`onCompleteConnection`、`onStartReconnect`、`onCancelReconnect`、`onCompleteReconnect`；connect / reconnect completion 回调会显式携带 `sourcePort` / `targetPort`，bridge host 可以持有临时 UI intent（如 pending connection source 或 reconnecting edge id），但不得把 graph mutation 本身分叉到 command adapter 之外

当前 bridge 的主要消费者是 `designer-page` 自身、`designer-field` inspector 控件，以及 playground 的 toolbar/inspector schema。

## 3. 固定宿主 Scope

固定宿主 scope 对外暴露稳定的 designer host snapshot 与 `designer:*` 动作边界。

相关锚点：

- `docs/architecture/flow-designer/runtime-snapshot.md` - `DesignerSnapshot`、`DesignerContextValue`、已接线字段
- `docs/architecture/flow-designer/collaboration.md` - `designer-page`、ActionScope、command adapter、canvas host、inspector 的协作链路

API 级结论：

- Flow Designer 已经存在稳定的 `DesignerSnapshot` 契约
- snapshot 主要通过 `DesignerContext` 暴露给 Flow Designer 自己的 React 子组件
- schema 层通过 `designer:*` namespaced actions 参与图编辑
- toolbar / inspector / dialog 中触发的 schema action 都沿用同一条 `designer-page` -> local `ActionScope` -> `designer` namespace provider 路径
- `dialogs` region 片段是 live mount 的 schema surface
- `${doc.*}`、`${selection.*}`、`${activeNode.*}`、`${activeEdge.*}`、`${runtime.*}` 这类 designer host scope 变量稳定落地在 `toolbar` / `inspector` / `dialogs` 三个 region 内部
- 但这些字段不应被写成 `designer-page` 外部的全局 schema scope 自动可见
- `activeEdge` 稳定包含 `sourcePort?` / `targetPort?`，与持久化 `GraphEdge` 和 `designer:*` edge 命令参数一致
- `nodeType.inspector.body` 是主路径；`edgeType.inspector.body` / `mode` 不属于当前已支持 baseline

## 4. Designer Actions

Flow Designer 扩展现有 action schema，新增一组 graph action。

### `designer:addNode`

```ts
{
  action: 'designer:addNode',
  nodeType: 'task',
  position?: { x: number, y: number },
  data?: Record<string, unknown>,
  openInspector?: boolean
}
```

### `designer:updateNodeData`

```ts
{
  action: 'designer:updateNodeData',
  nodeId: string,
  patch: Record<string, unknown>
}
```

### `designer:updateEdgeData`

```ts
{
  action: 'designer:updateEdgeData',
  edgeId: string,
  patch: Record<string, unknown>
}
```

### `designer:updateMultipleNodes`

```ts
{
  action: 'designer:updateMultipleNodes',
  patches: Array<{
    nodeId: string,
    patch: Record<string, unknown>
  }>
}
```

### `designer:moveNodes`

```ts
{
  action: 'designer:moveNodes',
  moves: Array<{
    nodeId: string,
    position: { x: number, y: number }
  }>,
  transaction?: string
}
```

### `designer:setSelection`

```ts
{
  action: 'designer:setSelection',
  nodeIds?: string[],
  edgeIds?: string[]
}
```

### `designer:addEdge`

```ts
{
  action: 'designer:addEdge',
  source: string,
  target: string,
  sourcePort?: string,
  targetPort?: string,
  edgeType?: string,
  data?: Record<string, unknown>
}
```

### `designer:deleteSelection`

```ts
{
  action: 'designer:deleteSelection';
}
```

### `designer:openInspector`

```ts
{
  action: 'designer:openInspector',
  target?: {
    type: 'node' | 'edge',
    id: string
  }
}
```

### `designer:autoLayout`

```ts
{
  action: 'designer:autoLayout',
  algorithm?: 'dagre' | 'elk' | 'preset'
}
```

### `designer:beginTransaction`

```ts
{
  action: 'designer:beginTransaction',
  label?: string,
  transactionId?: string
}
```

### `designer:commitTransaction`

```ts
{
  action: 'designer:commitTransaction',
  transactionId?: string
}
```

### `designer:rollbackTransaction`

```ts
{
  action: 'designer:rollbackTransaction',
  transactionId?: string
}
```

### 其他建议内建动作

- `designer:duplicateSelection`
- `designer:undo`
- `designer:redo`
- `designer:fitView`
- `designer:disconnect`
- `designer:exportDocument`

Port-aware contract note:

- `designer:addEdge` 和 `designer:reconnectEdge` 的 `sourcePort` / `targetPort` 是当前受支持的 payload 组成部分，不是仅 canvas 内部使用的临时字段
- 同一对 node 之间，如果端口不同，则 duplicate-edge 校验按完整 `(source, sourcePort, target, targetPort)` 身份判断，而不是把所有同节点边都折叠成一条

Design note:

- 程序化 selection、批量更新、节点移动、连接创建都应走统一 action/history pipeline
- transaction 边界是必须约束；history 的底层存储可以按 operation 类别选择 patch 或 snapshot

## 5. Renderers

建议的 renderer 类型：

- `designer-page`
- `designer-canvas`
- `designer-palette`
- `designer-inspector-shell`

其中：

- `designer-canvas` 负责 `@xyflow/react` 集成
- `designer-palette` 负责拖拽与快速创建
- inspector 内部表单仍优先使用已有 form renderer

`designer-canvas` 需要遵守以下边界：

- 只把 gesture/canvas 事件翻译为 designer commands
- 不直接持久化 graph document
- 对 runtime 回推的受控值做 no-op 合并，避免更新回环

## 6. 扩展点

### 自定义节点渲染

通过 registry 注册 node renderer 或指定 renderer variant。

### 自定义 designer action

可以扩展新的 `designer:*` action。

### 自定义布局引擎

通过 core 暴露的 layout 接口注入。

### 自定义文档校验

在保存前执行 graph validator。

### 生命周期 hook 与事件

建议额外暴露：

```ts
interface DesignerLifecycleHooks {
  beforeCreateNode?(input: CreateNodeInput): CreateNodeInput | false;
  beforeConnect?(input: ConnectInput): ConnectInput | false;
  beforeDelete?(target: DeleteTarget): DeleteTarget | false;
  afterCommand?(event: DesignerEvent): void;
}
```

以及最小事件集：

- `selectionChanged`
- `nodeAdded`
- `nodeMoved`
- `edgeConnected`
- `documentChanged`
- `validationFailed`
- `historyCommitted`

## 7. 性能约束

实现时建议保证：

- 配置初始化后形成 Map 索引
- 端口与边匹配不做 O(n^2) 字符串扫描
- inspector 只订阅 active target
- schema 片段使用编译缓存
- graph 修改尽量增量更新
- edge adjacency 建议预建索引
- selector 更新依赖结构共享和浅比较
- 对大图中的自动布局、批量校验、导出允许分批执行

## 8. 错误模型与测试边界

建议把错误至少分为：

- config validation error
- migration error
- expression evaluation error
- graph command error
- renderer integration error

测试边界建议：

- `core` 负责纯状态与规则测试
- `renderers` 负责 bridge、scope 注入、action 接线、canvas adapter 集成测试

## 9. 典型使用方式

```ts
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/flux-react'
import { registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers'

const registry = createDefaultRegistry()
registerFlowDesignerRenderers(registry)

const SchemaRenderer = createSchemaRenderer()

export function WorkflowDesignerPage() {
  return (
    <SchemaRenderer
      schema={designerSchema}
      registry={registry}
      env={env}
      formulaCompiler={formulaCompiler}
      data={{}}
    />
  )
}
```

## 10. Design Reminder

- keep the API contract ahead of implementation detail
- preserve one command/history/action pipeline across shell, canvas, inspector, and host integrations
- treat features such as ports, connection validation, create-dialog flows, auto layout, export, presets, and richer validation as part of the same future API family rather than as ad hoc follow-up side paths
