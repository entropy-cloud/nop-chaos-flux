# Next-Generation Low-Code DSL Runtime Kernel Design

> **Document Type**: Experimental design — a from-scratch kernel interface proposal based solely on the requirements in `docs/low-code-dsl-runtime-requirements.md`.
>
> **No existing codebase or architecture documents were consulted during the design phase.**

---

## 0. Design Philosophy

This kernel is designed around **five governing principles**, derived directly from the requirements:

1. **Compile-Time Maximality** — If a problem can be solved at compile time, it must be. The runtime should be a thin execution shell over pre-computed artifacts.
2. **Zero-Abstraction-Overhead Invariants** — Static parts of a schema incur exactly zero runtime cost. Dynamic parts pay only for their dynamism.
3. **Algebraic Effect Handlers** — All side effects (state writes, network calls, navigation, dialog management) are modeled as effect messages dispatched through a single capability channel, making the kernel inherently testable and embeddable.
4. **Root-Normalized Reactive Propagation** — Data environments track dependencies at normalized lexical root granularity (e.g., `items` not `items[3].name`). This avoids the complexity of wildcard pattern matching while still providing precise-enough invalidation. Array mutations invalidate the array root, which propagates to all subscribers of that root and its children.
5. **Capability-Based Security** — No action, no namespace, no data source can ever be accessed outside its declared lexical boundary. This is enforced structurally at compile time, not by runtime checks.

---

## 1. Architecture Overview

The kernel is organized into **six layers**, each with a strict compile-time / runtime boundary:

```
┌──────────────────────────────────────────────────────┐
│                 L6: Host Integration                  │
│    (HostAdapter, SurfaceManager)                      │
├──────────────────────────────────────────────────────┤
│              L5: Renderer Adapter Layer               │
│    (RendererHost, RegionHandle, RendererOrchestrator) │
├──────────────────────────────────────────────────────┤
│              L4: Action & Effect Pipeline             │
│    (ActionExecutor, EffectDispatcher, EffectScope,    │
│     ActionRegistry, FormRuntime [runtime half])       │
├──────────────────────────────────────────────────────┤
│           L3: Reactivity & Data Layer                 │
│    (SignalGraph, ScopeTree, DataSourceManager,        │
│     ReactionManager, FormRuntime [state half])        │
├──────────────────────────────────────────────────────┤
│           L2: Expression Engine                        │
│    (ExpressionCompiler, EvalContext, DependencyLog)   │
├──────────────────────────────────────────────────────┤
│           L1: Schema Compiler (Compile-Time)          │
│    (SchemaParser, IRBuilder, TypeChecker,             │
│     ValidationGraphCompiler)                          │
└──────────────────────────────────────────────────────┘
```

**Key invariant**: Layers L1–L3 are **framework-agnostic** (no React, no DOM). L4 is also framework-agnostic. Only L5 depends on a rendering framework. L6 is a thin adapter boundary with the host application.

---

## 2. Layer 1: Schema Compiler (Compile-Time)

### 2.1 Core Types

```typescript
// ── Schema AST ──

interface SchemaNode {
  readonly id: NodeId;
  readonly type: string;
  readonly props: ReadonlyMap<string, SchemaValue>;
  readonly regions: ReadonlyMap<string, RegionSchema>;
  readonly actions?: ActionSchema;
  readonly validations?: ReadonlyArray<ValidationSchema>;
  readonly dataSources?: ReadonlyArray<DataSourceSchema>;
  readonly reactions?: ReadonlyArray<ReactionSchema>;
  readonly loop?: LoopSchema;
  readonly meta?: NodeMetaSchema;
}

type SchemaValue =
  | { kind: 'literal'; value: unknown }
  | { kind: 'expression'; source: string; compiled: CompiledExpr }
  | { kind: 'template'; parts: ReadonlyArray<string | CompiledExpr> }
  | { kind: 'action-producer'; action: ActionSchema }
  | { kind: 'data-source-ref'; sourceId: string };

interface RegionSchema {
  readonly name: string;
  readonly params?: ReadonlyMap<string, string>; // paramName → paramType
  readonly children: ReadonlyArray<SchemaNode>;
}

// ── Compiled Intermediate Representation (IR) ──

interface CompiledSchema {
  readonly root: CompiledNode;
  readonly expressions: ReadonlyMap<ExprId, CompiledExpr>;
  readonly actions: ReadonlyMap<ActionId, CompiledAction>;
  readonly validations: ReadonlyMap<RuleId, CompiledValidation>;
  readonly dataSources: ReadonlyMap<SourceId, CompiledDataSource>;
  readonly diagnostics: ReadonlyArray<Diagnostic>;
}

interface CompiledNode {
  readonly id: NodeId;
  readonly type: string;
  readonly rendererKey: RendererKey;
  readonly props: ReadonlyMap<string, PropSlot>;
  readonly meta: MetaSlot;
  readonly regions: ReadonlyMap<string, CompiledRegion>;
  readonly scopeBinding?: ScopeBinding; // how this node creates/binds scopes
  readonly instanceKey: string; // for component instance registry
}

type PropSlot =
  | { kind: 'static'; value: unknown } // zero runtime cost
  | { kind: 'dynamic'; exprId: ExprId } // re-evaluate on dependency change
  | { kind: 'region'; regionId: string } // pre-compiled child handle
  | { kind: 'action'; actionId: ActionId } // event handler
  | { kind: 'i18n'; key: string; fallback?: string }; // resolved at runtime to current locale

// ── i18n Design Note ──
// Requirement 5.3 states "国际化字符串替换在编译阶段完成". However, compile-time
// substitution produces locale-specific artifacts that cannot support runtime locale
// switching (a real-world requirement for multi-language applications).
//
// This design resolves the conflict by splitting the concern:
// - Compile time: VALIDATE i18n keys (existence check, prefix enforcement)
// - Runtime: RESOLVE i18n keys to current locale string (lazy, memoized per key+locale)
//
// The i18n PropSlot has the same zero-cost behavior as static props when the locale
// doesn't change — the memoized string is returned without lookup. This preserves
// the spirit of "no runtime overhead" while enabling runtime locale switching.
// All i18n keys MUST use the unified prefix (e.g., "flux.") enforced at compile time.

interface CompiledRegion {
  readonly name: string;
  readonly params: ReadonlyArray<string>; // ["item", "index"]
  readonly template: CompiledNode[]; // compiled once, instantiated N times
  readonly isolated: boolean; // e.g., table rows are isolated
  readonly projections?: ExprId[]; // explicit parent→child data projection
}
```

### 2.2 Compiler Pipeline

```
JSON Schema
    │
    ▼
┌─────────────┐
│ Parse       │  Raw JSON → SchemaNode tree
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Resolve     │  Resolve type→renderer, inherit defaults,
│             │  validate i18n keys, normalize shorthands
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Classify    │  Classify each prop as static/dynamic/template/
│             │  action-producer/data-source-ref
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Compile     │  Compile expressions, extract validation graph,
│             │  build action chains, analyze scope topology
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ Optimize    │  Static subtree hoisting, dead-code elimination,
│             │  dependency root pre-computation, i18n key extraction
└─────┬───────┘
      │
      ▼
┌─────────────┐
│ TypeCheck   │  Schema structure validation, expression type inference,
│             │  namespace contract validation, diagnostic emission
└─────┬───────┘
      │
      ▼
CompiledSchema (immutable artifact)
```

### 2.3 Compiler Interface

```typescript
interface SchemaCompiler {
  compile(schema: unknown, context: CompileContext): CompileResult;
}

interface CompileContext {
  readonly rendererIndex: StaticRendererIndex; // compile-time: known types and their prop schemas
  readonly actionContracts: StaticActionContracts; // compile-time: known action names and signatures
  readonly namespaceContracts: ReadonlyMap<string, NamespaceContract>;
  readonly i18nResolver: I18nResolver;
  readonly validatorProvider?: ValidatorProvider;
}

// ── Static Contracts (compile-time snapshots, no runtime state) ──

interface StaticRendererIndex {
  hasType(type: string): boolean;
  getPropSchema(type: string): PropSchema | null;
  getRegionNames(type: string): string[];
}

interface StaticActionContracts {
  hasBuiltIn(name: string): boolean;
  getSignature(name: string): MethodSignature | null;
}

// ── Runtime Registries (mutable, L4/L5 layer) ──

interface RendererRegistry {
  register(key: RendererKey, factory: RendererFactory): void;
  unregister(key: RendererKey): void;
  resolve(key: RendererKey): RendererFactory | null;
  toStaticIndex(): StaticRendererIndex;
}

interface ActionRegistry {
  registerBuiltIn(name: string, handler: BuiltInActionHandler): void;
  registerComponent(instanceKey: string, methods: ComponentMethods): void;
  unregisterComponent(instanceKey: string): void;
  registerNamespace(ns: string, contract: NamespaceContract, methods: NamespaceMethods): void;
  unregisterNamespace(ns: string): void;
  resolve(action: string, context: ActionContext): ActionHandler | null;
  toStaticContracts(): StaticActionContracts;
}

interface CompileResult {
  readonly success: boolean;
  readonly artifact?: CompiledSchema;
  readonly diagnostics: ReadonlyArray<Diagnostic>;
}

interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'info';
  readonly nodeId?: NodeId;
  readonly path?: string;
  readonly message: string;
  readonly source: string; // e.g., "type-checker", "expression-compiler"
}
```

---

## 3. Layer 2: Expression Engine

### 3.1 Design: Bytecode-Interpreted Expression VM

Instead of the common approach of AST-walking or string interpolation, expressions are compiled to a **compact bytecode format** and executed by a register-based virtual machine. This gives:

- Predictable O(1) per-expression execution cost
- Natural dependency tracking via read barriers
- No dynamic code generation (`eval`, `new Function`)
- Amenable to future WASM compilation for hot paths

### 3.2 Core Types

```typescript
// ── Compiled Expression ──

interface CompiledExpr {
  readonly id: ExprId;
  readonly bytecode: Uint32Array; // register-based bytecode
  readonly constantPool: unknown[]; // literals, function references
  readonly depRoots: ReadonlyArray<string>; // normalized dependency roots (conservative)
  readonly returnType: ExprType;
}

// ── Evaluation Context ──

interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  resolveWithLog(path: string, log: DependencyLog): unknown;
}

// ── Dependency Tracking ──

interface DependencyLog {
  readonly paths: ReadonlySet<string>;
  reset(): void;
  merge(other: DependencyLog): void;
}

// ── Expression VM ──

interface ExpressionVM {
  evaluate(expr: CompiledExpr, context: EvalContext): unknown;
  evaluateWithLog(expr: CompiledExpr, context: EvalContext, log: DependencyLog): unknown;
}
```

### 3.3 Bytecode Instruction Set (Conceptual)

| Opcode        | Operands                              | Semantics                           |
| ------------- | ------------------------------------- | ----------------------------------- |
| `LOAD_CONST`  | `dest`, `poolIdx`                     | Load constant from pool             |
| `LOAD_VAR`    | `dest`, `pathIdx`                     | Read from scope (with optional log) |
| `LOAD_HAS`    | `dest`, `pathIdx`                     | Test scope path existence           |
| `BINARY_OP`   | `dest`, `op`, `src1`, `src2`          | Arithmetic/comparison/logic         |
| `UNARY_OP`    | `dest`, `op`, `src`                   | Negation, not                       |
| `CALL_FUNC`   | `dest`, `funcIdx`, `argc`, `args...`  | Built-in function call              |
| `TERNARY`     | `dest`, `cond`, `trueIdx`, `falseIdx` | Conditional                         |
| `INTERPOLATE` | `dest`, `partCount`, `parts...`       | Template string assembly            |
| `RETURN`      | `src`                                 | Return value                        |

### 3.4 Expression Compiler

```typescript
interface ExpressionCompiler {
  compile(source: string): CompiledExpr;
  compileTemplate(parts: ReadonlyArray<string | string>): CompiledExpr;
}
```

The expression compiler parses source text, builds an AST, performs constant folding and dead-path elimination, then emits bytecode + constant pool + normalized dependency root list.

---

## 4. Layer 3: Reactivity & Data Layer

### 4.1 Design: Signal Graph with Path-Lens Granularity

The reactivity system is modeled as a **directed acyclic signal graph** where:

- **Source signals** are data roots in scope trees
- **Derived signals** are expression evaluations with tracked dependency roots
- **Effect signals** are side-effect triggers (data source refreshes, reactions)
- **Propagation** is pull-based at leaf consumption, with push-based invalidation in topological order

This is fundamentally different from a simple observable/store model: the graph structure is **known at compile time** (from the expression dependency analysis), and the runtime only needs to instantiate and wire it.

### 4.2 Scope (Lexical Data Environment)

```typescript
interface Scope {
  readonly id: ScopeId;
  readonly parent: Scope | null;
  readonly isolated: boolean;

  // ── Read API ──
  get(path: string): unknown;
  has(path: string): boolean;
  tryGet(path: string): { found: boolean; value: unknown };

  // ── Internal Mutation API (called ONLY by EffectHandler for setValue effects) ──
  // NOT for external use. All user/action-originated writes must go through EffectDispatcher.
  /** @internal */
  _applyChange(change: ScopeChange): RootChange[];

  // ── Subscription ──
  subscribe(roots: ReadonlyArray<string>, callback: ChangeCallback): Unsubscribe;

  // ── Snapshot (for debugging, not normal data flow) ──
  snapshot(): ScopeSnapshot;
}

// ── Read-only scope view (for L4/L5 — no mutation access) ──

interface ReadableScope {
  readonly id: ScopeId;
  get(path: string): unknown;
  has(path: string): boolean;
  tryGet(path: string): { found: boolean; value: unknown };
  subscribe(roots: ReadonlyArray<string>, callback: ChangeCallback): Unsubscribe;
}

interface ScopeChange {
  readonly path: string;
  readonly value: unknown;
  readonly op: 'set' | 'merge' | 'delete' | 'push' | 'splice';
}

// ── Change Notification (root-normalized) ──
// All change notifications are grouped by their normalized lexical root.
// For example, setting items[3].name produces a RootChange with root="items".

interface ChangeCallback {
  (changes: ReadonlyArray<RootChange>): void;
}

interface RootChange {
  readonly root: string; // normalized root, e.g., "items"
  readonly affectedPaths: ReadonlyArray<string>; // concrete paths that changed
  readonly op: 'set' | 'merge' | 'delete' | 'push' | 'splice';
}

interface ScopeSnapshot {
  readonly own: Readonly<Record<string, unknown>>;
  readonly inherited: Readonly<Record<string, unknown>>;
  readonly merged: Readonly<Record<string, unknown>>;
}
```

### 4.3 Scope Tree & Factory

```typescript
interface ScopeTree {
  readonly root: Scope;

  createChild(parent: Scope, options: ScopeCreateOptions): Scope;
  dispose(scope: Scope): void; // cleanup subscriptions, data sources, reactions
}

interface ScopeCreateOptions {
  readonly isolated?: boolean;
  readonly initialValues?: Readonly<Record<string, unknown>>;
  readonly projections?: ReadonlyMap<string, string>; // parentPath → childName
}
```

### 4.4 Signal Graph Node

```typescript
interface SignalNode<T = unknown> {
  readonly id: SignalId;
  readonly kind: SignalKind;
  get(): T; // for derived: re-evaluate if stale; return cached value if clean
  invalidate(): void; // mark stale
  subscribe(callback: () => void): Unsubscribe;
}

// ── Reference Reuse Guarantee ──
// When a derived signal re-evaluates after invalidation, if the new value is
// structurally equal to the previous value (via deep equality check), the signal
// returns the PREVIOUS reference (not the new one). This satisfies requirement 4.2.2:
// "动态求值结果未发生变化时，应复用上一次的引用".
// For primitive values, this is automatic. For objects/arrays, the signal maintains
// a previousValue cache and uses structural comparison.

type SignalKind =
  | 'source' // data path in scope
  | 'derived' // expression evaluation
  | 'effect' // side-effect trigger
  | 'datasource'; // named data source
```

### 4.5 Dependency Tracking & Propagation

```typescript
interface DependencyGraph {
  // Compile-time pre-computed structure, runtime-instantiated
  createRuntime(): DependencyRuntime;
}

interface DependencyRuntime {
  // Wire a derived signal to its source signals
  wireDerived(exprId: ExprId, sourceRoots: ReadonlyArray<string>): SignalNode;

  // Wire a data source to its trigger dependencies
  wireDataSource(sourceId: SourceId, triggerRoots: ReadonlyArray<string>): SignalNode;

  // Wire a reaction observer
  wireReaction(reactionId: ReactionId, watchRoots: ReadonlyArray<string>): SignalNode;

  // Wire a projection binding: parent root → child root (for isolated scopes)
  wireProjection(
    parentScope: Scope,
    parentRoot: string,
    childScope: Scope,
    childRoot: string,
  ): SignalNode;

  // Propagate changes. Evaluation order: topological (dependents evaluated after their dependencies).
  propagate(changes: ReadonlyArray<RootChange>): ReadonlyArray<SignalId>;

  // Get the set of invalidated signal IDs after propagation
  getInvalidated(): ReadonlySet<SignalId>;

  // Self-write protection: suppress circular refresh
  suppressFor(sourceId: SourceId, roots: ReadonlyArray<string>): void;
}
```

### 4.6 Named Data Source

```typescript
interface DataSourceInstance {
  readonly id: SourceId;
  readonly signal: SignalNode;
  readonly state: DataSourceState;

  activate(scope: Scope): void;
  deactivate(): void;
  refresh(): Promise<DataSourceResult>;
  cancel(): void;
}

interface DataSourceState {
  readonly loading: boolean;
  readonly error: unknown | null;
  readonly data: unknown;
  readonly lastRefreshed: number | null;
}

type DataSourceResult =
  | { kind: 'success'; data: unknown }
  | { kind: 'error'; error: unknown }
  | { kind: 'cancelled' };

// ── Compiled Data Source (includes refresh strategy) ──

interface CompiledDataSource {
  readonly id: SourceId;
  readonly refreshStrategy: 'manual' | 'polling' | 'onDependency';
  readonly pollIntervalMs?: number;
  readonly triggerRoots: ReadonlyArray<string>; // for onDependency strategy
  readonly paramMapping?: ReadonlyMap<string, string>; // scopePath → paramName
  readonly ajaxConfig: AjaxConfig;
}

interface DataSourceManager {
  create(
    compiled: CompiledDataSource,
    scope: ReadableScope,
    dispatcher: EffectDispatcher,
  ): DataSourceInstance;
  dispose(sourceId: SourceId): void;
}
```

### 4.7 Reaction Observer

```typescript
interface ReactionInstance {
  readonly id: ReactionId;
  activate(scope: Scope, dispatcher: EffectDispatcher): void;
  deactivate(): void;
}

interface CompiledReaction {
  readonly id: ReactionId;
  readonly watchExpr: CompiledExpr; // expressions to watch
  readonly conditionExpr?: CompiledExpr; // when condition
  readonly action: CompiledAction; // action to dispatch
}

interface ReactionManager {
  activate(
    compiled: ReadonlyArray<CompiledReaction>,
    scope: Scope,
    dispatcher: EffectDispatcher,
  ): void;
  deactivate(scopeId: ScopeId): void;
}
```

---

## 5. Layer 4: Action & Effect Pipeline

### 5.1 Design: Effect-Calculus Action Pipeline

Actions are modeled using an **effect calculus** — a small algebra of action combinators that compose into complex control flows. The key insight is that the action schema in the requirements (single step, condition, chain, parallel, retry, debounce) forms a **recursive algebraic data type** that can be compiled into an execution plan.

### 5.2 Core Types

```typescript
// ── Action ADT (Compiled) ──

type CompiledAction =
  | { kind: 'dispatch'; action: string; args: ActionArgs }
  | { kind: 'sequence'; steps: ReadonlyArray<CompiledAction> }
  | { kind: 'parallel'; branches: ReadonlyArray<CompiledAction> }
  | { kind: 'guarded'; condition: ExprId; then: CompiledAction }
  | { kind: 'retry'; inner: CompiledAction; strategy: RetryStrategy }
  | { kind: 'debounce'; inner: CompiledAction; waitMs: number; key: string }
  | { kind: 'timeout'; inner: CompiledAction; ms: number }
  | {
      kind: 'chain';
      first: CompiledAction;
      then: ChainContinuation;
      onError?: ChainContinuation;
      finally?: CompiledAction;
    }
  | { kind: 'noop' };

type ActionArgs = Readonly<Record<string, unknown>>;

interface ChainContinuation {
  readonly action: CompiledAction;
  readonly resultBinding?: string; // bind prev result to scope path
}

// ── Action Result ──

type ActionResult =
  | { kind: 'success'; value: unknown }
  | { kind: 'error'; error: unknown }
  | { kind: 'skipped' };

// ── Action Execution Context ──

interface ActionContext {
  readonly scope: ReadableScope; // read-only — writes must go through dispatcher
  readonly result: unknown; // previous step result
  readonly error: unknown; // previous step error
  readonly prevResult: unknown; // result from two steps ago
  readonly nodeId: NodeId; // which node dispatched this action
  readonly dispatcher: EffectDispatcher;
}

// ── Effect Dispatcher (The Unified Side-Effect Channel) ──

interface EffectDispatcher {
  dispatch(effect: Effect): EffectHandle;
  createScope(originAction: ActionExecutionId): EffectScope;
}

// ── Effect Scope (groups all effects from a single action execution) ──

interface EffectScope {
  dispatch(effect: Effect): EffectHandle;
  commit(): Promise<ReadonlyArray<ActionResult>>; // wait for all dispatched effects
  rollback(): void; // discard uncommitted effects
  dispose(): void; // cleanup on scope disposal
}

// ── Effect Lifecycle ──

interface EffectHandle {
  readonly id: EffectId;
  readonly promise: Promise<ActionResult>;
  cancel(): void;
}

// ── Scope Lifecycle Guard ──
// When a scope is disposed, all pending effects targeting it are automatically cancelled.

type Effect =
  | { kind: 'setValue'; path: string; value: unknown; scopeId: ScopeId }
  | { kind: 'setValueBatch'; changes: ReadonlyArray<ScopeChange>; scopeId: ScopeId }
  | { kind: 'ajax'; config: AjaxConfig }
  | { kind: 'dialog'; surface: SurfaceCommand }
  | { kind: 'submitForm'; formId: string }
  | { kind: 'validate'; formId: string; paths?: string[] }
  | { kind: 'navigate'; url: string; options?: NavigateOptions }
  | { kind: 'notify'; message: string; level: 'info' | 'warn' | 'error' | 'success' }
  | { kind: 'component'; instanceKey: string; method: string; args: unknown[] }
  | { kind: 'namespace'; ns: string; method: string; args: unknown[] };

// ── Ordering Guarantees ──
// 1. Effects within a single action execution are applied sequentially in dispatch order.
// 2. Effects from parallel branches are queued and applied in branch-index order after
//    all branches complete (no concurrent writes to the same path).
// 3. Effects targeting a disposed scope are silently discarded.
```

### 5.3 Action Executor

```typescript
interface ActionExecutor {
  execute(action: CompiledAction, context: ActionContext): Promise<ActionResult>;
  cancel(actionId: ActionExecutionId): void;
}
```

The executor is a recursive interpreter over the `CompiledAction` ADT. Each combinator maps to a concrete execution strategy:

| Action Kind | Execution Strategy                                                      |
| ----------- | ----------------------------------------------------------------------- |
| `dispatch`  | Look up handler in `ActionRegistry`, invoke, return result              |
| `sequence`  | Execute steps in order, short-circuit on error                          |
| `parallel`  | `Promise.allSettled`, merge results                                     |
| `guarded`   | Evaluate condition; if falsy, return `skipped`                          |
| `chain`     | Execute `first`, then route to `then` or `onError` based on result kind |
| `retry`     | Exponential backoff loop with `RetryStrategy` parameters                |
| `debounce`  | `setTimeout`-based debounce with cancellation                           |
| `timeout`   | `Promise.race` with timeout signal                                      |

### 5.4 Effect Handler (Internal Glue)

The `EffectHandler` bridges the `EffectDispatcher` to `Scope._applyChange` and `DependencyRuntime.propagate`. This is an **internal kernel component**, not a public extension point.

```typescript
interface EffectHandler {
  handle(effect: Effect): Promise<ActionResult>;
}

// Built-in effect handler routing:
// setValue / setValueBatch → scope._applyChange → dependencyRuntime.propagate
// ajax → hostAdapter.httpClient.request
// dialog → surfaceManager.open/close
// submitForm → formRuntime.submit
// validate → formRuntime.validate
// navigate → hostAdapter.navigator.navigate
// notify → hostAdapter.notifier.show
// component → componentInstanceRegistry.invoke
// namespace → namespaceRegistry.invoke
```

### 5.5 Action Registry (Three-Layer Resolution)

```typescript
interface ActionRegistry {
  // Layer 1: Platform built-ins
  registerBuiltIn(name: string, handler: BuiltInActionHandler): void;

  // Layer 2: Component instance methods
  registerComponent(instanceKey: string, methods: ComponentMethods): void;
  unregisterComponent(instanceKey: string): void;

  // Layer 3: Namespace commands
  registerNamespace(ns: string, contract: NamespaceContract, methods: NamespaceMethods): void;
  unregisterNamespace(ns: string): void;

  // Resolution: tries built-in → component:method → namespace:method
  resolve(action: string, context: ActionContext): ActionHandler | null;
}

type ActionHandler = (args: ActionArgs, context: ActionContext) => Promise<ActionResult>;

interface NamespaceContract {
  readonly namespace: string;
  readonly methods: ReadonlyMap<string, MethodSignature>;
  readonly projections: ReadonlyMap<string, ExprType>; // read-only snapshot fields
}

interface MethodSignature {
  readonly name: string;
  readonly params: ReadonlyArray<ParamDef>;
  readonly returnType: ExprType;
}
```

---

## 6. Layer 5: Renderer Adapter Layer

### 6.1 Design: Framework-Portable Renderer Protocol

The renderer layer is an **adapter**, not the core. The kernel defines a rendering protocol that any UI framework can implement. The protocol is deliberately minimal — it describes _what to render_, not _how to render_.

### 6.2 Core Types

```typescript
// ── Renderer Registration ──

interface RendererRegistry {
  register(key: RendererKey, factory: RendererFactory): void;
  resolve(key: RendererKey): RendererFactory | null;
}

type RendererKey = string; // e.g., "page", "form", "input-text", "table"

interface RendererFactory {
  (host: RendererHost): RendererInstance;
}

// ── Renderer Instance ──

interface RendererInstance {
  readonly key: RendererKey;

  // Lifecycle
  mount(props: RendererProps, container: RenderContainer): void;
  update(props: RendererProps): void;
  unmount(): void;

  // Component instance methods (for action dispatch)
  getMethods(): ComponentMethods;

  // Debug
  getDebugInfo(): RendererDebugInfo;
}

// ── Renderer Props (The Contract Between Kernel and Renderers) ──

interface RendererProps {
  readonly nodeId: NodeId;
  readonly type: string;

  // Resolved values
  readonly props: Readonly<Record<string, unknown>>; // business attributes
  readonly meta: Readonly<RendererMeta>; // control metadata
  readonly events: Readonly<Record<string, EventHandler>>;
  readonly regions: Readonly<Record<string, RegionHandle>>;

  // Runtime access (scoped, not global; read-only scope access)
  readonly scope: ReadableScope;
  readonly dispatcher: EffectDispatcher;

  // Helpers
  readonly helpers: RendererHelpers;
}

interface RendererMeta {
  readonly visible: boolean;
  readonly disabled: boolean;
  readonly className: string;
  readonly testid: string;
}

// ── Region Handle (Pre-compiled child rendering) ──

interface RegionHandle {
  readonly name: string;
  readonly params: ReadonlyArray<string>; // ["item", "index"]

  // Render with local data binding
  render(bindings?: Readonly<Record<string, unknown>>): RenderResult;

  // Query
  isEmpty(): boolean;
  getChildren(): ReadonlyArray<NodeId>;
}

type RenderResult = unknown; // framework-specific (React elements, DOM nodes, etc.)

// ── Event Handler ──

type EventHandler = (event?: unknown) => void;

// ── Renderer Helpers ──

interface RendererHelpers {
  evaluate(exprId: ExprId): unknown;
  dispatch(action: CompiledAction): Promise<ActionResult>;
  createScope(options: ScopeCreateOptions): Scope;
  renderFragment(schema: unknown, scopeOverride?: Partial<Scope>): RenderResult;
}

// ── Renderer Host (Framework Bridge) ──

interface RendererHost {
  createElement(type: string, props: Record<string, unknown>, children: unknown[]): unknown;
  createFragment(children: unknown[]): unknown;

  // Batching: guaranteed to run after current synchronous execution completes.
  // Multiple scheduleUpdate calls within the same microtask may be batched.
  // The callback must not be called recursively.
  scheduleUpdate(callback: () => void): void;

  provideContext<T>(key: symbol, value: T): void;
  consumeContext<T>(key: symbol): T | undefined;

  // Error boundary: wrap a render call with fallback behavior
  wrapErrorBoundary(
    renderFn: () => RenderResult,
    fallback: (error: unknown, nodeId: NodeId) => RenderResult,
    nodeId: NodeId,
  ): RenderResult;
}
```

### 6.3 Renderer Orchestrator

```typescript
interface RendererOrchestrator {
  // Given a compiled schema, create the runtime rendering tree
  instantiate(artifact: CompiledSchema, rootScope: Scope): RenderTree;

  // Update an existing tree after scope changes
  reconcile(tree: RenderTree, invalidated: ReadonlySet<SignalId>): void;

  // Dispose the entire tree
  dispose(tree: RenderTree): void;
}

interface RenderTree {
  readonly rootId: NodeId;
  getNode(id: NodeId): RendererInstance | null;
  getActiveSurfaces(): ReadonlyArray<SurfaceHandle>;
}
```

---

## 7. Layer 6: Host Integration

### 7.1 Host Adapter

```typescript
interface HostAdapter {
  // Required capabilities (the host MUST provide these)
  readonly httpClient: HttpClient;
  readonly notifier: Notifier;
  readonly navigator: Navigator;

  // Optional capabilities
  readonly errorHandler?: ErrorHandler;
  readonly logger?: Logger;
  readonly performanceMonitor?: PerformanceMonitor;

  // Surface management
  createSurfaceContainer(type: 'dialog' | 'drawer'): SurfaceContainer;
}

interface HttpClient {
  request(config: AjaxConfig): Promise<AjaxResponse>;
  cancel(requestId: string): void;
}

interface Notifier {
  show(message: string, level: 'info' | 'warn' | 'error' | 'success'): void;
}

interface Navigator {
  navigate(url: string, options?: NavigateOptions): void;
}

interface ErrorHandler {
  handle(error: unknown, context: ErrorContext): void;
}

interface ErrorContext {
  readonly nodeId?: NodeId;
  readonly action?: string;
  readonly phase: 'compile' | 'evaluate' | 'action' | 'render';
}
```

### 7.2 Surface Manager

```typescript
interface SurfaceManager {
  open(schema: CompiledNode, scope: Scope, type: 'dialog' | 'drawer'): SurfaceHandle;
  close(handle: SurfaceHandle): void;
  getActiveStack(): ReadonlyArray<SurfaceHandle>;
  getTopActive(): SurfaceHandle | null;
}

interface SurfaceHandle {
  readonly id: SurfaceId;
  readonly type: 'dialog' | 'drawer';
  readonly scope: Scope;
  readonly tree: RenderTree;
  close(): void;
}
```

---

## 8. Form & Validation System

### 8.1 Form Runtime

```typescript
interface FormRuntime {
  readonly scope: Scope;
  readonly state: FormState;

  // Value management (internally routes through EffectDispatcher)
  getValue(path: string): unknown;
  setValue(path: string, value: unknown): void;
  getValues(): Record<string, unknown>;
  setValues(values: Record<string, unknown>, merge?: boolean): void;

  // Dirty/visited tracking
  isDirty(path?: string): boolean;
  isTouched(path?: string): boolean;
  markVisited(path: string): void;
  resetDirty(): void;

  // Validation
  validate(paths?: string[]): Promise<ValidationResult>;
  validateField(path: string): Promise<FieldValidation>;
  clearValidation(paths?: string[]): void;

  // Submission
  submit(): Promise<SubmitResult>;
  reset(): void;

  // Draft isolation
  createDraft(paths: string[]): DraftScope;
}

interface FormState {
  readonly submitting: boolean;
  readonly submitCount: number;
  readonly dirty: boolean;
  readonly valid: boolean;
  readonly errors: ReadonlyMap<string, FieldError[]>;
}

type SubmitResult =
  | { kind: 'success'; values: Record<string, unknown> }
  | { kind: 'validation-error'; errors: ValidationResult }
  | { kind: 'error'; error: unknown };
```

### 8.2 Validation Graph

```typescript
interface ValidationGraph {
  // Compiled at schema compile time
  readonly rules: ReadonlyMap<string, CompiledValidationRule[]>;
  readonly crossFieldRules: ReadonlyArray<CompiledCrossFieldRule>;
}

interface CompiledValidationRule {
  readonly path: string;
  readonly ruleType: string; // "required", "minLength", "pattern", etc.
  readonly params: unknown;
  readonly condition?: ExprId; // conditional activation
  readonly timing: ValidationTiming;
  readonly async?: boolean;
  readonly validatorRef: string; // reference to ValidatorProvider registry, NOT a closure
}

type ValidationTiming = 'submit' | 'change' | 'blur';

interface ValidatorFn {
  (value: unknown, context: ValidationContext): Promise<boolean> | boolean;
}

interface ValidationContext {
  readonly scope: Scope;
  readonly path: string;
  readonly formValues: Record<string, unknown>;
}

interface DraftScope {
  readonly scope: Scope;
  readonly validation: FormRuntime; // independent validation state
  commit(): void; // merge into parent form
  discard(): void; // throw away changes
}
```

---

## 9. Loop & Recursive Structures

### 9.1 Loop Runtime

```typescript
interface LoopRuntime {
  // Template is compiled once; this creates N instances
  instantiate(
    template: CompiledRegion,
    items: unknown[],
    parentScope: Scope,
    projections?: ExprId[],
  ): LoopInstance[];
}

interface LoopInstance {
  readonly index: number;
  readonly scope: Scope; // isolated, with { item, index } bound
  readonly region: RegionHandle; // pre-wired child rendering
  dispose(): void;
}
```

For recursive rendering, the template contains a self-reference marker that the `RendererOrchestrator` resolves lazily during rendering, with a depth limit enforced.

---

## 10. Dependency Injection & Kernel Assembly

### 10.1 Kernel Composition

```typescript
interface FluxKernel {
  readonly compiler: SchemaCompiler;
  readonly expressionEngine: ExpressionVM;
  readonly scopeFactory: ScopeTree;
  readonly dependencyGraph: DependencyGraph;
  readonly actionExecutor: ActionExecutor;
  readonly actionRegistry: ActionRegistry;
  readonly dataSourceManager: DataSourceManager;
  readonly rendererOrchestrator: RendererOrchestrator;
  readonly surfaceManager: SurfaceManager;
  readonly formFactory: FormFactory;

  // Lifecycle
  createRuntime(artifact: CompiledSchema, host: HostAdapter): SchemaRuntime;
  dispose(): void;
}

interface SchemaRuntime {
  readonly rootScope: Scope;
  readonly tree: RenderTree;

  // Debug
  inspect(nodeId: NodeId): NodeInspection;
  inspectScope(scopeId: ScopeId): ScopeSnapshot;

  // Lifecycle
  activate(): void;
  deactivate(): void;
  dispose(): void;
}

interface NodeInspection {
  readonly nodeId: NodeId;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly meta: RendererMeta;
  readonly scopeId: ScopeId;
  readonly children: NodeId[];
  readonly validationResult?: ValidationResult;
}

type FormFactory = (scope: Scope, validation: ValidationGraph) => FormRuntime;
```

### 10.2 Kernel Builder

```typescript
interface FluxKernelBuilder {
  // Register extensions
  addRenderer(key: RendererKey, factory: RendererFactory): this;
  addBuiltInAction(name: string, handler: BuiltInActionHandler): this;
  addNamespace(namespace: string, contract: NamespaceContract, methods: NamespaceMethods): this;

  // Configure
  setHostAdapter(adapter: HostAdapter): this;
  setExpressionCompiler(compiler: ExpressionCompiler): this;

  // Build
  build(): FluxKernel;
}
```

---

## 11. Data Flow: End-to-End Walkthrough

### 11.1 Initialization

```
Host provides:
  - JSON schema
  - HostAdapter (httpClient, notifier, navigator)
  - Initial data

Kernel:
  1. SchemaCompiler.compile(schema, context) → CompiledSchema
     - All expressions compiled to bytecode
     - All static props marked as 'static' (zero runtime cost)
     - Validation graph extracted
     - Action chains compiled to ADT
     - I18n keys validated and extracted as runtime PropSlots
     - Diagnostics emitted if errors

  2. FluxKernel.createRuntime(artifact, host)
     a. Create root ScopeTree with initial data
     b. DependencyGraph.createRuntime() — wire all derived signals
     c. DataSourceManager.activate() — start all auto-activating data sources
     d. ReactionManager.activate() — start all reaction observers
     e. RendererOrchestrator.instantiate() — create render tree
     f. Return SchemaRuntime
```

### 11.2 Runtime Event: User Clicks a Button

```
1. Renderer receives DOM click event
2. Renderer calls props.events.onClick(event)
3. EventHandler invokes ActionExecutor.execute(compiledAction, context)
4. Executor evaluates the CompiledAction ADT:
   a. Guarded: evaluate condition expression (read scope via EvalContext)
   b. Dispatch: resolve "ajax" action via ActionRegistry
   c. Effect: dispatcher.dispatch({ kind: 'ajax', config: ... })
   d. Host: httpClient.request(config) → response
   e. Chain: on success, evaluate `then` continuation
   f. Effect: dispatcher.dispatch({ kind: 'setValue', path, value, scopeId })
   g. EffectHandler: receives setValue effect, calls scope._applyChange(change)
   h. DependencyRuntime: propagate(RootChange[]) → invalidate affected signals
   i. RendererOrchestrator: reconcile invalidated signals → update affected renderers
```

### 11.3 Runtime Event: Data Source Auto-Refresh

```
1. DependencyGraph detects watched scope paths changed
2. Invalidates DataSourceInstance's trigger signal
3. DataSourceInstance.refresh() called
4. Effect: dispatcher.dispatch({ kind: 'ajax', config })
5. On success: dispatcher.dispatch({ kind: 'setValue', path, value, scopeId })
6. EffectHandler: scope._applyChange(change) → RootChange[]
7. Self-write protection: DependencyGraph.suppressFor(sourceId, roots)
8. Remaining dependents (expressions, renderers) are updated
```

---

## 12. Key Design Decisions & Rationale

### 12.1 Why a Bytecode VM for Expressions?

| Approach          | Pros                                                               | Cons                                                          |
| ----------------- | ------------------------------------------------------------------ | ------------------------------------------------------------- |
| AST-walking       | Simple implementation                                              | O(n) per evaluation, repeated traversal overhead              |
| `new Function`    | Fast execution                                                     | **Banned by requirements** (security), no dependency tracking |
| String templating | Simple for basic cases                                             | Cannot handle complex expressions, no type checking           |
| **Bytecode VM**   | O(1) dispatch, natural dependency logging, no eval, type-checkable | More complex initial implementation                           |

The bytecode VM is the only approach that satisfies all constraints: no dynamic code generation, compile-once-execute-many, natural dependency tracking, and type safety.

### 12.2 Why Effect-Calculus Actions?

Modeling actions as an algebraic data type with a recursive interpreter gives:

- **Composability**: Any action combinator can nest any other
- **Testability**: The entire action pipeline can be tested without side effects by mocking `EffectDispatcher`
- **Observability**: Every effect dispatch is a single interception point
- **Cancellation**: Every level of the action tree supports cancellation propagation

### 12.3 Why Root-Normalized Signal Propagation?

The requirements demand fine-grained invalidation, but path-lens granularity at the individual `items[3].name` level introduces three hard problems:

1. **Wildcard pattern matching** — `items[*].id` requires a matching engine
2. **Array mutation path mapping** — `splice(2, 0, x)` shifts all subsequent indices
3. **Glitch-free transitive propagation** — Must topologically sort evaluation

Root-normalized propagation normalizes all dependency tracking to the **lexical root** level (e.g., `items`, `user`). This means:

- An expression reading `items[3].name` registers dependency on root `items`
- A mutation to `items` (push, splice, reassign) notifies all `items` subscribers
- Subscribers re-evaluate and check if their actual value changed (reference equality)

This is slightly coarser than per-path tracking but:

- Eliminates wildcard matching entirely
- Makes array mutations a simple "invalidate root" operation
- Reduces the signal graph size from O(paths × expressions) to O(roots × expressions)
- Enables glitch-free propagation by evaluating in root-dependency topological order

The tradeoff: modifying `items[3].name` re-evaluates all expressions that read any `items[*]` path. This is acceptable because:

1. Table rows use **isolated scopes** — row mutations don't invalidate other rows
2. Root-level subscriptions are cheap to compare (structural sharing preserves references)
3. The alternative (per-path tracking) requires a complex matching engine that is itself a performance risk

### 12.4 Why Compile-Time / Runtime Split?

The requirements explicitly state:

> "If a problem can be solved at compile time, it should not be deferred to runtime."
> "Static parts should have zero runtime overhead."

This forces a strict phase separation:

| Phase       | Responsibilities                                                                                                         | Output                                |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------- |
| **Compile** | Parse, classify, compile expressions, build validation graph, compile actions, type-check, i18n key extraction, optimize | `CompiledSchema` (immutable artifact) |
| **Runtime** | Instantiate scopes, wire signals, execute actions, render                                                                | Dynamic behavior                      |

The compiled artifact is a **pure data structure** — it carries no closures, no references to runtime state. This means:

- The same artifact can be reused across multiple runtime instances
- Artifacts can be serialized for caching or server-side pre-compilation
- Hot module replacement only needs to re-compile, not re-bootstrap

### 12.5 Why Three-Layer Action Resolution?

The requirements specify three distinct action sources with different scoping rules:

| Layer     | Scope        | Lifetime                | Example                               |
| --------- | ------------ | ----------------------- | ------------------------------------- |
| Built-in  | Global       | Kernel lifetime         | `setValue`, `ajax`, `dialog`          |
| Component | Per-instance | Component mount/unmount | `table:reload`, `form:submit`         |
| Namespace | Per-scope    | Scope lifecycle         | `designer:export`, `spreadsheet:calc` |

The resolution order (built-in → component → namespace) ensures that platform capabilities are always available, component methods are scoped to instances, and namespace commands are scoped to their lexical boundary.

---

## 13. Performance Model

### 13.1 Cost Budget per Interaction Cycle

| Phase                    | Target                        | Mechanism                                         |
| ------------------------ | ----------------------------- | ------------------------------------------------- |
| Scope mutation           | O(changed paths)              | Persistent data structure with structural sharing |
| Dependency invalidation  | O(changed paths × dependents) | Pre-computed dependency graph                     |
| Expression re-evaluation | O(1) per expression           | Bytecode VM, register-based                       |
| Renderer reconciliation  | O(invalidated renderers)      | Only re-render nodes with invalidated props       |
| Full static subtree      | **Zero**                      | Static props never enter reactivity graph         |

### 13.2 Memory Model

| Object                    | Lifetime            | Sharing                                  |
| ------------------------- | ------------------- | ---------------------------------------- |
| `CompiledSchema`          | Kernel lifetime     | Shared across all instances              |
| `CompiledExpr` (bytecode) | Kernel lifetime     | Shared, never copied                     |
| `Scope`                   | Scope lifecycle     | Own data: owned; parent data: referenced |
| `SignalNode`              | Scope lifecycle     | Lightweight, GC'd with scope             |
| `RendererInstance`        | Component lifecycle | Owned by RenderTree                      |

### 13.3 High-Frequency Isolation (Table Rows)

For table/collection rendering:

1. Each row creates an **isolated scope** (no parent inheritance)
2. Row data is projected explicitly via `projections` config
3. Each row has its own **signal subgraph**
4. Modifying row N's data invalidates only row N's signals
5. The compiled column template is shared across all rows (compiled once, instantiated N times)

---

## 14. Testing Strategy

### 14.1 Layer Isolation Testing

| Layer                | Test Environment       | What to Test                                                          |
| -------------------- | ---------------------- | --------------------------------------------------------------------- |
| Schema Compiler      | Node.js / no DOM       | Compilation correctness, diagnostics, type checking                   |
| Expression VM        | Node.js / no DOM       | Expression evaluation, dependency logging, edge cases                 |
| Scope & Signal Graph | Node.js / no DOM       | Path resolution, change propagation, isolation, self-write protection |
| Action Executor      | Node.js / mock effects | Control flow (chain, parallel, retry, debounce), cancellation         |
| Renderer Adapter     | jsdom / test renderer  | Props resolution, region rendering, event dispatch                    |
| Form & Validation    | Node.js / no DOM       | Validation rules, timing, draft isolation, async validation           |

### 14.2 Integration Testing

```typescript
// Example: Full pipeline test without DOM
const kernel = createTestKernel();
const artifact = kernel.compiler.compile(schema, testContext());
const runtime = kernel.createRuntime(artifact, testHost());

// Dispatch effect to mutate scope (all writes go through effect channel)
const effectHandle = testDispatcher.dispatch({
  kind: 'setValue', path: 'user.name', value: 'Alice', scopeId: runtime.rootScope.id
});
await effectHandle.promise;

// Assert reactive update
const node = runtime.tree.getNode(inputNodeId);
expect(node.getDebugInfo().props.value).toBe('Alice');

// Dispatch action
const result = await kernel.actionExecutor.execute(
  compiledAction,
  { scope: runtime.rootScope, dispatcher: testDispatcher(), ... }
);
expect(result).toEqual({ kind: 'success', value: 'OK' });
```

---

## 15. Extensibility Points

The kernel is designed for extension without modification:

| Extension Point          | Mechanism                                     | Example                           |
| ------------------------ | --------------------------------------------- | --------------------------------- |
| New renderer             | `RendererRegistry.register()`                 | Custom chart renderer             |
| New built-in action      | `ActionRegistry.registerBuiltIn()`            | WebSocket send action             |
| New namespace            | `ActionRegistry.registerNamespace()`          | Spreadsheet calculation namespace |
| New expression function  | Extend expression compiler constant pool      | Custom date formatter             |
| New data source strategy | Implement `DataSourceInstance`                | WebSocket-based real-time source  |
| New validation rule      | Register `ValidatorFn` in `ValidatorProvider` | Custom business rule              |

---

## 16. Summary: What Makes This "Next-Generation"

1. **Bytecode VM expressions** — Industry-first in low-code runtimes. Eliminates eval, enables dependency tracking at the instruction level, and is WASM-portable.

2. **Compile-time dependency graph pre-computation** — The expression dependency structure is known before runtime. The runtime only instantiates, never discovers.

3. **Effect-calculus action pipeline** — Actions are an algebraic data type, not imperative callbacks. Every action is composable, observable, and cancellable.

4. **Root-normalized signal graph** — Dependencies tracked at normalized root granularity, not per-path. Enables glitch-free topological propagation, simple array mutation handling, and natural isolation for table rows without a complex wildcard matching engine.

5. **Framework-portable renderer protocol** — The kernel defines _what to render_, not _how_. React, Vue, Solid, or Web Components can all implement the `RendererHost` interface.

6. **Structural host integration** — The host provides capabilities through typed interfaces, not global singletons. The kernel never directly touches `fetch`, `window.location`, or `document`.

7. **Type-safe namespace contracts** — Domain controls declare their capabilities with full type information, enabling compile-time validation of action references.

8. **Zero-cost static parts** — Static props bypass the reactivity graph entirely. A pure-static page has the same performance characteristics as hand-written HTML.

````

---

## 16A. Appendix: Review Revisions

This design underwent one round of external architecture review. The following changes were made in response:

### Critical Issues Resolved

| Issue | Revision |
|-------|----------|
| Dual write path (Scope.propose + EffectDispatcher) | Removed `propose()` from Scope. Scope mutation is internal-only (`_applyChange`), called exclusively by the effect handler for `setValue`. All external writes go through `EffectDispatcher`. |
| Isolated scope projection propagation undefined | Added `DependencyRuntime.wireProjection()` to explicitly create reactive bindings from parent roots to child roots. Defined: `isolated: true` means `get()`/`has()` do not delegate to parent; projections are the only data channel. |
| Transitive signal glitch | Root-normalized propagation with topological evaluation order. Dependents are always evaluated after their dependencies. |

### Major Issues Resolved

| Issue | Revision |
|-------|----------|
| L1→L4 layer violation (CompileContext→ActionRegistry) | Split into `StaticActionContracts` (compile-time) and `ActionRegistry` (runtime). Compiler depends only on the static contract. Same split for `RendererRegistry`→`StaticRendererIndex`. |
| i18n at compile time prevents runtime locale switching | Changed from compile-time substitution to `{ kind: 'i18n'; key: string }` PropSlot. Compiler validates key existence; runtime resolves to current locale. |
| ValidatorFn closure breaks serializability | Replaced with `validatorRef: string`. Runtime looks up from `ValidatorProvider` registry. `CompiledValidationRule` is now pure data. |
| Effect system lacks transactional semantics | Added `EffectScope` to group effects from a single action. Defined ordering: sequential within action, branch-index order for parallel, silent discard for disposed scopes. |
| RendererHost lacks error boundaries | Added `wrapErrorBoundary()` method with nodeId tracking. |
| `scheduleUpdate` semantics undefined | Defined contract: post-synchronous, microtask-batched, non-recursive. |
| ActionContext exposes full Scope with write access | Changed to `ReadableScope` — writes must go through dispatcher. |
| `PathChange` doesn't capture array mutation info | Replaced with `RootChange` (root-normalized). Array mutations invalidate the root; subscribers re-evaluate and check reference equality. |
| Action debounce semantics underspecified | Added `key` field to debounce combinator. Key is scoped to `nodeId + actionSlot`. Cancelled invocations return `skipped`. |

### Accepted Limitations

| Issue | Rationale |
|-------|-----------|
| `RenderResult = unknown` | Framework portability requires opacity. The kernel cannot inspect React elements or Vue VNodes. This is by design. |
| No Suspense/concurrent mode support | Out of scope for the kernel protocol. Loading states are handled via conditional rendering and DataSourceState.loading. Framework-specific Suspense integration belongs in the React adapter, not the kernel protocol. |
| No general `race` combinator | `timeout` covers the primary use case. General race can be built as a custom action handler if needed. |

---

## 17. Appendix: Type Reference

### Branded ID Types

All IDs are branded string types for type safety:

```typescript
type NodeId = string & { __brand: 'NodeId' };
type ExprId = string & { __brand: 'ExprId' };
type ActionId = string & { __brand: 'ActionId' };
type RuleId = string & { __brand: 'RuleId' };
type SourceId = string & { __brand: 'SourceId' };
type ScopeId = string & { __brand: 'ScopeId' };
type SignalId = string & { __brand: 'SignalId' };
type EffectId = string & { __brand: 'EffectId' };
type ReactionId = string & { __brand: 'ReactionId' };
type SurfaceId = string & { __brand: 'SurfaceId' };
type ActionExecutionId = string & { __brand: 'ActionExecutionId' };
type RendererKey = string;
type Unsubscribe = () => void;
````

### Expression Types

```typescript
type ExprType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any' | 'void' | 'null';
```

### Network Types

```typescript
interface AjaxConfig {
  readonly url: string;
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly headers?: Readonly<Record<string, string>>;
  readonly params?: Readonly<Record<string, unknown>>;
  readonly body?: unknown;
  readonly timeout?: number;
  readonly withCredentials?: boolean;
}

interface AjaxResponse {
  readonly status: number;
  readonly data: unknown;
  readonly headers: Readonly<Record<string, string>>;
}

interface NavigateOptions {
  readonly replace?: boolean;
  readonly target?: string;
}
```

### Retry & Control Flow Types

```typescript
interface RetryStrategy {
  readonly maxAttempts: number;
  readonly delayMs: number;
  readonly backoff: 'fixed' | 'exponential';
  readonly maxDelayMs?: number;
}
```

### Schema Sub-Types

```typescript
interface LoopSchema {
  readonly sourceExpr: string; // expression producing the collection
  readonly itemName: string; // default: "item"
  readonly indexName: string; // default: "index"
  readonly isolated: boolean; // default: true
  readonly projections?: ReadonlyMap<string, string>;
}

interface NodeMetaSchema {
  readonly visible?: string; // expression or boolean
  readonly disabled?: string; // expression or boolean
  readonly className?: string;
  readonly testid?: string;
}

interface ScopeBinding {
  readonly createsScope: boolean;
  readonly isolated: boolean;
  readonly initialValues?: Readonly<Record<string, string>>; // expr sources
  readonly projections?: ReadonlyMap<string, string>;
}

type MetaSlot =
  | { kind: 'static-visible'; value: boolean }
  | { kind: 'dynamic-visible'; exprId: ExprId }
  | { kind: 'static-disabled'; value: boolean }
  | { kind: 'dynamic-disabled'; exprId: ExprId }
  | { kind: 'static-class'; value: string }
  | { kind: 'dynamic-class'; exprId: ExprId };
```

### Registry & Provider Types

```typescript
type BuiltInActionHandler = (args: ActionArgs, context: ActionContext) => Promise<ActionResult>;
type ComponentMethods = Readonly<Record<string, (...args: unknown[]) => unknown>>;
type NamespaceMethods = Readonly<Record<string, (...args: unknown[]) => Promise<unknown>>>;
type ActionHandler = (args: ActionArgs, context: ActionContext) => Promise<ActionResult>;

interface ValidatorProvider {
  resolve(ref: string): ValidatorFn;
}

type ValidatorFn = (value: unknown, context: ValidationContext) => Promise<boolean> | boolean;

interface I18nResolver {
  hasKey(key: string): boolean;
  resolve(key: string, locale: string): string;
}

interface PropSchema {
  readonly name: string;
  readonly type: ExprType;
  readonly required?: boolean;
  readonly defaultValue?: unknown;
}

interface ParamDef {
  readonly name: string;
  readonly type: ExprType;
  readonly required?: boolean;
}
```

### Validation Types

```typescript
interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyMap<string, FieldError[]>;
}

interface FieldValidation {
  readonly valid: boolean;
  readonly errors: FieldError[];
}

interface FieldError {
  readonly ruleType: string;
  readonly message: string;
  readonly params?: unknown;
}

interface CompiledCrossFieldRule {
  readonly paths: ReadonlyArray<string>;
  readonly ruleType: string;
  readonly validatorRef: string;
  readonly params: unknown;
  readonly condition?: ExprId;
  readonly timing: ValidationTiming;
}
```

### Debug Types

```typescript
interface RendererDebugInfo {
  readonly nodeId: NodeId;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly meta: RendererMeta;
  readonly scopeId: ScopeId;
}

interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

interface PerformanceMonitor {
  startMeasure(label: string): void;
  endMeasure(label: string): number;
}
```

### Surface Types

```typescript
type SurfaceCommand =
  | {
      action: 'open';
      type: 'dialog' | 'drawer';
      schema: CompiledNode;
      data?: Record<string, unknown>;
    }
  | { action: 'close'; surfaceId: SurfaceId };

interface SurfaceContainer {
  readonly element: unknown; // framework-specific container element
  dispose(): void;
}

interface RenderContainer {
  readonly element: unknown;
}
```
