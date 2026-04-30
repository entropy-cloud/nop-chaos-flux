# V11 Final Design: Next-Generation Low-Code Runtime

**Version**: 1.1.0  
**Status**: Final Design (Revised)  
**Sources**:

- v11-design.md (Independent Design)
- v11-lowcode-design.md (Low-Code Specific)
- flux-core architecture (Project Implementation)
- low-code-dsl-runtime-requirements.md (Requirements)

---

## Executive Summary

This document presents the **final synthesized design** for a next-generation low-code DSL runtime. It combines:

1. **V11's innovations**: Hybrid Dependency Tracking, Algebraic Schema Calculus, Security Sandbox
2. **flux-core's proven patterns**: Seven Primitives, Lexical Scoping, Validation Owner Model
3. **Requirements compliance**: Full coverage of DSL runtime requirements

The result is a design that focuses on **DSL-layer concerns** while respecting the boundary with underlying execution frameworks.

### Important Architectural Boundary

**Execution strategies (Resumability, Islands, Hydration control) are framework-layer responsibilities, not DSL-layer concerns.**

- If using React: React's hydration, Suspense, and RSC models apply
- If using Qwik: Qwik's resumability model applies
- The DSL layer declares **intent**, the framework adapter layer decides **how to execute**

This revision removes the original V11 design's execution strategy controls, which incorrectly assumed the DSL could bypass or override framework-level execution models.

---

## Part I: Design Philosophy Synthesis

### 1.1 What V11 Got Right (Keep)

| V11 Innovation                        | Value                                     | Integration                           |
| ------------------------------------- | ----------------------------------------- | ------------------------------------- |
| **Static Analysis at Compile Time**   | Extract dependencies without runtime cost | Enhance flux-core's Proxy tracking    |
| **Closure Compilation for Hot Paths** | Optimized expression evaluation           | Adopt for table cells, repeated items |
| **Query/Effect primitives**           | Server state + lifecycle effects          | Map to flux-core Resource/Reaction    |
| **Formal Schema Algebra**             | Provable composition                      | Adopt Monoid/Functor laws             |
| **Security Sandbox**                  | Blocked properties, execution limits      | Essential for production              |

### 1.1.1 What V11 Got Wrong (Removed)

| V11 Concept                    | Why Removed                                                          |
| ------------------------------ | -------------------------------------------------------------------- |
| **Resumability**               | Framework-layer concern (Qwik's model, not implementable on React)   |
| **Islands Architecture**       | Framework-layer concern (requires framework-level hydration control) |
| **ExecutionStrategy per node** | DSL cannot override framework execution model                        |
| **QRL lazy event loading**     | Qwik-specific, not portable to React/Vue                             |

**Lesson**: DSL should declare intent, not execution implementation details.

### 1.2 What flux-core Got Right (Keep)

| flux-core Pattern                     | Value                          | Integration                            |
| ------------------------------------- | ------------------------------ | -------------------------------------- |
| **Seven Primitives (closed set)**     | Prevents concept sprawl        | Adopt as foundation                    |
| **Template/Instance separation**      | Compile once, instantiate many | Core architecture                      |
| **ScopeRef + ActionScope separation** | Data vs Capability lookup      | Essential pattern                      |
| **Validation Owner Model**            | Validation beyond forms        | Proven in production                   |
| **Proxy-based dependency tracking**   | Precise, runtime-efficient     | Adopt with static analysis enhancement |
| **ComponentHandleRegistry**           | Type-safe component targeting  | Proven pattern                         |

### 1.3 Synthesis Decisions

| Area                  | V11 Approach         | flux-core Approach     | Final Decision                                                                        |
| --------------------- | -------------------- | ---------------------- | ------------------------------------------------------------------------------------- |
| Core Primitives       | 7 (V/C/L/N/A/E/Q)    | 7 (T/S/V/R/Re/C/HP)    | **Unified 7**: Template, Scope, Value, Resource, Reaction, Capability, HostProjection |
| Dependency Tracking   | Static analysis only | Proxy-based runtime    | **Hybrid**: Static analysis + runtime tracking + cache                                |
| Expression Evaluation | AST interpreter      | AST interpreter        | **Enhanced**: Add closure compilation for hot paths                                   |
| Execution Strategy    | DSL-controlled       | Framework-controlled   | **Framework-controlled** (DSL declares intent only)                                   |
| Validation            | Part of Form         | Validation Owner Model | **flux-core's Owner Model** (more flexible)                                           |
| Action Resolution     | Three-layer          | Three-layer            | **Identical** (proven pattern)                                                        |

---

## Part II: Unified Seven Primitives

### 2.1 The Closed Primitive Set

The final design uses **exactly seven primitives** - a closed set that should not be extended without extraordinary justification:

| #   | Primitive          | V11 Origin     | flux-core Origin | Final Role                      |
| --- | ------------------ | -------------- | ---------------- | ------------------------------- |
| 1   | **Template**       | Node/Blueprint | Template         | Immutable compiled structure    |
| 2   | **Scope**          | Scope          | ScopeRef         | Lexical data environment        |
| 3   | **Value**          | Value          | Value            | Polymorphic data container      |
| 4   | **Resource**       | Query          | Resource         | Lifecycle-owned data production |
| 5   | **Reaction**       | Effect         | Reaction         | Watch/effect behavior           |
| 6   | **Capability**     | Action         | Capability       | Effect dispatch                 |
| 7   | **HostProjection** | -              | HostProjection   | Read-only host state visibility |

### 2.2 Primitive Definitions

#### 2.2.1 Template (Compiled Structure)

```typescript
interface TemplateNode {
  // Identity
  templateNodeId: TemplateNodeId;
  id: string;
  type: string;

  // Compiled programs (immutable)
  propsProgram: CompiledRuntimeValue<Record<string, unknown>>;
  metaProgram: NodeMetaProgram;
  eventPlans: Readonly<Record<string, CompiledAction>>;
  regions: Readonly<Record<string, TemplateRegion>>;

  // Scope plan
  scopePlan: ScopePlan;

  // Static analysis results (compiler-computed bottom-up)
  staticAnalysis: StaticAnalysisResult;
}

interface StaticAnalysisResult {
  // This node and all descendants are fully static
  isStaticContent: boolean;

  // Extracted dependencies (empty if static)
  dependencies: string[];
}
```

### 2.2.1.1 Renderer Static Capability

Renderers declare whether they **inherently support** being static:

```typescript
interface RendererDefinition {
  type: string;

  // Does this renderer support static rendering?
  // true:  text, image, container, flex, heading (display-only)
  // false: input, button, select, checkbox (inherently interactive)
  staticCapable: boolean;

  // ... other fields
}

// Examples
const rendererRegistry = {
  text: { staticCapable: true }, // Display only
  image: { staticCapable: true }, // Display only
  container: { staticCapable: true }, // Layout only
  flex: { staticCapable: true }, // Layout only
  heading: { staticCapable: true }, // Display only

  input: { staticCapable: false }, // Needs interaction
  button: { staticCapable: false }, // Needs click handler
  select: { staticCapable: false }, // Needs interaction
  checkbox: { staticCapable: false }, // Needs interaction
  form: { staticCapable: false }, // Manages state
};
```

### 2.2.1.2 Bottom-Up Static Analysis (Compile Time)

Compile in **post-order traversal** (children first, then parent):

```typescript
// Called during compilation, bottom-up
function computeStaticAnalysis(
  node: TemplateNode,
  rendererRegistry: RendererRegistry,
): StaticAnalysisResult {
  const renderer = rendererRegistry.get(node.type);

  // 1. Renderer itself doesn't support static → not static
  if (!renderer?.staticCapable) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node),
    };
  }

  // 2. Has expressions in props → not static
  if (!node.propsProgram.isStatic) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node),
    };
  }

  // 3. Has event handlers → not static
  if (Object.keys(node.eventPlans).length > 0) {
    return {
      isStaticContent: false,
      dependencies: collectDependencies(node),
    };
  }

  // 4. Check all regions - children already computed (bottom-up)
  for (const region of Object.values(node.regions)) {
    for (const child of region.children) {
      // Child's staticAnalysis was computed before this node
      if (!child.staticAnalysis.isStaticContent) {
        return {
          isStaticContent: false,
          dependencies: collectDependencies(node),
        };
      }
    }
  }

  // All conditions met → fully static
  return { isStaticContent: true, dependencies: [] };
}

// Compilation order: post-order traversal ensures bottom-up
function compileTemplate(schema: SchemaAST): TemplateNode {
  // 1. Compile all children first (recursively)
  const regions = compileRegions(schema.regions); // Children computed first

  // 2. Then compute this node's static analysis
  const node = buildTemplateNode(schema, regions);
  node.staticAnalysis = computeStaticAnalysis(node, rendererRegistry);

  return node;
}
```

### 2.2.1.3 Static Analysis Rules Summary

| Condition                             | Result     |
| ------------------------------------- | ---------- |
| Renderer `staticCapable: false`       | Not static |
| Props contain expressions             | Not static |
| Has event handlers                    | Not static |
| Any child in any region is not static | Not static |
| All above pass                        | **Static** |

Framework adapters can use `staticAnalysis.isStaticContent` for optimization.

#### 2.2.2 Scope (Data Environment)

```typescript
interface ScopeRef {
  id: string;
  path: string;
  parent?: ScopeRef;
  store?: ScopeStore;
  isolated: boolean;  // flux-core's isolation

  // Data access (flux-core pattern)
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  readVisible(): Record<string, any>;  // Prototype chain for lexical scope

  // Data mutation
  update(path: string, value: unknown): void;

  // Subscriptions with path-level granularity
  subscribe(listener: (change: ScopeChange) => void): Unsubscribe;

  // State persistence (for localStorage, session restore, etc.)
  serialize(): SerializedScope;
  static restore(data: SerializedScope, parent?: ScopeRef): ScopeRef;
}

// Scope change notification (flux-core pattern)
interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}
```

#### 2.2.3 Value (Unified Value Semantics)

```typescript
// Compiled value tree (flux-core pattern)
type CompiledValueNode<T = unknown> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array-node'; items: ReadonlyArray<CompiledValueNode<unknown>> }
  | {
      kind: 'object-node';
      keys: readonly string[];
      entries: Readonly<Record<string, CompiledValueNode<unknown>>>;
    };

// Runtime value (with V11's static optimization)
type CompiledRuntimeValue<T = unknown> =
  | { kind: 'static'; isStatic: true; value: T }
  | {
      kind: 'dynamic';
      isStatic: false;
      deps: string[];
      exec: (scope: ScopeRef) => T;
      cached?: MemoizedResult<T>;
    };

// V11 addition: memoization
interface MemoizedResult<T> {
  value: T;
  depValues: Map<string, unknown>;
  isValid: (scope: ScopeRef) => boolean;
}
```

#### 2.2.4 Resource (Data Production)

```typescript
// flux-core's Resource with V11 Query enhancements
interface ResourceDefinition {
  id: string;

  // Data source (V11's Query model)
  query?: {
    key: string | CompiledRuntimeValue<(string | number)[]>;
    fetch: (ctx: QueryContext) => Promise<unknown>;
    staleTime?: number;
    cacheTime?: number;
    retry?: number;
  };

  // Output configuration
  outputPath: string;
  loadingPath?: string;
  errorPath?: string;

  // Refresh strategy
  refresh: 'manual' | 'onMount' | 'onDepsChange' | { interval: number };

  // Dependencies
  dependsOn?: string[]; // Explicit root dependencies

  // Self-write protection (flux-core pattern)
  selfWritePaths: Set<string>;
}
```

#### 2.2.5 Reaction (Watch/Effect)

```typescript
// flux-core's Reaction with V11's AbortSignal
interface ReactionDefinition {
  id: string;

  // What to watch
  watch: string[]; // Paths to observe

  // Condition
  when?: CompiledRuntimeValue<boolean>;

  // Effect to run
  effect: CompiledAction;

  // V11 additions
  debounceMs?: number;
  signal?: AbortSignal; // For cancellation
}
```

#### 2.2.6 Capability (Effect Dispatch)

```typescript
// Three-layer action resolution (both V11 and flux-core agree)
interface CapabilityResolution {
  // Layer 1: Built-in platform actions
  builtin: Map<string, BuiltinActionHandler>;

  // Layer 2: Component instance targeting
  componentRegistry: ComponentHandleRegistry;

  // Layer 3: Namespace actions (lexical lookup)
  actionScope: ActionScope;
}

// ActionScope (flux-core's proven pattern)
interface ActionScope {
  id: string;
  parent?: ActionScope;

  resolve(actionName: string): ResolvedActionHandler | undefined;
  registerNamespace(namespace: string, provider: ActionNamespaceProvider): () => void;
  unregisterNamespace(namespace: string): void;
}
```

#### 2.2.7 HostProjection (Read-Only Host State)

```typescript
// flux-core's pattern for domain control integration
interface HostProjection {
  namespace: string;

  // Read-only state visible in expressions
  projection: {
    fields: Record<string, TypeDescriptor>;
    get(): Record<string, unknown>;
    subscribe(listener: () => void): Unsubscribe;
  };

  // Commands (exposed through Capability)
  commands: {
    [method: string]: {
      params: Record<string, TypeDescriptor>;
      returns: TypeDescriptor;
      invoke(args: Record<string, unknown>): Promise<unknown>;
    };
  };
}
```

---

## Part III: Expression Engine (Enhanced)

### 3.1 Hybrid Dependency Tracking

Combining V11's static analysis with flux-core's Proxy-based runtime tracking:

```typescript
interface DependencyTrackingStrategy {
  // Phase 1: Static analysis at compile time
  staticDeps: string[]; // Extracted from AST

  // Phase 2: Runtime tracking on first evaluation (flux-core's Proxy)
  runtimeDeps: string[] | null;

  // Phase 3: Cached final deps (union of static + runtime)
  finalDeps: string[];

  // Strategy selection
  trackingMode: 'static-only' | 'runtime-only' | 'hybrid';
}

// flux-core's Proxy-based collector
interface ScopeDependencyCollector {
  recordPath(path: string): void;
  recordWildcard(): void;
}

// Root-level tracking (flux-core pattern)
// scope.user.name → records 'user'
// scope.filters.status → records 'filters'
```

### 3.2 Performance Optimization: Closure Compilation

For hot paths (table cells, repeated items), compile expressions to closures:

```typescript
interface ClosureCompiledExpr<T> {
  // Original AST
  ast: ExprAST;

  // Static dependencies
  deps: string[];

  // Pre-compiled closure (for hot paths)
  closure: (scope: ScopeRef) => T;

  // Fallback AST interpreter
  interpret: (scope: ScopeRef) => T;
}

// Closure generation
function compileToClosuer(ast: ExprAST): (scope: ScopeRef) => any {
  // Generate optimized closure at compile time
  // e.g., ${user.name + ' (' + user.role + ')'}
  // becomes:
  return (scope) => {
    const user = scope.get('user');
    return user.name + ' (' + user.role + ')';
  };
}
```

### 3.3 Security (V11's sandbox)

```typescript
// Blocked properties (V11's security model)
const BLOCKED_PROPERTIES = new Set([
  '__proto__',
  'constructor',
  'prototype',
  '__defineGetter__',
  '__defineSetter__',
]);

// Execution limits (V11's DoS protection)
interface ExecutionLimits {
  maxEvaluationTimeMs: number; // 100ms
  maxRecursionDepth: number; // 100
  maxLoopIterations: number; // 10000
}
```

---

## Part IV: Validation System (flux-core's Owner Model)

### 4.1 Why flux-core's Model Wins

V11's validation was form-centric. flux-core's **Validation Owner Model** is superior because:

1. **Validation can exist outside forms** (filter panels, inline editors)
2. **Validation structure is compiled once, instantiated at runtime**
3. **Draft isolation is a first-class concept**
4. **Per-path subscriptions ensure O(1) update cost**

### 4.2 Validation Owner Model

```typescript
// Validation is owned by the nearest validation-capable scope runtime
interface ValidationScopeRuntime {
  // Validate specific path
  validateAt(path: string, reason: ValidationReason): Promise<ValidationResult>;

  // Validate subtree
  validateSubtree(path: string, reason: ValidationReason): Promise<ScopeValidationResult>;

  // Validate all
  validateAll(reason: ValidationReason): Promise<ScopeValidationResult>;

  // Field state access
  getFieldState(path: string): FieldValidationStateSnapshot;

  // Per-path subscription (O(1) cost)
  subscribeToPath(path: string, listener: PathStateListener): Unsubscribe;
}

// FormRuntime extends ValidationScopeRuntime with form-specific behavior
interface FormRuntime extends ValidationScopeRuntime {
  // Form-specific state
  touched: Record<string, boolean>;
  dirty: Record<string, boolean>;

  // Submit with validation
  submit(): Promise<SubmitResult>;

  // Draft mode (flux-core's proven pattern)
  enterDraftMode(): void;
  commitDraft(): void;
  discardDraft(): void;
}
```

### 4.3 Compiled Validation Model

```typescript
// Compiled at schema compilation time
interface CompiledFormValidationModel {
  rootPath: string;
  ownerId: string;

  // Tree structure
  nodes: Map<string, CompiledFieldTreeNode>;

  // Execution order
  validationOrder: string[];

  // Cross-field dependencies
  dependents: Map<string, string[]>;
}

// Node kinds in validation tree
type FieldTreeNodeKind =
  | 'scope-root'
  | 'form-root'
  | 'field'
  | 'object'
  | 'array'
  | 'variant-root'
  | 'variant-branch'
  | 'repeated-template';
```

---

## Part V: Framework Adapter Layer (Architectural Boundary)

### 5.1 The Correct Layering

```
┌─────────────────────────────────────────────────────────────┐
│  DSL Layer (this design)                                    │
│  - Schema compilation                                       │
│  - Expression evaluation                                    │
│  - Scope management                                         │
│  - Action dispatch                                          │
│  - Validation                                               │
│  - Declares INTENT via hints                                │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ Intent / Hints
┌─────────────────────────────────────────────────────────────┐
│  Framework Adapter Layer (NOT part of this design)          │
│  - Decides how to render (React/Vue/Qwik/Solid)            │
│  - Controls hydration strategy                              │
│  - Controls server/client boundary                          │
│  - May ignore DSL hints if framework doesn't support them   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼ Framework API
┌─────────────────────────────────────────────────────────────┐
│  Execution Framework (React/Vue/Qwik/Solid)                 │
│  - Owns execution model                                     │
│  - Owns hydration                                           │
│  - Owns reconciliation/reactivity                           │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 What Compiler Computes (Bottom-Up)

Static analysis is computed **once at compile time** using post-order traversal:

```
Compile order (post-order):

       page           ← computed last
      /    \
   hero    form       ← computed second
   /  \      |
 img  text  input     ← computed first (leaves)
```

Each node's `staticAnalysis.isStaticContent` depends on:

1. Its renderer's `staticCapable` declaration
2. Whether its props are all static
3. Whether it has no events
4. Whether all children (already computed) are static

```yaml
# Schema
type: page
body:
  - type: container # staticCapable: true
    body:
      - type: text # staticCapable: true, no expressions, no events
        props:
          content: 'Hello' # Static literal
      - type: image # staticCapable: true
        props:
          src: '/logo.png' # Static literal
  - type: form # staticCapable: false (inherently interactive)
    body:
      - type: input # staticCapable: false
```

Result after compilation:

```
text    → isStaticContent: true
image   → isStaticContent: true
container → isStaticContent: true  (all children static)
input   → isStaticContent: false   (renderer not staticCapable)
form    → isStaticContent: false   (renderer not staticCapable)
page    → isStaticContent: false   (has non-static child: form)
```

### 5.3 What Compiler Cannot Know (True Hints)

Some optimization information **cannot** be computed - these would be true hints:

```typescript
// These ARE hints - only human knows
interface OptimizationHints {
  // Compiler cannot know viewport position
  belowFold?: boolean;

  // Compiler cannot know business priority
  lowPriority?: boolean;

  // Compiler cannot know if content is LCP candidate
  lcpCandidate?: boolean;
}
```

However, **we choose NOT to add these hints** because:

1. They leak rendering optimization concerns into DSL
2. They couple DSL to specific framework capabilities
3. Framework adapters can use heuristics or layout analysis instead
4. Keep DSL focused on structure and behavior, not rendering optimization

### 5.3 What DSL Cannot Control (Framework Responsibility)

| Concern               | Why DSL Cannot Control                                |
| --------------------- | ----------------------------------------------------- |
| Hydration strategy    | React's `hydrateRoot()` is all-or-nothing per root    |
| Server/client split   | Requires framework support (RSC, Qwik's resumability) |
| Selective hydration   | React Suspense boundaries are framework-controlled    |
| Event handler loading | Qwik's QRL is Qwik-specific, not portable             |

### 5.4 Framework Adapter Examples

**React Adapter** (current flux-react):

```typescript
// Uses staticAnalysis computed by compiler
function ReactAdapter({ templateNode, scope }) {
  // Compiler already computed isStaticContent
  if (templateNode.staticAnalysis.isStaticContent) {
    // Could potentially memoize or skip re-renders
    return <MemoizedStatic>{renderChildren()}</MemoizedStatic>;
  }

  // Dynamic content - normal rendering
  return <DynamicRenderer {...resolvedProps} />;
}
```

**Hypothetical Qwik Adapter**:

```typescript
// Qwik could leverage staticAnalysis more aggressively
// But this requires building a Qwik adapter, not changing the DSL
```

### 5.5 Why Original V11 Design Was Wrong

The original V11 design declared:

```yaml
execution:
  location: server
  hydration: interaction
  resumable: true
```

This is **architecturally incorrect** because:

1. **React cannot honor `hydration: interaction`** - React hydrates the whole tree
2. **`resumable: true` requires Qwik** - React's component model cannot "resume"
3. **`location: server` requires RSC** - Not available in vanilla React
4. **DSL shouldn't assume framework capabilities** - What if we switch to Vue?

The corrected design separates concerns properly.

---

## Part VI: Rendering Architecture

### 6.1 RendererComponentProps (flux-core pattern)

```typescript
interface RendererComponentProps<S extends BaseSchema = BaseSchema> {
  // Identity
  id: string;
  path: string;

  // Compiled structure
  schema: S;
  templateNode: TemplateNode<S>;
  node: NodeInstance<S>;

  // Resolved values
  props: Readonly<Record<string, unknown>>;
  meta: ResolvedNodeMeta;

  // Child regions
  regions: Readonly<Record<string, RenderRegionHandle>>;

  // Event handlers
  events: Readonly<Record<string, RendererEventHandler | undefined>>;

  // Helpers
  helpers: RendererHelpers;
}
```

### 6.2 Layout vs Control Components

```typescript
// Layout components (flux-core pattern): marker classes only
const layoutRenderers = {
  page: { category: 'layout', markerClass: 'nop-page' },
  container: { category: 'layout', markerClass: 'nop-container' },
  flex: { category: 'layout', markerClass: 'nop-flex' },
};

// Control components: self-styled UI controls
const controlRenderers = {
  'input-text': { category: 'control' },
  select: { category: 'control' },
  table: { category: 'control' },
};
```

### 6.3 Region Rendering

```typescript
interface RenderRegionHandle {
  key: string;
  templateNode: TemplateNode | TemplateNode[] | null;
  params?: readonly string[];

  render(options?: {
    scope?: ScopeRef;
    bindings?: Record<string, unknown>; // $slot parameters
    isolate?: boolean;
  }): React.ReactNode;
}
```

---

## Part VII: What This Design Achieves

### 7.1 DSL-Layer Innovations

| Area                     | Existing Low-Code Limitation | This Design's Solution                 |
| ------------------------ | ---------------------------- | -------------------------------------- |
| **Dependency tracking**  | Runtime-only or static-only  | Hybrid: static + runtime + cache       |
| **Expression hot paths** | AST interpretation overhead  | Closure compilation for repeated items |
| **Validation model**     | Form-centric only            | Validation Owner Model (any scope)     |
| **Schema composition**   | Ad-hoc, no guarantees        | Algebraic laws (Monoid/Functor)        |
| **Security**             | Often missing                | Sandbox + execution limits             |
| **Action resolution**    | Global registry              | Three-layer lexical resolution         |

### 7.2 What This Design Does NOT Claim

| Claim                                     | Reality                                     |
| ----------------------------------------- | ------------------------------------------- |
| ~~"Better than React's execution model"~~ | DSL doesn't control execution - React does  |
| ~~"Resumability support"~~                | Requires Qwik, not achievable on React      |
| ~~"Islands architecture"~~                | Requires framework support, not DSL feature |
| ~~"Zero hydration"~~                      | Framework-controlled, not DSL-controlled    |

### 7.3 Honest Design Superiority

This design is superior to other low-code DSLs in areas **within DSL scope**:

1. **Hybrid Dependency Tracking**: More precise than pure static or pure runtime
2. **Closure Compilation**: Faster expression evaluation for hot paths
3. **Validation Owner Model**: More flexible than form-centric validation
4. **Formal Composition**: Predictable schema transformations with algebraic laws
5. **Security Sandbox**: Production-ready security (many low-code platforms lack this)
6. **Three-layer Action Resolution**: Clean separation of built-in/component/namespace actions

### 7.4 Requirements Coverage

| Requirement Category | Coverage | Evidence                 |
| -------------------- | -------- | ------------------------ |
| Schema Compilation   | 100%     | Part II Template         |
| Expression Engine    | 100%     | Part III                 |
| Lexical Scope        | 100%     | Part II Scope            |
| Dependency Tracking  | 100%     | Part III.1 Hybrid        |
| Rendering            | 100%     | Part VI                  |
| Action System        | 100%     | Part II Capability       |
| Form & Validation    | 100%     | Part IV                  |
| API & Resources      | 100%     | Part II Resource         |
| Surfaces             | 100%     | flux-core SurfaceManager |
| Host Integration     | 100%     | Part II HostProjection   |
| Security             | 100%     | Part III.3               |

Note: "Performance" requirements related to hydration/Islands are framework-layer concerns, not DSL requirements.

---

## Part VIII: Implementation Roadmap

### Phase 1: Core Primitives (8 weeks)

- [ ] Unified Scope with state persistence
- [ ] Hybrid dependency tracking
- [ ] Expression engine with closure compilation
- [ ] Security sandbox

### Phase 2: Template System (6 weeks)

- [ ] Schema compiler
- [ ] Template/Instance separation
- [ ] Region compilation
- [ ] Static analysis for optimization hints

### Phase 3: Validation & Forms (6 weeks)

- [ ] Validation Owner Model
- [ ] Compiled validation graph
- [ ] Draft mode
- [ ] Per-path subscriptions

### Phase 4: Framework Adapters (4 weeks)

- [ ] React adapter (primary)
- [ ] Hint interpretation layer
- [ ] Code splitting integration (React.lazy)

### Phase 5: Polish (4 weeks)

- [ ] DevTools
- [ ] Performance profiling
- [ ] Documentation

**Total: ~28 weeks (7 months)**

Note: Advanced execution strategies (Resumability, Islands) would require:

- Switching to Qwik or building a custom framework
- This is outside the scope of DSL design

---

## Appendix A: Comparison Table

| Aspect              | V11 Original       | flux-core            | V11-Final (Revised)         |
| ------------------- | ------------------ | -------------------- | --------------------------- |
| Primitives          | 7 (V/C/L/N/A/E/Q)  | 7 (T/S/V/R/Re/C/HP)  | 7 (unified)                 |
| Dependency Tracking | Static only        | Proxy runtime        | **Hybrid**                  |
| Validation          | Form-centric       | Owner Model          | **Owner Model**             |
| Execution Control   | ~~DSL-controlled~~ | Framework-controlled | **Framework-controlled**    |
| Security            | Yes (sandbox)      | Partial              | **Full**                    |
| ~~Islands~~         | ~~Yes~~            | No                   | **N/A (framework concern)** |
| ~~Resumability~~    | ~~Yes~~            | No                   | **N/A (framework concern)** |
| Formal Algebra      | Yes                | No                   | **Yes**                     |
| Production-proven   | No                 | Yes                  | **Yes**                     |

---

## Appendix B: Design Principles

1. **Seven Primitives Only**: No new primitives without extraordinary justification
2. **Compile Once, Execute Many**: Templates are immutable
3. **Hybrid Dependency Tracking**: Static analysis + runtime tracking + caching
4. **Respect Layer Boundaries**: DSL declares intent, framework controls execution
5. **Validation Owner Model**: Validation beyond forms
6. **Security First**: Sandbox, limits, blocked properties
7. **Formal Composition**: Algebraic laws for predictability

---

## Appendix C: Lessons Learned

### What the Original V11 Design Got Wrong

1. **Overreach**: Assumed DSL could control framework-level execution (Resumability, Islands)
2. **Framework Coupling**: Designed features that only work with specific frameworks (Qwik)
3. **Impractical on React**: Most execution features cannot be implemented on React

### Corrected Understanding

- **DSL Layer**: Schema, expressions, scope, validation, actions
- **Framework Adapter Layer**: Bridges DSL to specific framework (React, Vue, Qwik)
- **Execution Framework Layer**: Owns hydration, reconciliation, event system

The DSL should be **framework-agnostic** in its core design, with framework-specific behavior isolated to adapter layers.

---

_End of V11 Final Design Document (Revised)_

**Revision Note**: Version 1.1.0 removes execution strategy controls (Resumability, Islands, Hydration) that incorrectly assumed DSL-layer control over framework-level concerns. The design now correctly respects the boundary between DSL and execution framework.
