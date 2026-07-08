# 451 flux Page/Dict Loading And Pre-Compile (@dict / @page / xui:roles)

> Plan Status: completed
> Last Reviewed: 2026-07-06
> Source: `docs/architecture/flux-page-dict-loading-and-precompile.md`; analysis of `nop-chaos-next` `amis-core` special-URL pipeline vs flux integration gap
> Related: design doc `docs/architecture/flux-page-dict-loading-and-precompile.md`; `docs/architecture/renderer-runtime.md`, `module-cache-and-import-stack.md`, `flux-runtime-module-boundaries.md`

## Purpose

Make flux schemas able to load dictionaries (`@dict:`) and pages (`@page`) from a nop-entropy backend, with client caching and uniform `xui:roles` permission filtering — without inheriting AMIS's monolithic fetcher pipeline. Close the gap that today makes `url: "@dict:user/role"` in a flux schema send an invalid literal HTTP request.

## Current Baseline

- `RendererEnv` (`packages/flux-core/src/types/renderer-api.ts:63`) has `fetcher` / `notify` / `navigate` / `confirm` / `alert` / `functions` / `filters` / `importLoader` / `resolveImportUrl` / `monitor`. **No** `pageProvider` / `dictProvider` / `hasRole` / `locale`.
- `RendererPlugin.beforeCompile(schema): schema` exists (`packages/flux-core/src/types/renderer-plugin.ts:10`) and is reduced over every schema before compile (`packages/flux-compiler/src/schema-compiler-helpers.ts:22`). Not yet used for roles filtering.
- Ajax action takes `args` as `ApiSchema` and calls `env.fetcher` directly (`packages/flux-runtime/src/action-adapter.ts:155`, `request-runtime.ts:427`). **No** special-URL dispatch before the fetcher.
- `createRendererRuntime({ env, registry, plugins? })` accepts plugins (`packages/flux-runtime/src/runtime-factory.ts:87`). Plugins sorted by priority (`runtime-plugins.ts`).
- In `nop-chaos-next`, flux's `createMainFluxEnv` bypasses AMIS's `handleSpecialRequest` (`apps/main/src/flux/adapter.ts:14`); `fetchFluxPage` throws on non-local paths (`apps/main/src/flux/providers.ts:34`). AMIS caches pages client-side (`apps/main/src/services/pageApi.ts`, LRU 50, locale-keyed) but **not** dicts (only server `ICache` in `DictProvider.java`).
- `crud-demo.json` currently uses `@dict:user/role` URLs that only work because the **playground mock fetcher** hand-interprets `@dict:` (`apps/playground/src/pages/crud-demo-page.tsx`) — not a real mechanism.

## Goals

- flux `RendererEnv` exposes `pageProvider` / `dictProvider` / `hasRole` / `locale` hooks (all optional, backward-compatible).
- flux provides `loadFluxPage(path)` and `loadDict(name)` with **global** caches: page LRU (50, locale-keyed), dict TTL (20s, locale-keyed).
- flux runtime dispatches `@dict:` ajax URLs (before `env.fetcher`) through the dict loader, returning `options` so `select` sources need no `responseAdaptor`.
- flux provides `createXuiRolesPlugin({ hasRole })` that filters schemas by `xui:roles` in `beforeCompile`, applied to all schemas.
- A flux schema with `@dict:user/role` resolves end-to-end through the dict cache without integrator-specific fetcher hacks.

## Non-Goals

- In-schema `@page:` dynamic sub-page renderer (AMIS-style second-page injection). flux composes via regions/templates/`schemaUrl`; revisit as a separate renderer if needed.
- AMIS-only `transformPageJson` concerns: `xui:component` resolution, amis dialog/drawer className injection. No flux equivalent.
- Server-side caching (stays in nop-entropy `DictProvider` `ICache`). This plan is client-side only.
- `@query:` / `@mutation:` / `@action:` special-URL schemes. Only `@dict:` is in scope (and `@page` as a loader, not an ajax URL).

## Scope

### In Scope

- `packages/flux-core/src/types/renderer-api.ts` — four env hooks + `DictBean` / provider types.
- `packages/flux-runtime/src/` — `loadFluxPage`, `loadDict`, page/dict global caches + config API, `splitSpecialPrefix`, `@dict:` fetcher wrapper in runtime-factory.
- `xui:roles` plugin module (location decided in Phase 4, likely `flux-runtime/src/plugins/`).
- Playground validation: rewrite `crud-demo` dict path to go through a mock `dictProvider` (+ a `hasRole` demo node) instead of the hand-rolled fetcher branch.
- Owner-doc updates: `renderer-runtime.md`, `module-cache-and-import-stack.md`, `flux-runtime-module-boundaries.md`.

### Out Of Scope

- nop-chaos-next code changes (cross-repo). The flux plan delivers the contract + flux implementation + playground validation; nop-chaos-next wiring is tracked as a documented integration slice, not edited from this repo.
- Backend (nop-entropy) changes. `DictProvider__getDict` / `PageProvider__getPage` already exist.

## Failure Paths

| Scenario                             | Trigger                                              | Behavior                                                         | Retry    | User-visible                                     |
| ------------------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------- | -------- | ------------------------------------------------ |
| `pageProvider` absent + remote path  | `loadFluxPage('/p/...')` with no `env.pageProvider`  | throw `pageProvider not configured`                              | no       | page load error                                  |
| `dictProvider` absent + `@dict:` url | select source `url:'@dict:x'`, no `env.dictProvider` | throw `dictProvider not configured` (propagates as source error) | no       | select options fail to load + source error state |
| unknown dict                         | `DictProvider__getDict` returns 404 / unknown        | error propagates through dict cache (not cached as success)      | no       | select empty + error                             |
| role denies node                     | node `xui:roles` has no matching role                | node pruned to `null` in `beforeCompile`                         | n/a      | node not rendered                                |
| dict TTL expired                     | 20s passed since last fetch for `(locale,name)`      | next access re-fetches                                           | implicit | fresh options                                    |
| malformed `@` url                    | `url:'@foo:x'` (unknown scheme)                      | fall through to `env.fetcher` unchanged (do not throw)           | n/a      | fetcher decides                                  |

## Test Strategy

本档选择：**必须自动化**

理由：改公共 API 契约（`RendererEnv`）+ 引入权限行为（`xui:roles` 过滤）+ 外部集成（`@dict`/`@page` 后端协议）。按 AGENTS.md 测试分层，鉴权/对外契约属必须自动化。对应 Proof 项必须先于 Fix 项落地。

## Execution Plan

### Phase 1 - Contract: RendererEnv hooks + DictBean types

Status: completed
Targets: `packages/flux-core/src/types/renderer-api.ts`, `packages/flux-core/src/index.ts`

- Item Types: `Fix` (public-contract addition), `Proof`

- [x] (Proof) Add unit test asserting `RendererEnv` type accepts the four optional hooks and remains assignable when they are absent (backward-compat compile guard).
- [x] (Fix) Add `FluxPageProvider`, `FluxDictProvider`, `DictBean` interfaces and `pageProvider` / `dictProvider` / `hasRole` / `locale` optional fields to `RendererEnv`.
- [x] (Fix) Export the new types from `packages/flux-core/src/index.ts`.

Exit Criteria:

- [x] `pnpm --filter @nop-chaos/flux-core typecheck` passes; existing `RendererEnv` consumers compile unchanged (no hook is required).
- [x] New types exported and referenced from the design doc anchors.

### Phase 2 - Loaders + global caches

Status: completed
Targets: `packages/flux-runtime/src/special-url/` (new), `packages/flux-runtime/src/index.ts`

- Item Types: `Proof`, `Fix`

- [x] (Proof) Failing tests for `loadDict`: cache miss → calls `env.dictProvider.getDict`; cache hit within TTL → no second call; TTL expiry (use fake timers, 20s) → re-fetches; error not cached as success; locale segment in key isolates entries.
- [x] (Proof) Failing tests for `loadFluxPage`: cache miss → calls `env.pageProvider.getPage`; LRU eviction at capacity 50; in-flight de-dup (same key shares one promise); `pageProvider` absent → throws clear error; locale in key.
- [x] (Fix) Implement global dict cache (TTL, locale-keyed) + `loadDict(name, { env, signal })`.
- [x] (Fix) Implement global page cache (LRU 50, locale-keyed, in-flight de-dup) + `loadFluxPage(path, { env, signal })`.
- [x] (Fix) Export `loadFluxPage`, `loadDict`, `clearPageCache`, `clearDictCache`, `configurePageCache`, `configureDictCache`.

Exit Criteria:

- [x] Proof tests above pass against the live implementation (interface-vs-semantics, not just compile).
- [x] Locale fallback defined when `env.locale` absent: cache key uses `env.locale ?? ''` (empty-string segment), documented in the design doc and asserted by a Proof test.

### Phase 3 - `@dict:` ajax dispatch

Status: completed
Targets: `packages/flux-runtime/src/runtime-factory.ts`, `packages/flux-runtime/src/special-url/`

- Item Types: `Proof`, `Fix`

- [x] (Proof) Failing test: a source action with `args.url: '@dict:user/role'` resolves through `loadDict` and the resolved prop value is the `options` array (no `responseAdaptor`). Use a mock `dictProvider`.
- [x] (Proof) Failing test: `url: '@unknown:x'` and a normal `/api/x` url both pass through to `env.fetcher` unchanged (dispatch only intercepts known `@` schemes).
- [x] (Fix) Implement `splitSpecialPrefix(url)` (split `@type:path` on first `:`; return `undefined` for non-`@` urls).
- [x] (Fix) Install a fetcher wrapper in `createRendererRuntime` that dispatches `@dict:` → `loadDict` → returns `{ status: 0, data: dict.options }`, else delegates to `env.fetcher`. Implementation note: the wrapper lives in `request-runtime.ts` `fetchWithSpecialUrlDispatch` (sync-first, so non-`@dict` fetcher timing is unchanged → dedup/cancel tests still pass) and reads the caller's `env` (from `getEnv()`), so it survives `runtime.setEnv()`.

Exit Criteria:

- [x] `@dict:` source resolves options end-to-end via the dict cache; `responseAdaptor` not required.
- [x] Non-`@dict` fetcher behavior byte-for-byte unchanged (existing runtime-ajax tests still pass).

### Phase 4 - xui:roles beforeCompile plugin

Status: completed
Targets: `packages/flux-runtime/src/plugins/xui-roles-plugin.ts` (new)

- Item Types: `Proof`, `Fix`

- [x] (Proof) Failing tests for `createXuiRolesPlugin`: node with `xui:roles:['admin']` removed when `hasRole('admin')` returns false; node kept when true; node with no `xui:roles` always kept; `hasRole` absent → schema unchanged (allow-all); `xui:roles` key stripped from surviving nodes; nested children of a denied node are pruned together.
- [x] (Fix) Implement `filterByRoles(schema, hasRole)` walking the object tree (arrays + nested objects), pruning denied nodes, stripping the key.
- [x] (Fix) Export `createXuiRolesPlugin`.

Exit Criteria:

- [x] Roles filtering proven on inline + nested schemas; allow-all default holds when `hasRole` not provided.
- [x] Plugin integrates via `createRendererRuntime({ plugins: [createXuiRolesPlugin({ hasRole })] })` without compiler changes.

### Phase 5 - Playground validation + owner docs

Status: completed
Targets: `apps/playground/src/pages/crud-demo-page.tsx`, `apps/playground/src/schemas/crud-demo.json`, `docs/architecture/`

- Item Types: `Fix`, `Follow-up`

- [x] (Fix) Replace the hand-rolled `startsWith('@dict:')` branch in `crud-demo-page.tsx` with a mock `dictProvider` on env + the real flux `@dict:` dispatch; add `xui:roles` demo nodes (admin-visible + superadmin-pruned) + mock `hasRole`, wired via `createXuiRolesPlugin`.
- [x] (Fix) Update `renderer-runtime.md` (`RendererEnv` hooks), `module-cache-and-import-stack.md` (page/dict caches), `flux-runtime-module-boundaries.md` (loader + dispatch + plugin locations) to the final design.
- [x] (Follow-up) Document the nop-chaos-next integration slice (wire `pageProvider`/`dictProvider`/`hasRole`/`locale` + `createXuiRolesPlugin` in `apps/main/src/flux/`) as a cross-repo follow-up; do not edit that repo here (recorded in `Deferred But Adjudicated`).

Exit Criteria:

- [x] `crud-demo` `@dict:user/role` resolves via the real flux dispatch + mock provider (no hand-rolled fetcher branch).
- [x] Owner docs reflect the landed design (final state, not proposed-vs-current).

## Draft Review Record

- Reviewer / Agent: `ses_0c94f9638ffepvRNH9ynOZqPFD` (independent general sub-agent, fresh session)
- Verdict: `revised` → promoted to `active` after addressing the Major
- Rounds: 1
- Findings addressed:
  - (Major) `fetchFluxPage` throw cited as `providers.ts:32` in plan + design doc; live line is `:34`. Fixed in both files.
  - (Minor) `transformPageJson` roles `if` cited as `transform.ts:47`; live line is `:49`. Fixed in design doc.
  - (Minor) Phase 2 locale fallback was non-binary. Exit criterion now commits to `env.locale ?? ''` with a Proof assertion.
  - (Minor) Phase 3 fetcher-wrapper installation strategy unspecified re: `runtime.setEnv()`. Exit item now requires wrapping at executor construction so env swaps re-wrap the current fetcher.
  - Reference checks: 23 cited anchors verified; only the `providers.ts:32/34` drift was material, all others confirmed exact.

## Closure Gates

- [x] All in-scope confirmed contract drifts (flux cannot resolve `@dict:` / load remote pages) converged.
- [x] `xui:roles` permission filtering lands with `env.hasRole` (ask-first protected area) — human approval recorded (user confirmed `env.hasRole` hook design + "执行计划" directive on 2026-07-06).
- [x] Behavior/contract result achieved: `@dict:` source resolves options without `responseAdaptor`; `loadFluxPage` reaches `pageProvider`; roles filter applies to all schemas via `beforeCompile`.
- [x] Focused verification (Phase Proof tests) complete for cache TTL/LRU, dispatch passthrough, roles pruning — 40 new tests across flux-core (renderer-env: 2) + flux-runtime (loaders: 16, dispatch: 10, xui-roles: 12).
- [x] No in-scope live defect silently downgraded to deferred/follow-up.
- [x] Owner docs (`renderer-runtime.md`, `module-cache-and-import-stack.md`, `flux-runtime-module-boundaries.md`) synced to live baseline.
- [x] Independent sub-agent closure-audit (fresh session `ses_0c91c7f13ffer7YAwbU0Vg3BqE`) completed and approved (no Gaps); executor session did not self-audit.
- [x] `pnpm typecheck` (55/55)
- [x] `pnpm build` (29/29)
- [x] `pnpm lint` (29/29)
- [ ] `pnpm test` — the only failing test is `apps/playground/src/schema-examples.test.ts` (validates `docs/examples/user-management-schema.md`, a file this plan did not touch); the independent audit confirmed via git history it is **pre-existing and unrelated**. All packages owning this plan's work (flux-core, flux-runtime, and the playground suite excluding that one pre-existing test) pass. The full suite is not 100% green solely due to that pre-existing failure; it is not plan-owned and is left for the owner of that doc/example.

## Deferred But Adjudicated

### nop-chaos-next integration wiring

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: different repository. The flux contract + implementation + playground validation fully establish the mechanism; nop-chaos-next consumes the stable hooks afterward.
- Successor Required: `yes`
- Successor Path: `nop-chaos-next/docs/plans/` (wire `pageProvider` → `@query:PageProvider__getPage`, `dictProvider` → `@query:DictProvider__getDict/...`, `hasRole` from auth store, `locale` from i18n, register `createXuiRolesPlugin`, replace bespoke `fetchFluxPage` with `loadFluxPage`).

### In-schema `@page:` dynamic sub-page renderer

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: no flux use case; covered by regions/templates/`schemaUrl`. Revisit as a new renderer on top of `loadFluxPage` if demand appears.
- Successor Required: `no`

## Non-Blocking Follow-ups

- `@query:` / `@mutation:` general special-URL schemes (only `@dict:` in scope here).
- Configurable cache limits via env (currently module-level `configurePageCache`/`configureDictCache`).

## Closure

Status Note: All five phases landed and behaviorally verified. flux schemas can now resolve `@dict:` ajax URLs through `env.dictProvider` + a global short-TTL dict cache (no `responseAdaptor`), load remote pages via `loadFluxPage` + `env.pageProvider` + a global LRU page cache, and filter nodes by `xui:roles` through a `beforeCompile` plugin backed by `env.hasRole`. All four `RendererEnv` hooks are optional and default-safe (allow-all / clear error when a provider is absent), so existing integrations compile and run unchanged. Independent closure audit (fresh session `ses_0c91c7f13ffer7YAwbU0Vg3BqE`) returned `approved` with zero Gaps. The single `pnpm test` failure is pre-existing and unrelated (schema-examples.test.ts / user-management-schema.md, confirmed via git history by the auditor) and is not plan-owned.

Closure Audit Evidence:

- Auditor / Agent: `ses_0c91c7f13ffer7YAwbU0Vg3BqE` (independent general sub-agent, fresh session — not the executor)
- Verdict: `approved` (zero Gaps)
- Evidence: auditor verified each Phase against live code at interface-vs-semantics level — Phase 1 `renderer-api.ts:64-137` + export chain; Phase 2 `loaders.ts`/`page-cache.ts`/`dict-cache.ts` + 16 tests; Phase 3 `request-runtime.ts` `fetchWithSpecialUrlDispatch` (non-async, wired at both fetcher sites) + `dispatch.ts` + 10 tests; Phase 4 `xui-roles-plugin.ts` + 12 tests; Phase 5 playground rewrite + owner docs. Gate commands re-run by auditor: flux-core/flux-runtime/playground typecheck PASS; flux-runtime test 1315 passed/1 skipped; pre-existing playground failure confirmed via git history.

Follow-up:

- nop-chaos-next integration wiring (successor plan in that repo): wire `pageProvider` → `@query:PageProvider__getPage`, `dictProvider` → `@query:DictProvider__getDict/...`, `hasRole` from auth store, `locale` from i18n, register `createXuiRolesPlugin`, replace bespoke `fetchFluxPage` with `loadFluxPage`.
- Pre-existing unrelated failure in `apps/playground/src/schema-examples.test.ts` (reads `docs/examples/user-management-schema.md`) — not plan-owned; left for that doc/example's owner.
