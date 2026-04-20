# Experimental Design vs. Current Flux Architecture: Comparative Analysis

> **Purpose**: Compare the experimental "next-gen" design (in `next-gen-low-code-runtime-kernel-design.md`) with the current `nop-chaos-flux` implementation to determine which represents the truly superior architecture for a next-generation low-code runtime.

---

## 0. Executive Summary

**Verdict: The current Flux architecture is the more mature, production-viable design. The experimental design has superior ideas in two areas (effect-calculus actions and effect scoping) but is weaker in almost every other dimension.**

The experimental design is a **clean-room theoretical exercise** — architecturally elegant in its symmetry but carrying significant implementation risk from unproven concepts (bytecode VM expression engine, pre-computed dependency graph). The current Flux design is an **evolved, battle-informed architecture** that has already solved many of the hard problems the experimental design merely describes at the interface level.

The experimental design's biggest contribution is not the design itself, but the **questions it forces us to ask** about the current architecture — particularly around effect discipline and action composability.

---

## 1. Subsystem-by-Subsystem Comparison

### 1.1 Schema Compilation

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Compilation model** | Pipeline: Parse → Resolve → Classify → Compile → Optimize → TypeCheck | Similar pipeline: normalization → region extraction → field classification → expression compilation → template assembly |
| **Output artifact** | `CompiledSchema` with explicit `PropSlot` classification | `TemplateNode` with `CompiledRuntimeValue` classification |
| **Static/dynamic split** | `PropSlot: static \| dynamic \| i18n \| region \| action` | `CompiledRuntimeValue: { kind: 'static', isStatic: true } \| { kind: 'dynamic', isStatic: false }` |
| **Serialization** | Claims to be serializable (no closures) — but `CompiledExpr.bytecode` is a `Uint32Array` and `constantPool` is `unknown[]`, which is effectively a closure-equivalent | Template nodes are immutable but carry compiled expression objects with `exec()` methods — not serializable |
| **Renderer field metadata** | Uses `StaticRendererIndex.getPropSchema()` to classify fields at compile time | Uses `RendererDefinition.fields` metadata — same concept, different name |

**Winner: Tie.** Both designs use nearly identical compilation strategies. The experimental design's `PropSlot` is slightly more explicit with the `i18n` kind, but the current Flux design achieves the same with its `CompiledRuntimeValue` classification plus runtime i18n resolution.

**Critical observation**: Both designs claim "compiled artifact is pure data / serializable," but neither truly achieves this. The experimental design's `CompiledExpr` with `bytecode + constantPool` is equivalent to a closure (it's an opaque binary blob). The current Flux's `CompiledExpression` carries an `exec()` method. Neither can be `JSON.stringify`'d without custom serialization.

### 1.2 Expression Engine

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Compilation target** | Register-based bytecode (`Uint32Array`) | AST (recursive-descent parse → tree) |
| **Execution model** | Bytecode VM interpreter | AST-walking evaluator |
| **No eval/new Function** | Yes | Yes |
| **Dependency tracking** | Via read barriers in VM instructions (`LOAD_VAR` logs to `DependencyLog`) | Via Proxy-based scope interception during evaluation |
| **Built-in functions** | In constant pool, CALL_FUNC opcode | ~25 global functions + 3 namespace objects |
| **Lazy evaluation** | Not mentioned | `IF()`/`SWITCH()` use lazy thunks |

**Winner: Current Flux.**

The bytecode VM is the experimental design's most ambitious and most risky claim. Let me explain why AST-walking is actually better for this specific domain:

1. **Low-code expressions are short**: Typical expressions like `${user.name}`, `${items.length > 0}`, `${SUM(items, item => item.price)}` are 5–30 tokens. Bytecode's advantage (amortized dispatch overhead over large programs) doesn't materialize.

2. **AST-walking with Proxy collection is battle-tested**: The current Flux approach — Proxy-wrapped scope that intercepts property reads during evaluation — is simple, debuggable, and produces exact dependency roots. The experimental design's "read barrier in VM instructions" is conceptually the same but requires building and debugging a custom VM.

3. **Development cost**: An AST-walking evaluator is ~1,000 lines of well-understood code. A register-based bytecode VM with its own instruction set, constant pool, and interpreter loop is ~3,000–5,000 lines of novel code that needs its own debugging tools.

4. **WASM portability is aspirational**: The experimental design mentions WASM compilation as a future benefit, but this has never been demonstrated. The current Flux expression engine runs in under 1μs per evaluation — there is no performance problem to solve.

**Where the experimental design wins**: If expressions were to become significantly more complex (hundreds of operations, loop constructs, etc.), bytecode would eventually win on performance. But the requirements explicitly exclude general-purpose computation.

### 1.3 Scope / Data Environment

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Core model** | `Scope` with `get/has/_applyChange` | `ScopeRef` with `get/has/update/readOwn/readVisible` |
| **Inheritance** | Parent chain with shadowing, `isolated` flag | Parent chain with shadowing, `isolate: true` |
| **Write model** | All writes through `EffectDispatcher` → `Scope._applyChange` | Direct `scope.update(path, value)` |
| **Read-only view** | `ReadableScope` for L4/L5 | `ScopeRef` itself is the read API (update is separate method) |
| **Change notification** | `RootChange` (root-normalized) | `ScopeChange` (root-normalized paths) |
| **Structural sharing** | Claimed but not specified | Prototype-backed `readVisible()` for zero-alc inheritance |

**Winner: Current Flux, with one important exception.**

The experimental design's insistence that **all writes go through the effect dispatcher** is architecturally superior to the current Flux's direct `scope.update()`. In the current Flux, any code with a `ScopeRef` reference can write to it, making it impossible to audit or intercept all state mutations centrally. The experimental design's read/write split (`ReadableScope` vs internal `_applyChange`) enforces discipline that the current Flux lacks.

However, the current Flux's `ScopeRef` is a simpler, more pragmatic design that works well in practice. The cost of adding an `EffectDispatcher` layer to every write is not zero — it adds latency, complexity, and error surface for a benefit (centralized auditing) that can be achieved more cheaply with a dev-mode write logger.

**Where the experimental design wins**: The `ReadableScope` vs internal `_applyChange` split is a genuinely better encapsulation model. The current Flux could adopt this as an evolutionary improvement.

### 1.4 Dependency Tracking / Reactivity

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Granularity** | Root-normalized (acknowledged as conservative over-approximation) | Root-normalized (same tradeoff) |
| **Collection mechanism** | VM read barriers (theoretical) | Proxy-based runtime interception (implemented) |
| **Compile-time pre-computation** | Claims dependency graph is pre-computed at compile time | `dependsOn` is explicit at compile time; runtime collection is supplementary |
| **Three consumer types** | Source signals, derived signals, effect signals — same dependency model | Data sources, reactions, expressions — same unified model |
| **Self-write protection** | `suppressFor(sourceId, roots)` | Sources filter out their own published roots |
| **Topological ordering** | Explicitly required (glitch-free guarantee) | Implicit via scope subscription ordering |

**Winner: Current Flux.**

Both designs converge on the same fundamental approach: root-normalized dependency tracking with conservative over-approximation. The experimental design's claim of "compile-time pre-computed dependency graph" is **overstated**:

- Expression dependencies depend on runtime values (think: `items[getUserIndex()].name` — the index is dynamic)
- The compile-time graph can only list *possible* dependency roots, not *actual* ones for a given execution
- The current Flux's approach (compile-time `dependsOn` as authoritative hint + runtime Proxy collection as fallback) handles this duality correctly

The experimental design's `DependencyRuntime` with `wireDerived`, `wireDataSource`, `wireReaction`, `wireProjection` is architecturally clean but describes what is essentially a graph data structure that both designs would need to implement.

### 1.5 Action System

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Action representation** | Algebraic data type: `CompiledAction = dispatch \| sequence \| parallel \| guarded \| retry \| debounce \| timeout \| chain \| noop` | Schema-driven: `ActionSchema { action, args, when, then, onError, parallel, retry, timeout }` |
| **Effect channel** | Unified `EffectDispatcher` with typed effect variants | Direct handler invocation (built-in / component / namespace) |
| **Effect scoping** | `EffectScope` groups effects from a single action execution | No explicit effect scoping |
| **Three-layer resolution** | Built-in → component → namespace | Built-in → component → namespace (identical) |
| **Action scope** | Not explicitly lexical | `ActionScope` with parent chaining, `xui:imports` for namespace provisioning |
| **Control flow** | `chain` with `then`/`onError`/`finally` | `then`/`onError` chains, no `finally` |

**Winner: Experimental Design (clear win).**

This is the one area where the experimental design is genuinely superior:

1. **Effect-calculus action ADT**: Modeling actions as a recursive algebraic data type is more elegant and extensible than the current Flux's schema-driven approach. The ADT can be extended with new combinators without changing the executor.

2. **Unified effect channel with `EffectScope`**: The current Flux has no centralized effect interception point. Actions directly call handlers that may mutate state, make requests, and trigger side effects without any audit trail. The experimental design's `EffectDispatcher` + `EffectScope` provides:
   - Automatic cancellation on scope disposal
   - Effect ordering guarantees (sequential within action, branch-order for parallel)
   - Auditability (every side effect passes through one channel)

3. **`finally` clause**: The current Flux lacks a `finally` equivalent, forcing developers to duplicate cleanup logic in both `then` and `onError`.

**Where the current Flux wins**: The `ActionScope` with parent chaining and `xui:imports` is a more sophisticated scope model for actions than the experimental design's simple three-layer resolution. The experimental design doesn't address how namespaces are provisioned to specific scopes.

### 1.6 Rendering System

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Framework coupling** | Claims framework-portable via `RendererHost` protocol | React-specific (`React.ReactNode`, hooks, context) |
| **Renderer contract** | `RendererInstance.mount/update/unmount` lifecycle | `RendererComponentProps<T>` with hooks |
| **Region rendering** | `RegionHandle.render(bindings)` returns `RenderResult` | `RenderRegionHandle.render(options)` returns `React.ReactNode` |
| **Error boundaries** | `RendererHost.wrapErrorBoundary()` | React error boundaries in `NodeRenderer` |
| **Owner boundaries** | Not explicitly addressed | Creator-owned: page/form/surface renderers create their own runtimes |
| **Renderer classification** | Layout vs widget | Layout vs widget (identical concept) |

**Winner: Current Flux.**

The experimental design's "framework portability" claim is **aspirational but unproven**:

1. **No concrete multi-framework evidence**: The design defines a `RendererHost` protocol but provides implementations for zero frameworks. Until someone builds adapters for React, Vue, and Solid, this is an untested abstraction.

2. **React is the right commitment**: React has ~70% market share in enterprise low-code platforms. Designing for framework portability adds abstraction cost that benefits <30% of potential adopters. The current Flux's React-specific design is more pragmatic.

3. **Owner-boundary pattern is missing**: The current Flux's "creator-owned boundaries" pattern (page renderer creates PageRuntime, form renderer creates FormRuntime) is a crucial architectural decision that prevents the `NodeRenderer` from becoming a god object. The experimental design's `RendererOrchestrator.instantiate()` creates the entire tree top-down, which is simpler but less scalable.

4. **`RenderResult = unknown` is too opaque**: The current Flux's `React.ReactNode` is specific and type-safe. The experimental design's `unknown` provides zero compile-time guarantees.

**Where the experimental design wins**: The `RendererHost` protocol is a defensible long-term bet if multi-framework support becomes a real requirement. But the current Flux could add this as an adapter layer without redesigning the core.

### 1.7 Form & Validation

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Validation model** | `ValidationGraph` with `CompiledValidationRule` (validatorRef) | `CompiledFormValidationModel` with `CompiledRuleTemplate` |
| **Form runtime** | `FormRuntime` with getValue/setValue/validate/submit/draft | `FormRuntime extends ValidationScopeRuntime` with richer API |
| **Validation timing** | `'submit' \| 'change' \| 'blur'` | `showErrorOn` policy + timing configuration |
| **Draft isolation** | `DraftScope` with commit/discard | Renderer-level FormRuntime instances |
| **Rule representation** | Pure data (`validatorRef: string`) | Closure-based (`CompiledRuleTemplate` with `args: CompiledRuntimeValue`) |
| **Dependency substrate** | Same as expression dependency tracking | Separate compile-time field-graph (more correct for cross-field rules) |

**Winner: Current Flux.**

The current Flux's validation system is notably more sophisticated:

1. **Separate dependency substrate**: The current Flux recognizes that validation dependencies (which fields affect which rules) are fundamentally different from scope dependencies (which data paths affect which expressions). Cross-field validation rules like "endDate > startDate" depend on both `startDate` and `endDate` fields, not on the scope root. The experimental design uses the same root-normalized model for both, which is less precise.

2. **`ValidationScopeRuntime` as separate from FormRuntime**: The current Flux separates validation (which any scope can have) from form management (dirty/touched/submit state). This is more flexible than the experimental design's monolithic `FormRuntime`.

3. **Owner-level validation arbitration**: The current Flux handles concurrent validation runs with generation-aware entry arbitration (e.g., `submit` supersedes `change`-triggered validation). The experimental design doesn't address this.

### 1.8 Data Sources / API

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Data source types** | API-backed only (implied) | API-backed + formula-backed (unified lifecycle) |
| **Refresh strategies** | `'manual' \| 'polling' \| 'onDependency'` | Manual + polling + dependency-based + `stopWhen` condition |
| **Result mapping** | `paramMapping` (scopePath → paramName) | `resultMapping` + `mergeToScope` + `mergeStrategy` (replace/append/prepend/merge/upsert) |
| **Scope injection** | `paramMapping` concept | `includeScope: '*' \| string[]` |
| **Refresh dedup** | Not specified | `cancel-previous` / `ignore-new` / `parallel` strategies |
| **Reactions** | `CompiledReaction` with watchExpr/conditionExpr/action | `ReactionSchema` with watch/when/immediate/debounce/once/actions |

**Winner: Current Flux (by a significant margin).**

The current Flux's data source system is one of its most mature subsystems:

1. **Formula-backed data sources**: A purely synchronous computed value that follows the same lifecycle as API-backed sources. The experimental design only considers async sources.

2. **Rich merge strategies**: `replace | append | prepend | merge | upsert` with configurable `mergeKey`. The experimental design has only basic set/merge.

3. **Refresh dedup strategies**: When a dependency triggers while a refresh is in-flight, the current Flux offers three strategies. The experimental design doesn't address this race condition.

4. **`stopWhen` condition**: Stop polling when a condition is met. Not present in the experimental design.

5. **`includeScope`**: Configurable scope variable injection into requests (`'*'` for all, or explicit list). The experimental design's `paramMapping` is less flexible.

### 1.9 Surface/Dialog Management

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Surface types** | `dialog \| drawer` with shared model | `dialog \| drawer` with shared model |
| **Stack management** | `SurfaceManager` with stack | `SurfaceRuntime`/`SurfaceStore` with stack |
| **Scope ownership** | Each surface has independent scope | Same |
| **Focus management** | "Only top surface has focus" (stated) | Focus trap, escape handling, backdrop dismiss (implemented) |

**Winner: Tie.** Both designs use the same fundamental model. The current Flux has more implementation detail.

### 1.10 Loop/Table/Collection Rendering

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| **Row scope** | Isolated, with projections | Isolated by default, with `rowData` projection |
| **Scope reuse** | Not specified (implied per-render) | Cached by `rowKey`, reused across renders |
| **Row identity** | Not specified | `rowKey`-based identity separate from value path |
| **Instance path** | Not specified | `instancePath` with `repeatedTemplateId + instanceKey` |

**Winner: Current Flux.**

The current Flux's table rendering model is significantly more sophisticated:

1. **Row scope caching**: Scopes are cached by `rowKey` and reused across renders. This avoids recreating scope objects, dependency subscriptions, and state entries on every render.

2. **Value path vs runtime identity separation**: The current Flux explicitly separates `users.0.name` (value path, index-based) from row identity (`rowKey`-based). This handles sorting, filtering, and virtual scrolling correctly.

3. **Row-following UI state**: Selection, expansion, and edit mode are keyed by `rowKey`, so they persist across data changes.

The experimental design's `LoopRuntime` is correct at the concept level but missing the implementation details that make table rendering performant at scale.

---

## 2. Cross-Cutting Comparison

### 2.1 Framework Agnosticism

| Claim | Experimental Design | Current Flux |
|-------|-------------------|--------------|
| Core is framework-free | Claims L1–L4 are framework-agnostic | Core (flux-core, flux-formula, flux-runtime) is truly framework-agnostic |
| React coupling | Only L5 | Only flux-react and renderer packages |
| Testability without DOM | Claimed | Demonstrated (Vitest tests run without DOM) |

Both designs achieve framework agnosticism for their core logic. The current Flux is more honest about its React commitment in the rendering layer.

### 2.2 Compile-Time vs Runtime Split

Both designs make the same fundamental split. The experimental design's claims are more strongly worded ("if a problem can be solved at compile time, it must be") but both designs end up with the same practical boundary:

- Expression compilation: compile-time
- Schema structure analysis: compile-time
- Type checking: compile-time
- Expression evaluation: runtime
- Scope creation/writes: runtime
- Action dispatch: runtime

### 2.3 Type Safety

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| TypeScript annotations | Extensive but with pervasive `unknown` | Extensive with more specific types where possible |
| Runtime type checks | `ExprType` tagged union (proposed) | No runtime type system; TypeScript-only |
| Schema-level type safety | Claimed via compile-time type checking | Achieved via `RendererDefinition.fields` metadata |
| Generic type parameters | Used on `RendererComponentProps<S>` | Same pattern |

**Winner: Tie.** Neither design achieves true type safety for dynamic schema values. The experimental design's `ExprType` runtime type tag system adds complexity without clear benefit — TypeScript's `unknown` with narrowing is sufficient.

### 2.4 Testability

| Dimension | Experimental Design | Current Flux |
|-----------|-------------------|--------------|
| Per-layer isolation | Explicitly designed for | Achieved through package boundaries |
| Mock effects | `EffectDispatcher` enables easy mocking | Host adapter (`env.fetcher`, etc.) enables mocking |
| No-DOM testing | Claimed for L1–L4 | Demonstrated in test suite |

**Winner: Tie.** Both are testable. The experimental design's `EffectDispatcher` provides slightly better mockability for actions, but the current Flux's `env` adapter achieves the same goal.

---

## 3. The Experimental Design's Genuinely Better Ideas

These are ideas from the experimental design that the current Flux should consider adopting:

### 3.1 Effect Scoping and Transactional Semantics (High Value)

**Current Flux gap**: Actions can trigger side effects (scope writes, API calls, navigation) without any centralized interception or grouping. There's no way to:
- Cancel all in-flight effects when a scope is disposed
- Audit all effects triggered by a specific action
- Roll back effects from a failed action chain

**Recommendation**: Introduce an `EffectScope` concept that groups effects from a single action dispatch. This doesn't require rewriting the action system — it can be layered on top.

### 3.2 Read/Write Split for Scope Access (Medium Value)

**Current Flux gap**: `ScopeRef.update()` is accessible to any code holding a `ScopeRef`. This makes it impossible to enforce "all writes go through the action system."

**Recommendation**: Create a `ReadableScopeRef` interface and restrict renderer/action handler access to read-only scope. Writes go through the action dispatch path.

### 3.3 Action `finally` Clause (Low Value, Easy Win)

**Current Flux gap**: No `finally` equivalent in action chains. Cleanup logic must be duplicated in `then` and `onError`.

**Recommendation**: Add `finally` to `ActionSchema` and handle it in the action executor.

---

## 4. The Current Flux's Structural Advantages

These are areas where the current Flux's design is fundamentally superior:

### 4.1 Creator-Owned Boundaries

The current Flux's "creator-owned boundaries" pattern is a crucial architectural decision that the experimental design misses entirely. In the current Flux:
- Page renderer creates `PageRuntime`
- Form renderer creates `FormRuntime`
- Surface host creates `SurfaceRuntime`
- Domain host renderer creates its own `ActionScope`

This prevents `NodeRenderer` from becoming a god object that knows about every runtime type. The experimental design's `RendererOrchestrator.instantiate()` creates everything top-down, which is simpler but less scalable.

### 4.2 Validation Dependency Substrate

The current Flux recognizes that validation dependencies are different from scope dependencies and uses a separate compile-time field-graph. This is more correct for cross-field rules and prevents false invalidation.

### 4.3 Data Source Richness

The current Flux's data source system supports formula-backed sources, rich merge strategies, refresh dedup, and `stopWhen` conditions. The experimental design covers the basic requirements but misses the real-world complexity.

### 4.4 Row Scope Caching and Identity

The current Flux's rowKey-based identity model with scope caching handles sorting, filtering, and virtual scrolling. The experimental design doesn't address this.

### 4.5 Proxy-Based Dependency Collection (Pragmatic)

The Proxy-based runtime dependency collection is simpler to implement and debug than the experimental design's bytecode VM read barriers. For short expressions (the common case in low-code), AST-walking is fast enough.

### 4.6 `xui:imports` and Action Scope

The current Flux's `xui:imports` mechanism provides declaration-style import semantics for action namespaces and expression helpers. The experimental design doesn't address how namespaces are provisioned to specific scopes.

---

## 5. Summary Scorecard

| Dimension | Experimental Design | Current Flux | Winner |
|-----------|:---:|:---:|:---:|
| Schema Compilation | 8 | 8 | Tie |
| Expression Engine | 6 | 8 | **Flux** |
| Scope / Data Environment | 7 | 8 | **Flux** |
| Dependency Tracking | 7 | 8 | **Flux** |
| Action System | **9** | 7 | **Experimental** |
| Rendering System | 6 | 8 | **Flux** |
| Form & Validation | 7 | 9 | **Flux** |
| Data Sources / API | 6 | 9 | **Flux** |
| Surface Management | 7 | 7 | Tie |
| Loop / Table / Collection | 6 | 8 | **Flux** |
| Framework Portability | 5 (unproven) | 7 (React-committed) | **Flux** (pragmatic) |
| Effect Discipline | **9** | 6 | **Experimental** |
| Type Safety | 7 | 7 | Tie |
| Testability | 8 | 8 | Tie |
| **Overall** | **7.0** | **7.9** | **Flux** |

---

## 6. Conclusion

### Why the Current Flux is the Truly "Next-Generation" Design

The current Flux architecture **is** a next-generation low-code runtime. It embodies the key insights that distinguish a modern DSL runtime from legacy approaches:

1. **Unified value semantics** — No parallel `xxxExpr`/`xxxOn` field families. Every field is classified by its role, not by naming convention.

2. **Compile-time extraction with runtime flexibility** — Validation graphs, dependency declarations, and region structures are extracted at compile time, but runtime collection supplements them for cases where static analysis is insufficient.

3. **Creator-owned boundaries** — Each runtime type (page, form, surface) is created by the renderer that owns it, not by a god-object orchestrator. This is the most important architectural decision for long-term scalability.

4. **Pragmatic reactivity** — Root-normalized dependency tracking with Proxy-based collection is the right tradeoff between precision and simplicity. The experimental design converged on the same tradeoff after review.

5. **Rich data source lifecycle** — Formula-backed sources, merge strategies, refresh dedup, and `stopWhen` conditions demonstrate real-world usage experience that the experimental design lacks.

### What the Experimental Design Contributes

The experimental design is not wasted effort. It provides:

1. **A clean reference architecture** — The six-layer model with explicit boundaries is a useful mental model for understanding the current Flux's structure.

2. **Effect discipline** — The `EffectDispatcher` + `EffectScope` + `ReadableScope` pattern is the one area where the experimental design is genuinely better. The current Flux should adopt this.

3. **Action ADT** — Modeling actions as a recursive algebraic data type is more elegant and extensible than schema-driven action chains.

4. **Validation of design decisions** — The fact that both designs converged on root-normalized dependency tracking, isolated scopes with projections, compile-time classification, and three-layer action resolution validates these as the correct architectural choices.

### Final Assessment

**The current Flux architecture is the more mature, production-ready, and truly next-generation design.** The experimental design is a valuable thought experiment that identifies one high-value improvement (effect discipline) and validates the current architecture's core decisions. The experimental design's most distinctive feature (bytecode VM) is its weakest point — it adds complexity without demonstrable benefit for the expression workloads typical of low-code platforms.

The recommended path forward: **Adopt the experimental design's effect discipline ideas into the current Flux architecture, not the other way around.**
