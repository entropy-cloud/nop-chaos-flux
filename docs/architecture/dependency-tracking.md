# Dependency Tracking Design

## Purpose

This document defines the dependency tracking architecture for Flux: how runtime evaluations discover which lexical bindings they read, how scope writes publish changed bindings, and how `Value`, `Resource`, and `Reaction` use that information to decide when to re-evaluate.

The active runtime baseline is now "explicit roots first, lexical-root runtime fallback". Deep member paths may still appear in raw `ScopeChange.paths` for diagnostics, but invalidation and runtime dependency collection operate on normalized lexical roots.

This document is normative architecture for dependency tracking concerns.

## Precedence

The top-level primitive model is defined in `docs/architecture/frontend-programming-model.md` (section "Dependency Tracking Is A Core Execution Baseline"). This document provides the concrete design for how that baseline is implemented and where the remaining follow-up still lives.

If this document conflicts with `docs/architecture/frontend-programming-model.md` about primitive roles or semantic rules, the top-level document wins.

## Related Documents

- `docs/architecture/frontend-programming-model.md` - normative primitive model
- `docs/architecture/api-data-source.md` - `Resource` publication and source lifecycle
- `docs/architecture/form-validation.md` - validation dependency system (separate from scope dependency tracking)

---

## 1. Current Architecture

### 1.1 Data Flow Overview

```text
[Evaluation]
  createScopeDependencyCollector() -> collector
  Proxy wraps scope, intercepts property reads
  collector.recordPath("user") / collector.recordPath("user.name") / collector.recordWildcard()
  finalize() -> ScopeDependencySet

[Aggregation]
  collectRuntimeDependencies(state)
    traverse RuntimeValueState tree
    collect all leaf-state .dependencies
    return merged ScopeDependencySet

[Write]
  scope.update("user.name", "Bob")
    -> ScopeChange { paths: ["user.name"] }
    -> Zustand store notifies subscribers

[Invalidation]
  scope.store.subscribe(change => {
    scopeChangeHitsDependencies(change, dependencies)
      -> normalizeRoot("user.name") === normalizeRoot("user")
      -> true -> trigger refresh
  })
```

### 1.2 Core Types

Source: `packages/flux-core/src/types/scope.ts`

```typescript
interface ScopeDependencySet {
  paths: readonly string[]; // normalized lexical roots or ['*']
  wildcard: boolean;
  broadAccess: boolean;
}

interface ScopeDependencyCollector {
  recordPath(path: string): void;
  recordWildcard(): void;
}

interface ScopeChange {
  paths: readonly string[];
  sourceScopeId?: string;
  kind?: 'update' | 'merge' | 'replace';
}

interface EvalContext {
  resolve(path: string): unknown;
  has(path: string): boolean;
  materialize(): Record<string, any>;
  collector?: ScopeDependencyCollector;
}
```

Dependencies are stored on `LeafValueState.dependencies` after each evaluation.

Source: `packages/flux-core/src/types/compilation.ts`

```typescript
interface LeafValueState<T = unknown> {
  kind: 'leaf-state';
  initialized: boolean;
  lastValue?: T;
  dependencies?: ScopeDependencySet;
}
```

### 1.3 Current Implicit Collection Mechanism

Source: `packages/flux-formula/src/scope.ts`

Dependency collection is driven by a Proxy-based scope wrapper that intercepts property reads during formula evaluation.

`createFormulaScope(context: EvalContext)` returns a `Proxy` whose traps record reads. Recording is root-normalized even when the expression touches deeper members.

| Proxy trap                 | Recording                    | Trigger example                |
| -------------------------- | ---------------------------- | ------------------------------ |
| `get(target, prop)`        | `collector.recordPath(prop)` | `scope.user`                   |
| `has(target, prop)`        | `collector.recordPath(prop)` | `"name" in scope`              |
| `ownKeys(target)`          | `collector.recordWildcard()` | `Object.keys(scope)`           |
| `getOwnPropertyDescriptor` | `collector.recordWildcard()` | JSON.stringify-like operations |

Nested objects are recursively wrapped via `wrapTrackedValue(value, basePath)`, but nested member access still records only the lexical root binding. For example, `scope.user.name` records `"user"`, not `"user.name"`.

Current wildcard behavior is scoped deliberately:

- enumerating the top-level scope records wildcard
- enumerating a recursively wrapped nested object records its owning lexical root, not whole-scope wildcard
- materialized whole-scope access can still drive wildcard through top-level proxy traps

A fresh `ScopeDependencyCollector` is created for every leaf evaluation. The compiled expression receives this collector through the `EvalContext` injection point. After evaluation, `finalize()` returns the `ScopeDependencySet`, which is stored on the `LeafValueState`.

### 1.4 Dependency Aggregation

Source: `packages/flux-runtime/src/node-runtime.ts`

`collectRuntimeDependencies(state)` traverses the `RuntimeValueState` tree:

- `leaf-state`: reads `node.dependencies`
- `array-state`: recursively visits `node.items`
- `object-state`: recursively visits `Object.values(node.entries)`

Returns a merged `ScopeDependencySet` with deduplicated, sorted lexical roots.

### 1.5 Scope Change Propagation

Source: `packages/flux-runtime/src/scope.ts`

`createScopeStore()` wraps a Zustand vanilla store. On `setSnapshot(next, change)`:

1. Zustand detects the state change (new `snapshot` reference).
2. The `subscribe` listener filters no-op updates (same snapshot AND same lastChange reference).
3. Calls `listener(state.lastChange)`.

Child scopes via `createCompositeScopeStore` subscribe to both their own store and the parent store, so parent scope writes propagate to all child scope subscribers.

Write operations produce change paths:

- `scope.update(path, value)` -> `ScopeChange { paths: [path], kind: 'update' }`
- `scope.merge(data)` -> `ScopeChange { paths: Object.keys(data), kind: 'merge' }`

### 1.6 Invalidation Predicate

Source: `packages/flux-runtime/src/scope-change.ts`

`scopeChangeHitsDependencies(change, dependencies)`:

1. If either is missing -> `true` (conservative: invalidate on everything)
2. If `dependencies.wildcard` or `change.paths.includes('*')` -> `true`
3. Otherwise, normalize both sides to lexical roots and check root equality

Examples:

- `user.name` change hits `user`
- `filters.status` change hits `filters`
- wildcard still conservatively hits everything

### 1.7 Source Invalidation

Source: `packages/flux-runtime/src/async-data/source-registry.ts`

On registration, each source subscribes to `scope.store`:

```typescript
const unsubscribe = scope.store?.subscribe((change) => {
  // Remove the source's own published root before dependency matching.
  const observedChange = targetPath
    ? filterScopeChangeByIgnoredRoots(change, [targetPath])
    : change;
  if (!observedChange) {
    return;
  }
  // Skip if change doesn't hit dependencies
  if (!scopeChangeHitsDependencies(observedChange, dependencies)) return;
  // Trigger refresh
  void controller.refresh();
});
```

For formula sources, `collectRuntimeDependencies(runtimeState)` is called after each evaluation and replaces the stored dependency set only when the schema does not declare explicit `dependsOn` roots.

For API sources, `trackApiRequestDependencies()` re-evaluates the API schema on each request, collects which lexical roots were read, and updates the stored dependency set only when the schema does not declare explicit `dependsOn` roots.

### 1.8 Reaction Invalidation

Source: `packages/flux-runtime/src/async-data/reaction-runtime.ts`

On registration, each reaction evaluates `watch` once, stores the resulting dependency set, and then subscribes to `scope.store`. Explicit `dependsOn` roots override runtime fallback collection when present.

```typescript
const unsubscribe = scope.store?.subscribe((change) => {
  if (!scopeChangeHitsDependencies(change, dependencies)) return;
  scheduleReaction(change.paths);
});
```

`scheduleReaction` uses microtask batching:

- collects change paths into `pendingChangedPaths`
- uses `Promise.resolve().then(invoke)` for microtask scheduling
- supports optional `debounce` via `setTimeout`
- deduplicates while a reaction is already queued

### 1.9 Validation Dependencies (Separate System)

Source: `packages/flux-runtime/src/validation/rules.ts`, `packages/flux-core/src/validation-model.ts`

Form validation uses a separate dependency system:

- `collectValidationDependencyPaths(rule)` extracts explicit paths at compile time from rule schemas
- `buildCompiledValidationDependentMap()` builds a reverse lookup `Record<path, fieldPaths[]>`
- `revalidateDependents()` is called synchronously after `setValue()` / `setValues()`

This system does not use `ScopeDependencySet`, `ScopeChange`, or `scopeChangeHitsDependencies`.

---

## 2. Remaining Gaps

### Gap 1: Unknown And Empty Dependencies Are Conflated

`scopeChangeHitsDependencies(change, undefined)` returns `true`.

That is correct for "unknown yet" but too broad for "known to depend on nothing".

Current consequences:

- static formula/api/watch values often leave `dependencies` as `undefined`
- dynamic reactions populate dependencies on activation, but static reactions and static sources remain conservative forever
- the runtime has no way to represent an explicit empty dependency set distinct from "not collected yet"

### Gap 2: Explicit Declaration Is Still Optional

The active runtime baseline is explicit roots first, runtime fallback second.

Current consequences:

- `dependsOn` is authoritative when present
- source/reaction still fall back to runtime-collected roots when `dependsOn` is absent
- development diagnostics that compare declared roots with runtime reads are not implemented yet

### Gap 3: Ephemeral Evaluations Discard Dependency Information

`runtime.evaluate()` and related ad hoc evaluation paths compile/evaluate values outside an owning runtime state and discard any dependency information they could have collected.

This includes current uses such as:

- `stopWhen` checks
- action `when` guards
- request helper evaluation paths

Not all of these need to participate in source/reaction invalidation today. The missing piece is not merely "preserve everything"; it is that the ownership boundary is currently undocumented.

### Gap 4: Generic Collection And Row-Scope Translation Is Still Incomplete

The current change surface still reports raw paths such as `tableData.3.name`.

The supported runtime baseline is now split into two states:

- table already owns a supported row-local translation slice
- generic collection owners such as loop/list/tree still do not share one unified translation substrate

That means the desired row-local behavior is now defined for table, but not yet generalized across every collection owner:

- collection-level consumers should depend on `tableData`
- row-local consumers should depend on `row` or `record`
- changing one row should not force unrelated row scopes to re-run

This remaining gap is therefore about generic collection-owner convergence, not about whether table is allowed to own row-local translation at all.

### Gap 5: Validation Uses A Separate Dependency Substrate

Scope dependency tracking (Proxy-based, runtime) and validation dependency tracking (compile-time, explicit) share no infrastructure. This is not a correctness issue, but it is a maintenance seam that should remain explicit.

---

## 3. Stable Design Baseline: Explicit Roots First, Lexical-Root Fallback

### 3.1 Model

The tracking unit is lexical root bindings, not deep member paths.

Examples of root bindings:

- `user`
- `filters`
- `status`
- `row`
- `record`
- `item`

Target resolution order:

```text
Layer 1: Explicit declared roots
  -> authoritative when present
Layer 2: Runtime lexical-root tracking
  -> fallback only when nothing explicit is declared
```

This document does not adopt compile-time AST extraction as the normative baseline.

Reasons:

- it increases compiler complexity for limited hot-path benefit
- it is awkward for templates, object values, imported helpers, and parser-specific constructs
- Flux's lexical execution model is already well-served by runtime root tracking plus conservative fallback

Normative rules:

1. If a producer or watcher declares its dependency roots explicitly, runtime uses that declaration as the invalidation contract.
2. If nothing is declared explicitly, runtime collects dependency roots dynamically during evaluation.
3. Production invalidation does not union runtime-collected roots back into an explicit declaration.
4. Development tooling may still compare declared roots with dynamic reads and warn on mismatches.

### 3.2 Runtime Lexical-Root Tracking

Source target: `packages/flux-formula/src/scope.ts`

Runtime fallback should collect only lexical root bindings, not deep member paths.

Examples:

- `scope.user.name` -> `user`
- `scope.user.profile.age` -> `user`
- `scope.filters.status === 'active'` -> `filters`
- `scope.row.total > 0` -> `row`

Top-level scope access rules:

| Operation                                                                    | Recorded dependency |
| ---------------------------------------------------------------------------- | ------------------- |
| `scope.user.name`                                                            | `user`              |
| `'user' in scope`                                                            | `user`              |
| `Object.keys(scope)`                                                         | wildcard            |
| `{ ...scope }`                                                               | wildcard            |
| `getOwnPropertyDescriptor(scope, 'user')` through top-level enumeration flow | wildcard            |

Nested bound-object rules:

| Operation           | Recorded dependency |
| ------------------- | ------------------- |
| `Object.keys(user)` | `user`              |
| `{ ...user }`       | `user`              |
| `'name' in user`    | `user`              |

Implementation note:

- nested wrappers may still exist if they are the easiest way to preserve runtime behavior
- but they must stay anchored to the same root binding instead of emitting deeper paths
- only enumeration of the current lexical scope, or full lexical materialization, should degrade to wildcard

`materialize()` remains a fallback API. If an evaluation truly materializes the whole current lexical scope, that evaluation should collect wildcard.

### 3.3 Explicit Root Declaration

Directional carrier: schema-level `dependsOn` on `DataSourceSchema` and `ReactionSchema`, or an equivalent producer/watcher-owned field.

Semantics:

- entries are lexical root bindings visible in the owning scope
- entries are authoritative when present
- deep member paths are out of contract; authors declare `user`, not `user.name`
- child scopes may declare local roots such as `row`, `record`, or `item`
- runtime fallback is skipped for invalidation semantics when an explicit declaration is present
- dev tools may warn if dynamic reads escape the declared set

Directional example:

```typescript
interface BaseDataSourceSchema extends BaseSchema {
  type: 'data-source';
  dependsOn?: string[];
}

interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch: SchemaValue;
  dependsOn?: string[];
}
```

This is intentionally simpler than "declared hints + static extraction + runtime union". The point of an explicit declaration is to let the author or compiler choose the dependency boundary directly.

### 3.4 Change Normalization And Matching

Source target: `packages/flux-runtime/src/scope-change.ts`

`ScopeChange` may continue to carry concrete paths for diagnostics.
Invalidation matching should normalize those paths to impacted roots before dependency comparison.

Examples:

- `scope.update('user.name', 'Bob')` -> impacted root `user`
- `scope.update('filters.status', 'active')` -> impacted root `filters`
- `scope.merge({ user, flag })` -> impacted roots `user`, `flag`
- replace or unknown provenance -> wildcard

After normalization, matching is simple:

- wildcard change hits everything
- wildcard dependency matches everything
- otherwise root equality decides the hit

The current hierarchical `pathMatchesDependency` behavior is a reasonable deep-path implementation detail for today's code, but it should not remain the long-term semantic contract once dependencies converge to roots.

### 3.5 Source Invalidation

Source targets: `packages/flux-runtime/src/async-data/source-registry.ts`, `packages/flux-runtime/src/async-data/data-source-runtime.ts`

Source invalidation rules under the target model:

- formula sources use explicit roots when declared, otherwise runtime-collected roots
- API sources use explicit roots when declared, otherwise roots collected from evaluated request configuration
- self-writes to the source's own published binding must be filtered out before dependency matching
- after that filter, any remaining root hit may invalidate or refresh according to source policy

Formula and API sources still share the same dependency substrate. The difference remains producer behavior, not dependency semantics.

### 3.6 Reaction Invalidation

Source target: `packages/flux-runtime/src/async-data/reaction-runtime.ts`

Reaction invalidation rules under the target model:

- the `watch` value owns the reaction's dependency roots
- `when` stays a guard over the re-evaluated `watch` result
- `when` does not automatically widen the reaction dependency set unless a narrower subsystem explicitly says so
- `changedPaths` diagnostics may remain raw paths or normalized roots; correctness does not depend on member-path precision

This keeps the dependency boundary narrow:

- dependency change decides whether to re-evaluate the watched value
- value change plus `when` decides whether to dispatch effects

### 3.7 Collection And Row-Scope Invalidation

This section is normative for table today and is the target direction for other collection renderers.

Current live baseline:

- table owns a supported row-local translation slice
- generic collection owners such as loop/list/tree are expected to follow the same rules when they land equivalent row/item scope reuse, but that convergence is not complete yet

Rules:

1. A collection owner depends on the collection binding root, for example `tableData`.
2. Each row scope introduces its own local root binding, for example `row` or `record`.
3. Row-local expressions depend on that row root, not on the parent collection root.
4. Updating one row must not invalidate sibling row scopes unless their own row binding changes.
5. Structural collection changes may invalidate collection layout and recreate affected row scopes.

Concretely:

- if `tableData[3].name` changes, the collection owner may detect that root `tableData` changed
- the collection runtime should reconcile the affected row and publish a row-local change in row 3's scope as `row` or `record`
- sibling rows should receive no row-local change if their bound row value is unchanged
- if stable row identity exists, unchanged row scopes should be preserved across array replacement, reorder, or pagination reconciliation whenever the same row binding can be retained safely
- if a row object is referentially unchanged after reconciliation, that row scope should not emit a change just because the parent array instance changed

The collection owner is therefore responsible for translating parent collection updates into row-local invalidation. Without that translation, root-only tracking would collapse row consumers back to whole-collection invalidation.

Table-specific note:

- the current supported table owner path keeps one stable isolated row scope per materialized `rowKey`
- table reconciles row-scope publication in a pre-paint owner-controlled step instead of mutating shared row-scope state during render
- table publishes one minimal row-local root change-set per affected row reconciliation, typically `record`, `index`, or both
- table removes its module-level row-scope cache entry when the owning table instance unmounts or its owner identity changes

### 3.8 Validation Dependency Boundary

Validation should remain separate for now.

Rationale:

- validation already uses an explicit field-graph model
- it has deterministic compile-time extraction for its own domain
- forcing it into the same general runtime dependency structure would add coupling without a clear correctness win

Future reuse is allowed only if a concrete maintenance problem appears. It should not be a prerequisite for the root-level dependency model.

---

## 4. Invalidation Contract

### 4.1 Conservative Rule

When precise dependency information is unavailable, the runtime must be conservative: invalidate rather than skip.

Current `scopeChangeHitsDependencies(change, undefined) -> true` is correct for unknown dependencies.

If the runtime later needs an explicit "depends on nothing" state, that state must be represented distinctly from `undefined`.

### 4.2 Root-Level Match Rule

Under the target model, dependency matching happens on normalized roots, not deep paths.

Examples:

- dependency `user` is hit by write `user.name`
- dependency `row` is hit by any row-local write once the collection owner has translated the change into the row scope
- wildcard remains the escape hatch when precise rooting is impossible

Raw member paths may still be preserved for diagnostics, debugger output, and human explanation.

### 4.3 Explicit Declaration Precedence

When explicit root dependencies are declared, they win.

That means:

- runtime fallback is only for undeclared producers/watchers
- runtime-collected roots do not silently widen or replace an explicit declaration in production semantics
- dev tooling may compare the two and report mismatches

### 4.4 Self-Write Loop Guard

Sources must not re-trigger from writes to their own published root.
The guard should filter self-written roots out of the change set before dependency matching.

Current shape to avoid:

```typescript
if (targetPath && change.paths.every((p) => p === targetPath || p.startsWith(`${targetPath}.`))) {
  return;
}
if (!scopeChangeHitsDependencies(change, dependencies)) return;
```

Target shape:

```typescript
const otherRoots = filterOutOwnPublishedRoots(change, targetPath);

if (otherRoots.length === 0) {
  return;
}

if (!scopeChangeHitsDependencies({ ...change, paths: otherRoots }, dependencies)) {
  return;
}
```

### 4.5 Cross-Scope Propagation

Child scopes still subscribe to both their own store and their parent store.

Direction rules:

- parent writes propagate downward
- child writes do not propagate upward
- collection owners with row scopes must translate parent collection changes into row-local roots instead of forwarding only raw parent paths

This direction is correct because data visibility flows downward through lexical scope inheritance.

---

## 5. Remaining Follow-Up Work

### Phase 1: Correctness Fixes (Completed)

1. ~~Refine the self-write guard so mixed changes filter out only the source's own published root before dependency matching.~~ **Done**: `filterScopeChangeByIgnoredRoots()` in `scope-change.ts` filters self roots before match.
2. Distinguish "unknown dependencies" from any future explicit empty dependency state. **Deferred**: Current conservative behavior (`undefined` -> invalidate) remains correct.

### Phase 2: Root-Only Runtime Tracking (Completed)

3. ~~Change `createScopeDependencyCollector()` and formula scope wrapping so runtime fallback emits lexical root bindings only.~~ **Done**: `normalizeTrackedPath()` in `flux-formula/src/scope.ts` uses `normalizeRootPath()`.
4. ~~Treat whole-scope enumeration/materialization as wildcard, but keep bound-object enumeration anchored to its root binding.~~ **Done**: Top-level `ownKeys` records wildcard; nested `ownKeys` records only the root binding.
5. ~~Normalize changed paths to roots before dependency matching.~~ **Done**: `scopeChangeHitsDependencies()` calls `getChangeRoots()` and `getDependencyRoots()` which use `normalizeRootPaths()`.

### Phase 3: Post-Landing Explicit Declaration Follow-Up (Completed)

6. ~~Keep `dependsOn?: string[]` as the producer/watcher-level explicit dependency carrier now that it exists on `DataSourceSchema` and `ReactionSchema`.~~ **Done**: Both schema types include `dependsOn?: string[]`.
7. ~~Preserve the current runtime rule that explicit roots are authoritative for invalidation, while runtime-collected roots remain the fallback when `dependsOn` is absent.~~ **Done**: `reaction-runtime.ts` line 73 uses `createRootDependencySet(input.dependsOn)` first, falls back to `collectRuntimeDependencies()` only when absent.
8. Optionally add dev-only diagnostics that compare explicit roots with runtime-collected reads. **Deferred**: Not yet implemented, low priority.

### Phase 4: Generic Collection/Row Reconciliation Follow-Up

9. Keep the current table-owned row-scope reconciliation baseline as the reference owner slice.
10. Extend equivalent row/item-scope reconciliation rules to other collection owners that need them.
11. Preserve unchanged row scopes when stable row identity allows it.
12. Publish row-local root changes only to affected rows instead of fan-out invalidating the whole collection subtree.

### Phase 5: Optional Follow-Up Work

12. Revisit ephemeral evaluation ownership only if `stopWhen`, action guards, or similar paths need to participate in producer/watcher invalidation.
13. Keep validation separate unless a concrete reuse case outweighs the coupling cost.
14. If the product later requires stricter declaration-first authoring, add dev-only and then authoring-time diagnostics for missing `dependsOn` instead of widening runtime fallback semantics.

---

## 6. Implementation Anchors

| Concern                         | Current location                                                                                | Convergence target                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `ScopeDependencySet` type       | `packages/flux-core/src/types/scope.ts`                                                         | keep type, redefine `paths` semantically as normalized roots or `'*'` |
| `ScopeDependencyCollector`      | `packages/flux-formula/src/scope.ts`                                                            | emit root bindings only                                               |
| Formula scope wrapping          | `packages/flux-formula/src/scope.ts`                                                            | keep nested access anchored to the first root binding                 |
| `scopeChangeHitsDependencies`   | `packages/flux-runtime/src/scope-change.ts`                                                     | normalize writes to roots before matching                             |
| `collectRuntimeDependencies`    | `packages/flux-runtime/src/node-runtime.ts`                                                     | unchanged aggregation shape                                           |
| Explicit dependency carrier     | `packages/flux-core/src/types/schema.ts` (`dependsOn` on `DataSourceSchema` / `ReactionSchema`) | keep explicit roots first, runtime fallback second                    |
| Source dependency init          | `packages/flux-runtime/src/async-data/source-registry.ts`                                       | explicit roots first, runtime fallback second                         |
| API request dependency tracking | `packages/flux-runtime/src/async-data/data-source-runtime.ts`                                   | collect request-config roots only when explicit roots are absent      |
| Reaction dependency init        | `packages/flux-runtime/src/async-data/reaction-runtime.ts`                                      | explicit roots first, runtime fallback second                         |
| Self-write guard                | `packages/flux-runtime/src/async-data/source-registry.ts`                                       | filter self roots before match                                        |
| Collection/row root translation | collection-owning renderer/runtime code                                                         | publish row-local root changes for affected rows only                 |
| Validation dependency system    | `packages/flux-runtime/src/validation/*`                                                        | keep separate unless a concrete reuse case appears                    |

Current runtime note:

- `scopeChangeHitsDependencies()` now keeps the root-normalization baseline while using prefix-aware deep-path matching for multi-segment paths instead of the older pairwise overlap scan.
- Form-store value subscriptions now support `subscribeToPaths(paths, listener)` so hot-path consumers can subscribe to exact dependency sets without whole-store fallback.
- Table row-scope reconciliation is now a supported owner baseline in `packages/flux-renderers-data`; Phase 4 follow-up refers to generic collection-owner convergence beyond table.
