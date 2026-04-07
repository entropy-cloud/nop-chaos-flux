# ApiSchema, Source, DataSource, and Reaction Design

## Purpose

This document defines:

- `ApiSchema` as the declarative HTTP request contract
- `SourceSchema` as the anonymous action-based value producer form
- `DataSourceSchema` as the named and scheduled source form in Flux
- `ReactionSchema` as the declarative side-effect watcher model paired with sources

`data-source` should not be treated as a special visual component category. It is a non-rendering named source declaration that publishes a derived value into the current scope.

Under this model:

- plain `${...}` expressions remain the preferred synchronous derived-value form
- `type: 'source'` is the anonymous execution-backed value form for field-local consumption
- `type: 'data-source'` is the named and scheduled source form when publication, refresh, or reuse semantics are needed
- request-backed and invoke-backed producers should follow the same model rather than introducing parallel abstractions

This keeps Flux aligned with its role as a final DSL runtime: schema declares derived values, runtime owns source lifecycle, and React only hosts the execution boundary.

`reaction` is the companion abstraction for imperative consequences. A source derives values. A reaction watches derived or raw values and dispatches actions when those values change.

## ApiSchema

`ApiSchema` describes declarative request configuration in schema authoring.

### Interface

```typescript
interface ApiSchema extends SchemaObject {
  url: string;
  method?: string;
  data?: SchemaValue;
  params?: SchemaValue;
  headers?: Record<string, string>;
  includeScope?: '*' | string[];
  responseAdaptor?: string;
  requestAdaptor?: string;
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

### ExecutableApiRequest

The runtime prepares an `ExecutableApiRequest` from `ApiSchema` before the request reaches the fetch layer.

Directionally:

```typescript
interface ExecutableApiRequest {
  url: string;
  method?: string;
  data?: unknown;
  headers?: Record<string, string>;
}
```

This executable shape is not the same concept as the declarative `ApiSchema`:

- dynamic expressions have already been evaluated
- `includeScope` has already been merged into request data
- `params` have already been canonicalized into the final URL
- `requestAdaptor` has already been applied

`PreparedApiRequest` remains the request-runtime internal artifact that carries the final executable request plus preparation metadata such as `finalUrl`, `data`, and `params`.

### Fetcher Boundary

`env.fetcher(...)` is the host transport boundary.

Directionally:

```typescript
type ApiFetcher = <T = unknown>(api: ExecutableApiRequest, ctx: ApiRequestContext) => Promise<ApiResponse<T>>;

interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
  headers?: Record<string, string>;
  raw?: unknown;
}
```

Normative rule:

- `ApiResponse` is only the fetcher boundary result
- runtime callers should not consume non-OK `ApiResponse` values as normal business results
- `executeApiSchema(...)` converts non-OK responses into thrown errors
- therefore runtime and renderer consumers observe successful adapted `data` or an exception

Recommended host behavior:

- either return `ok: true` responses for success
- or throw an `Error` for failures
- returning `ok: false` is still tolerated at the fetcher boundary, but request runtime will immediately convert it into a thrown error before the result reaches action/source/form consumers

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

Adaptors transform request/response payloads using a dedicated adaptor expression surface owned by request execution.

Normative boundary:

- adaptors are not arbitrary JavaScript execution exposed through `new Function(...)`
- adaptors are not plain Flux value expressions either; they are a narrower request/response transformation surface evaluated by the request runtime
- implementation may currently reuse Flux expression infrastructure internally, but the public contract is an adaptor-specific transformation surface with explicit request/response context

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
  "requestAdaptor": "${withRequestData(api.data, { timestamp: now() })}",
  "responseAdaptor": "${payload.data.items}"
}
```

### Operation Control

Request coordination does not belong to `ApiSchema`.

Fields such as:

- `timeout`
- `retry`
- `debounce`
- `throttle`
- `cacheTTL`
- `cacheKey`
- `dedup`

belong to `Operation Control`, not to transport description. Action-backed and source-backed consumers may carry those controls through their own narrower schema surfaces, but the transport contract stays focused on request inputs and adaptors.

### Required Request Execution Flow

`executeApiSchema(...)` should be the single convergence path for request execution from declarative `ApiSchema` to fetcher-facing `ExecutableApiRequest`.

The required flow is:

1. Evaluate dynamic request config in the current scope
2. Extract and merge `includeScope` into request data
3. Build the final URL with `params`
4. Apply `requestAdaptor`
5. Execute through runtime-managed fetch / abort / dedup / cache coordination
6. Apply `responseAdaptor`
7. If the fetcher result is non-OK, throw an error
8. Return the adapted payload to the caller

Current baseline note:

- `executeApiSchema(...)` now owns the main request convergence path used by ajax actions, form submit, validation, and data-source execution
- callers may still pass declarative request objects; `executeApiSchema(...)` evaluates those values in scope before canonical request preparation so request execution semantics stay unified across actions, forms, validation, and data-sources
- request preparation is split into explicit helpers, but the runtime now converges those helpers into one canonical executable request shape before fetch
- dedup and runtime-local cache coordination are keyed by that final executable request semantics rather than only by the original declarative `ApiSchema`
- executable request canonicalization normalizes `params` into the final URL and removes `params` from the fetcher-facing request object so equivalent `url + params` forms share the same identity
- adaptor expressions and object-shaped runtime values are now cached by source/object identity on the hot path so repeated dispatch/request execution avoids ad hoc recompilation where schema identity is stable
- ajax-side API monitor callbacks should observe the final executable request shape, not the pre-canonical declarative request object, so diagnostics line up with what fetch/dedup/cache actually execute
- current source-runtime baseline now includes a runtime-owned source registry scoped by `ScopeRef.id`; `DataSourceRenderer` only registers/disposes entries while runtime owns controller start/stop and replacement semantics
- current `DataSourceSchema` baseline now supports both `api` and `formula` producers under the same runtime-owned registration path
- current formula-source baseline publishes on mount and explicit refresh using the shared runtime registry, but it does not yet implement the full dependency-indexed lazy invalidation model described below
- current `DataSourceController` baseline now exposes a minimal runtime state surface via `getState()` with `started`, `loading`, `stale`, `value`, and `error`; api sources actively drive all fields while formula sources currently use the same shape with lightweight synchronous semantics
- current runtime baseline now also exposes explicit source refresh by id at the runtime boundary; refresh remains scope-scoped first, so duplicate source ids in different scopes do not collapse into one page-global namespace
- current code may still accept older built-in target field names for `refreshSource` for compatibility, but the architecture baseline treats source refresh as built-in runtime-entry targeting rather than component-handle targeting
- current source runtime now has a dependency-aware invalidation baseline: formula sources automatically recompute and api sources automatically refresh when changed scope paths hit the dependencies collected from formula evaluation or request-config evaluation
- current invalidation also includes a self-target loop guard so a source does not immediately retrigger itself from writes to its own published `dataPath`
- current action/runtime integration now includes a built-in `refreshSource` action that targets a registered source id via a built-in target field such as `targetId` and delegates to the runtime-owned source registry refresh semantics; this is runtime-entry targeting, not component-handle dispatch, even if older field naming remains in code for compatibility

## SourceSchema

`type: 'source'` is the anonymous execution-backed value form.

It is used when a field needs a runtime-managed dynamic value but does not need named publication into scope.

`source` is modeled as an action-shaped execution descriptor whose result is consumed as a value rather than only as an effect.

Directionally:

```typescript
interface SourceSchema extends ActionSchema {
  type: 'source';
}
```

Examples:

```json
{
  "options": {
    "type": "source",
    "action": "ajax",
    "api": {
      "url": "/api/countries",
      "params": {
        "region": "${form.region}"
      },
      "responseAdaptor": "${payload.items}"
    },
    "control": {
      "dedup": "cancel-previous"
    }
  }
}
```

```json
{
  "options": {
    "type": "source",
    "action": "dict:getCountryOptions",
    "args": {
      "region": "${form.region}"
    }
  }
}
```

Anonymous `source` may still expose runtime state such as `loading` or `error` to the local consumer. The difference from `data-source` is not whether state exists, but whether the produced value is explicitly named, published, refreshed, and reused outside the local consumer boundary.

## DataSourceSchema

`data-source` is a non-rendering named source declaration. It exists to register a derived value in the current scope.

This is the key conceptual shift:

- `data-source` is not only "fetch remote data"
- `data-source` is the named and managed source form for values that need publication, refresh, or reuse
- request-backed and invoke-backed execution are producer kinds under that abstraction
- pure synchronous computation should stay a plain `${expr}` unless it needs named publication or runtime-managed source semantics

### Interface

```typescript
interface BaseDataSourceSchema extends BaseSchema {
  type: 'data-source';
  name?: string;
  mergeToScope?: boolean;
  statusPath?: string;
  dataPath?: string;
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
}

interface DataSourceSchema extends BaseDataSourceSchema, ActionSchema {
  interval?: number;
  stopWhen?: string;
  silent?: boolean;
}
```

Rules:

- `data-source` extends source-style action execution with named publication and scheduling controls
- `action`, `args`, `api`, `control`, `then`, `onError`, and `parallel` follow the same execution semantics used by action-backed sources
- `name` is the normative author-visible identity and default publication path
- `mergeToScope: true` is the only narrowed special publish extension beyond the named publication path
- legacy `dataPath` publication override is compatibility-only and should not be introduced in new schema
- `statusPath`, when present, is the readonly status-summary path for loading/error/stale state
- `interval`, `stopWhen`, and publication controls remain `data-source`-specific extensions above plain `source`

### Binding Target

`name` is the normative author-visible identity and default publication path.

The normative publication contract is:

- `name` is the authoritative default publication path
- `mergeToScope: true`, when present, adds an explicit shallow top-level object merge into the current scope
- legacy `dataPath`, when present, overrides the published binding path only as a compatibility contract during convergence

Example:

```text
scope[name] = sourceValue
```

Publication combinations:

| Configuration | Runtime target identity | Published path |
| --- | --- | --- |
| `name` only | `name` | `name` |
| `name` + `mergeToScope: true` | `name` | `name` plus shallow object-field merge into current scope |
| legacy `name` + `dataPath` | `name` | `dataPath` |
| legacy `id` + `dataPath` | `id` | `dataPath` |
| anonymous legacy `dataPath` only | none | `dataPath` |

The legacy AMIS-style behavior of publishing without an explicit binding target by merging into the current scope is non-normative and rejected because it causes namespace pollution, hides ownership, and makes collisions and debugging ambiguous. The only narrowed exception is explicit `mergeToScope: true` on a named `Resource`.

`mergeToScope: true` rules:

1. `name` remains the authoritative identity and default publication path
2. if the published value is a plain object, runtime additionally shallow-merges its top-level fields into the current lexical scope
3. the merged fields are derived projections from the same logical value; they are not a second independently writable business root
4. collisions with reserved projection names, active `Resource` targets, or ordinary scope data in the same owning lexical scope are invalid
5. if the published value is not object-like, `mergeToScope: true` is invalid and publication fails diagnostically

Current runtime compatibility note:

- `refreshSource` and source-registry lookup are still keyed by runtime `id` in the current repo
- formula-backed publication may still fall back to `dataPath ?? id` in some runtime paths
- therefore `name`-first identity/publication should be read as the preferred convergence direction, not as a statement that current runtime targeting has already moved away from `id` or fully stopped accepting legacy `dataPath`

`initialData` seeds the source target before the first real evaluation or fetch begins.

When `statusPath` is present, the source may additionally publish a readonly summary DTO containing fields such as `loading`, `ready`, `stale`, `error`, `optimisticPending`, and `canRollback`.

### Producer Kinds

#### Api source

An action-backed request source is an asynchronous derived value.

- input: current scope plus `ApiSchema` or another action-backed producer
- producer: runtime-managed action execution consumed as a value
- output: adapted response value written to the explicit published binding path
- mental model: async computed/source ref

Its semantics should be:

- dependencies come from expressions used by the producer config
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
- formula sources recompute according to the synchronous-before-reaction rule above when possible, otherwise lazily on next consumption or explicit refresh
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
- if schema needs author-visible source status, the preferred cross-runtime contract is explicit `statusPath`
- `statusPath` is readonly runtime summary data, not a second authoritative business value
- narrower subsystems may still project additional summary values, but they must not replace the core `statusPath` contract with implicit hidden sibling paths

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
      "name": "total",
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
      "name": "tasks",
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
      "name": "status",
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

`reaction` is a non-rendering watcher node. It does not publish a value into scope. It observes a value expression and triggers one root action object when the observed value changes.

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
  actions: ActionSchema;
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
| `actions` | `ActionSchema` | Root action object to dispatch when triggered |

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
- the current guard baseline also coalesces pending changed paths while a reaction is already queued and hard-stops a self-cascading reaction after a small bounded number of firings
- reaction ownership is now routed through a scope-scoped runtime reaction registry so same-scope same-id registrations replace prior reactions instead of leaking duplicate watchers
- runtime now exposes a minimal reaction debug snapshot surface that reports registered reaction ids, scope ids, watch config, dependency paths, disposal state, and fire counts
- this first cut still does not include richer debugger integration or advanced loop-depth diagnostics beyond the current bounded-fire safety rail
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
  "actions": {
    "action": "setValue",
    "args": {
      "path": "state",
      "value": ""
    }
  }
}
```

#### Trigger dialog when a threshold flips to true

```json
{
  "type": "reaction",
  "watch": "${total > 1000}",
  "when": "${value === true && prev !== true}",
  "actions": {
    "action": "openDialog",
    "args": {
      "title": "High Amount"
    }
  }
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
- some producer-specific details still remain narrower implementation work even though request execution now converges through `executeApiSchema(...)`
- API-backed sources still allow legacy merge semantics when neither `name` nor `dataPath` is declared; this is compatibility-oriented and non-normative
- richer debugger integration and advanced loop-depth diagnostics for `reaction` are still incomplete

## dataPath vs ActionSchema.dataPath

- `ActionSchema.dataPath` controls where an ajax action result is written in page data
- `DataSourceSchema.dataPath` controls where a derived source value is published in the current scope (legacy compatibility override; new schema should use `name`)

These are related but distinct concepts. `name` is the normative publication path for `DataSourceSchema`; `dataPath` on `DataSourceSchema` remains only as a compatibility override during convergence.

`ApiSchema` remains request description only. The write target belongs to the consumer context: action result target or source binding target.

## Related Documents

- `docs/architecture/frontend-programming-model.md` (normative Resource publication contract)
- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
