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

Current authoring note:

- adaptor `scope` is a lexical proxy over the active `ScopeRef`, so property reads such as `scope.token` and `scope.username` resolve through normal lexical lookup instead of forcing an eager whole-scope materialization
- adaptor strings remain expression-surface inputs, not general statement blocks
- `return <expression>;` is accepted today as compatibility sugar; runtime strips the leading `return` and trailing semicolon before compiling the adaptor expression
- request adaptor results are shallow-merged back onto the current declarative `ApiSchema`, so adaptors can rewrite fields such as `headers`, `data`, and `params`
- because request preparation finalizes URL canonicalization after adaptor application, request adaptors may still rewrite `params` and affect the final executable URL
- response adaptors currently receive the adapted fetch payload plus executable request context, but they do not receive a richer fetch-metadata object beyond `payload` / `response`, `api`, and lexical `scope`

Example:

```json
{
  "url": "/api/data",
  "requestAdaptor": "${withRequestData(api.data, { timestamp: now() })}",
  "responseAdaptor": "${payload.data.items}"
}
```

### Design Direction: ApiSchema As Ajax Action Transport Contract

`ApiSchema` 描述一次 HTTP 请求的 url / method / headers / params / adaptors，这一职责不变。变化在于：`ApiSchema` 不再作为 schema 上的 authoring 属性或 runtime 的独立执行入口，而是成为 `ajax` action 的**内部传输描述类型**。

两层关系：

1. **Action dispatch（运行时唯一执行路径）**：所有远程调用（form submit、data-source、async validation、reaction）统一走 `runtime.dispatch(...)` → `ActionRuntimeAdapter`。schema 中直接写 `{ action: "ajax", args: { url, method, ... } }`
2. **ApiSchema（ajax action 内部）**：`ajax` action 的实现内部将 `args` 构造为 `ApiSchema` 格式，再走 `executeApiSchema(...)` → fetcher。这是 action 实现细节，不是 schema 层可见的概念

被删除的内容：

- schema 上的 `api: ApiSchema` 属性（form、data-source、validation 等位置）。项目从未发布，不需要兼容层
- runtime 中 `submitApiCall(api)` 等绕过 action dispatch 的旁路
- async validation 中的 `{ kind: 'async', api: ApiSchema }` 变体

选择这个方向的原因：

- **统一执行路径**：提交、校验、数据源、事件处理所有远程调用最终都走 `runtime.dispatch(...)` → `ActionRuntimeAdapter` 这一条链路。拦截、日志、重试、幂等、超时只需要在一层实现
- **统一扩展模型**：用户注册一个自定义 action 后，校验、提交、数据源都可以复用，不需要分别为校验写 plugin、为提交写 hook
- **本地/远程校验无差别**：`{ action: "customCheck" }` 内部是 JS 函数还是 HTTP 调用，对消费者透明
- **测试统一**：mock action dispatch 即可覆盖所有场景
- **概念模型更简单**：用户只需要理解 action 是所有行为的统一入口，不需要同时理解 `api` 和 `action` 两套写法

`ApiSchema` 作为 `ajax` action 内部的传输描述类型继续存在，定义 HTTP 请求的 url / method / headers / params / adaptors，但只被 `ajax` action 实现消费。

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
- current `DataSourceSchema` baseline now supports both action-backed (via `action: "ajax"`) and `formula` producers under the same runtime-owned registration path
- formula `data-source` uses `name` as the normative publication path for both api and formula producers
- current formula-source baseline publishes on mount and explicit refresh using the shared runtime registry, but it does not yet implement the full dependency-indexed lazy invalidation model described below
- current `DataSourceController` baseline now exposes `DataSourceState` via `getState()` with legacy status fields such as `started`, `status`, `fetchStatus`, `stale`, `data`, `error`, `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`, and `failureReason`, and now also includes additive convenience fields such as `hasData`, `hasError`, `isInitialLoading`, `isRefreshing`, and `inFlightCount`; api sources drive fetch lifecycle while formula sources publish the same public contract with synchronous semantics
- current runtime baseline now also exposes explicit source refresh by id at the runtime boundary; refresh remains scope-scoped first, so duplicate source ids in different scopes do not collapse into one page-global namespace
- current `refreshSource` targets a registered source id through `targetId`; source refresh is built-in runtime-entry targeting rather than component-handle targeting
- current source runtime now has a dependency-aware invalidation baseline: formula sources automatically recompute and api sources automatically refresh when changed scope paths hit the dependencies collected from formula evaluation or request-config evaluation
- current invalidation also includes a self-target loop guard so a source does not immediately retrigger itself from writes to its own published `name` binding
- current action/runtime integration includes a built-in `refreshSource` action that targets a registered source id through `targetId` and delegates to the runtime-owned source registry refresh semantics; this is runtime-entry targeting, not component-handle dispatch

### Action Adapter Convergence Boundary

Current convergence baseline:

- `ActionRuntimeAdapter` is now the unified runtime invocation boundary for built-in, `component:<method>`, and namespaced actions.
- `reaction.actions` already reuses that boundary indirectly because reaction execution dispatches actions through `runtime.dispatch(...)`, and `flux-action-core` then routes final built-in/component/namespace invocation through `ActionRuntimeAdapter`.
- `type: 'source'` already reuses that same boundary for action-backed and api-backed execution bodies through `createSourceExecutor(...)->executeAction(...) -> runtime.dispatch(...) -> ActionRuntimeAdapter`.

Important distinction:

- The reusable execution body of a source or reaction can and should flow through action dispatch and the unified adapter boundary.
- But a `data-source` owner is not reducible to an ordinary action run. It still owns scheduling, polling, dedup/refresh policy, async governance, stale-result handling, publish-to-scope semantics, and scope disposal cleanup.

Normative rule:

- If a source/reaction concern is "execute this schema-authored action body", it should reuse `runtime.dispatch(...)` and therefore `ActionRuntimeAdapter`.
- If a concern is owner lifecycle orchestration (`data-source` refresh scheduling, request status state, polling loop, stale/drop semantics, scope-tree disposal), it remains in runtime-owned source/reaction controllers and should not be forced into `ActionRuntimeAdapter`.

This means the current architecture already has one unified action invocation boundary, but it intentionally does not collapse all runtime owner semantics into the adapter.

### Remaining Runtime Effect Seams

After the current convergence work, the remaining seams should be read in three buckets.

1. Already converged

- built-in / component / namespaced actions
- `reaction.actions`
- action-backed/api-backed `source` execution bodies

These all reach runtime through `runtime.dispatch(...)` and the unified `ActionRuntimeAdapter` boundary.

2. Intentionally owner-local

- `data-source` refresh orchestration
- polling, dedup, stale-drop, and async-governance state
- publish-to-scope and status publication
- scope-tree disposal / abort cleanup

These are runtime owner semantics, not missing action adapter coverage.

3. Candidate future host-boundary convergence

- data-source failure notifications
- reaction warning notifications
- any future non-action host navigation seam
- a possible request/audit interception layer above `env.fetcher(...)`

These are the realistic next places to evaluate if the project wants a broader effect channel. They should be treated as host/runtime side-effect seams, not as evidence that action-family invocation is still fragmented.

Current note:

- import failure reporting is now partially converged through a shared helper in `@nop-chaos/flux-core`, so runtime and react integration no longer hand-roll separate `notify + monitor` payload shapes
- remaining work in this area is no longer shape convergence, but deciding whether import failures should still be reported from two code locations or whether one owner should become the single semantic reporter
- data-source failure notifications and reaction fire-count-limit warning reporting now also share a thin runtime host-reporting helper, so the remaining notify/reporting gaps are narrower and more semantic than structural
- the `flux-action-core` `onSettled` branch fallback notify path remains the last obvious standalone reporting seam; host reporting shape is otherwise largely unified across runtime controllers and import setup paths

Recommended first hook:

- prefer an env decorator / adapter at the `SchemaRenderer` host boundary for `fetcher` / `notify` / `navigate` interception
- this pattern is already proven in the repo by debugger integration (`decorateEnv(env)` plus `runtime.setEnv(env)` when env identity changes)
- the repo now also has a shared low-level env decorator utility in `@nop-chaos/flux-core` so host-boundary wrappers no longer need to each reimplement basic `fetcher` / `notify` / `navigate` forwarding

This makes env decoration the most pragmatic first step for host-boundary observability or audit convergence.

However, env decoration is not a full replacement for runtime boundary design:

- it does not unify owner lifecycle semantics such as `data-source` polling or stale-drop
- it does not remove duplicate semantic reporting sites by itself; code may still need de-duplication about who emits import/data-source/reaction failure notifications
- it does not replace `ActionRuntimeAdapter`, which remains the action invocation boundary rather than the host wiring boundary

## SourceSchema

`type: 'source'` is the anonymous execution-backed value form.

It is used when a field needs a runtime-managed dynamic value but does not need named publication into scope.

`source` is modeled as an action-shaped execution descriptor whose result is consumed as a value rather than only as an effect.

## Linked Data Projection Into Form Owners

One common pattern is linked-data lookup inside a form owner.

Example shape:

1. user edits `companyId`
2. a request or data-source fetches company details
3. response data such as `companyName`, `taxCode`, or `creditRating` is projected into the same owner
4. projected values then participate in ordinary owner-local rendering, expressions, and validation

This is not a cross-owner dependency case.

It is an owner-local projection case.

Normative rules:

1. fetched values written back into the same owner become ordinary owner-local values
2. once projected, they participate in normal closure expansion and validation like any other owner-local path
3. projection writeback should be expressed through schema-configured action/data-source publication rather than hidden component side effects
4. if the fetched values are intended only for a different owner, they should be projected explicitly into that owner rather than read through cross-owner reactive dependency edges

Recommended config flow:

1. trigger request or data-source from the active owner
2. adapt response into the target value shape
3. publish the response into the current scope through configured action or data-source projection
4. let validation/runtime react to the projected values through normal owner-local dependency expansion

Illustrative schematic shape:

```json
{
  "type": "form",
  "body": [
    {
      "type": "input-text",
      "name": "companyId",
      "label": "Company ID"
    },
    {
      "type": "data-source",
      "name": "companyLookup",
      "action": "ajax",
      "args": {
        "url": "/api/company/${companyId}"
      },
      "mergeToScope": false
    },
    {
      "type": "note",
      "body": "Schematic step: consume companyLookup and project needed fields into current form scope through resultMapping / merge semantics"
    }
  ]
}
```

The projection step above is intentionally schematic.

This section does not define a new standalone action contract. It defines the architectural shape:

1. trigger request from schema through normal dependency-aware source refresh
2. publish fetched data into current owner scope through resultMapping / merge semantics
3. let owner-local validation react automatically

For stable built-in action authoring, follow `docs/architecture/action-scope-and-imports.md`.

Directionally, this covers the common “choose company -> fetch linked data -> project fields into current scope -> let dependent validation re-run” workflow.

The exact action names may evolve, but the architectural shape is stable:

1. schema-configured trigger
2. data-source or ajax execution
3. explicit projection into current owner scope
4. owner-local validation reacts automatically

Recommended publication shape for linked field writeback:

```json
{
  "type": "form",
  "body": [
    {
      "type": "input-text",
      "name": "companyId"
    },
    {
      "type": "data-source",
      "name": "companyLookup",
      "action": "ajax",
      "args": {
        "url": "/api/company/${companyId}"
      },
      "resultMapping": {
        "companyName": "${payload.name}",
        "taxCode": "${payload.taxCode}",
        "creditRating": "${payload.creditRating}"
      },
      "mergeToScope": true
    }
  ]
}
```

The point of this shape is:

1. fetched data is mapped into owner-local form fields
2. mapped fields become ordinary current-scope values
3. validation then reacts to `companyName`, `taxCode`, `creditRating`, and any dependents normally

This is different from binding a form field to `value: ${companyLookup.name}`.

For form controls, `name` identifies the field's stored owner-local value. Using both `name` and `value` to model long-lived linked-field writeback would blur the boundary between actual form state and temporary derived display state.

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
    "args": {
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
  resultMapping?: Record<string, SchemaValue>;
  statusPath?: string;
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
- `action`, `args`, `control`, `then`, `onError`, and `parallel` follow the same execution semantics used by action-backed sources
- `resultMapping`, when present, maps the fetched/produced payload into a target object shape before named publication or `mergeToScope`
- `name` is the normative author-visible identity and default publication path
- `mergeToScope: true` is the only narrowed special publish extension beyond the named publication path
- `statusPath`, when present, is the readonly status-summary path for loading/error/stale state
- `interval`, `stopWhen`, and publication controls remain `data-source`-specific extensions above plain `source`

### Refresh Dedup Semantics

For API-backed `data-source`, dependency invalidation, explicit `refreshSource`, and direct controller `refresh()` may all trigger a refresh while an earlier request is still in flight.

Normative rule:

- source-level refresh reentry must honor `control.dedup` / legacy `api.dedupStrategy` rather than hardcoding one internal policy for all sources

Current baseline semantics:

- `cancel-previous`
  - abort the active in-flight request and start the latest refresh
  - this remains the default behavior when no narrower override is configured
- `ignore-new`
  - keep the current in-flight request
  - ignore the newly triggered refresh
- `parallel`
  - allow the new refresh to start without aborting the current in-flight request
  - multiple in-flight source requests may therefore overlap

Lifecycle rule:

- regardless of dedup strategy, `stop()` and `reset()` must abort all in-flight requests owned by the source controller

Current async-governance baseline:

- API-backed `data-source` now also participates in a shared owner-level async governance substrate separate from request execution control
- each refresh gets a runtime-owned `runId`, `cause`, start/settle timestamps, and settle outcome metadata
- request abort still happens through source/request control, but late-settling old runs are additionally blocked by an owner-level publish gate
- in `parallel` mode, multiple requests may remain in flight, but only the current authoritative run may publish value/status updates; older late-settled runs are recorded as `stale-dropped`
- additive async diagnostics are exposed through source debug snapshots and `statusPath` summary metadata without changing the main author-visible publication contract

Design intent:

- request-runtime dedup describes transport-level overlap semantics for equivalent executable requests
- source refresh dedup describes source-controller behavior when the same named source is invalidated again before its prior refresh settles
- the two layers should stay aligned where possible, but source refresh policy remains runtime-owned source orchestration, not renderer-owned behavior

### Binding Target

`name` is the normative author-visible identity and default publication path.

The normative publication contract is:

- `name` is the authoritative default publication path
- `mergeToScope: true`, when present, adds an explicit shallow top-level object merge into the current scope

Example:

```text
scope[name] = sourceValue
```

Publication combinations:

| Configuration | Runtime target identity | Published path |
| --- | --- | --- |
| `name` only | `name` | `name` |
| `name` + `mergeToScope: true` | `name` | `name` plus shallow object-field merge into current scope |

The legacy AMIS-style behavior of publishing without an explicit binding target by merging into the current scope is non-normative and rejected because it causes namespace pollution, hides ownership, and makes collisions and debugging ambiguous. The only narrowed exception is explicit `mergeToScope: true` on a named `Resource`.

`mergeToScope: true` rules:

1. `name` remains the authoritative identity and default publication path
2. if `resultMapping` is present, runtime applies `resultMapping` first and uses the mapped object as the published value
3. if the published value is a plain object, runtime additionally shallow-merges its top-level fields into the current lexical scope
4. `resultMapping + mergeToScope: true` is the preferred shape for linked-data field projection into the current owner scope
5. the merged fields keep provenance from the source publication, but once merged into the current owner they are ordinary writable current-scope values unless some other schema rule makes them readonly
6. collisions with reserved projection names, active `Resource` targets, or ordinary scope data in the same owning lexical scope are invalid
7. if the published value is not object-like, `mergeToScope: true` is invalid and publication fails diagnostically

Current runtime compatibility note:

- current runtime now publishes `data-source` values through `name` first and accepts `name` in `refreshSource` / source-registry lookup
- legacy `id` targeting and legacy `dataPath` publication overrides remain supported as compatibility paths during convergence
- anonymous formula-backed resources may still fall back to runtime `id`; new schema should not rely on that compatibility path
- current runtime now applies `resultMapping` before normal publication for both api-backed and formula-backed `data-source` values

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

Current model:

1. when a producer declares dependency roots explicitly, runtime uses that declaration as authoritative
2. otherwise runtime collects dependency roots dynamically during evaluation
3. runtime fallback tracks lexical root bindings such as `user`, `filters`, or `row`, not deep member paths such as `user.name`
4. whole-scope enumeration or materialization degrades to wildcard

This model gives:

- lower runtime and compiler complexity than a static-plus-dynamic union model
- behavior aligned with lexical scope rather than deep object shape
- a clear escape hatch for advanced cases through an explicit producer-level declaration

The explicit dependency carrier is `dependsOn` on `data-source` / `reaction`, not on `ApiSchema`.

When an upstream root changes:

- dependent sources are marked dirty
- formula sources recompute according to the synchronous-before-reaction rule above when possible, otherwise lazily on next consumption or explicit refresh
- API sources invalidate and refresh according to source policy

For API-backed sources, "source policy" here includes refresh dedup behavior:

- `cancel-previous` means the latest invalidation supersedes the current request
- `ignore-new` means repeated invalidations collapse into the already-running request
- `parallel` means invalidations may overlap as concurrent in-flight source requests

Collection owners such as tables or loops should translate parent collection changes into row-local root changes so row consumers can depend on `row` or `record` instead of invalidating on the whole collection binding.

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

The current implementation shape is:

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
- current source `statusPath` summary preserves the legacy `started`, `loading`, `ready`, `stale`, and `error` fields and additionally publishes timing/failure metadata such as `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`, and `failureReason`; current baseline also adds optional convenience fields such as `hasData`, `hasError`, `isInitialLoading`, `isRefreshing`, and `inFlightCount`

Compatibility rule:

- when source state needs finer-grained loading semantics, add new fields rather than redefining or deleting existing `status`, `fetchStatus`, `loading`, or `ready` signals
- consumers may continue using legacy fields, while newer consumers may opt into the finer-grained additive fields

### Retry Ownership

Request retry remains owned by the enclosing consumer contract, not by `ApiSchema` itself.

- ajax actions use the action-level retry/control surface
- submit-form requests use the submit action/control surface
- data-source requests use the `DataSourceSchema` top-level action-style control surface
- async validation remains one-shot in the current baseline

Once those controls are resolved, request execution owns the actual retry/backoff loop for ajax, submit-form, and data-source fetches so request-backed work has one retry executor rather than overlapping dispatcher and request retries.

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
      "action": "ajax",
      "args": {
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
      "action": "ajax",
      "args": { "url": "/api/job/${jobId}/status" },
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
- runtime now also exposes a minimal source debug snapshot surface that reports registered source ids, scope ids, publication target/status paths, coarse runtime state, and current dependency snapshot when available
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

## Current Implementation Baseline

Current code already implements part of this model:

- API-backed `data-source` orchestration lives in `@nop-chaos/flux-runtime`
- `DataSourceRenderer` is already a `null` renderer that only wires lifecycle
- request execution, cache reads/writes, polling timers, stop-condition evaluation, and abort lifecycle are runtime-owned
- formula-backed and api-backed `data-source` values are unified under the same scope-scoped runtime source registry, with runtime-owned registration, replacement, refresh, and disposal
- explicit `dependsOn` roots are wired on both `data-source` and `reaction`; when absent, runtime still falls back to runtime-collected dependency roots from formula/request evaluation
- `resultMapping`, `statusPath`, named publication, `mergeToScope`, and runtime debug snapshots are all part of the current baseline and covered by focused runtime tests

Remaining compatibility-oriented gaps:

- anonymous formula-backed sources may still fall back to runtime `id` for compatibility; new schema should not rely on that path
- unnamed API-backed sources do not implicitly publish or merge when `name` is absent
- `mergeToScope` remains the only narrowed compatibility-style publish extension beyond the named publication path and should not be expanded into a parallel main contract
- dependency invalidation is already root-normalized, but runtime fallback still exists when `dependsOn` is absent
- richer debugger integration and advanced loop-depth diagnostics for `reaction` are still incomplete beyond the current debug snapshot plus bounded-fire safety rail

## ActionSchema.dataPath

- `ActionSchema.dataPath` controls where an ajax action result is written in page data
- This is distinct from DataSource `name`, which is the publication identity for scope binding

`ApiSchema` remains request description only. The write target belongs to the consumer context: action result target or source binding target.

## Related Documents

- `docs/architecture/frontend-programming-model.md` (normative Resource publication contract)
- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
