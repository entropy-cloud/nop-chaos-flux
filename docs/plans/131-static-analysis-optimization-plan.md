# 131 Static Analysis Optimization Plan

> Plan Status: completed
> Last Reviewed: 2026-04-23
> Source: `docs/experiments/v11-final-design.md`, `docs/logs/2026/04-23.md`
> Related: None

---

## Goals

1. Add `staticCapable` field to `RendererDefinition` to declare whether a renderer supports static rendering
2. Add `staticAnalysis` field to `TemplateNode` to store compiler-computed static analysis results
3. Implement bottom-up static analysis computation in schema compiler
4. Enable framework adapters to use static analysis for optimization decisions

## Non-Goals

- Implementing actual rendering optimizations (that's framework adapter layer responsibility)
- Adding manual hints (belowFold, lowPriority) - DSL should not control rendering optimization
- Implementing Resumability or Islands architecture (framework layer concerns)
- Server-side rendering changes

## Current Baseline

### Existing Infrastructure

| Component | Status |
|-----------|--------|
| `CompiledRuntimeValue.isStatic` | Exists - individual value static detection |
| `TemplateNode.propsProgram` | Exists - can check `isStatic` |
| `TemplateNode.eventPlans` | Exists - can check if empty |
| `TemplateNode.regions` | Exists - can iterate children |
| `RendererDefinition.staticCapable` | **Missing** |
| `TemplateNode.staticAnalysis` | **Missing** |
| Bottom-up computation in compiler | **Missing** |

### What Makes a Node Static

A node is static when ALL conditions are met:

1. Renderer declares `staticCapable: true`
2. `propsProgram.isStatic === true` (no expressions)
3. No `name` binding in schema (no data read/write)
4. `eventPlans` is empty (no event handlers)
5. `scopePlan` does not create scope (no data/sources)
6. All children in all regions are static (recursive, but computed bottom-up)

---

## Phase 1: Type Definitions

Status: completed

### 1.1 Update RendererDefinition

File: `packages/flux-core/src/types/renderer-core.ts`

```typescript
export interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  // ... existing fields
  
  /**
   * Whether this renderer supports static rendering (no client interaction needed).
   * - true: text, image, container, flex, heading (display-only)
   * - false: input, button, select, form (inherently interactive)
   * Default: false (safe default - assume interactive unless declared otherwise)
   */
  staticCapable?: boolean;
}
```

### 1.2 Add StaticAnalysisResult

File: `packages/flux-core/src/types/node-identity.ts`

```typescript
/**
 * Compiler-computed static analysis results.
 * Computed bottom-up during schema compilation.
 */
export interface StaticAnalysisResult {
  /**
   * This node and all descendants are fully static.
   * True only when:
   * - Renderer is staticCapable
   * - Props have no expressions
   * - No name binding
   * - No event handlers
   * - No scope creation
   * - All children are static
   */
  isStaticContent: boolean;
  
  /**
   * Extracted dependency paths from expressions.
   * Empty array if node is fully static.
   */
  dependencies: readonly string[];
}
```

### 1.3 Update TemplateNode

File: `packages/flux-core/src/types/node-identity.ts`

```typescript
export interface TemplateNode<S extends BaseSchema = BaseSchema> {
  // ... existing fields
  
  /**
   * Compiler-computed static analysis results.
   * Used by framework adapters for optimization decisions.
   * Computed bottom-up during schema compilation.
   */
  staticAnalysis: StaticAnalysisResult;
}
```

### Exit Criteria

- [x] Types added to flux-core
- [x] Types exported from index.ts
- [x] `pnpm typecheck` passes
- [x] No breaking changes to existing code

---

## Phase 2: Renderer Definitions Update

Status: completed

### 2.1 Add staticCapable to All Renderers

Update all renderer definitions across packages:

**Display-only renderers (staticCapable: true)**:
- `text`
- `tpl` (if no events)
- `image`
- `icon`
- `heading`
- `divider`
- `container`
- `flex`
- `grid`
- `panel`
- `card`
- `page` (if no events)

**Interactive renderers (staticCapable: false or undefined)**:
- `input-text`
- `input-number`
- `textarea`
- `select`
- `checkbox`
- `radio`
- `switch`
- `button`
- `form`
- `table`
- `tree`
- All form-advanced renderers
- All domain host renderers

### Exit Criteria

- [x] All renderers in flux-renderers-basic updated
- [x] All renderers in flux-renderers-form updated (default false, no change needed)
- [x] All renderers in flux-renderers-form-advanced updated (default false, no change needed)
- [x] All renderers in flux-renderers-data updated (default false, no change needed)
- [x] All domain renderers updated (default to false)
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes

---

## Phase 3: Compiler Implementation

Status: completed

### 3.1 Bottom-Up Static Analysis

File: `packages/flux-compiler/src/schema-compiler.ts` (or appropriate location)

```typescript
function computeStaticAnalysis(
  node: TemplateNode,
  schema: BaseSchema
): StaticAnalysisResult {
  const renderer = node.component;
  
  // 1. Renderer not staticCapable → not static
  if (!renderer.staticCapable) {
    return { 
      isStaticContent: false, 
      dependencies: collectDependencies(node) 
    };
  }
  
  // 2. Props have expressions → not static
  if (!node.propsProgram.isStatic) {
    return { 
      isStaticContent: false, 
      dependencies: collectDependencies(node) 
    };
  }
  
  // 3. Has name binding → not static (data read/write)
  if (schema.name) {
    return { 
      isStaticContent: false, 
      dependencies: collectDependencies(node) 
    };
  }
  
  // 4. Has event handlers → not static
  if (Object.keys(node.eventPlans).length > 0) {
    return { 
      isStaticContent: false, 
      dependencies: collectDependencies(node) 
    };
  }
  
  // 5. Creates scope → not static (has data/sources)
  if (node.scopePlan?.createsScope) {
    return { 
      isStaticContent: false, 
      dependencies: collectDependencies(node) 
    };
  }
  
  // 6. Check all children (already computed in bottom-up order)
  for (const region of Object.values(node.regions)) {
    for (const child of getRegionChildren(region)) {
      if (!child.staticAnalysis.isStaticContent) {
        return { 
          isStaticContent: false, 
          dependencies: collectDependencies(node) 
        };
      }
    }
  }
  
  // All conditions met → fully static
  return { isStaticContent: true, dependencies: [] };
}
```

### 3.2 Integration with Schema Compilation

Ensure compilation uses post-order traversal:

```typescript
function compileNode(schema: SchemaAST): TemplateNode {
  // 1. Compile all children first (recursively)
  const regions = compileRegions(schema);
  
  // 2. Build node with compiled children
  const node = buildTemplateNode(schema, regions);
  
  // 3. Compute static analysis (children already have their results)
  node.staticAnalysis = computeStaticAnalysis(node, schema);
  
  return node;
}
```

### Exit Criteria

- [x] Static analysis computation implemented
- [x] Post-order traversal confirmed
- [x] Unit tests for static analysis logic
- [x] `pnpm typecheck` passes
- [x] `pnpm test` passes

---

## Phase 4: Testing and Validation

Status: completed

### 4.1 Unit Tests

```typescript
describe('static analysis', () => {
  it('marks text with static props as static', () => {
    const schema = { type: 'text', props: { content: 'Hello' } };
    const compiled = compiler.compile(schema);
    expect(compiled.root.staticAnalysis.isStaticContent).toBe(true);
  });
  
  it('marks text with expression as not static', () => {
    const schema = { type: 'text', props: { content: '${name}' } };
    const compiled = compiler.compile(schema);
    expect(compiled.root.staticAnalysis.isStaticContent).toBe(false);
    expect(compiled.root.staticAnalysis.dependencies).toContain('name');
  });
  
  it('marks input as not static (interactive renderer)', () => {
    const schema = { type: 'input-text', props: { placeholder: 'Enter' } };
    const compiled = compiler.compile(schema);
    expect(compiled.root.staticAnalysis.isStaticContent).toBe(false);
  });
  
  it('marks container as not static if child is not static', () => {
    const schema = {
      type: 'container',
      body: [
        { type: 'text', props: { content: 'Static' } },
        { type: 'input-text' }
      ]
    };
    const compiled = compiler.compile(schema);
    expect(compiled.root.staticAnalysis.isStaticContent).toBe(false);
  });
  
  it('marks container as static if all children are static', () => {
    const schema = {
      type: 'container',
      body: [
        { type: 'text', props: { content: 'Hello' } },
        { type: 'image', props: { src: '/logo.png' } }
      ]
    };
    const compiled = compiler.compile(schema);
    expect(compiled.root.staticAnalysis.isStaticContent).toBe(true);
  });
});
```

### Exit Criteria

- [x] All unit tests pass
- [x] Edge cases covered (empty regions, nested containers, etc.)
- [x] `pnpm test` passes

---

## Phase 5: Documentation

Status: completed

### 5.1 Update Architecture Docs

Added `docs/architecture/static-analysis.md`:

- Explains static analysis purpose
- Documents staticCapable renderer contract
- Documents bottom-up computation
- Documents how framework adapters can use it

### Exit Criteria

- [x] Architecture documentation updated
- [x] Renderer authoring guide updated (staticCapable documented)

---

## Validation Checklist

- [x] Types added and exported
- [x] All renderers have appropriate staticCapable value
- [x] Compiler computes staticAnalysis bottom-up
- [x] Unit tests pass
- [x] Integration tests pass
- [x] Documentation updated
- [x] No performance regression (compile time)
- [x] `pnpm typecheck && pnpm build && pnpm test` passes

---

## Future Considerations (Out of Scope)

These are explicitly **not** part of this plan:

1. **React adapter optimizations** - Using staticAnalysis for React.memo or similar
2. **SSR optimizations** - Using staticAnalysis for server rendering
3. **Manual hints** - belowFold, lowPriority, etc.
4. **Resumability/Islands** - Framework layer concerns

These may be addressed in future plans after this foundation is in place.
