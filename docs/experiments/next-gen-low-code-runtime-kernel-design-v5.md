# Next-Generation Low-Code Runtime Kernel Design (v5)

> **Status**: Experimental design  
> **Author**: AI Assistant  
> **Date**: 2026-04-20  
> **Revision**: 2 (post-review)  
> **Scope**: Core kernel interface design based solely on requirements specification

---

## Design Philosophy

This design is built from first principles, aiming to create the world's most advanced low-code runtime kernel. The core insight is that a low-code runtime is fundamentally an **algebraic interpreter** operating over a **reactive value graph** with **lexically-scoped ownership**.

### Guiding Principles

1. **Algebraic Completeness**: Every concept has a precise algebraic definition with clear composition rules
2. **Signal-First Reactivity**: All dynamic values are signals; composition is automatic
3. **Lexical Ownership**: Resources, capabilities, and side effects follow lexical scope boundaries
4. **Compilation Purity**: The compiler produces pure, immutable execution artifacts
5. **Effect Channeling**: All side effects flow through explicit effect channels
6. **Zero-Cost Statics**: Static schema parts incur zero runtime overhead

---

## Part 1: Core Algebraic Model

### 1.1 The Universal Value Algebra

All schema values reduce to a single algebraic type:

```typescript
/**
 * Universal Value - the fundamental building block of all schema values.
 * 
 * Value is an algebraic sum type that unifies all possible value forms:
 * - Static: compile-time known, zero runtime cost
 * - Dynamic: runtime-evaluated via signal graph
 */
type Value<T> =
  | { tag: 'literal'; value: T }
  | { tag: 'expr'; compute: Signal<T> }
  | { tag: 'template'; segments: Array<string | Signal<string>> }
  | { tag: 'resource'; ref: ResourceRef<T> }
  | { tag: 'projection'; source: ProjectionSource; path: PropertyPath }

/**
 * Signal - the reactive primitive.
 * 
 * A signal is a time-varying value with automatic dependency tracking.
 * Signals form a directed acyclic graph (DAG) where:
 * - Leaves are sources (user input, API response, clock tick)
 * - Intermediate nodes are derived (computed from other signals)
 * - Reading a signal during computation establishes a dependency edge
 */
interface Signal<T> {
  /** Current value snapshot - triggers dependency tracking when called in reactive context */
  readonly current: T
  
  /** Version number for cheap equality checks */
  readonly version: number
  
  /** Subscribe to changes - returns unsubscribe function */
  subscribe(listener: SignalListener<T>): () => void
}

/**
 * SignalListener - receives change notifications with path information.
 * 
 * This satisfies requirement 2.3: "数据变更应向订阅者通知具体变更了哪些路径"
 */
interface SignalListener<T> {
  (value: T, changedPaths?: PropertyPath[]): void
}

/**
 * All Values compile to one of two forms at execution time:
 * - Static<T>: T value known at compile time
 * - Reactive<T>: Signal<T> evaluated at runtime
 */
type CompiledValue<T> =
  | { tag: 'static'; value: T }
  | { tag: 'reactive'; signal: Signal<T> }
```

### 1.2 The Scope Algebra

Scopes form a tree with lexical inheritance and isolation capabilities:

```typescript
/**
 * ScopeRef - read-only view into a lexical data environment.
 * 
 * Key design decisions:
 * 1. Scopes are IMMUTABLE snapshots - writes go through ScopeWriter
 * 2. Scopes support LEXICAL SHADOWING - child bindings hide parent bindings
 * 3. Scopes can be ISOLATED - opt-out of parent inheritance for performance
 * 4. Every read is TRACKED - dependency graph is built automatically
 */
interface ScopeRef {
  /** 
   * Resolve a value by path, respecting lexical chain.
   * Returns undefined if path doesn't exist.
   * SIDE EFFECT: Registers dependency in active tracking context.
   */
  resolve<T>(path: PropertyPath): T | undefined
  
  /** Check if path exists without registering dependency */
  has(path: PropertyPath): boolean
  
  /** Get parent scope (undefined for root) */
  readonly parent: ScopeRef | undefined
  
  /** Scope identity for comparison and caching */
  readonly id: ScopeId
}

/**
 * PropertyPath - typed path into a scope.
 * 
 * Paths are compiled at load time to arrays for fast traversal.
 * Example: "user.profile.name" -> ['user', 'profile', 'name']
 */
type PropertyPath = readonly string[]

/**
 * ScopePatch - structured description of scope changes.
 * 
 * Patches enable:
 * 1. Fine-grained change notification (which paths changed)
 * 2. Atomic multi-path updates
 * 3. Change recording for undo/redo
 */
interface ScopePatch {
  /** Changed paths with their new values */
  readonly changes: ReadonlyArray<{
    path: PropertyPath
    value: unknown
    previousValue?: unknown
  }>
  
  /** Timestamp of the patch */
  readonly timestamp: number
  
  /** Source identifier for self-write protection */
  readonly sourceId?: string
}

/**
 * ScopeWriter - exclusive write channel for a scope.
 * 
 * Design: Writers are capabilities, not methods on ScopeRef.
 * This enforces read/write separation at the type level.
 */
interface ScopeWriter {
  /** Set value at path, returns patch descriptor */
  set(path: PropertyPath, value: unknown, sourceId?: string): ScopePatch
  
  /** Apply structured patch */
  patch(patch: ScopePatch): void
  
  /** Batch multiple writes into single notification */
  batch<R>(fn: () => R): R
}

/**
 * ScopeFactory - creates scopes with controlled inheritance.
 */
interface ScopeFactory {
  /** Create child scope inheriting from parent */
  createChild(parent: ScopeRef | undefined, initial?: Record<string, unknown>): [ScopeRef, ScopeWriter]
  
  /** Create isolated scope (no parent inheritance) */
  createIsolated(initial?: Record<string, unknown>): [ScopeRef, ScopeWriter]
  
  /** Create scope with explicit projections from parent */
  createWithProjection(parent: ScopeRef, projections: ProjectionSpec[]): [ScopeRef, ScopeWriter]
}

/**
 * ProjectionSpec - explicit data projection for isolated scopes.
 * 
 * Used when isolated scopes need selected parent data without full inheritance.
 */
interface ProjectionSpec {
  from: PropertyPath  // Source path in parent
  to: PropertyPath    // Target path in child
  watch?: boolean     // Whether to track changes (default: true)
}
```

### 1.3 The Effect Algebra

All side effects flow through typed effect channels:

```typescript
/**
 * Effect - algebraic representation of a side effect.
 * 
 * Effects are DATA, not functions. This enables:
 * - Serialization/logging
 * - Composition/transformation
 * - Testing without execution
 * - Static analysis
 */
type Effect =
  | { tag: 'scope:write'; target: ScopeId; patch: ScopePatch }
  | { tag: 'api:request'; spec: ApiSpec; onResult: EffectContinuation }
  | { tag: 'navigate'; route: Route }
  | { tag: 'surface:open'; spec: SurfaceSpec }
  | { tag: 'surface:close'; id: SurfaceId; result?: unknown }
  | { tag: 'component:invoke'; target: ComponentHandle; method: string; args: unknown[] }
  | { tag: 'domain:dispatch'; namespace: string; action: string; args: unknown[] }
  | { tag: 'batch'; effects: Effect[] }
  | { tag: 'sequence'; first: Effect; then: (result: unknown) => Effect }
  | { tag: 'parallel'; effects: Effect[]; merge: (results: unknown[]) => unknown }
  | { tag: 'conditional'; guard: Signal<boolean>; effect: Effect }

/**
 * EffectContinuation - what to do with effect result.
 */
type EffectContinuation =
  | { tag: 'publish'; target: ScopeId; path: PropertyPath }
  | { tag: 'chain'; next: (result: unknown) => Effect }
  | { tag: 'ignore' }

/**
 * EffectRunner - executes effects.
 * 
 * This is the ONLY place where actual side effects happen.
 * Provided by RenderEnv, not created by kernel.
 */
interface EffectRunner {
  /** Execute an effect, returning a promise of the result */
  run<T>(effect: Effect): Promise<EffectResult<T>>
}

/**
 * EffectResult - outcome of effect execution.
 */
type EffectResult<T> =
  | { tag: 'success'; value: T }
  | { tag: 'failure'; error: EffectError }
  | { tag: 'skipped'; reason: string }
  | { tag: 'cancelled' }

/**
 * EffectError - structured error from effect execution.
 */
interface EffectError {
  readonly code: string
  readonly message: string
  readonly cause?: unknown
  readonly recoverable: boolean
}
```

---

## Part 2: Compilation Model

### 2.1 Schema Compiler Interface

```typescript
/**
 * SchemaCompiler - transforms authoring schema to execution schema.
 * 
 * This is the entry point for the compilation pipeline.
 */
interface SchemaCompiler {
  /** Compile authoring schema to execution tree */
  compile(schema: AuthoringSchema, options?: CompileOptions): CompileResult
  
  /** Compile a single expression */
  compileExpression<T>(source: string): SignalFactory<T>
  
  /** Compile a template string */
  compileTemplate(source: string): SignalFactory<string>
}

/**
 * CompileOptions - compilation configuration.
 */
interface CompileOptions {
  /** Enable debug info in output */
  readonly debug?: boolean
  
  /** Locale for i18n substitution */
  readonly locale?: string
  
  /** Renderer registry for type resolution */
  readonly renderers: RendererRegistry
}

/**
 * CompileResult - output of compilation.
 */
interface CompileResult {
  /** Compiled execution tree */
  readonly root: ExecutionNode
  
  /** Compilation diagnostics */
  readonly diagnostics: readonly Diagnostic[]
  
  /** Whether compilation succeeded (no errors) */
  readonly success: boolean
}

/**
 * AuthoringSchema - input schema format.
 * 
 * This is the JSON/DSL format authored by users/designers.
 * It contains all the authoring conveniences that get compiled away.
 */
interface AuthoringSchema {
  readonly type: string
  readonly [key: string]: unknown
}
```

### 2.2 Schema Compilation Pipeline

```typescript
/**
 * Compilation transforms AuthoringSchema into ExecutionSchema.
 * 
 * Pipeline stages:
 * 1. Parse: JSON -> AuthoringSchema (with source locations)
 * 2. Validate: Type check, reference resolution
 * 3. Transform: i18n substitution (compile-time), defaults, permission pruning
 * 4. Compile: AuthoringSchema -> ExecutionSchema
 * 5. Optimize: Dead code elimination, constant folding
 * 
 * NOTE: i18n substitution happens at compile time per requirement 5:
 * "国际化字符串替换在编译阶段完成，不影响运行时行为"
 * RenderHelpers.t() is only for dynamic keys that cannot be resolved at compile time.
 */

/**
 * ExecutionNode - compiled, immutable execution unit.
 * 
 * Key insight: Nodes are TEMPLATES, not instances.
 * Runtime creates instances from templates.
 */
interface ExecutionNode {
  /** Node type identifier */
  readonly type: string
  
  /** Unique node identity (stable across recompilation) */
  readonly id: NodeId
  
  /** Pre-resolved renderer for this node type */
  readonly renderer: RendererRef
  
  /** Compiled props - mix of static and reactive */
  readonly props: CompiledProps
  
  /** Compiled meta (visible, disabled, className) */
  readonly meta: CompiledMeta
  
  /** Pre-compiled child regions */
  readonly regions: Record<string, CompiledRegion>
  
  /** Pre-compiled event handlers */
  readonly events: Record<string, CompiledAction>
  
  /** Validation rules for this node */
  readonly validations: CompiledValidation[]
  
  /** Data sources owned by this node */
  readonly dataSources: CompiledDataSource[]
  
  /** Reactions owned by this node */
  readonly reactions: CompiledReaction[]
  
  /** Scope specification for this node */
  readonly scopeSpec: ScopeSpec
  
  /** Loop specification (if this is a loop node) */
  readonly loop?: CompiledLoop
  
  /** Recursive reference (if this node references another definition) */
  readonly nodeRef?: NodeRef
}

/**
 * CompiledProps - prop values categorized at compile time.
 */
interface CompiledProps {
  /** Static props - object literal, zero runtime cost */
  readonly statics: Record<string, unknown>
  
  /** Reactive props - each is a Signal factory */
  readonly reactives: Record<string, SignalFactory<unknown>>
}

/**
 * CompiledMeta - control metadata.
 */
interface CompiledMeta {
  readonly visible: CompiledValue<boolean>
  readonly disabled: CompiledValue<boolean>
  readonly className: CompiledValue<string>
  readonly testid?: string
}

/**
 * CompiledRegion - pre-compiled child region.
 */
interface CompiledRegion {
  /** Child nodes in this region */
  readonly children: ExecutionNode[]
  
  /** 
   * Parameters this region accepts (for slots).
   * These become available in child scope under $slot namespace.
   * Example: params: ['item', 'index'] -> accessible as $slot.item, $slot.index
   */
  readonly params: readonly string[]
  
  /** Whether to isolate child scopes */
  readonly isolated: boolean
}

/**
 * CompiledLoop - loop/iteration specification.
 * 
 * Addresses requirement 2.12: loop节点根据集合数据动态展开子节点
 */
interface CompiledLoop {
  /** Source collection expression */
  readonly source: SignalFactory<unknown[]>
  
  /** Variable name for current item (default: 'item') */
  readonly itemVar: string
  
  /** Variable name for index (default: 'index') */
  readonly indexVar: string
  
  /** Key extraction for stable identity */
  readonly keyExpr?: SignalFactory<string | number>
  
  /** Template node to instantiate for each item */
  readonly template: ExecutionNode
  
  /** Whether loop scopes are isolated (default: true for performance) */
  readonly isolated: boolean
}

/**
 * NodeRef - reference to another node definition for recursion.
 * 
 * Addresses requirement 2.12: 支持节点引用自身或祖先的结构定义
 */
interface NodeRef {
  /** Reference type */
  readonly type: 'self' | 'named'
  
  /** Named reference target (for named refs) */
  readonly name?: string
  
  /** Maximum recursion depth (safety limit) */
  readonly maxDepth: number
}

/**
 * SignalFactory - creates signals from scope context.
 * 
 * Design: Factories are compiled once, signals are instantiated per scope.
 */
type SignalFactory<T> = (scope: ScopeRef, actionScope: ActionScope) => Signal<T>

/**
 * ScopeSpec - how this node affects the scope chain.
 */
type ScopeSpec =
  | { tag: 'inherit' }  // Use parent scope directly
  | { tag: 'extend'; initial: Record<string, Value<unknown>> }  // Create child scope
  | { tag: 'isolate'; initial: Record<string, Value<unknown>>; projections: ProjectionSpec[] }
```

### 2.3 Expression Compilation

```typescript
/**
 * ExpressionCompiler - compiles expression strings to signal factories.
 * 
 * Key requirements:
 * - NO dynamic code generation (eval, new Function, with)
 * - Compiled once, executed many times
 * - Type-safe variable resolution
 */
interface ExpressionCompiler {
  /** Compile expression string to signal factory */
  compile<T>(source: string): SignalFactory<T>
  
  /** Compile template string with embedded expressions */
  compileTemplate(source: string): SignalFactory<string>
}

/**
 * Compiled expression is an AST interpreter with pre-bound operations.
 * 
 * Example: "${user.name + ' - ' + user.role}"
 * Compiles to:
 *   BinaryOp(
 *     BinaryOp(PathRef(['user', 'name']), '+', Literal(' - ')),
 *     '+',
 *     PathRef(['user', 'role'])
 *   )
 * 
 * Special path prefixes:
 * - $slot.xxx -> Region parameter access (bound during region render)
 * - $result -> Previous action result (in action chains)
 * - $error -> Previous action error (in onError handlers)
 */
type CompiledExpr =
  | { tag: 'literal'; value: unknown }
  | { tag: 'path'; path: PropertyPath }
  | { tag: 'slot'; name: string }  // $slot.xxx access
  | { tag: 'unary'; op: UnaryOp; operand: CompiledExpr }
  | { tag: 'binary'; op: BinaryOp; left: CompiledExpr; right: CompiledExpr }
  | { tag: 'ternary'; condition: CompiledExpr; consequent: CompiledExpr; alternate: CompiledExpr }
  | { tag: 'call'; fn: BuiltinFunction; args: CompiledExpr[] }
  | { tag: 'member'; object: CompiledExpr; property: string | CompiledExpr }
  | { tag: 'array'; elements: CompiledExpr[] }
  | { tag: 'object'; properties: Array<[string | CompiledExpr, CompiledExpr]> }
```

---

## Part 3: Runtime Kernel

### 3.1 Core Runtime Interface

```typescript
/**
 * RenderEnv - static environment provided by host.
 * 
 * CRITICAL DESIGN DECISION:
 * RenderEnv is STATIC and IMMUTABLE after initialization.
 * All capabilities are accessed DIRECTLY from RenderEnv by kernel internals.
 * Kernel MUST NOT create internal facades or wrappers around these.
 * 
 * CLARIFICATION ON RENDERER ACCESS:
 * Renderers do NOT access RenderEnv directly. The kernel's rendering pipeline
 * uses RenderEnv to prepare RendererProps, which is passed to renderers.
 * This is NOT a facade - it's a one-time props assembly per render, not
 * a persistent wrapper object.
 */
interface RenderEnv {
  /** Execute effects - DIRECT ACCESS, no wrapper */
  readonly effectRunner: EffectRunner
  
  /** Scope factory - DIRECT ACCESS */
  readonly scopeFactory: ScopeFactory
  
  /** Network requests - DIRECT ACCESS */
  readonly apiClient: ApiClient
  
  /** Notifications - DIRECT ACCESS */
  readonly notifier: Notifier
  
  /** Navigation - DIRECT ACCESS */
  readonly navigator: Navigator
  
  /** Component handle registry - DIRECT ACCESS */
  readonly componentRegistry: ComponentHandleRegistry
  
  /** Renderer registry - DIRECT ACCESS */
  readonly rendererRegistry: RendererRegistry
  
  /** Expression compiler - DIRECT ACCESS */
  readonly exprCompiler: ExpressionCompiler
  
  /** i18n - DIRECT ACCESS (for dynamic keys only; static keys resolved at compile time) */
  readonly i18n: I18n
  
  /** Error handler - DIRECT ACCESS */
  readonly errorHandler: ErrorHandler
  
  /** Debug mode flag */
  readonly debug: boolean
}

/**
 * RuntimeKernel - the core execution engine.
 * 
 * Design: Kernel is a pure function from (ExecutionNode, RenderEnv) to RenderOutput.
 * It maintains NO global state. All state is scoped.
 */
interface RuntimeKernel {
  /** 
   * Create a runtime session for an execution tree.
   * Session manages all scoped state for that tree.
   */
  createSession(root: ExecutionNode, env: RenderEnv, initialData?: Record<string, unknown>): RuntimeSession
}

/**
 * RuntimeSession - manages state for a rendered tree.
 * 
 * Sessions are the ONLY stateful objects in the kernel.
 * One session per rendered schema tree.
 */
interface RuntimeSession {
  /** Root scope for this session */
  readonly rootScope: ScopeRef
  
  /** Root scope writer */
  readonly rootWriter: ScopeWriter
  
  /** Root action scope for this session */
  readonly rootActionScope: ActionScope
  
  /** Render the tree, returning render output */
  render(): RenderOutput
  
  /** Dispose session, cleanup all resources */
  dispose(): void
  
  /** Subscribe to session-level events */
  subscribe(event: SessionEvent, handler: SessionEventHandler): () => void
  
  /** Surface manager for this session */
  readonly surfaces: SurfaceManager
  
  /** DevTools integration */
  readonly devTools: DevToolsIntegration
}

/**
 * RenderOutput - framework-agnostic render result.
 * 
 * The actual type depends on the rendering host:
 * - React: ReactNode
 * - Vue: VNode
 * - Vanilla: DocumentFragment or render descriptor
 * 
 * The kernel produces RenderOutput; the host interprets it.
 */
type RenderOutput = unknown  // Host-defined

/**
 * SessionEvent - events emitted by runtime session.
 */
type SessionEvent = 
  | 'mounted'
  | 'unmounted'
  | 'error'
  | 'action:start'
  | 'action:end'
  | 'scope:change'

type SessionEventHandler = (payload: unknown) => void
```

### 3.2 ActionScope - Lexical Capability Resolution

```typescript
/**
 * ActionScope - lexical scope for action/capability resolution.
 * 
 * This satisfies design principle 5 (Lexical Ownership):
 * "数据查找（ScopeRef）、行为查找（ActionScope）、实例定位（ComponentHandleRegistry）
 * 是架构上分离的三种解析机制"
 * 
 * ActionScope parallels ScopeRef but for capability/namespace resolution.
 */
interface ActionScope {
  /** Resolve a namespaced action handler */
  resolveAction(namespace: string, action: string): ActionHandler | undefined
  
  /** Check if namespace exists in this scope chain */
  hasNamespace(namespace: string): boolean
  
  /** Get parent action scope */
  readonly parent: ActionScope | undefined
  
  /** Scope identity */
  readonly id: ActionScopeId
  
  /** Register a namespace in this scope (for domain bridges) */
  registerNamespace(namespace: string, bridge: DomainBridge): () => void
}

/**
 * ActionHandler - resolved action handler.
 */
type ActionHandler = (args: Record<string, unknown>, context: ActionContext) => Promise<ActionResult>

/**
 * NOTE: While DomainRegistry exists for global/host-level domain registration,
 * ActionScope enables LEXICAL namespace registration. A domain bridge registered
 * in a subtree's ActionScope is only visible to that subtree and its descendants.
 * This supports patterns like:
 * - Global domains: registered in root ActionScope
 * - Local domains: registered in component's ActionScope
 */
```

### 3.3 Reactive Execution Model

```typescript
/**
 * ReactiveRuntime - provides reactive primitives.
 * 
 * NOTE: There is no global ReactiveContext.current. Instead, dependency
 * tracking is managed via explicit context passing or closure capture.
 * This avoids async context corruption issues.
 */
interface ReactiveRuntime {
  /** Create a writable signal (source) */
  createSignal<T>(initial: T): [Signal<T>, SignalSetter<T>]
  
  /** Create a derived signal */
  createComputed<T>(compute: (track: TrackFn) => T): Signal<T>
  
  /** Create a side effect */
  createEffect(effect: (track: TrackFn) => void | (() => void)): Disposable
  
  /** Batch multiple signal updates */
  batch<R>(fn: () => R): R
  
  /** Create a disposable group for managing multiple subscriptions */
  createDisposableGroup(): DisposableGroup
}

/**
 * TrackFn - explicit dependency tracking function.
 * 
 * Design: Instead of implicit thread-local context, tracking is explicit.
 * This is safer for async operations.
 */
type TrackFn = <T>(signal: Signal<T>) => T

/**
 * SignalSetter - function to update a signal value.
 */
type SignalSetter<T> = (value: T | ((prev: T) => T), sourceId?: string) => void

/**
 * Disposable - resource that can be disposed.
 */
interface Disposable {
  dispose(): void
}

/**
 * DisposableGroup - manages multiple disposables.
 * 
 * Addresses review issue 10: batch unsubscribe pattern.
 */
interface DisposableGroup extends Disposable {
  /** Add a disposable to the group */
  add(disposable: Disposable): void
  
  /** Add an unsubscribe function */
  addFn(unsubscribe: () => void): void
  
  /** Get count of managed disposables */
  readonly size: number
}

/**
 * Factory functions - convenience exports.
 */
declare function createSignal<T>(initial: T): [Signal<T>, SignalSetter<T>]
declare function createComputed<T>(compute: (track: TrackFn) => T): Signal<T>
declare function createEffect(effect: (track: TrackFn) => void | (() => void)): Disposable
declare function batch<T>(fn: () => T): T
```

### 3.4 Resource Management

```typescript
/**
 * Resource - managed data producer with lifecycle.
 * 
 * Resources are the bridge between external data (API, computation)
 * and the scope data environment.
 */
interface Resource<T> {
  /** Current value signal */
  readonly value: Signal<T | undefined>
  
  /** Loading state */
  readonly loading: Signal<boolean>
  
  /** Error state */
  readonly error: Signal<EffectError | undefined>
  
  /** Resource unique ID (for self-write protection) */
  readonly id: string
  
  /** Manually refresh the resource */
  refresh(): void
  
  /** Dispose the resource */
  dispose(): void
}

/**
 * CompiledDataSource - resource specification from schema.
 */
interface CompiledDataSource {
  /** Unique name for this data source */
  readonly name: string
  
  /** Target path in scope to publish value */
  readonly target: PropertyPath
  
  /** How to produce the value */
  readonly producer: DataProducer
  
  /** When to refresh */
  readonly refreshOn: RefreshTrigger
  
  /** 
   * Self-write protection - ignore changes caused by own writes.
   * 
   * Implementation: When the resource writes to scope, it includes its ID
   * as sourceId in the ScopePatch. When evaluating whether to refresh,
   * if the triggering patch has the same sourceId, the refresh is skipped.
   */
  readonly selfWriteProtection: boolean
}

/**
 * DataProducer - how to produce data.
 */
type DataProducer =
  | { tag: 'api'; spec: CompiledApiSpec }
  | { tag: 'computed'; compute: SignalFactory<unknown> }
  | { tag: 'static'; value: unknown }

/**
 * RefreshTrigger - when to refresh data.
 */
type RefreshTrigger =
  | { tag: 'manual' }
  | { tag: 'interval'; ms: number }
  | { tag: 'dependencies'; paths: PropertyPath[] }
  | { tag: 'event'; event: string }
```

### 3.5 Reaction System

```typescript
/**
 * CompiledReaction - reactive side effect specification.
 * 
 * Reactions bridge the gap between value changes and effects.
 * They are NOT automatic - they require explicit declaration.
 */
interface CompiledReaction {
  /** Watch expression - when this changes, evaluate condition */
  readonly watch: SignalFactory<unknown>
  
  /** Condition - must be true to trigger action */
  readonly when: SignalFactory<boolean>
  
  /** Action to execute when triggered */
  readonly action: CompiledAction
  
  /** Debounce in milliseconds */
  readonly debounce?: number
  
  /** Skip initial evaluation */
  readonly skipInitial?: boolean
}

/**
 * ReactionInstance - runtime instance of a reaction.
 */
interface ReactionInstance {
  /** Current state */
  readonly state: Signal<ReactionState>
  
  /** Pause the reaction */
  pause(): void
  
  /** Resume the reaction */
  resume(): void
  
  /** Dispose the reaction */
  dispose(): void
}

type ReactionState = 'active' | 'paused' | 'disposed'
```

---

## Part 4: Action System

### 4.1 Action Algebra

```typescript
/**
 * CompiledAction - pre-compiled action specification.
 * 
 * Actions form an algebra:
 * - Primitive: single dispatch
 * - Guarded: conditional execution
 * - Sequential: then/onError chaining
 * - Parallel: concurrent execution
 * 
 * The algebra is closed under composition.
 */
type CompiledAction =
  | { tag: 'dispatch'; action: ActionSpec }
  | { tag: 'guarded'; when: SignalFactory<boolean>; action: CompiledAction }
  | { tag: 'sequence'; first: CompiledAction; then?: CompiledAction; onError?: CompiledAction }
  | { tag: 'parallel'; actions: CompiledAction[]; merge?: MergeStrategy }
  | { tag: 'retry'; action: CompiledAction; policy: RetryPolicy }
  | { tag: 'timeout'; action: CompiledAction; ms: number }
  | { tag: 'debounce'; action: CompiledAction; ms: number }

/**
 * ActionSpec - specification for a single action dispatch.
 */
interface ActionSpec {
  /** Action identifier */
  readonly action: string
  
  /** Arguments - mix of static and dynamic */
  readonly args: Record<string, CompiledValue<unknown>>
  
  /** Target for component/namespace actions */
  readonly target?: ActionTarget
}

/**
 * ActionTarget - where to dispatch the action.
 */
type ActionTarget =
  | { tag: 'builtin' }  // Platform built-in action
  | { tag: 'component'; handle: ComponentHandleRef }  // Component instance
  | { tag: 'namespace'; namespace: string }  // Domain namespace (resolved via ActionScope)

/**
 * ActionExecutor - executes compiled actions.
 * 
 * Uses RenderEnv.effectRunner DIRECTLY for all effects.
 */
interface ActionExecutor {
  execute(action: CompiledAction, context: ActionContext): Promise<ActionResult>
}

/**
 * ActionContext - context available during action execution.
 */
interface ActionContext {
  /** Current data scope for variable resolution */
  readonly scope: ScopeRef
  
  /** Current action scope for namespace resolution */
  readonly actionScope: ActionScope
  
  /** Scope writer for setValue actions */
  readonly writer: ScopeWriter
  
  /** Previous action result (for chaining) */
  readonly prevResult?: ActionResult
  
  /** Error from previous action (for onError) */
  readonly prevError?: EffectError
  
  /** Render environment - DIRECT ACCESS */
  readonly env: RenderEnv
}

/**
 * ActionResult - outcome of action execution.
 */
type ActionResult =
  | { tag: 'success'; value: unknown }
  | { tag: 'failure'; error: EffectError }
  | { tag: 'skipped'; reason: string }

/**
 * MergeStrategy - how to merge parallel action results.
 */
type MergeStrategy =
  | { tag: 'array' }  // Collect all results into array
  | { tag: 'object'; keys: string[] }  // Merge into object with specified keys
  | { tag: 'first' }  // Return first successful result
  | { tag: 'custom'; merge: (results: ActionResult[]) => unknown }

/**
 * RetryPolicy - retry configuration.
 */
interface RetryPolicy {
  readonly maxAttempts: number
  readonly delay: number
  readonly backoff?: 'linear' | 'exponential'
  readonly retryOn?: (error: EffectError) => boolean
}
```

### 4.2 Built-in Actions

```typescript
/**
 * Built-in actions provided by the kernel.
 * 
 * These are the primitive effects from which all behavior is composed.
 */
const BUILTIN_ACTIONS = {
  // Scope manipulation
  'setValue': (path: PropertyPath, value: unknown) => Effect,
  'patchValue': (patch: ScopePatch) => Effect,
  
  // API
  'ajax': (spec: ApiSpec) => Effect,
  
  // Navigation
  'navigate': (route: Route) => Effect,
  'back': () => Effect,
  
  // Surface management
  'openDialog': (spec: DialogSpec) => Effect,
  'openDrawer': (spec: DrawerSpec) => Effect,
  'closeSurface': (result?: unknown) => Effect,
  
  // Form
  'submitForm': (formId?: string) => Effect,
  'resetForm': (formId?: string) => Effect,
  'validateField': (path: PropertyPath) => Effect,
  
  // Component
  'component:invoke': (handle: ComponentHandleRef, method: string, args: unknown[]) => Effect,
  
  // Utility
  'toast': (message: string, type?: ToastType) => Effect,
  'copy': (text: string) => Effect,
  'download': (spec: DownloadSpec) => Effect,
} as const
```

---

## Part 5: Rendering Interface

### 5.1 Renderer Contract

```typescript
/**
 * Renderer - component that renders an ExecutionNode.
 * 
 * Renderers are PURE FUNCTIONS of their props.
 * They receive everything they need; they don't reach into global state.
 */
interface Renderer<TSchema extends NodeSchema = NodeSchema> {
  /** Render the node to output */
  (props: RendererProps<TSchema>): RenderOutput
}

/**
 * RendererProps - everything a renderer needs.
 * 
 * Design: Props is a COMPLETE specification.
 * Renderers MUST NOT access RenderEnv directly.
 * All env capabilities are pre-bound in props by the kernel's render pipeline.
 */
interface RendererProps<TSchema extends NodeSchema = NodeSchema> {
  /** Resolved runtime props (static + reactive evaluated) */
  readonly props: ResolvedProps<TSchema>
  
  /** Resolved meta state */
  readonly meta: ResolvedMeta
  
  /** Pre-compiled regions with render functions */
  readonly regions: RendererRegions
  
  /** Pre-bound event handlers */
  readonly events: RendererEvents
  
  /** Render helpers */
  readonly helpers: RenderHelpers
}

/**
 * ResolvedMeta - runtime control state.
 */
interface ResolvedMeta {
  readonly visible: boolean
  readonly disabled: boolean
  readonly className: string
  readonly testid?: string
}

/**
 * RendererRegions - pre-compiled child regions.
 */
interface RendererRegions {
  /** Get render function for a region */
  get(name: string): RegionRenderFn | undefined
  
  /** Check if region has children */
  has(name: string): boolean
  
  /** Get default region (usually 'body') */
  readonly default?: RegionRenderFn
}

/**
 * RegionRenderFn - render a region with optional scope bindings.
 * 
 * When bindings are provided, they become available in child scope
 * under the $slot namespace. For example:
 *   region.get('body')({ item: data, index: 0 })
 * Makes $slot.item and $slot.index available in child expressions.
 */
type RegionRenderFn = (bindings?: Record<string, unknown>) => RenderOutput

/**
 * RendererEvents - pre-bound event handlers.
 */
interface RendererEvents {
  readonly onClick?: () => void
  readonly onChange?: (value: unknown) => void
  readonly onSubmit?: () => void
  readonly onBlur?: () => void
  readonly onFocus?: () => void
  [key: string]: ((...args: unknown[]) => void) | undefined
}

/**
 * RenderHelpers - utilities available to renderers.
 */
interface RenderHelpers {
  /** Render an ad-hoc schema fragment */
  renderFragment(schema: ExecutionNode, bindings?: Record<string, unknown>): RenderOutput
  
  /** Evaluate an expression in current scope */
  evaluate<T>(factory: SignalFactory<T>): T
  
  /** Dispatch an action */
  dispatch(action: CompiledAction): Promise<ActionResult>
  
  /** Get current scope ref (read-only) */
  readonly scope: ScopeRef
  
  /** Get locale */
  readonly locale: string
  
  /** 
   * Translate a key (for dynamic keys only).
   * Static keys are resolved at compile time.
   */
  t(key: string, params?: Record<string, unknown>): string
}
```

### 5.2 Error Boundary

```typescript
/**
 * ErrorBoundary - handles render errors at node boundaries.
 * 
 * Addresses requirement 6.4: error handling callback.
 */
interface ErrorBoundary {
  /** Catch render error and return fallback */
  catch(error: unknown, nodeId: NodeId): RenderOutput
  
  /** Report error to host */
  report(error: RenderError): void
}

/**
 * RenderError - structured render error.
 */
interface RenderError {
  readonly error: unknown
  readonly nodeId: NodeId
  readonly nodeType: string
  readonly phase: 'mount' | 'update' | 'unmount'
  readonly timestamp: number
}

/**
 * ErrorBoundarySpec - error boundary configuration in schema.
 */
interface ErrorBoundarySpec {
  /** Fallback content to render on error */
  readonly fallback?: ExecutionNode
  
  /** Whether to propagate error to parent boundary */
  readonly propagate?: boolean
  
  /** Action to execute on error */
  readonly onError?: CompiledAction
}
```

### 5.3 Rendering Pipeline

```typescript
/**
 * The rendering pipeline transforms ExecutionNodes into RenderOutput.
 * 
 * Pipeline stages:
 * 1. Scope Resolution: Determine node's scope (inherit/extend/isolate)
 * 2. Value Resolution: Evaluate reactive props/meta in scope context
 * 3. Resource Activation: Start any data sources owned by this node
 * 4. Reaction Activation: Start any reactions owned by this node
 * 5. Loop Expansion: If node has loop, instantiate for each item
 * 6. Region Preparation: Create render functions for child regions
 * 7. Error Boundary: Wrap in error boundary if specified
 * 8. Renderer Invocation: Call renderer with prepared props
 */

/**
 * NodeInstance - runtime instance of an ExecutionNode.
 * 
 * Instances hold the mutable state for a rendered node.
 */
interface NodeInstance {
  /** The compiled node template */
  readonly node: ExecutionNode
  
  /** Instance's scope */
  readonly scope: ScopeRef
  
  /** Instance's action scope */
  readonly actionScope: ActionScope
  
  /** Instance's scope writer (if node extends scope) */
  readonly writer?: ScopeWriter
  
  /** Active resources */
  readonly resources: Map<string, Resource<unknown>>
  
  /** Active reactions */
  readonly reactions: Map<string, ReactionInstance>
  
  /** Child instances */
  readonly children: Map<string, NodeInstance[]>
  
  /** Loop instances (if this is a loop node) */
  readonly loopInstances?: Map<string | number, NodeInstance>
  
  /** Disposable group for cleanup */
  readonly disposables: DisposableGroup
  
  /** Disposal */
  dispose(): void
}
```

---

## Part 6: Form Runtime

### 6.1 Form Model

```typescript
/**
 * FormRuntime - specialized runtime for form nodes.
 * 
 * Forms are DERIVED from core primitives, not a separate system.
 * A form is:
 * - A scope (with form values)
 * - A set of field validations
 * - A submit/reset pipeline
 * - Status tracking (dirty, touched, submitting)
 */
interface FormRuntime {
  /** Form ID */
  readonly id: FormId
  
  /** Form scope containing values */
  readonly scope: ScopeRef
  
  /** Form scope writer */
  readonly writer: ScopeWriter
  
  /** Parent form (for nested forms) */
  readonly parent?: FormRuntime
  
  /** Current form values */
  readonly values: Signal<Record<string, unknown>>
  
  /** Validation state */
  readonly validation: FormValidationState
  
  /** Dirty state - values changed from initial */
  readonly dirty: Signal<boolean>
  
  /** Touched fields */
  readonly touched: Signal<Set<string>>
  
  /** Submission state */
  readonly submitting: Signal<boolean>
  
  /**
   * Draft mode - when true, this form's validation/dirty state
   * is isolated from parent until explicit commit.
   * 
   * Addresses requirement 2.8: 草稿隔离
   */
  readonly draftMode: boolean
  
  /** Submit the form */
  submit(): Promise<FormSubmitResult>
  
  /** Reset to initial values */
  reset(): void
  
  /** Validate specific field or entire form */
  validate(path?: PropertyPath): Promise<ValidationResult>
  
  /** Mark field as touched */
  touch(path: PropertyPath): void
  
  /** Set field value */
  setValue(path: PropertyPath, value: unknown): void
  
  /** Commit draft form values to parent (if in draft mode) */
  commitDraft(): void
  
  /** Discard draft changes (if in draft mode) */
  discardDraft(): void
}

/**
 * FormValidationState - reactive validation state.
 */
interface FormValidationState {
  /** All current errors */
  readonly errors: Signal<Map<string, ValidationError[]>>
  
  /** Whether form is valid */
  readonly valid: Signal<boolean>
  
  /** Get errors for a specific path */
  getErrors(path: PropertyPath): Signal<ValidationError[]>
  
  /** Whether a specific path is valid */
  isValid(path: PropertyPath): Signal<boolean>
}

/**
 * CompiledValidation - pre-compiled validation rule.
 */
interface CompiledValidation {
  /** Target path to validate */
  readonly path: PropertyPath
  
  /** Validation function - returns error or undefined */
  readonly validate: (value: unknown, context: ValidationContext) => ValidationError | undefined | Promise<ValidationError | undefined>
  
  /** When to run this validation */
  readonly trigger: ValidationTrigger
  
  /** Whether this is async */
  readonly async: boolean
  
  /** Condition - only validate if true */
  readonly when?: SignalFactory<boolean>
}

/**
 * ValidationContext - context available during validation.
 */
interface ValidationContext {
  /** Current scope for sibling field access */
  readonly scope: ScopeRef
  
  /** All form values */
  readonly formValues: Record<string, unknown>
  
  /** Translate function for error messages */
  readonly t: (key: string, params?: Record<string, unknown>) => string
  
  /** Field path being validated */
  readonly path: PropertyPath
}

/**
 * ValidationError - validation error structure.
 */
interface ValidationError {
  readonly code: string
  readonly message: string
  readonly params?: Record<string, unknown>
}

/**
 * ValidationResult - result of validation.
 */
interface ValidationResult {
  readonly valid: boolean
  readonly errors: ValidationError[]
}

type ValidationTrigger = 'change' | 'blur' | 'submit'

/**
 * FormSubmitResult - result of form submission.
 */
type FormSubmitResult =
  | { tag: 'success'; data: unknown }
  | { tag: 'validation-failed'; errors: Map<string, ValidationError[]> }
  | { tag: 'submit-failed'; error: EffectError }

type FormId = string
```

---

## Part 7: Surface Management

### 7.1 Surface Model

```typescript
/**
 * SurfaceManager - manages dialog/drawer stack.
 * 
 * Design: Surfaces are scoped environments, not global modals.
 * Each surface has its own scope, isolated from page scope.
 */
interface SurfaceManager {
  /** Current surface stack */
  readonly stack: Signal<Surface[]>
  
  /** Active (top) surface */
  readonly active: Signal<Surface | undefined>
  
  /** Open a new surface */
  open(spec: SurfaceSpec): Promise<SurfaceResult>
  
  /** Close top surface */
  close(result?: unknown): void
  
  /** Close all surfaces */
  closeAll(): void
}

/**
 * Surface - a modal/drawer instance.
 */
interface Surface {
  /** Unique surface ID */
  readonly id: SurfaceId
  
  /** Surface type */
  readonly type: 'dialog' | 'drawer'
  
  /** Surface scope */
  readonly scope: ScopeRef
  
  /** Surface content (rendered schema) */
  readonly content: ExecutionNode
  
  /** Promise that resolves when surface closes */
  readonly result: Promise<SurfaceResult>
}

/**
 * SurfaceSpec - specification for opening a surface.
 */
interface SurfaceSpec {
  readonly type: 'dialog' | 'drawer'
  readonly content: ExecutionNode
  readonly title?: string
  readonly size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  readonly initialData?: Record<string, unknown>
  readonly closeOnOverlayClick?: boolean
  readonly closeOnEsc?: boolean
}

/**
 * SurfaceResult - result of closing a surface.
 */
type SurfaceResult =
  | { tag: 'confirmed'; value: unknown }
  | { tag: 'cancelled' }
  | { tag: 'dismissed' }

type SurfaceId = string
```

---

## Part 8: Domain Integration

### 8.1 Domain Bridge Contract

```typescript
/**
 * DomainBridge - interface for complex domain controls.
 * 
 * Domain controls (flow designer, spreadsheet, etc.) integrate via:
 * 1. Host Projection: Read-only snapshot into schema-visible scope
 * 2. Namespace Capabilities: Commands for schema to invoke
 * 3. Private State: Internal state NOT visible to schema
 */
interface DomainBridge<TSnapshot = unknown, TActions extends Record<string, (...args: any[]) => any> = {}> {
  /** Current snapshot - published to scope */
  readonly snapshot: Signal<TSnapshot>
  
  /** Namespace for capabilities */
  readonly namespace: string
  
  /** Available actions */
  readonly actions: TActions
  
  /** Subscribe to bridge events */
  subscribe(event: string, handler: (payload: unknown) => void): () => void
  
  /** Dispose bridge */
  dispose(): void
}

/**
 * DomainRegistry - global registry for domain bridges.
 * 
 * NOTE: This is for HOST-LEVEL domains that should be globally accessible.
 * For lexically-scoped domains, use ActionScope.registerNamespace instead.
 */
interface DomainRegistry {
  /** Register a domain bridge */
  register(namespace: string, bridge: DomainBridge): void
  
  /** Unregister a domain bridge */
  unregister(namespace: string): void
  
  /** Get bridge by namespace */
  get(namespace: string): DomainBridge | undefined
  
  /** Check if namespace exists */
  has(namespace: string): boolean
}

/**
 * Example: Flow Designer Bridge
 */
interface FlowDesignerBridge extends DomainBridge<FlowSnapshot, FlowActions> {
  readonly namespace: 'flow-designer'
  readonly actions: FlowActions
}

interface FlowSnapshot {
  readonly nodes: ReadonlyArray<{ id: string; type: string; position: { x: number; y: number } }>
  readonly edges: ReadonlyArray<{ id: string; source: string; target: string }>
  readonly selectedIds: ReadonlySet<string>
}

interface FlowActions {
  addNode(type: string, position: { x: number; y: number }): void
  removeNode(id: string): void
  connect(sourceId: string, targetId: string): void
  exportJson(): string
  importJson(json: string): void
}
```

---

## Part 9: Component Handle Registry

### 9.1 Handle Model

```typescript
/**
 * ComponentHandle - reference to a component instance.
 * 
 * Handles enable schema to invoke component-specific methods.
 * Example: table.reload(), form.validate(), editor.focus()
 */
interface ComponentHandle {
  /** Handle identity */
  readonly id: ComponentHandleId
  
  /** Component type */
  readonly type: string
  
  /** Available methods */
  readonly methods: Record<string, (...args: unknown[]) => unknown>
  
  /** Invoke a method */
  invoke(method: string, args: unknown[]): unknown
}

/**
 * ComponentHandleRegistry - manages component handles.
 */
interface ComponentHandleRegistry {
  /** Register a handle */
  register(id: ComponentHandleId, handle: ComponentHandle): void
  
  /** Unregister a handle */
  unregister(id: ComponentHandleId): void
  
  /** Get handle by ID */
  get(id: ComponentHandleId): ComponentHandle | undefined
  
  /** Find handles by type */
  findByType(type: string): ComponentHandle[]
}

/**
 * ComponentHandleRef - reference used in schema.
 * 
 * Can be resolved at runtime via registry.
 */
type ComponentHandleRef =
  | { tag: 'id'; id: ComponentHandleId }
  | { tag: 'name'; name: string }  // Resolved via scope.resolve(['$components', name])
  | { tag: 'closest'; type: string }  // Traverse NodeInstance tree upward to find ancestor of type

type ComponentHandleId = string
```

---

## Part 10: Diagnostics & DevTools

### 10.1 Diagnostic Interface

```typescript
/**
 * DiagnosticCollector - collects compile-time and runtime diagnostics.
 */
interface DiagnosticCollector {
  /** Add a diagnostic */
  add(diagnostic: Diagnostic): void
  
  /** Get all diagnostics */
  readonly all: readonly Diagnostic[]
  
  /** Get errors only */
  readonly errors: readonly Diagnostic[]
  
  /** Get warnings only */
  readonly warnings: readonly Diagnostic[]
  
  /** Clear all diagnostics */
  clear(): void
}

/**
 * Diagnostic - compile-time or runtime issue.
 */
interface Diagnostic {
  readonly severity: 'error' | 'warning' | 'info'
  readonly code: string
  readonly message: string
  readonly location?: SchemaLocation
  readonly nodeId?: NodeId
}

/**
 * SchemaLocation - location in source schema.
 */
interface SchemaLocation {
  readonly path: PropertyPath
  readonly line?: number
  readonly column?: number
}

/**
 * DevToolsIntegration - hooks for developer tools.
 */
interface DevToolsIntegration {
  /** Inspect a node instance */
  inspectNode(nodeId: NodeId): NodeInspection | undefined
  
  /** Get current scope snapshot */
  getScopeSnapshot(scopeId: ScopeId): Record<string, unknown>
  
  /** Get dependency graph */
  getDependencyGraph(): DependencyGraph
  
  /** Get action history */
  getActionHistory(): ActionHistoryEntry[]
  
  /** Enable/disable tracking */
  setTracking(enabled: boolean): void
}

/**
 * NodeInspection - detailed info about a node instance.
 */
interface NodeInspection {
  readonly nodeId: NodeId
  readonly type: string
  readonly props: Record<string, unknown>
  readonly meta: ResolvedMeta
  readonly scopeId: ScopeId
  readonly scopeData: Record<string, unknown>
  readonly validationErrors: ValidationError[]
  readonly resourceStates: Record<string, ResourceState>
}

/**
 * ResourceState - resource status for inspection.
 */
interface ResourceState {
  readonly loading: boolean
  readonly error?: EffectError
  readonly lastRefresh?: number
  readonly value?: unknown
}

/**
 * DependencyGraph - visualization of signal dependencies.
 */
interface DependencyGraph {
  readonly nodes: Array<{ id: string; type: 'signal' | 'computed' | 'effect'; label: string }>
  readonly edges: Array<{ from: string; to: string }>
}

/**
 * ActionHistoryEntry - recorded action execution.
 */
interface ActionHistoryEntry {
  readonly id: string
  readonly action: string
  readonly args: Record<string, unknown>
  readonly result: ActionResult
  readonly timestamp: number
  readonly duration: number
}

type NodeId = string
type ScopeId = string
type ActionScopeId = string
```

---

## Part 11: API Summary

### 11.1 Public API Surface

```typescript
/**
 * The complete public API of the kernel.
 */

// === Core Types ===
export type { Value, CompiledValue, Signal, SignalListener }
export type { ScopeRef, ScopeWriter, ScopeFactory, ScopePatch, PropertyPath }
export type { Effect, EffectRunner, EffectResult, EffectError }

// === Compilation ===
export type { SchemaCompiler, CompileOptions, CompileResult, AuthoringSchema }
export type { ExecutionNode, CompiledProps, CompiledMeta, CompiledRegion, CompiledAction }
export type { CompiledLoop, NodeRef }
export type { ExpressionCompiler, SignalFactory, CompiledExpr }

// === Runtime ===
export type { RuntimeKernel, RuntimeSession, RenderEnv, RenderOutput }
export type { NodeInstance, Resource, ReactionInstance }
export type { ActionScope, ActionHandler }

// === Reactive ===
export type { ReactiveRuntime, TrackFn, SignalSetter, Disposable, DisposableGroup }

// === Rendering ===
export type { Renderer, RendererProps, RenderHelpers }
export type { ResolvedMeta, RendererRegions, RendererEvents, RegionRenderFn }
export type { ErrorBoundary, RenderError, ErrorBoundarySpec }

// === Actions ===
export type { ActionExecutor, ActionContext, ActionResult }
export type { ActionSpec, ActionTarget, MergeStrategy, RetryPolicy }

// === Forms ===
export type { FormRuntime, FormValidationState, CompiledValidation }
export type { ValidationContext, ValidationError, ValidationResult, FormSubmitResult }

// === Surfaces ===
export type { SurfaceManager, Surface, SurfaceSpec, SurfaceResult }

// === Domain ===
export type { DomainBridge, DomainRegistry }

// === Components ===
export type { ComponentHandle, ComponentHandleRegistry, ComponentHandleRef }

// === Diagnostics ===
export type { DiagnosticCollector, Diagnostic, DevToolsIntegration }
export type { NodeInspection, ResourceState, DependencyGraph, ActionHistoryEntry }

// === Factory Functions ===
export { createSignal, createComputed, createEffect, batch }
export { createKernel }
export { createSchemaCompiler }
```

### 11.2 Kernel Bootstrap

```typescript
/**
 * createKernel - creates the runtime kernel.
 * 
 * The kernel is the only entry point. Everything else is accessed via:
 * - RenderEnv (provided by host, used directly)
 * - RuntimeSession (created by kernel)
 */
function createKernel(): RuntimeKernel {
  return {
    createSession(root: ExecutionNode, env: RenderEnv, initialData?: Record<string, unknown>): RuntimeSession {
      // 1. Create root scope with initial data
      const [rootScope, rootWriter] = env.scopeFactory.createChild(
        undefined,  // Root has no parent
        initialData
      )
      
      // 2. Create root action scope
      const rootActionScope = createActionScope(undefined, env)
      
      // 3. Create disposable group for session cleanup
      const disposables = createDisposableGroup()
      
      // 4. Create surface manager
      const surfaces = createSurfaceManager(env)
      
      // 5. Create dev tools integration
      const devTools = env.debug ? createDevToolsIntegration() : noopDevTools
      
      // 6. Create session state
      const session: RuntimeSession = {
        rootScope,
        rootWriter,
        rootActionScope,
        surfaces,
        devTools,
        
        render(): RenderOutput {
          // Render tree starting from root
          return renderNode(root, rootScope, rootActionScope, rootWriter, env)
        },
        
        dispose(): void {
          // Cleanup all resources, reactions, instances
          disposables.dispose()
          surfaces.closeAll()
        },
        
        subscribe(event: SessionEvent, handler: SessionEventHandler): () => void {
          // Subscribe to session events
          return sessionEmitter.on(event, handler)
        }
      }
      
      return session
    }
  }
}

/**
 * createSchemaCompiler - creates schema compiler.
 */
function createSchemaCompiler(env: RenderEnv): SchemaCompiler {
  return {
    compile(schema: AuthoringSchema, options?: CompileOptions): CompileResult {
      // Implementation: parse, validate, transform, compile, optimize
      return compileSchema(schema, { ...options, env })
    },
    
    compileExpression<T>(source: string): SignalFactory<T> {
      return env.exprCompiler.compile<T>(source)
    },
    
    compileTemplate(source: string): SignalFactory<string> {
      return env.exprCompiler.compileTemplate(source)
    }
  }
}
```

---

## Part 12: Design Rationale

### 12.1 Why Algebraic Types?

1. **Closed under composition**: Any combination of primitives produces a valid primitive
2. **Exhaustive pattern matching**: Compiler enforces handling all cases
3. **Serializable**: Data, not behavior - can be logged, replayed, transmitted
4. **Testable**: Pure functions on data structures

### 12.2 Why Signal-First?

1. **Unified reactivity model**: One concept (Signal) covers all reactive needs
2. **Automatic dependency tracking**: No manual dependency declaration
3. **Lazy computation**: Computed signals only evaluate when read
4. **Batched updates**: Multiple writes coalesce into single notification

### 12.3 Why Lexical Scoping?

1. **Predictable resolution**: Variables resolve via lexical chain, not global lookup
2. **Natural isolation**: Scopes naturally isolate unrelated data
3. **Performance**: Isolated scopes avoid cross-tree dependency
4. **Composability**: Subtrees are self-contained units

### 12.4 Why Effect Algebra?

1. **Testability**: Effects are data, can be inspected without execution
2. **Composition**: Effects compose algebraically (sequence, parallel, conditional)
3. **Single execution point**: All side effects go through EffectRunner
4. **Replay/logging**: Effect history can be recorded and replayed

### 12.5 Why RenderEnv Direct Access?

1. **No indirection**: Capabilities used exactly as provided
2. **Static guarantees**: RenderEnv shape is compile-time known
3. **Performance**: No wrapper function calls
4. **Simplicity**: One way to access capabilities

### 12.6 Why Separate ActionScope?

1. **Principle adherence**: Matches design principle 5 - three separate resolution mechanisms
2. **Lexical capability ownership**: Domain capabilities follow scope boundaries
3. **Composability**: Local domains can shadow global ones
4. **Security**: Capabilities are scoped, not globally ambient

---

## Appendix A: Comparison with Requirements

| Requirement | Design Solution |
|-------------|-----------------|
| Schema compilation (2.1) | SchemaCompiler + ExecutionNode |
| Progressive value semantics (2.1.3) | Value algebra: literal → expr → template → resource |
| Expression engine (2.2) | ExpressionCompiler with AST interpreter, no eval |
| Lexical scoping (2.3) | ScopeRef with parent chain, shadowing, isolation |
| Path-level change notification (2.3.5) | ScopePatch with changed paths, SignalListener |
| Dependency tracking (2.4) | Signal system with TrackFn |
| Self-write protection (2.4.4) | ScopePatch.sourceId matching |
| Renderer system (2.5) | Renderer pure functions with RendererProps |
| Parameterized regions / $slot (2.5.6) | CompiledRegion.params + RegionRenderFn bindings |
| Action system (2.6) | CompiledAction algebra with EffectRunner |
| Three-layer action resolution (2.7) | ActionTarget: builtin, component, namespace + ActionScope |
| Form runtime (2.8) | FormRuntime derived from core primitives |
| Draft isolation (2.8.6) | FormRuntime.draftMode + commitDraft/discardDraft |
| API/Data sources (2.9) | Resource system with lifecycle |
| Surface management (2.10) | SurfaceManager with stack model |
| Loop/iteration (2.12) | CompiledLoop with template instantiation |
| Recursive rendering (2.12.2) | NodeRef for self/named references |
| Domain integration (3.2) | DomainBridge contract + ActionScope |
| Error handling (6.4) | ErrorBoundary + RenderEnv.errorHandler |
| Diagnostics (6) | DiagnosticCollector + DevToolsIntegration |

---

## Appendix B: Glossary

| Term | Definition |
|------|------------|
| Signal | Time-varying value with automatic dependency tracking |
| Scope | Lexical data environment with inheritance |
| ActionScope | Lexical capability environment for action resolution |
| Effect | Algebraic representation of a side effect |
| Resource | Managed data producer with lifecycle |
| Reaction | Side effect triggered by value changes |
| Surface | Modal dialog or drawer with isolated scope |
| Domain Bridge | Integration point for complex domain controls |
| Execution Node | Compiled, immutable render template |
| Node Instance | Runtime state for a rendered node |
| ScopePatch | Structured change description with path information |
| DisposableGroup | Collection of disposables for batch cleanup |
