# Flow Designer Runtime Snapshot

## Purpose

本文单独说明当前 Flow Designer 在运行时真正稳定暴露出来的快照与宿主上下文，重点回答两个问题:

- `DesignerCore.getSnapshot()` 现在到底长什么样
- `designer-page` 当前哪些值真的暴露给了 schema 层，哪些还只是设计目标

这份文档故意区分“当前代码事实”和“更理想的宿主 scope 设计”，避免把设计稿里的字段误认为已经接线完成。

## Current Code Anchors

- `packages/flow-designer-core/src/types.ts`
- `packages/flow-designer-core/src/core.ts`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/flow-designer-renderers/src/index.test.tsx`

## 一句话结论

当前 Flow Designer 已经有稳定的运行时快照，但这个快照主要通过 `DesignerContext` 暴露给 Flow Designer 自己的 React renderer 组件使用；它还没有在代码里被完整投影成 schema 片段可直接读取的独立 host scope。

也就是说，当前实际存在的是:

- `DesignerSnapshot`
- `DesignerContextValue`
- `designer` action namespace

而不是完整落地的:

- `doc` / `selection` / `activeNode` / `activeEdge` / `runtime` 被自动注入到 schema 表达式 scope

## 1. 当前真实快照契约

`DesignerCore.getSnapshot()` 当前返回 `DesignerSnapshot`，定义在 `packages/flow-designer-core/src/types.ts`。

```ts
interface SelectionSummary {
  selectedNodeIds: string[]
  selectedEdgeIds: string[]
  activeNodeId: string | null
  activeEdgeId: string | null
}

interface DesignerSnapshot {
  doc: GraphDocument
  selection: SelectionSummary
  activeNode: GraphNode | null
  activeEdge: GraphEdge | null
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  gridEnabled: boolean
  viewport: { x: number; y: number; zoom: number }
}
```

这个类型是当前最可靠的运行时事实来源。

## 2. 每个字段的当前语义

### `doc`

当前完整图文档。

包含:

- `id`
- `kind`
- `name`
- `version`
- `meta?`
- `viewport?`
- `nodes`
- `edges`

用途:

- canvas 渲染节点与边
- export / save / restore 的数据源
- future schema-driven shell 的只读展示数据源

### `selection`

当前选中摘要，当前实现是单选模型，但摘要结构已经保留数组形态。

包含:

- `selectedNodeIds`
- `selectedEdgeIds`
- `activeNodeId`
- `activeEdgeId`

当前代码事实:

- `selectedNodeIds` / `selectedEdgeIds` 只有 0 或 1 个元素
- `activeNodeId` 与 `activeEdgeId` 二选一
- `clearSelection()` 会同时清空两者

### `activeNode`

当前激活节点实体。

当选中的是节点时:

- 返回该节点完整对象

否则:

- 返回 `null`

当前主要被默认 inspector 和 `designer-field` 使用。

### `activeEdge`

当前激活边实体。

当选中的是边时:

- 返回该边完整对象

否则:

- 返回 `null`

### `canUndo` / `canRedo`

直接反映 `DesignerCore` 当前 history 是否可回退/重做。

当前用途:

- toolbar 按钮禁用态
- provider 层命令可用性判断

### `isDirty`

表示当前文档是否与最近一次 `save()` 保存的文档不同。

当前实现注意点:

- 只有执行过 `save()` 之后，dirty 语义才真正有参照物
- 底层通过 document revision 与 saved revision 比较，不再在热路径上做 `JSON.stringify` 深比较

### `gridEnabled`

表示 host 侧网格开关状态。

当前它是 core-owned UI state，但不会写回 schema 层。

### `viewport`

当前受控视口摘要。

包含:

- `x`
- `y`
- `zoom`

当前语义:

- 由 core 统一归一化
- 参与 history
- undo / redo / restore 时一起回放

## 3. 当前 renderer 层怎么消费快照

当前不是把 `DesignerSnapshot` 散落到多个 React state 中，而是统一通过 `DesignerContextValue` 暴露。

```ts
interface DesignerContextValue {
  core: DesignerCore
  commandAdapter: DesignerCommandAdapter
  dispatch: (command: DesignerCommand) => DesignerCommandResult
  snapshot: DesignerSnapshot
  config: DesignerConfig
}
```

这意味着 renderer 内部组件有五个核心输入:

- `core`
- `commandAdapter`
- `dispatch`
- `snapshot`
- `config`

## 4. 当前实际暴露给谁

### 已实际暴露给 Flow Designer React 子组件

通过 `DesignerContext` 可直接拿到:

- `snapshot`
- `config`
- `dispatch`
- `core`
- `commandAdapter`

当前明确依赖这些值的组件包括:

- `DesignerPaletteContent`
- `DesignerCanvasContent`
- `DefaultInspector`
- `DesignerFieldRenderer`

### 还没有完整暴露给 schema 表达式 scope

虽然架构文档长期目标里多次写到固定 host scope，但当前 `DesignerPageRenderer` 代码并没有把如下字段写进 `props.scope` 或 child scope:

- `doc`
- `selection`
- `activeNode`
- `activeEdge`
- `runtime`
- `designerCore`

也没有看到类似这样的实际接线:

```ts
runtime.createChildScope(currentScope, {
  doc,
  selection,
  activeNode,
  activeEdge,
  runtime: {...}
})
```

所以要特别注意:

- “架构上推荐暴露哪些 host scope 字段”
- “当前代码已经暴露了哪些 host scope 字段”

这两件事现在还不是一回事。

## 5. 当前 schema 层真正稳定可用的能力

从现状看，schema 层当前稳定可用的是“动作能力”，不是“完整快照变量”。

### 已稳定可用

- `designer:*` namespaced actions
- `toolbar` / `inspector` / `dialogs` region 挂载点
- 通过共享 `dialog` action runtime 打开的 dialog 内继续 dispatch `designer:*`
- `designer-field` 这种由 Flow Designer 自己提供的专用 renderer

### Region capability matrix

| Path | Mounted by `designer-page` | Reads injected designer scope | Dispatches `designer:*` | Covered by regression |
| --- | --- | --- | --- | --- |
| `toolbar` region | Yes | Yes | Yes | Yes |
| `inspector` region | Yes | Yes | Yes | Yes |
| `dialogs` region | Yes | Yes | Yes | Yes |
| shared `dialog` action popup | Via dialog runtime | Inherits popup scope | Yes | Yes |

### 尚未在代码里完整落地

- 通过 `${activeNode.data.label}` 这类表达式直接读取 host snapshot
- 通过 `${selection.count}`、`${doc.name}`、`${runtime.canUndo}` 直接驱动 schema 片段

换句话说，当前 schema 驱动更多体现为:

- 可以在 region 里挂 schema 片段
- 这些片段可以发 `designer:*` action
- `toolbar` / `inspector` / `dialogs` region 片段里的表达式都可以直接读取注入后的 designer snapshot 字段
- `dialogs` region 片段也会走同一份 designer host `scope` / `actionScope`
- dialog 打开后仍会沿用触发它时的 designer action-scope 路径

但“schema 片段天然拿到完整 designer host scope”的部分还没有完全接上线。

## 6. 当前已落地的两条消费路径

### 路径 A: React 子组件直接消费 `snapshot`

调用链:

```text
DesignerCore.getSnapshot()
  -> useDesignerSnapshot(core.subscribe)
  -> DesignerContext.Provider
  -> DefaultInspector / DesignerCanvasContent / DesignerFieldRenderer
```

这是当前最主要、最真实的快照消费方式。

### 路径 B: schema 片段通过 action 与 designer 交互

调用链:

```text
schema fragment event
  -> runtime.dispatch(action)
  -> ActionScope.resolve('designer:*')
  -> createDesignerActionProvider(core)
  -> DesignerCommandAdapter
  -> DesignerCore
```

这是当前 schema 与 designer 的主要写路径。

## 7. 为什么要单独区分 snapshot 和 host scope

因为这两个概念很容易被混用，但职责不同。

### `snapshot`

是 graph runtime 的只读事实快照。

当前已经真实存在，并被 React 子组件稳定消费。

### `host scope`

是把快照重新投影为 schema 表达式和模板可读取的数据上下文。

当前还主要停留在架构目标层面，没有完整接线。

## 8. 当前可依赖字段清单

如果你在改代码或写文档，当前可以安全写成“已存在”的字段只有这些。

### `DesignerSnapshot`

```ts
snapshot.doc
snapshot.selection
snapshot.activeNode
snapshot.activeEdge
snapshot.canUndo
snapshot.canRedo
snapshot.isDirty
snapshot.gridEnabled
snapshot.viewport
```

### `DesignerContextValue`

```ts
ctx.core
ctx.commandAdapter
ctx.dispatch
ctx.snapshot
ctx.config
```

## 9. 当前不应写成“已经存在”的能力

下面这些在设计文档里可以作为目标，但不应在现状说明里写成“已落地”。

- schema 表达式里默认可读 `${doc.*}`
- schema 表达式里默认可读 `${selection.*}`
- schema 表达式里默认可读 `${activeNode.*}`
- schema 表达式里默认可读 `${activeEdge.*}`
- schema 表达式里默认可读 `${runtime.*}`
- schema 层直接拿到 `designerCore`

## 10. 推荐的后续收敛方向

如果后续要把“固定宿主 scope”真正做实，建议按下面顺序收敛:

1. 在 `DesignerPageRenderer` 内为 regions 创建受控 child scope
2. 先只注入只读快照字段，如 `doc`、`selection`、`activeNode`、`activeEdge`
3. 再补 `runtime` 摘要字段
4. 保持写路径继续只走 `designer:*` / command adapter，不把 `core` 直接暴露给公式层

## 11. 调用链图

### 当前真实快照流转

```mermaid
flowchart LR
  A[DesignerCore.getSnapshot] --> B[useDesignerSnapshot]
  B --> C[DesignerContext.Provider]
  C --> D[DefaultInspector]
  C --> E[DesignerCanvasContent]
  C --> F[DesignerFieldRenderer]
```

### 当前真实 schema 写路径

```mermaid
flowchart LR
  A[Schema event] --> B[runtime.dispatch]
  B --> C[ActionScope resolve designer:*]
  C --> D[Designer action provider]
  D --> E[DesignerCommandAdapter]
  E --> F[DesignerCore]
```

### 设计目标中的 host scope 投影

```text
DesignerSnapshot
  -> normalize host data
  -> create child scope for designer-page regions
  -> schema fragment reads ${doc.*} / ${activeNode.*} / ${runtime.*}
```

上面这条目前还是目标，不是现状。

## Related Documents

- `docs/architecture/flow-designer/design.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/collaboration.md`
- `docs/architecture/flow-designer/config-schema.md`
