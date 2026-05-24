# Flow Designer 配置模型

本文档描述新的 Flow Designer 配置模型。这里的重点不是“再发明一套页面 schema”，而是定义 graph domain config，并把需要的 UI 片段嵌入现有 schema renderer。

## 1. 总体分层

Flow Designer 由两部分输入组成：

- `designer-page` schema：页面宿主、toolbar、inspector、dialogs 等宿主片段入口
- `DesignerConfig`：图领域配置，定义 nodeTypes、ports、edgeTypes、权限、功能

```ts
interface DesignerPageSchema {
  type: 'designer-page';
  id?: string;
  title?: string;
  document: GraphDocumentInput;
  config: DesignerConfig;
  statusPath?: string;
  toolbar?: SchemaInput;
  inspector?: SchemaInput;
  dialogs?: SchemaInput;
}
```

当前实现说明：

- `toolbar` 与 `inspector` 会作为 `designer-page` 的实际 region mount 渲染
- `dialogs` 现在也会作为 `designer-page` 的实际 region mount 渲染，并与 `toolbar` / `inspector` 一样拿到 designer host `scope` 与 `actionScope`
- `statusPath` 当前也已落地，用于向宿主外部发布 `DesignerHostStatusSummary` 这类窄摘要，不与 region host scope 混用
- 当前真正生效的 dialog 路径，是 toolbar / inspector / 其他 schema 片段通过共享 `dialog` action 打开 `SchemaRenderer` 自带的 dialog runtime
- 仍然需要区分两件事：一是 `dialogs` region 片段本身现在已经会挂载；二是通过共享 `dialog` action 打开的弹窗仍然是另一条 dialog runtime 路径
- `packages/flow-designer-renderers/src/designer-page-rendering.test.tsx` 现在有正向回归测试锁定该现状：直接传入 `dialogs` schema 会出现在页面上，避免文档与 live behavior 再次漂移
- 根据 `docs/architecture/designer-workbench-shell.md`，左侧 palette 与右侧 inspector 的 canonical existence 来自 resolved config，而不是来自 renderer 私有固定栏位；没有 resolved panel definition 时，该侧应整体隐藏而不是保留空 rail

### 1.1 树模式文档字段

在树模式下，`DesignerPageSchema` 可以通过 `treeDocument` 字段传递树文档：

```ts
interface DesignerPageSchema {
  // ... 现有字段 ...
  treeDocument?: TreeDocument;
}
```

当 `config.documentMode` 为 `'tree'` 时，应使用 `treeDocument` 字段而非 `document` 字段。当前 formal schema validation 也会把这条前置条件编码为 builder-facing contract：tree mode 缺少 `treeDocument` 会报错；非 tree mode 缺少 `document` 也会报错。运行时会先把 `treeDocument` 投影成 `GraphDocument`，然后用同一个 `DesignerCore` 通过 `replaceDocument(...)` 保持 tree 编辑前后的 `selection`、`history`、`snapshot` 连续性。

## 2. GraphDocument

持久化文档只保存图数据。

```ts
interface GraphDocument {
  id: string;
  kind: string;
  name: string;
  version: string;
  meta?: Record<string, unknown>;
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface GraphNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: Record<string, unknown>;
}

interface GraphEdge {
  id: string;
  type: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  data: Record<string, unknown>;
}
```

`sourcePort` / `targetPort` 是当前 live baseline 的一部分：connect、reconnect、duplicate-edge 校验、`designer:addEdge` / `designer:reconnectEdge`、持久化文档、以及 Xyflow `sourceHandle` / `targetHandle` 回渲染都会保留这两个字段。

## 3. DesignerConfig

```ts
interface DesignerConfig {
  $schema?: string;
  version: string;
  extends?: string | DesignerConfig;
  kind: string;
  nodeTypes: NodeTypeConfig[];
  edgeTypes?: EdgeTypeConfig[];
  palette?: PaletteConfig;
  features?: DesignerFeatures;
  rules?: DesignerRules;
  canvas?: CanvasConfig;
  presets?: string[];
}
```

说明：

- `kind` 用于标识文档类型，比如 `workflow`、`state-machine`
- `extends` 允许继承预设
- `nodeTypes` 是核心配置
- `palette` 定义左侧 palette 的 canonical config surface；当其解析结果为空时，左侧工作台应隐藏
- `DesignerConfig` 只定义通用 graph editor 配置；某个 domain 如何把 `GraphDocument` round-trip 成自己的值 DSL，不属于 `DesignerConfig` 本体职责

### 3.0.2 树模式配置字段

`DesignerConfig` 支持两个新的可选字段用于树模式：

```ts
interface DesignerConfig {
  // ... 现有字段 ...
  documentMode?: 'graph' | 'tree';
  treeConfig?: TreeConfig;
}
```

- `documentMode`：指定文档模式，默认为 `'graph'`。设置为 `'tree'` 时启用树模式。
- `treeConfig`：树模式特定的配置，仅在 `documentMode` 为 `'tree'` 时生效。

### 3.0 通用 graph config 与动态 domain library

对于“平台固定代码 + 业务逻辑动态加载”的部署模型，推荐把 domain-specific round-trip、validator、codec 放在动态库中，而不是塞进 `flow-designer` core。

推荐模式：

- `designer-page` 或其 owner 容器通过 `xui:imports` 声明需要的 domain namespace
- host 通过 `env.importLoader` 受控加载动态模块
- 动态模块把能力暴露为 namespace provider，例如 `actionGraph:*`
- `DesignerConfig` 继续只描述 graph editor 自身的通用配置，不直接承载某个 domain 的 lowering 语义

这条边界的结果是：

- `flow-designer` 可以作为图形编辑内核被不同 domain 复用
- 但 `workflow`、`action-graph`、`state-machine` 的 import/export/validate 逻辑仍是外部 domain 库责任

### 3.0.1 Graph-backed owners use the general value adaptation pattern

如果某个 owner 组件把 graph editor 当作内部复杂 UI 使用，那么它仍应走通用的 value adaptation owner pattern，而不是定义一套 graph 专属字段协议。

推荐边界：

- owner 继续通过 `name` 绑定外部值
- owner 内部可以维护 `GraphDocument` 或其他复杂 draft
- 值转换和校验通过通用的 `transformInAction` / `transformOutAction` / `validateValueAction` 完成
- 这些动作可以绑定到 `xui:imports` 动态导入的 domain namespace

详情见：`docs/architecture/value-adaptation-and-detail-field.md`

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
  id: string;
  label: string;
  description?: string;
  icon?: string;
  body: SchemaInput;
  ports?: PortConfig[];
  roles?: NodeRoleConfig;
  constraints?: NodeConstraintConfig;
  defaults?: Record<string, unknown>;
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog';
    body: SchemaInput;
  };
  createDialog?: {
    title?: string;
    body: SchemaInput;
    submitAction?: ActionSchema | ActionSchema[];
  };
  quickActions?: SchemaInput;
}
```

### 4.1 节点组件 `body` - Flux JSON 表示

`body` 字段定义节点在画布上的渲染方式，使用标准 Flux schema：

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
            "type": "text",
            "text": "${label}",
            "className": "fd-node__title"
          },
          {
            "type": "text",
            "text": "${status}",
            "className": "fd-node__status"
          }
        ]
      }
    ]
  }
}
```

**设计要点**：

1. **完全复用 Flux Renderer**：`body` 内部可以使用任何已注册的 renderer
2. **组合而非硬编码**：用 `flex`、`container`、`grid` 等容器组合
3. **自定义组件支持**：`{ "type": "my-custom-node" }` 引用自定义注册的 renderer
4. **Scope 自动注入**：节点 body 当前接收 `{ node, data }` 形式的绑定，其中 `data` 是节点实例数据，`node` 是最小节点视图

### 4.2 节点 Body 绑定

节点组件渲染时，当前 live renderer 为 `body` 提供的绑定形状是：

```ts
interface NodeBodyBindings {
  node: {
    id: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
  };
  data: Record<string, unknown>;
}
```

其中：

- `data` 是节点实例数据本身，便于直接写 `${data.status}`
- `node` 提供节点级元信息，便于写 `${node.label}`、`${node.id}`
- `position` 与 `selected` 不是当前稳定注入到 body binding 的字段

在 `body` 中当前更准确的写法是：

```json
{
  "type": "text",
  "text": "${node.label} - ${data.status}"
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
        "type": "text",
        "text": "${data.label}"
      }
    ]
  },
  "ports": [{ "id": "out", "direction": "output", "position": "right" }]
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
          { "type": "text", "text": "${data.label}" }
        ]
      },
      {
        "type": "container",
        "className": "fd-node__conditions",
        "body": {
          "type": "loop",
          "name": "data.conditions",
          "body": {
            "type": "text",
            "text": "${item.expr} → ${item.target}",
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
  component: ApiNodeRenderer,
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

当前落地补充：

- 默认 inspector 已优先消费 `nodeTypes[].inspector.body`，renderer 不再维护领域专属 inspector 表单 DSL
- tree 模式 add-node 菜单项集合已直接从 `config.nodeTypes` 派生
- renderer 内置的节点字段表单/菜单目录只保留为兼容兜底，不再是主配置来源
- playground 中的 `workflow-designer-schema.json`、`dingtalk-workflow-tree-schema.json`、`action-flow-tree-schema.json` 现都已采用显式 `inspector.body` 作为维护路径，可作为 schema-first 参考样例
- `edgeTypes[].inspector.body` 与 `mode?: 'panel' | 'drawer' | 'dialog'` 已在 schema 合同中定义，但当前 live renderer 仍主要对 edge 走简单 fallback 编辑，尚未像 node inspector 一样完整消费这些 schema 字段

## 5. PortConfig

```ts
interface PortConfig {
  id: string;
  label?: string;
  direction: 'input' | 'output';
  position?: 'top' | 'right' | 'bottom' | 'left';
  roles?: {
    provides?: string[];
    accepts?: string[];
    rejects?: string[];
  };
  maxConnections?: number | 'unlimited';
  appearance?: {
    className?: string;
  };
}
```

推荐规则：

- 优先按 port role 判定可连接性
- 若 port 未提供 role，再回退到 node role

## 6. NodeRoleConfig

```ts
interface NodeRoleConfig {
  provides?: string[];
  accepts?: string[];
  rejects?: string[];
}
```

node role 是 port role 的兜底层，不是唯一层。

## 7. NodeConstraintConfig

```ts
interface NodeConstraintConfig {
  maxInstances?: number | 'unlimited';
  minInstances?: number;
  allowMove?: boolean;
  allowResize?: boolean;
  allowIncoming?: boolean;
  allowOutgoing?: boolean;
  maxIncoming?: number;
  maxOutgoing?: number;
}
```

## 8. Permission Boundary

Flow Designer runtime does not own permission semantics.

- `designer-page` and `DesignerConfig` should not carry runtime permission evaluation fields.
- Permission pruning is an upstream platform responsibility.
- Runtime only executes graph/document constraints (topology, role/port matching, limits, and validation) on already-pruned schema.

See:

- `docs/architecture/security-design-requirements.md`
- `docs/architecture/flow-designer/design.md`

## 9. EdgeTypeConfig

```ts
interface EdgeTypeConfig {
  id: string;
  label?: string;
  body?: SchemaInput;
  appearance?: {
    stroke?: string;
    strokeWidth?: number;
    strokeStyle?: 'solid' | 'dashed' | 'dotted';
    animated?: boolean;
    markerEnd?: 'arrow' | 'arrowClosed' | 'none';
  };
  defaults?: Record<string, unknown>;
  inspector?: {
    mode?: 'panel' | 'drawer' | 'dialog';
    body: SchemaInput;
  };
  match?: {
    when?: string;
    sourceRoles?: string[];
    targetRoles?: string[];
  };
}
```

### 9.1 边组件 `body` - Flux JSON 表示（可选）

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
  id: string;
  type: string;
  source: string;
  target: string;
  sourcePort?: string;
  targetPort?: string;
  data: Record<string, unknown>;
  selected: boolean;
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
    "type": "text",
    "text": "${data.label}",
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
  searchable?: boolean;
  groups: PaletteGroupConfig[];
}

interface PaletteGroupConfig {
  id: string;
  label: string;
  description?: string;
  nodeTypes: string[];
  expanded?: boolean;
}
```

补充说明：

- `palette.groups` 仍是 palette 面板的分组配置来源
- tree 模式下 canvas 上的 add-node 浮层菜单不再单独维护 renderer 内置节点目录，而是从 `config.nodeTypes` 直接派生可添加项，再应用窄的结构过滤规则（如排除 terminal/root-only 类型）

## 11. DesignerRules

```ts
interface DesignerRules {
  allowSelfLoop?: boolean;
  allowMultiEdge?: boolean;
  defaultEdgeType?: string;
}
```

说明：

- `DesignerRules` 只保留可静态声明的结构化连线约束
- 节点可连接性应通过 port/node role、schema 预裁剪、以及 host 侧显式命令校验实现
- 不再支持运行时字符串表达式形式的 `validateConnection`，避免把动态表达式执行引入 designer core

## 12. DesignerFeatures

```ts
interface DesignerFeatures {
  undo?: boolean;
  redo?: boolean;
  history?: boolean;
  grid?: boolean;
  minimap?: boolean;
  fitView?: boolean;
  export?: boolean;
  shortcuts?: boolean;
  floatingToolbar?: boolean;
  clipboard?: boolean;
  autoLayout?: boolean;
  multiSelect?: boolean;
}
```

## 13. CanvasConfig

```ts
interface CanvasConfig {
  background?: 'dots' | 'lines' | 'cross' | 'none';
  gridSize?: number;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
  pannable?: boolean;
  zoomable?: boolean;
  snapToGrid?: boolean;
}
```

## 13.1 ToolbarConfig

`config.toolbar` 只负责配置 `designer-page` 内置默认 toolbar 的 item 集合；它不是完整 schema 容器。

如果需要直接覆盖 page 级 toolbar UI，使用 `DesignerPageSchema.toolbar?: SchemaInput`。这两个入口的边界是：

- `config.toolbar.items`：built-in default toolbar 的轻量 item config
- `designer-page.toolbar`：显式 schema override surface，直接替换默认 toolbar 内容

工具栏支持两种入口，但只有一种 schema 入口：

### 方式一：使用预定义按钮（推荐）

```ts
interface ToolbarConfig {
  items: ToolbarItem[];
}

type ToolbarItem =
  | { type: 'back'; label?: string }
  | { type: 'title'; body: string }
  | { type: 'badge'; text: string; level: string }
  | { type: 'text'; text: string }
  | { type: 'divider' }
  | { type: 'spacer' }
  | {
      type: 'button';
      action: string;
      icon?: string;
      label?: string;
      disabled?: string;
      active?: string;
      intent?: 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';
    };

interface DesignerConfig {
  // ...
  toolbar?: ToolbarConfig;
}
```

**示例**：

```json
{
  "toolbar": {
    "items": [
      { "type": "back" },
      { "type": "title", "body": "${doc.name}" },
      {
        "type": "badge",
        "level": "${runtime.dirty ? 'warning' : 'success'}",
        "text": "${runtime.dirty ? '未保存' : '已保存'}"
      },
      { "type": "divider" },
      { "type": "text", "text": "${doc.nodes.length} 节点" },
      { "type": "divider" },
      {
        "type": "button",
        "action": "designer:undo",
        "icon": "rotate-ccw",
        "label": "撤销",
        "disabled": "${!runtime.canUndo}"
      },
      {
        "type": "button",
        "action": "designer:redo",
        "icon": "rotate-cw",
        "label": "重做",
        "disabled": "${!runtime.canRedo}"
      },
      { "type": "spacer" },
      {
        "type": "button",
        "action": "designer:save",
        "icon": "save",
        "label": "保存",
        "intent": "primary",
        "disabled": "${!runtime.dirty}"
      }
    ]
  }
}
```

### `designer-page.toolbar` schema override

```json
{
  "type": "designer-page",
  "toolbar": {
    "type": "container",
    "body": [
      {
        "type": "button",
        "label": "撤销",
        "disabled": "${!runtime.canUndo}",
        "onClick": { "action": "designer:undo" }
      },
      {
        "type": "button",
        "label": "保存",
        "intent": "primary",
        "disabled": "${!runtime.dirty}",
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
  { type: 'title', body: '${doc.name}' },
  { type: 'text', text: '${doc.nodes.length} 节点' },
  {
    type: 'badge',
    level: '${runtime.dirty ? "warning" : "success"}',
    text: '${runtime.dirty ? "未保存" : "已保存"}',
  },
  { type: 'divider' },
  { type: 'button', action: 'designer:undo', icon: 'rotate-ccw', disabled: '${!runtime.canUndo}' },
  { type: 'button', action: 'designer:redo', icon: 'rotate-cw', disabled: '${!runtime.canRedo}' },
  { type: 'spacer' },
  {
    type: 'button',
    action: 'designer:save',
    icon: 'save',
    intent: 'primary',
    disabled: '${!runtime.dirty}',
  },
];
```

### Toolbar Scope

工具栏渲染时可用的 scope：

```ts
interface ToolbarScope {
  doc: GraphDocument; // 当前文档
  selection: SelectionSummary;
  activeNode: GraphNode | null;
  activeEdge: GraphEdge | null;
  runtime: {
    canUndo: boolean;
    canRedo: boolean;
    dirty: boolean;
    gridEnabled: boolean;
    zoom: number;
    viewport: { x: number; y: number; zoom: number };
  };
}
```

## 13.2 ShortcutsConfig

```ts
interface ShortcutsConfig {
  undo?: string[];
  redo?: string[];
  copy?: string[];
  paste?: string[];
  delete?: string[];
  selectAll?: string[];
  save?: string[];
}
```

**示例**：

```json
{
  "shortcuts": {
    "undo": ["Ctrl+Z", "Cmd+Z"],
    "redo": ["Ctrl+Y", "Cmd+Shift+Z"],
    "copy": ["Ctrl+C", "Cmd+C"],
    "paste": ["Ctrl+V", "Cmd+V"],
    "delete": ["Delete", "Backspace"],
    "save": ["Ctrl+S", "Cmd+S"]
  }
}
```

**默认快捷键**：

```ts
const defaultShortcuts: ShortcutsConfig = {
  undo: ['Ctrl+Z', 'Cmd+Z'],
  redo: ['Ctrl+Y', 'Cmd+Shift+Z'],
  copy: ['Ctrl+C', 'Cmd+C'],
  paste: ['Ctrl+V', 'Cmd+V'],
  delete: ['Delete', 'Backspace'],
};
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
          action: 'designer:undo',
        },
      },
      {
        type: 'button',
        label: 'Auto Layout',
        onClick: {
          action: 'designer:autoLayout',
        },
      },
    ],
  },
  inspector: {
    type: 'container',
    body: [
      {
        type: 'text',
        text: '当前节点: ${activeNode.data.label}',
      },
    ],
  },
};
```

## 15. 完整示例：Workflow Designer

基于 nop-chaos-next flow editor 实现的完整配置示例，配置和文档分离存放：

| 文件                                            | 说明                                            |
| ----------------------------------------------- | ----------------------------------------------- |
| `docs/examples/workflow-designer/config.json`   | DesignerConfig - 节点类型、边类型、工具栏等配置 |
| `docs/examples/workflow-designer/document.json` | GraphDocument - 流程实例数据（节点、边、视口）  |

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
2. 标题 - `{ type: 'title', body: '${doc.name}' }`
3. 状态徽章 - `{ type: 'badge', ... }`
4. 统计信息 - `{ type: 'text', text: '${doc.nodes.length} 节点' }`
5. 网格开关 - `{ type: 'button', action: 'designer:toggle-grid', ... }`
6. 撤销/重做 - `{ type: 'button', action: 'designer:undo', ... }`
7. 恢复/导出 - `{ type: 'button', action: 'designer:restore', ... }`
8. 保存 - `{ type: 'button', action: 'designer:save', intent: 'primary' }`

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

## 16. 通用约定

以下约定参见 `docs/references/flux-json-conventions.md`：

- **表达式语法**：统一使用 `${xxx}`，不需要 `xxxOn` 后缀
- **Action 语法**：简单 action 直接写 `{ "action": "designer:save" }`
- **样式属性**：Button 用组件私有 `variant`，Badge 用 `level`。`designer-page.toolbar.items[].intent` 用于 toolbar 动作语义，当前 live baseline 支持 `neutral`、`primary`、`danger`、`warning`、`success`、`info`，再映射到实际 UI button variants；它不等同于通用 `ButtonSchema.variant` 枚举。
- **Icon 命名**：配置用 kebab-case，运行时转 PascalCase
- **JSON Key**：统一 camelCase
- **Config 与 Data 分离**：`config` 定义类型，`document` 存实例
- **Region 配置**：支持 `config.toolbar.items` 这类轻量 config，或 `designer-page.toolbar` / `inspector` / `dialogs` 这类显式 schema override surface

## 17. 推荐约束

- inspector 和 create dialog 优先使用 schema 片段，而不是新增字段 DSL
- port 应优先于 node role 建模
- `defaults` 必须足够支持"直接拖拽即落图"
- `createDialog` 只用于复杂初始化，不应强迫所有节点走表单

## 18. TailwindCSS 集成

Flow Designer 使用 TailwindCSS 作为样式方案，与 `nop-chaos-next` 保持完全一致的 token 和 CSS 变量。

### 18.1 包结构

```
packages/tailwind-preset/
├── src/
│   └── index.ts           # TailwindCSS preset
packages/theme-tokens/
├── src/
│   ├── index.ts
│   └── styles.css         # 主题 CSS 变量（classic/glass，light/dark）
```

### 18.2 CSS 变量一致性

以下文件与 `nop-chaos-next` 完全一致，可直接替换：

| 文件                                    | 说明                                       |
| --------------------------------------- | ------------------------------------------ |
| `packages/tailwind-preset/src/index.ts` | TailwindCSS preset 配置                    |
| `packages/theme-tokens/src/styles.css`  | 主题 CSS 变量（classic/glass，light/dark） |

### 18.3 响应式断点

使用 TailwindCSS 内置断点：

| 断点  | 最小宽度 | 对应设备 |
| ----- | -------- | -------- |
| `sm`  | 640px    | 手机横屏 |
| `md`  | 768px    | 平板     |
| `lg`  | 1024px   | 笔记本   |
| `xl`  | 1280px   | 桌面     |
| `2xl` | 1536px   | 大屏     |

### 18.4 主题切换

支持两种主题模式：

```html
<!-- Classic 主题 -->
<html data-theme="classic" data-mode="light">
  <html data-theme="classic" data-mode="dark">
    <!-- Glass 主题 -->
    <html data-theme="glass" data-mode="light">
      <html data-theme="glass" data-mode="dark"></html>
    </html>
  </html>
</html>
```

### 18.5 常用 TailwindCSS 类

Flow Designer 特定组件可使用以下类：

```tsx
// 节点卡片
<div className="fd-node fd-node--selected">

// 使用 TailwindCSS（推荐）
<div className="min-w-[160px] px-4 py-3 border rounded-lg shadow-sm
                bg-card border-border hover:border-primary transition-colors">

// 响应式三栏布局
<div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
```

### 18.6 主题卡片

使用 `.theme-card` 类实现毛玻璃效果：

```tsx
<div className="theme-card rounded-xl p-4">{/* 内容 */}</div>
```

## 19. TreeDocument (Tree Mode)

树模式文档用于表示具有层次结构的流程，例如审批流程、决策树等。

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
  child?: TreeNode; // 链式序列 — 单个子节点
  branches?: TreeNodeBranch[]; // 分支节点
}

interface TreeNodeBranch {
  id: string;
  data: Record<string, unknown>;
  child?: TreeNode;
}
```

说明：

- `root`：树的根节点
- `TreeNode.child`：单链节点，表示顺序执行的后续节点
- `TreeNode.branches`：分支节点，表示条件分支或并行分支
- `TreeNodeBranch`：分支定义，包含分支条件和指向的子节点

### 19.1 树文档示例

以下是一个钉钉审批流程的简化示例：

```json
{
  "id": "leave-approval",
  "kind": "dingtalk-workflow",
  "name": "请假审批",
  "version": "1.0",
  "root": {
    "id": "start",
    "type": "dt-initiator",
    "data": { "label": "发起人" },
    "child": {
      "id": "approval-1",
      "type": "dt-approval",
      "data": { "label": "主管审批" },
      "child": {
        "id": "end",
        "type": "dt-end",
        "data": { "label": "结束" }
      }
    }
  }
}
```

### 19.2 分支节点示例

以下是一个包含分支的树文档示例：

```json
{
  "id": "condition-example",
  "kind": "workflow",
  "name": "条件分支示例",
  "version": "1.0",
  "root": {
    "id": "start",
    "type": "dt-initiator",
    "data": { "label": "开始" },
    "child": {
      "id": "gateway",
      "type": "dt-gateway",
      "data": { "label": "条件网关" },
      "branches": [
        {
          "id": "branch-true",
          "data": { "condition": "true", "label": "是" },
          "child": {
            "id": "task-1",
            "type": "dt-task",
            "data": { "label": "任务 A" },
            "child": {
              "id": "merge",
              "type": "dt-merge",
              "data": { "label": "合并" },
              "child": {
                "id": "end",
                "type": "dt-end",
                "data": { "label": "结束" }
              }
            }
          }
        },
        {
          "id": "branch-false",
          "data": { "condition": "false", "label": "否" },
          "child": {
            "id": "task-2",
            "type": "dt-task",
            "data": { "label": "任务 B" },
            "child": {
              "id": "merge",
              "type": "dt-merge",
              "data": { "label": "合并" }
            }
          }
        }
      ]
    }
  }
}
```

## 20. TreeConfig

树模式配置，控制树文档的布局和行为。

```ts
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

说明：

- `layout.direction`：布局方向，`'TB'` 表示从上到下，`'LR'` 表示从左到右
- `layout.nodeSpacing`：同级节点之间的间距
- `layout.layerSpacing`：层级之间的间距
- `showGatewayNodes`：是否显示网关节点
- `showMergeNodes`：是否显示合并节点
- `autoLayout`：是否自动布局
- `chainEdgeType`：链式边的类型
- `branchEdgeType`：分支边的类型
- `mergeEdgeType`：合并边的类型

### 20.1 TreeConfig 示例

```json
{
  "layout": {
    "direction": "TB",
    "nodeSpacing": 50,
    "layerSpacing": 100
  },
  "showGatewayNodes": true,
  "showMergeNodes": true,
  "autoLayout": true,
  "chainEdgeType": "default",
  "branchEdgeType": "conditional",
  "mergeEdgeType": "merge"
}
```

## 21. TreeNodeTypeConfig

树节点类型配置，继承自 `NodeTypeConfig`，并扩展树特定的约束。

```ts
interface TreeNodeTypeConfig extends NodeTypeConfig {
  tree?: {
    allowBranches?: boolean;
    maxBranches?: number;
    minBranches?: number;
    allowChild?: boolean;
    isTerminal?: boolean;
    branchEdgeType?: string;
  };
}
```

说明：

- `allowBranches`：是否允许分支
- `maxBranches`：最大分支数
- `minBranches`：最小分支数
- `allowChild`：是否允许子节点
- `isTerminal`：是否为终端节点（无子节点）
- `branchEdgeType`：分支边类型

### 21.1 树节点类型示例

```json
{
  "id": "dt-approval",
  "label": "审批节点",
  "body": {
    "type": "container",
    "className": "fd-node fd-node--approval",
    "body": [
      {
        "type": "icon",
        "icon": "user-check"
      },
      {
        "type": "text",
        "text": "${data.label}"
      }
    ]
  },
  "tree": {
    "allowBranches": false,
    "allowChild": true,
    "isTerminal": false
  }
}
```

```json
{
  "id": "dt-gateway",
  "label": "条件网关",
  "body": {
    "type": "container",
    "className": "fd-node fd-node--gateway",
    "body": [
      {
        "type": "icon",
        "icon": "git-branch"
      },
      {
        "type": "text",
        "text": "${data.label}"
      }
    ]
  },
  "tree": {
    "allowBranches": true,
    "minBranches": 2,
    "maxBranches": 10,
    "allowChild": false,
    "branchEdgeType": "conditional"
  }
}
```

```json
{
  "id": "dt-end",
  "label": "结束节点",
  "body": {
    "type": "container",
    "className": "fd-node fd-node--end",
    "body": [
      {
        "type": "icon",
        "icon": "stop-circle"
      },
      {
        "type": "text",
        "text": "${data.label}"
      }
    ]
  },
  "tree": {
    "allowBranches": false,
    "allowChild": false,
    "isTerminal": true
  }
}
```

## 22. TreeDomainAdapter

树领域适配器，用于将外部领域格式转换为树文档，以及将树文档导出为外部格式。

```ts
interface TreeDomainAdapter {
  kind: string;
  importToTree(external: Record<string, unknown>): TreeDocument;
  exportFromTree(tree: TreeDocument): Record<string, unknown>;
}
```

说明：

- `kind`：适配器标识符
- `importToTree`：将外部格式导入为树文档
- `exportFromTree`：将树文档导出为外部格式

### 22.1 使用示例

以下是一个钉钉工作流适配器的示例：

```ts
const dingtalkAdapter: TreeDomainAdapter = {
  kind: 'dingtalk-workflow',
  importToTree(external) {
    // 将钉钉工作流 JSON 转换为 TreeDocument
    return {
      id: external.id,
      kind: 'dingtalk-workflow',
      name: external.name,
      version: external.version || '1.0',
      root: convertDingtalkProcessToTreeNode(external.process),
    };
  },
  exportFromTree(tree) {
    // 将 TreeDocument 转换为钉钉工作流 JSON
    return {
      id: tree.id,
      name: tree.name,
      version: tree.version,
      process: convertTreeNodeToDingtalkProcess(tree.root),
    };
  },
};
```

### 22.2 适配器注册

领域适配器通常通过 `xui:imports` 动态加载：

```json
{
  "type": "designer-page",
  "title": "钉钉流程设计器",
  "document": { "/* GraphDocument 或 TreeDocument */" },
  "config": {
    "documentMode": "tree",
    "treeConfig": { "/* TreeConfig */" }
  }
}
```

平台通过 `env.importLoader` 加载包含适配器的动态模块，适配器将外部格式与 Flow Designer 的内部文档模型桥接。
