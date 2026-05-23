# Tree Mode (`documentMode: 'tree'`) Visual Quality — Root Cause Analysis

> Written: 2026-05-19
> Scope: `packages/flow-designer-core/src/`, `packages/flow-designer-renderers/src/`
> Priority: medium (affects tree-mode designers across all consumers: dingtalk, TaskFlow, action-flow)

## Executive Summary

Tree mode renders dramatically worse than graph mode because **node body schemas are completely discarded** in the tree rendering path. Instead of evaluating the full AMIS schema-defined body (icons, gradients, badges, data bindings), tree mode hardcodes a minimal `<Card>` with only a type label, node name, and a single summary line. This is not a schema configuration issue — it is a structural limitation in `designer-xyflow-node.tsx`.

---

## Root Cause #1 (Critical): Node `body` Schema Is Ignored

### Graph Mode (works correctly)

File: `packages/flow-designer-renderers/src/designer-xyflow-canvas/designer-xyflow-node.tsx:265-272`

```tsx
{/* Graph mode renders the full schema-defined body */}
<ClassAliasesContext.Provider value={config.classAliases}>
  <RenderNodes input={nodeType.body} ... />
</ClassAliasesContext.Provider>
```

In graph mode, the node type's `body` schema (defined in the designer config's `nodeTypes[].body`) is passed through the full AMIS rendering pipeline (`RenderNodes`). This means:

- All layout types work: `flex`, `container`, `tpl`, `icon`, etc.
- Data bindings (`${step.common.displayName || step.common.name}`) are evaluated
- `classAliases` are resolved (e.g., `node-card` → `nop-glass-card ...`)
- Icons, gradient backgrounds, badges, footers all render as specified

### Tree Mode (broken)

File: `designer-xyflow-node.tsx:214-264`

```tsx
{isTreeMode ? (
  treeNodeType?.tree?.isTerminal ? (
    // Terminal nodes — tiny 12px dot
    <div className="...">
      <div className="w-3 h-3 rounded-full bg-muted-foreground/40" />
      <div className="text-[11px] text-muted-foreground/60 mt-1 truncate">{data.label}</div>
    </div>
  ) : (
    // Regular tree nodes — hardcoded Card, ignores nodeType.body entirely
    <Card className="fd-tree-node-shell border shadow-sm overflow-hidden w-full h-full">
      <CardHeader>
        <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground truncate">
          {typeMeta.label}
        </div>
        <div className="text-sm font-semibold truncate">{data.label}</div>
      </CardHeader>
      <CardContent>
        {/* badge summary — does NOT use the node body schema */}
      </CardContent>
    </Card>
  )
) : ( /* graph mode render */ )}
```

The tree path renders a **hardcoded `<Card>`** with:

- A text-only header showing `typeMeta.label` (e.g., "SEQUENTIAL") and `data.label`
- A minimal content area with auto-generated summary badges

It **never reads `nodeType.body`**. All the rich schema content — icons, gradient backgrounds, colored badges, edge kind indicators, classAlias-resolved styling — is lost.

### Impact

- Node icons are completely absent in tree mode
- Gradient backgrounds (`nop-gradient-*`) are not applied
- Color-coded badges are not rendered
- Footer metadata (step type, config counts) is missing
- The entire `taskflow-workflow-schema.json` node body upgrade (glass cards, icon containers, footer badges) is invisible in tree mode

---

## Root Cause #2: Fixed Node Dimensions (`width`/`height` vs `minWidth`/`minHeight`)

File: `designer-xyflow-node.tsx:129-147`

```typescript
if (isTreeMode) {
  if (appearance.minWidth !== undefined) s.width = appearance.minWidth; // EXACT width
  if (appearance.minHeight !== undefined) s.height = appearance.minHeight; // EXACT height
} else {
  if (appearance.minWidth !== undefined) s.minWidth = appearance.minWidth; // MIN width
  if (appearance.minHeight !== undefined) s.minHeight = appearance.minHeight; // MIN height
}
```

Tree mode assigns **exact** `width`/`height` (the node cannot grow). Graph mode assigns **minimum** `minWidth`/`minHeight` (the node grows to fit content).

For the dingflow/TaskFlow tree schemas, `minWidth: 130, minHeight: 44` becomes a **fixed** 130×44px box. This is ~60% smaller than graph mode's 192×112px flexible cards. Content overflow is clipped.

---

## Root Cause #3: Terminal Nodes Use a Completely Different Visual Language

File: `designer-xyflow-node.tsx:239-249`

Terminal nodes (those with `treeNodeType?.tree?.isTerminal === true`) render as a **3px circle** with an 11px label, instead of the same card layout used by all other nodes. This creates visual inconsistency — a flow may have 6 normal cards and 1 tiny dot, making the chain look broken.

This is especially problematic for `tf-end` in the TaskFlow tree schema, where the end node is expected to be a proper visual terminal, not a minimalist indicator.

---

## Root Cause #4: Simple Edge Rendering

File: `packages/flow-designer-renderers/src/dingflow/ding-flow-edge.tsx`

Tree mode edges use `DingFlowEdge` which renders:

- Orthogonal straight-line paths (no bezier curves)
- A single fixed `CONNECTOR_COLOR` (`#cacaca`) — all edges look identical
- Plain text labels with minimal styling (no schema-driven edge body)
- No hover toolbar (no edit/delete quick actions)

In contrast, graph mode edges (`designer-xyflow-edge.tsx`) render:

- Bezier curves
- Type-specific colors and styles (dashed, dotted, different stroke widths)
- Schema-driven rich labels via `RenderNodes`
- Hover toolbar with action buttons

The TaskFlow schema defines 4 edge types (`tf-next` indigo, `tf-error` red dashed, `tf-wait` green dotted, `tf-wait-error` orange dashed), but **all edge bodies are ignored** in tree mode because `DingFlowEdge` does not use `RenderNodes`.

---

## Root Cause #5: `simpleTreeLayout()` Uses Naive BFS with No Crossing Minimization

File: `packages/flow-designer-core/src/tree-layout.ts:260-476`

The `simpleTreeLayout()` function (called after every tree mutation):

- Builds layers by BFS from root
- Positions nodes in simple rows/columns
- Has no crossing minimization
- Has no edge routing optimization

The initialization uses `layoutStructuredTree()` (line 217-258) which is smarter (recursive subtree measurement), but after any user edit, the fallback `simpleTreeLayout()` can produce poor arrangements with overlapping branches and uneven spacing.

---

## Root Cause #6: No `classAliases` Support in Tree Nodes

File: `designer-xyflow-node.tsx:214-264`

Tree mode never creates a `<ClassAliasesContext.Provider>`. The graph mode wraps the body render in this provider (line 266), enabling the schema to use shorthand class names like `node-card`, `node-icon--tf-start`, etc. Without this context, even if the body schema were rendered, classAlias resolution would fail silently.

---

## Summary of Fixes Needed

| #   | Fix                                                                                                     | File(s)                                       | Complexity |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---------- |
| 1   | Render `nodeType.body` through `RenderNodes` in tree mode (same as graph mode)                          | `designer-xyflow-node.tsx`                    | Medium     |
| 2   | Wrap tree node render in `ClassAliasesContext.Provider`                                                 | `designer-xyflow-node.tsx`                    | Trivial    |
| 3   | Change tree mode dimensions from `width`/`height` to `minWidth`/`minHeight`                             | `designer-xyflow-node.tsx:129-147`            | Trivial    |
| 4   | Remove `isTerminal` special case; render terminal nodes as normal cards                                 | `designer-xyflow-node.tsx`                    | Low        |
| 5   | Render edge body schema through `RenderNodes` in `DingFlowEdge` (or use `DesignerXyflowEdge` for trees) | `ding-flow-edge.tsx`                          | Medium     |
| 6   | Use edge type-specific styling (stroke color, dash array) in tree edges                                 | `ding-flow-edge.tsx`, `dingflow-constants.ts` | Low        |
| 7   | Replace `simpleTreeLayout()` with ELK for post-mutation layout, or add crossing minimization            | `tree-layout.ts`, `tree-layout.test.ts`       | High       |

Fix 1 is the highest-impact change and alone would resolve ~80% of the visual quality gap. Fixes 2-4 are low-risk improvements. Fixes 5-6 address edge visuals. Fix 7 is a performance/quality optimization for complex trees.
