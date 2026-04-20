# Experimental Design vs Current Flux Architecture: Comparative Analysis

> **Date**: 2026-04-20  
> **Experimental Design**: `docs/experiments/algebraic-kernel-design.md` (v3)  
> **Current Project**: `nop-chaos-flux` — React 19 + Zustand + TypeScript  
> **Purpose**: Objective comparison to determine which design is truly "next-generation"

---

## 0. Critical Context: Governing Principles

This comparison is governed by `docs/architecture/flux-design-principles.md` and `docs/architecture/flux-dsl-vm-extensibility.md`. These are not suggestions — they define hard architectural constraints.

**Six governing principles:**

1. **DSL First** — DSL is a first-class artifact with its own lifecycle
2. **Authoring-Execution Separation** — compile boundary with different optimization targets
3. **Reactive Data-Driven** — implicit dependency, read-write separation, Capability convergence
4. **Progressive Evolution** — complexity grows from simple forms, primitive set stays small
5. **Lexical Ownership** — ScopeRef (data) / ActionScope (behavior) / ComponentHandleRegistry (instance) are architecturally separated
6. **Domain Isolation** — core stays small, domain complexity stays outside

**Usage requirement**: Flux is embedded in a large React system. Router loads JSON schema dynamically. Different partial pages don't interact. Adaptation through RenderEnv.

**This context changes several of my earlier judgments. The most significant change**: the current project's ScopeRef/ActionScope/ComponentHandleRegistry three-way separation is not merely "more mature" — it is a **hard requirement** from the Lexical Ownership principle. The experimental design's original monolithic Scope model violated this principle (already corrected in v3).

---

## 1. Methodology

This comparison evaluates both designs against the same requirements document (`docs/low-code-dsl-runtime-requirements.md`) across four dimensions:

1. **Architectural elegance** — conceptual clarity, orthogonality, minimality
2. **Engineering practicality** — implementability, debuggability, onboarding cost
3. **Performance characteristics** — theoretical performance profiles
4. **Real-world readiness** — handling of edge cases, production concerns

**Important caveat**: The current project is a **working implementation** with battle-tested code, real bug fixes (documented in `docs/bugs/`), and iterative refinement. The experimental design is a **theoretical document** that has been reviewed but never executed. This asymmetry matters.

---

## 2. Dimension-by-Dimension Comparison

### 2.1 Compilation Model

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Pipeline** | 4-stage: Parse → Analyze → Optimize → Security | 2-stage: SchemaCompiler → TemplateNode |
| **Output** | `CompiledIR` (JSON-serializable, versioned) | `CompiledTemplate` + `TemplateNode` tree |
| **Field classification** | `staticProps` / `dynamicProps` / `asyncProps` | `CompiledRuntimeValue` with `isStatic` flag |
| **i18n** | Compile-time replacement (zero runtime cost) | Runtime i18n service (i18next integration) |
| **Security pass** | Explicit pass in compiler | Not explicitly designed |
| **IR versioning** | Explicit `version` field | No versioning (compile/runtime co-versioned) |

**Analysis**: 

The experimental design has a cleaner separation between compile-time and runtime. The `CompiledIR` being JSON-serializable enables compilation in a Web Worker or even server-side — a genuine architectural advantage. The compile-time i18n eliminates an entire runtime subsystem.

However, the current project's `CompiledRuntimeValue` with `isStatic` flag achieves the same "static zero-overhead" goal with simpler machinery. The current project's field classification via `RendererDefinition.fields` metadata is more extensible — renderers declare their field schema, and the compiler classifies accordingly. The experimental design's `staticProps`/`dynamicProps` split is hardcoded in the compilation model.

**Winner**: Experimental design has a cleaner theoretical boundary (serializable IR, compile-time i18n). Current project has a more pragmatic and extensible field classification system.

**Score**: Experimental 7/10 vs Current 8/10 (pragmatism wins in compilation)

### 2.2 Expression System

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Representation** | Closed Expr AST with `LexicalBinding` | `CompiledValueNode` tree with `CompiledExpression` |
| **Evaluation** | `ExprEvaluator.evaluate(expr, EvalEnv)` | `CompiledRuntimeValue.exec(scope)` |
| **Variable resolution** | Compile-time → `LexicalBinding { depth, index }` | Runtime → `EvalContext.resolve(path)` string lookup |
| **Dependency extraction** | Compile-time `extractDependencies()` | Compile-time + runtime `ScopeDependencyCollector` |
| **Slot parameters** | First-class `slotParam` Expr node | `$slot` frame binding in instance path |

**Analysis**:

The experimental design's compile-time resolution of variable names to `LexicalBinding(depth, index)` is genuinely superior to runtime string-based `resolve(path)`. Eliminating hash map lookups in hot expression evaluation is a real performance win, especially in large schemas with many expressions.

However, the current project's `CompiledValueNode` tree is more flexible — it handles the "unified value semantics" (a field can be literal, expression, template, array, or object) through a single recursive type. The experimental design splits this into `staticProps`/`dynamicProps`, which is less elegant for mixed cases (e.g., an object where some fields are static and others are dynamic).

**Winner**: Experimental design wins on expression evaluation performance. Current project wins on value representation elegance (unified value semantics).

**Score**: Experimental 8/10 vs Current 7/10

### 2.3 Data Environment (Scope)

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Model** | Three-way separation: ScopeRef + ActionScope + ComponentHandleRegistry | Three-way separation: ScopeRef + ActionScope + ComponentHandleRegistry |
| **ScopeRef** | Pure data, no behavior | Pure data, no behavior |
| **Inheritance** | Lexical chain with `parent`, `isolated` flag | Prototype-chain-like lexical lookup |
| **Read API** | `get(path)` / `readVisible()` / `readOwn()` | `get(path)` / `readVisible()` / `readOwn()` |
| **Write API** | `update(path, value)` with ScopeChange notification | `update(path, value)` with ScopeChange notification |
| **Behavior** | ActionScope (separate lexical chain) | ActionScope (separate lexical chain) |
| **Instance** | ComponentHandleRegistry (separate registry) | ComponentHandleRegistry (separate registry) |

**Analysis**:

After applying the Lexical Ownership principle, the experimental design (v3, corrected) and the current project converge on the same three-way separation architecture. Both designs now share:
- ScopeRef as pure data container (no behavior, no bridges, no handles)
- ActionScope as separate behavior resolution chain
- ComponentHandleRegistry as separate instance targeting mechanism

The remaining differences are minor:
- The current project's `readVisible()` / `readOwn()` explicit visibility API is more practical
- The current project's `ScopeChange.paths` with string-based paths is simpler than structured paths
- Both designs enforce that runtime sidecars follow lexical ownership but don't become ScopeRef methods

**Winner**: Both designs are now aligned on the core principle. Current project has slightly more evolved APIs from production use.

**Score**: Experimental 8/10 vs Current 9/10

### 2.4 Reactive System

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Foundation** | Fine-grained Signals (Solid.js/Preact pattern) | Zustand vanilla stores + `use-sync-external-store` |
| **Granularity** | Per-expression (computed signal per dynamic prop) | Per-node (NodeRenderer re-evaluates props on scope change) |
| **Dependency tracking** | Automatic (Signal.get() in computed context) | Semi-automatic (ScopeDependencyCollector at runtime) |
| **Subscription model** | Signal subscription (framework adapter) | `useScopeSelector(selector)` + path intersection check |

**Analysis**:

This is where the experimental design has its strongest theoretical advantage. Fine-grained signals mean:

- If a node has 10 dynamic props and only 1 changes, only that 1 prop's computed signal re-evaluates. The current project re-evaluates all props as a batch (within NodeRenderer).
- Table rows with isolated Signal-backed scopes would have truly independent reactivity. The current project achieves this through scope isolation + path-based filtering, but the Signal model is more direct.

**However**, this advantage comes with significant engineering cost:

1. **Signal library maturity**: Building or adopting a signal library that works correctly with React 19's concurrent features is non-trivial. The current project avoids this entirely by using Zustand + `use-sync-external-store`, which is proven stable with React 19.

2. **Debugging complexity**: Signal graphs are harder to debug than Zustand's simple store snapshot model. When a component doesn't re-render, tracing through a signal dependency graph is significantly harder than checking a store subscription.

3. **React integration**: React's reconciliation model is fundamentally component-level, not signal-level. Fine-grained signals require careful adapter work to avoid creating React state updates for every signal change (which would be worse than current approach).

The current project's pragmatic choice — Zustand stores with path-level dependency tracking — trades theoretical optimal granularity for practical reliability.

**Winner**: Experimental wins on theoretical elegance. Current wins on engineering pragmatism and proven React integration.

**Score**: Experimental 8/10 (theoretical) vs Current 7/10 (practical)

### 2.5 Effect / Action System

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Effect representation** | Serializable data (no closures) | `ActionSchema` + runtime handlers |
| **Control flow** | `chain`/`parallel`/`race`/`retry`/`timeout`/`debounce` | `then`/`onError`/`when`/`parallel`/`retry`/`timeout` |
| **Chain context** | `ChainContinuation` with slot indices | `prevResult`/`result`/`error` transient bindings |
| **Three-tier dispatch** | Built-in → Component → Namespace | Built-in → Component → Namespace (same) |
| **Cancellation** | `AbortHandle` cooperative abort | No explicit abort mechanism |
| **Namespaces** | `NamespaceRegistry` with `NamespaceProvider` | `ActionScope` lexical chain + `xui:imports` |
| **xui:imports** | Not designed | Declarative import system with dedup, gating, ref-counting |

**Analysis**:

The experimental design's fully serializable Effect protocol is its most genuinely innovative contribution. The ability to serialize, replay, and test effects without mocks is a significant advantage for:
- Unit testing (no mock setup needed, just assert on Effect values)
- Debugging (inspect the exact Effect description that was dispatched)
- Cross-worker execution (send Effect to Worker for interpretation)

The `AbortHandle` for cooperative cancellation is also a real improvement — the current project lacks this.

However, the current project's `xui:imports` system is a substantial feature that the experimental design completely lacks. The ability to declaratively import external libraries with dedup, reference counting, gating, and dual-channel (action namespace + expression helper) is a production-grade feature that would be very complex to retrofit.

The current project's `ActionScope` lexical chain for namespace resolution is more sophisticated than the experimental design's flat `NamespaceRegistry`. Lexical scoping of actions means a child scope can shadow a parent's namespace — essential for embedded domain controls.

**Winner**: Experimental wins on Effect purity and serializability. Current wins on namespace sophistication and xui:imports.

**Score**: Experimental 7/10 vs Current 8/10

### 2.6 Rendering Contract

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Renderer interface** | `RendererProps<S>` with props/meta/regions/events/helpers | `RendererComponentProps<S>` with same 5 channels |
| **Region rendering** | `RegionHandles.render(name, bindings)` | `RenderRegionHandle.render(options)` with rich options |
| **Renderer classification** | `isLayout` boolean flag | Three tiers: instance / flux-owner / domain-host |
| **Node wrapper** | No NodeRenderer equivalent | `NodeRenderer` handles meta/props/events resolution |

**Analysis**:

The current project's rendering architecture is more mature:

1. **Three-tier renderer classification**: `instance-renderer`, `flux-owner-renderer`, `domain-host-renderer` is a proven pattern for handling different complexity levels. The experimental design's simple `isLayout` boolean misses the crucial distinction between "owns form state" and "hosts a domain runtime."

2. **NodeRenderer separation**: The current project's `NodeRenderer` is a smart wrapper that handles meta resolution, props resolution, subscription, event binding, and provider wrapping — then delegates to the concrete renderer. This is excellent separation of concerns. The experimental design expects each renderer to handle more of this itself.

3. **Rich region options**: `RenderRegionHandle.render()` accepts scope, bindings, instancePath, scopeKey, isolate, actionScope, componentRegistry — covering all edge cases. The experimental design's simpler `RegionHandles.render(name, bindings)` would need expansion for production use.

**Winner**: Current project wins decisively on rendering architecture maturity.

**Score**: Experimental 5/10 vs Current 9/10

### 2.7 Form & Validation

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Validation model** | `ValidationGraph` with compiled rules | `CompiledFormValidationModel` with compiled rule templates |
| **Rule types** | Field/object/array/customExpr/asyncFetch | Same + `sourceKind` classification (8 types) |
| **Field participation** | Not designed | `FieldRegistrationState` (mounted/visible/disabled/touched/dirty) |
| **Owner boundaries** | Not designed | Strict owner-local validation, no cross-owner dependency edges |
| **Subscription** | `validate(paths)` | `subscribeToPath(path)` with O(1) wake-up per field |
| **Draft isolation** | `DraftHandle` with commit/discard | Phase 2: manual FormRuntime creation; Phase 3: compiler-auto |

**Analysis**:

The current project's form system is significantly more sophisticated. The concept of **field participation** (whether a field is mounted, visible, and not disabled determines whether its rules fire) is a real-world necessity that the experimental design doesn't address. In production forms:
- A tab that's not selected shouldn't validate its hidden fields
- A field that's conditionally hidden shouldn't block form submission
- A dynamically removed field should have its validation state cleaned up

The experimental design's `ValidationGraph.validate(paths)` is simpler but would need significant expansion to handle these cases.

The current project's **owner boundary** concept (validation rules don't cross owner boundaries, enabling nested forms to validate independently) is an important architectural decision that prevents cascading validation issues.

**Winner**: Current project wins significantly. Production form validation has many more concerns than the experimental design anticipates.

**Score**: Experimental 5/10 vs Current 9/10

### 2.8 Host Integration & Embedded Usage

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Embedding interface** | `SchemaRendererProps` with env, parentScope, actionScope | `SchemaRendererProps` with env, parentScope, actionScope, componentRegistry |
| **Env** | Static, never changes. Runtime uses `env.http`/`env.notify`/`env.router` directly, no internal facades | Same: env wrapper identity changes don't rebuild runtime |
| **RenderEnv** | Flat, static host contract for HTTP, navigation, notifications, context | Same concept, proven in production |
| **Multiple instances** | Supported via independent ScopeRef/ActionScope subtrees | Same, proven with multiple embedded instances |
| **xui:imports** | Not designed | Declarative import with dedup, gating, ref-counting, dual-channel |

**Analysis**:

After applying the embedded usage requirement, both designs converge on `SchemaRendererProps` as the embedding interface. The experimental design (v3, corrected) now includes `RenderEnv`, `parentScope`, `parentActionScope`, and `parentComponentRegistry` — matching the current project's approach.

The current project still wins on xui:imports — a substantial feature for runtime extensibility that the experimental design lacks.

**Winner**: Current project wins on maturity and xui:imports.

**Score**: Experimental 7/10 vs Current 8/10

### 2.9 Styling Contract

| Aspect | Experimental (v3) | Current Flux |
|--------|-------------------|--------------|
| **Layout/Widget split** | Described in prose | Concrete `isLayout` flag + documented marker class rules |
| **Marker classes** | `nop-` prefix mentioned | `nop-` prefix system with explicit rules (zero visual styles) |
| **classAliases** | Not designed | Full system with nesting, cycle protection, schema inheritance |
| **Semantic props** | Not designed | `direction`/`gap`/`align` mapping to Tailwind utilities |
| **No BEM** | Not mentioned | Explicitly documented with `data-slot` alternative |
| **CSS variables** | Mentioned | Documented integration pattern |

**Analysis**:

The current project has a far more complete and production-ready styling system. The `classAliases` mechanism alone (with nesting, inheritance, and cycle protection) is a substantial feature that significantly improves schema authoring ergonomics. The experimental design's styling section is essentially a paragraph stating principles without concrete mechanisms.

**Winner**: Current project wins significantly.

**Score**: Experimental 4/10 vs Current 9/10

---

## 3. Aggregate Scoring

| Dimension | Experimental (v3) | Current Flux | Notes |
|-----------|-------------------|--------------|-------|
| Compilation Model | 7 | 8 | Flux's field metadata is more extensible |
| Expression System | 8 | 7 | Experimental's compile-time binding is faster |
| Data Environment | 8 | 9 | Both aligned on principles; Flux has evolved APIs |
| Reactive System | 8 | 7 | Experimental's signals are theoretically better |
| Effect/Action System | 7 | 8 | Flux's xui:imports and ActionScope are more mature |
| Rendering Contract | 5 | 9 | Flux's NodeRenderer + 3-tier classification is proven |
| Form & Validation | 5 | 9 | Flux's participation model is production-grade |
| Host Integration | 7 | 8 | Both aligned; Flux has xui:imports |
| Styling Contract | 4 | 9 | Flux has concrete mechanisms, experimental has principles |
| **Total** | **59/90** | **74/90** | |

**Note**: The experimental design's scores improved in Data Environment (6→8) and Host Integration (new category) after applying the governing principles and correcting the Scope model. However, the current project's overall lead widened slightly because the principle alignment revealed that many of the current project's design decisions were principle-driven, not merely pragmatic.

---

## 4. Revised Key Insights

### 4.1 What the Experimental Design Genuinely Improves

1. **Serializable Effect Protocol**: All side effects as JSON-serializable data (not closures). Enables testing without mocks, cross-Worker execution, and effect replay.

2. **Compile-Time LexicalBinding**: Resolving variable names to `(depth, index)` pairs at compile time eliminates runtime hash map lookups.

3. **AbortHandle for Effect Cancellation**: Cooperative cancellation of in-flight effects.

4. **AsyncValueSpec for Field-Level Async**: Lightweight mechanism for field-dependent async values.

### 4.2 What the Current Project Does Better — and Why It Matters More Under Principles

1. **Three-Way Separation**: ScopeRef/ActionScope/ComponentHandleRegistry — required by Lexical Ownership principle, proven in production.

2. **Field Participation Model**: Validation rules only apply to mounted, visible, non-disabled fields — a production necessity.

3. **Three-Tier Renderer Classification**: Handles real complexity levels from simple components to domain hosts.

4. **NodeRenderer Separation**: Cross-cutting concern handling before delegating to concrete renderer.

5. **xui:imports**: Declarative import with dedup, gating, reference counting, dual-channel access.

6. **classAliases**: Styling alias system with nesting, inheritance, cycle protection.

7. **Owner-Local Validation**: Prevents cascading validation issues across form/table/dialog boundaries.

8. **Battle Testing**: Real bug cycles shaped the architecture. The experimental design is theoretical.

9. **Semantic Lifecycle Entries**: Business pipelines (form submit, dialog confirm) owned by lifecycle boundary nodes, not UI triggers — a direct implementation of the Lexical Ownership principle in action semantics.

### 4.3 The Fundamental Trade-off

| | Experimental Design | Current Flux |
|---|---|---|
| **Design approach** | Top-down, principle-driven | Bottom-up, principle-driven AND battle-tested |
| **Optimizes for** | Conceptual purity, testability | Production robustness, principle compliance |
| **Alignment with governing principles** | Partial (corrected in v3) | Strong (principles derived from this project) |

The governing principles (`flux-design-principles.md`) were **derived from** the current project's architecture, not the other way around. This means the current project is inherently more aligned with the principles — it's the source of truth for what "principle-compliant" looks like.

---

## 5. Verdict (Revised)

**The current project is the genuinely "next-generation" design.** The experimental design contributes specific improvements (serializable effects, compile-time binding, abort handles, async value specs) but these are incremental optimizations within the current architectural framework, not a replacement for it.

The most productive path forward is:

1. **Keep** the current project's architecture (it already embodies the governing principles)
2. **Adopt** serializable Effect protocol from the experimental design
3. **Adopt** compile-time LexicalBinding resolution
4. **Adopt** AbortHandle for effect cancellation
5. **Adopt** AsyncValueSpec for field-level async
6. **Do not** replace the three-way separation, NodeRenderer pattern, field participation model, or xui:imports

The experimental design's greatest value is as a **source of specific improvements** to the current architecture, not as an alternative architecture.

---

---

## 6. Lessons Learned

1. **Principles are derived from practice**: The governing principles (`flux-design-principles.md`) were extracted from the current project's architecture, not imposed top-down. This means a clean-room design (like the experimental one) is inherently disadvantaged — it can't discover principles that emerge only from real-world pressure.

2. **Production complexity is invisible in requirements**: The requirements document describes *what* the system must do, but not the corner cases that emerge in production. Field participation, owner boundaries, renderer tiers, Semantic Lifecycle Entries — these emerged from real usage.

3. **The "pure data vs closures" debate is real**: Serializable effects genuinely improve testability. This is worth adopting regardless of architecture choice.

4. **Lexical Ownership is the most impactful principle**: The three-way separation (ScopeRef/ActionScope/ComponentHandleRegistry) prevents the most common architectural decay pattern in low-code systems — the "God Object" scope that accumulates all capabilities.

5. **"Final model" principle is the hardest to respect**: It's tempting to push more intelligence into the runtime. The current project's discipline of "runtime executes, doesn't assemble" is a genuine architectural advantage that the experimental design struggled with (e.g., initially placing i18n in the runtime compiler).

---

*End of Comparative Analysis (v2 — updated with governing principles)*
