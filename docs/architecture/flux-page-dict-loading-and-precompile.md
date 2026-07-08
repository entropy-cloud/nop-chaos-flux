# flux Page/Dict Loading

> Status: active design doc
> Last Reviewed: 2026-07-08
> Owner: flux-core / flux-renderers-form
> Related: `renderer-runtime.md`, `flux-runtime-module-boundaries.md`

## Purpose

Define how flux loads remote schemas and dictionaries. flux is a frontend framework — it defines **interfaces and extension points** only. The application (playground, nop-chaos-next, future apps) provides concrete implementations: URL resolution, caching, role filtering.

## Design Principle

flux does **not** own loading strategy. It owns:

- `RendererEnv.loadDict?: (name, signal?) => Promise<DictBean>` — flat function
- `RendererEnv.loadPage?: (path, signal?) => Promise<SchemaInput>` — flat function
- `DictBean` interface — defines the return shape

The application owns:

- Which URL to call (GraphQL, REST, local JSON)
- Caching strategy (LRU, TTL, none)
- Role filtering (`xui:roles`)
- `hasRole` implementation

This replaces the earlier `FluxPageProvider` / `FluxDictProvider` provider-object interfaces and the flux-runtime-level caches + `@dict:` URL dispatch (Plan 451, now superseded).

## Contract: RendererEnv

```ts
export interface DictBean {
  name: string;
  label?: string;
  options: Array<{ label: string; value: string; code?: string; description?: string }>;
}

export interface RendererEnv extends ExpressionExecutionEnv {
  fetcher: ApiFetcher;
  notify: ( ... ) => void;
  // ... existing fields ...

  loadPage?: (path: string, signal?: AbortSignal) => Promise<SchemaInput>;
  loadDict?: (name: string, signal?: AbortSignal) => Promise<DictBean>;
  hasRole?(role: string): boolean;
  locale?: string;
}
```

All `env` properties are set once at application startup and never change during rendering.

## select `dict` Property

Select renderer supports a declarative `dict: "role"` property:

```json
{ "type": "select", "name": "role", "label": "Role", "dict": "role" }
```

When `dict` is set, the select renderer calls `env.loadDict(dictName)` via `useRendererEnv()`, maps `DictBean.options` to select options, and renders them. When `env.loadDict` is absent, the renderer warns and falls back to `props.props.options`. The `dict` property takes priority over `options` when both are present.

This replaces the earlier `@dict:` URL dispatch pattern (`source: { type: "source", api: { url: "@dict:role" } }`), which is no longer supported.

## Application Integration

Each application provides `loadDict` / `loadPage` implementations:

### Playground (mock)

Inline mock data, no caching:

```ts
loadDict: async (name) => ({
  name,
  options: MOCK_DICTS[name] ?? [],
});
```

### nop-chaos-next (production)

GraphQL + LRU/TTL cache (migration from the removed flux-runtime caches):

```ts
loadPage: (path, signal) => loadFluxPage(path, signal),  // wraps fetchFluxPage + LRU cache
loadDict: (name, signal) => loadFluxDict(name, signal),  // wraps DictProvider__getDict + TTL cache
```

## What flux Does NOT Do

- **No `@dict:` / `@page:` URL dispatch** in the request pipeline. The ajax executor calls `env.fetcher` directly.
- **No framework-level caches.** Caching is application policy.
- **No `transformPageJson` / `bindActions`.** Role filtering and URL rewriting are application concerns, applied before returning from `loadPage`.

## Rejected Alternatives

- **Provider-object interfaces (`FluxPageProvider` / `FluxDictProvider`)** — superseded. Flat functions (`loadDict` / `loadPage`) are simpler, match `env.fetcher` / `env.notify` style, and avoid an unnecessary indirection layer.
- **Framework-level caches in flux-runtime** — superseded. Caching strategy (LRU max, TTL, key) is application policy. Moving caches out of the framework gives each app control (playground: none; nop-chaos-next: LRU 50 + TTL 20s).
- **`@dict:` URL dispatch in request-runtime** — superseded. The select `dict` property is more explicit and doesn't require URL prefix parsing. The `@` prefix pattern remains available for application-level fetcher extensions if needed.
