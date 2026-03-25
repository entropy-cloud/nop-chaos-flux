# Flow Designer 配置模型

本文档描述新的 Flow Designer 配置模型。这里的重点不是“再发明一套页面 schema”，而是定义 graph domain config，并把需要的 UI 片段嵌入现有 schema renderer。

## 1. 总体分层

Flow Designer 由两部分输入组成：

- `designer-page` schema：页面宿主、toolbar、inspector、dialogs 等宿主片段入口
- `DesignerConfig`：图领域配置，定义 nodeTypes、ports、edgeTypes、权限、功能

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

当前实现说明：

- `toolbar` 与 `inspector` 会作为 `designer-page` 的实际 region mount 渲染
- `dialogs` 现在也会作为 `designer-page` 的实际 region mount 渲染，并与 `toolbar` / `inspector` 一样拿到 designer host `scope` 与 `actionScope`
- 当前真正生效的 dialog 路径，是 toolbar / inspector / 其他 schema 片段通过共享 `dialog` action 打开 `SchemaRenderer` 自带的 dialog runtime
- 仍然需要区分两件事：一是 `dialogs` region 片段本身现在已经会挂载；二是通过共享 `dialog` action 打开的弹窗仍然是另一条 dialog runtime 路径
- `packages/flow-designer-renderers/src/index.test.tsx` 现在也有正向回归测试锁定该现状：直接传入 `dialogs` schema 会出现在页面上，避免文档与 live behavior 再次漂移

## 2. GraphDocument

持久化文档只保存图数据。

```ts
interface GraphDocument {
  id: string
  kind: string
  name: string
  version: string
  meta?: Record<string, unknown>
  viewport?: {
    x: number
    y: number
    zoom: number
  }
  nodes: GraphNode[]
  edges: GraphEdge[]
}

interface GraphNode {
  id: string
  type: string
  position: {
    x: number
    y: number
  }
  data: Record<string, unknown>
}

interface GraphEdge {
  id: string
  type: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
  data: Record<string, unknown>
}
```

## 3. DesignerConfig

```ts
interface DesignerConfig {
  $schema?: string
  version: string
  extends?: string | DesignerConfig
  kind: string
  nodeTypes: NodeTypeConfig[]
  edgeTypes?: EdgeTypeConfig[]
  palette?: PaletteConfig
  features?: DesignerFeatures
  rules?: DesignerRules
  permissions?: DesignerPermissions
  canvas?: CanvasConfig
  presets?: string[]
}
```

说明：

- `kind` 用于标识文档类型，比如 `workflow`、`state-machine`
- `extends` 允许继承预设
- `nodeTypes` 是核心配置

### 3.1 版本迁移约束

`GraphDocument.version` 与 `DesignerConfig.version` 不是装饰字段，持久化加载时必须参与迁移协议。

建议约束：

- 迁移按显式 `from -> to` 链顺序执行，不允许隐式跳步
- migration registry 负责注册每一步迁移器
- 迁移失败时返回结构化错误；调用方可选择中断加载或降级为只读模式
- 配置与文档迁移应分别建模，避免把两类演进逻辑揉成一个黑盒函数

### 3.2 复合建模的保留扩展位

当前 `GraphDocument` 仍按扁平 nodes / edges 建模，v1 不预设 subprocess 或 nested document 的最终格式。

但需要明确：

- 当前模型不应阻断未来 group node、visual container、sub-process、document reference 等扩展
- 新增字段时优先扩展 `GraphNode.data` 或受控元数据，而不是提前把嵌套文档写死进基础模型
- 在没有单独规范前，不把复合节点能力写成已定稿行为

## 4. NodeTypeConfig

```ts
interface NodeTypeConfig {
  id: string
  label: string
  description?: string
  icon?: string
  body: SchemaInput
  ports?: PortConfig[]
  roles?: NodeRoleConfig
  constraints?: NodeConstraintConfig
  permissions?: NodePermissionConfig
  defaults?: Record<string, unknown>
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog'
    body: SchemaInput
  }
  createDialog?: {
    title?: string
    body: SchemaInput
    submitAction?: Record<string, unknown>
  }
  quickActions?: SchemaInput
}
```

### 4.1 节点组件 `body` - AMIS JSON 表示

`body` 字段定义节点在画布上的渲染方式，使用标准 AMIS Schema：

```json
{
  "id": "task",
  "label": "任务节点",
  "body": {
    "type": "flex",
    "className": "fd-node-root",
    "items": [
      {
        "type": "icon",
        "icon": "check-circle",
        "className": "fd-node__icon"
      },
      {
        "type": "container",
        "className": "fd-node__content",
        "body": [
          {
            "type": "tpl",
            "tpl": "${label}",
            "className": "fd-node__title"
          },
          {
            "type": "tpl",
            "tpl": "${status}",
            "className": "fd-node__status"
          }
        ]
      }
    ]
  }
}
```

**设计要点**：

1. **完全复用 AMIS Renderer**：`body` 内部可以使用任何已注册的 renderer
2. **组合而非硬编码**：用 `flex`、`container`、`grid` 等容器组合
3. **自定义组件支持**：`{ "type": "my-custom-node" }` 引用自定义注册的 renderer
4. **Scope 自动注入**：节点实例的 `data` 字段自动成为 `body` 的 scope

### 4.2 节点 Scope

节点组件渲染时，自动注入以下 scope：

```ts
interface NodeScope {
  id: string           // 节点实例 ID
  type: string         // 节点类型 ID
  label: string        // 节点类型标签
  position: { x: number; y: number }
  data: Record<string, unknown>  // 节点实例数据
  selected: boolean    // 是否选中
}
```

在 `body` 中可以直接使用：
```json
{
  "type": "tpl",
  "tpl": "${label} - ${data.status}"
}
```

### 4.3 简单节点示例

```json
{
  "id": "start",
  "label": "开始",
  "body": {
    "type": "container",
    "className": "fd-node fd-node--start",
    "body": [
      {
        "type": "icon",
        "icon": "play-circle"
      },
      {
        "type": "tpl",
        "tpl": "${data.label}"
      }
    ]
  },
  "ports": [
    { "id": "out", "direction": "output", "position": "right" }
  ]
}
```

### 4.4 复杂节点示例

```json
{
  "id": "condition",
  "label": "条件分支",
  "body": {
    "type": "container",
    "className": "fd-node fd-node--condition",
    "body": [
      {
        "type": "flex",
        "className": "fd-node__header",
        "items": [
          { "type": "icon", "icon": "git-branch" },
          { "type": "tpl", "tpl": "${data.label}" }
        ]
      },
      {
        "type": "container",
        "className": "fd-node__conditions",
        "body": {
          "type": "each",
          "name": "data.conditions",
          "items": {
            "type": "tpl",
            "tpl": "${expr} → ${target}",
            "className": "fd-node__condition-item"
          }
        }
      }
    ]
  },
  "ports": [
    { "id": "in", "direction": "input", "position": "left" },
    { "id": "out-default", "direction": "output", "position": "right" },
    { "id": "out-true", "direction": "output", "position": "bottom" },
    { "id": "out-false", "direction": "output", "position": "bottom" }
  ]
}
```

### 4.5 自定义节点组件

注册自定义 renderer 后直接引用：

```json
{
  "id": "api-call",
  "label": "API 调用",
  "body": {
    "type": "api-node-renderer"
  }
}
```

自定义组件实现：
```tsx
registerRenderer({
  type: 'api-node-renderer',
  component: ApiNodeRenderer
});

function ApiNodeRenderer({ scope }) {
  const nodeData = scope.data;
  return (
    <div className="fd-node fd-node--api">
      <span>{nodeData.method}</span>
      <code>{nodeData.url}</code>
    </div>
  );
}
```

### 4.6 其他字段说明

- `ports` 是一等公民，不再只是 node 级 role
- `inspector.body`、`createDialog.body` 直接嵌入标准 schema 片段
- `defaults` 用于直接拖拽落图时生成初始数据
- 移除了旧版的 `renderer.type/variant`，统一使用 `body`

## 5. PortConfig

```ts
interface PortConfig {
  id: string
  label?: string
  direction: 'input' | 'output'
  position?: 'top' | 'right' | 'bottom' | 'left'
  roles?: {
    provides?: string[]
    accepts?: string[]
    rejects?: string[]
  }
  maxConnections?: number | 'unlimited'
  appearance?: {
    className?: string
  }
}
```

推荐规则：

- 优先按 port role 判定可连接性
- 若 port 未提供 role，再回退到 node role

## 6. NodeRoleConfig

```ts
interface NodeRoleConfig {
  provides?: string[]
  accepts?: string[]
  rejects?: string[]
}
```

node role 是 port role 的兜底层，不是唯一层。

## 7. NodeConstraintConfig

```ts
interface NodeConstraintConfig {
  maxInstances?: number | 'unlimited'
  minInstances?: number
  allowMove?: boolean
  allowResize?: boolean
  allowIncoming?: boolean
  allowOutgoing?: boolean
  maxIncoming?: number
  maxOutgoing?: number
}
```

## 8. NodePermissionConfig

```ts
interface NodePermissionConfig {
  canCreate?: boolean | string
  canDelete?: boolean | string
  canMove?: boolean | string
  canDuplicate?: boolean | string
  canEdit?: boolean | string
  canConnect?: boolean | string
}
```

值可以是：

- 固定布尔值
- 表达式字符串，由现有 formula/expression compiler 求值

表达式约束建议：

- permission 与 rule expressions 在 designer config normalize 阶段完成编译，运行时只做求值
- 允许访问的 scope 应保持白名单，例如 `doc`、`selection`、`runtime`、`node`、`edge`、`nodeType`、`edgeType`
- 连接校验场景可额外暴露 `sourceNode`、`targetNode`、`sourcePort`、`targetPort`
- 不向表达式层暴露可直接改写 graph store 的对象
- 表达式异常应返回结构化诊断，而不是悄悄吞掉并继续写图

## 9. EdgeTypeConfig

```ts
interface EdgeTypeConfig {
  id: string
  label?: string
  body?: SchemaInput
  appearance?: {
    stroke?: string
    strokeWidth?: number
    strokeStyle?: 'solid' | 'dashed' | 'dotted'
    animated?: boolean
    markerEnd?: 'arrow' | 'arrowClosed' | 'none'
  }
  defaults?: Record<string, unknown>
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog'
    body: SchemaInput
  }
  match?: {
    when?: string
    sourceRoles?: string[]
    targetRoles?: string[]
  }
}
```

### 9.1 边组件 `body` - AMIS JSON 表示（可选）

边的 `body` 用于渲染边上的标签或装饰：

```json
{
  "id": "conditional",
  "label": "条件边",
  "body": {
    "type": "container",
    "className": "fd-edge-label",
    "body": [
      {
        "type": "badge",
        "text": "${data.condition}",
        "level": "info"
      }
    ]
  },
  "appearance": {
    "strokeStyle": "dashed",
    "markerEnd": "arrowClosed"
  }
}
```

### 9.2 边 Scope

边组件渲染时，自动注入以下 scope：

```ts
interface EdgeScope {
  id: string
  type: string
  source: string
  target: string
  sourcePort?: string
  targetPort?: string
  data: Record<string, unknown>
  selected: boolean
}
```

### 9.3 简单边示例

```json
{
  "id": "default",
  "label": "默认边",
  "appearance": {
    "stroke": "#94a3b8",
    "strokeWidth": 2,
    "markerEnd": "arrowClosed"
  }
}
```

### 9.4 带标签的边示例

```json
{
  "id": "labeled",
  "label": "带标签边",
  "body": {
    "type": "tpl",
    "tpl": "${data.label}",
    "className": "fd-edge-label"
  },
  "appearance": {
    "stroke": "#3b82f6",
    "strokeWidth": 2
  }
}
```

### 9.5 条件边示例

```json
{
  "id": "condition-true",
  "label": "True 分支",
  "body": {
    "type": "badge",
    "text": "✓",
    "level": "success"
  },
  "appearance": {
    "stroke": "#10b981",
    "strokeStyle": "solid"
  },
  "match": {
    "sourceRoles": ["condition-output-true"]
  }
}
```

### 9.6 边渲染说明

- 无 `body` 的边只渲染路径，不显示标签
- `body` 渲染在边的中点位置
- 底层 xyflow 负责 Handle 连接和路径计算
- `appearance` 控制路径样式，`body` 控制标签内容

## 10. PaletteConfig

```ts
interface PaletteConfig {
  searchable?: boolean
  groups: PaletteGroupConfig[]
}

interface PaletteGroupConfig {
  id: string
  label: string
  description?: string
  nodeTypes: string[]
  expanded?: boolean
}
```

## 11. DesignerRules

```ts
interface DesignerRules {
  allowSelfLoop?: boolean
  allowMultiEdge?: boolean
  defaultEdgeType?: string
  validateConnection?: string
}
```

说明：

- `validateConnection` 是附加校验，不替代 port/node role 匹配

建议它与 `NodePermissionConfig` 共享同一表达式编译缓存与错误报告模型。

## 12. DesignerFeatures

```ts
interface DesignerFeatures {
  undo?: boolean
  redo?: boolean
  history?: boolean
  grid?: boolean
  minimap?: boolean
  fitView?: boolean
  export?: boolean
  shortcuts?: boolean
  floatingToolbar?: boolean
  clipboard?: boolean
  autoLayout?: boolean
  multiSelect?: boolean
}
```

## 13. CanvasConfig

```ts
interface CanvasConfig {
  background?: 'dots' | 'lines' | 'cross' | 'none'
  gridSize?: number
  minZoom?: number
  maxZoom?: number
  defaultZoom?: number
  pannable?: boolean
  zoomable?: boolean
  snapToGrid?: boolean
}
```

## 13.1 ToolbarConfig

工具栏支持两种配置方式：

### 方式一：使用预定义按钮（推荐）

```ts
interface ToolbarConfig {
  items: ToolbarItem[]
}

type ToolbarItem =
  | { type: 'back'; label?: string }
  | { type: 'title'; tpl: string }
  | { type: 'badge'; text: string; level: string }
  | { type: 'text'; tpl: string }
  | { type: 'divider' }
  | { type: 'spacer' }
  | { type: 'button'; action: string; icon?: string; label?: string; disabled?: string; active?: string; variant?: 'default' | 'primary' | 'danger' }

interface DesignerConfig {
  // ...
  toolbar?: ToolbarConfig
}
```

**示例**：

```json
{
  "toolbar": {
    "items": [
      { "type": "back" },
      { "type": "title", "tpl": "${doc.name}" },
      { "type": "badge", "level": "${isDirty ? 'warning' : 'success'}", "text": "${isDirty ? '未保存' : '已保存'}" },
      { "type": "divider" },
      { "type": "text", "tpl": "${doc.nodes.length} 节点" },
      { "type": "divider" },
      { "type": "button", "action": "designer:undo", "icon": "RotateCcw", "label": "撤销", "disabled": "${!canUndo}" },
      { "type": "button", "action": "designer:redo", "icon": "RotateCw", "label": "重做", "disabled": "${!canRedo}" },
      { "type": "spacer" },
      { "type": "button", "action": "designer:save", "icon": "Save", "label": "保存", "variant": "primary", "disabled": "${!isDirty}" }
    ]
  }
}
```

### 方式二：使用完整 AMIS Schema

```json
{
  "toolbar": {
    "type": "container",
    "className": "fd-toolbar",
    "body": [
      {
        "type": "button",
        "label": "撤销",
        "disabledOn": "${!canUndo}",
        "onClick": { "action": "designer:undo" }
      },
      {
        "type": "button",
        "label": "保存",
        "level": "primary",
        "disabledOn": "${!isDirty}",
        "onClick": { "action": "designer:save" }
      }
    ]
  }
}
```

### 默认工具栏

如果不配置 `toolbar`，使用默认按钮：

```ts
const defaultToolbarItems: ToolbarItem[] = [
  { type: 'back' },
  { type: 'title', tpl: '${doc.name}' },
  { type: 'badge', level: '${isDirty ? "warning" : "success"}', text: '${isDirty ? "未保存" : "已保存"}' },
  { type: 'divider' },
  { type: 'button', action: 'designer:undo', icon: 'RotateCcw', disabled: '${!canUndo}' },
  { type: 'button', action: 'designer:redo', icon: 'RotateCw', disabled: '${!canRedo}' },
  { type: 'spacer' },
  { type: 'button', action: 'designer:save', icon: 'Save', variant: 'primary', disabled: '${!isDirty}' }
]
```

### Toolbar Scope

工具栏渲染时可用的 scope：

```ts
interface ToolbarScope {
  doc: GraphDocument       // 当前文档
  selection: SelectionSummary
  canUndo: boolean
  canRedo: boolean
  isDirty: boolean
  gridEnabled: boolean
  viewport: { x: number; y: number; zoom: number }
}
```

## 13.2 ShortcutsConfig

```ts
interface ShortcutsConfig {
  undo?: string[]
  redo?: string[]
  copy?: string[]
  paste?: string[]
  delete?: string[]
  selectAll?: string[]
  save?: string[]
}
```

**示例**：

```json
{
  "shortcuts": {
    "undo": ["Ctrl+Z", "Cmd+Z"],
    "redo": ["Ctrl+Y", "Cmd+Y", "Ctrl+Shift+Z", "Cmd+Shift+Z"],
    "copy": ["Ctrl+C", "Cmd+C"],
    "paste": ["Ctrl+V", "Cmd+V"],
    "delete": ["Delete", "Backspace"],
    "selectAll": ["Ctrl+A", "Cmd+A"],
    "save": ["Ctrl+S", "Cmd+S"]
  }
}
```

**默认快捷键**：

```ts
const defaultShortcuts: ShortcutsConfig = {
  undo: ['Ctrl+Z', 'Cmd+Z'],
  redo: ['Ctrl+Y', 'Cmd+Y', 'Ctrl+Shift+Z', 'Cmd+Shift+Z'],
  copy: ['Ctrl+C', 'Cmd+C'],
  paste: ['Ctrl+V', 'Cmd+V'],
  delete: ['Delete', 'Backspace']
}
```

## 14. 宿主 schema 示例

```ts
const schema = {
  type: 'designer-page',
  title: 'Workflow Designer',
  document: workflowDocument,
  config: workflowDesignerConfig,
  toolbar: {
    type: 'container',
    body: [
      {
        type: 'button',
        label: 'Undo',
        onClick: {
          action: 'designer:undo'
        }
      },
      {
        type: 'button',
        label: 'Auto Layout',
        onClick: {
          action: 'designer:autoLayout'
        }
      }
    ]
  },
  inspector: {
    type: 'container',
    body: [
      {
        type: 'tpl',
        tpl: '当前节点: ${activeNode.data.label}'
      }
    ]
  }
}
```

## 15. 完整示例：Workflow Designer

基于 nop-chaos-next flow editor 实现的完整配置示例，配置和文档分离存放：

| 文件 | 说明 |
|------|------|
| `docs/examples/workflow-designer/config.json` | DesignerConfig - 节点类型、边类型、工具栏等配置 |
| `docs/examples/workflow-designer/document.json` | GraphDocument - 流程实例数据（节点、边、视口） |

### 15.1 配置要点

**节点类型**（6 种）：
- `start` - 开始节点，唯一，无输入端口
- `end` - 结束节点，无输出端口
- `task` - 任务节点，服务调用/脚本/审批
- `condition` - 条件节点，两个输出端口（是/否）
- `parallel` - 并行节点，多分支执行
- `loop` - 循环节点，重复执行

**工具栏按钮**（从左到右）：
1. 返回 - `{ type: 'back' }`
2. 标题 - `{ type: 'title', tpl: '${doc.name}' }`
3. 状态徽章 - `{ type: 'badge', ... }`
4. 统计信息 - `{ type: 'text', tpl: '${doc.nodes.length} 节点' }`
5. 网格开关 - `{ type: 'button', action: 'designer:toggle-grid', ... }`
6. 撤销/重做 - `{ type: 'button', action: 'designer:undo', ... }`
7. 恢复/导出 - `{ type: 'button', action: 'designer:restore', ... }`
8. 保存 - `{ type: 'button', action: 'designer:save', variant: 'primary' }`

**面板分组**：
- 基础节点：start, end
- 逻辑控制：condition, parallel, loop
- 执行任务：task

### 15.2 designer-page Schema

`designer-page` 引用上述配置文件和文档文件：

```json
{
  "type": "designer-page",
  "title": "Workflow Designer",
  "document": { "/* GraphDocument，参见 document.json */" },
  "config": { "/* DesignerConfig，参见 config.json */" }
}
```

实际使用时，`document` 和 `config` 分别加载对应的 JSON 文件内容。

完整配置和文档数据见：
- `docs/examples/workflow-designer/config.json`
- `docs/examples/workflow-designer/document.json`

## 16. Icon 命名规范

使用 Lucide Icons，配置中采用 kebab-case 格式：

```json
{
  "icon": "rotate-ccw",     // ✅ 推荐
  "icon": "git-branch",     // ✅ 推荐
  "icon": "RotateCcw"       // ❌ 避免
}
```

运行时转换规则：`'rotate-ccw'` → `'RotateCcw'`

常用图标对照：

| kebab-case | PascalCase | 用途 |
|------------|------------|------|
| `play` | `Play` | 开始节点 |
| `flag` | `Flag` | 结束节点 |
| `workflow` | `Workflow` | 任务节点 |
| `git-branch` | `GitBranch` | 条件节点 |
| `git-merge` | `GitMerge` | 并行节点 |
| `repeat` | `Repeat` | 循环节点 |
| `rotate-ccw` | `RotateCcw` | 撤销 |
| `rotate-cw` | `RotateCw` | 重做 |
| `save` | `Save` | 保存 |
| `download` | `Download` | 恢复 |
| `file-json` | `FileJson` | 导出 |
| `grid-3x3` | `Grid3x3` | 网格 |
| `chevron-left` | `ChevronLeft` | 返回 |

## 17. 推荐约束

- inspector 和 create dialog 优先使用 schema 片段，而不是新增字段 DSL
- port 应优先于 node role 建模
- `defaults` 必须足够支持“直接拖拽即落图”
- `createDialog` 只用于复杂初始化，不应强迫所有节点走表单
