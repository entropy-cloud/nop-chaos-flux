# Flow Designer JSON 渲染改造调研报告

## 目的

调研如何将 playground 中的 Flow Designer 改造为完全基于 JSON 渲染，作为 flux renderer 的标准示例。

## 1. 目标

将 playground 中的 Flow Designer 改造为完全基于 JSON 渲染：
- 完全根据 JSON 配置渲染
- 底层引擎修改时自动反映
- 作为 flux renderer 的示例

## 2. 当前状态

### 2.1 文件结构

```
apps/playground/src/
├── pages/
│   └── FlowDesignerPage.tsx      # 页面入口，使用 FlowDesignerExample
├── FlowDesignerExample.tsx        # 独立 React 组件（212 行）
└── flow-designer/
    ├── index.ts                   # 导出
    ├── FlowCanvas.tsx             # xyflow 画布
    ├── FlowDesignerCanvas.tsx     # 简化画布
    ├── FlowDesignerToolbar.tsx    # 工具栏
    ├── FlowDesignerPalette.tsx    # 调色板
    ├── FlowDesignerInspector.tsx  # 属性面板
    ├── FlowDesignerHoverToolbar.tsx
    ├── FlowDesignerToast.tsx
    ├── FlowListPage.tsx
    ├── useFlowCanvasStore.ts      # 独立 Zustand store
    ├── flowNodeTypes.tsx          # xyflow 节点类型
    └── parity.test.tsx
```

### 2.2 当前调用链

```
FlowDesignerPage.tsx
  → FlowDesignerExample.tsx (独立 React 组件)
    → useFlowCanvasStore() (独立 Zustand store)
    → FlowCanvas / FlowDesignerCanvas
    → FlowDesignerToolbar
    → FlowDesignerPalette
    → FlowDesignerInspector
```

**问题**: 
- 未使用 SchemaRenderer
- 配置和文档硬编码在 TypeScript 中
- 有独立的 store，未复用 flow-designer-core

### 2.3 FlowDesignerPage.tsx 现状

```tsx
// 硬编码配置
const workflowDesignerConfig: DesignerConfig = {
  version: '1.0',
  kind: 'workflow',
  nodeTypes: [
    { id: 'start', label: 'Start', ... },
    { id: 'end', label: 'End', ... },
    // ...
  ],
  // ...
};

// 硬编码文档
const sampleWorkflowDocument: GraphDocument = {
  id: 'sample-workflow-1',
  nodes: [...],
  edges: [...],
};

// 直接渲染独立组件
export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  return (
    <FlowDesignerExample document={sampleWorkflowDocument} />
  );
}
```

## 3. 目标架构

### 3.1 目标文件结构

```
apps/playground/src/
├── pages/
│   └── FlowDesignerPage.tsx      # 使用 SchemaRenderer
├── schemas/
│   └── workflow-designer-schema.json  # designer-page schema
└── flow-designer/                 # 保留作为独立 xyflow 示例（可选）

docs/examples/workflow-designer/
├── config.json                    # DesignerConfig (已有)
└── document.json                  # GraphDocument (已有)
```

### 3.2 目标调用链

```
FlowDesignerPage.tsx
  → SchemaRenderer
    → designer-page renderer (@nop-chaos/flow-designer-renderers)
      → toolbar region (JSON schema fragment)
      → canvas region (xyflow adapter)
      → inspector region (JSON schema fragment)
      → palette (from config.palette)
```

### 3.3 架构对比

```
改造前:
┌─────────────────────────────────────────────────────┐
│ FlowDesignerPage.tsx                                │
│   └── FlowDesignerExample.tsx (独立 React)          │
│         ├── useFlowCanvasStore (独立 store)         │
│         ├── FlowCanvas (独立 xyflow 封装)           │
│         ├── FlowDesignerToolbar                     │
│         ├── FlowDesignerPalette                     │
│         └── FlowDesignerInspector                   │
└─────────────────────────────────────────────────────┘

改造后:
┌─────────────────────────────────────────────────────┐
│ FlowDesignerPage.tsx                                │
│   └── SchemaRenderer                                │
│         └── designer-page renderer                  │
│               ├── toolbar (from config.toolbar)     │
│               ├── canvas (xyflow adapter)           │
│               ├── palette (from config.palette)     │
│               └── inspector (from config)           │
└─────────────────────────────────────────────────────┘
```

## 4. 可用资源

### 4.1 已有 JSON 示例

| 文件 | 内容 | 状态 | 说明 |
|------|------|------|------|
| `docs/examples/workflow-designer/config.json` | DesignerConfig | ✅ 完整 | 447 行，包含完整配置 |
| `docs/examples/workflow-designer/document.json` | GraphDocument | ✅ 完整 | 111 行，示例文档 |

### 4.2 config.json 包含内容

- **版本信息**: `version: "1.0"`, `kind: "workflow"`
- **6 种节点类型**:
  - `start` - 开始节点（绿色边框，唯一实例）
  - `end` - 结束节点（红色边框，无输出）
  - `task` - 任务节点（服务调用/脚本/审批）
  - `condition` - 条件节点（两个输出端口）
  - `parallel` - 并行节点（多分支）
  - `loop` - 循环节点（重复执行）
- **1 种边类型**: `default`（带条件标签）
- **Palette 分组**:
  - basic: start, end
  - logic: condition, parallel, loop
  - execution: task
- **Toolbar 配置**: back, title, badge, 统计, 网格开关, 撤销/重做, 恢复/导出, 保存
- **Shortcuts**: undo, redo, copy, paste, delete, save
- **Canvas 配置**: dots background, gridSize 16, snapToGrid

### 4.3 document.json 包含内容

- **文档元数据**: id, kind, name, version
- **6 个节点**: start-1, task-1, condition-1, parallel-1, loop-1, end-1
- **6 条边**: 连接各节点的流程
- **视口**: x: 0, y: 0, zoom: 1

### 4.4 已有 Renderer 包

| Package | 状态 | 说明 |
|---------|------|------|
| `@nop-chaos/flow-designer-core` | ✅ 可用 | Graph runtime, DesignerCore |
| `@nop-chaos/flow-designer-renderers` | ✅ 可用 | designer-page renderer |

### 4.5 designer-page Renderer 能力

根据 `docs/architecture/flow-designer/design.md`:
- `designer-page` renderer 已落地
- 支持 toolbar/inspector/dialogs region
- 通过 ActionScope 注册 `designer:*` 动作
- 支持 xyflow canvas adapter

## 5. 实现方案

### 5.1 创建 workflow-designer-schema.json

位置: `apps/playground/src/schemas/workflow-designer-schema.json`

方案 A - 引用外部文件:
```json
{
  "type": "designer-page",
  "title": "Workflow Designer",
  "document": { "$ref": "../../../docs/examples/workflow-designer/document.json" },
  "config": { "$ref": "../../../docs/examples/workflow-designer/config.json" }
}
```

方案 B - 内联文档（推荐用于 playground）:
```json
{
  "type": "designer-page",
  "title": "Workflow Designer",
  "document": {
    "id": "flow-101",
    "kind": "workflow",
    "name": "Customer onboarding",
    "version": "1.0",
    "nodes": [...],
    "edges": [...],
    "viewport": { "x": 0, "y": 0, "zoom": 1 }
  },
  "config": {
    "version": "1.0",
    "kind": "workflow",
    "nodeTypes": [...],
    "edgeTypes": [...],
    "palette": {...},
    "toolbar": {...},
    ...
  }
}
```

### 5.2 修改 FlowDesignerPage.tsx

```tsx
import { SchemaRenderer, useRegistry } from '@nop-chaos/flux-react';
import workflowDesignerSchema from '../schemas/workflow-designer-schema.json';

interface FlowDesignerPageProps {
  onBack: () => void;
}

export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  const registry = useRegistry();
  
  return (
    <div className="playground-flow-page">
      <button type="button" className="page-back page-back--floating" onClick={onBack}>
        Back to Home
      </button>
      <SchemaRenderer
        schema={workflowDesignerSchema}
        registry={registry}
      />
    </div>
  );
}
```

### 5.3 简化版（如果 registry 已在 context 中）

```tsx
import { SchemaRenderer } from '@nop-chaos/flux-react';
import workflowDesignerSchema from '../schemas/workflow-designer-schema.json';

export function FlowDesignerPage({ onBack }: FlowDesignerPageProps) {
  return (
    <div className="playground-flow-page">
      <button type="button" onClick={onBack}>Back to Home</button>
      <SchemaRenderer schema={workflowDesignerSchema} />
    </div>
  );
}
```

### 5.4 可删除的文件

改造完成后可删除:
- `apps/playground/src/FlowDesignerExample.tsx`
- `apps/playground/src/flow-designer/FlowDesignerCanvas.tsx`
- `apps/playground/src/flow-designer/FlowDesignerToolbar.tsx`
- `apps/playground/src/flow-designer/FlowDesignerPalette.tsx`
- `apps/playground/src/flow-designer/FlowDesignerInspector.tsx`
- `apps/playground/src/flow-designer/FlowDesignerHoverToolbar.tsx`
- `apps/playground/src/flow-designer/FlowDesignerToast.tsx`
- `apps/playground/src/flow-designer/useFlowCanvasStore.ts`

**保留文件**（作为独立 xyflow 示例）:
- `apps/playground/src/flow-designer/FlowCanvas.tsx` - 独立 xyflow 封装
- `apps/playground/src/flow-designer/FlowListPage.tsx` - 流程列表页
- `apps/playground/src/flow-designer/flowNodeTypes.tsx` - xyflow 节点类型

## 6. 关键设计决策

### 6.1 Config 与 Document 分离

遵循 `docs/architecture/flow-designer/config-schema.md`:

| 概念 | 职责 | 示例 |
|------|------|------|
| `config` | 领域配置 | 节点类型、边类型、规则、palette、toolbar |
| `document` | 实例数据 | 节点、边、视口、元数据 |

**好处**:
- 同一 config 可用于多个 document
- config 可以 extends 预设
- document 只关注数据，不含行为定义

### 6.2 Host Scope 注入

根据 `docs/architecture/flow-designer/runtime-snapshot.md`:

**当前已注入的字段**:
```ts
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

**在 schema 中使用**:
```json
{
  "type": "tpl",
  "tpl": "当前节点: ${activeNode.data.label}"
}
```

### 6.3 Actions 路径

所有交互通过 `designer:*` actions:

| Action | 说明 |
|--------|------|
| `designer:undo` | 撤销 |
| `designer:redo` | 重做 |
| `designer:save` | 保存 |
| `designer:export` | 导出 |
| `designer:restore` | 恢复 |
| `designer:addNode` | 添加节点 |
| `designer:deleteSelection` | 删除选中 |
| `designer:duplicateSelection` | 复制选中 |
| `designer:toggleGrid` | 切换网格 |
| `designer:updateNodeData` | 更新节点数据 |
| `designer:updateEdgeData` | 更新边数据 |

**在 schema 中使用**:
```json
{
  "type": "button",
  "label": "撤销",
  "disabled": "${!canUndo}",
  "onClick": { "action": "designer:undo" }
}
```

### 6.4 节点 Body 渲染

根据 `docs/architecture/flow-designer/config-schema.md`:
- 节点 `body` 使用标准 AMIS Schema
- 节点实例的 `data` 自动成为 body 的 scope

**示例**:
```json
{
  "id": "task",
  "body": {
    "type": "flex",
    "items": [
      { "type": "icon", "icon": "workflow" },
      { "type": "text", "body": "${data.label}" }
    ]
  }
}
```

## 7. 实现步骤

### Phase 1: 准备 JSON Schema

1. 创建 `apps/playground/src/schemas/` 目录
2. 创建 `workflow-designer-schema.json`
3. 复制或引用 `docs/examples/workflow-designer/` 中的 config 和 document

### Phase 2: 修改 FlowDesignerPage

1. 导入 SchemaRenderer
2. 导入 workflowDesignerSchema
3. 替换 FlowDesignerExample 为 SchemaRenderer

### Phase 3: 验证功能

1. 页面正常渲染
2. Toolbar 按钮工作
3. Palette 拖拽添加节点
4. Canvas 显示正确
5. Inspector 显示属性
6. Undo/Redo 工作
7. Save/Export 工作

### Phase 4: 清理旧代码

1. 删除不再需要的文件
2. 更新 flow-designer/index.ts 导出
3. 更新相关测试

## 8. 验证清单

### 功能验证

- [ ] SchemaRenderer 能正确渲染 designer-page
- [ ] 从 JSON 加载 config 成功
- [ ] 从 JSON 加载 document 成功
- [ ] Toolbar 按钮触发 designer:* actions
- [ ] Palette 分组正确显示
- [ ] Palette 拖拽添加节点到画布
- [ ] Canvas 显示所有节点和边
- [ ] 节点可选中
- [ ] 边可选中
- [ ] Inspector 显示选中节点属性
- [ ] Inspector 显示选中边属性
- [ ] Inspector 可编辑节点数据
- [ ] Inspector 可编辑边数据
- [ ] Undo 功能正常
- [ ] Redo 功能正常
- [ ] Save 功能正常
- [ ] Export 功能正常
- [ ] Restore 功能正常
- [ ] Grid 切换正常
- [ ] 快捷键工作 (Ctrl+Z, Ctrl+Y, etc.)

### 代码质量

- [ ] `pnpm typecheck` 通过
- [ ] `pnpm build` 通过
- [ ] `pnpm lint` 通过
- [ ] `pnpm test` 通过
- [ ] 无控制台错误

### 文档更新

- [ ] 更新 `docs/logs/index.md`
- [ ] 更新 `docs/architecture/playground-experience.md` (如适用)

## 9. 风险与缓解

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| designer-page renderer 功能不完整 | 部分功能缺失 | 参考 runtime-snapshot.md 确认已实现能力 |
| JSON 引用路径问题 | 加载失败 | 使用内联方式或配置 Vite resolve |
| 样式不兼容 | UI 异常 | 复用现有 CSS 类名 |
| Action 未注册 | 按钮无响应 | 确认 registerFlowDesignerRenderers 已调用 |

## 10. 后续工作

改造完成后可考虑:

1. **添加更多示例**: 状态机、审批流等
2. **Schema 编辑器**: 在 playground 中实时编辑 designer schema
3. **导出功能增强**: 支持导出为 Bpmn、Mermaid 等格式
4. **性能优化**: 大图场景测试

## 11. 参考文档

| 文档 | 路径 | 用途 |
|------|------|------|
| 架构设计 | `docs/architecture/flow-designer/design.md` | 总体架构 |
| 配置模型 | `docs/architecture/flow-designer/config-schema.md` | JSON 配置定义 |
| 运行时快照 | `docs/architecture/flow-designer/runtime-snapshot.md` | Scope 注入 |
| 协作模型 | `docs/architecture/flow-designer/collaboration.md` | 各层协作 |
| Canvas 适配器 | `docs/architecture/flow-designer/canvas-adapters.md` | xyflow 集成 |
| API 参考 | `docs/architecture/flow-designer/api.md` | API 定义 |
| 配置示例 | `docs/examples/workflow-designer/config.json` | DesignerConfig |
| 文档示例 | `docs/examples/workflow-designer/document.json` | GraphDocument |
| JSON 约定 | `docs/references/flux-json-conventions.md` | 表达式语法 |
