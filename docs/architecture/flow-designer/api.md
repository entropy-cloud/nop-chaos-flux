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
- `PortConfig`
- `EdgeTypeConfig`
- `createDesignerCore()`
- `validateDesignerConfig()`
- `migrateDesignerDocument()`
- `createDesignerMigrationRegistry()`
- `DesignerMigrationError`

### `@nop-chaos/flow-designer-renderers`

负责和 `SchemaRenderer` 集成。

建议导出：

- `designerRendererDefinitions`
- `registerFlowDesignerRenderers(registry)`
- `createFlowDesignerRegistry()`
- `registerFlowDesignerActions(runtime)`
- `designerActionHandlers`

## 2. `designer-page` Schema

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

`designer-page` 是宿主入口，不是普通容器的简单别名。它负责：

- 初始化 graph runtime
- 将 graph runtime 注入固定宿主 scope
- 渲染 palette、canvas、inspector 区域
- 注册 `designer:*` actions

### `designer-page` bridge contract

`designer-page` 还负责建立 graph runtime 与 schema runtime 的 bridge。

推荐最小接口：

```ts
interface DesignerBridge {
  getSnapshot(): DesignerHostSnapshot
  subscribe(listener: () => void): () => void
  dispatch(command: DesignerCommand): Promise<DesignerCommandResult>
  emit(event: DesignerEvent): void
}
```

约束：

- schema 片段只读 bridge snapshot，不直接改 graph store
- graph 写操作必须通过 `dispatch(command)` 或映射后的 `designer:*` action
- `@xyflow/react` 回调先转换为 `DesignerCommand`，再进入 core 执行链

## 3. 固定宿主 Scope

`designer-page` 运行时对 schema 片段暴露以下标准上下文：

### `doc`

当前 graph 文档。

```ts
doc.id
doc.name
doc.meta
doc.nodes
doc.edges
```

### `selection`

当前选中摘要。

```ts
selection.kind // 'none' | 'node' | 'edge' | 'mixed'
selection.nodeIds
selection.edgeIds
selection.count
```

### `activeNode`

当前激活节点；无选中节点时可为空。

```ts
activeNode.id
activeNode.type
activeNode.data
activeNode.position
```

### `activeEdge`

当前激活边；无选中边时可为空。

### `runtime`

只读运行时摘要。

```ts
runtime.canUndo
runtime.canRedo
runtime.readonly
runtime.dirty
runtime.viewport
```

### `actions`

为 schema 层提供的辅助能力引用位。

用于约定语义，不建议直接把复杂对象暴露给公式层。

`actions` 可以引用桥接后的辅助能力，但不应成为底层 graph store 的逃生口。

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
  action: 'designer:deleteSelection'
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

说明：

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
  beforeCreateNode?(input: CreateNodeInput): CreateNodeInput | false
  beforeConnect?(input: ConnectInput): ConnectInput | false
  beforeDelete?(target: DeleteTarget): DeleteTarget | false
  afterCommand?(event: DesignerEvent): void
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
import { createDefaultRegistry, createSchemaRenderer } from '@nop-chaos/amis-react'
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

## 10. 后续实现建议

- 先稳定 `core` 文档与规则接口，再接 renderer
- 先跑通 `designer-page + canvas + addNode + inspector`
- 再补 `ports + connection validation + createDialog`
- 最后补 auto layout、导出、preset、复杂校验
