# 81 Markdown Remote Src Direct fetch — INV-1 Env IO Boundary Fix

## Problem

- `markdown` renderer fetched remote `src` markdown via the browser `fetch()` API directly (`markdown.tsx:38`).
- This violates the INV-1 env IO boundary (`docs/architecture/renderer-env.md` §6 rule 1: renderers must never call `fetch` directly — all IO goes through `RendererEnv.fetcher`).
- Hosts that swap the transport (auth headers, proxy, SSR, test mocks) get no interception point for markdown source loads; tests had to stub the global `fetch` to exercise the path.

## Diagnostic Method

- C6.1 component audit, dimension 18 (INV-1 env IO 边界) — checklist red line: "渲染器外部 IO（fetch/…）必须经 `RendererEnv`".
- Grepped renderer sources for direct IO; `markdown.tsx:38` was the only `fetch(` call among the 5 audited content components (image correctly goes through `helpers.dispatch`).
- Checked `docs/architecture/renderer-env.md` §6 to confirm `fetcher` is the mandatory HTTP transport and `ApiFetcher` accepts `responseType: 'text'` + `ctx.signal`.
- Existing `markdown-src.test.tsx` confirmed the dependency shape: it `vi.stubGlobal('fetch', …)`, i.e. tests were coupled to the browser API rather than the env contract.

## Root Cause

- `markdown.tsx` was written before/without the env-boundary rule for this feature: the `src` fetch used the raw global `fetch` with `AbortSignal`, bypassing `RendererEnv.fetcher` (the runtime's `request-runtime.ts` normalizes envelopes, `ok`, and throws `ApiResponseError` on non-ok — the renderer re-implemented a fragment of that contract).
- Additionally, `docs/components/markdown/design.md` §9 claimed the renderer had NO src/fetch capability at all (successor feature) — owner-doc drift relative to the implemented DD9 feature.

## Fix

- `markdown.tsx` now calls `useRendererEnv()` + `useRenderScope()` and fetches via `env.fetcher<string>({ url: src, responseType: 'text' }, { scope, env, signal })`.
- Non-ok envelope (`res.ok !== true && res.status !== 0`) is treated as an error → `data-state="error"` (same fail-visible behavior as before); AbortController cleanup and stale-response guards retained.
- Updated `docs/components/markdown/design.md` §9/§12 to describe the env.fetcher contract (replaced the successor-B7 claim).
- Added `createTestRuntime`/`TestRuntimeProvider` to the content package (`test-support-runtime.tsx`) so renderer unit tests can provide runtime env/scope contexts when rendering with mock props.

## Tests

- `packages/flux-renderers-content/src/markdown-src.test.tsx` — rewritten from global-fetch stubs to env.fetcher injection: content renders from `env.fetcher`; "never global fetch" assertion (spy proves the browser API is untouched); error on throw; error on non-ok envelope; abort signal captured and aborted on unmount; inline content wins over src.
- Test-first: the env.fetcher and abort cases failed against the old implementation (content never rendered, no signal captured).

## Affected Files

- `packages/flux-renderers-content/src/markdown.tsx`
- `packages/flux-renderers-content/src/markdown-src.test.tsx`
- `packages/flux-renderers-content/src/test-support-runtime.tsx`
- `packages/flux-renderers-content/src/markdown.test.tsx` / `content-renderer-definitions.test.tsx` (wrap in runtime provider)
- `docs/components/markdown/design.md`

## Notes For Future Refactors

- Any renderer that needs remote text/blob content must go through `env.fetcher` with `responseType` (text/blob) — never `fetch()`; `check:audit-suspects`-style greps can find regressions.
- Keep the envelope check `res.ok !== true && res.status !== 0` in sync with `request-runtime.ts` normalization (`status === 0 || ok === true`).
- `useRendererEnv()` requires runtime context; renderer unit tests that render with mock props must wrap in `TestRuntimeProvider` (see `test-support-runtime.tsx`).
