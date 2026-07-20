# ApiSchema, Source, DataSource, and Reaction Design

## Purpose

This document defines:

- `ApiSchema` as the declarative HTTP request contract
- `SourceSchema` as the anonymous source carrier for runtime-managed value production
- `DataSourceSchema` as the named source-owner form in Flux
- `ReactionSchema` as the declarative side-effect watcher model paired with sources

`data-source` should not be treated as a special visual component category. It is a non-rendering named source declaration that publishes a derived value into the current scope.

Structural publication contract:

- `data-source.name` and `statusPath` are structural publication paths, not general runtime expressions
- these fields are read once at owner registration time and define where the source publishes value/status
- authoring must use literal structural paths; `${expr}` and template-like dynamic paths are invalid for these fields

Under this model:

- plain `${...}` expressions remain the preferred synchronous derived-value form
- `type: 'source'` is the anonymous source form used when a value channel needs runtime-managed production without named publication
- `type: 'data-source'` is the named source-owner form when publication, refresh, polling, or reuse semantics are needed
- source-enabled props (`allowSource`) are field-level entry points into that same anonymous source model rather than a third abstraction
- formula-backed and action-backed producers should follow the same source model rather than introducing parallel abstractions

This keeps Flux aligned with its role as a final DSL runtime: schema declares derived values, runtime owns source lifecycle, and React only hosts mount/subscription wiring rather than a second source semantic model.

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

| Field             | Type                     | Description                                  |
| ----------------- | ------------------------ | -------------------------------------------- |
| `url`             | `string`                 | Request URL (required)                       |
| `method`          | `string`                 | HTTP method (default: `get`)                 |
| `data`            | `SchemaValue`            | Request body data                            |
| `params`          | `SchemaValue`            | URL query parameters                         |
| `headers`         | `Record<string, string>` | Request headers                              |
| `includeScope`    | `'*' \| string[]`        | Auto-include scope variables in request data |
| `responseAdaptor` | `string`                 | Expression to transform response             |
| `requestAdaptor`  | `string`                 | Expression to transform request              |

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
type ApiFetcher = <T = unknown>(
  api: ExecutableApiRequest,
  ctx: ApiRequestContext,
) => Promise<ApiResponse<T>>;

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
- `executeApiSchema(...)` applies `responseAdaptor` to the fetcher payload first, and only then converts a non-OK response into a thrown error
- therefore runtime and renderer consumers observe successful adapted `data` or an exception

Recommended host behavior:

- either return `ok: true` responses for success
- or throw an `Error` for failures
- returning `ok: false` is still tolerated at the fetcher boundary, but request runtime will immediately convert it into a thrown error before the result reaches action/source/form consumers

#### Error response adaptor reachability (A1)

`responseAdaptor` runs for **both** OK and non-OK responses; it is not gated on `response.ok`.

- adaptor context on a non-OK response still exposes `payload` (the raw error body), `api`, and lexical `scope`, so an adaptor may normalize an error body or map a backend error field into a standard shape
- the adapted payload then feeds `createApiResponseError(...)`, so a message extracted by the adaptor is the message carried by the thrown error
- applying the adaptor on non-OK **never recovers** a non-OK response into success: after the adaptor runs, a non-OK response is still converted into a thrown error and `onError`/host notify still fire
- if the adaptor returns a non-object or does not surface a recognizable message field, the error falls back to the standard `Request failed with status <n>` message
- the adaptor is **not** required to be status-defensive: if the adaptor throws on an error-shaped payload (the common case for success-only adaptors written assuming a success shape, e.g. `return { ...payload, data: payload.data.items }` meeting an error body), the runtime catches that throw **on the error branch only** and falls back to the raw `response.data`, so `readResponseErrorMessage` (`message` → `msg` → `Request failed with status <n>`) still surfaces the backend message rather than degrading it into a generic adaptor/infra exception. The thrown error still carries a numeric `status` and `response`, so the single error→notify translation (A2) reports the backend message exactly once. The success branch is unaffected: a throwing adaptor on a success response still propagates as a normal execution failure.

#### Single error→notify translation (A2)

The runtime owns the only error→`env.notify` translation for ajax action failures.

- the default host fetcher does **not** call `env.notify(...)`; only the action dispatcher's unhandled-failure path reports the error, exactly once
- the thrown error message is extracted from the (adapted) response data with this priority: `data.message` (standard) → `data.msg` (amis-compatible backend convention) → `Request failed with status <n>`
- `statusPath`/`errors` structures are not mined for a notify message; only `message`/`msg` strings are used

### includeScope

`includeScope` controls automatic scope-variable injection into request data.

Merge rule:

```text
finalData = { ...extractScope(includeScope), ...data }
```

Explicit `data` keys win over extracted scope keys.

#### Route / Location Parameter Binding (A16)

Flux does **not** bind router/location/route parameters (such as `$route`, `$query`, `$params`, or `useParams`-style values) into page or surface scope. There is no router integration layer in the runtime: the only navigation surface is the `navigate` action, which forwards to `env.navigate(url, opts)` and performs no scope injection. Consequently there is no `$route`/`$query`/`$params` scope binding and no page/surface seeding from the URL.

This is adjudicated as a watch-only residual: route/location → scope binding is not applicable until an app/navigation layer exists. Isolation properties of such a binding cannot be evaluated until that prerequisite layer lands. See the successor record in the B2.2 plan (`docs/plans/2026-06-26-0406-2-b22-scope-propagation-isolation-reaction-plan.md`).

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

#### Array Parameter Serialization (A8)

Array-valued `params` are serialized as **repeated same-name keys**:

```text
{ "ids": [1, 2, 3] }  ->  /api?ids=1&ids=2&ids=3
```

Contract:

- both URL builders (`buildUrlWithParams` for first materialization, `canonicalizeUrlWithParams` for post-adaptor finalization) emit the identical repeated-key form, so the full `prepareApiRequestForExecution` pipeline never produces two coexisting forms (no `ids[]=` alongside a comma-joined `ids=1,2,3`)
- this intentionally diverges from the amis `bar[0]`/`bar[]` bracket default in favor of the more RESTful repeated-key form
- object-valued params continue to be JSON-stringified into a single key; primitive values use a single key
- there is no per-request override of the array serialization form; the form is a fixed runtime contract

#### Template Interpolation Boundary (A7)

- in every string field that the runtime evaluates as a template (`url`, `params` values, `data` values, `headers`), the literal sequence `${` is **always** the start of an interpolation expression; there is no escape syntax (no `\${`, no `$$`)
- an unmatched `${` (no closing `}` at brace depth 0) is treated as literal text, so such a string is preserved verbatim rather than producing a partial/empty interpolation
- this is an intentional known limitation, not a defect: `${` is reserved as the interpolation delimiter across the whole Flux DSL, and introducing a template-level escape is a language-wide feature (it would interact with every template string in the system) better scoped to a dedicated feature plan than to bug-driven cleanup
- `url` and `params` both reach the backend: template path segments evaluated in `url` and every `params` value are both materialized into the final executable URL, so authors should not assume only one of them carries dynamic values

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
- response adaptors currently receive the adapted fetch payload plus executable request context (`payload` / `response`, `api`, lexical `scope`, and the response `status`), but they do not receive a richer fetch-metadata object beyond those fields

#### Request Adaptor Shallow-Merge No-Op Contract (A5)

- when a request adaptor returns a **plain object**, the runtime shallow-merges it onto the current `ApiSchema` (`{ ...api, ...adapted }`), so a partial return such as `{ headers }` preserves `url` / `data` / `params` / other adaptors from the original schema while applying only the returned fields
- when a request adaptor returns a **non-object** (`undefined`, `null`, a primitive, or an array), the runtime treats it as a defined **no-op**: the original `ApiSchema` is returned unchanged
- there is no fall-through "use the return value as data" behavior; an adaptor that wants to change `data` must return an object containing a `data` field

#### Adaptor Abort Boundary (A4)

- a request adaptor **cannot abort or skip** a request; there is no sentinel return value and no throw-to-abort contract
- requests are only gated upstream by `sendOn` (and `initFetch` for the first automatic fetch). To conditionally prevent a request, author `sendOn` rather than trying to abort from inside an adaptor
- an adaptor that throws propagates the error as a normal request-execution failure (it does not silently cancel the request as if it were never sent)

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

三层关系：

1. **Action invocation（远程 effect 权限入口）**：作者可见的远程调用统一表达为 action，通常是 `{ action: "ajax", args: { url, method, ... } }`，最终进入 `runtime.dispatch(...)` → `ActionRuntimeAdapter`。这适用于 form submit、async validation、reaction actions、anonymous `source`，也适用于 `data-source` 的远程 producer 执行体。
2. **Resource / owner orchestration（值生产者生命周期）**：`data-source` 作为 `Resource` 仍然拥有 refresh、polling、dedup、stale/drop、status、publish-to-scope 和 scope disposal。它调度何时请求、如何接收结果、如何发布值，不被简化为一次普通 action run。
3. **ApiSchema（ajax action 内部）**：`ajax` action 的实现内部将 `args` 构造为 `ApiSchema` 格式，再走 `executeApiSchema(...)` → fetcher。这是 action 实现细节，不是 schema 层可见的概念。

被删除的内容：

- schema 上的 `api: ApiSchema` 属性（form、data-source、validation 等位置）。项目从未发布，不需要兼容层
- runtime 中 `submitApiCall(api)` 等绕过 action dispatch 的旁路
- async validation 中的 `{ kind: 'async', api: ApiSchema }` 变体

选择这个方向的原因：

- **统一远程 effect 入口**：提交、校验、数据源 producer、事件处理中的远程调用最终都走 action invocation / `ActionRuntimeAdapter` 这一条权限链路。拦截、日志、重试、幂等、超时可以在共享边界实现
- **统一扩展模型**：用户注册一个自定义 action 后，校验、提交、数据源 producer 都可以复用，不需要分别为校验写 plugin、为提交写 hook
- **本地/远程校验无差别**：`{ action: "customCheck" }` 内部是 JS 函数还是 HTTP 调用，对消费者透明
- **测试统一**：mock action dispatch 即可覆盖所有场景
- **概念模型更简单**：用户只需要理解 action 是 schema-authored command/effect 的统一入口，不需要同时理解 `api` 和 `action` 两套写法；但 `data-source` 仍是值生产 owner，不是普通 action 别名

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

### Schema-Fetch Cross-Subscriber Dedup And Cache (A11)

Schema-fetch (the `DynamicRenderer` `loadAction` path: `loadAction` → `runtime.dispatch(...)` → ajax action → `executeRuntimeAjaxAction` → `executeApiSchema`) participates in two runtime-owned layers that are **independent of owner-local source refresh dedup**:

- the ajax action path owns a runtime-level in-flight registry and reuses the same runtime `apiCache` used by `data-source` controllers
- engagement is opt-in per ajax action via `control.cacheTTL > 0` on a safe HTTP method (`get`/`head`/`options`, with `get` the default); non-safe methods (`post`/`put`/`patch`/`delete`) and actions without `cacheTTL` keep the original always-fetch behavior, so owner-local `cancel-previous`/`ignore-new`/`parallel` source refresh semantics are untouched

Dedup contract:

- the in-flight registry is keyed by **executable identity** (`method + url + headers + data`, the same identity produced by `generateCacheKey(...)`), **not** by owner/actionType/scope
- when a second subscriber fires a request whose executable identity is already in flight, it attaches to the in-flight promise instead of issuing a new fetch; when that promise settles, every attached subscriber receives the same result (success or error)
- the shared fetch is owned by the registry's own `AbortController`, decoupled from any single subscriber's signal, so one subscriber unmounting or aborting does not cancel the shared fetch for the others; the registry aborts pending shared fetches on runtime dispose
- this is distinct from owner-local source refresh dedup (`cancel-previous`/`ignore-new`/`parallel`), which still describes same-owner reentry and is not changed by this layer

Cache contract:

- when `control.cacheTTL > 0`, the ajax action path resolves the cache key via `resolveCacheKey(...)` (`control.cacheKey` if present, otherwise `generateCacheKey(...)`); a hit returns the cached adapted payload without issuing a fetch, and a miss writes the adapted payload back into `apiCache` after a successful settle
- the cache stores the **post-`responseAdaptor`** adapted data, consistent with what `data-source` controllers cache
- different executable identities (different url/data/headers/method) are never merged

Ownership boundary:

- the in-flight registry and `apiCache` are runtime-owned (created in the runtime factory, disposed with the runtime) and are threaded into the ajax action helpers; they do not live on `ScopeRef` and do not pollute the lexical scope contract

### Required Request Execution Flow

`executeApiSchema(...)` should be the single convergence path for request execution from declarative `ApiSchema` to fetcher-facing `ExecutableApiRequest`.

The required flow is:

1. Evaluate dynamic request config in the current scope
2. Extract and merge `includeScope` into request data
3. Build the final URL with `params`
4. Apply `requestAdaptor`
5. Execute through runtime-managed fetch / abort / dedup / cache coordination
6. Apply `responseAdaptor` to the fetcher payload (for both OK and non-OK responses; on non-OK the adapted payload feeds the error message but does not recover success; if the adaptor throws on the non-OK branch the runtime falls back to the raw payload so the backend message is not lost — see A1)
7. If the fetcher result is non-OK, throw an error whose message is `data.message ?? data.msg ?? "Request failed with status <n>"` (read from the adapted payload, or the raw payload when the adaptor threw)
8. Return the adapted payload to the caller

Current baseline note:

- `executeApiSchema(...)` now owns the main request convergence path behind ajax action invocation, including form submit, validation, reaction/source action bodies, and data-source producer requests
- `data-source` now preserves top-level schema `retry` through compile-time `CompiledOperationControl.retry` into runtime source execution, so source-backed ajax refresh uses the same retry/backoff contract as request-backed actions
- callers may still pass declarative request objects; `executeApiSchema(...)` evaluates those values in scope before canonical request preparation so request execution semantics stay unified across actions, forms, validation, and data-sources
- request preparation is split into explicit helpers, but the runtime now converges those helpers into one canonical executable request shape before fetch
- dedup and runtime-local cache coordination are keyed by that final executable request semantics rather than only by the original declarative `ApiSchema`
- executable request canonicalization normalizes `params` into the final URL and removes `params` from the fetcher-facing request object so equivalent `url + params` forms share the same identity
- request-side `OperationControl.timeout` is now enforced by `executeRequestWithControl(...)`; timeout composes with the parent abort signal, retries rerun fresh timed attempts, and the final timeout surfaces as a `TimeoutError` instead of a silent hang
- default cache identity now keeps bounded stringify cost limits without accepting silent collisions: when request `data` or `headers` exceed the stringify depth/node budget, cache-key generation appends a collision-resistant digest rather than aliasing on the raw sentinel alone
- adaptor expressions and object-shaped runtime values are now cached by source/object identity on the hot path so repeated dispatch/request execution avoids ad hoc recompilation where schema identity is stable
- ajax-side API monitor callbacks should observe the final executable request shape, not the pre-canonical declarative request object, so diagnostics line up with what fetch/dedup/cache actually execute
- current source-runtime baseline now includes a runtime-owned source registry scoped by `ScopeRef.id`; `DataSourceRenderer` only registers/disposes entries while runtime owns controller start/stop and replacement semantics
- current `DataSourceSchema` baseline now supports both action-backed (via `action: "ajax"`) and `formula` producers under the same runtime-owned registration path
- formula `data-source` uses `name` as the normative publication path for both api and formula producers
- current formula-source baseline publishes on mount and explicit refresh using the shared runtime registry, but it does not yet implement the full dependency-indexed lazy invalidation model described below
- current `DataSourceController` baseline now exposes `DataSourceState` via `getState()` with legacy status fields such as `started`, `status`, `fetchStatus`, `stale`, `data`, `error`, `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`, and `failureReason`, and now also includes additive convenience fields such as `hasData`, `hasError`, `isInitialLoading`, `isRefreshing`, and `inFlightCount`; action-backed remote sources drive fetch lifecycle while formula sources publish the same public contract with synchronous semantics
- when a formula-source startup failure is adapted into `failureReason`, non-`Error` payloads must stay reachable through `Error.cause` rather than being flattened into `String(error)` only; `error` may still preserve the raw thrown payload alongside that normalized diagnostic error
- current runtime baseline now also exposes explicit source refresh by id at the runtime boundary; refresh remains scope-scoped first, so duplicate source ids in different scopes do not collapse into one page-global namespace
- current `refreshSource` targets a registered source id through `targetId`; source refresh is built-in runtime-entry targeting rather than component-handle targeting
- current source runtime now has a dependency-aware invalidation baseline: formula sources automatically recompute and action-backed remote sources automatically refresh when changed scope paths hit the dependencies collected from formula evaluation or request-config evaluation
- current invalidation also includes a self-target loop guard so a source does not immediately retrigger itself from writes to its own published `name` binding
- current action/runtime integration includes a built-in `refreshSource` action that targets a registered source id through `targetId` and delegates to the runtime-owned source registry refresh semantics; this is runtime-entry targeting, not component-handle dispatch

#### Per-Runtime-Instance Namespace (A15)

- each `createRendererRuntime(...)` call produces an independent runtime instance with its own `runtimeId`, its own source registry, reaction registry, and component-handle registry (all held in closure-local refs, not in any shared page-global bag)
- therefore two co-mounted Flux runtimes (for example two independent host roots on the same page) are fully isolated: a `refreshSource` action, a `component:refresh` capability, or any component-handle invocation in one runtime only ever targets sources/handles registered in **that same runtime instance**
- two runtimes may register sources with the same `name`/`id` without colliding, because lookup is namespaced by runtime instance first and then by `ScopeRef.id`
- this is why `refreshSource` is scope-scoped first within a runtime, but the runtime instance is the outer isolation boundary across co-mounted roots

### Action Adapter Convergence Boundary

Current convergence baseline:

- `ActionRuntimeAdapter` is now the unified runtime invocation boundary for built-in, `component:<method>`, and namespaced actions.
- `reaction.actions` already reuses that boundary indirectly because reaction execution dispatches actions through `runtime.dispatch(...)`, and `flux-action-core` then routes final built-in/component/namespace invocation through `ActionRuntimeAdapter`.
- action-backed `type: 'source'` bodies already reuse that same boundary through `createSourceExecutor(...)->executeAction(...) -> runtime.dispatch(...) -> ActionRuntimeAdapter`.
- Architecture target: action-backed remote `data-source` producer requests should also enter the same ajax action / `ActionRuntimeAdapter` invocation boundary; the source controller remains the owner of scheduling and publication around that invocation.

Current implementation note:

- live action-backed producer refresh already executes through `runtime.dispatch(...)` and therefore reuses `ActionRuntimeAdapter`; the source controller still owns scheduling, publication, async governance, and stale-result handling around that invocation.

Important distinction:

- The reusable execution body of a source or reaction can and should flow through action dispatch and the unified adapter boundary.
- But a `data-source` owner is not reducible to an ordinary action run. It still owns scheduling, polling, dedup/refresh policy, async governance, stale-result handling, publish-to-scope semantics, and scope disposal cleanup.

Normative rule:

- If a source/reaction concern is "execute this schema-authored action body" or "perform this remote producer request", it should reuse `runtime.dispatch(...)` / ajax action invocation and therefore `ActionRuntimeAdapter`.
- If a concern is owner lifecycle orchestration (`data-source` refresh scheduling, request status state, polling loop, stale/drop semantics, scope-tree disposal), it remains in runtime-owned source/reaction controllers and should not be forced into `ActionRuntimeAdapter`.

This means the current architecture already has one unified action invocation boundary, but it intentionally does not collapse all runtime owner semantics into the adapter.

### Remaining Runtime Effect Seams

After the current convergence work, the remaining seams should be read in three buckets.

1. Already converged

- built-in / component / namespaced actions
- `reaction.actions`
- action-backed remote `source` execution bodies
- target-state action-backed remote `data-source` producer requests

These should all reach runtime through `runtime.dispatch(...)` and the unified `ActionRuntimeAdapter` boundary. Live code has this for actions, reactions, and anonymous sources; action-backed remote `data-source` refresh still needs the remaining adapter-entry cleanup while preserving owner-local lifecycle semantics.

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

`type: 'source'` is the anonymous source carrier.

It is used when a field or local value channel needs runtime-managed value production but does not need named publication into scope.

It is the unnamed counterpart to `data-source`:

- it may be formula-backed or action-backed
- when action-backed remote work is needed, the producer should normally be `action: "ajax"` with `args` carrying the `ApiSchema`-shaped transport fields
- its result is consumed as a value rather than published as a named scope binding
- field metadata such as `allowSource` decides which renderer props may accept this carrier shape

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
interface SourceSchema extends SourceActionSchema {
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
  dependsOn?: string[];
  initialData?: SchemaValue;
  mergeStrategy?: 'replace' | 'append' | 'prepend' | 'merge' | 'upsert';
  mergeKey?: string;
  sendOn?: string;
}

interface FormulaDataSourceSchema extends BaseDataSourceSchema, ActionShapeFields {
  formula: SchemaValue;
  action?: never;
}

interface ActionDataSourceSchema extends BaseDataSourceSchema, SourceActionSchema {
  action: string;
  args?: Record<string, SchemaValue>;
  /** Polling interval in ms, or `{ base, jitter? }` for jittered polling.
   * `base` is the target interval; `jitter` is a max random offset (±) applied
   * per cycle. Example: `{ base: 5000, jitter: 1000 }` polls every 5s ± up to 1s. */
  interval?: number | { base: number; jitter?: number };
  stopWhen?: string;
  silent?: boolean;
  initFetch?: boolean;
  onSuccess?: ActionSchema | ActionSchema[];
  onError?: ActionSchema | ActionSchema[];
}

type DataSourceSchema = FormulaDataSourceSchema | ActionDataSourceSchema;
```

Rules:

- `data-source` extends the same producer contract used by anonymous `source`, but adds named publication and owner lifecycle controls
- producer body is either `formula` or `action`/`args`; remote transport is normally expressed as `action: "ajax"`
- action-backed producers reuse the same execution semantics used by action-backed anonymous sources
- `resultMapping`, when present, maps the fetched/produced payload into a target object shape before named publication or `mergeToScope`
- `name` is the normative author-visible identity and default publication path
- `mergeToScope: true` is the only narrowed special publish extension beyond the named publication path
- `statusPath`, when present, is the readonly status-summary path for loading/error/stale state
- `interval`, `stopWhen`, and publication controls remain `data-source`-specific extensions above plain `source`

### Request Orchestration Fields (X4)

`data-source` has request orchestration fields that control **when** to send requests and **what to do after**. These are distinct from `ApiSchema` (which controls **how** to send the HTTP request) and `control` (which controls **how to handle failures**).

| Layer                     | Fields                                                    | Responsibility                          | Consumer                 |
| ------------------------- | --------------------------------------------------------- | --------------------------------------- | ------------------------ |
| **Request Orchestration** | `sendOn`, `initFetch`, `onSuccess`, `onError`             | When to send requests, what to do after | DataSourceController     |
| **Operation Control**     | `control: { dedup, retry, throttle, cacheTTL, cacheKey }` | How to handle failures, dedup strategy  | DataSourceController     |
| **HTTP Configuration**    | `args: ApiSchema { url, method, data, params, headers }`  | How to send the HTTP request            | action runtime → fetcher |

Example with all three layers:

```json
{
  "type": "data-source",
  "name": "userData",
  "action": "ajax",
  "sendOn": "featureFlag === true",
  "initFetch": false,
  "onSuccess": { "action": "setValue", "args": { "path": "lastFetchTime", "value": "${now}" } },
  "onError": { "action": "toast", "args": { "msg": "Fetch failed", "level": "error" } },
  "args": {
    "url": "/api/users",
    "method": "GET",
    "params": { "page": "${page}" }
  },
  "control": { "retry": { "times": 3 }, "dedup": "cancel-previous" }
}
```

Key design decisions:

- `sendOn` is a universal gate: any request (initial fetch, manual refresh, interval poll) must pass the sendOn check before being sent. `initFetch` only controls whether to automatically trigger the first fetch, not whether to bypass sendOn.
- `onSuccess`/`onError` are fire-and-forget dispatch: consistent with Flux action system semantics, results are not awaited.
- `ApiSchema` does not gain `sendOn`/`initFetch` fields: these are request orchestration properties, not HTTP configuration.
- `sendOn` is placed on `BaseDataSourceSchema` (not `ActionDataSourceSchema`) because it has semantic meaning for both action and formula sources (though formula sources ignore it at runtime since they have no request concept).

### Refresh Dedup Semantics

For action-backed remote `data-source`, dependency invalidation, explicit `refreshSource`, and direct controller `refresh()` may all trigger a refresh while an earlier request is still in flight.

Normative rule:

- source-level refresh reentry must honor `control.dedup` rather than hardcoding one internal policy for all sources

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

- action-backed remote `data-source` now also participates in a shared owner-level async governance substrate separate from request execution control
- each refresh gets a runtime-owned `runId`, `cause`, start/settle timestamps, and settle outcome metadata
- request abort still happens through source/request control, but late-settling old runs are additionally blocked by an owner-level publish gate
- in `parallel` mode, multiple requests may remain in flight, but only the current authoritative run may publish value/status updates; older late-settled runs are recorded as `stale-dropped`
- additive async diagnostics are exposed through source debug snapshots and `statusPath` summary metadata without changing the main author-visible publication contract
- stopped or reset controllers do not remain in a fake `started + stopped` state: `stop()` clears `started`, `reset()` returns the controller to the initial idle/not-started baseline, and a later `start()` or direct `refresh()` re-activates the controller under the same restartable contract
- reaction-triggered action dispatch and form-targeted submit through component handles now preserve `AbortSignal` end to end, so dispose / parent cancellation can abort both direct current-form submit and indirect `component:submit` execution paths

Design intent:

- request-runtime dedup describes transport-level overlap semantics for equivalent executable requests
- source refresh dedup describes source-controller behavior when the same named source is invalidated again before its prior refresh settles
- the two layers should stay aligned where possible, but source refresh policy remains runtime-owned source orchestration, not renderer-owned behavior

### Component Capabilities and Lifecycle Events

`data-source` exposes component handles and lifecycle events through the standard Flux component capability system.

#### Refresh Mechanisms (Two Coexisting)

| Mechanism                      | Addressing                  | Semantics                     | Use Case                              |
| ------------------------------ | --------------------------- | ----------------------------- | ------------------------------------- |
| `refreshSource` action         | By `targetId` (source name) | runtime-owned action API      | Cross-source refresh in action flows  |
| `component:refresh` capability | By ComponentHandle id       | component capability contract | Interactive triggers (button onClick) |

Both coexist and are not interchangeable. `component:refresh` returns `{ skipped: boolean }`, reflecting whether the sendOn gate suppressed the request.

#### Component Handles

| Handle    | Method              | Description                                                                |
| --------- | ------------------- | -------------------------------------------------------------------------- |
| `refresh` | `invoke('refresh')` | Trigger manual refresh, passes sendOn gate, returns `{ skipped: boolean }` |
| `cancel`  | `invoke('cancel')`  | Cancel in-flight request, `statusPath` set to idle                         |

#### Lifecycle Events

| Event       | Trigger                                      | Payload                   |
| ----------- | -------------------------------------------- | ------------------------- |
| `onSuccess` | After successful fetch (including cache hit) | `{ data, dataUpdatedAt }` |
| `onError`   | After failed fetch (including abort/cancel)  | `{ error, failureCount }` |

Events are fire-and-forget dispatch, consistent with Flux action system semantics.

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

| Configuration                 | Runtime target identity | Published path                                            |
| ----------------------------- | ----------------------- | --------------------------------------------------------- |
| `name` only                   | `name`                  | `name`                                                    |
| `name` + `mergeToScope: true` | `name`                  | `name` plus shallow object-field merge into current scope |

The legacy AMIS-style behavior of publishing without an explicit binding target by merging into the current scope is non-normative and rejected because it causes namespace pollution, hides ownership, and makes collisions and debugging ambiguous. The only narrowed exception is explicit `mergeToScope: true` on a named `Resource`.

`mergeToScope: true` rules:

1. `name` remains the authoritative identity and default publication path
2. if `resultMapping` is present, runtime applies `resultMapping` first and uses the mapped object as the published value
3. if the published value is a plain object, runtime additionally shallow-merges its top-level fields into the current lexical scope
4. `resultMapping + mergeToScope: true` is the preferred shape for linked-data field projection into the current owner scope
5. the merged fields keep provenance from the source publication, but once merged into the current owner they are ordinary writable current-scope values unless some other schema rule makes them readonly
6. collisions with reserved projection names, active `Resource` targets, or ordinary scope data in the same owning lexical scope are invalid
7. if the published value is not object-like, runtime skips the shallow merge and still keeps the named publication path; new schema should treat `mergeToScope: true` as object-oriented authoring rather than relying on non-object merge behavior

Current runtime compatibility note:

- current runtime publishes `data-source` values through `name` first and refresh lookup targets that canonical `name`
- legacy `dataPath` publication overrides remain supported as compatibility paths during convergence
- anonymous formula-backed resources may still fall back to runtime `id`; new schema should not rely on that compatibility path
- current runtime now applies `resultMapping` before normal publication for both action-backed and formula-backed `data-source` values

`initialData` seeds the source target before the first real evaluation or fetch begins.

When `statusPath` is present, the source may additionally publish a readonly summary DTO containing fields such as `loading`, `ready`, `stale`, `error`, `optimisticPending`, and `canRollback`.

### Producer Kinds

#### Formula source

A formula source is a synchronous derived value producer.

- input: current scope plus a formula expression
- producer: runtime value evaluation with dependency tracking
- output: current derived value, either consumed locally (`source`) or published by name (`data-source`)
- mental model: computed value owned by runtime rather than by React component state

#### Action-backed source

An action-backed source is an execution-backed derived value.

- input: current scope plus an `ActionSchema`-shaped producer body
- producer: runtime-managed action invocation consumed as a value; remote producer requests target the `ajax` action / `ActionRuntimeAdapter` path
- output: resolved action result consumed locally (`source`) or written to the explicit published binding path (`data-source`)
- mental model: async computed/source ref

Its semantics should be:

- dependencies come from expressions used by the producer config
- dependency changes invalidate the source and trigger refresh according to source policy
- runtime owns loading, error, cache, dedup, abort, and polling behavior

`interval` and `stopWhen` remain `data-source` owner controls for action-backed producers.

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
- action-backed remote sources invalidate and refresh according to source policy

For action-backed remote sources, "source policy" here includes refresh dedup behavior:

- `cancel-previous` means the latest invalidation supersedes the current request
- `ignore-new` means repeated invalidations collapse into the already-running request
- `parallel` means invalidations may overlap as concurrent in-flight source requests

Collection owners such as tables or loops should translate parent collection changes into row-local root changes so row consumers can depend on `row` or `record` instead of invalidating on the whole collection binding.

The runtime goal is targeted invalidation, not eager full-tree re-evaluation.

### Runtime Ownership

`data-source` stays runtime-owned, not renderer-owned.

Required boundary:

- `DataSourceRenderer` remains a `null` renderer
- React only wires lifecycle and subscriptions
- runtime owns source registration, source invalidation, request control, polling, abort, and cache coordination
- React-side helpers for source-enabled props must stay thin host wiring over that same runtime-owned source substrate rather than becoming a second controller family

The intended end state is a runtime-local source registry where formula and action-backed producers share the same conceptual lifecycle model.

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
- action-backed remote sources also have runtime status such as loading / error / stale
- UI should choose how to observe and present those states rather than forcing a built-in widget into the source abstraction
- if schema needs author-visible source status, the preferred cross-runtime contract is explicit `statusPath`
- `statusPath` is readonly runtime summary data, not a second authoritative business value
- narrower subsystems may still project additional summary values, but they must not replace the core `statusPath` contract with implicit hidden sibling paths
- for anonymous `source` consumed through `allowSource`, the equivalent narrow UI-facing state may be surfaced through the companion prop named by `sourceStateKey`

Contract layering rule for `statusPath`:

- canonical core state is the owner-defined source snapshot: `status`, `fetchStatus`, `stale`, `data`, `error`, `dataUpdatedAt`, `errorUpdatedAt`, `failureCount`, `failureReason`
- `failureReason` is the normalized diagnostics-facing `Error` surface; if the underlying failure payload was not already an `Error`, runtime should preserve the original payload on `failureReason.cause`
- derived convenience projection may add helper booleans derived from that core state, such as `hasData`, `hasError`, `isInitialLoading`, `isRefreshing`, and `inFlightCount`
- compatibility aliases such as older summary vocabulary must be treated separately from derived helpers; they are not part of the preferred long-term contract just because they are also additive

Normative guidance:

- docs and new examples should describe the canonical core state first
- convenience fields are acceptable when they are explicitly documented as derived helpers over the canonical state
- compatibility-only status vocabulary should not be presented as a co-equal peer of the canonical state surface

#### Polling Loading Semantics (A9)

Every request kind (initial fetch, manual `refresh()`, and `interval`-driven poll) flips the umbrella `loading` boolean while in flight, because `loading` is derived as `inFlightCount > 0 || fetchStatus === 'fetching'` and every request bumps `inFlightCount`. Polling does **not** receive a separate "silent" loading treatment.

To distinguish a background poll/refresh from a blocking initial load, consumers should key off the derived subdivision fields rather than `loading` alone:

- `isInitialLoading` (`loading && !hasData`): true only on the first load when there is no data yet — bind a full-screen blocker to this
- `isRefreshing` (`loading && hasData`): true while a request is in flight but data is already present — bind a lightweight refresh indicator to this
- `hasData`: whether a value has already been published

So a poll that fires after data exists flips `isRefreshing` (not `isInitialLoading`); consumers that want to avoid poll flicker should drive the full-screen chrome from `isInitialLoading`, not from the umbrella `loading`.

Decision record: the lean signal wording suggested "poll flips isRefreshing, not loading". The current baseline was adjudicated as-is (documented current behavior) rather than reworked, because `loading`, `inFlightCount`, and `isRefreshing` are coupled inside the single `deriveDataSourceState` derivation that is applied on every controller state update and consumed by async-governance, refresh-dedup, and the status-contract tests. Making `loading` stay false while `isRefreshing` is true would require decoupling that shared derivation across multiple controllers and their focused regression suites, which is disproportionate to a UX-polish signal. The `isInitialLoading` / `isRefreshing` subdivision already delivers the no-flicker UX when consumers bind to it correctly.

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

#### Action-backed remote source with explicit binding

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

#### Polling action-backed remote source

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

#### Conditional fetch with lifecycle events

```json
{
  "type": "container",
  "body": [
    {
      "type": "data-source",
      "name": "userProfile",
      "action": "ajax",
      "sendOn": "userId != null",
      "initFetch": false,
      "args": { "url": "/api/users/${userId}" },
      "onSuccess": { "action": "console.log", "args": { "msg": "Profile loaded" } },
      "onError": {
        "action": "toast",
        "args": { "msg": "Failed to load profile", "level": "error" }
      }
    },
    {
      "type": "button",
      "label": "Refresh Profile",
      "onClick": { "action": "component:refresh", "componentId": "userProfile" }
    }
  ]
}
```

In this example:

- `sendOn: "userId != null"` prevents fetch when no user is selected
- `initFetch: false` prevents automatic fetch on mount
- `component:refresh` on button click triggers manual refresh (still passes sendOn gate)
- `onSuccess`/`onError` dispatch actions after fetch completes

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

| Field       | Type           | Description                                                                   |
| ----------- | -------------- | ----------------------------------------------------------------------------- |
| `watch`     | `SchemaValue`  | Expression or value node to observe                                           |
| `when`      | `string`       | Optional guard expression evaluated against current and previous watch values |
| `immediate` | `boolean`      | Whether to evaluate and potentially fire immediately on mount                 |
| `debounce`  | `number`       | Optional debounce delay before action dispatch                                |
| `once`      | `boolean`      | Auto-dispose after the first successful trigger                               |
| `actions`   | `ActionSchema` | Root action object to dispatch when triggered                                 |

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
- action-backed remote sources

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

- action-backed remote `data-source` orchestration lives in `@nop-chaos/flux-runtime`
- `DataSourceRenderer` is already a `null` renderer that only wires lifecycle
- request execution, cache reads/writes, polling timers, stop-condition evaluation, and abort lifecycle are runtime-owned
- formula-backed and action-backed `data-source` values are unified under the same scope-scoped runtime source registry, with runtime-owned registration, replacement, refresh, and disposal
- explicit `dependsOn` roots are wired on both `data-source` and `reaction`; when absent, runtime still falls back to runtime-collected dependency roots from formula/request evaluation
- `resultMapping`, `statusPath`, named publication, `mergeToScope`, and runtime debug snapshots are all part of the current baseline and covered by focused runtime tests

Remaining compatibility-oriented gaps:

- anonymous formula-backed sources may still fall back to runtime `id` for compatibility; new schema should not rely on that path
- unnamed action-backed sources do not implicitly publish or merge when `name` is absent
- `mergeToScope` remains the only narrowed compatibility-style publish extension beyond the named publication path and should not be expanded into a parallel main contract
- dependency invalidation is already root-normalized, but runtime fallback still exists when `dependsOn` is absent
- richer debugger integration and advanced loop-depth diagnostics for `reaction` are still incomplete beyond the current debug snapshot plus bounded-fire safety rail
- retained cascade guards are now owner-local: reaction cascade depth is owned by one reaction registry instance, and source cascade depth is owned by one source registry instance, rather than by module-global mutable counters shared across runtimes
- retained degraded async-data paths now use the runtime host-reporting seam: reaction/source cascade-limit failures and formula-source publish failures report through `reportRuntimeHostIssue(...)` so `env.notify(...)` and `env.monitor?.onError?.(...)` can observe them instead of relying on console-only visibility

## Action Write Targeting Boundary

- Action write targeting now uses the write-action DTOs under `args.path` (`setValue`) and `args.path + args.values` (`setValues`)
- This is distinct from DataSource `name`, which is the publication identity for scope binding
- Legacy `DataSourceSchema.dataPath` compatibility wording is a separate source-publication concern and is not part of the current action contract

`ApiSchema` remains request description only. If an ajax result should be published into scope state, do that through an explicit follow-up action such as `setValue` or `setValues` rather than an ajax-local top-level write-target field.

## Related Documents

- `docs/architecture/frontend-programming-model.md` (normative Resource publication contract)
- `docs/references/renderer-interfaces.md`
- `docs/references/terminology.md`
- `docs/architecture/flux-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/action-scope-and-imports.md`
