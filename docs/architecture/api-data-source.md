# ApiObject, DataSource, and Reaction Design

## Purpose

This document defines:

- `ApiObject` as the declarative HTTP request contract
- `DataSourceSchema` as the unified declarative source model in Flux
- `ReactionSchema` as the declarative side-effect watcher model paired with sources

`data-source` should not be treated as a special visual component category. It is a non-rendering source declaration that publishes a derived value into the current scope.

Under this model:

- a `formula`-backed `data-source` is a synchronous derived value, conceptually similar to a Vue `computed`
- an `api`-backed `data-source` is an asynchronous derived value, conceptually similar to an async computed/source ref
- future stream or provider-backed sources should follow the same model rather than introducing a parallel abstraction

This keeps Flux aligned with its role as a final DSL runtime: schema declares derived values, runtime owns source lifecycle, and React only hosts the execution boundary.

`reaction` is the companion abstraction for imperative consequences. A source derives values. A reaction watches derived or raw values and dispatches actions when those values change.

## ApiObject

`ApiObject` describes an HTTP request configuration.

### Interface

```typescript
interface ApiObject extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
  cacheTTL?: number;
  cacheKey?: string;
  dedupStrategy?: 'cancel-previous' | 'parallel' | 'ignore-new';
}
```

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `url` | `string` | Request URL (required) |
| `method` | `string` | HTTP method (default: `get`) |
| `data` | `SchemaValue` | Request body data |
| `params` | `SchemaValue` | URL query parameters |
| `headers` | `Record<string, string>` | Request headers |
| `includeScope` | `'*' \| string[]` | Auto-include scope variables in request data |
| `responseAdaptor` | `string` | Expression to transform response |
| `requestAdaptor` | `string` | Expression to transform request |
| `cacheTTL` | `number` | Cache time-to-live in milliseconds |
| `cacheKey` | `string` | Custom cache key |
| `dedupStrategy` | `'cancel-previous' \| 'parallel' \| 'ignore-new'` | In-flight request coordination policy |

### includeScope

`includeScope` controls automatic scope-variable injection into request data.

Merge rule:

```text
finalData = { ...extractScope(includeScope), ...data }
```

Explicit `data` keys win over extracted scope keys.

### params

`params` describes URL query parameters.

Examples:

```json
{
  "url": "/api/users",
  "method": "get",
  "params": { "status": "active", "page": 1 }
}
```

```json
{
  "url": "/api/users",
  "method": "post",
  "params": { "version": "v2" },
  "data": { "name": "Alice" }
}
```

### requestAdaptor / responseAdaptor

Adaptors transform request/response payloads using the expression engine.

Request-adaptor context:

- `api`
- `scope`
- `data`
- `headers`

Response-adaptor context:

- `payload` / `response`
- `api`
- `scope`

Example:

```json
{
  "url": "/api/data",
  "requestAdaptor": "return { ...api, data: { ...api.data, timestamp: Date.now() } }",
  "responseAdaptor": "return payload.data.items"
}
```

### cacheTTL / cacheKey / dedupStrategy

These fields describe request coordination, not rendering behavior.

- `cacheTTL`: cache lifetime in milliseconds
- `cacheKey`: custom cache identity for cross-source sharing
- `dedupStrategy`: in-flight coordination policy for equivalent requests

### Required Request Execution Flow

`executeApiObject(...)` should be the single convergence path for request execution.

The required flow is:

1. Evaluate dynamic request config in the current scope
2. Extract and merge `includeScope` into request data
3. Build the final URL with `params`
4. Apply `requestAdaptor`
5. Execute through runtime-managed fetch / abort / dedup / cache coordination
6. Apply `responseAdaptor`
7. Return the adapted payload to the caller

Current baseline note:

- `executeApiObject(...)` now owns the main request convergence path used by ajax actions, form submit, validation, and data-source execution
- callers may still pass declarative request objects; `executeApiObject(...)` evaluates those values in scope before canonical request preparation so request execution semantics stay unified across actions, forms, validation, and data-sources
- request preparation is split into explicit helpers, but the runtime now converges those helpers into one canonical executable request shape before fetch
- dedup and runtime-local cache coordination are keyed by that final executable request semantics rather than only by the original declarative `ApiObject`
- executable request canonicalization normalizes `params` into the final URL and removes `params` from the fetcher-facing request object so equivalent `url + params` forms share the same identity
- adaptor expressions and object-shaped runtime values are now cached by source/object identity on the hot path so repeated dispatch/request execution avoids ad hoc recompilation where schema identity is stable
- ajax-side API monitor callbacks should observe the final executable request shape, not the pre-canonical declarative request object, so diagnostics line up with what fetch/dedup/cache actually execute
- current source-runtime baseline now includes a runtime-owned source registry scoped by `ScopeRef.id`; `DataSourceRenderer` only registers/disposes entries while runtime owns controller start/stop and replacement semantics
- current `DataSourceSchema` baseline now supports both `api` and `formula` producers under the same runtime-owned registration path
- current formula-source baseline publishes on mount and explicit refresh using the shared runtime registry, but it does not yet implement the full dependency-indexed lazy invalidation model described below
- current `DataSourceController` baseline now exposes a minimal runtime state surface via `getState()` with `started`, `loading`, `stale`, `value`, and `error`; api sources actively drive all fields while formula sources currently use the same shape with lightweight synchronous semantics
- current runtime baseline now also exposes explicit source refresh by id at the runtime boundary; refresh remains scope-scoped first, so duplicate source ids in different scopes do not collapse into one page-global namespace
- current source runtime now has a dependency-aware invalidation baseline: formula sources automatically recompute and api sources automatically refresh when changed scope paths hit the dependencies collected from formula evaluation or request-config evaluation
- current invalidation also includes a self-target loop guard so a source does not immediately retrigger itself from writes to its own published `dataPath`
- current action/runtime integration now includes a built-in `refreshSource` action that targets a registered source id via `componentId` or `componentPath` and delegates to the runtime-owned source registry refresh semantics

## DataSourceSchema

`data-source` is a non-rendering source declaration. It does not exist to render UI. It exists to register a derived value in the current scope.

This is the key conceptual shift:

- `data-source` is not only "fetch remote data"
- `data-source` is the general DSL concept for "derive a value from the current context"
- remote requests are one producer kind under that abstraction
- formula-based computation is another producer kind under the same abstraction

### Interface

```typescript
interface BaseDataSourceSchema extends BaseSchema {
  type: 'data-source';
  dataPath?: string;
  initialData?: SchemaValue;
}

interface FormulaDataSourceSchema extends BaseDataSourceSchema {
  formula: SchemaValue;
}

interface ApiDataSourceSchema extends BaseDataSourceSchema {
  api: ApiObject;
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
}

type DataSourceSchema = FormulaDataSourceSchema | ApiDataSourceSchema;
```

Rules:

- a single `data-source` declares one producer kind
- `formula` and `api` are mutually exclusive in the same node
- new schemas should prefer explicit `dataPath`
- formula-backed sources should require explicit `dataPath`

### Binding Target

`dataPath` is the preferred binding target for a source value.

Example:

```text
scope[dataPath] = sourceValue
```

For API-backed sources, current code still supports the older merge-into-scope behavior when `dataPath` is omitted and the response is an object. That behavior is compatibility-oriented. The preferred design direction is explicit binding because it preserves the mental model of:

```text
one data-source = one logical derived value
```

`initialData` seeds the source target before the first real evaluation or fetch begins.

### Producer Kinds

#### Formula source

A formula-backed source is a synchronous derived value.

- input: current scope
- producer: compiled expression / compiled value tree
- output: derived value written to `dataPath`
- mental model: computed ref, not effect

Its semantics should be:

- dependencies are inferred automatically from expression access
- upstream changes mark the source dirty
- the source recomputes lazily on next read or subscribed use
- unchanged semantic values should preserve identity when possible

Important boundary:

- formula-backed `data-source` describes a derived value
- it should not be used as a hidden imperative write-effect engine for arbitrary sibling updates
- side-effect reactions belong to a separate reaction/watch abstraction, not to the source abstraction itself

#### Api source

An API-backed source is an asynchronous derived value.

- input: current scope plus `ApiObject`
- producer: runtime-managed request execution
- output: adapted response value written to `dataPath`
- mental model: async computed/source ref

Its semantics should be:

- dependencies come from expressions used by the request config
- dependency changes invalidate the source and trigger refresh according to source policy
- runtime owns loading, error, cache, dedup, abort, and polling behavior

`interval` and `stopWhen` remain API-source-specific controls.

### Dependency Tracking And Invalidation

Flux should not require authors to manually enumerate source dependencies for normal computed-style usage.

Preferred model:

1. compile-time static extraction when the expression tree makes dependencies obvious
2. runtime dynamic access tracking during evaluation to refine the actual dependency set

This hybrid model gives:

- good initial indexing
- correct behavior for dynamic access paths
- lazy recomputation semantics closer to modern reactive systems

When an upstream path changes:

- dependent sources are marked dirty
- formula sources recompute lazily
- API sources invalidate and refresh according to source policy

The runtime goal is targeted invalidation, not eager full-tree re-evaluation.

### Runtime Ownership

`data-source` stays runtime-owned, not renderer-owned.

Required boundary:

- `DataSourceRenderer` remains a `null` renderer
- React only wires lifecycle
- runtime owns source registration, source invalidation, request control, polling, abort, and cache coordination

The intended end state is a runtime-local source registry where formula and API producers share the same conceptual lifecycle model.

More precisely:

- source and reaction semantics belong to the current lexical data scope
- runtime should maintain source/reaction registries as scope-scoped sidecars keyed by `ScopeRef.id`
- child scopes may therefore own child source/reaction buckets
- disposing a scope should also dispose the source/reaction registrations owned by that scope
- this must not be modeled by turning `ScopeRef` itself into a behavior registry

A practical first implementation shape is:

```ts
interface RuntimeSourceRegistry {
  scopeEntries: Map<string, Map<string, RuntimeSourceEntry>>;
}

interface RuntimeReactionRegistry {
  scopeEntries: Map<string, Map<string, RuntimeReactionEntry>>;
}
```

Where:

- the outer key is `ScopeRef.id`
- the inner key is a stable entry id such as `node.id`
- the owner is `RendererRuntime`, not `ScopeRef` and not a page-global bag

Conceptually:

```text
ScopeRef = pure data contract
RendererRuntime.sourceRegistry.scopeEntries[scopeId] = source entries for that scope
RendererRuntime.reactionRegistry.scopeEntries[scopeId] = reaction entries for that scope
```

This preserves the existing design rule that data lookup remains on `ScopeRef`, while source/reaction lifecycle, invalidation, polling, and watcher scheduling remain runtime-owned.

### Loading And Error State

`data-source` itself renders `null`.

The source abstraction is responsible for value production, not for built-in loading or error chrome.

- formula sources usually expose only a current value
- API sources also have runtime status such as loading / error / stale
- UI should choose how to observe and present those states rather than forcing a built-in widget into the source abstraction

### Examples

#### Formula-backed derived field

```json
{
  "type": "form",
  "body": [
    {
      "type": "input-text",
      "name": "price",
      "label": "Price"
    },
    {
      "type": "input-text",
      "name": "qty",
      "label": "Qty"
    },
    {
      "type": "data-source",
      "dataPath": "total",
      "formula": "${Number(price || 0) * Number(qty || 0)}"
    },
    {
      "type": "text",
      "text": "Total: ${total}"
    }
  ]
}
```

#### API-backed source with explicit binding

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "dataPath": "tasks",
      "api": {
        "url": "/api/tasks",
        "includeScope": ["projectId"],
        "params": { "status": "active" }
      }
    },
    {
      "type": "text",
      "text": "Found ${tasks.length} active tasks"
    }
  ]
}
```

#### Polling API-backed source

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "dataPath": "status",
      "api": { "url": "/api/job/${jobId}/status" },
      "interval": 3000,
      "stopWhen": "${status.complete}"
    },
    {
      "type": "text",
      "text": "Progress: ${status.progress}%"
    }
  ]
}
```

## ReactionSchema

`reaction` is a non-rendering watcher node. It does not publish a value into scope. It observes a value expression and triggers actions when the observed value changes.

This keeps Flux's runtime semantics clean:

- `data-source` is for derived values
- `reaction` is for side effects

The two abstractions should share the same dependency-tracking substrate, but they must not share the same semantic role.

### Interface

```typescript
interface ReactionSchema extends BaseSchema {
  type: 'reaction';
  watch: SchemaValue;
  when?: string;
  immediate?: boolean;
  debounce?: number;
  once?: boolean;
  actions: ActionSchema | ActionSchema[];
}
```

### Fields

| Field | Type | Description |
| --- | --- | --- |
| `watch` | `SchemaValue` | Expression or value node to observe |
| `when` | `string` | Optional guard expression evaluated against current and previous watch values |
| `immediate` | `boolean` | Whether to evaluate and potentially fire immediately on mount |
| `debounce` | `number` | Optional debounce delay before action dispatch |
| `once` | `boolean` | Auto-dispose after the first successful trigger |
| `actions` | `ActionSchema \| ActionSchema[]` | Action pipeline to dispatch when triggered |

### Semantics

`reaction` should behave like a runtime watch/effect node, not like a renderer lifecycle hook.

Required behavior:

1. Compile `watch` as a runtime value
2. Evaluate `watch` with dependency tracking
3. Record the current watch value as `value`
4. On upstream dependency change, re-evaluate `watch`
5. If the watch value changed, evaluate `when` if provided
6. If allowed, dispatch `actions`

The runtime context available to `when` and `actions` should include at least:

- `value`: current observed value
- `prev`: previous observed value
- `changed`: boolean value-change result
- `changedPaths`: changed upstream paths when available

### Change Detection

Default change detection should use semantic equality close to `Object.is` at the top-level observed value.

The baseline rule is:

- no trigger if the observed value is semantically unchanged
- trigger only after the new observed value has stabilized for the current update cycle

This avoids turning `reaction` into a noisy per-write effect system.

### Scheduling

Reactions should run after the relevant update has been committed, not in the middle of an incomplete mutation chain.

Preferred scheduling model:

- source invalidation happens first
- state write settles
- watch values are re-evaluated
- reactions dispatch actions afterward

This keeps reaction semantics closer to declarative watch semantics and reduces accidental re-entrancy.

### Loop Prevention

Because reactions can dispatch actions that mutate the same scope, runtime must guard against loops.

Required protections:

- per-cycle trigger dedupe
- depth / cascade guard
- debounce support
- `once` support for one-shot reactions
- do not re-trigger when the watched value remains unchanged after an action-induced writeback

### Relationship To DataSource

`reaction` should reuse the same dependency collection mechanism as `data-source`, but the output contract is different.

- `data-source`: produces and publishes a value
- `reaction`: observes a value and dispatches actions

Both should still be registered against the current data-scope bucket rather than a page-global bag.

For the current architecture, the preferred activation model remains:

- a `null` renderer mounts
- it registers the source/reaction with runtime
- runtime owns the actual lifecycle and cleanup record
- unmount disposes that registration

This means a reaction can watch:

- raw scope fields
- formula-backed sources
- API-backed sources

Current baseline note:

- `reaction` is now available as a first runtime-owned null-renderer node
- the current baseline supports `watch`, optional `when`, `immediate`, `debounce`, `once`, and `actions`
- watch evaluation reuses the same dependency collection substrate as source/runtime value evaluation
- reactions are scheduled asynchronously after the triggering scope write settles rather than firing inline in the same mutation callback
- this first cut does not yet include a heavier shared reaction registry API, advanced loop-depth diagnostics, or debugger-specific reaction inspection surfaces
- arbitrary expressions built from those values

Conceptually:

```text
data-source = value producer
reaction = value observer with side effects
```

### Examples

#### Reset another field when a value changes

```json
{
  "type": "reaction",
  "watch": "${country}",
  "when": "${value !== prev}",
  "actions": [
    {
      "action": "setValue",
      "args": {
        "path": "state",
        "value": ""
      }
    }
  ]
}
```

#### Trigger dialog when a threshold flips to true

```json
{
  "type": "reaction",
  "watch": "${total > 1000}",
  "when": "${value === true && prev !== true}",
  "actions": [
    {
      "action": "dialog",
      "dialog": {
        "title": "High Amount"
      }
    }
  ]
}
```

### Design Boundary

`reaction` is intentionally narrower than a general-purpose embedded effect language.

It should not become:

- a second scripting runtime
- an unrestricted hidden imperative layer inside declarative schema
- a replacement for explicit action dispatch from user interactions

Its purpose is to model data-driven side effects that are awkward or impossible to express as pure derived values.

## Current Implementation Status

Current code already implements part of this model:

- API-backed `data-source` orchestration lives in `@nop-chaos/flux-runtime`
- `DataSourceRenderer` is already a `null` renderer that only wires lifecycle
- request execution, cache reads/writes, polling timers, stop-condition evaluation, and abort lifecycle are runtime-owned

Current code is not yet fully converged to the target model:

- formula-backed sources are not yet unified under the same runtime source abstraction
- source dependency tracking is not yet a full static-plus-dynamic invalidation system
- request preparation is still not fully converged through a single execution path
- API-backed sources still allow legacy merge semantics when `dataPath` is omitted
- `reaction` does not yet exist as a first-class runtime watch node

## dataPath vs ActionSchema.dataPath

- `ActionSchema.dataPath` controls where an ajax action result is written in page data
- `DataSourceSchema.dataPath` controls where a derived source value is published in the current scope

These are related but distinct concepts.

`ApiObject` remains request description only. The write target belongs to the consumer context: action result target or source binding target.

## Related Documents

- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
