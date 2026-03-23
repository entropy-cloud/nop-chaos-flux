# Flow Designer API

## 1. 包边界

### `@nop-chaos/flow-designer-core`

负责纯图编辑运行时。

当前 MVP 已导出：

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

仍属于后续扩展的内容：

- `PortConfig`
- `validateDesignerConfig()`
- `migrateDesignerDocument()`
- `createDesignerMigrationRegistry()`
- `DesignerMigrationError`

### `@nop-chaos/flow-designer-renderers`

负责和 `SchemaRenderer` 集成。

当前 MVP 已导出：

- `designerRendererDefinitions`
- `registerFlowDesignerRenderers(registry)`
- `createFlowDesignerRegistry()`
- `designerActionHandlers`

当前实现说明：

- `designer:*` 动作不是通过修改共享 DSL 注册器实现，而是通过 `SchemaRendererProps.actionHandlers` 注入到共享 action runtime。
- `designer-page` 负责创建 `DesignerCore`，并把 host snapshot 注入 schema scope。
- 保存和导出通过 `env.functions.saveFlowDocument` 与 `env.functions.publishFlowExport` 回传给 playground 宿主。
- 当前 clipboard 也是 core 自身能力，先支持单节点 copy/paste，并通过 `designer:copySelection` / `designer:pasteClipboard` 对外暴露。
- 当前删除确认不通过专用 designer action 实现，而是由 `designer-page` 外围 schema 使用共享 `dialog` action 包装 `designer:deleteSelection`。
- 当前键盘快捷键也不通过 core 内建按键表实现，而是由 `designer-page.shortcuts` 在宿主层声明，再复用同一条 action dispatch 链。
- 当前窄屏响应式行为也留在 `designer-page` shell：renderer 负责根据 media query 把 inspector 切换成 canvas 下方的可展开面板，但 inspector schema 和 nodeTypes/edgeTypes 的字段片段不需要改写成移动端专用协议。
- 当前 minimap 也是 renderer shell 层的临时 parity 实现：它基于当前 `doc.nodes` 坐标生成 overview 按钮并复用 `selectNode`，尚未引入最终 canvas adapter 的真实视口同步协议。
- 当前 playground export 面板会直接消费 `designer:export` 通过 `env.functions.publishFlowExport` 回传的 JSON 字符串，并在宿主层派生 export summary；这说明导出后的结构检查仍然应由 host/example 负责，而不是把展示逻辑塞回 core 或 renderer action 本身。
- 当前 card/list canvas 也提供了一个 renderer-local 的轻量 connection mode：进入连接模式后，第二次点击节点会转成 `addEdge` command；当前同一层 parity shell 也覆盖 edge reconnect，bridge host 会先记录待 reconnect 的 edge，再把目标节点点击归一化成 `reconnectEdge` command；这仍然只是最终 `@xyflow/react` handle/connect/reconnect 交互之前的 parity shell，不改变 core 作为唯一 graph mutation source of truth 的边界。
- 当前 host toolbar 还可以继续声明 document-level flow actions，例如 `designer:clearSelection`；这类动作依旧通过 `designerActionHandlers` 注入共享 action runtime，而不是要求 renderer 自带一套页面命令按钮协议。
- 当前 card/list canvas 已开始显式暴露 pane-click parity：空白 surface click 会归一化为退出 connection mode + `clearSelection`，为未来 `designer-canvas` 对 `@xyflow/react` pane 事件的桥接预留了清晰契约。
- 当前 renderer 内部已经把 card/list canvas MVP 抽到单独 adapter 组件文件，这样 `designer-page` 和 host scope 不需要感知底层 canvas 实现，后续可在相同 props 契约下逐步替换成真实 xyflow adapter。
- 当前 `designer-page` 还支持 `canvasAdapter` prop，用于在 renderer 内部切换 `card`、`xyflow-preview` 与 `xyflow` adapter；preview 用来提前锁定 `onPaneClick`、selection bridge、connect bridge 等行为契约，而 live `xyflow` 则复用同一套 callback surface 接入真实 `@xyflow/react`。
- 当前默认画布已经切到 live `xyflow`：如果 `designer-page` 未显式传 `canvasAdapter`，renderer 会默认走 `xyflow`，而 `card` 仅作为显式 fallback / parity harness 保留。
- 当前 target 侧进一步把 card canvas 交互抽成 `DesignerCardCanvasBridge`，由 `designer-page` 提供 snapshot 和 bridge callbacks，再由 bridge 组件负责具体卡片视图渲染；这让未来 xyflow bridge 可以复用相同 callback/command 边界，而不需要耦合到当前 card DOM 结构。
- 当前 target 侧也补上了 `DesignerXyflowPreviewBridge`：它不是接入真实库，而是通过 `canvasAdapter: 'xyflow-preview'` 复用同一套 snapshot + callbacks 边界，先锁定 pane/select/connect/reconnect/move/viewport 这些桥接语义，再进入真正的 `@xyflow/react` 适配。
- 当前 bridge callback surface 已开始扩展到移动节点、viewport 调整、connection 和 reconnect：card canvas 通过显式 `onMoveNode`、`onViewportChange`、`onStartConnection`、`onCancelConnection`、`onCompleteConnection`、`onStartReconnect`、`onCancelReconnect`、`onCompleteReconnect` 回调把交互归一化成 command dispatch，而不是在 bridge 内自行维护第二份 graph mutation 状态。
- 当前 bridge host 对 connect/reconnect completion 失败也已固定语义：如果 `addEdge` / `reconnectEdge` 被 duplicate-edge、self-loop 或 missing-node 等共享约束拒绝，host 仍保持 pending connection source 或 reconnecting edge 的本地 intent 状态，让用户可以直接改选目标或取消，而不是失败后立即丢失当前操作上下文。

## 2. `designer-page` Schema

```ts
interface DesignerPageSchema {
  type: 'designer-page'
  id?: string
  title?: string
  document: GraphDocumentInput
  config: DesignerConfig
  shortcuts?: DesignerShortcutBinding[]
  toolbar?: SchemaInput
  inspector?: SchemaInput
  dialogs?: SchemaInput
}
```

```ts
interface DesignerShortcutBinding {
  key: string
  modKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: ActionSchema | ActionSchema[]
  preventDefault?: boolean
}
```

`designer-page` 是宿主入口，不是普通容器的简单别名。它负责：

- 初始化 graph runtime
- 将 graph runtime 注入固定宿主 scope
- 渲染 palette、canvas、inspector 区域
- 通过 root `actionHandlers` 接入 `designer:*` actions

### `designer-page` bridge contract

`designer-page` 还负责建立 graph runtime 与 schema runtime 的 bridge。

推荐最小接口：

```ts
interface DesignerBridge {
  getSnapshot(): DesignerHostSnapshot
  subscribe(listener: () => void): () => void
  dispatch(command: DesignerCommand): DesignerCommandResult
  emit(event: DesignerEvent): void
}
```

约束：

- schema 片段只读 bridge snapshot，不直接改 graph store
- graph 写操作必须通过 `dispatch(command)` 或映射后的 `designer:*` action
- `@xyflow/react` 回调先转换为 `DesignerCommand`，再进入 core 执行链
- canvas bridge 组件只消费 `snapshot` 和显式 bridge callbacks，例如 `onPaneClick`、`onNodeSelect`、`onEdgeSelect`、`onDuplicateNode`、`onDeleteNode`、`onDeleteEdge`、`onMoveNode`、`onViewportChange`、`onStartConnection`、`onCancelConnection`、`onCompleteConnection`、`onStartReconnect`、`onCancelReconnect`、`onCompleteReconnect`；bridge host 可以持有临时 UI intent（如 pending connection source 或 reconnecting edge id），但不得把 graph mutation 本身分叉到 command adapter 之外

当前 MVP 中，bridge 的主要消费者是 `designer-page` 自身、`designer-field` inspector 控件，以及 playground 的 toolbar/inspector schema。

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
selection.kind // 'none' | 'node' | 'edge'
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
runtime.dirty
runtime.gridEnabled
runtime.zoom
```

### `palette` / `nodeTypes` / `edgeTypes`

供 toolbar、palette、inspector schema 直接读取当前 designer 配置。

### `designerCore`

当前 host scope 也会暴露 `designerCore` 本身，供 `designer-field` 这类领域控件直接派发 graph command。

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

当前 MVP 已经实际落地并验证的动作包括：

- `designer:addNode`
- `designer:updateNodeData`
- `designer:updateEdgeData`
- `designer:copySelection`
- `designer:pasteClipboard`
- `designer:duplicateSelection`
- `designer:deleteSelection`
- `designer:undo`
- `designer:redo`
- `designer:zoomIn`
- `designer:zoomOut`
- `designer:fitView`
- `designer:toggleGrid`
- `designer:save`
- `designer:restore`
- `designer:export`

仍在设计里但尚未落地为当前 playground 行为的动作包括：

- `designer:updateMultipleNodes`
- `designer:moveNodes`
- `designer:setSelection`
- `designer:openInspector`
- `designer:autoLayout`
- `designer:beginTransaction`
- `designer:commitTransaction`
- 多节点或带边的 clipboard 复制
- `designer:rollbackTransaction`

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
import { designerActionHandlers, registerFlowDesignerRenderers } from '@nop-chaos/flow-designer-renderers'

const registry = createDefaultRegistry()
registerFlowDesignerRenderers(registry)

const SchemaRenderer = createSchemaRenderer()

export function WorkflowDesignerPage() {
  return (
    <SchemaRenderer
      schema={designerSchema}
      registry={registry}
      actionHandlers={designerActionHandlers}
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
