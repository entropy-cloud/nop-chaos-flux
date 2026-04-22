# FK10 (v10) vs Current nop-chaos-flux Architecture — Comparison

> **Date**: 2026-04-22
> **Status**: Draft — Pre-Review
> **Purpose**: Honest, evidence-based comparison between the FK10 experimental design and the current nop-chaos-flux implementation.

---

## 0. Framing

This is a comparison between a **theoretical design** (FK10) and a **working implementation** (nop-chaos-flux). This asymmetry matters:

- FK10 has zero lines of code. Every claim is theoretical.
- nop-chaos-flux has 20+ packages, working renderers, form validation, data sources, and a playground.
- Comparing a design doc to a shipping product is inherently unfair to the product. We acknowledge this and attempt to be as fair as possible.

---

## 1. Schema Processing Model

### Current (nop-chaos-flux)

**Pipeline**: `JSON Schema → SchemaCompiler → CompiledTemplate (TemplateNode tree) → RendererRuntime.instantiate() → NodeInstance tree → React rendering`

- **Single-pass compilation**: `SchemaCompiler` directly produces `CompiledTemplate` containing a `TemplateNode` tree. There's one compilation pass, not multiple stages.
- **Unified value semantics**: All schema fields follow one rule — plain values stay plain, expression syntax means expression semantics. No `xxxExpr`/`xxxOn` parallel field families. This is a genuine design strength.
- **Compile-once, execute-many**: `CompiledTemplate` is immutable. Multiple runtime instances can share one template.
- **Field classification via metadata**: The compiler uses renderer field metadata to classify fields as meta/prop/region/event.

### FK10 (v10)

**Pipeline**: `JSON Schema → Parse → Analyze → Optimize → Emit → ExecutionPackage (IR)`

- **Multi-stage IR compilation**: Four explicit stages with different responsibilities.
- **Static dependency graph**: The analyzer produces a compile-time dependency graph. The current project collects dependencies at runtime via `ScopeDependencyCollector`.
- **Optimization passes**: Literal hoisting, expression fusion, static subtree detection, selector pre-compilation, action graph flattening.

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Compilation stages | 1 pass | 4 passes | FK10 (more optimization opportunity) |
| Dependency analysis | Runtime-collected | Compile-time static | FK10 (theoretically more precise) |
| Static value handling | `isStatic: true` flag, zero-cost path | Static subtree React.memo wrapping | Current (simpler, equally effective) |
| Compile output | `CompiledTemplate` (single IR) | `ExecutionPackage` (multi-table IR) | Equivalent (different granularity) |

**Honest assessment**: The multi-stage compilation gives FK10 more optimization opportunity, but the current single-pass approach is simpler and already achieves the key invariant (static parts have zero runtime cost). The FK10 advantage is **incremental**, not **paradigmatic**. Whether the additional compilation stages justify their complexity depends on whether the optimizer finds significant optimization opportunities in real-world schemas. This is unproven.

**Current project strength**: The unified value semantics is a genuinely clean design that FK10 doesn't explicitly improve on. FK10's `PropValue` discriminated union (`literal | expression | template | i18n`) is essentially the same pattern.

---

## 2. State Management (Scope Model)

### Current

- **Lexical scope chain**: `ScopeRef` with parent chain, `get(path)` walks up.
- **Prototype-backed reads**: `readVisible()` uses prototype inheritance to avoid object allocation. This is a clever performance optimization.
- **Path-based invalidation**: `ScopeChange.paths` reports exact changed paths. Subscribers check intersection with their dependency set.
- **Three separate registries**: `ScopeRef` (data), `ActionScope` (behavior), `ComponentHandleRegistry` (instance capabilities). Clean separation of concerns.
- **Runtime dependency collection**: `ScopeDependencyCollector` records which paths are read during expression evaluation.

### FK10

- **Scope chain with projections**: Explicit `projections` map for isolated scopes to selectively import ancestor data.
- **Transaction-based mutations**: All writes go through `ScopeTransaction` with commit/rollback.
- **Push-based invalidation + lazy re-evaluation**: Transaction commits mark subscribers dirty; React triggers re-evaluation via `useSyncExternalStore`.
- **Single-store subscription batching**: One Zustand subscription per scope, components check version counters.

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Scope inheritance | Lexical parent chain | Lexical parent chain + projections | Roughly equivalent (current has `projected-scope-store.ts`) |
| Isolation mechanism | Row scopes isolated by default + projected-scope-store | `isolated: true` + explicit `projections` | Roughly equivalent (both support explicit projection) |
| Invalidation | Path-based change reporting | DepPattern-based (exact/prefix/computed) | Current (simpler), FK10 (more nuanced) |
| Transaction model | Implicit (synchronous mutations) | Explicit (begin/set/commit/rollback) | FK10 (safer, supports rollback) |
| Prototype optimization | Yes (zero-allocation reads) | No (standard object access) | Current (real performance win) |
| Subscription model | Per-hook `useScopeSelector` | Single-store subscription batching | FK10 (fewer subscriptions) |
| Separation of data/behavior | Three separate registries | Combined scope + action dispatch | Current (cleaner separation) |

**Honest assessment**: Both systems are competent scope chain implementations. FK10's **projections** are a genuine improvement for table row isolation — the current project's row scopes are "isolated by default" but lack an explicit mechanism for importing specific parent values. FK10 makes this explicit and typed.

However, the current project's **prototype-backed reads** (`readVisible()`) is a real performance optimization that FK10 doesn't address. This pattern avoids object spread on every scope read, which matters for hot paths like expression evaluation.

The **transaction model** difference is meaningful: FK10's explicit transactions support rollback (useful for draft isolation), while the current project's synchronous mutations are simpler but don't support atomic multi-path writes.

The **three-registry separation** in the current project (data, actions, components) is architecturally cleaner than FK10's combined model. FK10 conflates scope data with behavior through the action dispatch channel.

---

## 3. Expression Engine

### Current

- **Package**: `@nop-chaos/flux-formula`
- **Architecture**: String-based expression parser → AST → runtime evaluation against `EvalContext`
- **Dependency collection**: `ScopeDependencyCollector` optionally records reads during evaluation
- **Security**: No `new Function`, `eval`, or `with`. Clean eval/context separation.

### FK10

- **Architecture**: String → Lexer → Parser → AST → (Phase 1) AST walker / (Phase 2) Bytecode VM
- **Compile-time analysis**: Pre-computed `readPaths` and `effectType` for each expression
- **DepPattern**: Expressions declare dependency patterns (exact, prefix, computed) at compile time

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Parsing | Expression parser → AST | Lexer → Parser → AST | Equivalent |
| Evaluation | AST walker | AST walker (Phase 1) | Equivalent |
| Dependency tracking | Runtime collection during evaluation | Compile-time analysis + runtime collection | Roughly equivalent (FK10 slightly ahead for static schemas) |
| Security | No eval/new Function/with | Same guarantees | Equivalent |
| Template strings | FormulaCompiler handles templates | TemplateExpr AST node | Equivalent |
| Built-in functions | Comprehensive function/filter registry | Comprehensive function/filter registry | Equivalent |

**Honest assessment**: The expression engines are functionally equivalent. FK10's compile-time dependency analysis gives it a marginal edge for statically-analyzable schemas, but the current project's runtime collection achieves the same result and handles dynamic cases (computed property access) equally well.

The FK10 bytecode VM (Phase 2) would be a performance differentiator, but it's unproven and may not be needed — expression evaluation is rarely the bottleneck.

**The current project's `flux-formula` is a separate, well-isolated package**, which is better package design than FK10's `@flux/expression` that bundles the parser and evaluator together.

---

## 4. Component Model

### Current

- **Three renderer categories**: `instance-renderer`, `flux-owner-renderer`, `domain-host-renderer`
- **Props contract**: `RendererComponentProps<S>` with id, path, schema, templateNode, node, props, meta, regions, events, helpers
- **NodeRenderer**: Single-node orchestrator that resolves meta/props, subscribes selectively, builds events/regions/helpers
- **Region rendering**: `RenderRegionHandle.render({ bindings, instancePath, scope, ... })` with parameterized regions publishing under `$slot`
- **Boundary ownership**: Explicit ownership model — each scope boundary is `inherit-owner`, `create-owner`, or `no-owner`

### FK10

- **Two renderer categories**: `layout`, `widget`
- **Props contract**: `RendererComponentProps<TSchema>` with nodeId, props, meta, regions, events, helpers
- **React 19 integration**: `useSyncExternalStoreWithSelector`, `useOptimistic`, `use()` hook
- **Region rendering**: `RegionHandle.render(params?)` with params published under `$slot`
- **Error boundaries**: Per-renderer error boundary with schema-specified fallback

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Renderer categories | 3 (instance, flux-owner, domain-host) | 2 (layout, widget) | Current (more nuanced ownership) |
| Props resolution | NodeRenderer orchestrates | Pre-compiled selectors | FK10 (less runtime work) |
| Region params | Bindings in $slot frame | Params in $slot | Equivalent |
| Error boundaries | Not specified per renderer | Per-renderer with fallback | FK10 |
| React 19 features | useSyncExternalStore (standard) | useSyncExternalStore + useOptimistic + use() | FK10 (more React 19 integration) |
| Lifecycle actions | Explicit lifecycle action dispatch | Not addressed in detail | Current |
| Domain host integration | `domain-host-renderer` with hostContract | `DomainControlRegistration` | Current (more mature pattern) |

**Honest assessment**: The current project's **three-category renderer model** is more mature than FK10's two-category model. The distinction between `instance-renderer` (simple widget), `flux-owner-renderer` (scope-owning container like form/table), and `domain-host-renderer` (complex embedded control like designer) captures real architectural differences that FK10's layout/widget split doesn't.

The current project's **domain-host-renderer** pattern (with `hostContract`, namespace provider, published host data scope) is a well-thought-out integration mechanism that FK10's `DomainControlRegistration` replicates but with less detail.

FK10's **per-renderer error boundary** is a good idea not present in the current project's documented architecture.

---

## 5. Action System

### Current

- **Package**: `@nop-chaos/flux-action-core` (dispatch) + `@nop-chaos/flux-runtime` (adapter)
- **Three-path resolution**: Platform → Component → Namespace
- **Rich composition**: `when`, `then`, `onError`, `parallel`, `retry`, `timeout`, `debounce`, `continueOnError`
- **prevResult propagation**: Chain context carries `result` and `prevResult`
- **Plugin interception**: Action plugins can intercept and modify action dispatch
- **Import system**: `xui:imports` for declaration-style, order-independent, deduplicated namespace imports

### FK10

- **Structured concurrency**: `AbortSignal` propagation through action chains
- **Same three-path resolution**: Platform → Component → Namespace
- **Similar composition**: `when`, `then`, `onError`, `parallel`, `retry`, `timeout`, `debounce`
- **Flat steps syntax**: `steps` array as syntactic sugar for nested `then` chains
- **Cancellation propagation**: Dialog close → abort all actions in dialog scope

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Action composition | Rich (all operators) | Rich (same operators) | Equivalent |
| Structured concurrency | No formal model | AbortSignal propagation | FK10 |
| Action ergonomics | Nested then chains | Flat steps + nested chains | FK10 (flat steps is more readable) |
| Plugin system | Yes (action plugins) | Not mentioned | Current |
| Import system | `xui:imports` (declarative) | Not addressed | Current |
| Separation of dispatch/effects | action-core vs runtime adapter | Combined ActionOrchestrator | Current (cleaner separation) |
| Cancellation | Pervasive AbortSignal (68 instances) + per-path validation abort | Full AbortSignal chain propagation | FK10 (chain-level propagation from dialog scope) |
| Action chain debugging | monitor hooks | Time-travel inspector | FK10 |

**Honest assessment**: The action systems are architecturally similar. FK10's **structured concurrency** (AbortSignal propagation) is the main differentiator — the current project has request-level cancellation but not full chain cancellation. This matters for dialog scenarios where closing a dialog should cancel all in-flight actions.

However, the current project's **plugin interception** and **`xui:imports` declaration system** are features FK10 doesn't address. The import system is particularly sophisticated — it provides controlled, order-independent namespace loading that prevents global namespace pollution.

The current project's **separation of action dispatch (`action-core`) from effects (`runtime adapter`)** is cleaner than FK10's combined `ActionOrchestrator`. This separation means the dispatch logic can be tested without React or runtime dependencies.

---

## 6. Form & Validation System

### Current

- **Compiled validation model**: `CompiledFormValidationModel` with immutable graph, `validationOrder`, `dependents`
- **Field participation state**: Mounted, visible, disabled, touched, dirty, visited — all tracked per field
- **Owner resolution**: Each scope boundary classified as `inherit-owner`/`create-owner`/`no-owner`. Validation ownership follows data ownership.
- **Per-path subscriptions**: `subscribeToPath(path, listener)` — O(1) wake-up per field change
- **Error model**: `ValidationError` with `sourceKind` (field/object/array/row/scope-root/external), `OwnerQualifiedPath` for canonical identity
- **Async validation**: Centralized, cancellable, with stale-run cancellation
- **Draft isolation**: Phase 2 implementation — `detail-field`/`detail-view` create temporary `FormRuntime` instances

### FK10

- **Validation rule types**: Field, Object, Array, Conditional, Async rules
- **Dependency-ordered execution**: Topological sort with parallelism
- **Draft isolation**: Explicit `DraftScope` with commit/discard
- **Undo/redo**: Scope transaction-level undo/redo via `UndoRedoManager`
- **Array fields**: First-class `ArrayFieldOperations` with add/remove/move

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Validation model maturity | Very mature (compiled graph, participation, owner resolution) | Solid design, unimplemented | Current (working, battle-tested design) |
| Owner resolution | Explicit `inherit/create/no-owner` per boundary | Not explicitly addressed | Current |
| Error model | Rich (sourceKind, OwnerQualifiedPath) | Simple (path + message + ruleId) | Current (more diagnostic info) |
| Per-path subscriptions | Yes (O(1) wake-up) | Version-counter approach | Current (more precise) |
| Draft isolation | Phase 2 (partially implemented) | Explicit DraftScope API | FK10 (cleaner API) |
| Array fields | First-class: append/prepend/insert/remove/move/swap/replace with index remapping | First-class ArrayFieldOperations | Equivalent (current has more operations) |
| Undo/redo | Not mentioned | UndoRedoManager per form | FK10 |
| Async validation | Centralized, cancellable, stale-run detection | AsyncRule with debounce | Current (more robust) |

**Honest assessment**: The current project's validation system is **architecturally more mature**. The compiled validation graph, owner resolution system, per-path subscriptions, and rich error model represent significant design investment that FK10's validation engine doesn't match in depth.

However, FK10 adds features the current project doesn't have: **undo/redo** and **first-class array field operations** (add/remove/move with proper scope lifecycle).

The current project's **owner resolution** pattern (following data ownership rather than UI nesting for validation responsibility) is a sophisticated insight that FK10 doesn't address. This matters for nested forms and draft isolation — who validates what, and when.

---

## 7. Data Source System

### Current

- **Package structure**: `flux-runtime/src/async-data/` with separate modules for request-runtime, api-cache, data-source-runtime, source-registry, reaction-runtime, async-governance
- **Scope-scoped lifecycle**: Sources registered per scope, cleaned up on scope disposal
- **Shared async governance**: Centralized substrate for data source, reaction, and async validation
- **Cancellation and staleness**: Built into the request runtime
- **Cache**: `ApiCacheStore` for request result caching

### FK10

- **Named data sources**: API, computed, static, polling, WebSocket types
- **Rich lifecycle**: Loading → Ready → Stale → Refreshing → Error → Disposed
- **WebSocket**: Built-in WebSocket data source with reconnect
- **Offline persistence**: `OfflinePolicy` with IndexedDB/localStorage persistence
- **Polling deduplication**: Shared polling timer for multiple subscribers
- **React 19 Suspense integration**: `useDataSource` throws pending promise

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Package structure | Well-separated modules | Single `@flux/data-source` package | Current (better separation) |
| Lifecycle states | Explicit: idle/pending/success/error + derived flags (stale, isRefreshing, etc.) | Rich state machine (Loading/Ready/Stale/Refreshing/Error) | Equivalent (same coverage, different names) |
| WebSocket | Not mentioned | Built-in with reconnect | FK10 |
| Offline support | Not mentioned | OfflinePolicy with persistence | FK10 |
| Shared async governance | Centralized | Per-data-source | Current (cleaner coordination) |
| Polling | Supported | Supported with deduplication | FK10 (more efficient) |
| Suspense integration | Not mentioned | `useDataSource` + Suspense | FK10 |
| Cache | ApiCacheStore | CachePolicy with TTL and key expression | Equivalent |

**Honest assessment**: FK10 has a richer data source model with **WebSocket**, **offline persistence**, and explicit **lifecycle states**. The current project's `async-data/` module structure is well-organized but doesn't address WebSocket or offline scenarios.

However, the current project's **shared async governance** is an important architectural pattern — it coordinates data sources, reactions, and async validation through a single governance layer. FK10 doesn't have an equivalent concept, which could lead to coordination issues (e.g., a data source refresh triggering a reaction that triggers another data source refresh).

---

## 8. Performance Model

### Current

- **Static fast path**: No expression = original reference return, zero cost
- **Identity reuse**: Unchanged expression results reuse previous references
- **Prototype-backed scope reads**: `readVisible()` uses prototype chain, zero allocation
- **Selective subscription**: `useScopeSelector` with path-based dependency tracking
- **Per-path form subscriptions**: O(1) wake-up per field change
- **Row scope isolation**: Table rows isolated by default

### FK10

- **Pre-compiled selectors**: Zustand selectors generated at compile time
- **Single-store subscription batching**: One subscription per scope, version counters
- **Static subtree React.memo**: Static subtrees wrapped in memo boundaries
- **Structural sharing**: Scope updates minimize reference changes
- **Transaction batching**: All mutations go through transactions
- **Performance targets**: Explicit targets with monitoring strategy

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Static optimization | `isStatic` flag, zero-cost | React.memo boundary | Current (simpler, equally effective) |
| Dynamic optimization | Runtime dependency collection + identity reuse | Pre-compiled selectors + version counters | FK10 (theoretically more precise) |
| Scope read performance | Prototype-backed (zero alloc) | Standard object access | Current (real performance win) |
| Subscription efficiency | Per-hook subscription | Single-store batching | FK10 (fewer subscriptions) |
| Performance monitoring | Not built-in | Telemetry events | FK10 |

**Honest assessment**: The performance models are **roughly equivalent in practice**. The current project has a real performance win with prototype-backed scope reads that FK10 doesn't address. FK10's theoretical advantages (pre-compiled selectors, subscription batching) may or may not translate to measurable improvements.

The key question: does FK10's compile-time analysis find optimization opportunities that the current project's runtime collection misses? For simple schemas, probably not. For large, complex schemas with many dynamic dependencies, possibly. But this is unproven.

---

## 9. Styling System

### Current

- **Three-layer model**: Layout (marker classes only) → Widget (self-styled) → Canvas (hybrid CSS)
- **classAliases**: Recursive alias expansion with cycle detection, scoped inheritance
- **Semantic props**: Sugar that converts to Tailwind utilities
- **Marker classes**: `nop-*` prefix, no BEM, `data-slot` for regions, `data-*`/`aria-*` for state
- **Theme**: CSS variables, no ThemeProvider

### FK10

- **Two-layer model**: Layout (marker classes only) → Widget (self-styled)
- **Theme protocol**: Explicit `ThemeContract` with required CSS custom properties
- **Accessibility**: `A11yContract` per renderer, WCAG 2.1 AA default
- **Dark mode**: Host-managed via CSS variable changes
- **Reduced motion**: Renderers respect `prefers-reduced-motion`

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Layout/widget separation | Same principle | Same principle | Equivalent |
| classAliases | Recursive expansion with cycle detection | Not addressed | Current (more sophisticated) |
| Semantic props | Tailwind sugar conversion | Not addressed | Current |
| Theme contract | Implicit (CSS variables) | Explicit (ThemeContract) | FK10 (more discoverable) |
| Accessibility | shadcn/ui provides a11y | A11yContract + WCAG 2.1 AA | FK10 (more explicit) |
| Dark mode | Host-managed | Host-managed + prefers-reduced-motion | FK10 (more complete) |

**Honest assessment**: The current project has a **more sophisticated styling system**. The `classAliases` mechanism, semantic props sugar, and the three-layer model (including canvas-level optimization) are more complete than FK10's two-layer model.

FK10 adds the **explicit ThemeContract** and **A11yContract**, which are documentation/specification advantages rather than runtime advantages.

---

## 10. Debugging & Developer Experience

### Current

- **`@nop-chaos/nop-debugger` package**: Full-featured debugger panel with:
  - Event timeline (compile/render/action/api events with timestamps, filtering)
  - Interaction trace (chains request → action → error)
  - Component inspector (by CID, by DOM element)
  - Expression evaluation
  - Node anomaly detection
  - Session export and import
  - Automation API (`window.__NOP_DEBUGGER_API__`)
  - Overview/timeline/network/node tabs
  - Implemented as a renderer plugin (`NopDebuggerController.plugin`)
- `getDebugSnapshot()` on `ActionScope`
- Monitor hooks for action dispatch
- `SchemaCompiler` produces `CompiledTemplate` with source information

### FK10

- **Time-travel inspector**: State history with jump/diff/filter/replay
- **Schema-source mapping**: Every runtime node carries `SourceLocation`, DOM attributes link to schema
- **Diagnostic system**: Compiler-emitted diagnostics with suggestions
- **Telemetry events**: Observable state transitions for monitoring
- **DevTools browser extension**: Planned (Phase 3)
- **HMR**: Hot schema swap with state migration

### Comparison

| Aspect | Current | FK10 | Winner |
|--------|---------|------|--------|
| Event timeline | Yes (compile/render/action/api) | Yes (state change/action/expr eval/render) | Equivalent |
| Component inspector | Yes (by CID, by DOM) | Schema-source mapping to DOM | Current (more practical) |
| Time-travel (state) | No (event log only, no state jump) | Yes (jump to any historical state) | FK10 |
| Session export | Yes | Not mentioned | Current |
| Automation API | Yes (window.__NOP_DEBUGGER_API__) | Not mentioned | Current |
| Diagnostics | Compiler warnings/errors | Structured diagnostics with suggestions | FK10 (more helpful) |
| HMR | Not addressed | Hot schema swap with state migration | FK10 |
| Plugin architecture | Debugger is a renderer plugin | Not addressed | Current |

**Honest assessment**: The current project's debugger is **far more capable than FK10's design gives credit for**. It has an event timeline, interaction tracing, component inspector, session export, and an automation API. The one thing it lacks is FK10's **time-travel state jumping** (rewinding to a historical state). This is a real feature gap, but the overall debugging story is much closer than "⭐⭐½ vs ⭐⭐⭐⭐" would suggest.

---

## 11. Overall Scorecard

| Dimension | Current (nop-chaos-flux) | FK10 (v10) | Notes |
|-----------|-------------------------|------------|-------|
| Schema compilation | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Current: simpler, proven. FK10: more stages, unproven optimization |
| Scope / state management | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Both have projections, transactions. Current: prototype optimization, 3-registry separation |
| Expression engine | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Functionally equivalent. FK10 has compile-time analysis edge (unproven) |
| Component model | ⭐⭐⭐⭐½ | ⭐⭐⭐ | Current: 3-category ownership model is more mature. FK10: error boundaries |
| Action system | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | Current: plugins, imports, dispatch/effects separation. FK10: chain-level AbortSignal |
| Form / validation | ⭐⭐⭐⭐½ | ⭐⭐⭐ | Current: compiled graph, owner resolution, per-path subscriptions, 7 array ops. FK10: undo/redo |
| Data source system | ⭐⭐⭐⭐ | ⭐⭐⭐½ | Current: explicit lifecycle states, shared async governance. FK10: WebSocket, offline (unimplemented) |
| Performance | ⭐⭐⭐⭐ | ⭐⭐⭐½ | Current: prototype reads, proven optimizations. FK10: theoretical optimizations |
| Styling | ⭐⭐⭐⭐ | ⭐⭐⭐½ | Current: classAliases, semantic props. FK10: explicit contracts |
| Debugging / DX | ⭐⭐⭐½ | ⭐⭐⭐⭐ | Current: full debugger with timeline, inspector, export. FK10: time-travel state jump |
| Host integration | ⭐⭐⭐⭐ | ⭐⭐⭐½ | Current: imports, domain-host pattern, capability projection manifest. FK10: simpler |
| **Implementation maturity** | **Working system with 40+ test files** | **Zero lines of code** | Current wins by default |

---

## 12. Honest Conclusions

### Where the Current Project Is Genuinely Better

1. **Three-registry separation** (data/behavior/capability) is cleaner than FK10's combined model
2. **Owner resolution** for validation (following data ownership, not UI nesting) is a sophisticated insight
3. **Prototype-backed scope reads** with caching are a real performance optimization
4. **Domain-host-renderer** pattern is a well-thought-out integration mechanism
5. **Action dispatch/effects separation** (`action-core` vs `runtime adapter`) is cleaner
6. **Import system** (`xui:imports`) provides controlled namespace loading
7. **Shared async governance** coordinates data sources, reactions, and validation
8. **classAliases** with recursive expansion and cycle detection is more sophisticated
9. **Full debugger** with event timeline, interaction tracing, component inspector, session export, and automation API
10. **Renderer plugin architecture** — debugger is implemented as a plugin, enabling extensibility
11. **Capability projection manifest** for static contract validation between schema and domain hosts
12. **i18n integration** (`@nop-chaos/flux-i18n`) with i18next
13. **Array field operations** — 7 first-class operations (append/prepend/insert/remove/move/swap/replace) with index remapping
14. **It exists and works** with 40+ test files covering edge cases — FK10 is a design doc

### Where FK10 Is Genuinely Better

1. **Scope chain projections** provide explicit, typed data import for isolated scopes
2. **Structured concurrency** (AbortSignal propagation) handles cancellation properly
3. **Transaction model** supports rollback and atomic multi-path writes
4. **Time-travel inspector** with schema-source mapping is a significant DX improvement
5. **Per-renderer error boundaries** prevent cascading failures
6. **WebSocket data sources** and **offline persistence** are table-stakes features the current project lacks
7. **Undo/redo** at the form level is a user-facing feature the current project doesn't have
8. **Explicit ThemeContract** and **A11yContract** make requirements discoverable
9. **Flat action steps syntax** is more readable than nested then chains

### Where They're Roughly Equivalent

1. Expression engine (both are AST walkers with similar capabilities)
2. Layout/widget styling separation (same principle)
3. Region rendering with parameterized slots
4. Three-path action resolution (platform/component/namespace)
5. Compile-once-execute-many compilation model
6. Host sovereignty principle
7. Scope projections (both have explicit mechanisms)
8. Data source lifecycle (both have explicit state models)
9. AbortSignal usage (both use pervasively; FK10 has chain-level propagation)

### Dimensions the Current Project Covers That FK10 Doesn't Address

1. **i18n**: `@nop-chaos/flux-i18n` with i18next integration, `zh-CN`/`en-US` support
2. **Renderer plugin architecture**: Extensible plugin system; debugger is a plugin
3. **Capability projection manifest**: Static contract validation between schema and domain hosts at compile time
4. **Structural loop protection**: `StructuralLoopContext` prevents infinite rendering loops
5. **Comprehensive test suite**: 40+ test files covering edge cases in flux-runtime alone

### FK10 Concepts the Current Project Could Learn From

1. **Per-renderer error boundaries** with schema-specified fallback — prevents cascading failures
2. **Flat action steps syntax** — more readable than nested then chains
3. **Explicit A11yContract** — makes accessibility requirements discoverable per renderer
4. **Explicit ThemeContract** — documents required CSS custom properties
5. **Time-travel state jumping** — add state snapshot recording to existing debugger timeline
6. **DepPattern concept** — more nuanced invalidation patterns for complex schemas

### Recommended Path Forward

Rather than replacing the current architecture with FK10, the most pragmatic approach is to **selectively adopt FK10's genuine innovations** into the current project:

| FK10 Innovation | Adoption Strategy | Effort | Note |
|----------------|-------------------|--------|------|
| Scope chain projections | **Already exists** (`projected-scope-store.ts`) | None | Audit and document existing mechanism |
| Structured concurrency (dialog AbortSignal) | Add dialog-scope AbortSignal propagation for chain-level cancellation | Low | 68 AbortSignal instances already exist; gap is dialog→chain propagation |
| Transaction model | Evaluate if rollback support is needed for draft isolation | Low–Medium | Current synchronous model is simpler and works; add only if specific use case exists |
| Time-travel state jump | Add state history recording to existing debugger | Medium | Debugger has event timeline; add state snapshot recording for jump capability |
| Per-renderer error boundaries | Add `ErrorBoundary` wrapper in `NodeRenderer` | Low | |
| Undo/redo | Build on scope transactions for form scopes | Medium | |
| Flat action steps | Add `steps` desugaring in `SchemaCompiler` | Low | |
| WebSocket data sources | Add `WebSocketDataSource` to `async-data/` module | Medium | Product-dependent |
| Offline persistence | Add `OfflinePolicy` to data source runtime | High | Product-dependent — only if offline is a requirement |
| Explicit ThemeContract | Document required CSS variables | Low | |
| DepPattern for invalidation | Evaluate if more precise invalidation patterns help complex schemas | Medium | Research first — may not improve real-world performance |

This selective approach captures FK10's genuine innovations at minimal cost, while preserving the current project's architectural strengths that FK10 doesn't match.
