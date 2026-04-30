# Next-Generation Low-Code Runtime Kernel Design (v3)

> **Document Type**: Experimental architecture design based purely on requirements analysis  
> **Date**: 2026-04-20  
> **Status**: Stable (3rd iteration, reviewed 3 rounds)  
> **Source**: `docs/low-code-dsl-runtime-requirements.md`

---

## 1. Design Philosophy

### 1.1 Governing Principles

This design must conform to `docs/architecture/flux-design-principles.md`:

1. **DSL First**: DSL is a first-class artifact with its own lifecycle (editing, composition, trimming, transformation) independent of the runtime. The runtime receives the **final assembled model** — already processed by the Loader (inheritance merged, permissions trimmed, defaults expanded, i18n replaced).

2. **Authoring-Execution Separation**: The compile boundary separates two optimization targets — authoring model serves understanding and editing; execution model serves performance and minimal runtime overhead. If a problem can be solved before runtime, it must be.

3. **Reactive Data-Driven**: Implicit dependency tracking, read-write separation, all side effects converge to a single Capability dispatch channel. Value / Resource / Reaction share one dependency model but with different consequences.

4. **Progressive Evolution**: Complexity grows from simple forms naturally. New capabilities should be derived systems composed from existing primitives, not new primitives. The primitive set stays small.

5. **Lexical Ownership**: Data lookup (ScopeRef), behavior lookup (ActionScope), and instance capability lookup (ComponentHandleRegistry) are **architecturally separated** resolution mechanisms. Scope carries data only — not bridges, controllers, handles, or command objects. Runtime sidecars follow lexical scope boundaries but are not methods on Scope.

6. **Domain Isolation**: Core maintains a small, stable execution kernel. Domain complexity (flow designer, spreadsheet, report designer) stays outside core, embedded through narrow contracts (Host Projection, Capability, DomainBridge).

### 1.2 DSL VM Positioning

Per `docs/architecture/flux-dsl-vm-extensibility.md`, this system is a **DSL Virtual Machine**:

- It **executes** the final assembled schema, not assembles it
- Extension happens primarily at **load time** (Loader layer), not runtime
- Designers are **complex components** with special types, not platform-level entities
- Runtime extension surface is minimal: renderer registration, namespaced actions, component handles, xui:imports, env host hooks

### 1.3 Embedded Usage Pattern

This runtime is designed for **embedded use** within a larger React application:

- Router navigates to a page → dynamically loads JSON schema → renders a **partial page**
- Or directly receives a JSON structure → renders a partial page
- Multiple independent Flux instances may coexist on the same page
- Different partial pages do **not** directly interact
- External environment adaptation goes through `RenderEnv`

### 1.4 Additional Design Principles

1. **Native Value Performance**: Runtime data uses native JavaScript values. No wrapper types. Type information exists only at compile time.

2. **Declarative Effect Protocol**: All side effects are described as serializable data structures, never closures. The core is a pure interpreter; effects are reified as values and interpreted at the system boundary.

3. **Not coupled to any UI framework**: The core is framework-agnostic; framework bindings are thin adapter layers.
4. **RenderEnv is static**: Host environment is set once, never changes. Runtime uses its capabilities directly.

---

## 2. Path System

### 2.1 Structured Paths

Paths address data within a scope. They are structured values, not strings:

```typescript
type Path =
  | { tag: 'root' }
  | { tag: 'field'; parent: Path; key: string }
  | { tag: 'index'; parent: Path; index: number }
  | { tag: 'wildcard'; parent: Path }
  | { tag: 'union'; paths: Path[] };

type ConcretePath =
  | { tag: 'root' }
  | { tag: 'field'; parent: ConcretePath; key: string }
  | { tag: 'index'; parent: ConcretePath; index: number };
```

`Path` supports pattern matching (wildcard, union). `ConcretePath` is a fully-specified location with no patterns. All runtime data is addressed by `ConcretePath`; `Path` patterns are used only for subscription and invalidation.

### 2.2 Path Operations

```typescript
interface PathOps {
  concat(prefix: Path, suffix: Path): Path;
  toString(path: Path): string;
  parse(segments: string[]): ConcretePath;

  doesMatch(pattern: Path, concrete: ConcretePath): boolean;
  overlaps(a: Path, b: Path): boolean;
  isAncestorOf(parent: Path, child: ConcretePath): boolean;
}
```

**Complexity guarantee**: `doesMatch` and `overlaps` run in O(depth) where depth is the path nesting level. This is always bounded by schema nesting depth (typically < 20). No wildcard-in-wildcard nesting is allowed — wildcards match exactly one segment.

**Why structured paths over strings?**

- Prefix-based invalidation: `users.3.name` change → check if subscriber pattern `users.*.name` overlaps → O(depth) trie walk, not O(n) string comparison.
- No parsing at runtime: paths are compiled as structured values.
- Pattern matching is explicit and bounded.

### 2.3 Path in Scope Data

```typescript
// Reading from scope
function getIn(data: unknown, path: ConcretePath): unknown;
function setIn(data: unknown, path: ConcretePath, value: unknown): unknown;
function hasPath(data: unknown, path: ConcretePath): boolean;
```

These use native JS values. `setIn` returns a new object with structural sharing (unchanged subtrees are shared by reference).

---

## 3. Expression System

### 3.1 Expression AST

```typescript
type Expr =
  | { tag: 'literal'; value: unknown }
  | { tag: 'var'; name: string; binding: LexicalBinding }
  | { tag: 'resolve'; path: PathExpr }
  | { tag: 'slotParam'; name: string }
  | { tag: 'unary'; op: UnaryOp; operand: Expr }
  | { tag: 'binary'; op: BinaryOp; left: Expr; right: Expr }
  | { tag: 'ternary'; condition: Expr; thenExpr: Expr; elseExpr: Expr }
  | { tag: 'call'; fn: string; args: Expr[] }
  | { tag: 'member'; object: Expr; field: string }
  | { tag: 'template'; parts: TemplatePart[] }
  | { tag: 'object'; fields: [string, Expr][] }
  | { tag: 'array'; items: Expr[] }
  | { tag: 'spread'; expr: Expr };

type PathExpr = Expr[];
type TemplatePart = { type: 'text'; value: string } | { type: 'expr'; value: Expr };

type LexicalBinding =
  | { tag: 'scope'; depth: number }
  | { tag: 'slot'; index: number }
  | { tag: 'chain'; index: number }
  | { tag: 'builtin'; id: number };

type UnaryOp = 'not' | 'neg' | 'typeof';
type BinaryOp =
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'mod'
  | 'eq'
  | 'ne'
  | 'lt'
  | 'le'
  | 'gt'
  | 'ge'
  | 'and'
  | 'or'
  | 'nullish';
```

**`slotParam`**: Accesses parameters passed to the current region (e.g., `$item`, `$index` in a loop body). Compiled to `LexicalBinding.slot(index)` — resolved to a lexical position at compile time. In Expr AST, this is the `$slot` access mechanism (requirement 2.5.5).

**`var`**: Accesses named variables in the lexical scope. Compiled to `LexicalBinding` at compile time — the name is resolved away, runtime only sees depth/index.

**`call`**: Calls a built-in function (filter/transformer). Function name is resolved to a numeric `id` at compile time.

**`chainRef`**: Accesses chain context bindings — `result`, `error`, `prevResult`. Compiled to `LexicalBinding.chain(index)` at compile time. See §4.2 for chain execution details.

### 3.2 Expression Evaluation

```typescript
interface ExprEvaluator {
  evaluate(expr: Expr, env: EvalEnv): unknown;
}

// EvalEnv is a flat, stack-like structure — no runtime name lookup
interface EvalEnv {
  scopes: Record<string, unknown>[];
  slots: unknown[];
  chainBindings: unknown[];
  builtins: BuiltinFn[];
}
```

**Performance**: No hash map lookups at runtime. All variable access is `env.scopes[depth][key]`, `env.slots[index]`, or `env.chainBindings[index]`. Expression evaluation is a simple tree walker.

### 3.3 Reactive Evaluation Bridge

The expression evaluator operates in two modes depending on calling context:

**Inside reactive tracking** (within `computed()` or `effect()` callbacks):

- `resolve` nodes call `scope.resolve(path)` which internally calls `Signal.get()` → dependency is automatically registered.
- The reactive system tracks which scope paths were read during expression evaluation.

**Outside reactive tracking** (one-shot command evaluation, debugger):

- `resolve` nodes call `scope.asReader().peek(path)` → reads value without registering dependency.
- Useful for debug inspection, initial data computation, and non-reactive contexts.

```typescript
function evaluateInReactiveContext(expr: Expr, env: EvalEnv, scope: Scope): unknown {
  // resolve nodes use scope.resolve() → Signal.get() → tracks dependency
  return evaluateInternal(expr, env, scope, /* tracking */ true);
}

function evaluateOneShot(expr: Expr, env: EvalEnv, scope: Scope): unknown {
  // resolve nodes use scope.asReader().peek() → no tracking
  return evaluateInternal(expr, env, scope, /* tracking */ false);
}
```

This bridges the Expression system (§3) with the Reactive system (§5). All three dependency consumers use this bridge:

| Consumer                   | Mechanism                                                          | Mode     |
| -------------------------- | ------------------------------------------------------------------ | -------- |
| Value read (dynamic props) | `computed(() => evaluateInReactiveContext(expr, env, scope))`      | Reactive |
| Named data source          | `effect(() => { read dep paths; if changed → refresh })`           | Reactive |
| Reaction observer          | `computed(() => evaluateInReactiveContext(watchExpr, env, scope))` | Reactive |

All three share the same Signal-based dependency tracking. Data sources subscribe to their dependency paths via the scope's `ChangeNotifier`, which is internally powered by the Signal system — ensuring a single dependency model (requirement 2.4.3).

### 3.4 Dependency Extraction (Compile Time)

```typescript
// At compile time, extract which paths an expression reads
function extractDependencies(expr: Expr): Set<Path> {
  // Walk the expression tree
  // For 'resolve' nodes: collect the path pattern
  // For 'var' nodes: collect root (reads the whole variable)
  // For others: recurse into children
}
```

This is used by the reactive system to know which expressions to re-evaluate when data changes.

---

## 4. Effect Protocol

### 4.1 Effect as Serializable Data

All effects are plain data — no functions, no closures, no class instances:

```typescript
type Effect =
  // Terminal effects (interpreted by host or runtime)
  | { tag: 'write'; path: PathExpr; value: Expr }
  | { tag: 'patch'; path: PathExpr; ops: PatchOp[] }
  | { tag: 'fetch'; request: FetchSpec }
  | { tag: 'dispatch'; action: string; args: Expr }
  | { tag: 'callComponent'; instanceId: Expr; method: string; args: Expr[] }
  | { tag: 'callNamespace'; namespace: string; method: string; args: Expr[] }
  | { tag: 'openSurface'; spec: SurfaceSpec }
  | { tag: 'closeSurface'; surfaceId: Expr; result: Expr }
  | { tag: 'notify'; level: 'info' | 'warn' | 'error' | 'success'; message: Expr }
  | { tag: 'navigate'; target: Expr }
  | { tag: 'submitForm'; formId: Expr | null }
  | { tag: 'resetForm'; formId: Expr | null }
  | { tag: 'confirm'; message: Expr; thenEffect: Effect; cancelEffect?: Effect }

  // Control flow effects
  | { tag: 'pure'; value: Expr }
  | { tag: 'fail'; error: Expr }
  | { tag: 'skip'; reason: Expr }
  | { tag: 'sequence'; effects: Effect[] }
  | { tag: 'parallel'; effects: Effect[] }
  | { tag: 'race'; effects: Effect[] }
  | { tag: 'when'; condition: Expr; thenEffect: Effect }
  | { tag: 'chain'; source: Effect; onSuccess: ChainContinuation; onError: ChainContinuation }
  | { tag: 'retry'; effect: Effect; policy: RetryPolicy }
  | { tag: 'timeout'; effect: Effect; ms: number }
  | { tag: 'debounce'; effect: Effect; ms: number; key: string }
  | { tag: 'delay'; ms: number };

type PatchOp =
  | { op: 'set'; key: string; value: Expr }
  | { op: 'remove'; key: string }
  | { op: 'push'; value: Expr }
  | { op: 'splice'; index: Expr; deleteCount: Expr; items: Expr[] }
  | { op: 'merge'; value: Expr };

type ChainContinuation = {
  resultSlotIndex: number;
  errorSlotIndex: number;
  prevResultSlotIndex: number;
  effect: Effect;
};

type RetryPolicy = {
  maxAttempts: number;
  delayMs: number;
  backoff: 'none' | 'linear' | 'exponential';
};

type FetchSpec = {
  url: Expr;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: [string, Expr][];
  body?: Expr;
  params?: [string, Expr][];
  responseType?: 'json' | 'text' | 'blob';
  adapter?: Expr;
};
```

**Key constraint**: Every Effect is JSON-serializable. No functions, no closures, no class instances. `Expr` nodes are evaluated at interpretation time by the effect interpreter using the current `EvalEnv`.

### 4.2 Effect Interpreter

```typescript
type EffectResult =
  | { tag: 'success'; value: unknown }
  | { tag: 'failure'; error: ErrorInfo }
  | { tag: 'skipped'; reason: string };

interface EffectInterpreter {
  interpret(effect: Effect, env: EvalEnv): Promise<EffectResult>;
}
```

The interpreter is part of the Runtime Core (not a separate layer). It evaluates `Expr` nodes within effects using the current `EvalEnv`, then dispatches to the appropriate handler:

- `write`/`patch` → Runtime Core (scope update)
- `fetch` → `env.http.request()` directly (no internal facade)
- `dispatch`/`callComponent`/`callNamespace` → Runtime Core (action resolver)
- `notify` → `env.notify.show()` directly
- `navigate` → `env.router.navigate()` directly
- `openSurface`/`closeSurface` → Runtime Core (surface manager)

**Chain execution**: `chain` effect carries `ChainContinuation` with slot indices. The interpreter:

1. Executes `source` effect
2. On success: writes result to `env.chainBindings[resultSlotIndex]`, preserves previous result at `prevResultSlotIndex`, evaluates `onSuccess.effect` with the extended env
3. On failure: writes error info to `env.chainBindings[errorSlotIndex]`, evaluates `onError.effect`

`chainBindings` is a mutable slot array — the EffectInterpreter modifies it in-place during chain execution. Each chain step overwrites the slot indices allocated at compile time. This is the only mutable part of EvalEnv.

The `chainRef` Expr node (`LexicalBinding.chain(index)`) accesses these slot values. No runtime name lookup — all indices resolved at compile time.

**Timeout execution**: `timeout` effect wraps an inner effect with a time limit. The interpreter starts the inner effect and a timer; whichever completes first wins. On timeout, the inner effect's abort handle is triggered (see §12.3) and `{ tag: 'failure', error: { message: 'Timeout', code: 'TIMEOUT' } }` is returned.

**Confirm execution**: `confirm` effect opens a confirmation dialog. User confirm → execute `thenEffect`. User cancel → execute `cancelEffect` if provided, otherwise return `{ tag: 'skipped', reason: 'user_cancelled' }`.

### 4.3 Read-Write Separation and Capability Convergence

Per the Reactive Data-Driven principle (§1.1.3), reads and writes are strictly separated:

- **Read**: Value / Resource published values / Host Projection snapshots → all through ScopeRef read-only access
- **Write**: All author-visible side effects (scope writes, API calls, navigation, host commands) only through **Capability dispatch** (the Effect interpreter)
- **Dependency change → effect**: Data changes don't directly trigger arbitrary actions. The intermediate must go through Reaction (value change → effect dispatch) or Semantic Lifecycle Entry (lifecycle-owned business pipeline like form submit)

**Write path enforcement**:

- Renderers receive `ScopeReader` (read-only), mutations only via `EventHandles` → `Effect` → `EffectInterpreter`
- `DataSourceRuntime` writes fetch results through `EffectInterpreter.interpret({ tag: 'write', ... })`, not directly
- `FormRuntime.setValue` is an exception: it writes to form-local dirty/touched signals (internal bookkeeping) and delegates the actual data write to `ScopeRef.update()` with a `ChangeSource.form` marker — this is the only non-EffectInterpreter write path, restricted to form field mutations only
- Semantic Lifecycle Entries (form submit, dialog confirm, page enter) are owned by the node that holds the lifecycle boundary, not by individual UI triggers

---

## 5. Reactive System

### 5.1 Signal Primitives

Fine-grained reactive signals with automatic dependency tracking:

```typescript
interface Signal<T> {
  readonly id: number;
  get(): T;
  peek(): T;
}

interface WritableSignal<T> extends Signal<T> {
  set(value: T): void;
  update(fn: (current: T) => T): void;
}

interface ComputedSignal<T> extends Signal<T> {
  readonly isDirty: boolean;
}

interface EffectHandle {
  dispose(): void;
}

interface ReactiveSystem {
  signal<T>(initial: T): WritableSignal<T>;
  computed<T>(fn: () => T): ComputedSignal<T>;
  effect(fn: () => void | (() => void)): EffectHandle;
  batch(fn: () => void): void;
  untrack<T>(fn: () => T): T;
}
```

This is the same pattern used by Solid.js, Preact Signals, and Svelte 5 runes — the industry standard for fine-grained reactivity. No innovation claimed; it's the correct choice.

### 5.2 Glitch-Free Propagation

```typescript
// Push-pull hybrid:
// - Push: dirty flags propagate immediately when source changes
// - Pull: recomputation only happens when value is read
// - Batch: multiple writes in one batch → single propagation wave

// Update order is topological (dependencies before dependents)
// This prevents "glitches" where a computed reads stale values
```

### 5.3 Change Notification

```typescript
interface ScopeChange {
  path: ConcretePath;
  changeType: 'set' | 'delete' | 'splice';
  source: ChangeSource;
}

type ChangeSource =
  | { tag: 'userAction'; actionId: string }
  | { tag: 'dataSource'; sourceId: string }
  | { tag: 'external'; description: string };

interface ChangeNotifier {
  // Subscribe to changes matching a path pattern
  subscribe(pattern: Path, callback: (changes: ScopeChange[]) => void): Disposable;

  // Notify about changes (called by scope after write/patch)
  notify(changes: ScopeChange[]): void;
}
```

Subscribers receive **what changed** (specific paths), not just "something changed" (requirement 2.3.5).

---

## 6. Scope Model — Three-Way Separation

### 6.1 Architectural Principle

Per the Lexical Ownership principle (§1.1.5), data lookup, behavior lookup, and instance capability lookup are architecturally separated:

| Resolution   | Mechanism               | What it resolves                                         |
| ------------ | ----------------------- | -------------------------------------------------------- |
| **Data**     | ScopeRef                | Path-based value access in lexical scope chain           |
| **Behavior** | ActionScope             | Namespace-based action resolution in lexical scope chain |
| **Instance** | ComponentHandleRegistry | Instance-targeted method calls by component id           |

These three never merge into a single context object.

### 6.2 ScopeRef — Pure Data Environment

ScopeRef carries **data only**. No behavior, no bridges, no handles.

```typescript
interface ScopeRef {
  readonly id: string;
  readonly path: string;
  readonly parent: ScopeRef | null;
  readonly isolated: boolean;

  // Read APIs
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, unknown>;
  readVisible(): Record<string, unknown>;

  // Write (internal, used by runtime only)
  update(path: string, value: unknown): void;
}

interface ScopeStore {
  getSnapshot(): Record<string, unknown>;
  getLastChange(): ScopeChange | undefined;
  setSnapshot(next: Record<string, unknown>, change?: ScopeChange): void;
  subscribe(listener: (change: ScopeChange) => void): () => void;
}

interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}
```

**Key constraints**:

- ScopeRef is a pure data lookup contract — no methods for registering namespaces, component handles, or data sources
- Runtime sidecars (Resource state, Reaction state, cache) follow lexical scope ownership but live in separate runtime containers, not as ScopeRef methods
- Child scopes created via lexical chain with optional isolation

### 6.3 ActionScope — Behavior Resolution

```typescript
interface ActionScope {
  readonly id: string;
  readonly parent: ActionScope | null;

  // Resolve action by name (lexical chain lookup)
  resolve(actionName: string): ResolvedAction | undefined;

  // Register a namespace provider (returns unregister function)
  registerNamespace(namespace: string, provider: ActionNamespaceProvider): () => void;

  // Create child scope (for sub-tree isolation)
  child(): ActionScope;
}

interface ActionNamespaceProvider {
  readonly namespace: string;
  readonly methods: Record<string, ActionHandler>;
  readonly typeContract?: NamespaceTypeContract;
  readonly stateProjection?: ComputedSignal<unknown>;
}
```

**Key constraints**:

- ActionScope forms its own lexical chain, independent of ScopeRef
- Child scope can shadow parent's namespaces
- Resolution order: built-in actions → component:method → namespace:method

### 6.4 ComponentHandleRegistry — Instance Targeting

```typescript
interface ComponentHandleRegistry {
  register(handle: ComponentHandle): void;
  unregister(handle: ComponentHandle): void;
  resolve(
    target: ComponentTarget,
  ):
    | { kind: 'found'; handle: ComponentHandle }
    | { kind: 'not-found' }
    | { kind: 'ambiguous'; matches: readonly ComponentHandle[] };
}

interface ComponentHandle {
  readonly id: string;
  readonly type: string;
  capabilities: {
    invoke(method: string, payload: unknown, ctx: ActionContext): Promise<ActionResult>;
  };
}
```

### 6.5 Domain Isolation Contract

Complex domain controls (flow designer, spreadsheet, etc.) interact with the core through four narrow channels:

| Direction             | Mechanism               | Meaning                                                              |
| --------------------- | ----------------------- | -------------------------------------------------------------------- |
| Core → Domain (read)  | Host Projection         | Read-only state snapshot, host-driven refresh                        |
| Domain → Core (write) | Capability              | Namespaced command dispatch (e.g., `designer:*`)                     |
| Instance targeting    | ComponentHandleRegistry | Explicit target component instance method calls                      |
| Domain private        | DomainBridge            | `getSnapshot/subscribe/dispatch` — never enters schema-visible Scope |

Domain controls are **complex components with special types**, not platform-level entities. They do not need a second runtime protocol.

### 6.6 Isolation Semantics

```typescript
// Non-isolated child: inherits all parent data, own writes shadow parent
// get('x') → checks own data first, then parent chain

// Isolated child: no parent inheritance, only explicit projections
// get('x') → checks own data only (+ projected fields)

// Projection for isolated scopes:
// { sourcePath: 'currentUser', targetKey: 'user', mode: 'live' }
// Means: this scope gets a 'user' field that tracks parent's 'currentUser'
```

### 6.7 Structural Sharing for Writes

```typescript
// Scope data is stored as a single object tree
// Writes use structural sharing: only the path to the changed node
// creates new objects; siblings are shared by reference

function setIn(
  data: Record<string, unknown>,
  path: string,
  value: unknown,
): {
  data: Record<string, unknown>;
  changed: boolean;
};
```

### 6.2 Isolation Semantics

```typescript
// Non-isolated child: inherits all parent data, own writes shadow parent
// resolve('x') → checks own data first, then parent chain

// Isolated child: no parent inheritance, only explicit projections
// resolve('x') → checks own data only (+ projected fields)

// Projection for isolated scopes:
// { sourcePath: ['currentUser'], targetKey: 'user', mode: 'live' }
// Means: this scope gets a 'user' field that tracks parent's 'currentUser'
```

### 6.3 Structural Sharing for Writes

```typescript
// Scope data is stored as a single object tree
// Writes use structural sharing: only the path to the changed node
// creates new objects; siblings are shared by reference

function setIn(
  data: Record<string, unknown>,
  path: ConcretePath,
  value: unknown,
): {
  data: Record<string, unknown>;
  changed: boolean;
} {
  // Returns new root with minimal copying
  // Compares old and new values — if identical, returns original data with changed=false
}
```

---

## 7. Schema Compilation

### 7.1 Compilation Pipeline

The runtime compiler receives the **final assembled model** from the Loader. The Loader has already resolved: inheritance, overrides, permission trimming, feature flags, i18n replacement, default expansion, domain profile assembly. The runtime compiler does NOT re-do these.

```
  Final Schema (JSON)           Received from Loader, already assembled
      │
      ▼
  ┌──────────┐
  │  Parse   │  JSON → RawAST, syntax validation, reference resolution
  └──────────┘
      │
      ▼
  ┌──────────┐
  │ Analyze  │  Type inference, dependency extraction
  │          │  validation rule extraction, region extraction
  └──────────┘
      │
      ▼
  ┌──────────┐
  │ Optimize │  Constant folding, dead branch elimination
  │          │  Field classification (static vs dynamic)
  └──────────┘
      │
      ▼
  ┌──────────┐
  │ Verify   │  Verify no eval/new Function (structurally guaranteed by AST)
  │          │  Resolve all namespace references, validate action references
  └──────────┘
      │
      ▼
  CompiledIR (JSON-serializable, immutable execution plan)
      │
      ▼
  Runtime receives CompiledIR — no raw schema, no type analysis, no unresolved references
```

### 7.2 CompiledIR — The Stable Contract

`CompiledIR` is the boundary between compile-time and runtime. It is:

- JSON-serializable (can be produced in a Web Worker)
- Immutable (shared across multiple runtime instances)
- Optimized for execution (no unnecessary indirection)

```typescript
interface CompiledIR {
  readonly version: number;
  readonly root: CompiledNode;
  readonly templates: Record<string, CompiledNode>;
  readonly diagnostics: Diagnostics;
  readonly meta: CompileMeta;
}

interface CompiledNode {
  readonly id: string;
  readonly type: string;
  readonly loc: SchemaLocation;

  // Field classification
  readonly staticProps: Record<string, unknown>; // Literal values, no evaluation
  readonly dynamicProps: Record<string, Expr>; // Expressions to evaluate
  readonly asyncProps: Record<string, AsyncValueSpec>; // Action-based value producers

  readonly meta: CompiledMeta;
  readonly regions: Record<string, CompiledRegion>;
  readonly events: Record<string, CompiledEvent>;

  readonly validation: CompiledValidation | null;
  readonly dataSources: CompiledDataSource[];
  readonly reactions: CompiledReaction[];
  readonly initialData: Expr | null;
}

interface CompiledMeta {
  visible: Expr | true;
  disabled: Expr | false;
  className: Expr | null;
  testId: string | null;
}

interface CompiledRegion {
  readonly children: CompiledNode[];
  readonly parameters: string[]; // Slot param names
  readonly iterator: IteratorSpec | null;
  readonly recursive: RecursiveSpec | null;
}

interface IteratorSpec {
  readonly collectionExpr: Expr; // Expression producing the array
  readonly itemVar: string; // Name for current item (e.g., 'item')
  readonly indexVar: string; // Name for current index (e.g., 'index')
  readonly keyExpr: Expr; // Expression for unique key
  readonly isolated: boolean; // Whether each iteration gets isolated scope
  readonly projections: Projection[]; // For isolated iterations
}

interface RecursiveSpec {
  readonly templateRef: string; // References CompiledIR.templates key
  readonly maxDepth: number; // Bounded recursion limit
  readonly childrenExpr: Expr; // Expression producing child nodes
  readonly onDepthExceeded?: 'truncate' | 'error'; // What to do when maxDepth reached
}

interface AsyncValueSpec {
  readonly effect: Effect;
  readonly writePath: ConcretePath;
  readonly loadingKey: string;
  readonly errorKey: string;
  readonly dependencies: ConcretePath[];
  readonly refreshDebounceMs: number;
}

interface CompiledEvent {
  readonly guard: Expr | null;
  readonly effect: Effect;
}

interface CompiledDataSource {
  readonly name: string;
  readonly fetchEffect: Effect;
  readonly writePath: ConcretePath;
  readonly loadingPath: ConcretePath;
  readonly errorPath: ConcretePath;
  readonly refreshStrategy: RefreshStrategy;
  readonly selfWritePaths: ConcretePath[];
  readonly dependencies: ConcretePath[];
}

type RefreshStrategy =
  | { tag: 'onMount' }
  | { tag: 'manual' }
  | { tag: 'interval'; ms: number }
  | { tag: 'onDependencyChange'; debounceMs: number };

interface CompiledReaction {
  readonly watchExpr: Expr;
  readonly condition: Expr | null;
  readonly effect: Effect;
  readonly debounceMs: number;
}

interface CompiledValidation {
  readonly rules: CompiledValidationRule[];
  readonly dependencyMap: Record<string, string[]>; // field → fields whose rules depend on it
}

interface CompiledValidationRule {
  readonly id: string;
  readonly fieldPath: ConcretePath;
  readonly level: 'sync' | 'async';
  readonly condition: Expr | null;
  readonly validator: CompiledValidator;
  readonly message: Expr;
}

type CompiledValidator =
  | { tag: 'required' }
  | { tag: 'minLength'; min: number }
  | { tag: 'maxLength'; max: number }
  | { tag: 'pattern'; source: string; flags: string }
  | { tag: 'min'; value: number }
  | { tag: 'max'; value: number }
  | { tag: 'minItems'; min: number }
  | { tag: 'maxItems'; max: number }
  | { tag: 'customExpr'; expr: Expr }
  | { tag: 'asyncFetch'; spec: FetchSpec; resultExpr: Expr };

// Rule scope (requirement 2.8.2):
// - Field-level rules: fieldPath points to a leaf field (e.g., ['form', 'name'])
// - Object-level rules: fieldPath points to the object (e.g., ['form']), expr checks cross-field constraints
// - Array-level rules: fieldPath points to an array (e.g., ['form', 'items']), uses minItems/maxItems
// - Conditional rules: condition expr references other fields; only evaluated when condition is truthy

interface CompileMeta {
  readonly locale: string;
  readonly compileTime: number;
  readonly schemaHash: string;
}
```

### 7.3 Internationalization (Compile-Time)

Requirement 5: i18n happens entirely at compile time.

```typescript
// In the Analyze pass:
function applyI18n(node: RawAST, locale: string, messages: MessageBundle): RawAST {
  // Walk all string values in the schema
  // For values matching i18n key pattern (e.g., "i18n:flux.submit")
  //   → replace with the translated string for the given locale
  // For values not matching → leave as-is
  // The runtime never sees i18n keys, only resolved strings
}

// MessageBundle is a flat map: { "flux.submit": "提交", "flux.cancel": "取消" }
// All keys use the unified prefix (e.g., "flux.")
```

### 7.4 Security Pass (Compile-Time)

Requirement 4.1: Security constraints are verified at compile time.

```typescript
function securityPass(ir: CompiledIR, allowedNamespaces: Set<string>): Diagnostics {
  const diagnostics: Diagnostics = [];

  // 1. Verify no eval/new Function in expression AST
  //    (Structurally impossible since Expr has no code generation node)

  // 2. Verify all namespace references in effects are in allowedNamespaces
  walkEffects(ir, (effect) => {
    if (effect.tag === 'callNamespace') {
      if (!allowedNamespaces.has(effect.namespace)) {
        diagnostics.push(error(`Unknown namespace: ${effect.namespace}`));
      }
    }
  });

  // 3. Verify all action references resolve to known actions
  // 4. No runtime permission checks — permissions stripped before compilation

  return diagnostics;
}
```

---

## 8. Runtime Instantiation

### 8.1 NodeInstance

```typescript
interface NodeInstance {
  readonly id: string;
  readonly compiled: CompiledNode;
  readonly scope: Scope;

  readonly props: ComputedSignal<Record<string, unknown>>;
  readonly meta: ComputedSignal<ResolvedMeta>;
  readonly regions: Record<string, RegionInstance>;

  readonly componentMethods: Map<string, (...args: unknown[]) => Promise<EffectResult>>;

  mount(): void;
  unmount(): void;
}
```

### 8.2 RegionInstance

```typescript
interface RegionInstance {
  readonly compiled: CompiledRegion;

  // For iterator regions
  renderItems(scope: Scope): RegionItem[];

  // For static regions
  renderStatic(scope: Scope, slotBindings?: Record<string, unknown>): NodeInstance[];

  // For recursive regions
  renderRecursive(scope: Scope, depth: number): NodeInstance[];
}

interface RegionItem {
  readonly key: string;
  readonly scope: Scope; // Isolated or inherited, depending on config
  readonly instances: NodeInstance[];
}
```

### 8.3 Loop and Recursion (Requirement 2.12)

**Loop (IteratorSpec)**:

```
Schema: { type: 'loop', collection: '${users}', itemVar: 'user', indexVar: 'idx', body: [...] }
Compiled: IteratorSpec { collectionExpr, itemVar: 'user', indexVar: 'idx', keyExpr, isolated: true }
Runtime: For each item in collection:
  1. Create child scope with { user: item, idx: index }
  2. If isolated: create isolated scope with projections instead
  3. Compile body template once, instantiate per item
  4. Each item gets independent reactive scope
```

**Recursion (RecursiveSpec)**:

```
Schema: { type: 'tree-node', recursive: true, childrenField: 'children', body: [...] }
Compiled: RecursiveSpec { templateRef: 'tree-node', maxDepth: 50, childrenExpr, onDepthExceeded: 'truncate' }
Runtime:
  1. Look up template by templateRef in CompiledIR.templates
  2. For each level, evaluate childrenExpr to get child data
  3. Create scope, instantiate template
  4. Recurse until childrenExpr returns empty or maxDepth reached
  5. Template compiled once, instantiated at each level
  6. When maxDepth reached:
     - 'truncate': stop rendering children silently, emit Diagnostic warning
     - 'error': throw runtime error, surface to host ErrorHandler
```

### 8.4 InstanceFactory

```typescript
interface InstanceFactory {
  instantiate(
    compiled: CompiledNode,
    parentScope: Scope,
    ir: CompiledIR,
    slotBindings?: Record<string, unknown>,
  ): NodeInstance;

  instantiateIteratorItem(
    compiled: CompiledNode,
    itemData: unknown,
    index: number,
    iterator: IteratorSpec,
    ir: CompiledIR,
  ): NodeInstance;

  dispose(instance: NodeInstance): void;
}
```

---

## 9. Rendering Contract

### 9.1 Renderer Interface

```typescript
interface RendererProps<S = Record<string, unknown>> {
  readonly props: S;
  readonly meta: ResolvedMeta;
  readonly regions: RegionHandles;
  readonly events: EventHandles;
  readonly helpers: RendererHelpers;
  readonly instanceId: string;
  readonly testId: string | null;
}

interface ResolvedMeta {
  visible: boolean;
  disabled: boolean;
  className: string | null;
  testId: string | null;
}

interface RegionHandles {
  has(name: string): boolean;
  render(name: string, slotBindings?: Record<string, unknown>): RenderResult;
  getParams(name: string): string[];
}

interface EventHandles {
  get(event: string): ((payload?: unknown) => void) | null;
  has(event: string): boolean;
}

interface RendererHelpers {
  renderFragment(schema: unknown, scopeOverrides?: Record<string, unknown>): RenderResult;
  evaluate(expr: Expr): unknown;
  dispatch(effect: Effect): Promise<EffectResult>;
  readonly scope: ScopeReader;
}
```

### 9.2 RenderResult

`RenderResult` is a framework-neutral description. The UI framework adapter (React, Vue, etc.) converts this to framework-specific elements.

```typescript
interface RenderResult {
  readonly nodes: RenderNode[];
}

type RenderNode =
  | { tag: 'component'; instance: NodeInstance }
  | { tag: 'fragment'; children: RenderNode[] }
  | { tag: 'portal'; target: PortalTarget; children: RenderNode[] }
  | { tag: 'text'; content: string }
  | { tag: 'nothing' };
```

Note: RenderResult does not describe low-level DOM elements. Each `component` node delegates to a registered renderer. The renderer itself produces framework-specific output.

### 9.3 Renderer Registration

```typescript
interface RendererRegistry {
  register<S>(type: string, renderer: RendererComponent<S>, options?: RendererOptions): void;
  get(type: string): RendererComponent | null;
  extend(type: string, wrapper: RendererWrapper): void;
}

interface RendererOptions {
  schemaType?: ValueType;
  defaultProps?: Record<string, unknown>;
  markerClass?: string;
  isLayout?: boolean;
}

type RendererComponent<S = Record<string, unknown>> = (props: RendererProps<S>) => RenderResult;
```

### 9.4 Styling Contract (Requirement 3.3)

```typescript
// Layout renderers: emit marker class ONLY, no intrinsic visual styles
// Example: ContainerRenderer
function ContainerRenderer(props: RendererProps) {
  const markerClass = `nop-${props.instanceId.split('-')[0]}`; // e.g., 'nop-container'
  return {
    tag: 'component',
    className: cn(markerClass, props.meta.className),
    children: props.regions.has('body') ? props.regions.render('body') : [],
  };
}

// Widget renderers: self-contained, fully styled UI controls
// Example: ButtonRenderer, TableRenderer, SelectRenderer
// These include internal layout (flex, gap, padding) as part of their visual design
// props.meta.className is for consumer customization overrides

// CSS variable integration:
// - No ThemeProvider, no runtime theme switching
// - All theme values consumed via CSS variables (var(--color-primary), etc.)
// - Component styles reference CSS variables; host defines them
// - Schema can declare className with Tailwind utilities that reference these variables
```

---

## 10. Form Runtime

### 10.1 Form State

```typescript
interface FormRuntime {
  readonly id: string;
  readonly scope: Scope;
  readonly validationGraph: ValidationGraph;

  readonly values: ComputedSignal<unknown>;
  readonly errors: WritableSignal<Record<string, string[]>>;
  readonly touched: WritableSignal<Set<string>>;
  readonly dirty: WritableSignal<Set<string>>;
  readonly submitting: WritableSignal<boolean>;
  readonly submitCount: WritableSignal<number>;

  readonly isValid: ComputedSignal<boolean>;
  readonly isDirty: ComputedSignal<boolean>;

  setValue(path: ConcretePath, value: unknown): void;
  setTouched(path: ConcretePath): void;
  resetField(path: ConcretePath): void;

  validate(options?: ValidateOptions): Promise<ValidationResult>;
  submit(onSubmit: (values: unknown) => Promise<EffectResult>): Promise<SubmitResult>;
  reset(): void;

  beginDraft(options?: DraftOptions): DraftHandle;
}

interface ValidateOptions {
  paths?: ConcretePath[];
  trigger: 'submit' | 'change' | 'blur';
}

interface DraftOptions {
  initialData?: unknown;
  validationRules?: CompiledValidationRule[];
}

interface DraftHandle {
  readonly scope: Scope;
  readonly values: ComputedSignal<unknown>;
  readonly dirty: ComputedSignal<Set<string>>;
  readonly errors: WritableSignal<Record<string, string[]>>;

  validate(): Promise<ValidationResult>;
  commit(): void; // Patch draft data into parent scope, merge dirty state
  discard(): void; // Discard all changes, dispose draft scope
}
```

### 10.2 Validation Graph

```typescript
interface ValidationGraph {
  readonly rules: CompiledValidationRule[];

  validate(
    paths: ConcretePath[],
    values: unknown,
    env: EvalEnv,
    trigger: 'submit' | 'change' | 'blur',
  ): Promise<Record<string, string[]>>;

  getAffectedPaths(changedPath: ConcretePath): ConcretePath[];
}
```

Validation timing (requirement 2.8.3):

- `submit`: validate all rules
- `change`: validate rules for the changed field and dependent fields
- `blur`: validate rules for the blurred field

Async validation (requirement 2.8.4) is supported via `asyncFetch` validator. In-flight async validations are tracked and cancelled when a new validation cycle starts for the same field.

Partial validation (requirement 2.8.5): `validate({ paths: [...] })` only runs rules whose `fieldPath` is in the provided set.

---

## 11. Action Dispatch

### 11.1 Three-Tier Resolution

```typescript
interface ActionResolver {
  resolve(action: string, context: ActionContext): ResolvedAction | null;
}

type ResolvedAction = {
  effect: Effect;
  description: string; // For debugging
};

interface ActionContext {
  readonly scope: Scope;
  readonly env: EvalEnv;
  readonly instance: NodeInstance | null;
  readonly form: FormRuntime | null;
  readonly surface: SurfaceRuntime | null;
}
```

Resolution order:

1. `namespace:method` → `NamespaceRegistry.lookup(namespace, method)`
2. `component:method` → `instance.componentMethods.get(method)`
3. `method` → `BuiltinActionRegistry.get(method)`

### 11.2 Namespace Registry (Requirement 3.2)

```typescript
interface NamespaceRegistry {
  register(name: string, provider: NamespaceProvider): void;
  lookup(namespace: string, method: string): NamespaceMethod | null;
}

interface NamespaceProvider {
  readonly name: string;
  readonly methods: Record<string, NamespaceMethod>;
  readonly typeContract?: NamespaceTypeContract;
  readonly stateProjection?: ComputedSignal<unknown>;
}

interface NamespaceMethod {
  readonly name: string;
  readonly handler: (args: unknown[], context: ActionContext) => Promise<EffectResult>;
}

interface NamespaceTypeContract {
  readonly projectedFields: Record<string, ValueType>;
  readonly methods: Record<string, { params: ValueType[]; returns: ValueType }>;
}
```

Domain controls (flow designer, spreadsheet, etc.) implement `NamespaceProvider`:

- `stateProjection` is a read-only signal projected into scope (requirement 3.2.1)
- `methods` are callable via `namespace:method` action (requirement 3.2.2)
- Internal state is private and not exposed (requirement 3.2.3)
- `typeContract` declares the static contract (requirement 3.2.4)

---

## 12. Surface Management

### 12.1 Surface Stack

```typescript
interface SurfaceManager {
  readonly stack: ComputedSignal<SurfaceState[]>;
  readonly active: ComputedSignal<SurfaceState | null>;

  open(spec: SurfaceSpec, parentScope: Scope): SurfaceHandle;
  close(id: string, result?: unknown): void;
  closeAll(): void;
}

interface SurfaceState {
  readonly id: string;
  readonly type: 'dialog' | 'drawer';
  readonly scope: Scope;
  readonly compiled: CompiledNode;
  readonly resultResolver: {
    resolve: (value: unknown) => void;
    reject: (error: ErrorInfo) => void;
  };
  readonly zIndex: number;
}

interface SurfaceHandle {
  readonly id: string;
  readonly result: Promise<unknown>;
  close(result?: unknown): void;
}

interface SurfaceSpec {
  readonly type: 'dialog' | 'drawer';
  readonly title: Expr;
  readonly body: CompiledNode;
  readonly initialData?: Expr;
  readonly width?: Expr;
  readonly closable?: Expr;
}
```

Surfaces stack (requirement 2.10.4): each `open` increments zIndex. Only the topmost surface receives focus. `close` restores the previous surface as active.

Each surface has an independent scope (requirement 2.10.2), created as an isolated child of the surface manager's scope.

### 12.2 Surface Lifecycle

Surface close follows a strict cleanup order:

1. **Reactions** → dispose all reaction handles (stop watching)
2. **DataSources** → cancel in-flight fetches, clear timers, set `unmounted` flag (subsequent completions are silently discarded)
3. **Child scopes** → unmount and release scope data
4. **SurfaceState** → resolve result promise, remove from stack

This order prevents post-destruction writes: DataSources check `unmounted` flag before writing to scope.

### 12.3 Effect Cancellation

Effects that are in-flight can be cancelled cooperatively:

```typescript
interface AbortHandle {
  readonly aborted: boolean;
  abort(): void;
  readonly promise: Promise<EffectResult>;
}
```

- `parallel`: if one sub-effect fails, all others receive `abort()`. Collect all results (success + failure), return the aggregate failure.
- `race`: the first completing effect wins; all others receive `abort()`. Distinguish "aborted" from "lost race" — both produce `{ tag: 'skipped' }`.
- `timeout`: on timer expiry, inner effect receives `abort()`.
- DataSource fetches: `abort()` triggers HTTP request cancellation (via host's `AbortController`).

---

## 13. Data Source Lifecycle

### 13.1 DataSourceRuntime

```typescript
interface DataSourceRuntime {
  readonly id: string;
  readonly name: string;
  readonly config: CompiledDataSource;
  readonly scope: Scope;

  readonly loading: WritableSignal<boolean>;
  readonly error: WritableSignal<ErrorInfo | null>;

  mount(): void;
  unmount(): void;
  refresh(): Promise<void>;
}

// Lifecycle:
// mount() → if refreshStrategy is 'onMount', trigger initial fetch
//         → if refreshStrategy is 'onDependencyChange', subscribe to dependency paths
//         → if refreshStrategy is 'interval', start interval timer
// unmount() → cancel in-flight requests, clear timers, dispose subscriptions

// Self-write protection:
// When refreshStrategy is 'onDependencyChange':
//   Subscribe to scope changes on config.dependencies paths
//   On change: check if change source is this DataSource (via sourceId)
//   If self-write → skip
//   If external change → debounce by debounceMs, then refresh()

// Dependency-auto-refresh integration:
// The scope's ChangeNotifier is used to subscribe to dependency paths
// Changes matching those paths trigger the refresh cycle
```

### 13.2 Async Value Producers (Requirement 2.1.3.4)

Field-level async values are compiled as `AsyncValueSpec` in `CompiledNode.asyncProps`:

```typescript
// Runtime behavior:
// On mount → execute the effect, write result to the field
// Track loading/error state as additional props
// If dependencies is non-empty:
//   subscribe to dependency paths via ChangeNotifier
//   on change → debounce by refreshDebounceMs → re-execute the effect
// The resolved props signal includes the async value once loaded
//
// Example: options field that depends on form.type
// { dependencies: [['form','type']], refreshDebounceMs: 300 }
// When form.type changes → wait 300ms → re-fetch options
```

### 13.3 Reaction Runtime

```typescript
interface ReactionRuntime {
  readonly id: string;
  readonly config: CompiledReaction;

  mount(): void;
  unmount(): void;
}

// Lifecycle:
// mount() → create a computed signal for watchExpr
//        → create an effect that:
//          1. Reads the watch value (auto-tracks dependencies)
//          2. Checks condition expression
//          3. If passes → debounce by config.debounceMs → dispatch effect
// unmount() → dispose the effect handle

// Re-entrancy protection:
// - Within a single batch, reactions execute at most once (single-pass semantics)
// - A reaction's dispatched effect cannot trigger the same reaction in the same propagation cycle
// - Maximum cascade depth: 10 levels (configurable). Beyond this, diagnostics emit a warning.
```

### 13.4 Debounce Semantics

All debounce operations (Reaction debounceMs, DataSource refreshDebounceMs, Effect debounce) use **trailing-edge debounce**:

- Timer resets on each qualifying change
- Only the last change in a burst triggers execution
- Unmount / dispose cancels the pending timer
- No leading-edge firing (first change does not immediately trigger)

````

---

## 14. Host Integration & Embedded Usage

### 14.1 SchemaRendererProps — The Embedding Interface

This is the primary interface for embedding Flux in a host React application:

```typescript
interface SchemaRendererProps {
  schema: SchemaInput;               // Final assembled JSON schema
  data?: Record<string, unknown>;     // Initial data injection
  env: RenderEnv;                     // Host environment adaptation layer
  formulaCompiler: FormulaCompiler;   // Expression compiler (shared)
  registry?: RendererRegistry;        // Custom renderer registration
  plugins?: RendererPlugin[];         // Runtime plugins
  parentScope?: ScopeRef;             // Parent scope for embedding
  actionScope?: ActionScope;          // Parent action scope for embedding
  componentRegistry?: ComponentHandleRegistry; // Parent component registry
  surfaceRuntime?: SurfaceRuntime;    // Surface manager (dialog/drawer)
}
````

**Key constraints**:

- `schema` is the **final assembled model** — inheritance, permissions, i18n already resolved by Loader
- `env` is host-owned, semantically stable — reference changes do not trigger runtime rebuild
- Multiple `SchemaRenderer` instances can coexist on the same page independently
- Each instance gets its own ScopeRef/ActionScope/ComponentHandleRegistry subtree

### 14.2 RenderEnv — Static, Direct-Use Host Contract

`RenderEnv` is **static** — it is set once at creation and never changes. The runtime uses its capabilities **directly**, no internal facade wrapping.

```typescript
interface RenderEnv {
  readonly http: {
    request(config: HttpRequest): Promise<HttpResponse>;
  };
  readonly notify: {
    show(level: string, message: string): void;
  };
  readonly router: {
    navigate(url: string, options?: { replace?: boolean }): void;
    getCurrentUrl(): string;
  };
  readonly errorHandler: {
    handle(error: ErrorInfo, context: ErrorContext): void;
  };
  readonly i18nMessages: Record<string, string>; // Used by Loader only
  readonly context?: Record<string, unknown>;
}
```

**Key rules**:

- RenderEnv is **static and immutable** — no reference stability concerns, no change detection needed
- Runtime code calls `env.http.request()`, `env.notify.show()`, `env.router.navigate()`, `env.errorHandler.handle()` **directly** — no internal HttpClient/NotificationService/NavigationService facade types
- EffectInterpreter holds a direct reference to `env` and delegates to it without wrapping

### 14.3 RenderEnv Is Static

RenderEnv does not change after creation. This eliminates all reference stability concerns:

1. **No env change handling**: The runtime never needs to detect or react to env reference changes — there are none
2. **Direct reference**: Runtime holds one `env` reference from creation to disposal
3. **No reactive dependency on env**: Env is never a signal or observable — it's a plain static object
4. **Initial data stability**: `SchemaRendererProps.data` is deep-cloned at initialization. Subsequent changes to the caller's object do not affect runtime state.

### 14.4 Runtime Factory

```typescript
interface RuntimeFactory {
  create(config: RuntimeConfig): Runtime;
}

interface RuntimeConfig {
  readonly ir: CompiledIR;
  readonly env: RenderEnv;
  readonly initialData?: Record<string, unknown>;
  readonly renderers: RendererRegistry;
  readonly actions?: Map<string, ActionHandler>;
  readonly parentScope?: ScopeRef;
  readonly parentActionScope?: ActionScope;
  readonly parentComponentRegistry?: ComponentHandleRegistry;
}

interface Runtime {
  readonly root: NodeInstance;
  readonly scope: ScopeRef;
  readonly actionScope: ActionScope;
  readonly componentRegistry: ComponentHandleRegistry;

  render(): RenderResult;
  mount(container?: unknown): void;
  unmount(): void;
  setData(path: string, value: unknown): void;
  inspect(): RuntimeSnapshot;
}
```

---

## 15. Debugging & DevTools

### 15.1 Node Identity and DOM Association

```typescript
// Each NodeInstance has a unique id
// The UI framework adapter sets a data attribute on the DOM element:
//   data-flux-id="<instanceId>"
//   data-flux-type="<nodeType>"
//   data-flux-loc="<schemaLocation.path.join('/')>"

// This allows devtools to:
// 1. Click on DOM element → find corresponding NodeInstance
// 2. Inspect node props, meta, scope data, validation state
// 3. Trace back to original schema location
```

### 15.2 Runtime Inspection

```typescript
interface RuntimeSnapshot {
  readonly nodes: Record<string, NodeSnapshot>;
  readonly scopes: Record<string, ScopeSnapshot>;
  readonly forms: Record<string, FormSnapshot>;
  readonly surfaces: SurfaceSnapshot[];
  readonly dataSources: DataSourceSnapshot[];
}

interface NodeSnapshot {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly meta: ResolvedMeta;
  readonly loc: SchemaLocation;
  readonly childIds: string[];
  readonly scopeId: string;
}

interface ScopeSnapshot {
  readonly id: string;
  readonly parentId: string | null;
  readonly isolated: boolean;
  readonly data: unknown;
  readonly projections: Projection[];
}

interface FormSnapshot {
  readonly id: string;
  readonly values: unknown;
  readonly errors: Record<string, string[]>;
  readonly touched: string[];
  readonly dirty: string[];
  readonly submitting: boolean;
}

interface DataSourceSnapshot {
  readonly id: string;
  readonly name: string;
  readonly loading: boolean;
  readonly error: ErrorInfo | null;
  readonly lastRefreshTime: number | null;
}
```

### 15.3 Diagnostics

```typescript
interface Diagnostics {
  readonly errors: Diagnostic[];
  readonly warnings: Diagnostic[];
  readonly hints: Diagnostic[];
}

interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'hint';
  readonly code: string;
  readonly message: string;
  readonly loc: SchemaLocation;
}

interface SchemaLocation {
  readonly path: string[];
  readonly line?: number;
  readonly column?: number;
}
```

### 15.4 Error Handling

```typescript
// Global error handling flow:
// 1. Expression evaluation throws → caught by NodeInstance, reported to ErrorHandler
// 2. Effect interpretation fails → EffectInterpreter returns { tag: 'failure' }
//    → If the effect is in a chain, onError continuation handles it
//    → If unhandled, reported to ErrorHandler
// 3. Async operation fails → DataSource/Reaction error signal set, reported to ErrorHandler
// 4. Schema compile error → Diagnostics, runtime never created

// Expression evaluation error handling:
// - Failed expression → returns `undefined` + emits Diagnostic warning
// - The component receives `undefined` for that prop
// - Subsequent dependency changes will re-attempt evaluation (not cached as failed)
// - Effect evaluation errors are handled by the chain/retry/catch mechanisms

// Host ErrorHandler receives all unhandled errors:
interface ErrorContext {
  readonly nodeId?: string;
  readonly scopeId?: string;
  readonly effect?: Effect;
  readonly phase: 'compile' | 'evaluate' | 'effect' | 'render';
}
```

---

## 16. Performance Model

### 16.1 Static Zero-Overhead

```typescript
// CompiledNode.staticProps: values that require zero computation
// At runtime: props = { ...staticProps, ...evaluate(dynamicProps) }
// If all props are static (common for labels, containers):
//   No expression evaluation at all — just spread the static object

// Example: <Text value="Hello World" />
// CompiledNode.staticProps = { value: "Hello World" }
// CompiledNode.dynamicProps = {}
// Runtime: props = { value: "Hello World" } — no evaluation, no signals, no tracking
```

### 16.2 Reference Reuse

```typescript
// ComputedSignal<T> caches its value and returns the same reference
// until dependencies change

// For object values: structural sharing in setIn/patch means
// unchanged subtrees keep their references
// Expression evaluation that returns the same value returns the same object
```

### 16.3 Selector-Style Subscription

```typescript
// React adapter example:
function useRendererProps(instance: NodeInstance): RendererProps {
  // Subscribe to the specific instance's props signal
  // Only re-renders when THIS instance's props change
  // Not affected by changes to sibling or parent instances
  return useSignal(instance.props);
}
```

### 16.4 High-Frequency Row Isolation

```typescript
// Table with 1000 rows:
// Each row gets an ISOLATED scope (no parent inheritance)
// Row scope = { $record: rowData, $index: idx } + explicit projections
// Changing row 42's data:
//   → Only row 42's scope updates
//   → Other 999 rows' computed signals are unaffected
//   → No dependency tracking across rows
// Total reactive work: O(1) per row change, not O(n)
```

---

## 17. Testability

### 17.1 No-DOM Testing

The core runtime has zero DOM dependencies:

```typescript
// All core types are plain objects and functions
// Scope, Signal, Expression, Effect — none reference DOM APIs

// Testing a form validation:
const scope = createScope({ initialData: { name: '', email: '' } });
const form = createFormRuntime(compiledValidation, scope);
const result = await form.validate();
expect(result.errors.name).toContain('Required');

// Testing an expression:
const env = { scopes: [{ x: 1, y: 2 }], slots: [], chainBindings: [], builtins: [] };
const result = evaluateExpr(parsedExpr, env);
expect(result).toBe(3);

// Testing effect interpretation:
const mockHost = { http: { request: jest.fn() }, ... };
const interpreter = createEffectInterpreter(mockHost, scope);
const result = await interpreter.interpret(fetchEffect, env);
expect(mockHost.http.request).toHaveBeenCalledWith(expectedConfig);
```

### 17.2 Embedding & Isolation (Requirement 7.2)

The runtime is fully embeddable without global state pollution:

1. **No global singletons**: All state lives within the `Runtime` instance. No module-level stores or registries.
2. **No DOM globals**: Core has zero DOM imports. UI framework adapter is the only layer touching `document`/`window`.
3. **CSS scoping**: Marker classes use a `nop-` prefix. The host can scope all styles under a container selector.
4. **Multiple instances**: Multiple `Runtime` instances can coexist on the same page without interference (e.g., embedding two low-code forms in different parts of a host app).
5. **Cleanup**: `runtime.unmount()` releases all scopes, signals, timers, and subscriptions. No memory leaks.

### 17.3 Remote Fragment Loading (Requirement 4.3)

The architecture supports dynamic loading of remote schema fragments:

```typescript
// Runtime can receive new CompiledIR fragments at runtime
interface Runtime {
  // ...existing methods...
  loadFragment(url: string, scopeOverrides?: Record<string, unknown>): Promise<RenderResult>;
}

// Implementation:
// 1. Fetch fragment schema JSON from URL (via host HTTP client)
// 2. Compile to CompiledIR (compile step can be done server-side for performance)
// 3. Instantiate as sub-tree under current scope
// 4. Return RenderResult for the fragment
```

---

## 18. Architecture Overview

```
 ╔═══════════════════════════════════════════════════════════════════════╗
 ║                         COMPILE TIME                                  ║
 ║                                                                       ║
 ║   Schema ──► Parse ──► Analyze ──► Optimize ──► Security ──► IR      ║
 ║    (JSON)    (AST)    (i18n,deps)  (fold,dead)  (verify)    (JSON)   ║
 ║                                                                       ║
 ║   Host provides: i18nMessages, allowedNamespaces                      ║
 ╚═══════════════════════════════════════════════════════════════════════╝
                              │
                     CompiledIR (immutable, serializable)
                              │
 ╔═══════════════════════════════════════════════════════════════════════╗
 ║                          RUNTIME                                      ║
 ║                                                                       ║
 ║  ┌───────────────────────────────────────────────────────────────┐   ║
 ║  │                     Runtime Core                              │   ║
 ║  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │   ║
 ║  │  │  Reactive   │  │   Scope    │  │  Effect Interpreter    │  │   ║
 ║  │  │  System     │  │  Chain     │  │  (interprets Effects,  │  │   ║
 ║  │  │  (Signals)  │  │            │  │   dispatches to host)  │  │   ║
 ║  │  └────────────┘  └────────────┘  └────────────────────────┘  │   ║
 ║  │  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐  │   ║
 ║  │  │  Action     │  │  Surface   │  │  Instance Factory      │  │   ║
 ║  │  │  Resolver   │  │  Manager   │  │  (creates/disposes     │  │   ║
 ║  │  └────────────┘  └────────────┘  │   NodeInstances)       │  │   ║
 ║  │                                   └────────────────────────┘  │   ║
 ║  │  ┌────────────┐  ┌────────────┐                               │   ║
 ║  │  │  Form       │  │ DataSource │                               │   ║
 ║  │  │  Runtime    │  │ Manager    │                               │   ║
 ║  │  └────────────┘  └────────────┘                               │   ║
 ║  └───────────────────────────────────────────────────────────────┘   ║
 ║                              │                                       ║
 ║                              ▼                                       ║
 ║  ┌───────────────────────────────────────────────────────────────┐   ║
 ║  │                   UI Framework Adapter                        │   ║
 ║  │  (React/Vue/etc. — thin layer: signal→hook, RenderResult→JSX)│   ║
 ║  └───────────────────────────────────────────────────────────────┘   ║
 ║                              │                                       ║
 ║                              ▼                                       ║
 ║  ┌───────────────────────────────────────────────────────────────┐   ║
 ║  │                   Renderer Components                         │   ║
 ║  │  (Layout: marker classes only / Widget: self-styled controls) │   ║
 ║  └───────────────────────────────────────────────────────────────┘   ║
 ║                                                                       ║
 ╚═══════════════════════════════════════════════════════════════════════╝
                              │
                     Host Contract
                              │
 ╔═══════════════════════════════════════════════════════════════════════╗
 ║                      HOST APPLICATION                                 ║
 ║   HTTP Client │ Notification │ Router │ Error Handler │ i18n Data    ║
 ╚═══════════════════════════════════════════════════════════════════════╝
```

---

## 19. Requirements Traceability

| Req   | Description                                 | Section                        | Status |
| ----- | ------------------------------------------- | ------------------------------ | ------ |
| 2.1   | Schema parse & compile                      | §7                             | ✅     |
| 2.1.3 | Progressive value semantics (5 levels)      | §3.1, §8.4 (asyncProps), §13.1 | ✅     |
| 2.2   | Expression engine                           | §3                             | ✅     |
| 2.3   | Lexical data environment                    | §6                             | ✅     |
| 2.3.5 | Change propagation with paths               | §5.3                           | ✅     |
| 2.4   | Dependency tracking & reactive              | §5                             | ✅     |
| 2.4.5 | Read-write separation                       | §4.3                           | ✅     |
| 2.5   | Rendering & component system                | §9                             | ✅     |
| 2.5.5 | Parameterized regions / $slot               | §3.1 (slotParam), §8.2         | ✅     |
| 2.6   | Action system & control flow                | §4.1, §11                      | ✅     |
| 2.4.3 | Three consumer types share dependency model | §3.3, §5.1, §13.1              | ✅     |
| 2.6.6 | Retry & timeout                             | §4.1 (RetryPolicy, timeout)    | ✅     |
| 2.8.2 | Object/array/field-level rules              | §10.2 (CompiledValidator)      | ✅     |
| 3.1.5 | Environment stability                       | §14.2                          | ✅     |
| 2.6.7 | Debounce                                    | §4.1, §13.3                    | ✅     |
| 2.6.9 | Chain result context                        | §4.2 (ChainContinuation)       | ✅     |
| 2.7   | 3-tier action resolution                    | §11.1                          | ✅     |
| 2.8   | Form & validation                           | §10                            | ✅     |
| 2.8.6 | Draft isolation                             | §10.1 (DraftHandle)            | ✅     |
| 2.9   | API & data source                           | §13                            | ✅     |
| 2.10  | Surface (dialog/drawer)                     | §12                            | ✅     |
| 2.11  | Table & collection rendering                | §8.3, §16.4                    | ✅     |
| 2.12  | Loop & recursion                            | §8.3                           | ✅     |
| 3.1   | Host boundary                               | §14                            | ✅     |
| 3.2   | Domain control embedding                    | §11.2                          | ✅     |
| 3.3   | Theme & style compatibility                 | §9.4                           | ✅     |
| 4.1   | Security constraints                        | §7.4                           | ✅     |
| 4.2   | Performance constraints                     | §16                            | ✅     |
| 4.3   | Progressive complexity                      | §1.1                           | ✅     |
| 4.4   | Compile/runtime separation                  | §7.1, §7.2                     | ✅     |
| 5     | Internationalization                        | §7.3                           | ✅     |
| 6     | DevTools support                            | §15                            | ✅     |
| 7     | Quality attributes                          | §17, §9, §11                   | ✅     |

---

## 20. Design Trade-offs

| Decision                            | Benefit                                       | Cost                              | Mitigation                                         |
| ----------------------------------- | --------------------------------------------- | --------------------------------- | -------------------------------------------------- |
| Structured Path instead of strings  | O(depth) pattern matching, no runtime parsing | Memory overhead per path node     | Path nodes are small objects; pool common patterns |
| Serializable Effects (no closures)  | Testable, replayable, serializable to Workers | More verbose than inline closures | Compile-time generation reduces verbosity          |
| Native JS values (no Value wrapper) | Zero overhead for primitives, natural interop | No runtime type discrimination    | Type checks are compile-time only                  |
| Compile-time i18n                   | Zero runtime i18n overhead                    | Must recompile for locale change  | Acceptable: locale is a build-time concern         |
| Isolated scopes for rows            | O(1) per-row update                           | Explicit projections needed       | Projections are declared in schema, not per-row    |
| IR as stable boundary               | Compile/runtime can version independently     | IR format must be stable          | IR version field + migration support               |
| Single reactive system              | No abstraction mismatch between store types   | Must be well-implemented once     | Use proven signal library (Preact/Solid)           |

---

_End of Design Document v3_
