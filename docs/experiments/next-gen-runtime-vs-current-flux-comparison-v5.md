# Next-Gen Runtime Design v5 vs Current Flux Implementation

> **Document Type**: Experimental comparison analysis  
> **Date**: 2026-04-20  
> **Scope**: Compare experimental kernel design (v5) with current Flux implementation

---

## Executive Summary

This document compares the experimental "Next-Generation Low-Code Runtime Kernel Design v5" with the current Flux implementation to evaluate which approach represents the true "next-generation" design for low-code runtimes.

**Verdict**: The current Flux implementation is more mature and pragmatically advanced, while the v5 experimental design offers some theoretical elegance that could inform future evolution. However, **Flux's current design is the genuinely leading approach** due to its proven architecture, practical refinements, and adherence to the core design principles.

---

## Comparative Analysis

### 1. Core Primitive Model

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Primitives** | Value, Signal, ScopeRef, Effect, Resource, Reaction | Base Tree, ScopeRef, Value, Resource, Reaction, Capability, Host Projection |
| **Closure** | Algebraic types with tag unions | Closed 7-primitive set with promotion test |
| **Extensibility** | Effect algebra compositional | Derived systems from primitives |

#### v5 Approach

The v5 design centers on an algebraic model where everything is expressed as tagged union types:

```typescript
type Value<T> =
  | { tag: 'literal'; value: T }
  | { tag: 'expr'; compute: Signal<T> }
  | { tag: 'template'; segments: Array<string | Signal<string>> }
  | { tag: 'resource'; ref: ResourceRef<T> }
  | { tag: 'projection'; source: ProjectionSource; path: PropertyPath }
```

**Strengths**:
- Mathematical elegance and exhaustive pattern matching
- Clear compositional rules
- Serializable effect representation

**Weaknesses**:
- Over-unified: `Value<T>` mixing compile-time and runtime concerns
- `Signal<T>` as a first-class primitive conflates the reactive mechanism with the value concept

#### Current Flux Approach

Flux maintains a deliberate separation with seven closed primitives, each with distinct semantics:

- **Base Tree**: Structure (not a "value")
- **ScopeRef**: Data environment (not a reactive value)
- **Value**: Evaluation target (literal/expression/template/array/object)
- **Resource**: Lifecycle-owned producer
- **Reaction**: Watch/effect behavior
- **Capability**: Effect dispatch channel
- **Host Projection**: External data admission

**Strengths**:
- Clear semantic boundaries prevent concept drift
- Promotion test guards against primitive inflation
- Each primitive has a well-defined responsibility

**Weaknesses**:
- Less algebraically "pure"
- Requires understanding seven concepts vs. fewer unified ones

#### Assessment: **Current Flux wins**

The seven-primitive model is more mature. It separates concerns that the v5 design conflates. The promotion test is a sophisticated mechanism that the v5 design lacks entirely - v5 would need to add new tags to its union types as complexity grows, without guardrails.

---

### 2. Scope and Data Environment

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Interface** | `ScopeRef.resolve(path: PropertyPath)` | `ScopeRef.get(path: string)` |
| **Path representation** | Compiled arrays `['user', 'profile']` | String paths `"user.profile"` |
| **Inheritance** | `createChild`, `createIsolated`, `createWithProjection` | `createChildScope` with options |
| **Hot path optimization** | Not specified | `readVisible()` prototype chain, zero allocation |
| **Change tracking** | `ScopePatch` with path arrays | `ScopeChange` with paths and kind |

#### v5 Approach

```typescript
interface ScopeRef {
  resolve<T>(path: PropertyPath): T | undefined
  has(path: PropertyPath): boolean
  readonly parent: ScopeRef | undefined
}

interface ScopePatch {
  readonly changes: ReadonlyArray<{
    path: PropertyPath
    value: unknown
    previousValue?: unknown
  }>
  readonly sourceId?: string  // For self-write protection
}
```

**Strengths**:
- Pre-compiled path arrays for faster traversal
- `sourceId` for self-write protection is well-designed
- Clean separation of `ScopeRef` (read) and `ScopeWriter` (write)

**Weaknesses**:
- No performance optimization techniques specified
- PropertyPath arrays add allocation overhead vs. strings for simple cases

#### Current Flux Approach

```typescript
interface ScopeRef {
  get(path: string): unknown;
  has(path: string): boolean;
  readOwn(): Record<string, any>;
  readVisible(): Record<string, any>;  // Prototype-backed, zero allocation
  materializeVisible(): Record<string, any>;  // Plain object when needed
}
```

**Strengths**:
- `readVisible()` using prototype chain is brilliant for formula evaluation - zero allocation in hot paths
- `readOwn()` for cases needing only current layer
- `materializeVisible()` for cases needing plain objects
- Proven performance in production

**Weaknesses**:
- String paths require parsing at runtime (though this is well-optimized)
- Less type-safe than PropertyPath arrays

#### Assessment: **Current Flux wins**

The prototype-chain optimization for `readVisible()` is a practical engineering insight that v5 completely misses. The v5 design is theoretically cleaner but lacks the performance-critical optimizations that make Flux practical for real-world use.

---

### 3. Reactivity and Dependency Tracking

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Core mechanism** | Signal-first with explicit `TrackFn` | Proxy-based collection + Zustand stores |
| **Dependency granularity** | Full paths implied | Lexical roots only (optimized) |
| **Declaration model** | Implicit only | "Explicit roots first, runtime fallback" |
| **Invalidation** | Signal version comparison | Path matching with `scopeChangeHitsDependencies` |

#### v5 Approach

```typescript
type TrackFn = <T>(signal: Signal<T>) => T

declare function createComputed<T>(compute: (track: TrackFn) => T): Signal<T>
declare function createEffect(effect: (track: TrackFn) => void | (() => void)): Disposable
```

**Strengths**:
- Explicit `TrackFn` avoids async context corruption issues
- Unified Signal model for all reactive values
- Clean algebra of signals

**Weaknesses**:
- No dependency declaration mechanism (`dependsOn`)
- Always tracks full paths (potential performance issue)
- Signal creation overhead for every reactive value

#### Current Flux Approach

```typescript
interface ScopeDependencySet {
  paths: readonly string[];  // Normalized lexical roots or ['*']
  wildcard: boolean;
  broadAccess: boolean;
}
```

Dependency tracking rules:
1. If `dependsOn` declared → authoritative
2. Otherwise → runtime collects lexical roots
3. Only lexical roots tracked, not deep paths (`user.name` → `user`)

**Strengths**:
- `dependsOn` allows author-declared dependencies for precision
- Lexical root optimization prevents over-invalidation
- Wildcard detection for whole-scope operations
- Zustand-based subscription is battle-tested

**Weaknesses**:
- Proxy-based tracking has edge cases
- Lexical root only may miss some fine-grained dependencies

#### Assessment: **Current Flux wins**

The "explicit roots first, runtime fallback" model is a sophisticated design that v5 lacks. The lexical root optimization is a critical insight - tracking full paths would cause over-invalidation in real applications. v5's pure Signal approach is elegant but impractical at scale.

---

### 4. Action and Effect System

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Effect representation** | Algebraic `Effect` sum type | Action execution with results |
| **Resolution** | `ActionTarget` with three variants | Three-tier: builtin, component, namespace |
| **Composition** | Effect algebra (sequence, parallel, conditional) | Action chaining (then, onError, retry, debounce) |
| **Capability scope** | `ActionScope` with lexical chain | `ActionScope` with lexical chain |

#### v5 Approach

```typescript
type Effect =
  | { tag: 'scope:write'; target: ScopeId; patch: ScopePatch }
  | { tag: 'api:request'; spec: ApiSpec; onResult: EffectContinuation }
  | { tag: 'batch'; effects: Effect[] }
  | { tag: 'sequence'; first: Effect; then: (result: unknown) => Effect }
  | { tag: 'parallel'; effects: Effect[]; merge: (results: unknown[]) => unknown }
  | { tag: 'conditional'; guard: Signal<boolean>; effect: Effect }
```

**Strengths**:
- Effects as data enables serialization, logging, replay
- Algebraic composition is mathematically clean
- Single `EffectRunner` for all effects

**Weaknesses**:
- Over-specified: includes functions in the "data" representation (`then`, `merge`)
- `conditional` depends on `Signal<boolean>` which couples to reactive system
- Theoretical purity may not translate to practical benefits

#### Current Flux Approach

```typescript
// Action resolution order
1. Built-in platform actions: setValue, ajax, dialog, etc.
2. Component-targeted: component:<method>
3. Namespaced: designer:export via ActionScope

// Action composition
{ action: 'ajax', then: [...], onError: [...], debounce: 300, retry: { maxAttempts: 3 } }
```

**Strengths**:
- Proven in production
- Clear three-tier resolution
- Rich control flow (debounce, retry, timeout, continueOnError)
- Plugin interception hooks (beforeAction, onError)

**Weaknesses**:
- Less theoretically pure than effect algebra
- Action structure is less composable algebraically

#### Assessment: **Draw**

Both approaches have merit. v5's Effect algebra is theoretically elegant and enables interesting capabilities (effect serialization, replay). But current Flux's approach is more pragmatic with production-proven features like plugin interception. The designs are comparable in sophistication.

---

### 5. Compilation Model

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Entry point** | `SchemaCompiler.compile()` | `RendererRuntime.compile()` |
| **Output** | `ExecutionNode` (immutable template) | `TemplateNode` / `CompiledTemplate` |
| **Value compilation** | `CompiledValue<T>` with static/reactive | `CompiledValueNode` with five variants |
| **i18n timing** | Compile-time (documented) | Not explicitly specified |

#### v5 Approach

```typescript
interface SchemaCompiler {
  compile(schema: AuthoringSchema, options?: CompileOptions): CompileResult
}

interface CompileResult {
  readonly root: ExecutionNode
  readonly diagnostics: readonly Diagnostic[]
  readonly success: boolean
}
```

**Strengths**:
- Explicit `CompileResult` with diagnostics
- Clear separation of `AuthoringSchema` → `ExecutionNode`
- Documented i18n compile-time substitution

**Weaknesses**:
- Less detail on compilation pipeline stages
- No plugin/transform hooks specified

#### Current Flux Approach

```typescript
interface RendererRuntime {
  compile(schema): CompiledTemplate;
}

type CompiledValueNode<T> =
  | { kind: 'static-node'; value: T }
  | { kind: 'expression-node'; source: string; compiled: CompiledExpression<T> }
  | { kind: 'template-node'; source: string; compiled: CompiledTemplate<T> }
  | { kind: 'array-node'; items: ReadonlyArray<CompiledValueNode<unknown>> }
  | { kind: 'object-node'; keys: readonly string[]; entries: Record<string, CompiledValueNode<unknown>> };
```

**Strengths**:
- Rich value node taxonomy (5 kinds)
- `RuntimeValueState` for per-evaluation state tracking
- Identity preservation for unchanged results
- Proven in production

**Weaknesses**:
- Less explicit about diagnostic collection
- Compilation is tied to `RendererRuntime`

#### Assessment: **Draw**

Both have strong compilation models. v5 is more explicit about diagnostics; Flux has more detailed value node taxonomy and proven optimization (identity preservation). Neither is clearly superior.

---

### 6. Rendering and Component Integration

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Renderer contract** | `Renderer` pure function with `RendererProps` | React components with props via hooks |
| **Prop resolution** | Kernel prepares complete `RendererProps` | `useSyncExternalStoreWithSelector` for reactive resolution |
| **Region rendering** | `RegionRenderFn` with bindings | `regions` object with render functions |
| **Framework coupling** | Framework-agnostic `RenderOutput` | React-specific with hooks |

#### v5 Approach

```typescript
interface Renderer<TSchema extends NodeSchema = NodeSchema> {
  (props: RendererProps<TSchema>): RenderOutput
}

interface RendererProps<TSchema extends NodeSchema = NodeSchema> {
  readonly props: ResolvedProps<TSchema>
  readonly meta: ResolvedMeta
  readonly regions: RendererRegions
  readonly events: RendererEvents
  readonly helpers: RenderHelpers
}
```

**Strengths**:
- Pure function contract is clean
- Framework-agnostic `RenderOutput`
- Complete props specification

**Weaknesses**:
- `RenderOutput = unknown` is too vague
- No actual implementation guidance
- Theory without practice

#### Current Flux Approach

```typescript
// NodeRenderer uses React hooks
const { meta, resolvedProps } = useSyncExternalStoreWithSelector(
  subscribe, getSnapshot, getSnapshot, getNodeResolution, equalityFn
);

const helpers = createHelpers({ runtime, scope, actionScope, ... });
const events = Object.fromEntries(Object.entries(node.eventPlans).map(...));
const regions = Object.fromEntries(Object.entries(node.regions).map(...));
```

**Strengths**:
- Real implementation with React 19
- `useSyncExternalStore` for concurrent mode compatibility
- Targeted re-rendering via dependency tracking
- Proven performance characteristics

**Weaknesses**:
- React-coupled (though stores are framework-agnostic)
- More complex than v5's pure function model

#### Assessment: **Current Flux wins**

The current implementation is a working system with production-grade React integration. v5's framework-agnostic aspiration is nice but the `RenderOutput = unknown` cop-out shows it's unfinished theory. Flux's `useSyncExternalStore` pattern for concurrent mode is a real-world solution that v5 doesn't address.

---

### 7. Form Runtime

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Draft mode** | `draftMode`, `commitDraft()`, `discardDraft()` | Not explicitly documented |
| **Validation** | `ValidationContext` with scope access | Validation runtime with similar patterns |
| **Parent form** | `readonly parent?: FormRuntime` | Form composition supported |

#### Assessment: **v5 slight edge**

v5's explicit `draftMode` and draft commit/discard API is cleaner than current Flux's less documented approach to nested form isolation. However, this is a minor point - the core form models are similar.

---

### 8. Domain Integration

| Aspect | v5 Experimental | Current Flux |
|--------|-----------------|--------------|
| **Bridge contract** | `DomainBridge<TSnapshot, TActions>` | Host Projection primitive |
| **Registration** | `DomainRegistry` (global) + `ActionScope.registerNamespace` (lexical) | Host Projection + ActionScope |
| **Snapshot publication** | `Signal<TSnapshot>` | Via ScopeRef |

#### Assessment: **Current Flux wins**

Flux's Host Projection as a dedicated primitive is more principled than v5's `DomainBridge`. The seven-primitive model gives Host Projection clear semantics, while v5's bridge is just an interface without primitive status.

---

## Summary Scorecard

| Category | v5 Experimental | Current Flux | Winner |
|----------|-----------------|--------------|--------|
| Primitive model | 7/10 | 9/10 | Flux |
| Scope system | 7/10 | 9/10 | Flux |
| Dependency tracking | 6/10 | 9/10 | Flux |
| Action/Effect system | 8/10 | 8/10 | Draw |
| Compilation model | 7/10 | 8/10 | Draw |
| Rendering integration | 5/10 | 9/10 | Flux |
| Form runtime | 8/10 | 7/10 | v5 |
| Domain integration | 7/10 | 9/10 | Flux |
| **Overall** | **6.9/10** | **8.5/10** | **Flux** |

---

## Key Insights

### What v5 Gets Right

1. **Algebraic type discipline**: Tagged unions enable exhaustive pattern matching
2. **Effect as data**: Serializable effects enable logging, replay, testing
3. **Explicit `TrackFn`**: Avoids async context corruption issues
4. **`ScopePatch.sourceId`**: Clean self-write protection mechanism
5. **Draft form model**: Explicit draft mode API is well-designed
6. **ActionScope clarity**: Explicit parallel to ScopeRef for capabilities

### What v5 Gets Wrong

1. **Over-unified Value model**: Conflates compile-time and runtime concerns
2. **Missing performance optimizations**: No prototype-chain scope, no lexical root optimization
3. **Signal-first is impractical**: Creates allocation overhead for all reactive values
4. **`RenderOutput = unknown`**: Cop-out that doesn't solve framework integration
5. **Missing `dependsOn`**: No author-declared dependency mechanism
6. **Theory over practice**: Beautiful algebra without implementation proof

### What Current Flux Gets Right

1. **Seven-primitive closure with promotion test**: Mature, principled, guarded
2. **Prototype-chain scope optimization**: Zero-allocation hot path
3. **Lexical root dependency tracking**: Prevents over-invalidation
4. **`dependsOn` explicit declaration**: Author control over dependencies
5. **Zustand vanilla stores**: Framework-agnostic state management
6. **Production-proven React integration**: Works with concurrent mode
7. **Plugin interception hooks**: Extensible action handling

### What Current Flux Could Learn from v5

1. **Effect serialization**: Treating effects as data for logging/replay
2. **Explicit `TrackFn`**: More explicit dependency tracking API
3. **Draft form mode**: Cleaner API for nested form isolation
4. **SchemaCompiler with diagnostics**: More explicit compilation result type

---

## Conclusion

**Current Flux is the genuinely next-generation design.**

The v5 experimental design represents an interesting thought experiment in algebraic kernel design, but it suffers from classic academic syndrome: elegant theory without practical proof. The "algebraic completeness" principle sounds impressive but produces over-unified models that conflate distinct concerns.

Current Flux embodies hard-won engineering wisdom:

1. **The seven-primitive model** is not arbitrary - each primitive exists because collapsing them causes problems (the promotion test proves this).

2. **Lexical root dependency tracking** is a crucial insight - full-path tracking causes O(n) invalidation cascades in real applications.

3. **Prototype-chain scope optimization** shows understanding of JavaScript engine behavior that v5 completely ignores.

4. **"Explicit roots first, runtime fallback"** is a sophisticated hybrid that v5's pure-implicit model cannot match.

5. **Framework integration via useSyncExternalStore** demonstrates real concurrent mode compatibility, while v5 handwaves with `RenderOutput = unknown`.

The v5 design is approximately 70% complete as an architectural specification. To become genuinely "next-generation", it would need to:

1. Adopt Flux's primitive separation (don't unify Value/Signal)
2. Add lexical root dependency optimization
3. Add explicit `dependsOn` declaration
4. Add performance optimizations (prototype-chain scope)
5. Solve framework integration concretely

**Recommendation**: Use v5's Effect algebra and draft form model concepts to enhance current Flux, rather than replacing Flux with v5.
