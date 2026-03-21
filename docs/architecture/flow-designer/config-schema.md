# Flow Designer 配置模型

本文档描述新的 Flow Designer 配置模型。这里的重点不是“再发明一套页面 schema”，而是定义 graph domain config，并把需要的 UI 片段嵌入现有 schema renderer。

## 1. 总体分层

Flow Designer 由两部分输入组成：

- `designer-page` schema：页面宿主、toolbar、inspector、dialog 区域
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

## 4. NodeTypeConfig

```ts
interface NodeTypeConfig {
  id: string
  label: string
  description?: string
  icon?: string
  appearance?: NodeAppearanceConfig
  roles?: NodeRoleConfig
  ports?: PortConfig[]
  constraints?: NodeConstraintConfig
  permissions?: NodePermissionConfig
  defaults?: Record<string, unknown>
  renderer?: {
    type?: string
    variant?: string
  }
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

说明：

- `ports` 是一等公民，不再只是 node 级 role
- `inspector.body`、`createDialog.body` 直接嵌入标准 schema 片段
- `defaults` 用于直接拖拽落图时生成初始数据

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

## 9. EdgeTypeConfig

```ts
interface EdgeTypeConfig {
  id: string
  label?: string
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

## 15. 节点类型示例

```ts
const workflowDesignerConfig = {
  version: '1.0',
  kind: 'workflow',
  nodeTypes: [
    {
      id: 'start',
      label: '开始',
      icon: 'Play',
      defaults: {
        label: '开始'
      },
      constraints: {
        maxInstances: 1,
        allowIncoming: false
      },
      ports: [
        {
          id: 'out',
          direction: 'output',
          position: 'right',
          roles: {
            provides: ['trigger']
          },
          maxConnections: 1
        }
      ],
      permissions: {
        canDelete: false,
        canDuplicate: false
      },
      inspector: {
        mode: 'drawer',
        body: {
          type: 'form',
          body: [
            {
              type: 'input-text',
              name: 'label',
              label: '名称'
            }
          ]
        }
      }
    },
    {
      id: 'task',
      label: '任务',
      icon: 'Workflow',
      defaults: {
        label: '任务节点',
        timeout: 30
      },
      ports: [
        {
          id: 'in',
          direction: 'input',
          position: 'left',
          roles: {
            accepts: ['trigger', 'output']
          }
        },
        {
          id: 'out',
          direction: 'output',
          position: 'right',
          roles: {
            provides: ['output', 'error']
          }
        }
      ],
      createDialog: {
        title: '创建任务节点',
        body: {
          type: 'form',
          body: [
            {
              type: 'input-text',
              name: 'label',
              label: '名称'
            },
            {
              type: 'input-number',
              name: 'timeout',
              label: '超时'
            }
          ]
        }
      },
      inspector: {
        mode: 'drawer',
        body: {
          type: 'form',
          body: [
            {
              type: 'input-text',
              name: 'label',
              label: '名称'
            },
            {
              type: 'input-number',
              name: 'timeout',
              label: '超时'
            }
          ]
        }
      }
    }
  ],
  edgeTypes: [
    {
      id: 'default',
      appearance: {
        stroke: 'stroke-slate-400',
        strokeWidth: 2,
        markerEnd: 'arrowClosed'
      }
    }
  ],
  palette: {
    groups: [
      {
        id: 'basic',
        label: '基础节点',
        nodeTypes: ['start', 'task']
      }
    ]
  },
  features: {
    undo: true,
    minimap: true,
    grid: true,
    floatingToolbar: true
  },
  rules: {
    allowSelfLoop: false,
    allowMultiEdge: true,
    defaultEdgeType: 'default'
  }
}
```

## 16. 推荐约束

- inspector 和 create dialog 优先使用 schema 片段，而不是新增字段 DSL
- port 应优先于 node role 建模
- `defaults` 必须足够支持“直接拖拽即落图”
- `createDialog` 只用于复杂初始化，不应强迫所有节点走表单
