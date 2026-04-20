# Algebraic Low-Code Runtime Kernel Design

> **Document Type**: Experimental architecture design based purely on requirements analysis
>
> **Design Philosophy**: Algebraic abstractions + Effect-based purity + Incremental computation
>
> **Date**: 2026-04-20

---

## 1. Design Principles

### 1.1 Core Philosophy

This design is guided by three fundamental principles:

1. **Algebraic Foundations**: All core abstractions are defined as algebraic data types with compositional semantics. Operations form algebras with well-defined laws.

2. **Effect Purity**: Pure computation is separated from effects. The core is a pure interpreter; all side effects are reified as first-class effect descriptions.

3. **Incremental Computation**: All reactive updates use adaptive/incremental computation. The system maintains a dependency graph and performs minimal recomputation.

### 1.2 Key Innovations

| Innovation | Description |
|-----------|-------------|
| **Path Algebra** | Paths are not strings but algebraic terms with union, intersection, and wildcard operations |
| **Effect Calculus** | Side effects are typed, composable effect descriptions interpreted at the boundary |
| **Staged Compilation** | Three-stage: Parse → Optimize → Codegen to specialized evaluators |
| **Lens-based Updates** | All data access and mutation through composable lenses |
| **Signal Graph** | Fine-grained reactive primitives with automatic batching and glitch-free propagation |

---

## 2. Type System Foundation

### 2.1 Core Value Types

```typescript
// All runtime values form a closed algebraic type
type Value =
  | { tag: 'null' }
  | { tag: 'boolean'; value: boolean }
  | { tag: 'number'; value: number }
  | { tag: 'string'; value: string }
  | { tag: 'array'; items: Value[] }
  | { tag: 'object'; fields: Map<string, Value> }
  | { tag: 'function'; arity: number; body: Expr }
  | { tag: 'effect'; effect: Effect }
  | { tag: 'signal'; id: SignalId };

// Type-level representation for static analysis
type ValueType =
  | { tag: 'any' }
  | { tag: 'never' }
  | { tag: 'literal'; value: Value }
  | { tag: 'union'; members: ValueType[] }
  | { tag: 'array'; element: ValueType }
  | { tag: 'object'; fields: Map<string, ValueType>; open: boolean }
  | { tag: 'function'; params: ValueType[]; returns: ValueType };
```

### 2.2 Path Algebra

Paths are the fundamental addressing mechanism. Unlike string-based paths, our Path type forms an algebra:

```typescript
// Path as an algebraic term
type Path =
  | { tag: 'root' }
  | { tag: 'field'; parent: Path; key: string }
  | { tag: 'index'; parent: Path; index: number }
  | { tag: 'wildcard'; parent: Path } // matches any single segment
  | { tag: 'recursive'; parent: Path } // matches any depth
  | { tag: 'union'; paths: Path[] }
  | { tag: 'filter'; parent: Path; predicate: Expr };

// Path operations form a semilattice
interface PathAlgebra {
  // Concatenation: a.b
  concat(a: Path, b: Path): Path;
  
  // Union: a | b (matches either)
  union(a: Path, b: Path): Path;
  
  // Intersection: a & b (matches both)
  intersect(a: Path, b: Path): Path;
  
  // Subsumption check: does pattern `a` match all paths matched by `b`?
  subsumes(a: Path, b: Path): boolean;
  
  // Overlap check: can `a` and `b` match the same concrete path?
  overlaps(a: Path, b: Path): boolean;
}
```

**Why Path Algebra?**
- Enables precise invalidation: when `user.profile.name` changes, only subscribers to paths that `overlap` with it are notified
- Supports pattern-based subscriptions: subscribe to `users.*.name` to react to any user's name change
- Enables compile-time optimization: paths can be simplified and deduplicated algebraically

### 2.3 Expression AST

```typescript
// Compiled expression representation
type Expr =
  // Literals
  | { tag: 'literal'; value: Value }
  
  // Variable access (resolved to lexical index at compile time)
  | { tag: 'var'; name: string; depth: number; index: number }
  
  // Path resolution against current scope
  | { tag: 'resolve'; path: Path }
  
  // Operators
  | { tag: 'unary'; op: UnaryOp; operand: Expr }
  | { tag: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  
  // Conditionals
  | { tag: 'if'; condition: Expr; then: Expr; else: Expr }
  
  // Function application
  | { tag: 'apply'; fn: Expr; args: Expr[] }
  
  // Pipeline: value |> fn
  | { tag: 'pipe'; value: Expr; transforms: Expr[] }
  
  // Object/array construction
  | { tag: 'object'; fields: [string, Expr][] }
  | { tag: 'array'; items: Expr[] }
  
  // Spread: ...expr
  | { tag: 'spread'; expr: Expr }
  
  // Template string interpolation
  | { tag: 'template'; parts: (string | Expr)[] };

type UnaryOp = 'not' | 'neg' | 'typeof';
type BinaryOp = 
  | 'add' | 'sub' | 'mul' | 'div' | 'mod'
  | 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge'
  | 'and' | 'or'
  | 'nullish'; // ??
```

---

## 3. Effect System

### 3.1 Effect Algebra

All side effects are described as first-class values. This enables:
- Testing without mocks
- Composition and transformation of effect sequences
- Clear separation of "what" from "how"

```typescript
// Effect is a description of a side effect, not its execution
type Effect =
  // State effects
  | { tag: 'read'; path: Path }
  | { tag: 'write'; path: Path; value: Value }
  | { tag: 'modify'; path: Path; fn: (old: Value) => Value }
  
  // Action effects
  | { tag: 'dispatch'; action: string; payload: Value }
  | { tag: 'call'; target: CallTarget; method: string; args: Value[] }
  
  // Async effects
  | { tag: 'fetch'; request: HttpRequest }
  | { tag: 'delay'; ms: number }
  | { tag: 'race'; effects: Effect[] }
  | { tag: 'all'; effects: Effect[] }
  
  // UI effects
  | { tag: 'notify'; level: NotifyLevel; message: string }
  | { tag: 'navigate'; target: NavigationTarget }
  | { tag: 'surface.open'; surface: SurfaceSpec }
  | { tag: 'surface.close'; id: SurfaceId; result?: Value }
  
  // Control flow effects
  | { tag: 'pure'; value: Value }
  | { tag: 'fail'; error: ErrorInfo }
  | { tag: 'sequence'; effects: Effect[] }
  | { tag: 'branch'; condition: Expr; then: Effect; else: Effect }
  | { tag: 'catch'; effect: Effect; handler: (error: ErrorInfo) => Effect }
  | { tag: 'retry'; effect: Effect; policy: RetryPolicy }
  | { tag: 'debounce'; effect: Effect; ms: number; key: string };

type CallTarget =
  | { tag: 'component'; id: ComponentId }
  | { tag: 'namespace'; namespace: string };

// Effect interpreter interface - implemented by host
interface EffectInterpreter {
  interpret<T>(effect: Effect, context: InterpretContext): Promise<EffectResult>;
}

type EffectResult =
  | { tag: 'success'; value: Value }
  | { tag: 'failure'; error: ErrorInfo }
  | { tag: 'skipped'; reason: string };
```

### 3.2 Effect Combinators

```typescript
// Pure functional combinators for effect composition
const Effect = {
  // Monadic operations
  pure: (value: Value): Effect => ({ tag: 'pure', value }),
  
  map: (effect: Effect, fn: (v: Value) => Value): Effect => 
    Effect.flatMap(effect, v => Effect.pure(fn(v))),
  
  flatMap: (effect: Effect, fn: (v: Value) => Effect): Effect =>
    ({ tag: 'sequence', effects: [effect, { tag: 'continuation', fn }] }),
  
  // Parallel composition
  all: (effects: Effect[]): Effect => ({ tag: 'all', effects }),
  race: (effects: Effect[]): Effect => ({ tag: 'race', effects }),
  
  // Error handling
  catch: (effect: Effect, handler: (e: ErrorInfo) => Effect): Effect =>
    ({ tag: 'catch', effect, handler }),
  
  // Conditional
  when: (condition: Expr, effect: Effect): Effect =>
    ({ tag: 'branch', condition, then: effect, else: Effect.pure(null) }),
  
  // Sequential composition
  sequence: (...effects: Effect[]): Effect =>
    ({ tag: 'sequence', effects }),
};
```

---

## 4. Incremental Computation Engine

### 4.1 Signal Primitives

The reactive system is built on fine-grained signals with automatic dependency tracking:

```typescript
// Signal types
interface Signal<T> {
  readonly id: SignalId;
  get(): T;
  peek(): T; // Read without tracking
}

interface WritableSignal<T> extends Signal<T> {
  set(value: T): void;
  update(fn: (current: T) => T): void;
}

interface ComputedSignal<T> extends Signal<T> {
  readonly dependencies: Set<SignalId>;
  readonly isDirty: boolean;
}

// Signal factory
interface SignalFactory {
  // Create a source signal
  signal<T>(initial: T, options?: SignalOptions): WritableSignal<T>;
  
  // Create a computed signal (lazy, cached)
  computed<T>(fn: () => T, options?: ComputedOptions): ComputedSignal<T>;
  
  // Create an effect (runs on dependency change)
  effect(fn: () => void | (() => void), options?: EffectOptions): Disposable;
  
  // Batch multiple updates
  batch(fn: () => void): void;
  
  // Run without tracking
  untrack<T>(fn: () => T): T;
}
```

### 4.2 Dependency Graph

```typescript
// The dependency graph maintains relationships between signals
interface DependencyGraph {
  // Track a read during computation
  trackRead(signalId: SignalId): void;
  
  // Mark signal as dirty and propagate
  markDirty(signalId: SignalId): void;
  
  // Get all signals that need recomputation
  getDirtySignals(): Set<SignalId>;
  
  // Topological sort for update order
  getUpdateOrder(dirty: Set<SignalId>): SignalId[];
  
  // Subscribe to specific path patterns
  subscribeToPath(pattern: Path, callback: PathChangeCallback): Disposable;
}

// Change notification with affected paths
type PathChangeCallback = (change: PathChange) => void;

interface PathChange {
  path: Path;
  oldValue: Value;
  newValue: Value;
  source: ChangeSource;
}
```

### 4.3 Glitch-Free Propagation

```typescript
// Update scheduler ensures consistent state
interface UpdateScheduler {
  // Schedule an update (batched by default)
  schedule(signalId: SignalId): void;
  
  // Force synchronous flush
  flush(): void;
  
  // Run computation with transaction semantics
  // All reads see consistent snapshot, all writes applied atomically
  transaction<T>(fn: () => T): T;
}

// Propagation algorithm (push-pull hybrid)
function propagate(graph: DependencyGraph, scheduler: UpdateScheduler) {
  scheduler.batch(() => {
    const dirty = graph.getDirtySignals();
    const order = graph.getUpdateOrder(dirty);
    
    for (const signalId of order) {
      const signal = getSignal(signalId);
      if (signal.isDirty) {
        signal.recompute();
      }
    }
  });
}
```

---

## 5. Scope Model

### 5.1 Lexical Scope Chain

```typescript
// Scope as an immutable persistent data structure
interface Scope {
  readonly id: ScopeId;
  readonly parent: Scope | null;
  readonly isolated: boolean; // If true, does not inherit from parent
  
  // Data access
  resolve(path: Path): Signal<Value>;
  has(path: Path): boolean;
  
  // Create child scope
  child(options: ChildScopeOptions): Scope;
  
  // Lens-based update
  focus(path: Path): ScopeLens;
}

interface ChildScopeOptions {
  isolated?: boolean;
  initialData?: Value;
  projections?: Projection[]; // Explicit imports from parent
}

// Projection: selective parent data import for isolated scopes
interface Projection {
  sourcePath: Path; // Path in parent
  targetPath: Path; // Path in child (aliasing)
  mode: 'live' | 'snapshot'; // Whether to track changes
}
```

### 5.2 Scope Lens

Lenses provide composable, type-safe data access:

```typescript
// Lens: a composable accessor
interface ScopeLens<S = Value, A = Value> {
  // Get the focused value
  get(): A;
  
  // Set the focused value (returns new scope)
  set(value: A): void;
  
  // Modify the focused value
  modify(fn: (a: A) => A): void;
  
  // Compose with another lens
  compose<B>(other: Lens<A, B>): ScopeLens<S, B>;
  
  // Focus into a field
  field(key: string): ScopeLens<S, Value>;
  
  // Focus into an array index
  index(i: number): ScopeLens<S, Value>;
  
  // Focus with a predicate (for arrays)
  find(predicate: (item: Value) => boolean): ScopeLens<S, Value>;
}

// Built-in lens constructors
const Lens = {
  identity: <A>(): Lens<A, A> => /* ... */,
  field: <K extends string>(key: K): Lens<{ [k in K]: unknown }, unknown> => /* ... */,
  index: (i: number): Lens<unknown[], unknown> => /* ... */,
  path: (path: Path): Lens<Value, Value> => /* ... */,
};
```

### 5.3 Self-Write Protection

```typescript
// Data sources track their write paths to prevent self-triggering
interface DataSource {
  readonly id: DataSourceId;
  readonly scope: Scope;
  readonly writePaths: Set<Path>; // Paths this source writes to
  
  // When evaluating dependencies, exclude own write paths
  getDependencies(): Set<Path>;
  
  // Check if a path change should trigger refresh
  shouldRefreshOn(changedPath: Path): boolean;
}

// Implementation of self-write protection
function shouldRefreshOn(source: DataSource, changedPath: Path): boolean {
  // Don't refresh if the change was caused by this source's own write
  for (const writePath of source.writePaths) {
    if (pathAlgebra.subsumes(writePath, changedPath)) {
      return false; // Self-write, ignore
    }
  }
  
  // Check if any dependency overlaps with the changed path
  for (const depPath of source.getDependencies()) {
    if (pathAlgebra.overlaps(depPath, changedPath)) {
      return true;
    }
  }
  
  return false;
}
```

---

## 6. Schema Compilation

### 6.1 Three-Stage Compilation

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Schema    │ --> │     AST     │ --> │     IR      │ --> │  Executor   │
│   (JSON)    │     │  (Parsed)   │     │ (Optimized) │     │  (Runtime)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
     Parse              Analyze            Optimize            Execute
```

**Stage 1: Parse**
- JSON → AST conversion
- Syntax validation
- Reference resolution

**Stage 2: Analyze & Optimize**
- Type inference
- Static expression evaluation
- Dead code elimination
- Dependency analysis
- Region extraction

**Stage 3: Codegen**
- Generate specialized evaluators
- Inline static values
- Produce execution plan

### 6.2 Compiled Node Representation

```typescript
// Compiled schema node (immutable)
interface CompiledNode {
  readonly id: NodeId;
  readonly type: string;
  readonly schemaLocation: SchemaLocation; // For debugging
  
  // Classified fields
  readonly staticProps: Map<string, Value>; // Constant values
  readonly dynamicProps: Map<string, Expr>; // Expressions to evaluate
  readonly meta: CompiledMeta; // Control metadata
  readonly regions: Map<string, CompiledRegion>; // Child regions
  readonly events: Map<string, CompiledEventHandler>; // Event handlers
  
  // Validation rules (pre-extracted)
  readonly validation: CompiledValidation | null;
  
  // Data source declarations
  readonly dataSources: CompiledDataSource[];
  readonly reactions: CompiledReaction[];
  
  // Initial data declaration
  readonly initialData: Expr | null;
}

interface CompiledMeta {
  visible: Expr | true; // Expression or always-true
  disabled: Expr | false;
  className: Expr | null;
  testId: string | null;
}

interface CompiledRegion {
  readonly name: string;
  readonly children: CompiledNode[];
  readonly parameters: string[]; // Declared slot parameters
  readonly iteratorConfig: IteratorConfig | null; // For loop regions
}

interface CompiledEventHandler {
  readonly event: string;
  readonly guard: Expr | null; // when condition
  readonly effect: Effect; // What to do
}
```

### 6.3 Optimization Passes

```typescript
// Compiler optimization pipeline
interface CompilerPass {
  name: string;
  transform(node: CompiledNode, context: CompileContext): CompiledNode;
}

const optimizationPasses: CompilerPass[] = [
  // Evaluate constant expressions at compile time
  constantFolding,
  
  // Inline expressions that reference only static values
  staticInlining,
  
  // Remove unreachable branches
  deadCodeElimination,
  
  // Deduplicate identical sub-expressions
  commonSubexpressionElimination,
  
  // Pre-compute dependency sets for each expression
  dependencyExtraction,
  
  // Specialize region templates for known iteration patterns
  regionSpecialization,
  
  // Generate fast-path evaluators for common patterns
  evaluatorSpecialization,
];
```

---

## 7. Runtime Instantiation

### 7.1 Node Instance

```typescript
// Runtime instance of a compiled node
interface NodeInstance {
  readonly id: InstanceId;
  readonly compiled: CompiledNode;
  readonly scope: Scope;
  
  // Resolved runtime values
  readonly props: Signal<ResolvedProps>;
  readonly meta: Signal<ResolvedMeta>;
  
  // Region instances (lazily created)
  readonly regions: Map<string, RegionInstance>;
  
  // Lifecycle
  mount(): void;
  unmount(): void;
  
  // For component actions
  registerMethod(name: string, method: (...args: Value[]) => Effect): void;
  call(method: string, args: Value[]): Effect;
}

interface ResolvedProps {
  [key: string]: Value;
}

interface ResolvedMeta {
  visible: boolean;
  disabled: boolean;
  className: string | null;
  testId: string | null;
}
```

### 7.2 Region Instance

```typescript
// Region manages a collection of child instances
interface RegionInstance {
  readonly name: string;
  readonly parent: NodeInstance;
  readonly compiled: CompiledRegion;
  
  // For iteration regions
  readonly items: Signal<RegionItem[]>;
  
  // Render the region
  render(bindings?: Map<string, Value>): RenderResult;
}

interface RegionItem {
  readonly key: string | number;
  readonly instance: NodeInstance;
  readonly scope: Scope; // Item-specific scope with $item, $index
}

// Render result is a description, not DOM
interface RenderResult {
  readonly nodes: RenderNode[];
}

type RenderNode =
  | { tag: 'element'; type: string; props: ResolvedProps; children: RenderNode[] }
  | { tag: 'component'; instance: NodeInstance }
  | { tag: 'fragment'; children: RenderNode[] }
  | { tag: 'portal'; target: PortalTarget; children: RenderNode[] };
```

### 7.3 Instance Factory

```typescript
// Factory for creating node instances
interface InstanceFactory {
  // Create instance from compiled node
  create(
    compiled: CompiledNode,
    parentScope: Scope,
    bindings?: Map<string, Value>
  ): NodeInstance;
  
  // Create isolated instance (for table rows)
  createIsolated(
    compiled: CompiledNode,
    data: Value,
    projections: Projection[]
  ): NodeInstance;
  
  // Dispose an instance and all its children
  dispose(instance: NodeInstance): void;
}
```

---

## 8. Rendering Contract

### 8.1 Renderer Interface

```typescript
// What the core provides to renderers
interface RendererProps<Schema = unknown> {
  // Resolved values ready to use
  readonly props: Schema;
  readonly meta: ResolvedMeta;
  
  // Region rendering
  readonly regions: RegionHandles;
  
  // Event binding
  readonly events: EventHandles;
  
  // Runtime utilities
  readonly helpers: RendererHelpers;
  
  // Instance identity
  readonly instanceId: InstanceId;
  readonly testId: string | null;
}

interface RegionHandles {
  // Check if region exists
  has(name: string): boolean;
  
  // Render a region
  render(name: string, bindings?: Map<string, Value>): RenderResult;
  
  // Get region metadata
  getMeta(name: string): RegionMeta;
}

interface EventHandles {
  // Get handler for an event
  get(event: string): ((payload?: Value) => void) | null;
  
  // Check if event has handler
  has(event: string): boolean;
}

interface RendererHelpers {
  // Render arbitrary schema fragment
  renderFragment(schema: unknown, bindings?: Map<string, Value>): RenderResult;
  
  // Evaluate expression in current scope
  evaluate(expr: Expr): Value;
  
  // Dispatch effect
  dispatch(effect: Effect): Promise<EffectResult>;
  
  // Access current scope (readonly)
  readonly scope: ScopeReader;
}
```

### 8.2 Renderer Registration

```typescript
// Renderer registry
interface RendererRegistry {
  // Register a renderer for a type
  register<Schema>(
    type: string,
    renderer: RendererComponent<Schema>,
    options?: RendererOptions
  ): void;
  
  // Get renderer for a type
  get(type: string): RendererComponent | null;
  
  // Extend an existing renderer
  extend<Schema>(
    type: string,
    wrapper: RendererWrapper<Schema>
  ): void;
}

interface RendererOptions {
  // Schema type for validation
  schemaType?: ValueType;
  
  // Default props
  defaultProps?: Record<string, Value>;
  
  // Marker class for this renderer type
  markerClass?: string;
  
  // Whether this is a layout renderer (no intrinsic styles)
  isLayout?: boolean;
}

// Framework-agnostic renderer interface
type RendererComponent<Schema = unknown> = (props: RendererProps<Schema>) => RenderResult;
```

---

## 9. Form Runtime

### 9.1 Form State Model

```typescript
// Form runtime manages form-specific state
interface FormRuntime {
  readonly id: FormId;
  readonly scope: Scope;
  
  // Form state signals
  readonly values: Signal<Value>;
  readonly errors: Signal<ValidationErrors>;
  readonly touched: Signal<Set<Path>>;
  readonly dirty: Signal<Set<Path>>;
  readonly submitting: Signal<boolean>;
  readonly submitCount: Signal<number>;
  
  // Derived state
  readonly isValid: Signal<boolean>;
  readonly isDirty: Signal<boolean>;
  
  // Field operations
  setValue(path: Path, value: Value): void;
  setTouched(path: Path): void;
  resetField(path: Path): void;
  
  // Form operations
  validate(paths?: Path[]): Promise<ValidationResult>;
  submit(): Promise<SubmitResult>;
  reset(): void;
  
  // Draft mode for nested forms
  beginDraft(): DraftHandle;
}

interface DraftHandle {
  readonly scope: Scope; // Isolated draft scope
  commit(): void; // Apply draft to parent
  discard(): void; // Discard changes
}
```

### 9.2 Validation Graph

```typescript
// Compiled validation rules form a dependency graph
interface ValidationGraph {
  readonly rules: Map<Path, ValidationRule[]>;
  readonly dependencies: Map<Path, Set<Path>>; // Field → fields it depends on
  
  // Validate specific paths
  validate(paths: Path[], context: ValidationContext): Promise<ValidationErrors>;
  
  // Get all paths that should be validated when `path` changes
  getAffectedPaths(path: Path): Set<Path>;
}

interface ValidationRule {
  readonly id: RuleId;
  readonly path: Path; // Field this rule validates
  readonly type: 'sync' | 'async';
  readonly condition: Expr | null; // When to apply this rule
  readonly validator: Validator;
  readonly message: Expr; // Error message (can be expression)
}

type Validator =
  | { tag: 'required' }
  | { tag: 'minLength'; min: number }
  | { tag: 'maxLength'; max: number }
  | { tag: 'pattern'; regex: RegExp }
  | { tag: 'min'; min: number }
  | { tag: 'max'; max: number }
  | { tag: 'custom'; expr: Expr }
  | { tag: 'async'; effect: Effect };
```

---

## 10. Action Dispatch

### 10.1 Action Resolution

```typescript
// Three-tier action resolution
interface ActionResolver {
  // Resolve action string to handler
  resolve(action: string, context: ActionContext): ActionHandler | null;
}

type ActionHandler = (args: Value, context: ActionContext) => Effect;

interface ActionContext {
  readonly scope: Scope;
  readonly instance: NodeInstance;
  readonly form: FormRuntime | null;
  readonly surface: SurfaceRuntime | null;
}

// Resolution order:
// 1. namespace:method → lookup in namespace registry
// 2. component:method → lookup in component instance registry
// 3. method → lookup in built-in action registry

const builtinActions: Map<string, ActionHandler> = new Map([
  ['setValue', (args, ctx) => ({ tag: 'write', path: args.path, value: args.value })],
  ['ajax', (args, ctx) => ({ tag: 'fetch', request: buildRequest(args, ctx) })],
  ['dialog', (args, ctx) => ({ tag: 'surface.open', surface: { type: 'dialog', ...args } })],
  ['drawer', (args, ctx) => ({ tag: 'surface.open', surface: { type: 'drawer', ...args } })],
  ['closeDialog', (args, ctx) => ({ tag: 'surface.close', id: ctx.surface?.id, result: args })],
  ['notify', (args, ctx) => ({ tag: 'notify', level: args.level, message: args.message })],
  ['navigate', (args, ctx) => ({ tag: 'navigate', target: args })],
  ['submitForm', (args, ctx) => ctx.form ? submitForm(ctx.form) : Effect.pure(null)],
  ['resetForm', (args, ctx) => ctx.form ? resetForm(ctx.form) : Effect.pure(null)],
]);
```

### 10.2 Namespace Registry

```typescript
// Namespace provides scoped action registration
interface NamespaceRegistry {
  // Register a namespace
  register(name: string, provider: NamespaceProvider): void;
  
  // Lookup a namespace method
  lookup(namespace: string, method: string, scope: Scope): ActionHandler | null;
}

interface NamespaceProvider {
  readonly name: string;
  readonly methods: Map<string, ActionHandler>;
  
  // Optional: type declarations for IDE support
  readonly typeDeclarations?: NamespaceTypeDeclaration;
}

// For complex domain controls (flow designer, spreadsheet, etc.)
interface DomainControlNamespace extends NamespaceProvider {
  // Readonly state projection to scope
  readonly projection: Signal<Value>;
  
  // Internal state (not exposed to schema)
  readonly internalState: unknown;
}
```

---

## 11. Surface Management

### 11.1 Surface Stack

```typescript
// Surface (dialog/drawer) management
interface SurfaceManager {
  readonly stack: Signal<SurfaceState[]>;
  readonly active: Signal<SurfaceState | null>;
  
  // Open a new surface
  open(spec: SurfaceSpec): SurfaceHandle;
  
  // Close surface by id
  close(id: SurfaceId, result?: Value): void;
  
  // Close all surfaces
  closeAll(): void;
}

interface SurfaceState {
  readonly id: SurfaceId;
  readonly type: 'dialog' | 'drawer';
  readonly scope: Scope; // Independent scope
  readonly schema: CompiledNode;
  readonly result: Deferred<Value>; // Promise for result
  readonly zIndex: number;
}

interface SurfaceHandle {
  readonly id: SurfaceId;
  readonly result: Promise<Value>;
  close(result?: Value): void;
}
```

---

## 12. Data Source Lifecycle

### 12.1 Data Source Runtime

```typescript
// Managed data source with lifecycle
interface DataSourceRuntime {
  readonly id: DataSourceId;
  readonly name: string;
  readonly scope: Scope;
  
  // State
  readonly data: Signal<Value>;
  readonly loading: Signal<boolean>;
  readonly error: Signal<ErrorInfo | null>;
  
  // Lifecycle
  mount(): void;
  unmount(): void;
  
  // Manual control
  refresh(): Promise<void>;
  invalidate(): void;
}

interface DataSourceConfig {
  readonly name: string;
  readonly fetch: Effect; // How to fetch data
  readonly writePath: Path; // Where to write result
  
  // Refresh strategy
  readonly refreshOn?: 'mount' | 'focus' | 'interval' | 'dependency';
  readonly interval?: number;
  readonly dependencies?: Path[]; // Paths that trigger refresh
  
  // Self-write protection
  readonly selfWritePaths?: Path[];
}
```

### 12.2 Reaction Runtime

```typescript
// Reaction: watch data and trigger effects
interface ReactionRuntime {
  readonly id: ReactionId;
  readonly scope: Scope;
  
  // Configuration
  readonly watch: Expr; // Expression to watch
  readonly condition: Expr | null; // When to trigger
  readonly effect: Effect; // What to do
  
  // Lifecycle
  mount(): void;
  unmount(): void;
}

// Implementation
function createReaction(config: ReactionConfig, scope: Scope): ReactionRuntime {
  const signalFactory = scope.getSignalFactory();
  
  // Computed that tracks the watch expression
  const watchValue = signalFactory.computed(() => 
    evaluateExpr(config.watch, scope)
  );
  
  // Effect that runs when watch value changes
  const cleanup = signalFactory.effect(() => {
    const value = watchValue.get();
    
    // Check condition
    if (config.condition) {
      const shouldRun = evaluateExpr(config.condition, scope);
      if (!shouldRun) return;
    }
    
    // Dispatch effect
    interpretEffect(config.effect, scope);
  });
  
  return {
    id: generateId(),
    scope,
    watch: config.watch,
    condition: config.condition,
    effect: config.effect,
    mount: () => { /* already running */ },
    unmount: cleanup,
  };
}
```

---

## 13. Host Integration

### 13.1 Host Contract

```typescript
// Everything the host must provide
interface HostContract {
  // HTTP client
  readonly http: HttpClient;
  
  // Notifications
  readonly notify: NotificationService;
  
  // Navigation
  readonly router: NavigationService;
  
  // Storage (optional)
  readonly storage?: StorageService;
  
  // Error handling
  readonly errorHandler: ErrorHandler;
  
  // i18n
  readonly i18n: I18nService;
}

interface HttpClient {
  request(config: HttpRequest): Promise<HttpResponse>;
}

interface NotificationService {
  show(notification: Notification): void;
}

interface NavigationService {
  navigate(target: NavigationTarget): void;
  getCurrentLocation(): Location;
}

interface ErrorHandler {
  handle(error: ErrorInfo, context: ErrorContext): void;
}
```

### 13.2 Runtime Factory

```typescript
// Create a runtime instance
interface RuntimeFactory {
  create(config: RuntimeConfig): Runtime;
}

interface RuntimeConfig {
  // Compiled schema
  readonly schema: CompiledNode;
  
  // Host integration
  readonly host: HostContract;
  
  // Initial data
  readonly initialData?: Value;
  
  // Custom renderers
  readonly renderers?: RendererRegistry;
  
  // Custom actions
  readonly actions?: Map<string, ActionHandler>;
  
  // Namespaces
  readonly namespaces?: NamespaceRegistry;
}

interface Runtime {
  readonly root: NodeInstance;
  readonly scope: Scope;
  
  // Render the runtime
  render(): RenderResult;
  
  // Lifecycle
  mount(container: unknown): void;
  unmount(): void;
  
  // External data injection
  setData(path: Path, value: Value): void;
  
  // Debugging
  inspect(): RuntimeSnapshot;
}
```

---

## 14. Debugging Support

### 14.1 Runtime Inspection

```typescript
// Debugging and devtools support
interface RuntimeSnapshot {
  readonly nodes: Map<InstanceId, NodeSnapshot>;
  readonly scopes: Map<ScopeId, ScopeSnapshot>;
  readonly signals: Map<SignalId, SignalSnapshot>;
  readonly forms: Map<FormId, FormSnapshot>;
  readonly surfaces: SurfaceSnapshot[];
}

interface NodeSnapshot {
  readonly id: InstanceId;
  readonly type: string;
  readonly props: Record<string, Value>;
  readonly meta: ResolvedMeta;
  readonly schemaLocation: SchemaLocation;
  readonly children: InstanceId[];
}

interface ScopeSnapshot {
  readonly id: ScopeId;
  readonly parentId: ScopeId | null;
  readonly isolated: boolean;
  readonly data: Value;
}

interface SignalSnapshot {
  readonly id: SignalId;
  readonly value: Value;
  readonly dependencies: SignalId[];
  readonly subscribers: SignalId[];
  readonly isDirty: boolean;
}
```

### 14.2 Diagnostic API

```typescript
// Compile-time diagnostics
interface Diagnostics {
  readonly errors: Diagnostic[];
  readonly warnings: Diagnostic[];
  readonly hints: Diagnostic[];
}

interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'hint';
  readonly code: string;
  readonly message: string;
  readonly location: SchemaLocation;
  readonly suggestions?: DiagnosticSuggestion[];
}

interface SchemaLocation {
  readonly path: string[]; // JSON path in original schema
  readonly line?: number;
  readonly column?: number;
}
```

---

## 15. Performance Optimizations

### 15.1 Static Zero-Overhead

```typescript
// For static (non-expression) values, evaluation is a no-op
function evaluateField(field: CompiledField, scope: Scope): Value {
  switch (field.tag) {
    case 'static':
      // No computation, direct value return
      return field.value;
      
    case 'dynamic':
      // Only dynamic fields incur evaluation cost
      return evaluateExpr(field.expr, scope);
  }
}
```

### 15.2 Structural Sharing

```typescript
// Immutable data with structural sharing
interface ImmutableValue {
  // Set nested path, sharing unchanged structure
  setIn(path: Path, value: Value): ImmutableValue;
  
  // Merge at path
  mergeIn(path: Path, patch: Value): ImmutableValue;
  
  // Check referential equality
  equals(other: ImmutableValue): boolean;
}

// Reference memoization for computed values
function memoizedCompute<T>(fn: () => T, deps: Signal[]): Signal<T> {
  let cachedResult: T;
  let cachedDeps: Value[];
  
  return computed(() => {
    const currentDeps = deps.map(d => d.get());
    
    if (cachedDeps && shallowEquals(cachedDeps, currentDeps)) {
      return cachedResult; // Reuse reference
    }
    
    cachedDeps = currentDeps;
    cachedResult = fn();
    return cachedResult;
  });
}
```

### 15.3 Row Isolation for Tables

```typescript
// Table row uses isolated scope with explicit projections
function createRowScope(
  parentScope: Scope,
  rowData: Value,
  rowIndex: number,
  projections: Projection[]
): Scope {
  return parentScope.child({
    isolated: true, // No parent inheritance
    initialData: {
      $record: rowData,
      $index: rowIndex,
    },
    projections, // Only explicit imports
  });
}

// Row signal is independent - changes don't affect siblings
interface TableRowInstance {
  readonly scope: Scope;
  readonly instance: NodeInstance;
  
  // Update row data without affecting other rows
  updateData(newData: Value): void;
}
```

---

## 16. Summary: Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            Host Application                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                          Host Contract                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐           │
│  │  HTTP   │  │ Notify  │  │ Router  │  │ Storage │  │  i18n   │           │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘  └─────────┘           │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Effect Interpreter                                   │
│  Effects are pure descriptions → interpreted at this boundary               │
├─────────────────────────────────────────────────────────────────────────────┤
│                              Runtime Core                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Signal Graph    │  │  Action Resolver │  │ Surface Manager  │          │
│  │  (Reactive)      │  │  (3-tier lookup) │  │ (Dialog Stack)   │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │  Scope Chain     │  │  Form Runtime    │  │ DataSource Mgr   │          │
│  │  (Lens-based)    │  │  (Validation)    │  │ (Lifecycle)      │          │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│                         Instance Layer                                       │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  NodeInstance ←──── CompiledNode (immutable template)                │  │
│  │    ├── props: Signal<ResolvedProps>                                  │  │
│  │    ├── meta: Signal<ResolvedMeta>                                    │  │
│  │    ├── regions: Map<string, RegionInstance>                          │  │
│  │    └── scope: Scope                                                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Renderer Layer                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  RendererProps<Schema>                                               │  │
│  │    ├── props: Schema (resolved values)                               │  │
│  │    ├── meta: ResolvedMeta                                            │  │
│  │    ├── regions: RegionHandles                                        │  │
│  │    ├── events: EventHandles                                          │  │
│  │    └── helpers: RendererHelpers                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────┤
│                       Compilation Pipeline                                   │
│  ┌────────────┐     ┌────────────┐     ┌────────────┐                      │
│  │   Parse    │ --> │  Analyze   │ --> │  Optimize  │                      │
│  │ JSON → AST │     │ Type/Deps  │     │ Fold/Inline│                      │
│  └────────────┘     └────────────┘     └────────────┘                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                        Schema (Input)                                        │
│  JSON / DSL describing page structure, data flow, interaction logic         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Key Design Differentiators

| Aspect | This Design | Typical Approaches |
|--------|-------------|-------------------|
| **Path System** | Algebraic paths with union/intersection/wildcards | String paths with manual parsing |
| **Effects** | First-class effect descriptions, pure core | Side effects mixed with business logic |
| **Reactivity** | Fine-grained signals with automatic batching | Coarse-grained observables or dirty checking |
| **Compilation** | Three-stage with optimization passes | Single-pass interpretation or simple compilation |
| **Data Access** | Composable lenses | Imperative get/set with string paths |
| **Self-Write Protection** | Path algebra-based automatic detection | Manual tracking or no protection |
| **Row Isolation** | Scope-based isolation with explicit projections | Full scope inheritance or manual optimization |
| **Type Safety** | Algebraic types throughout | Loose typing with runtime checks |

---

## 18. Implementation Complexity Assessment

| Component | Complexity | Risk | Priority |
|-----------|------------|------|----------|
| Path Algebra | High | Medium | P0 (foundational) |
| Signal Graph | Medium | Low | P0 (foundational) |
| Effect System | High | Medium | P0 (foundational) |
| Scope/Lens | Medium | Low | P0 (foundational) |
| Compiler Pipeline | High | High | P1 |
| Form Runtime | Medium | Low | P1 |
| Action Resolver | Low | Low | P1 |
| Surface Manager | Low | Low | P2 |
| DataSource Lifecycle | Medium | Medium | P1 |
| Debugging Support | Medium | Low | P2 |

---

## 19. Open Questions

1. **Path Algebra Performance**: The algebraic path operations are elegant but may have overhead. Consider caching normalized forms.

2. **Effect Interpreter Boundaries**: Where exactly should effect interpretation happen? At the React boundary? At the host boundary?

3. **Signal Library Choice**: Build custom or use existing (Preact Signals, Solid Signals)?

4. **TypeScript Type Safety**: How deep should the type safety go? Full dependent types for schemas?

5. **Incremental Compilation**: Should schema changes be incrementally compiled or full recompilation?

---

*End of Design Document*
