# Form Validation Low-Code Integrated Refactor Roadmap

> **Implementation Status: ⚠️ PARTIALLY COMPLETED**
> **Done (Stages 0–3):** Canonical validation graph, compilation tightening, graph-driven execution.
> **Not started (Stages 4–8):** Normalization pipeline, composite compiler migration, state compression, extensibility API, diagnostics/introspection tooling.
> The core validation infrastructure is solid and production-capable; the advanced roadmap items for full low-code integration remain future work.
>
> This status was verified against the codebase on 2026-03-30.

## Purpose

This document defines a detailed refactor roadmap for the form-validation system under the following hard constraints:

- validation remains tightly integrated with the low-code engine
- validation compilation remains tightly integrated with schema compilation
- runtime design prioritizes low memory overhead and low allocation churn
- the system avoids repeated expression of equivalent metadata
- the system avoids unnecessary object copying and repeated normalization work

The goal is not to make the project look more like `yup` or `react-hook-form`.

The goal is to make validation a first-class part of the existing low-code compiler and runtime so that validation becomes more structurally coherent, more memory-efficient, easier to extend, and more predictable under nested forms, arrays, composite controls, and dependency-driven revalidation.

## Scope

This roadmap focuses on:

- `packages/flux-core`
- `packages/flux-runtime`
- `packages/flux-renderers-form`
- renderer-facing integration points that participate in compiled validation

It does not propose introducing a parallel validation framework.

## Related Documents

- `docs/architecture/form-validation.md`
- `docs/plans/03-form-validation-completion-plan.md`
- `docs/plans/04-form-validation-improvement-execution-plan.md`
- `docs/analysis/form-validation-comparison.md`
- `docs/references/yup-template-notes.md`

## Design Constraints

All work in this roadmap must preserve these constraints:

- validation remains compiler-first and runtime-driven
- `amis-runtime` remains React-independent
- schema authors continue using the low-code schema model instead of a foreign fluent DSL
- validation data should reuse existing compiled schema metadata whenever possible
- runtime registration remains a supplement for opaque complex controls, not the primary architecture
- path semantics remain stable across scalar, object, array, and composite fields
- submit remains the final validation gate even when earlier triggers exist

## Primary Design Goals

The refactor should move the system toward five concrete goals.

### 1. Validation becomes part of the compiled schema truth

The validation model should not feel like a parallel data structure bolted onto compiled schema output.

Instead, compiled validation should be attached to and derived from the same node graph, path model, expression compiler, and renderer contribution model already used by the low-code engine.

### 2. Equivalent information is stored once, while hot-path indexes remain explicit

The current model stores multiple materialized views of nearly the same validation graph, such as:

- field maps
- node maps
- path orders
- traversal orders
- dependency reverse indexes

Some derived views are useful and should remain available. The issue is not that every secondary view is wrong. The issue is that the system currently treats too many overlapping views as primary stored truth.

The target is therefore:

- one canonical validation graph
- a small number of explicit hot-path indexes that are justified by runtime cost
- compatibility views only where external callers still depend on them

### 3. Runtime execution becomes more graph-driven without breaking path-first public APIs

The current runtime already has early node-driven pieces. The refactor should finish that transition so subtree validation, aggregate validation, and dependency revalidation rely more directly on the compiled validation graph rather than repeatedly rebuilding behavior from flat path lists.

### 4. Runtime state updates minimize allocation churn

Validation should avoid:

- repeated shallow cloning of large error maps
- repeated normalization of already-compiled rule objects
- repeated reconstruction of equivalent arrays and path lists
- repeated rebuilding of regexes and other precomputable rule artifacts

### 5. Composite controls participate through the compiler whenever possible

Controls such as `array-editor` and `key-value` should move more of their validation semantics into compiled descriptors instead of relying heavily on imperative `validate()` and `validateChild()` callbacks.

## Current Structural Problems

The current implementation already has the right high-level direction, but several internal shapes work against the stated constraints.

### 1. Multiple materialized projections of the same validation graph

In `packages/flux-runtime/src/schema-compiler.ts`, the compiled validation output currently maintains:

- `fields`
- `order`
- `nodes`
- `dependents`
- `validationOrder`

These are not identical, and some of them are useful runtime indexes. The problem is that they currently mix together:

- canonical validation truth
- compatibility views
- hot-path execution indexes

That creates avoidable duplication in:

- path strings
- label and control metadata
- rule collections
- traversal relationships
- dependency relationships

### 2. Validation metadata is duplicated across field-centric and node-centric models

`CompiledFormValidationField` and `CompiledValidationNode` both carry overlapping information such as:

- `path`
- `controlType`
- `label`
- `rules`

This makes the system easier to bootstrap, but it increases memory usage and creates long-term risk around dual sources of truth.

### 3. Compiled rules are not fully treated as final execution artifacts

In `packages/flux-runtime/src/form-runtime-validation.ts`, `validatePath()` still normalizes compiled rules at execution time through `normalizeCompiledValidationRules(...)`.

That indicates the current boundary between compile-time work and runtime work is still too soft.

### 4. Runtime execution is still split between graph-aware and path-list-driven flows

The current system already compiles validation nodes and dependency information, and it already contains graph-aware execution entry points.

The remaining issue is that the runtime is still hybrid in a way that keeps behavior spread across:

- node traversal
- flat path iteration
- runtime registration fallbacks

This limits structural reuse and keeps aggregate validation less uniform than it should be.

### 5. Composite validation still lives too much inside renderers

`packages/flux-renderers-form/src/renderers/array-editor.tsx` and `packages/flux-renderers-form/src/renderers/key-value.tsx` still rely heavily on runtime registration callbacks for validation semantics that the compiler should understand structurally.

### 6. Runtime state updates still clone more than necessary

The runtime frequently uses whole-map replacement patterns for:

- `errors`
- `touched`
- `dirty`
- `visited`
- `validating`

This is simple and safe, but it is not the right long-term fit for very large forms and highly interactive nested editors.

## Refactor Strategy

The refactor should follow four guiding rules.

### A. Replace parallel truths with one canonical validation graph plus a small set of explicit indexes

Choose one primary compiled validation representation and then distinguish clearly between:

- canonical validation truth
- hot-path indexes
- compatibility adapters

Treat all non-canonical views as one of the following:

- lazy projections
- thin compatibility adapters
- or small indexes built from the canonical graph

Important: indexes such as dependent lookups and deterministic traversal order should be removed only if measurement shows they are not needed. They should not be eliminated on principle.

### B. Push reusable work to compile time when that does not increase runtime translation overhead

Anything stable enough to compute during schema compilation should be moved there, including:

- dependency edges
- rule normalization
- regex compilation
- behavior pooling
- path interning
- message template preparation

### C. Keep runtime work small, local, and incremental

Runtime should primarily do:

- determine what nodes need evaluation
- pull current values from scope/store
- execute already-compiled rule programs
- update only the necessary slices of state

### D. Use renderer registration only where compiler modeling genuinely stops

Opaque controls may still require registration hooks, but structure-aware composite controls should move toward compiler-described validation.

## Current Maturity And Boundaries

This roadmap does not start from a blank validation system.

The repository already has several important capabilities that should be preserved and extended rather than re-invented:

- validation rule collection is already integrated into schema compilation
- subtree validation already has graph-aware entry points
- array operations and array-state remapping already exist
- renderer helpers already expose field and child-field validation state
- runtime registration already covers complex controls that cannot be fully described statically

Accordingly, this roadmap is primarily about consolidation and tightening of boundaries, not about replacing the current architecture with a wholly new one.

## Target End-State

The end-state should be a compact, schema-linked validation program attached to compiled form nodes.

At a conceptual level, the target shape should look like this:

1. compiled schema nodes remain the primary structural truth
2. validation is attached to those nodes through compact descriptors
3. paths, behaviors, and reusable rule metadata are interned or pooled
4. runtime state minimizes repeated path-keyed copies on hot paths
5. public APIs continue to accept path strings for compatibility

The exact type shapes may evolve, but the design should move toward the following principles.

This does not require an immediate or global switch to opaque node identifiers across the entire runtime. Path semantics remain the dominant public contract and may remain the dominant internal contract in some subsystems if that produces lower total cost.

### Canonical validation graph

The primary compiled validation artifact should capture:

- stable node identity or canonical node descriptor identity
- relationship to compiled schema node identity
- node kind such as `field`, `object`, `array`, or `form`
- compact references to rules
- compact references to children and parent
- dependency edges
- behavior references

### Shared metadata instead of repeated copies

Where multiple validation nodes share the same metadata, the system should prefer tables or pools for:

- paths
- validation behavior tuples
- message templates
- regex instances
- static rule argument objects

### Node-driven execution

All major runtime flows should eventually route through the same node-driven engine:

- validate one field
- validate a dependent set
- validate a subtree
- validate the whole form

This should be interpreted as a runtime unification goal, not as a requirement to remove all path-oriented indexes.

## Roadmap Overview

The refactor is divided into eight stages. The order matters.

1. establish baselines and invariants
2. collapse the compiled validation model into one canonical graph plus explicit indexes
3. tighten validation compilation outputs inside the existing schema compilation flow
4. expand graph-driven execution from existing entry points
5. define normalization semantics before introducing normalization as a standard phase
6. migrate composite controls toward compiler-described validation
7. compress runtime validation state and reduce allocation churn
8. harden extensibility, diagnostics, and compatibility adapters

Each stage is described in detail below.

## Stage 0: Baseline, Instrumentation, and Safety Rails

### Goal

Make performance and memory tradeoffs measurable before changing internal representations.

### Why this stage is required

This roadmap explicitly targets lower memory overhead and lower runtime churn. Those goals need measurable baselines.

### Main changes

Add instrumentation for:

- number of compiled validation nodes
- number of compiled validation rules
- number of distinct paths versus repeated path strings
- number of distinct behavior combinations
- number of dependency edges
- whole-map replacements during validation
- async validation debounce cancellations
- subtree validation traversal counts

Add representative benchmark scenarios:

- large flat form with 200+ fields
- nested array/object form with aggregate rules
- composite form using `array-editor` and `key-value`
- dependency-heavy form with relational rules

### Files likely involved

- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- test and benchmark locations as appropriate

### Exit criteria

- there is a documented compile-time baseline
- there is a documented runtime validation baseline
- the team can identify the top duplication and allocation hotspots

## Stage 1: Collapse Compiled Validation Into One Canonical Graph Plus Explicit Indexes

### Goal

Replace multiple primary validation projections with one canonical compiled validation graph, while explicitly retaining the small number of indexes that are justified by runtime cost.

### Why this stage comes first

As long as multiple overlapping structures remain first-class without a clear distinction between truth and index, every later optimization is partially diluted by duplication.

### Main changes

Refactor the compiled validation model so that one canonical representation becomes the primary source of truth.

The canonical graph should carry:

- node identity
- path identity
- node kind
- schema-node linkage
- behavior reference
- rule references
- parent-child topology
- dependency edge references

Reclassify the following so they are no longer all treated as equal sources of truth:

- `fields`
- `order`
- `validationOrder`
- path-keyed dependency reverse maps when possible

At least one deterministic traversal index and at least one dependent lookup index may remain stored if measurement shows they are runtime-critical.

### Specific design directions

- keep a path-keyed compatibility lookup while renderer and runtime callers still need it
- avoid storing `path`, `label`, `controlType`, and `rules` in both field and node records
- prefer node identity plus schema-node linkage over repeated copies of display metadata
- preserve deterministic traversal order as an explicit index if it is cheaper than recomputing it
- define clearly whether `behavior` lives on the canonical node, a pooled table, or a compatibility field view

### Files likely involved

- `packages/flux-core/src/index.ts`
- `packages/flux-runtime/src/schema-compiler.ts`

### Risks

- external code may still depend on `validation.fields[path]`
- tests may assume current shape directly

### Mitigation

- keep a compatibility adapter during migration
- migrate internal callers before removing the old shape

### Exit criteria

- one canonical compiled validation graph exists
- repeated metadata between field and node structures is materially reduced
- hot-path dependent lookup and traversal order remain no worse in complexity than today
- existing runtime behavior remains functionally unchanged

## Stage 2: Tighten Validation Compilation Outputs Inside The Existing Schema Compilation Flow

### Goal

Tighten the outputs of the existing integrated validation compilation flow so compile-time artifacts are final enough for direct runtime execution.

### Why this matters

The low-code engine already has:

- compiled schema nodes
- renderer definitions
- expression compilation
- region structure
- path generation

Validation is already largely integrated into these flows. The remaining problem is not that validation is outside schema compilation. The remaining problem is that the current compilation result still duplicates too much metadata and still leaves some normalization work to runtime.

### Main changes

Refactor renderer validation contribution and compiled model assembly so contributors produce final runtime-ready artifacts with less duplicated metadata.

Tighten or absorb the logic currently split across:

- `collectSchemaValidationRules(...)`
- `compileValidationRules(...)`
- dependent collection logic

into the main compilation pass wherever possible.

### Specific design directions

- avoid rebuilding field-shaped runtime inputs from node-shaped compiled outputs
- compile dependency edges as soon as rules are known
- pool repeated validation behaviors during compile time
- prepare precompiled rule artifacts such as regex objects during compile time
- link validation nodes directly to compiled schema node identity instead of re-copying node metadata
- eliminate runtime `normalizeCompiledValidationRules(...)` on compiled rules

### Files likely involved

- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/validation/rules.ts`
- `packages/flux-core/src/index.ts`
- relevant renderer definition files in `packages/flux-renderers-form/src/renderers`

### Exit criteria

- validation compilation remains integrated with schema compilation
- rule normalization no longer needs a second runtime pass
- dependency metadata is available as finalized compiled data

## Stage 3: Expand Graph-Driven Runtime Validation From Existing Entry Points

### Goal

Make graph-driven traversal the primary internal execution model for field, subtree, and full-form validation, starting from the graph-aware pieces that already exist.

### Why this stage matters

The compiler already knows the validation graph, and the runtime already has some graph-aware traversal. This stage is about completing that transition in the remaining entry points instead of inventing a new execution model from scratch.

### Main changes

Refactor validation execution so existing entry points converge on one graph-driven engine.

Path-based public APIs should remain, but they should become thinner adapters over the canonical compiled validation descriptors.

The engine should support four standard operations through one internal model:

- validate one path or canonical node descriptor
- validate current target plus dependents
- validate a subtree
- validate the whole form

### Specific design directions

- keep `validateSubtreeByNode()` as the starting point and extend the same execution model to `validateForm()` and `validatePath()`
- make full-form validation execute a deterministic compiled traversal order
- keep dependent revalidation at least as cheap as current `dependents[path]` lookup
- avoid repeated collection of subtree path lists when the graph already has child topology
- preserve runtime-registration fallback explicitly for controls that still validate through registration

### Files likely involved

- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-subtree.ts`

### Exit criteria

- subtree validation no longer depends primarily on flat path scanning when graph data already exists
- `validateForm()` and `validatePath()` share the same internal execution model as subtree validation
- dependent revalidation remains targeted and cheap

## Stage 4: Define Normalization Semantics Before Making Normalization A Standard Phase

### Goal

Define whether and how normalization should exist in this architecture before introducing it as a standard phase.

### Why this matters

Validation quality and runtime simplicity can improve when values are normalized before rules run. However, normalization is also a major risk for this repository because it can easily introduce extra copies, hidden write-back rules, and shadow semantics.

This stage therefore starts by defining semantics, not by immediately adding new infrastructure.

### Main changes

First define the intended behavior of normalization with explicit answers to these questions:

- is normalization validation-only or does it write back into stored values
- is normalization subtree-scoped or whole-form-scoped
- does normalization produce ephemeral views or new materialized objects
- which built-ins are valuable enough to justify compile-time descriptors

Only after those answers are stable should compiled normalizer descriptors be introduced.

Normalization should support common built-ins such as:

- trim string
- empty string to `undefined`
- scalar type coercion where allowed by schema semantics
- array/item structural normalization
- object subtree normalization

### Specific design directions

- prefer validation-only normalized views unless a stronger reason for write-back exists
- reuse existing compiled expression and runtime-value concepts where possible
- keep normalization copy-on-write rather than deep-clone-based
- normalize only the affected subtree when validating incrementally
- do not introduce blind deep-clone or whole-form shadow-copy behavior

### Files likely involved

- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- relevant renderer or schema contribution points

### Exit criteria

- normalization semantics are explicitly documented and accepted
- the project can explain whether normalization affects store state or only validation views
- if implementation begins, subtree normalization does not require blind deep copying

## Stage 5: Migrate Composite Controls Toward Compiler-Described Validation

### Goal

Reduce imperative validation logic inside composite renderers and move the structurally stable parts of validation semantics into compiler-produced descriptors.

### Why this matters

Composite controls are part of the low-code engine's structural model. The compiler should understand their validation shape whenever possible.

### Main changes

Start with high-value composite controls:

- `array-editor`
- `key-value`

Refactor them so the compiler can describe, at minimum:

- container-level rules
- aggregate constraints
- projection and ownership behavior

Child-instance validation that depends on runtime-created indexes, labels, or per-item materialized paths may remain partially runtime-driven.

Keep runtime registration for:

- truly opaque third-party widgets
- controls whose internal value model cannot be described statically

### Specific design directions

- compile container and aggregate rules before attempting to compile all child-instance rules
- keep child-instance runtime validation where compile-time materialization would increase path churn or object allocation
- model child-path templates structurally instead of materializing full path arrays too early
- let runtime registration supplement compiled semantics rather than replace them

### Files likely involved

- `packages/flux-renderers-form/src/renderers/array-editor.tsx`
- `packages/flux-renderers-form/src/renderers/key-value.tsx`
- `packages/flux-runtime/src/schema-compiler.ts`
- `packages/flux-core/src/index.ts`

### Exit criteria

- container and aggregate semantics for these controls come from compiled descriptors
- runtime registration is reduced to child-instance or opaque-control cases that are genuinely runtime-shaped

## Stage 6: Compress Runtime Validation State And Reduce Allocation Churn

### Goal

Reduce memory overhead and per-interaction allocation churn in runtime validation state.

### Why this stage comes after graph unification

State compaction is much easier once node identity and the canonical graph are stable.

### Main changes

Refactor runtime validation-related state to reduce allocation churn first, and only then consider deeper internal identity changes where measurement justifies them.

Candidate internal improvements include:

- more compact boolean state storage for `touched`, `dirty`, `visited`, and `validating`
- more local error-bucket updates instead of repeated whole-map replacement
- path-keyed projection only at API boundaries
- partial state updates instead of repeated whole-map replacement

### Specific design directions

- preserve public path-based APIs and only introduce node-keyed storage where it is measurably beneficial
- reduce `{ ...existingMap }` patterns on hot paths
- update only the paths or nodes whose state actually changed
- use array/item identity-aware remapping for dynamic arrays

### Files likely involved

- `packages/flux-runtime/src/form-store.ts`
- `packages/flux-runtime/src/form-runtime.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-array.ts`

### Exit criteria

- hot-path validation causes fewer whole-map clones
- large forms show lower allocation churn during typing and dependent revalidation
- array operations preserve validation state with less remapping overhead

## Stage 7: Harden Validator Extensibility And Execution Context

### Goal

Improve custom validator ergonomics without weakening the compiler-first architecture.

### Why this matters

As the validation graph becomes more canonical and more compact, extension points must remain understandable and predictable.

### Main changes

Standardize validator execution context so built-in and future custom validators share one stable execution model.

The context should support, where appropriate:

- current node identity and path
- current value
- parent value
- root scope access
- resolved dependency values
- standardized error creation
- related-path emission for aggregate projection

Precompute more rule artifacts at compile time, especially:

- regex instances
- message templates
- dependency lookups

### Files likely involved

- `packages/flux-runtime/src/validation/validators.ts`
- `packages/flux-runtime/src/validation/errors.ts`
- `packages/flux-runtime/src/validation/message.ts`
- `packages/flux-core/src/index.ts`

### Exit criteria

- validator execution context is stable and well-typed
- adding a new validator requires less ad hoc wiring
- runtime does not recreate obviously precomputable rule artifacts

## Stage 8: Diagnostics, Debug Views, And Compatibility Adapters

### Goal

Preserve debuggability and compatibility while keeping production memory overhead low.

### Why this matters

Refactoring toward compact internal structures can make debugging harder unless explicit debug views and adapters exist.

### Main changes

Add optional debug and introspection surfaces that can explain:

- which rule fired
- why a node was revalidated
- which dependencies caused revalidation
- where an aggregate error is owned and where it is projected

Keep these views optional or derived so they do not become permanent production-memory burdens.

Maintain path-based compatibility adapters for public callers while the internal runtime transitions to node-based storage.

### Files likely involved

- validation model exports in `packages/flux-core/src/index.ts`
- runtime debug helpers in `packages/flux-runtime`
- test and development tooling as needed

### Exit criteria

- compact internals remain inspectable in development
- public path-based APIs remain stable during migration
- debug metadata does not become mandatory production state

## Cross-Cutting Requirements

Every stage in this roadmap should satisfy the following requirements.

### 1. Backward compatibility at public boundaries

Even if some internal storage moves toward compact indexes or node-linked descriptors, existing path-based public runtime APIs should remain stable until an explicit migration plan exists.

### 2. No premature over-compression

The project should first establish one canonical graph and clean execution boundaries before aggressively optimizing every internal shape.

It should also prefer measured simplification over abstract purity. If a stored index materially reduces runtime scanning or allocation churn, it can remain.

The order should be:

1. unify truth
2. remove redundant work
3. compact stable structures

### 3. Tests must follow each structural change

Each stage should land with tests that cover:

- correctness
- nested structures
- arrays and reorder behavior
- dependency-driven revalidation
- async validation cancellation where relevant

### 4. Benchmark after each milestone

Each milestone should be evaluated against stage-0 baselines for:

- compiled validation memory footprint
- validation latency for field, subtree, and full form
- allocation churn under repeated input

## Suggested Milestones

### Milestone 1

Complete Stage 0 and Stage 1.

This establishes measurement and removes the largest structural duplication.

### Milestone 2

Complete Stage 2 and Stage 3.

This makes validation truly part of schema compilation and makes execution graph-driven.

### Milestone 3

Complete Stage 4 and Stage 5.

This adds normalization and pulls composite validation further into compiler truth.

### Milestone 4

Complete Stage 6.

This is the main runtime memory and allocation optimization milestone.

### Milestone 5

Complete Stage 7 and Stage 8.

This stabilizes extension and diagnostics after the internal shape settles.

## Recommended Early Pilot Targets

The first migration targets should be:

- simple scalar fields such as `input-text` and `input-email`
- relational rules such as `equalsField`, `requiredWhen`, and `requiredUnless`
- `array-editor`
- `key-value`

These cover the most important combinations of:

- simple field validation
- dependency revalidation
- aggregate and nested validation
- composite-control participation

## Success Metrics

This refactor should be considered successful only if it improves both architecture and measurable behavior.

### Structural success

- validation has one canonical compiled representation plus clearly justified indexes
- validation is materially more integrated with compiled schema nodes
- composite controls rely less on imperative runtime-only validation logic

### Memory success

- repeated path, behavior, and metadata storage is reduced where it does not regress hot-path cost
- runtime allocates less during frequent field validation
- large-form memory growth is flatter than before

### Runtime success

- field validation remains fast or becomes faster
- subtree validation scales better with nested structures
- dependent revalidation becomes more targeted
- async validation behavior remains correct

### Maintenance success

- new validators are easier to add
- runtime invariants are easier to reason about
- there are fewer dual-source representations to keep in sync

## What This Roadmap Explicitly Avoids

This roadmap does not recommend:

- introducing a separate validation engine unrelated to schema compilation
- building a full external DSL similar to `yup`
- shifting the source of truth into React-specific registration flows
- aggressively micro-optimizing storage before canonical graph unification
- expanding imperative `validateChild()` patterns as the main scaling strategy

## Immediate Next Step

The recommended next implementation step is to start with Stage 0 and Stage 1 together:

1. measure the current duplication and hot paths
2. define the canonical compiled validation graph and identify which indexes must remain explicit
3. keep path-based compatibility views temporarily
4. remove duplicated field-node metadata before attempting deeper runtime identity changes
5. migrate internal callers to the canonical graph before removing redundant structures

This is the highest-leverage place to begin because it creates the foundation for every later optimization in memory use, execution model, and composite-control integration.

