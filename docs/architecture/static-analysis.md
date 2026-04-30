# Static Analysis

> Last Updated: 2026-04-23

## Overview

Static analysis is a compiler-computed optimization that identifies which parts of a schema tree are fully static (no runtime dependencies). This information enables framework adapters to optimize rendering by skipping unnecessary re-renders for static content.

## Design Principles

1. **Compiler-computed**: Static analysis is performed at compile time, not runtime
2. **Bottom-up traversal**: Children are analyzed first, results propagate up
3. **Renderer-declared capability**: Renderers declare `staticCapable` to indicate they support static rendering
4. **Framework adapter responsibility**: How to use static analysis is up to the framework layer

## Static Analysis Result

```typescript
interface StaticAnalysisResult {
  isStaticContent: boolean; // True if this node and all descendants are static
  dependencies: readonly string[]; // Dependency paths (empty if static)
}
```

## Static Conditions

A node is considered **static** when ALL of the following are true:

| Condition                         | Why                                            |
| --------------------------------- | ---------------------------------------------- |
| `renderer.staticCapable === true` | Renderer must support static rendering         |
| `propsProgram.isStatic === true`  | Props must have no expressions                 |
| `metaProgram` fields all static   | visible/disabled/etc. must have no expressions |
| `schema.name === undefined`       | No data binding                                |
| `eventPlans` is empty             | No event handlers                              |
| `scopePlan.kind === 'inherit'`    | Doesn't create new scope                       |
| All children static               | Recursive, but computed bottom-up              |

## Renderer staticCapable Declaration

Renderers must declare their static capability:

```typescript
const textRenderer: RendererDefinition = {
  type: 'text',
  component: TextRenderer,
  staticCapable: true, // Display-only, no interaction
};

const inputRenderer: RendererDefinition = {
  type: 'input-text',
  component: InputRenderer,
  staticCapable: false, // Interactive, always needs hydration
};
```

**Display-only renderers** (`staticCapable: true`):

- `text`, `icon`, `badge`, `image`, `divider`
- `container`, `flex`, `fragment`, `panel`, `card`

**Interactive renderers** (`staticCapable: false` or default):

- All form inputs (`input-*`, `select`, `checkbox`, etc.)
- `button`, `tabs`, `table`, `tree`
- `form`, `dialog`, `drawer`
- Domain host renderers

## Compilation Flow

```
Schema
  ↓
compileSchemaToTemplateNodes()
  ↓
compileSingleNode() for each node (recursive, depth-first)
  ↓
  1. Compile regions (children first)
  2. Build TemplateNode
  3. Compute static analysis (children already have results)
  ↓
TemplateNode with staticAnalysis
```

## Framework Adapter Usage

Framework adapters can use `staticAnalysis` for optimization decisions:

```typescript
// Example: React adapter might skip React.memo for static content
function renderNode(node: TemplateNode) {
  if (node.staticAnalysis?.isStaticContent) {
    // Could render as static HTML string
    // Could skip memo wrapper
    // Could mark for server-only rendering
  }
  // ...
}
```

Note: The DSL layer provides the analysis; the framework layer decides how to use it.

## Related Files

- `packages/flux-core/src/types/renderer-core.ts` - `RendererDefinition.staticCapable`
- `packages/flux-core/src/types/node-identity.ts` - `StaticAnalysisResult`, `TemplateNode.staticAnalysis`
- `packages/flux-compiler/src/schema-compiler.ts` - `computeStaticAnalysis()`
- `packages/flux-compiler/src/schema-compiler-static-analysis.test.ts` - Unit tests

## See Also

- `docs/plans/131-static-analysis-optimization-plan.md` - Implementation plan
- `docs/experiments/v11-final-design.md` - Original design discussion
