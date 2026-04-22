# Next-Generation Low-Code Framework Design — v10 (Revised)

> **Codename**: Flux Kernel 10 (FK10)
> **Tech Stack**: React 19 + Zustand 5 + TypeScript 6.0
> **Date**: 2026-04-22
> **Status**: Draft — Post-Review Revision
> **Design Philosophy**: *Compile what you can, react only to what changes. The best runtime code is code that never runs.*

---

## 0. Executive Summary

FK10 is a **compiler-first, reactive, type-safe** low-code runtime that treats a JSON schema as a **first-class program** to be compiled, optimized, and executed with near-hand-written-code performance.

### Honest Positioning

FK10 is a **schema rendering engine**, not a full low-code platform. It competes with AMIS's rendering layer, Formily's reactive core, and Refine's headless hooks. It does NOT compete with full-stack platforms like Appsmith, ToolJet, or Retool, which include visual editors, database connectors, workflow automation, and hosting.

### What FK10 Genuinely Innovates On

| Innovation | Why It Matters | Proven? | Caveats |
|-----------|---------------|---------|---------|
| Multi-stage IR compilation for schema | Moves analysis work out of render path | No (unproven at scale) | Svelte/Vue do similar for templates; applying to JSON schemas is incremental |
| Compile-time dependency graph | Enables push-based invalidation | No (theoretical) | Dynamic array access produces imprecise DepPatterns → over-invalidation |
| Pre-compiled Zustand selectors | Zero closure creation at render time | Yes (selector pattern is well-known) | Two subscriptions per node (props + meta); needs batching for large pages |
| Structured concurrency for actions | Clean cancellation, no dangling promises | Yes (AbortController is standard) | Refine already uses AbortController in data hooks |
| Scope chain with explicit projections | Solves the table-row blowout problem cleanly | Yes (pattern proven in React-Virtual) | Isolated scopes need explicit projections for any parent data access |
| Time-travel state inspector | Schema-source mapping for debugging | Yes (Redux DevTools proved the concept) | Debugging tool, not authoring tool |

### What FK10 Does NOT Innovate On

| Feature | Reality | Industry Leader |
|---------|---------|-----------------|
| Fine-grained reactivity | Proxy-based (Formily) and signal-based (Solid) approaches achieve similar results without compilation | Formily `@formily/reactive` |
| Validation engine | Formily's validation is industry-leading; FK10 matches it but doesn't surpass it | Formily 2.x |
| Expression engine | AST walking with memoization is sufficient; bytecode VM is Phase 2 optimization | AMIS, Formily |
| Type safety | Formily + TypeScript achieves similar results for form schemas | Formily 2.x |
| SSR | React 19 RSC is available to any React framework, not FK10-specific | Any React 19 framework |

### Design Principles

1. **Compiler does what it can.** Compile-time analysis eliminates whole categories of runtime work, but we don't pretend compilation solves everything. Dynamic behavior requires runtime reactivity.
2. **Reactivity is precise, not magical.** Every reactive dependency is traceable from expression to scope path to component render. No hidden cascades.
3. **Types flow where possible.** TypeScript 6 provides schema-to-renderer type narrowing. Dynamic schema parts (user-authored JSON) get runtime validation, not type guarantees.
4. **Host is sovereign.** The framework never owns the network, the theme, or the navigation. It provides hooks for the host to inject these.
5. **Progressive complexity.** Hello World in 10 lines of JSON; production form with 200 fields in the same system.
6. **Accessibility is not optional.** Every built-in renderer meets WCAG 2.1 AA. Schema authors opt out; they don't opt in.
7. **Amortized-cost abstraction.** Static parts pay their cost once. Dynamic parts are optimized for the common case. We don't claim "zero-cost"—we claim "pay once."

---

## 1. Architecture Overview

### 1.1 Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Host Application                      │
│  (provides: HTTP, navigation, theme, auth, i18n, toast)     │
├─────────────────────────────────────────────────────────────┤
│                    Host Integration Layer                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ HostEnv  │ │AdapterReg│ │ ErrorBnd │ │ A11yAnnounce │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                     React Rendering Layer                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │RendererH │ │RegionSlot│ │SurfaceMgr│ │ SuspenseBnd  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                      Runtime Kernel Layer                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ ScopeChn │ │ActionOrch│ │FormRuntim│ │  DataSource  │   │
│  │ (reactive│ │ (struct. │ │ (valid.  │ │  (lifecycle  │   │
│  │  deps)   │ │  concur.)│ │  draft)  │ │   polling)   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                    Compilation Pipeline Layer                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Parser   │→│ Analyzer │→│Optimizer │→│  IR Emitter  │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
├─────────────────────────────────────────────────────────────┤
│                      Schema Layer (Input)                     │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  JSON Schema  │  DSL Extensions  │  Schema Fragments │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
Schema (JSON)
    │
    ▼
┌─────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Parse   │────▶│ Analyze  │────▶│ Optimize │────▶│  Emit    │
│  (AST)   │     │ (typed   │     │ (static  │     │ (IR +    │
│          │     │  deps)   │     │  hoist,  │     │  modules)│
│          │     │          │     │  select.)│     │          │
└─────────┘     └──────────┘     └──────────┘     └──────────┘
                                                       │
                                                       ▼
                                               ┌──────────────┐
                                               │ Runtime      │
                                               │ (instantiate │
                                               │  IR → live   │
                                               │  nodes)      │
                                               └──────────────┘
```

### 1.3 Package Architecture

```
@flux/kernel          — Compilation pipeline (schema → IR), scope chain core
@flux/runtime         — Runtime instantiation, scope management, action orchestration
@flux/react           — React 19 rendering bridge (hooks, Suspense integration)
@flux/expression      — Expression compiler & AST evaluator (bytecode VM: Phase 2)
@flux/form            — Form runtime, validation engine, draft isolation, array fields
@flux/data-source     — Named data sources, API adapter, polling, lifecycle, WebSocket
@flux/surface         — Dialog/Drawer stack manager
@flux/ui-types        — Renderer component type contracts (no React dependency)
@flux/devtools        — Time-travel inspector, schema-source mapping
@flux/host            — Host integration protocol adapters
@flux/stdlib          — Built-in action handlers, utility functions, filters
```

### 1.4 Realistic Bundle Estimates

| Bundle | Contents | Gzipped |
|--------|----------|---------|
| Core | kernel + expression + runtime | ~18KB |
| React bridge | @flux/react | ~8KB |
| Form | @flux/form | ~8KB |
| Data source | @flux/data-source | ~5KB |
| Surface | @flux/surface | ~3KB |
| Host + stdlib | @flux/host + @flux/stdlib | ~6KB |
| DevTools (dev only) | @flux/devtools | ~4KB |
| **Full (excluding renderers)** | All above | **~48KB** |
| Minimal renderer set | page, form, input, select, button, text, table, container (10 components) | ~25KB |
| **Typical production** | Full + minimal renderers | **~73KB** |

*These are estimates based on comparable libraries (Zustand ~1KB, React-hook-form ~8KB). Actual sizes depend on tree-shaking effectiveness and renderer complexity. The 48KB core excludes React itself (42KB gzipped).*

---

## 2. Compilation Pipeline

### 2.1 Overview

The compilation pipeline transforms a raw JSON schema into an optimized, immutable **Execution Package** (IR). This is the key architectural differentiator: most frameworks interpret at runtime; FK10 compiles ahead of time.

### 2.2 Stages

#### Stage 1: Parse → AST

```typescript
interface SchemaAST {
  readonly id: NodeId;
  readonly type: string;
  readonly props: ReadonlyMap<string, PropValue>;
  readonly regions: ReadonlyMap<string, RegionDef>;
  readonly events: ReadonlyMap<string, EventDef>;
  readonly children: readonly SchemaAST[];
  readonly sourceLocation: SourceLocation;
}

type PropValue =
  | { kind: 'literal'; value: unknown }
  | { kind: 'expression'; source: string; parsed: ExprAST }
  | { kind: 'template'; parts: readonly TemplatePart[] }
  | { kind: 'slot-param'; paramName: string; path: string }
  | { kind: 'i18n'; key: string; params?: readonly ExprAST[] };
```

The parser:
- Assigns stable NodeIds (deterministic from schema position)
- Classifies every prop value as literal/expression/template/i18n
- Extracts regions, events, actions, validations into structured forms
- Records source locations for debugging
- Validates basic structural well-formedness

#### Stage 2: Analyze → Dependency Graph

The analyzer performs whole-schema analysis:

1. **Type Inference**: Each node is typed against the component registry's schema type. Expression types are inferred from the scope model.

2. **Dependency Graph Construction**: For every expression, the analyzer determines which scope paths it reads. This produces a static dependency graph:

```typescript
interface DependencyGraph {
  nodes: ReadonlyMap<NodeId, NodeDeps>;
  edges: ReadonlyMap<DepEdgeKey, Set<NodeId>>;
}

interface NodeDeps {
  reads: ReadonlySet<string>;
  writes: ReadonlySet<string>;
  invokes: ReadonlySet<string>;
  subscribes: ReadonlySet<string>;
}
```

**Handling Dynamic Path Access**: Expressions like `${items[index].name}` where `index` is a variable produce **pattern dependencies** rather than precise paths:

```typescript
type DepPattern = 
  | { kind: 'exact'; path: string }           // "user.name"
  | { kind: 'prefix'; prefix: string }        // "items.*" (any array element)
  | { kind: 'computed'; paths: ExprRef[] };   // fully dynamic, re-evaluated each time

// Example: items[index].name → { kind: 'prefix', prefix: 'items' }
// The dependency covers all children of 'items', not just items[0].name
```

This is less precise than fully-static paths but correctly invalidates when any array element changes. The tradeoff is over-invalidation for array access (all rows invalidated when array changes), which is mitigated by row-level scope isolation (Section 11).

3. **Cycle Detection**: The analyzer detects reactive cycles at compile time and emits errors.

4. **Dead Code Elimination**: Nodes that are statically unreachable (e.g., inside `when: false`) are marked for elimination.

5. **Validation Rule Graph**: Cross-field validation dependencies are extracted and ordered.

6. **Namespace Resolution**: All `namespace:method` and `component:method` references are resolved and validated against declarations.

#### Stage 3: Optimize

The optimizer applies transformations to reduce runtime work:

1. **Literal Hoisting**: All literal values are deduplicated and shared across the IR.

2. **Expression Fusion** (limited): When the analyzer can prove two expressions are always evaluated together, they are fused into a single computation unit. **Fusion criteria** (conservative):
   - Both expressions are props of the same node (always rendered together)
   - Both expressions are arguments to the same function call
   - Both expressions are within the same ternary branch
   - NOT fused: expressions in different nodes, expressions behind different `when` guards, expressions in different event handlers

3. **Static Subtree Detection**: If an entire subtree has zero dynamic expressions, it is wrapped in a `React.memo` boundary with a stable reference. This is **amortized-cost**, not zero-cost: React still reconciles the memo boundary, but the inner render is skipped because props don't change.

4. **Selector Pre-compilation**: Zustand selectors are generated at compile time rather than created at runtime:

```typescript
function createSelect_buttonDisabled(nodeId: NodeId) {
  return (state: ScopeState) => {
    const flags = state.__meta[nodeId];
    return flags?.disabled ?? false;
  };
}
```

5. **Action Graph Flattening**: Nested action chains are flattened into a flat state machine where possible, reducing runtime allocation.

6. **Region Inlining**: Single-child regions with no dynamic parameters are inlined, removing one layer of scope indirection.

#### Stage 4: Emit → Execution Package (IR)

The final output is an **Execution Package**:

```typescript
interface ExecutionPackage {
  readonly schemaId: string;
  readonly version: string;
  readonly nodes: ReadonlyMap<NodeId, IRNode>;
  readonly dependencyGraph: DependencyGraph;
  readonly actionTable: ReadonlyMap<ActionId, ActionDef>;
  readonly validationGraph: ValidationGraphDef;
  readonly dataSourceRegistry: DataSourceRegistryDef;
  readonly surfaceStack: SurfaceStackDef;
  readonly staticSubtrees: ReadonlySet<NodeId>;     // nodes with React.memo boundaries
  readonly selectors: SelectorTable;
  readonly diagnostics: readonly Diagnostic[];
}

interface IRNode {
  readonly id: NodeId;
  readonly type: string;
  readonly props: PropResolutionTable;
  readonly meta: MetaResolutionTable;
  readonly regions: ReadonlyMap<string, RegionSlotDef>;
  readonly events: ReadonlyMap<string, ActionId>;
  readonly scopeDef: ScopeDef;
  readonly parentId: NodeId | null;
  readonly childIds: readonly NodeId[];
}
```

### 2.3 Compilation Invariants

| Invariant | Meaning |
|-----------|---------|
| All expressions are syntactically valid | Parser catches syntax errors |
| All type references resolve | Analyzer validates against component registry |
| No reactive cycles exist | Analyzer detects and rejects cycles |
| All action references resolve | Analyzer validates against action registry |
| All namespace references resolve | Analyzer validates namespace declarations |
| No orphan nodes | Every node has a valid parent or is root |

### 2.4 HMR & Hot Schema Swap

The Execution Package is immutable within a single compile, but the runtime supports **schema replacement**:

```typescript
interface RuntimeInstance {
  replaceSchema(newPkg: ExecutionPackage): void;
}

// HMR flow:
// 1. Schema file changes → recompile only changed subtrees
// 2. Diff old IR vs new IR at node level
// 3. For unchanged nodes: preserve scope state
// 4. For changed nodes: create new scope, destroy old
// 5. For removed nodes: destroy scope, abort actions
// 6. For added nodes: create scope, mount
```

This is not "hot-swapping individual IR nodes in an immutable structure"—it's creating a new Execution Package and migrating state from the old one. The runtime compares NodeIds (which are stable across compilations for unchanged schema positions) and preserves scope data for matching nodes.

---

## 3. Reactive State Model (Scope Chain with Projections)

### 3.1 Core Concept

> **Naming note**: The previous draft called this a "Scope Graph," but the resolution algorithm is a chain walk (own → projection → parent → parent → ...). We call it what it is: a **scope chain with projections**. The reactive *dependency graph* (which expressions depend on which paths) is a separate concept.

```typescript
interface ScopeNode {
  readonly id: ScopeId;
  readonly own: Map<string, unknown>;
  readonly parent: ScopeId | null;
  readonly projections: ReadonlyMap<string, ExprRef>;  // explicit imports from ancestors
  readonly isolated: boolean;                          // if true, only projections, no inheritance
  readonly owner: NodeId;
}
```

### 3.2 Scope Resolution Algorithm

```
resolve(scopeId, path):
  node = chain.nodes[scopeId]
  
  // 1. Check own data first
  if node.own.has(path):
    return node.own.get(path)
  
  // 2. If isolated, only projections are available
  if node.isolated:
    if node.projections.has(path):
      return evaluate(node.projections[path])
    return UNDEFINED
  
  // 3. Walk up the parent chain
  if node.parent != null:
    return resolve(node.parent, path)
  
  return UNDEFINED
```

### 3.3 Transaction-Based Updates

All mutations go through a **transaction**:

```typescript
interface ScopeTransaction {
  begin(): void;
  set(scopeId: ScopeId, path: string, value: unknown): void;
  batch(operations: readonly ScopeOp[]): void;
  commit(): InvalidationSet;
  rollback(): void;
}
```

Transactions batch mutations and compute the minimal invalidation set at commit time. Subscribers are only notified of actual changes (using `Object.is` for primitives and shallow comparison for objects).

### 3.4 Dependency Tracking & Propagation

FK10 uses a **push-based invalidation with lazy re-evaluation** model. This is NOT a pure pull system (where consumers poll for changes) nor a pure push system (where every change immediately propagates). It is a hybrid:

1. **Dependency Registration (compile-time)**: The compiler statically determines which DepPatterns each expression reads. This is recorded in the Execution Package.
2. **Invalidation (push, at transaction commit)**: When a transaction commits, the invalidation set is matched against registered dependencies. Affected subscribers are *marked dirty* but not immediately re-evaluated.
3. **Re-evaluation (pull, on demand)**: React triggers re-evaluation via `useSyncExternalStore`. The pre-compiled selector checks a version counter; if unchanged, returns the cached result. If changed, re-evaluates and caches.

This avoids the "glitch" problem (subscribers see consistent state because re-evaluation happens in a single React render pass) while avoiding unnecessary work (only dirty subscribers re-evaluate).

```typescript
interface ReactiveRuntime {
  // Called by expressions during evaluation to register dynamic dependencies
  trackRead(scopeId: ScopeId, path: string): void;
  // Called at transaction commit to mark dirty subscribers
  markDirty(patterns: ReadonlySet<DepPattern>): void;
  // Called by React via useSyncExternalStore
  isDirty(subscriberId: SubscriberId): boolean;
  // Called by React when subscriber needs fresh value
  evaluate(exprId: ExprRef): unknown;
  // Called by React to subscribe to dirty notifications
  subscribe(subscriberId: SubscriberId, callback: () => void): () => void;
}
```

**Subscription batching**: Multiple components sharing the same scope store subscribe through a **single Zustand listener** that batches notifications. Individual component selectors compare version counters to decide whether to re-render. A page with 200 components generates 1 Zustand subscription (not 400) — components use lightweight version counter checks instead.

```typescript
class ScopeSubscriptionManager {
  private version = 0;
  private listeners = new Set<() => void>();
  
  // Single Zustand subscription per scope
  connectToStore(store: ScopeStore): void {
    store.subscribe(() => {
      this.version++;
      // Batch: schedule a single microtask for all listeners
      queueMicrotask(() => {
        for (const listener of this.listeners) {
          listener();
        }
      });
    });
  }
  
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
  
  getVersion(): number { return this.version; }
}
```

Each component's selector includes a version check:

```typescript
function createSelectProps(nodeId: NodeId, compileVersion: number) {
  let cachedVersion = -1;
  let cachedResult: unknown = null;
  
  return (state: ScopeSnapshot, currentVersion: number) => {
    if (currentVersion === cachedVersion) return cachedResult;
    cachedVersion = currentVersion;
    cachedResult = computeProps(state, nodeId);
    return cachedResult;
  };
}
```

### 3.5 Self-Write Protection

Named data sources that write to scope paths are protected from re-triggering themselves:

```typescript
// In invalidation logic:
if (subscriber.kind === 'dataSource' && 
    subscriber.publishedPaths ∩ changedPaths ≠ ∅ &&
    currentTxn === subscriber.lastPublishTxn) {
  continue; // skip self-triggering
}
```

### 3.6 Zustand Integration

Each scope chain level is backed by a Zustand vanilla store:

```typescript
interface ScopeStore {
  getState(): ScopeSnapshot;
  subscribe(listener: () => void): () => void;
  setState(partial: Partial<ScopeSnapshot> | ((s: ScopeSnapshot) => Partial<ScopeSnapshot>)): void;
}

interface ScopeSnapshot {
  readonly data: Readonly<Record<string, unknown>>;
  readonly meta: Readonly<Record<string, NodeMeta>>;
  readonly __version: number;
}
```

React components connect via `useSyncExternalStoreWithSelector`:

```typescript
function useScopeValue<T>(scopeId: ScopeId, selector: (s: ScopeSnapshot) => T): T {
  const store = useScopeStore(scopeId);
  return useSyncExternalStoreWithSelector(
    store.subscribe,
    store.getState,
    store.getState,
    selector,
    shallowEqual
  );
}
```

---

## 4. Expression Engine

### 4.1 Architecture: AST Walker (Phase 1) → Bytecode VM (Phase 2)

**Phase 1: AST Walker with Pre-Computed Analysis**

The initial implementation uses an AST walker with compile-time pre-computation:

```typescript
interface CompiledExpression {
  readonly id: ExprId;
  readonly ast: ExprAST;
  readonly readPaths: ReadonlySet<DepPattern>;  // statically known scope reads
  readonly effectType: EffectType;
  readonly isConstant: boolean;                  // true → evaluate once, cache forever
  readonly constantValue?: unknown;              // if isConstant, the pre-computed value
}

type EffectType = 'pure' | 'read' | 'async';
// 'io' merged into 'async' — the distinction wasn't meaningful
// 'write' removed — writes only through action dispatch, not expressions
```

The AST walker:

```typescript
class ExprEvaluator {
  evaluate(expr: CompiledExpression, scope: ScopeReader): unknown {
    if (expr.isConstant) return expr.constantValue;
    return this.walkAST(expr.ast, scope);
  }
  
  private walkAST(node: ExprAST, scope: ScopeReader): unknown {
    switch (node.type) {
      case 'Literal': return node.value;
      case 'ScopeRef': return scope.get(node.path);
      case 'BinaryExpr': return this.evalBinary(node.op, 
        this.walkAST(node.left, scope), 
        this.walkAST(node.right, scope));
      case 'CallExpr': return this.callFunction(node.callee, 
        node.args.map(a => this.walkAST(a, scope)));
      case 'MemberExpr': {
        const obj = this.walkAST(node.object, scope);
        return obj?.[node.property];  // null-safe navigation
      }
      case 'ConditionalExpr': {
        return this.walkAST(node.test, scope)
          ? this.walkAST(node.consequent, scope)
          : this.walkAST(node.alternate, scope);
      }
      // ... template, array, object, unary, logical
    }
  }
}
```

**Why AST walker first**:
- ~500 lines vs. ~5,000 lines for a bytecode VM
- Preserves expression structure for error messages and debugging
- Expression evaluation is rarely the bottleneck — React rendering and DOM updates dominate
- Can be profiled and replaced with bytecode VM only if profiling shows it's needed

**Phase 2: Bytecode VM** (deferred until profiling proves it necessary):
- Stack-based VM with constant pool
- Type-specialized opcodes for hot paths
- ~2-5x faster than AST walker for complex expressions
- Added as a drop-in replacement for the evaluator, no API changes

### 4.2 Built-in Functions & Filters

```typescript
interface FunctionRegistry {
  // Math
  abs, ceil, floor, round, min, max, clamp, random;
  
  // String
  upper, lower, trim, split, join, replace, startsWith, endsWith, includes, padStart, padEnd;
  
  // Array
  map, filter, reduce, find, findIndex, some, every, includes, flat, flatMap, slice, sort, groupBy, uniq;
  
  // Object
  keys, values, entries, pick, omit, merge, get, has;
  
  // Type
  typeof, isArray, isObject, isString, isNumber, isBoolean, isNil, isEmpty;
  
  // Date
  formatDate, parseDate, now, addDays, diffDays;
  
  // i18n
  t(key, ...params);
  
  // Utility
  uuid, noop, identity;
}
```

### 4.3 Template Strings

Template strings like `` `Hello ${user.name}` `` are parsed into a `TemplateExpr` AST node with interleaved literal and expression parts. At evaluation time, parts are concatenated with `String()` coercion.

### 4.4 Security Guarantees

- No `eval`, `new Function`, or `with` at any stage
- Only registered functions/filters are callable from expressions
- Scope reads go through controlled `ScopeReader` interface
- Side effects only through the action dispatch channel (expressions are read-only)

---

## 5. Component Model

### 5.1 Renderer Registry

```typescript
interface RendererRegistry {
  register<TSchema>(def: RendererDef<TSchema>): void;
  resolve(type: string): RendererDef<unknown> | null;
  allTypes(): ReadonlySet<string>;
}

interface RendererDef<TSchema> {
  readonly type: string;
  readonly schemaType: TypeInfo;
  readonly component: React.ComponentType<RendererProps<TSchema>>;
  readonly category: 'layout' | 'widget';
  readonly regions: ReadonlyMap<string, RegionContract>;
  readonly events: ReadonlyMap<string, EventContract>;
  readonly methods: ReadonlyMap<string, MethodContract>;
  readonly namespaces: ReadonlyMap<string, NamespaceContract>;
  readonly defaultMeta: Partial<MetaDefaults>;
  readonly a11y: A11yContract;                   // accessibility requirements
}
```

### 5.2 Renderer Component Contract

```typescript
interface RendererComponentProps<TSchema = unknown> {
  readonly nodeId: NodeId;
  readonly props: ResolvedProps<TSchema>;
  readonly meta: ResolvedMeta;
  readonly regions: RegionHandles;
  readonly events: EventHandles;
  readonly helpers: RendererHelpers;
}

interface ResolvedProps<TSchema> {
  readonly [K in keyof TSchema]: unknown;
}

interface ResolvedMeta {
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly readOnly: boolean;
  readonly className: string;
  readonly style: Readonly<Record<string, string>>;
  readonly testid: string | null;
  readonly ref: React.Ref<unknown>;
  readonly ariaLabel?: string;                  // a11y: explicit label override
  readonly ariaDescribedBy?: string;            // a11y: error message association
}

interface RegionHandles {
  readonly [regionName: string]: RegionHandle;
}

interface RegionHandle {
  readonly render: (params?: RegionParams) => React.ReactNode;
  readonly isEmpty: boolean;
  readonly nodeIds: readonly NodeId[];
}

interface EventHandles {
  readonly [eventName: string]: (...args: unknown[]) => void;
}

interface RendererHelpers {
  readonly renderFragment: (schema: FragmentSchema, scopeOverride?: Partial<ScopeData>) => React.ReactNode;
  readonly evaluate: (expr: string) => unknown;
  readonly dispatch: (action: ActionDef) => ActionResult;
  readonly scopeId: ScopeId;
}
```

### 5.3 Layout vs Widget Contract

**Layout renderers** (page, container, flex, grid, panel, tabs):
- Emit **marker classes only** (e.g., `flux-page`, `flux-flex`, `flux-container`)
- Zero visual styling—no padding, gap, flex, or grid in component code
- All visual styles come from schema `className` and `style` props
- Must render child regions through `RegionHandle.render()`
- Must apply correct ARIA roles (`role="main"`, `role="region"`, etc.)

**Widget renderers** (input, select, table, code-editor, date-picker):
- Complete, self-contained UI controls with internal styling
- Built on the host's UI component library (shadcn/ui convention)
- Schema `className` is for consumer customization overrides, not primary styling
- Must implement the `A11yContract`: keyboard navigation, screen reader support, focus management
- Implement `component:<method>` actions via method contracts

### 5.4 Accessibility Contract

```typescript
interface A11yContract {
  readonly keyboardNavigable: boolean;          // can be operated via keyboard
  readonly screenReaderCompatible: boolean;     // exposes correct ARIA attributes
  readonly focusManagement: 'auto' | 'manual';  // focus trap for dialogs, etc.
  readonly highContrastCompatible: boolean;     // works in Windows High Contrast mode
  readonly reducedMotionAware: boolean;         // respects prefers-reduced-motion
}
```

Every built-in renderer provides a `defaultA11y` that satisfies WCAG 2.1 AA. Schema authors can override (e.g., `ariaLabel`) but the default is accessible.

### 5.5 React 19 Integration

```typescript
function createRenderer<TSchema>(def: RendererDef<TSchema>) {
  const Component = def.component;
  
  return function FluxRenderer({ nodeId }: { nodeId: NodeId }) {
    const irNode = useIRNode(nodeId);
    const scopeStore = useScopeStore(irNode.scopeDef.scopeId);
    
    const props = useSyncExternalStoreWithSelector(
      scopeStore.subscribe,
      scopeStore.getState,
      scopeStore.getState,
      irNode.selectors.props,
      shallowEqual
    );
    
    const meta = useSyncExternalStoreWithSelector(
      scopeStore.subscribe,
      scopeStore.getState,
      scopeStore.getState,
      irNode.selectors.meta,
      shallowEqual
    );
    
    const regions = useMemoStable(() => buildRegionHandles(irNode), [irNode.id]);
    const events = useMemoStable(() => buildEventHandles(irNode), [irNode.id]);
    const helpers = useMemoStable(() => buildHelpers(irNode), [irNode.id]);
    
    if (!meta.visible) return null;
    
    return (
      <Component
        nodeId={nodeId}
        props={props}
        meta={meta}
        regions={regions}
        events={events}
        helpers={helpers}
      />
    );
  };
}
```

Key React 19 features leveraged:
- **`useSyncExternalStore`** for Zustand store subscriptions (no tearing in concurrent mode)
- **Ref as prop** (no `forwardRef` needed)
- **Optimistic updates** for form submissions via `useOptimistic`
- **`use()` hook** for Suspense integration with data sources
- **React Compiler** compatibility (all components are memoization-friendly)

### 5.6 Error Boundaries

Every renderer is wrapped in an error boundary:

```typescript
interface RendererErrorBoundaryProps {
  readonly nodeId: NodeId;
  readonly fallback?: React.ReactNode;   // schema can specify error fallback
  readonly children: React.ReactNode;
}

class RendererErrorBoundary extends React.Component<RendererErrorBoundaryProps, { error: unknown | null }> {
  static getDerivedStateFromError(error: unknown) {
    return { error };
  }
  
  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    hostEnv.onError?.(error, { nodeId: this.props.nodeId, componentStack: info.componentStack });
  }
  
  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div role="alert" className="flux-error-boundary">
          Render error in node {this.props.nodeId}
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

## 6. Action System

### 6.1 Structured Concurrency Model

FK10 uses **structured concurrency** for action orchestration. Every action chain has a well-defined lifecycle with cancellation propagation.

```typescript
interface ActionContext {
  readonly id: ActionRunId;
  readonly signal: AbortSignal;
  readonly scope: ScopeReader;
  readonly result: unknown;
  readonly error: unknown;
  readonly prevResult: unknown;
  readonly txn: ScopeTransaction;
}

type ActionResult =
  | { status: 'success'; value: unknown }
  | { status: 'failure'; error: unknown }
  | { status: 'skipped' };
```

### 6.2 Action Definition Schema

```typescript
interface ActionDef {
  readonly id: ActionId;
  readonly type: ActionType;
  readonly args?: Record<string, unknown>;
  readonly when?: string;
  readonly then?: ActionDef;
  readonly onError?: ActionDef;
  readonly parallel?: readonly ActionDef[];
  readonly retry?: RetryPolicy;
  readonly debounce?: number;
  readonly timeout?: number;
}

interface RetryPolicy {
  readonly maxAttempts: number;
  readonly delay: number;
  readonly backoff: 'fixed' | 'exponential';
  readonly maxDelay: number;
}
```

### 6.3 Action Chain Ergonomics

Deeply nested `then` chains are hard to read. FK10 supports a flat **steps** array as syntactic sugar:

```json
{
  "onClick": {
    "steps": [
      { "action": "confirm", "message": "Are you sure?" },
      { "action": "ajax", "url": "/api/users/${id}", "method": "DELETE" },
      { "action": "toast", "message": "Deleted successfully" },
      { "action": "component:refresh", "target": "userTable" }
    ]
  }
}
```

The compiler desugars `steps` into nested `then` chains. Each step can still have `when`, `onError`, `retry`, etc.

### 6.4 Execution Engine

```typescript
class ActionOrchestrator {
  async execute(def: ActionDef, ctx: ActionContext): Promise<ActionResult> {
    if (def.when != null) {
      const guardResult = this.evaluator.evaluate(
        this.compileExpr(def.when), ctx.scope
      );
      if (!guardResult) return { status: 'skipped' };
    }
    
    if (ctx.signal.aborted) throw new ActionCancelledError();
    
    const handler = this.resolveHandler(def.type);
    
    const result = await withTimeout(
      handler(def.args ?? {}, ctx),
      def.timeout ?? Infinity,
      ctx.signal
    );
    
    if (result.status === 'success' && def.then) {
      return this.execute(def.then, { ...ctx, result: result.value, prevResult: ctx.result });
    }
    
    if (result.status === 'failure' && def.onError) {
      return this.execute(def.onError, { ...ctx, error: result.error });
    }
    
    return result;
  }
  
  async executeParallel(defs: readonly ActionDef[], ctx: ActionContext): Promise<ActionResult> {
    const results = await Promise.allSettled(
      defs.map(d => this.execute(d, ctx))
    );
    
    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      return { status: 'failure', error: failures.map(f => f.reason) };
    }
    
    return { 
      status: 'success', 
      value: results.map(r => (r as PromiseFulfilledResult<ActionResult>).value) 
    };
  }
}
```

### 6.5 Three-Layer Action Resolution

```
┌────────────────────────────────────────────┐
│  Platform Actions (built-in)               │
│  setValue, ajax, dialog, submitForm,       │
│  closeDialog, navigate, confirm, toast,    │
│  validate, resetForm, setErrors,           │
│  clearErrors, reload, download, print      │
├────────────────────────────────────────────┤
│  Component Instance Actions                │
│  component:refresh, component:getSelected, │
│  component:setValue, component:focus,      │
│  component:reset, component:validate       │
├────────────────────────────────────────────┤
│  Namespace Actions (domain controls)       │
│  designer:export, designer:import,         │
│  spreadsheet:getCellValue,                 │
│  flow:validate, report:generate            │
└────────────────────────────────────────────┘
```

**Resolution order**: Platform → Component → Namespace. First match wins.

### 6.6 Action Cancellation & Cleanup

Every action execution receives an `AbortSignal`. Cancellation propagates through the action chain:

```
User closes dialog
  → dialog's AbortController.abort()
    → all running actions in dialog receive abort signal
      → running fetch is cancelled
      → pending debounced actions are cleared
      → child actions receive propagated abort
```

---

## 7. Form System

### 7.1 Architecture

```
┌─────────────────────────────────────────┐
│  Form UI Layer (React components)       │
├─────────────────────────────────────────┤
│  Form Runtime                           │
│  ┌──────────────┐ ┌──────────────────┐  │
│  │ Field Registry│ │ Validation Engine│  │
│  └──────────────┘ └──────────────────┘  │
│  ┌──────────────┐ ┌──────────────────┐  │
│  │ Dirty Tracker│ │ Submission State │  │
│  └──────────────┘ └──────────────────┘  │
├─────────────────────────────────────────┤
│  Draft Isolation Layer                  │
├─────────────────────────────────────────┤
│  Scope Chain (shared reactive core)     │
└─────────────────────────────────────────┘
```

### 7.2 Form Runtime

```typescript
interface FormRuntime {
  readonly formId: ScopeId;
  readonly fields: ReadonlyMap<string, FieldState>;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly submitting: boolean;
  readonly submitCount: number;
  readonly errors: ReadonlyMap<string, FieldError>;
  
  validate(options?: ValidateOptions): Promise<ValidationResult>;
  validateField(path: string): Promise<FieldValidation>;
  validateSubtree(path: string): Promise<ValidationResult>;
  
  getSubmitData(): Record<string, unknown>;
  reset(): void;
  resetField(path: string): void;
  
  commitDraft(draftId: string): void;
  discardDraft(draftId: string): void;
}

interface FieldState {
  readonly path: string;
  readonly value: unknown;
  readonly dirty: boolean;
  readonly touched: boolean;
  readonly error: FieldError | null;
  readonly active: boolean;
  readonly visible: boolean;
}

interface FieldError {
  readonly path: string;
  readonly message: string;
  readonly ruleId: string;
  readonly params?: Record<string, unknown>;
}
```

### 7.3 Array Fields

Dynamic array fields are a first-class concern:

```typescript
interface ArrayFieldOperations {
  addItem(index?: number): void;              // add item at index (default: append)
  removeItem(index: number): void;            // remove item at index
  moveItem(from: number, to: number): void;   // reorder
  getItemScope(index: number): ScopeId;       // get scope for specific item
}

// Schema:
// {
//   "type": "array-field",
//   "name": "addresses",
//   "itemSchema": [
//     { "type": "input-text", "name": "street" },
//     { "type": "input-text", "name": "city" }
//   ],
//   "minItems": 1,
//   "maxItems": 5
// }
```

Array field items create isolated child scopes. Adding/removing items creates/destroys scopes with proper lifecycle management.

### 7.4 Field Dependencies

Common "when A changes, set B" patterns are supported via reactions (Section 8.4) but also have a dedicated shorthand:

```json
{
  "type": "input-select",
  "name": "country",
  "onChange": {
    "action": "setValue",
    "path": "city",
    "value": null
  }
}
```

For more complex dependencies (multi-field computed values), use a `computed` data source.

### 7.5 Validation Engine

#### Validation Rule Types

```typescript
type ValidationRule =
  | FieldRule
  | ObjectRule
  | ArrayRule
  | ConditionalRule
  | AsyncRule;

interface FieldRule {
  readonly kind: 'field';
  readonly path: string;
  readonly ruleId: string;
  readonly type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'min' | 'max' | 'email' | 'url' | 'custom';
  readonly params: Record<string, unknown>;
  readonly message: string;
  readonly severity: 'error' | 'warning';
}

interface ObjectRule {
  readonly kind: 'object';
  readonly ruleId: string;
  readonly paths: readonly string[];
  readonly validate: string;
  readonly message: string;
}

interface ArrayRule {
  readonly kind: 'array';
  readonly path: string;
  readonly ruleId: string;
  readonly type: 'minItems' | 'maxItems' | 'uniqueItems' | 'custom';
  readonly params: Record<string, unknown>;
  readonly message: string;
}

interface ConditionalRule {
  readonly kind: 'conditional';
  readonly ruleId: string;
  readonly condition: string;
  readonly wrapped: ValidationRule;
}

interface AsyncRule {
  readonly kind: 'async';
  readonly path: string;
  readonly ruleId: string;
  readonly handler: string;
  readonly debounce: number;
  readonly message: string;
}
```

#### Validation Timing

```typescript
type ValidationTrigger = 'submit' | 'change' | 'blur' | 'manual';

interface ValidateOptions {
  readonly trigger?: ValidationTrigger;
  readonly paths?: readonly string[];
  readonly subtree?: string;
}
```

#### Validation Execution

Rules are executed in dependency order with parallelism where possible:

```typescript
class ValidationEngine {
  async validate(
    rules: ReadonlyMap<string, ValidationRule>,
    scope: ScopeReader,
    options: ValidateOptions
  ): Promise<ValidationResult> {
    const applicable = this.filterRules(rules, options);
    const plan = this.buildPlan(applicable);
    const results = new Map<string, FieldValidation>();
    
    for (const batch of plan.batches) {
      const batchResults = await Promise.all(
        batch.map(rule => this.evaluateRule(rule, scope))
      );
      for (const r of batchResults) {
        results.set(r.path, r);
      }
    }
    
    return { valid: !results.some(r => !r.valid), errors: results };
  }
}
```

### 7.6 Form Submission Lifecycle

```typescript
interface FormSubmissionState {
  readonly status: 'idle' | 'validating' | 'submitting' | 'success' | 'error';
  readonly error: unknown;
  readonly submitCount: number;
  readonly lastSubmittedAt: number;
}

// Form submission flow:
// 1. Set status to 'validating'
// 2. Run validation (all rules, trigger: 'submit')
// 3. If invalid → set status to 'error', show errors, stop
// 4. Set status to 'submitting'
// 5. Prevent duplicate submission (check status !== 'submitting')
// 6. Execute onSubmit action
// 7. On success → set status to 'success', execute post-submit action
// 8. On failure → set status to 'error', show error
// 9. After timeout → reset status to 'idle'
```

### 7.7 Draft Isolation

```typescript
interface DraftScope {
  readonly draftId: string;
  readonly parentScopeId: ScopeId;
  readonly scope: ScopeNode;
  readonly form: FormRuntime;
  
  commit(): void;
  discard(): void;
}
```

---

## 8. Data Source System

### 8.1 Named Data Sources

```typescript
interface DataSourceDef {
  readonly id: DataSourceId;
  readonly name: string;
  readonly type: 'api' | 'computed' | 'static' | 'polling' | 'websocket';
  readonly deps: ReadonlySet<string>;
  
  readonly api?: ApiDef;
  readonly compute?: string;
  readonly initial?: unknown;
  readonly polling?: { interval: number; api: ApiDef };
  readonly websocket?: WebSocketDef;
  
  readonly autoLoad: boolean;
  readonly refreshOn: readonly string[];
  readonly publishedPaths: ReadonlySet<string>;
}

interface WebSocketDef {
  readonly url: string | ExprRef;
  readonly protocols?: string[];
  readonly reconnect?: { delay: number; maxAttempts: number };
  readonly messageAdapter?: string;             // expression to transform WS messages
}

interface ApiDef {
  readonly url: string | ExprRef;
  readonly method: string;
  readonly params?: Record<string, string | ExprRef>;
  readonly body?: unknown;
  readonly headers?: Record<string, string | ExprRef>;
  readonly adapter?: string;
  readonly cache?: CachePolicy;
}

interface CachePolicy {
  readonly enabled: boolean;
  readonly ttl: number;
  readonly key: string | ExprRef;
}
```

### 8.2 Data Source Lifecycle (Revised)

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│  Created  │───▶│  Loading │───▶│  Ready   │───▶│ Stale    │
│           │    │          │    │          │    │ (TTL     │
│ (mounted) │    │ (fetch)  │    │ (data)   │    │  expired)│
└──────────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
                     │               │               │
                     ▼               │               ▼
                ┌──────────┐         │         ┌──────────┐
                │  Error   │         │         │Refreshing│
                │ (retry?) │         │         │(showing  │
                └──────────┘         │         │ old data)│
                   │                 │         └──────────┘
                   │                 │               │
                   ▼                 ▼               ▼
                Any state ──unmount──▶ Disposed
```

**States**:
- **Loading**: Initial fetch. No data available yet.
- **Ready**: Data loaded successfully. Fresh.
- **Stale**: Data loaded but TTL expired. Data still visible but marked as potentially outdated.
- **Refreshing**: User triggered refresh while data is displayed. Existing data remains visible; loading indicator overlays.
- **Error**: Fetch failed. Error state published. Optional retry.

**Polling Deduplication**: Multiple components reading the same polling data source share a single polling timer. The data source is reference-counted: polling starts when the first subscriber mounts and stops when the last unmounts.

### 8.3 WebSocket Integration

```typescript
interface WebSocketDataSource {
  connect(url: string, options: WebSocketDef): void;
  disconnect(): void;
  
  // Messages are adapted and published to scope:
  // ws://realtime → adapter → scope.${name}.data
  // Connection state published to:
  // scope.${name}.connected (boolean)
  // scope.${name}.error (string | null)
}
```

WebSocket messages are treated as data source updates: the message adapter transforms each message, and the result is published to scope through the standard transaction mechanism.

### 8.4 Published State

A data source publishes to scope:

```typescript
// After successful fetch:
scope.txn.set(scopeId, `${name}.data`, result);
scope.txn.set(scopeId, `${name}.loading`, false);
scope.txn.set(scopeId, `${name}.error`, null);
scope.txn.set(scopeId, `${name}.loadedAt`, Date.now());
scope.txn.set(scopeId, `${name}.stale`, false);
```

### 8.5 Side-Effect Observers (Reactions)

```typescript
interface ReactionDef {
  readonly id: ReactionId;
  readonly observe: ReadonlySet<string>;
  readonly when?: string;
  readonly action: ActionDef;
  readonly debounce?: number;
  readonly fireOnMount?: boolean;
}
```

### 8.6 React 19 Suspense Integration

```typescript
function useDataSource(name: string): DataSourceResult {
  const scopeStore = useCurrentScopeStore();
  const loadState = useSyncExternalStoreWithSelector(
    scopeStore.subscribe,
    scopeStore.getState,
    scopeStore.getState,
    (s) => ({ loading: s.data[`${name}.loading`], data: s.data[`${name}.data`] })
  );
  
  if (loadState.loading) {
    throw dataSources.getPendingPromise(name);
  }
  
  return { data: loadState.data };
}
```

---

## 9. Surface System (Dialog/Drawer)

### 9.1 Unified Surface Model

```typescript
type SurfaceType = 'dialog' | 'drawer' | 'popover';

interface SurfaceDef {
  readonly id: SurfaceId;
  readonly type: SurfaceType;
  readonly title?: string;
  readonly width?: string;
  readonly height?: string;
  readonly schema: SchemaAST;
  readonly scopeOverride?: Record<string, unknown>;
  readonly closable: boolean;
  readonly backdrop: boolean;
}

interface SurfaceManager {
  open(def: SurfaceDef): SurfaceId;
  close(id: SurfaceId): void;
  closeAll(): void;
  isActive(id: SurfaceId): boolean;
  getActiveSurface(): SurfaceId | null;
  getStack(): readonly SurfaceInstance[];
}

interface SurfaceInstance {
  readonly id: SurfaceId;
  readonly def: SurfaceDef;
  readonly scopeId: ScopeId;
  readonly abortController: AbortController;
}
```

### 9.2 Stack Management

- Only the top surface receives keyboard events
- Closing a surface disposes its scope and aborts all running actions
- Opening a surface creates a new scope inheriting from the opener's scope
- **Focus trap**: Dialog surfaces trap focus within their boundary (WCAG requirement)
- **Escape key**: Closable surfaces close on Escape key press

### 9.3 Responsive Design Integration

Surfaces can declare responsive behavior:

```json
{
  "type": "dialog",
  "responsive": {
    "mobile": { "type": "drawer", "position": "bottom" },
    "tablet": { "type": "dialog", "width": "600px" },
    "desktop": { "type": "dialog", "width": "800px" }
  }
}
```

The surface manager queries the viewport and selects the appropriate surface type. This is a host-provided capability via `HostEnvironment.matchMedia`.

---

## 10. Host Integration Protocol

### 10.1 Host Environment Contract

```typescript
interface HostEnvironment {
  readonly locale: string;
  readonly timezone: string;
  readonly userId?: string;
  readonly permissions?: ReadonlySet<string>;
  
  readonly fetch: HttpRequester;
  readonly wsFactory?: WebSocketFactory;
  
  readonly navigate: (url: string, options?: NavOptions) => void;
  readonly goBack: () => void;
  
  readonly toast: (message: string, options?: ToastOptions) => void;
  readonly confirm: (message: string) => Promise<boolean>;
  
  readonly t: (key: string, params?: Record<string, unknown>) => string;
  
  readonly onError?: (error: unknown, context: ErrorContext) => void;
  
  registerNamespace(name: string, methods: NamespaceMethods): () => void;
  
  readonly themeVars?: Readonly<Record<string, string>>;
  
  // Responsive / viewport
  readonly matchMedia?: (query: string) => MediaQueryResult;
  
  // Version
  readonly version: string;                     // host API version for compatibility
}

interface ErrorContext {
  readonly nodeId?: NodeId;
  readonly actionType?: string;
  readonly componentStack?: string;
  readonly scopeSnapshot?: ScopeSnapshot;
}
```

### 10.2 Stability Guarantee

The runtime stores individual function references from the host environment and uses `Object.is` to detect changes. The runtime never re-creates internal state when the host object reference changes—only when individual function values change.

```typescript
// The runtime extracts stable references at mount time:
const stableRefs = {
  fetch: hostEnv.fetch,
  navigate: hostEnv.navigate,
  toast: hostEnv.toast,
  // ...
};

// On host re-render, compare individual functions:
function shouldUpdate(newHost: HostEnvironment): boolean {
  return !Object.is(stableRefs.fetch, newHost.fetch) ||
         !Object.is(stableRefs.navigate, newHost.navigate);
  // Only re-bind if actual functions changed
}
```

No Proxy, no wrapper closures. Simple reference equality.

### 10.3 Domain Control Embedding

```typescript
interface DomainControlRegistration {
  readonly namespace: string;
  readonly projectionSchema: TypeInfo;
  readonly methodSchema: TypeInfo;
  readonly init: (host: DomainControlHost) => DomainControlInstance;
}

interface DomainControlHost {
  readonly scopeReader: ScopeReader;
  readonly dispatch: ActionDispatcher;
  readonly onProjectionUpdate: (data: Record<string, unknown>) => void;
}

interface DomainControlInstance {
  readonly mount: (container: HTMLElement) => void;
  readonly unmount: () => void;
  readonly invokeMethod: (method: string, args: unknown) => unknown;
  readonly dispose: () => void;
}
```

### 10.4 Host Integration Testing

```typescript
function createMockHostEnv(overrides?: Partial<HostEnvironment>): HostEnvironment {
  return {
    locale: 'en-US',
    timezone: 'UTC',
    fetch: vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({}) }),
    navigate: vi.fn(),
    goBack: vi.fn(),
    toast: vi.fn(),
    confirm: vi.fn().mockResolvedValue(true),
    t: (key) => key,
    version: '1.0.0',
    ...overrides,
  };
}

// Usage in tests:
const hostEnv = createMockHostEnv({ locale: 'zh-CN' });
const app = createFluxApp(schema, hostEnv);
```

---

## 11. Table & Collection Rendering

### 11.1 Row-Level Optimization

```typescript
interface TableRowScope extends ScopeNode {
  readonly isolated: true;                    // always isolated
  readonly projections: ReadonlyMap<string, ExprRef>;
  readonly own: {
    readonly record: unknown;
    readonly index: number;
    readonly isFirst: boolean;
    readonly isLast: boolean;
    readonly $slot: {
      readonly item: unknown;
      readonly index: number;
    };
  };
}
```

### 11.2 Virtual Scrolling Integration

Table rendering uses virtual scrolling with row-level scope isolation. Modifying a value in row 5 does not cause other rows to re-render.

### 11.3 Column Projection

When a table row needs data from outside the row scope, it must declare projections:

```json
{
  "type": "table",
  "name": "items",
  "projections": {
    "currency": "${config.currency}",
    "editable": "${permissions.canEdit}"
  },
  "columns": [
    { "type": "text", "name": "name" },
    { "type": "number", "name": "price", "format": "${currency}${value}" }
  ]
}
```

Projections are evaluated once per table render (not per row) and passed into each row's isolated scope.

---

## 12. Loop & Recursive Structures

### 12.1 Loop

```json
{
  "type": "loop",
  "name": "items",
  "itemVar": "item",
  "indexVar": "index",
  "body": [
    {
      "type": "card",
      "title": "${item.title}",
      "body": [{ "type": "text", "value": "${item.description}" }]
    }
  ]
}
```

The loop body is compiled **once**; each iteration creates an isolated scope with `item` and `index`.

### 12.2 Recursive Rendering

Self-referencing nodes compile to recursive React components with depth limiting:

```typescript
const MAX_RECURSION_DEPTH = 100;
```

---

## 13. Performance Architecture

### 13.1 Amortized-Cost Static Parts

The compiler classifies every subtree as **static** or **dynamic**:

- **Static subtree**: No expressions, no events, no data sources. Wrapped in `React.memo` with a stable reference. Cost is paid once (first render); subsequent renders skip the inner tree.
- **Dynamic subtree**: Contains at least one expression, event, or data source.

### 13.2 Structural Sharing

Scope updates use structural sharing to minimize reference changes:

```typescript
function applyPatch(
  current: Readonly<Record<string, unknown>>,
  patches: ReadonlyArray<[string, unknown]>
): Readonly<Record<string, unknown>> {
  let next = current;
  let changed = false;
  
  for (const [path, value] of patches) {
    const existing = get(current, path);
    if (Object.is(existing, value)) continue;
    if (!changed) next = { ...current };
    set(next, path, value);
    changed = true;
  }
  
  return next;
}
```

### 13.3 Compilation Caching

```typescript
const compilationCache = new WeakMap<object, ExecutionPackage>();

function compile(schema: unknown): ExecutionPackage {
  const existing = compilationCache.get(schema);
  if (existing) return existing;
  const pkg = pipeline.execute(schema);
  compilationCache.set(schema, pkg);
  return pkg;
}
```

### 13.4 Realistic Performance Targets

| Operation | Target | Strategy |
|-----------|--------|----------|
| Schema compilation (100 nodes) | < 10ms | Multi-stage pipeline, caching |
| Schema compilation (500 nodes) | < 50ms | Incremental compilation for HMR |
| Expression evaluation (simple) | < 0.05ms | Pre-computed read paths, AST memoization |
| Scope path read | < 0.01ms | Direct property access |
| Scope mutation (single) | < 0.05ms | Transaction batching |
| React render (single dynamic node) | < 0.5ms | Pre-compiled selectors, React.memo |
| Table render (100 rows, 10 cols) | < 16ms (frame budget) | Row isolation + virtual scroll |
| Form validation (50 fields) | < 10ms | Dependency-ordered batching |

*These are targets, not guarantees. Actual performance depends on browser, device, expression complexity, and React workload. They should be monitored via benchmarks, not enforced at runtime.*

---

## 14. Developer Experience & Debugging

### 14.1 Time-Travel Inspector

```typescript
interface StateHistoryEntry {
  readonly txnId: number;
  readonly timestamp: number;
  readonly scopeId: ScopeId;
  readonly patches: ReadonlyArray<[string, unknown, unknown]>;
  readonly trigger: string;
  readonly sourceLocation: SourceLocation;
}

interface TimeTravelInspector {
  readonly history: readonly StateHistoryEntry[];
  readonly currentIndex: number;
  
  jumpTo(index: number): ScopeSnapshot;
  diff(fromIndex: number, toIndex: number): StateDiff;
  filter(predicate: (entry: StateHistoryEntry) => boolean): readonly StateHistoryEntry[];
}
```

### 14.2 Schema-Source Mapping

Every runtime node carries a source location:

```typescript
interface SourceLocation {
  readonly schemaPath: string;     // JSON pointer
  readonly line?: number;
  readonly column?: number;
}
```

DOM attribute: `<div data-flux-node="page.body[3].form.fields[2]" data-flux-id="node_42">`

### 14.3 Diagnostic System

```typescript
interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly code: string;
  readonly message: string;
  readonly location: SourceLocation;
  readonly suggestion?: string;
}
```

### 14.4 Observable by Default

All state transitions emit events that external monitoring can consume:

```typescript
interface FluxTelemetry {
  onStateChange: Event<StateChangedEvent>;
  onActionStart: Event<ActionStartEvent>;
  onActionEnd: Event<ActionEndEvent>;
  onExpressionEval: Event<ExpressionEvalEvent>;
  onRender: Event<RenderEvent>;
  onError: Event<ErrorEvent>;
}

// Integration with error tracking:
// hostEnv.onError → Sentry/DataDog
// fluxTelemetry.onExpressionEval → performance monitoring
```

### 14.5 Hot Module Replacement

When a schema changes during development:
1. Recompile changed subtrees only
2. Diff old IR vs new IR at node level
3. Preserve scope state for unchanged nodes
4. Create/destroy scopes for changed/removed nodes

---

## 15. i18n System

### 15.1 Compile-Time Resolution

i18n keys are resolved at **compile time**:

```typescript
// Schema:
{ "type": "button", "label": { "$i18n": "flux.submit" } }

// Compiler output (zh-CN):
{ "type": "button", "label": "提交" }

// Compiler output (en-US):
{ "type": "button", "label": "Submit" }
```

If the locale changes at runtime, the schema is re-compiled with the new locale.

---

## 16. Error Recovery & Resilience

### 16.1 Error Boundaries at Every Level

- **Renderer-level**: Each renderer is wrapped in an error boundary (Section 5.6). A crashing component doesn't take down the page.
- **Action-level**: Every action chain has `onError` handling. Unhandled errors propagate to the host's `onError`.
- **Data source-level**: Failed fetches enter the Error state with retry. The UI shows stale data with an error indicator.
- **Validation-level**: Async validation errors are caught and displayed as field errors.

### 16.2 Corrupted Data Handling

```typescript
// Data source adapter validates response shape:
interface ApiDef {
  readonly adapter?: string;           // expression to transform response
  readonly validate?: string;          // expression to validate response shape
}

// If validate returns false:
// 1. Error state is set with descriptive message
// 2. Previous data is preserved (if any)
// 3. Host is notified via onError
```

### 16.3 Scope Consistency

If the scope chain enters an inconsistent state (e.g., a transaction commit throws), the scope is reset to its last known good state:

```typescript
try {
  txn.commit();
} catch (e) {
  txn.rollback();
  hostEnv.onError?.(e, { scopeId: txn.scopeId });
}
```

---

## 17. Type System

### 17.1 End-to-End Type Narrowing

```typescript
interface ButtonSchema {
  readonly label: string;
  readonly variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  readonly size?: 'sm' | 'md' | 'lg';
  readonly disabled?: boolean | Expression<boolean>;
  readonly onClick?: ActionDef;
}

function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  // props.props.variant is typed as 'primary' | 'secondary' | 'ghost' | 'danger'
  // props.meta.disabled is typed as boolean
  // props.events.onClick is typed as () => void
}
```

### 17.2 Schema Type Inference

Using TypeScript 6's `satisfies`:

```typescript
const mySchema = {
  type: 'page',
  body: [
    {
      type: 'form',
      fields: [
        { type: 'input-text', name: 'username', label: 'Username', required: true },
        { type: 'input-password', name: 'password', label: 'Password', required: true }
      ]
    }
  ]
} satisfies SchemaDefinition;
```

### 17.3 Dynamic Schema Limitation

Type narrowing works for **statically known** schemas (TypeScript-authored). For dynamically loaded JSON schemas (user-authored at runtime), the compiler performs runtime type validation at parse time and emits diagnostics. TypeScript types are not available for dynamic schemas.

---

## 18. SSR & Streaming

### 18.1 Strategy

FK10 supports server-side rendering with a **two-pass approach**:

**Pass 1 (Server)**:
1. Compile schema → Execution Package
2. Create scope chain with initial data
3. Resolve all `autoLoad: true` data sources on the server
4. Render to HTML stream using React 19's `renderToReadableStream`
5. Serialize scope state and data source results as hydration data

**Pass 2 (Client)**:
1. Receive HTML + hydration data
2. Compile schema → Execution Package (same schema, same IR)
3. Create scope chain from hydration data (skip data source fetching)
4. `hydrateRoot` with the pre-populated scope

```typescript
// Server
async function renderSchemaToString(schema: unknown, hostEnv: HostEnvironment, initialData: Record<string, unknown>) {
  const pkg = compile(schema);
  const scopeChain = createScopeChain(pkg, hostEnv, initialData);
  await scopeChain.resolveAutoLoadDataSources();
  
  const html = await renderToReadableStream(
    <FluxRoot package={pkg} scopeChain={scopeChain} />
  );
  
  const hydrationData = scopeChain.serialize();
  
  return { html, hydrationData };
}

// Client
function hydrateSchema(container: HTMLElement, schema: unknown, hostEnv: HostEnvironment, hydrationData: unknown) {
  const pkg = compile(schema);
  const scopeChain = createScopeChainFromHydration(pkg, hostEnv, hydrationData);
  
  hydrateRoot(container, <FluxRoot package={pkg} scopeChain={scopeChain} />);
}
```

### 18.2 Limitations

- **Data source resolution on server**: Only `autoLoad: true` data sources are resolved server-side. Lazy-loaded data sources wait for client hydration.
- **WebSocket data sources**: Not available on server. Gracefully degrade to loading state.
- **Actions**: Not executed on server. Action-related props (onClick handlers) are bound during client hydration.
- **Static subtree optimization**: Static subtrees render to plain HTML on server and skip hydration on client.

---

## 20. Table-Stakes Features (Required for v1.0)

### 20.1 Undo/Redo

The scope transaction system naturally supports undo/redo. Every transaction records its inverse operations:

```typescript
interface UndoableTransaction extends ScopeTransaction {
  readonly inverseOps: ReadonlyArray<ScopeOp>;  // operations to reverse this txn
}

interface UndoRedoManager {
  push(txn: UndoableTransaction): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  clear(): void;
}

// Each scope has its own undo stack, scoped to the nearest form boundary.
// Page-level scope changes are not undoable by default.
// Form-level scope changes are undoable for the last N transactions (configurable).
```

### 20.2 Keyboard Shortcuts

```typescript
interface ShortcutRegistry {
  register(keybinding: string, action: ActionDef, options?: ShortcutOptions): () => void;
  unregister(keybinding: string): void;
  pause(): void;    // e.g., when a code editor has focus
  resume(): void;
}

interface ShortcutOptions {
  readonly scope?: 'global' | 'surface' | 'form';   // where the shortcut is active
  readonly when?: string;                              // guard expression
  readonly preventDefault?: boolean;
}

// Schema:
// {
//   "type": "page",
//   "shortcuts": {
//     "Ctrl+S": { "action": "submitForm" },
//     "Ctrl+Z": { "action": "undo" },
//     "Escape": { "action": "closeDialog", "when": "${surfaceActive}" }
//   }
// }
```

### 20.3 Permission-Driven Rendering

Schema authors declare visibility/bindings based on permissions:

```json
{
  "type": "button",
  "label": "Delete User",
  "permission": "user:delete",
  "onClick": { "action": "confirm", "message": "Delete?" }
}
```

The compiler checks `HostEnvironment.permissions` and can prune unauthorized nodes at compile time (for static permission sets) or emit a `visible` expression (for dynamic permissions):

```typescript
// If permissions are static (compile-time known):
// - Compiler removes the node entirely → zero runtime cost

// If permissions are dynamic (runtime only):
// - Compiler wraps visible: ${permissions.has('user:delete')}
// - Runtime checks on each render
```

### 20.4 Offline Persistence

Data sources can declare offline behavior:

```typescript
interface DataSourceDef {
  // ... existing fields ...
  readonly offline?: OfflinePolicy;
}

interface OfflinePolicy {
  readonly persistTo: 'indexeddb' | 'localstorage' | 'memory';
  readonly staleWhileRevalidate: boolean;   // show cached data while fetching
  readonly maxAge: number;                   // ms before cached data is discarded
}
```

The data source manager checks network status (via `navigator.onLine` + host-provided signal) and falls back to cached data when offline. Mutations are queued and replayed when connectivity returns.

### 20.5 Theme Protocol

The framework does NOT include a theme system. Instead, it defines a **theme variable contract** that host applications must provide:

```typescript
interface ThemeContract {
  // Required CSS custom properties (host must define these):
  '--flux-color-primary': string;
  '--flux-color-danger': string;
  '--flux-color-success': string;
  '--flux-color-warning': string;
  '--flux-color-text': string;
  '--flux-color-text-secondary': string;
  '--flux-color-bg': string;
  '--flux-color-bg-secondary': string;
  '--flux-color-border': string;
  '--flux-radius-sm': string;
  '--flux-radius-md': string;
  '--flux-radius-lg': string;
  '--flux-spacing-unit': string;
  '--flux-font-family': string;
  '--flux-font-size-sm': string;
  '--flux-font-size-md': string;
  '--flux-font-size-lg': string;
  '--flux-transition-duration': string;
}
```

Built-in renderers consume these CSS variables. Dark mode is handled by the host changing the CSS variables (e.g., via `prefers-color-scheme` media query). Renderers respect `prefers-reduced-motion` for animations.

### 20.6 Schema Migration

When a schema version changes, previously saved form state may be incompatible:

```typescript
interface SchemaVersion {
  readonly version: number;
  readonly migrate?: (oldData: Record<string, unknown>) => Record<string, unknown>;
}

// Schema:
// {
//   "type": "form",
//   "version": 3,
//   "migrations": {
//     "1→2": { "renameFields": { "name": "fullName" } },
//     "2→3": { "addFields": { "phone": "" }, "removeFields": ["fax"] }
//   }
// }
```

The runtime checks the version tag on saved data and applies migrations in sequence before loading.

### 20.7 Print / PDF Export

```typescript
// Platform action: print
// { "action": "print", "target": "formId" }

// Renders the target subtree into a print-friendly layout:
// 1. Create a hidden iframe
// 2. Render the subtree with print-appropriate styles
// 3. Trigger window.print() on the iframe
// 4. Clean up

// For PDF: host provides a PDF export function via HostEnvironment
// { "action": "exportPdf", "target": "reportId" }
```

---

## 21. Honest Industry Comparison

### 19.1 Schema Extension (Primary Mechanism)

```json
// base-form.json
{
  "type": "form",
  "fields": [
    { "type": "input-text", "name": "name", "required": true },
    { "type": "input-text", "name": "email", "required": true }
  ]
}

// extended-form.json
{
  "$extends": "./base-form.json",
  "fields": [
    { "$inherit": true },
    { "type": "input-text", "name": "phone" },
    { "type": "select", "name": "role", "options": "${roles}" }
  ]
}
```

### 19.2 Algebraic Operations (Phase 2)

`merge`, `extend`, `filter`, `project` are deferred to Phase 2. The `$extends`/`$inherit` mechanism handles 95% of real-world composition needs.

---

## 20. Honest Industry Comparison

### What FK10 Genuinely Does Better

| Feature | FK10 Advantage | Magnitude |
|---------|---------------|-----------|
| Compile-time dependency analysis | Catches cycles, missing refs, dead code before render | Significant |
| Pre-compiled selectors with single-store subscription | Zero runtime closure allocation, O(1) notification per scope | Moderate |
| Structured concurrency for actions | Clean cancellation propagation | Significant |
| Scope chain with projections | Explicit row isolation without parent leak | Significant |
| Time-travel inspector with source mapping | Debug from DOM to schema location | Significant |
| Core bundle size | ~73KB (core + minimal renderers) vs AMIS ~200KB (full), Formily ~150KB (full) | Moderate (FK10 needs many more renderers to match) |

### Where FK10 Is Equivalent

| Feature | FK10 | Competitor Match |
|---------|------|-----------------|
| Expression engine | AST walker (Phase 1) | AMIS, Formily have equivalent parsers |
| Validation engine | Dependency-ordered batching | Formily 2.x is equally capable |
| Fine-grained reactivity | Zustand + selectors + dependency graph | Formily's `@formily/reactive` achieves similar without compilation |
| Type safety | TypeScript narrowing for static schemas | Formily 2.x has similar TypeScript support |
| SSR | React 19 RSC | Available to any React framework |

### Where FK10 Is Weaker

| Feature | FK10 Gap | Competitor Advantage |
|---------|----------|---------------------|
| Ecosystem & renderers | 0 built-in renderers | AMIS: 200+, Formily: Ant Design integration |
| Community & adoption | 0 users | AMIS: 15K+ stars, Formily: 10K+ stars |
| Proxy-based reactivity | Requires compilation step | Formily: works without compilation |
| Visual editor integration | Not addressed | AMIS: integrated editor |
| Backend integration | Host must provide everything | Lowdefy: built-in MongoDB, Appsmith: built-in DB connectors |

### Where FK10 Should Innovate but Doesn't Yet

1. **AI-native schema authoring**: No mention of AI-assisted schema generation or validation
2. **Cross-platform compilation**: Only targets React web (not React Native, terminal, PDF)
3. **Schema-level testing**: No testing primitives for schemas
4. **IDE integration**: No VSCode extension for schema autocomplete/validation
5. **Schema versioning & migration**: No support for schema evolution

---

## 21. What's Still Missing for "Next-Generation" (Post-v1.0)

### 21.1 AI-Native Schema Authoring

- Accept natural language → generate schema
- Schema-to-natural-language roundtripping
- AI-powered error recovery and suggestion
- Auto-generate validation rules from data patterns

### 21.2 Schema-Level Testing

```typescript
// Hypothetical API:
describe('UserForm schema', () => {
  it('validates before submit', () => {
    const result = testSchema(userFormSchema, { data: { name: '' } });
    expect(result.validationErrors).toContain('name is required');
  });
  
  it('handles random data gracefully', async () => {
    await fuzzSchema(userFormSchema, { iterations: 1000 });
  });
});
```

### 21.3 Cross-Platform Compilation

The compilation pipeline is designed for multi-target emit, but currently only targets React web. Future targets: React Native, Terminal UI (Ink), PDF, Email HTML.

### 21.4 Incremental Adoptability

Currently all-or-nothing: you provide a schema, FK10 renders it. Future:
- Use FK10 components in an existing React app without a schema
- Gradual migration from hand-written React to schema-driven
- Schema extraction tool (reverse-engineer from React components)

### 21.5 Real-Time Collaboration

No support for OT, CRDT, or presence indicators. WebSocket is for data only. Collaborative editing is a research-level problem requiring its own design phase.

### 21.6 Diagnostic Message Quality

The `Diagnostic` type exists but no examples of actual messages are provided. For low-code authors (who may not be developers), clear error messages with suggestions are critical. This needs UX-driven design.

### 21.7 Semantic Schema Validation

The parser validates structure; the dependency graph catches missing references. But no semantic validation for:
- `setValue` targeting a non-existent scope path
- `component:refresh` targeting a non-table component
- Conflicting validation rules on the same field
- Data sources with circular `refreshOn` dependencies

These should produce warnings at compile time.

---

## 23. Realistic Roadmap

> **Estimation basis**: 3 senior engineers, full-time. Estimates include design, implementation, testing, and documentation. Phase durations reflect actual calendar time accounting for design iteration and interdependencies.

### Phase 1: Core (Weeks 1-12)

- Compilation pipeline (parse, analyze, optimize, emit): 4 weeks
- AST-based expression evaluator: 1 week
- Scope chain with transactions, dependency tracking, and subscription batching: 4 weeks
  - **Risk**: The reactive model requires design iteration. Budget 1 extra week for push/pull settling.
- React rendering bridge + 10 renderers (page, container, flex, form, input-text, input-select, button, text, table, card): 3 weeks

**Milestone**: Render a static page with a basic form from a JSON schema.

### Phase 2: Runtime (Weeks 13-30)

- Action orchestrator with structured concurrency: 3 weeks
- Form runtime & validation engine (including array fields, draft isolation, undo/redo): 6 weeks
- Data source lifecycle (API, computed, polling, WebSocket, offline): 4 weeks
- Surface manager (dialog, drawer, responsive): 2 weeks
- Error boundaries, resilience, theme protocol: 2 weeks
- Host integration protocol + testing utilities: 1 week
- Permission-driven rendering: 1 week
- Keyboard shortcuts: 1 week
- Schema migration: 1 week
- 10 additional renderers (grid, tabs, badge, code-editor, date-picker, checkbox, radio, switch, textarea, separator): 3 weeks

**Milestone**: Full CRUD page with data sources, validation, actions, and surfaces.

### Phase 3: DX & Polish (Weeks 31-44)

- Time-travel inspector: 2 weeks
- DevTools browser extension: 5 weeks
- HMR with state migration: 3 weeks
- Schema composition ($extends, $inherit): 2 weeks
- Print/PDF export: 1 week
- 15 additional renderers (complex widgets): 3 weeks
- Accessibility audit and fixes: 2 weeks
- Performance profiling and optimization: 2 weeks

**Milestone**: Developer-ready framework with debugging tools and 35+ renderers.

### Phase 4: Scale (Weeks 45-56)

- SSR with streaming: 4 weeks
- Progressive hydration: 2 weeks
- Bytecode VM for expression engine (only if profiling demands it): 4 weeks
- VSCode extension for schema autocomplete/validation: 4 weeks
- Cross-platform compilation investigation (React Native): 4 weeks

**Milestone**: Production-ready framework with SSR and IDE integration.

### What's NOT in this Roadmap

These items are acknowledged as important but deferred to post-v1.0:
- AI-native schema authoring
- Schema-level testing framework
- Real-time collaboration (CRDT/OT)
- Full cross-platform compilation
- Visual schema editor

---

## Appendix A: Realistic Schema Example

A complete CRUD page:

```json
{
  "type": "page",
  "title": { "$i18n": "flux.userManagement" },
  "dataSources": {
    "users": {
      "type": "api",
      "api": { "url": "/api/users", "method": "GET" },
      "autoLoad": true
    },
    "statuses": {
      "type": "static",
      "initial": [
        { "label": "Active", "value": "active" },
        { "label": "Inactive", "value": "inactive" }
      ]
    }
  },
  "body": [
    {
      "type": "form",
      "name": "searchForm",
      "layout": "inline",
      "body": [
        { "type": "input-text", "name": "keyword", "placeholder": "Search users..." },
        {
          "type": "select",
          "name": "status",
          "placeholder": "Status",
          "options": "${statuses}"
        }
      ],
      "actions": [
        {
          "type": "button",
          "label": "Search",
          "variant": "primary",
          "onClick": {
            "steps": [
              { "action": "component:refresh", "target": "userTable" }
            ]
          }
        },
        {
          "type": "button",
          "label": "Reset",
          "onClick": { "action": "resetForm" }
        }
      ]
    },
    {
      "type": "table",
      "id": "userTable",
      "dataSource": "users",
      "projections": {
        "canEdit": "${permissions.canEditUser}",
        "canDelete": "${permissions.canDeleteUser}"
      },
      "columns": [
        { "type": "text", "name": "name", "label": "Name" },
        { "type": "text", "name": "email", "label": "Email" },
        { "type": "badge", "name": "status", "label": "Status", "colorMap": { "active": "green", "inactive": "red" } },
        {
          "type": "operation",
          "label": "Actions",
          "buttons": [
            {
              "type": "button",
              "label": "Edit",
              "variant": "ghost",
              "visible": "${canEdit}",
              "onClick": {
                "action": "dialog",
                "title": "Edit User",
                "schema": { "$ref": "./edit-user-dialog.json" },
                "data": { "user": "${record}" }
              }
            },
            {
              "type": "button",
              "label": "Delete",
              "variant": "ghost",
              "danger": true,
              "visible": "${canDelete}",
              "onClick": {
                "steps": [
                  { "action": "confirm", "message": "Delete this user?" },
                  { "action": "ajax", "url": "/api/users/${record.id}", "method": "DELETE" },
                  { "action": "toast", "message": "User deleted" },
                  { "action": "component:refresh", "target": "userTable" }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}
```

---

## Appendix B: Glossary

| Term | Definition |
|------|-----------|
| **Execution Package (IR)** | Compiled, immutable representation of a schema |
| **Scope Chain** | Hierarchical data environments with inheritance and projections |
| **Projection** | Explicit data channel from an ancestor scope to an isolated child scope |
| **Region** | Named child area of a component |
| **Surface** | Dialog, drawer, or popover managed by the surface stack |
| **Draft** | Isolated sub-scope with independent validation/dirty state |
| **Static subtree** | Subtree with zero dynamic content, wrapped in React.memo |
| **DepPattern** | Dependency pattern: exact path, prefix glob, or computed expression |

## Appendix C: Key API Surfaces

```typescript
// Bootstrap
function createFluxApp(schema: unknown, hostEnv: HostEnvironment): FluxApp;

// Render
function FluxRoot(props: { package: ExecutionPackage; scopeChain: ScopeChain }): React.ReactNode;

// Hooks
function useScopeValue<T>(scopeId: ScopeId, selector: (s: ScopeSnapshot) => T): T;
function useIRNode(nodeId: NodeId): IRNode;
function useDataSource(name: string): DataSourceResult;
function useCurrentForm(): FormRuntime;
function useActionDispatcher(): ActionDispatcher;

// Compilation
function compile(schema: unknown, options?: CompileOptions): ExecutionPackage;
function compileFragment(schema: unknown): ExecutionPackage;

// Testing
function createTestScope(data: Record<string, unknown>): ScopeNode;
function evaluateExpr(expr: string, scope: ScopeReader): unknown;
function createMockHostEnv(overrides?: Partial<HostEnvironment>): HostEnvironment;
```
