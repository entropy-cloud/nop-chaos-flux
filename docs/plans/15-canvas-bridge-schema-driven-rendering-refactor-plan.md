# Flow Designer Canvas-Bridge Schema-Driven Rendering Refactor Plan

## Purpose

Refactor `canvas-bridge.tsx` and related rendering code to be fully driven by `NodeTypeConfig` and `EdgeTypeConfig` JSON schemas, rather than hardcoded rendering logic.

The xyflow canvas renderer should act as a **generic framework** that:
- Reads node/edge type configurations from `DesignerConfig`
- Delegates visual rendering to flux renderer based on `body` schema
- Supports configurable icons, ports, toolbars, and appearance

## Phase 0: Simplify Design (Prerequisite)

Before schema-driven refactoring, simplify the current implementation by removing unnecessary code.

### Problem: Over-Engineering with Multiple Adapters

Current `canvas-bridge.tsx` contains 3 implementations:

| Implementation | Purpose | Status |
|----------------|---------|--------|
| `DesignerCardCanvasBridge` | Simple HTML/CSS rendering | ❌ Remove - development artifact |
| `DesignerXyflowPreviewBridge` | Button-based testing UI | ❌ Remove - development artifact |
| `DesignerXyflowCanvasBridge` | Real xyflow integration | ✅ Keep - production implementation |

The "bridge" naming suggests an adapter pattern with multiple backends, but we only need xyflow.

### Solution: Single Xyflow Implementation

1. **Delete unused implementations:**
   - Remove `DesignerCardCanvasBridge`
   - Remove `DesignerXyflowPreviewBridge`
   - Remove `DesignerCanvasAdapterKind` type
   - Remove `renderDesignerCanvasBridge` factory function

2. **Rename files to reflect reality:**
   - `canvas-bridge.tsx` → `designer-xyflow-canvas.tsx`
   - `canvas-bridge.test.tsx` → `designer-xyflow-canvas.test.tsx`

3. **Simplify `designer-canvas.tsx`:**
   - Remove `canvasAdapter` prop
   - Directly use `DesignerXyflowCanvas` component

4. **Read-only mode via props:**
   If read-only preview is needed, configure xyflow directly:
   ```tsx
   <ReactFlow
     nodesDraggable={false}
     nodesConnectable={false}
     elementsSelectable={false}
   />
   ```
   No separate preview component required.

### Tasks

1. Delete `DesignerCardCanvasBridge` and `DesignerXyflowPreviewBridge` functions
2. Delete `DesignerCanvasAdapterKind` type
3. Delete `renderDesignerCanvasBridge` factory function
4. Rename `DesignerXyflowCanvasBridge` → `DesignerXyflowCanvas`
5. Rename file `canvas-bridge.tsx` → `designer-xyflow-canvas.tsx`
6. Update `designer-canvas.tsx` to use `DesignerXyflowCanvas` directly
7. Update all imports and exports
8. Update/delete related tests

### File Changes

| File | Action |
|------|--------|
| `canvas-bridge.tsx` | Rename to `designer-xyflow-canvas.tsx`, delete 2 bridge functions |
| `canvas-bridge.test.tsx` | Rename and update tests |
| `designer-canvas.tsx` | Simplify, remove adapter selection |
| `index.tsx` | Update exports |

## Pre-requisite Check

Before starting implementation, verify:

1. **Flux icon renderer exists**: Check `flux-renderers-basic` has `icon` renderer that supports:
   - `{ type: 'icon', icon: 'play' }` format
   - Lucide icon names (e.g., `play`, `flag`, `workflow`, `git-branch`)
   - If not, add icon renderer to `flux-renderers-basic` first

2. **SchemaRenderer nesting**: Verify `SchemaRenderer`/`RenderNodes` can work inside xyflow node components with proper context

3. **DesignerContext can provide runtime**: Ensure xyflow node types can access flux runtime and designer config via context

## Current Problem

### Hardcoded Rendering

Current `canvas-bridge.tsx` (lines 34-66):

```tsx
// Icon is hardcoded ASCII
function getNodeIcon(type: string): string {
  const icons: Record<string, string> = {
    start: '>',
    end: '[]',
    task: '*',
    // ...
  };
}

// Ports are hardcoded
function getNodePorts(type: string): Array<{...}> {
  switch (type) {
    case 'start':
      return [{ id: 'out', direction: 'output', position: 'right' }];
    // ...
  }
}
```

Current `DesignerXyflowNode` (lines 177-187):

```tsx
function DesignerXyflowNode(props: NodeProps) {
  return (
    <div className="fd-xyflow-node">
      <Handle type="target" position={Position.Top} />
      <strong>{data.label}</strong>      // Hardcoded
      <small>{data.typeLabel}</small>    // Hardcoded
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
```

### Unused Schema Fields

`NodeTypeConfig` already defines rich configuration that is **completely ignored**:

| Field | Type | Current Usage |
|-------|------|---------------|
| `icon` | `string` | ❌ Not used |
| `body` | `SchemaInput` | ❌ Not used |
| `ports` | `PortConfig[]` | ❌ Not used |
| `quickActions` | `SchemaInput` | ❌ Not used |
| `description` | `string` | ❌ Not used |
| `appearance` | (missing) | ❌ Not defined |

## Target Architecture

### Design Principle

**Canvas-bridge = Generic Framework, JSON = Visual Specification**

```
┌─────────────────────────────────────────────────────────────────┐
│                      DesignerConfig (JSON)                       │
├─────────────────────────────────────────────────────────────────┤
│  nodeTypes: [                                                    │
│    {                                                             │
│      id: 'task',                                                 │
│      icon: 'workflow',             // ← Lucide icon name        │
│      body: { type: 'flex', ... },   // ← Node content schema   │
│      ports: [{ id: 'in', direction: 'input', position: 'left' }]│
│      quickActions: { type: 'hbox', ... }, // ← Hover toolbar    │
│      appearance: { className: 'task-node', borderRadius: 12 }   │
│    }                                                             │
│  ]                                                               │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    canvas-bridge.tsx                             │
│                    (Generic Framework)                           │
├─────────────────────────────────────────────────────────────────┤
│  1. Read NodeTypeConfig from DesignerContext                     │
│  2. Render node body via flux RenderNodes                        │
│  3. Render ports based on PortConfig[]                           │
│  4. Render hover toolbar via flux RenderNodes                    │
│  5. Apply appearance styles                                      │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
DesignerConfig
    │
    ├── nodeTypes[] ──────────► NormalizedDesignerConfig (Map)
    │                                │
    │                                ▼
    │                          useNodeTypeConfig(typeId)
    │                                │
    │                                ▼
    │         ┌──────────────────────┴──────────────────────┐
    │         │                      │                      │
    │         ▼                      ▼                      ▼
    │    nodeType.icon         nodeType.body          nodeType.ports
    │         │                      │                      │
    │         ▼                      ▼                      ▼
    │    flux icon renderer     FluxRenderer            Handle positions
    │    (in body schema)            │                      │
    │         │                      ▼                      ▼
    │         │              <RenderNodes/>           <Handle/> x N
    │         │                      │                      │
    │         └──────────────────────┴──────────────────────┘
    │                                │
    │                                ▼
    │                         DesignerXyflowNode
    │                         (Generic, no switch/case)
    │
    └── edgeTypes[] ──────────► NormalizedDesignerConfig (Map)
                                  │
                                  ▼
                            useEdgeTypeConfig(typeId)
                                  │
                                  ▼
                     edgeType.appearance + edgeType.body
                                  │
                                  ▼
                            Edge rendering + label
```

### Icon ID Format

Use Lucide icon names directly (without prefix):
- `play` → Play icon
- `flag` → Flag icon  
- `workflow` → Workflow icon
- `git-branch` → GitBranch icon
- `repeat` → Repeat icon

The `body` schema uses flux icon renderer: `{ type: 'icon', icon: 'play' }`

## Schema Extensions Required

### 1. Extend `NodeTypeConfig`

Add `appearance` field for visual customization:

```ts
interface NodeTypeAppearance {
  className?: string;
  borderRadius?: number;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  borderWidth?: number;
  borderColor?: string;
  borderColorSelected?: string;
  minWidth?: number;
  minHeight?: number;
}

interface NodeTypeConfig {
  // ... existing fields
  appearance?: NodeTypeAppearance;
}
```

### 2. Extend `PortConfig`

Already sufficient, just needs usage:

```ts
interface PortConfig {
  id: string;
  label?: string;
  direction: 'input' | 'output';
  position?: 'top' | 'right' | 'bottom' | 'left';
  maxConnections?: number | 'unlimited';
  appearance?: {
    className?: string;
    size?: number;
  };
}
```

## Code Organization and File Splitting

Following AGENTS.md guidelines, split `designer-xyflow-canvas.tsx` into focused modules with single responsibilities.

### Current State (Single Large File)

```
packages/flow-designer-renderers/src/
├── canvas-bridge.tsx          # 766 lines - everything in one file
└── ...
```

### Target State (Modular Structure)

```
packages/flow-designer-renderers/src/
├── designer-xyflow-canvas/
│   ├── index.ts                    # Public exports
│   ├── DesignerXyflowCanvas.tsx    # Main orchestrator component
│   ├── DesignerXyflowNode.tsx      # Node rendering component
│   ├── DesignerXyflowEdge.tsx      # Edge rendering component
│   ├── render-ports.tsx            # Port/Handle rendering utilities
│   ├── use-node-type-config.ts     # useNodeTypeConfig hook
│   ├── use-edge-type-config.ts     # useEdgeTypeConfig hook
│   ├── xyflow-utils.ts             # Position mapping, viewport utilities
│   └── types.ts                    # Local types (DesignerFlowNodeData, etc.)
├── designer-xyflow-canvas.test.tsx # Tests for canvas
└── ...
```

### Module Responsibilities

| Module | Responsibility | Size Target |
|--------|----------------|-------------|
| `DesignerXyflowCanvas.tsx` | Orchestrator: state management, event handlers, ReactFlow setup | ~150 lines |
| `DesignerXyflowNode.tsx` | Node rendering: body, ports, toolbar | ~100 lines |
| `DesignerXyflowEdge.tsx` | Edge rendering: path, label, appearance | ~80 lines |
| `render-ports.tsx` | Port-to-Handle mapping and rendering | ~50 lines |
| `use-node-type-config.ts` | Hook to get NodeTypeConfig from context | ~20 lines |
| `use-edge-type-config.ts` | Hook to get EdgeTypeConfig from context | ~20 lines |
| `xyflow-utils.ts` | Position map, viewport normalization, node/edge transforms | ~100 lines |
| `types.ts` | Local type definitions | ~30 lines |

### Splitting Strategy

Follow AGENTS.md "File Refactoring Methodology":

1. **Create subdirectory first:** `designer-xyflow-canvas/`
2. **Create new files** without modifying original
3. **Verify each file** with typecheck
4. **Replace original** with thin orchestrator
5. **Delete original** after verification

### Benefits

- **Testability**: Each module can be tested in isolation
- **Reusability**: Hooks and utilities can be used elsewhere
- **Maintainability**: Changes to node rendering don't affect edge logic
- **Readability**: Smaller files are easier to understand

## Implementation Plan

### Phase 1: Schema Extension and Types

**Files to modify:**
- `packages/flow-designer-core/src/types.ts`

**Tasks:**
1. Add `NodeTypeAppearance` interface
2. Add `appearance` field to `NodeTypeConfig`
3. Add `appearance` to `PortConfig` (enhance existing)
4. Export new types

**Validation:**
- `pnpm typecheck` passes
- No breaking changes to existing `NodeTypeConfig`

### Phase 2: DesignerContext Extension for Config Access

**Files to modify:**
- `packages/flow-designer-renderers/src/designer-context.ts`

**Tasks:**
1. Add `NormalizedDesignerConfig` to DesignerContext
2. Create `useNodeTypeConfig(typeId)` hook
3. Create `useEdgeTypeConfig(typeId)` hook
4. Provide designer runtime for flux rendering

**API:**
```tsx
interface DesignerContextValue {
  // ... existing
  config: NormalizedDesignerConfig;
  runtime: RendererRuntime;  // flux runtime
}

function useNodeTypeConfig(typeId: string): NodeTypeConfig | undefined {
  const { config } = useDesignerContext();
  return config.nodeTypes.get(typeId);
}

function useEdgeTypeConfig(typeId: string): EdgeTypeConfig | undefined {
  const { config } = useDesignerContext();
  return config.edgeTypes.get(typeId);
}
```

**Validation:**
- Hooks return correct config for known type IDs
- Returns undefined for unknown type IDs

### Phase 3: Schema-Driven Node Body Rendering

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Use `useNodeTypeConfig()` to get config in `DesignerXyflowNode`
2. Replace hardcoded `<strong>{label}</strong>` with flux renderer
3. Render `nodeType.body` schema inside node
4. Create child scope with node data for rendering
5. Memoize scope creation for performance

**Before:**
```tsx
function DesignerXyflowNode(props: NodeProps) {
  return (
    <div className="fd-xyflow-node">
      <strong>{data.label}</strong>
      <small>{data.typeLabel}</small>
    </div>
  );
}
```

**After:**
```tsx
function DesignerXyflowNode(props: NodeProps) {
  const nodeType = useNodeTypeConfig(props.type);
  const { runtime, parentScope } = useDesignerContext();
  
  // Memoize scope to avoid re-creation
  const nodeScope = useMemo(
    () => runtime.createChildScope(parentScope, props.data),
    [runtime, parentScope, props.data]
  );
  
  if (!nodeType?.body) {
    // Fallback for missing body schema
    return (
      <div className="fd-xyflow-node fd-xyflow-node--fallback">
        <strong>{props.data.label}</strong>
      </div>
    );
  }
  
  return (
    <div className={classNames('fd-xyflow-node', nodeType.appearance?.className)}>
      <ScopeContext.Provider value={nodeScope}>
        <RenderNodes input={nodeType.body} />
      </ScopeContext.Provider>
    </div>
  );
}
```

**Performance Considerations:**
- Memoize `useNodeTypeConfig` result
- Memoize child scope creation
- Consider `React.memo` for `DesignerXyflowNode`
- Use `useMemo` for compiled schema

**Validation:**
- Nodes render content from `body` schema
- Existing tests pass
- Visual parity with prototype possible through schema

### Phase 4: Schema-Driven Port Rendering

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Remove `getNodePorts()` hardcoded function
2. Read ports from `nodeType.ports`
3. Map `position` string to xyflow `Position` enum
4. Apply `appearance.className` to handles

**Before:**
```tsx
function getNodePorts(type: string): Port[] {
  switch (type) {
    case 'start': return [{ id: 'out', direction: 'output', position: 'right' }];
    // ...
  }
}
```

**After:**
```tsx
function renderPorts(ports: PortConfig[] | undefined) {
  return (ports ?? []).map((port) => (
    <Handle
      key={port.id}
      type={port.direction === 'input' ? 'target' : 'source'}
      position={POSITION_MAP[port.position ?? 'top']}
      id={port.id}
      className={port.appearance?.className}
    />
  ));
}

const POSITION_MAP = {
  top: Position.Top,
  right: Position.Right,
  bottom: Position.Bottom,
  left: Position.Left
};
```

**Validation:**
- Ports render from schema configuration
- Handle positions configurable per node type
- Connection validation respects port constraints

### Phase 5: Schema-Driven Hover Toolbar

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Add `NodeToolbar` from `@xyflow/react`
2. Render `nodeType.quickActions` schema inside toolbar
3. Wire toolbar visibility to hover state
4. Pass action handlers to schema scope

**Behavior:**
- If `quickActions` is not defined, **no toolbar is shown** (keep node clean)
- If defined, render via flux `RenderNodes`

**Implementation:**
```tsx
import { NodeToolbar } from '@xyflow/react';

function DesignerXyflowNode(props: NodeProps) {
  const nodeType = useNodeTypeConfig(props.type);
  const [showToolbar, setShowToolbar] = useState(false);
  const { dispatch } = useDesignerContext();
  
  // Only show toolbar if quickActions is defined
  const hasQuickActions = nodeType?.quickActions && isSchema(nodeType.quickActions);
  
  // Create action scope with handlers
  const actionScope = useMemo(() => ({
    onEdit: () => dispatch({ type: 'openNodeEditor', nodeId: props.id }),
    onDuplicate: () => dispatch({ type: 'duplicateNode', nodeId: props.id }),
    onDelete: () => dispatch({ type: 'deleteNode', nodeId: props.id }),
  }), [dispatch, props.id]);
  
  return (
    <>
      <div
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {/* Node content rendered via body schema */}
      </div>
      
      {hasQuickActions && (
        <NodeToolbar isVisible={showToolbar} position={Position.Top}>
          <RenderNodes 
            input={nodeType.quickActions} 
            options={{ data: actionScope }}
          />
        </NodeToolbar>
      )}
    </>
  );
}
```

**Validation:**
- Toolbar appears on hover only if `quickActions` defined
- Actions configured via schema
- No toolbar shown when `quickActions` undefined

### Phase 6: Edge Appearance from Schema

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Read `edgeType.appearance` from config
2. Apply stroke color, width, style to edge path
3. Support `animated` flag
4. Support `markerEnd` configuration

**Implementation:**
```tsx
function DesignerXyflowEdge(props: EdgeProps) {
  const edgeType = useEdgeTypeConfig(props.type);
  const appearance = edgeType?.appearance;
  
  return (
    <path
      className={classNames('fd-edge__path', appearance?.animated && 'fd-edge--animated')}
      style={{
        stroke: appearance?.stroke ?? 'var(--fd-edge-stroke)',
        strokeWidth: appearance?.strokeWidth ?? 2,
        strokeDasharray: appearance?.strokeStyle === 'dashed' ? '5,5' : undefined,
      }}
      markerEnd={appearance?.markerEnd ? `url(#${appearance.markerEnd})` : undefined}
    />
  );
}
```

**Validation:**
- Edge styles configurable via schema
- Animated edges work
- Arrow markers configurable

### Phase 6.5: Edge Body Rendering (Edge Labels)

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Render `edgeType.body` schema inside `EdgeLabelRenderer`
2. Pass edge data as scope
3. Support clickable labels for edge selection

**Implementation:**
```tsx
import { EdgeLabelRenderer, getSmoothStepPath } from '@xyflow/react';

function DesignerXyflowEdge(props: EdgeProps) {
  const edgeType = useEdgeTypeConfig(props.type);
  const { dispatch } = useDesignerContext();
  
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX: props.sourceX,
    sourceY: props.sourceY,
    targetX: props.targetX,
    targetY: props.targetY,
  });
  
  const handleLabelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch({ type: 'selectEdge', edgeId: props.id });
  };
  
  return (
    <>
      {/* Edge path with appearance */}
      <BaseEdge path={edgePath} {...getAppearanceStyle(edgeType?.appearance)} />
      
      {/* Edge label from body schema */}
      {edgeType?.body && (
        <EdgeLabelRenderer>
          <div
            className="fd-edge__label-wrapper"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={handleLabelClick}
          >
            <RenderNodes 
              input={edgeType.body}
              options={{ data: props.data }}
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
```

**Validation:**
- Edge labels render from `body` schema
- Labels are clickable
- Label position follows edge midpoint

### Phase 7: Cleanup and Remove Fallbacks

**Files to modify:**
- `packages/flow-designer-renderers/src/canvas-bridge.tsx`

**Tasks:**
1. Remove `getNodeIcon()` function
2. Remove `getNodePorts()` function  
3. Remove legacy fallback rendering
4. Remove unused hardcoded styles

**Validation:**
- All rendering is schema-driven
- No switch/case for node types
- `pnpm typecheck && pnpm build && pnpm test` all pass

### Phase 8: Playground Config Migration

**Files to modify:**
- `apps/playground/src/schemas/workflow-designer-schema.json`

**Tasks:**
1. Update `nodeTypes[].body` with complete schemas
2. Add `quickActions` schemas where needed
3. Add `appearance` settings
4. Verify ports are defined

**Example config:**
```json
{
  "id": "task",
  "label": "任务节点",
  "icon": "workflow",
  "body": {
    "type": "flex",
    "className": "flex items-center gap-2 px-3 py-2 bg-white rounded-lg border shadow-sm",
    "body": [
      {
        "type": "icon",
        "icon": "workflow",
        "className": "w-5 h-5 text-blue-600"
      },
      {
        "type": "container",
        "body": [
          {
            "type": "text",
            "text": "${data.label}",
            "className": "text-sm font-medium text-gray-900"
          },
          {
            "type": "text",
            "text": "${data.config.executor} · ${data.config.timeout}",
            "className": "text-xs text-gray-500"
          }
        ]
      }
    ]
  },
  "ports": [
    { "id": "in", "direction": "input", "position": "left" },
    { "id": "out", "direction": "output", "position": "right" }
  ],
  "quickActions": {
    "type": "hbox",
    "className": "flex gap-1 p-1 bg-white rounded-full border shadow-sm",
    "items": [
      { "type": "button", "icon": "pencil", "action": "onEdit", "tooltip": "编辑" },
      { "type": "button", "icon": "copy", "action": "onDuplicate", "tooltip": "复制" },
      { "type": "button", "icon": "trash-2", "action": "onDelete", "tooltip": "删除" }
    ]
  }
}
```

**Validation:**
- Playground renders nodes from config
- Visual parity with prototype achievable
- No hardcoded rendering in canvas-bridge

## File Changes Summary

### Phase 0: Simplification

| File | Change Type | Description |
|------|-------------|-------------|
| `canvas-bridge.tsx` | Rename + Delete | → `designer-xyflow-canvas.tsx`, remove card/preview bridges |
| `canvas-bridge.test.tsx` | Rename | → `designer-xyflow-canvas.test.tsx` |
| `designer-canvas.tsx` | Modify | Simplify, remove adapter selection |
| `index.tsx` | Modify | Update exports |

### Phase 1-8: Schema-Driven + File Split

| File | Change Type | Description |
|------|-------------|-------------|
| `flow-designer-core/src/types.ts` | Modify | Add `NodeTypeAppearance`, extend types |
| `flow-designer-renderers/src/designer-context.ts` | Modify | Add config hooks, provide runtime |
| `flow-designer-renderers/src/designer-xyflow-canvas/index.ts` | Create | Public exports |
| `flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowCanvas.tsx` | Create | Main orchestrator |
| `flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowNode.tsx` | Create | Schema-driven node rendering |
| `flow-designer-renderers/src/designer-xyflow-canvas/DesignerXyflowEdge.tsx` | Create | Schema-driven edge rendering |
| `flow-designer-renderers/src/designer-xyflow-canvas/render-ports.tsx` | Create | Port rendering utilities |
| `flow-designer-renderers/src/designer-xyflow-canvas/use-node-type-config.ts` | Create | NodeTypeConfig hook |
| `flow-designer-renderers/src/designer-xyflow-canvas/use-edge-type-config.ts` | Create | EdgeTypeConfig hook |
| `flow-designer-renderers/src/designer-xyflow-canvas/xyflow-utils.ts` | Create | Position map, viewport utils |
| `flow-designer-renderers/src/designer-xyflow-canvas/types.ts` | Create | Local types |
| `apps/playground/src/schemas/workflow-designer-schema.json` | Modify | Complete body/quickActions schemas |

## Backward Compatibility

### Migration Path

1. **Phase 1-2**: Additive changes, no breaking changes
2. **Phase 3-6**: New rendering path with fallback for missing `body`
3. **Phase 7**: Remove fallback, require schema configuration

### Fallback Behavior

During transition, if `nodeType.body` is not defined:
- Fall back to simple label rendering
- Log deprecation warning in dev mode

```tsx
function DesignerXyflowNode(props) {
  const nodeType = useNodeTypeConfig(props.type);
  
  if (!nodeType?.body) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`NodeTypeConfig.body is required for node type: ${props.type}`);
    }
    return <LegacyNodeRenderer {...props} />;
  }
  
  return <RenderNodes input={nodeType.body} />;
}
```

## Testing Strategy

### Unit Tests

1. **designer-context.test.ts**
   - `useNodeTypeConfig` returns correct config
   - `useEdgeTypeConfig` returns correct config
   - Returns undefined for unknown types

2. **canvas-bridge.test.tsx**
   - Node renders body schema
   - Ports render from config
   - Toolbar renders from quickActions
   - Edge styles from appearance
   - Edge labels from body

3. **types.test.ts**
   - Type validation for extended configs

### Integration Tests

1. **parity.test.tsx**
   - Full nodeType config renders correctly
   - Icons, ports, body, toolbar all wired

### Visual Regression Tests

1. Compare rendered nodes with prototype screenshots
2. Verify edge styles match design

## Success Criteria

1. **Single xyflow implementation** - No card/preview bridges
2. **Modular file structure** - Split into focused modules per AGENTS.md
3. **Zero hardcoded node/edge rendering** - All driven by config
4. **All visual aspects configurable** via NodeTypeConfig/EdgeTypeConfig
5. **Visual parity achievable** with prototype through JSON config alone
6. **Existing tests pass** without modification
7. **New tests cover** schema-driven rendering paths

## Dependencies

- `@xyflow/react` NodeToolbar, EdgeLabelRenderer, Handle, Position components
- Flux `RenderNodes` component for schema rendering
- Flux icon renderer (or add to flux-renderers-basic)

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking existing playground | Keep fallback path until Phase 7 |
| Performance with schema rendering | Memoize nodes, scopes, and compiled schemas |
| Flux runtime context in xyflow nodes | Use DesignerContext to provide runtime |
| Schema complexity for users | Provide preset nodeType templates |
| Icon renderer missing | Add to flux-renderers-basic if needed |
| File split introduces import cycles | Use barrel file (index.ts) carefully |

## Estimated Effort

| Phase | Effort | Priority |
|-------|--------|----------|
| Phase 0: Simplify Design | 0.5 day | High |
| Phase 1: Schema Extension | 0.5 day | High |
| Phase 2: DesignerContext Extension | 1 day | High |
| Phase 3: Node Body Rendering | 1.5 days | High |
| Phase 4: Port Rendering | 0.5 day | High |
| Phase 5: Hover Toolbar | 1 day | Medium |
| Phase 6: Edge Appearance | 0.5 day | Medium |
| Phase 6.5: Edge Body Rendering | 0.5 day | Medium |
| Phase 7: Cleanup and File Split | 1 day | High |
| Phase 8: Playground Config | 1 day | High |
| **Total** | **8 days** | |
