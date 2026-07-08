# flux Page/Dict Loading And Pre-Compile Transforms

> Status: active design doc
> Last Reviewed: 2026-07-06
> Owner: flux-runtime / flux-core
> Related: `renderer-runtime.md`, `module-cache-and-import-stack.md`, `flux-runtime-module-boundaries.md`, `api-data-source.md`

## Purpose

Define how flux loads remote schemas (`@page`) and dictionaries (`@dict`) from a nop-entropy backend, and how schemas are uniformly transformed (`xui:roles`, future `xui:` directives) **before** compilation. This is the contract any flux integrator (the playground, `nop-chaos-next`, future apps) implements against.

The design decouples two concerns that AMIS conflates in one fetcher pipeline:

1. **Loading** (`url → json`): resolve a URL to a raw schema or dict, via env-provided providers, with caching.
2. **Pre-processing** (`json → json`): a uniform transform applied to every schema right before it enters the compiler, regardless of how it was loaded.

## Background: Why flux Does Not Inherit AMIS's Pipeline

In `nop-chaos-next`, AMIS resolves `@dict` / `@page` / `@action` inside a central `handleSpecialRequest` (`packages/amis-core/src/core/ajaxSpecial.ts:8`) that runs **before** the HTTP fetcher (`packages/amis-core/src/core/ajax.ts:106`). Page loading also runs `transformPageJson` for `xui:roles` filtering, `xui:component` resolution, and amis-specific className injection (`packages/amis-core/src/page/transform.ts:42`).

The flux integration in `nop-chaos-next` does **not** share that pipeline. `createMainFluxEnv` (`apps/main/src/flux/adapter.ts:14`) passes `api.url` straight to `mainHttpClient.request`. A flux schema using `url: "@dict:user/role"` therefore sends an invalid literal HTTP request and fails. `fetchFluxPage` (`apps/main/src/flux/providers.ts:34`) likewise throws on any non-local path. Flux needs its own, contract-level mechanism.

## Two-Concern Model

```
                 Concern 1: LOADING (url → json)                Concern 2: PRE-COMPILE (json → json)
                 ────────────────────────────────               ─────────────────────────────────────
 integrator ──▶ loadFluxPage(path) ──▶ raw schema json ──▶  [beforeCompile plugins]  ──▶  compiler
 env hooks         loadDict(name)   ──▶ DictBean                 • xui:roles filter
 (pageProvider,    @dict: ajax dispatch (selects)               • (future xui: directives)
  dictProvider)                                              applies to ALL schemas, once,
 + global caches                                             regardless of source
```

- **Loading** is source-specific: `@page` goes through `PageProvider__getPage`; `@dict` goes through `DictProvider__getDict`. Each has its own cache. This is where URL dispatch and caching live.
- **Pre-compile** is source-agnostic: `xui:roles` filtering applies identically to a page loaded from the backend, an inline schema, or a `dynamic-renderer` fragment. It runs once, immediately before `runtime.schemaCompiler.compile(...)`, via the existing `RendererPlugin.beforeCompile` hook.

Decoupling them means roles filtering is implemented exactly once and cannot be bypassed by choosing a different load path.

## Contract: RendererEnv Additions

`RendererEnv` (`packages/flux-core/src/types/renderer-api.ts:63`) gains four optional hooks. All default to "not provided" so existing integrations keep working.

```ts
export interface FluxPageProvider {
  getPage(path: string, signal?: AbortSignal): Promise<FluxSchema>;
}

export interface FluxDictProvider {
  getDict(dictName: string, signal?: AbortSignal): Promise<DictBean>;
}

export interface DictBean {
  name: string;
  label?: string;
  locale?: string;
  valueType?: string;
  options: Array<{ label: string; value: string; code?: string; description?: string }>;
  // mirrors io.nop.api.core.beans.DictBean / DictOptionBean
}

export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  notify: ( ... ) => void;
  // ... existing fields ...

  /** Resolve a page path to a raw schema JSON. Backed by PageProvider__getPage in nop-entropy. */
  pageProvider?: FluxPageProvider;
  /** Resolve a dict name to a DictBean. Backed by DictProvider__getDict in nop-entropy. */
  dictProvider?: FluxDictProvider;
  /** Permission check for xui:roles filtering. Returns true when not provided (allow-all). */
  hasRole?(role: string): boolean;
  /** Current locale, used as a cache key for page/dict caches. Falls back to a default when absent. */
  locale?: string;
}
```

Why optional + provider-shaped (not a bare function for page/dict): mirroring AMIS's `AmisPageProvider` / `AmisDictProvider` (`packages/amis-core/src/types.ts:43,47`) keeps the integration boundary stable and lets the cache live flux-side, not integrator-side.

## Concern 1: Loading

### Page loader — `loadFluxPage(path, { env, signal })`

A flux utility (in `flux-runtime`) that integrators call instead of hand-rolling `fetchFluxPage`:

1. Resolve `path` via `env.pageProvider.getPage(path, signal)`. If `pageProvider` is absent, throw a clear error (the integrator must wire it for remote pages; local `.json`/mock stays the integrator's job, as today).
2. Cache the raw JSON in a **global page cache** (LRU, default 50 entries, key = `${locale}|${path}` — mirrors `apps/main/src/services/pageApi.ts:7`).
3. Return the cached clone. In-flight de-duplication (same key shares one promise) like `withPageCache`.

`loadFluxPage` returns **raw schema JSON**. It does **not** apply `xui:roles` — that is Concern 2's job, so it also covers inline and dynamically-loaded schemas.

### Dict loader — `loadDict(name, { env, signal })`

1. Resolve `name` via `env.dictProvider.getDict(name, signal)`.
2. Cache the **DictBean** in a **global dict cache with short TTL** (default 20s, key = `${locale}|${name}`). Short TTL reflects that dicts can be DB-maintained (`sys/xxx` in nop-sys-dao) and change without a redeploy.
3. Return the cached DictBean.

Rationale for dict TTL vs page LRU: dicts are smaller, higher-frequency, and more volatile; pages are larger, lower-frequency, and version-stable. AMIS caches neither client-side for dict (only server-side `ICache` in `DictProvider.java`, key `["dict", dictName, locale]`); flux adds a thin client TTL to avoid hammering `DictProvider__getDict` on every select render while still picking up backend edits quickly.

### `@dict:` ajax dispatch

The runtime installs a fetcher wrapper at `createRendererRuntime` time (`packages/flux-runtime/src/runtime-factory.ts:87`) that runs **before** `env.fetcher`:

```ts
// pseudo-code for the wrapper installed in runtime-factory
async function fluxFetcher(api, ctx) {
  const prefix = splitSpecialPrefix(api.url); // '@dict:user/role' → ['dict', 'user/role']
  if (prefix && prefix[0] === 'dict') {
    const dict = await loadDict(prefix[1], { env: ctx.env, signal: ctx.signal });
    return { status: 0, data: dict.options }; // select source expects the options array
  }
  return ctx.env.fetcher(api, ctx); // unchanged passthrough
}
```

- The dispatch returns `dict.options` (not the whole DictBean) so a `select` source works **without** `responseAdaptor`, matching AMIS where the dict helper extracts options for the consuming control. The provider and cache still hold the full DictBean (canonical shape).
- `splitSpecialPrefix` is the flux equivalent of AMIS's `splitPrefixUrl` (`packages/amis-core/src/core/url.ts:3`): split `@type:path` on the first `:`.
- Only `@dict:` is dispatched here. `@page:` is **not** an ajax URL in flux (see Non-Goals); page loading goes through `loadFluxPage`, not the fetcher.

### Caches

Both caches are **process-global singletons** inside `flux-runtime` (not per-runtime), so multiple `SchemaRenderer` instances share entries. API:

```ts
export function clearPageCache(): void;
export function clearDictCache(): void;
export function configurePageCache(opts: { max?: number }): void;
export function configureDictCache(opts: { ttlMs?: number }): void;
```

Integrators call `clearPageCache()` on logout / locale change. The locale segment of the key guarantees locale switches do not leak translated content across users.

## Concern 2: Pre-Compile (xui:roles)

`xui:roles` filtering is a `RendererPlugin.beforeCompile` plugin. flux already reduces `beforeCompile` over every schema right before compilation (`packages/flux-compiler/src/schema-compiler-helpers.ts:22`), so this needs no compiler changes.

flux provides a factory:

```ts
export function createXuiRolesPlugin(options: {
  hasRole?: (role: string) => boolean;
}): RendererPlugin {
  return {
    name: 'flux:xui-roles',
    beforeCompile(schema) {
      return hasRole ? filterByRoles(schema, hasRole) : schema; // allow-all when hasRole absent
    },
  };
}
```

- `filterByRoles` walks the schema object tree; any node with a truthy `xui:roles` array whose entries **all** fail `hasRole` is removed (set to `null`/pruned), mirroring AMIS `transformPageJson` (`packages/amis-core/src/page/transform.ts:49`): `if (roles.length > 0 && !roles.some(role => hasRole(role))) return null;`. The `xui:roles` key itself is stripped from surviving nodes.
- Registered by the integrator via `createRendererRuntime({ ..., plugins: [createXuiRolesPlugin({ hasRole: env.hasRole })] })`. Because `beforeCompile` only receives `schema`, the `hasRole` closure is captured at construction — the plugin and env are both owned by the integrator, so this is natural.
- **Why `beforeCompile` and not "after page load"**: `beforeCompile` covers every schema entry point (page-loaded, inline, `dynamic-renderer` fragment) in one place. Tying roles filtering to the page loader would leave inline / dynamic fragments unfiltered.

Flux does **not** adopt AMIS's other `transformPageJson` concerns (`xui:component` resolution, amis dialog/drawer className injection) — those are amis-specific and have no flux equivalent.

## Integration Contract (what an integrator wires)

For `nop-chaos-next`'s flux integration this means, in `apps/main/src/flux/`:

1. **`pageProvider`** — calls `@query:PageProvider__getPage` (or `/p/{path}`) like `fetchAmisPage` (`apps/main/src/services/pageApi.ts:74`).
2. **`dictProvider`** — calls `@query:DictProvider__getDict/static,options{value,label}` like `fetchDictOptions` (`apps/main/src/services/dictApi.ts:10`).
3. **`hasRole`** — reads the auth store's current roles (the same source AMIS uses via `adapter.hasRole`).
4. **`locale`** — from i18n.
5. **`plugins`** — `[createXuiRolesPlugin({ hasRole })]`.
6. Replace the bespoke `fetchFluxPage` with `loadFluxPage`; pass the env (with the four hooks) to `SchemaRenderer`.

After this, a flux schema with `"options": { "type": "source", "action": "ajax", "args": { "url": "@dict:user/role", "method": "get" } }` resolves through the dict cache and renders options without `responseAdaptor`.

## Rejected Alternatives

- **In-schema `@page:` dynamic sub-page renderer (AMIS-style).** Rejected. flux schemas compose via regions / templates / `schemaUrl`; there is no demand for a renderer that pulls a whole second page JSON at runtime. `@page` is the **loading chain** only. (If needed later it becomes a new renderer on top of `loadFluxPage`, not a change to this contract.)
- **roles filtering inside the page loader.** Rejected — would miss inline and dynamic fragments. `beforeCompile` is the single chokepoint.
- **per-runtime caches.** Rejected — pages and dicts are cross-instance shared resources; per-runtime caches re-fetch the same data and defeat the purpose.
- **dict cache without TTL (pure LRU like pages).** Rejected — dicts are DB-editable (`sys/xxx`); a long-lived cache hides backend changes. 20s TTL is the trade-off.
- **returning the full DictBean from `@dict:` dispatch.** Rejected — would force every `select` source to add `responseAdaptor: "payload.options"`. The dispatch adapts DictBean → options array once; the cache keeps the canonical DictBean.
- **implementing the special-URL dispatch inside `env.fetcher` per integrator.** Rejected — would duplicate AMIS's mistake of leaving flux without a shared pipeline. The dispatch belongs in the flux runtime, wrapping every fetcher.

## Affected Owner Docs

- `renderer-runtime.md` — `RendererEnv` gains `pageProvider` / `dictProvider` / `hasRole` / `locale`.
- `module-cache-and-import-stack.md` — global page/dict caches documented alongside the module cache.
- `flux-runtime-module-boundaries.md` — `loadFluxPage` / `loadDict` / `@dict:` dispatch live in `flux-runtime`; the roles plugin is a `RendererPlugin` consumed at runtime creation.
- `api-data-source.md` — cross-reference: `@dict:` is an ajax-URL dispatch, not a data-source.

## Reference: AMIS Comparison

| Aspect               | AMIS (`nop-chaos-next`)                                                | flux (this design)                                      |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------- |
| special-URL dispatch | `handleSpecialRequest` before fetcher                                  | fetcher wrapper in runtime-factory                      |
| dict load            | `dictProvider.getDict` → `DictProvider__getDict`                       | `loadDict` → `env.dictProvider.getDict` + TTL cache     |
| page load            | `pageProvider.getPage` → `PageProvider__getPage` + `transformPageJson` | `loadFluxPage` → `env.pageProvider.getPage` + LRU cache |
| roles filter         | inside `transformPageJson` (page-load only)                            | `beforeCompile` plugin (all schemas)                    |
| dict client cache    | none (server `ICache` only)                                            | 20s TTL client cache                                    |
| page client cache    | LRU 50, locale-keyed                                                   | LRU 50, locale-keyed (same)                             |
