# 11 Api-Data & Scope — Amis Bug-Driven Improvements

> Flux owner docs: `docs/architecture/api-data-source.md` (ApiSchema, SourceSchema, DataSource, Reaction), `docs/architecture/scope-ownership-and-isolation.md`, `docs/architecture/renderer-runtime.md`
> amis cluster: `api-data/api-config` (111), `api-data/data-binding` (24), `api-data/data-scope` (3)
> Priority summary: This is the second-richest design-gap cluster. Flux's doc makes _better_ promises than amis delivers in several places (request-adaptor can rewrite params; data-source is the unified request owner); the job is to lock those promises with tests. The residual gaps are 4xx-adaptor reachability, concurrent-request dedup, depth-N scope propagation, location-param isolation, and i18n-via-data.
> Triage: ~56 deep-reads → 19 entries across 5 areas.

## Decision Vocabulary

See `README.md`.

## NOT-ADOPTED (amis api-data designs Flux rejects)

| amis feature                                                       | Reason rejected                                     | AMIS-REF           |
| ------------------------------------------------------------------ | --------------------------------------------------- | ------------------ |
| Component-level `api` / `initFetch` / `interval` / `silentPolling` | Requests go through `data-source` + action graph    | (whole api-config) |
| amis `dataProvider` JS function strings                            | Anti-pattern; Flux uses declarative source/reaction | (whole cluster)    |
| amis `messages`/`showErrorMsg` text-param pack                     | Flux statusPath model                               | (whole cluster)    |
| amis `adaptor` arbitrary JS                                        | Flux adaptor is declarative (not arbitrary JS)      | (whole cluster)    |

---

## A. Request Adaptation (ApiSchema / requestAdaptor / responseAdaptor)

| #   | Property                                                                                                                                                                                                                                                                            | Signal     | Severity | AMIS-REF                                                                                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | `responseAdaptor` executes on non-OK responses (with payload + status available); it may surface an Error or normalize msg; `onError` fires afterward. (Flux's "throw on non-OK" must not skip the adaptor.)                                                                        | DESIGN-GAP | P0       | #3465                                                                                                                                                                |
| A2  | When the host fetcher rejects on HTTP 4xx, exactly ONE error notification reaches `env.notify` (no duplicate), and the thrown error carries the backend `msg` (not generic "Request failed"). Runtime owns the single error→notify translation; host fetchers must not also notify. | BOTH       | P1       | #4857                                                                                                                                                                |
| A3  | A `requestAdaptor` that mutates `api.params` (adds/overrides a query key) changes `finalUrl` for a GET request (Flux deliberately diverges from amis here — request prep finalizes URL canonicalization AFTER adaptor).                                                             | LOCK       | P1       | #1470, #2464                                                                                                                                                         |
| A4  | The request-adaptor abort contract is explicit: either "adaptors cannot skip; use `sendOn`" (documented boundary) OR a sentinel return cancels. Not unspecified.                                                                                                                    | DESIGN-GAP | P2       | #4344 — **RESOLVED (B7)**: covered-by B2.2 `api-data-source.md` "Adaptor Abort Boundary" doc note                                                                    |
| A5  | `requestAdaptor` results shallow-merge back onto the declarative ApiSchema preserving all fields (headers/data/params/adaptors); returning a partial object merges; returning undefined/null has a defined behavior (error or no-op), never silently submits unchanged.             | TEST-GAP   | P1       | #854, #664, #4684                                                                                                                                                    |
| A6  | `method` participates in dynamic request config evaluation (`method: "${isEdit ? 'put' : 'post'}"` resolves).                                                                                                                                                                       | TEST-GAP   | P2       | #5081 — **RESOLVED (B7)**: watch-only (`method` participates in dynamic request config eval construct-true; P2 low-risk)                                             |
| A7  | A first-class escape sequence exists for literal `${` in url/data/params; templated-url-path segments and `params` compose (both reach the backend).                                                                                                                                | DESIGN-GAP | P2       | #5817, #6541 — **RESOLVED (B7)**: covered-by B2.2 `template.test.ts` (`${` interpolation boundary) + `api-data-source.md` "Template Interpolation Boundary" doc note |
| A8  | Array GET params serialize in a documented, consistent form (`ids=1&ids=2` vs `ids[]=1`), with a per-request override. Flux does NOT inherit amis's surprising `bar[0]=1` default silently.                                                                                         | TEST-GAP   | P2       | #4368, #4243 — **RESOLVED (B7)**: covered-by B2.2 `request-runtime.test.ts` (array serialization unified `ids=1&ids=2`)                                              |

**Recommended actions:**

- A1: Add design note to `api-data-source.md` §requestAdaptor/responseAdaptor: specify responseAdaptor runs on non-OK responses with payload+status.
- A2: Add design note to §Fetcher Boundary: runtime owns single error→notify; host fetchers must not also notify.
- A4: Add design note: state the adaptor abort contract (boundary or sentinel).
- A7: Add design note: define escape for literal template delimiters; templated-url + params compose.
- A8: Add design note: array-param serialization policy + override.

**Recommended tests:**

- A1: HTTP 400 with body → responseAdaptor runs, can map error; `onError` fires.
- A2: fetcher throws on HTTP 400 → exactly one `env.notify`; error carries backend msg.
- A3: requestAdaptor mutating `api.params` → `finalUrl` changes for GET.
- A5: (a) partial `{data}` merges preserving headers/params; (b) undefined return has defined behavior; (c) header rewrite survives.
- A6: `method:"${isEdit?'put':'post'}"` resolves correctly.
- A7: GET with templated url + params object delivers both; literal `${` preserved.
- A8: `params:{ids:[1,2,3]}` → documented query form.

---

## B. Data-Source (polling / cache / loading)

| #   | Property                                                                                                                                                                                        | Signal     | Severity | AMIS-REF                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| A9  | Polling refreshes (interval) update `statusPath.isRefreshing`/`inFlightCount` but do NOT flip top-level `loading` unless `silent:false`; default silent behavior for polls is stated.           | DESIGN-GAP | P1       | #2381, #1499                                                                                                                                      |
| A10 | Polling supports jitter (`interval: { base, jitter }` or `intervalRange`) to avoid synchronized traffic spikes.                                                                                 | DESIGN-GAP | P3       | #3114 — **RESOLVED (B7)**: out-of-scope-feature (polling jitter is a feature enhancement; Flux polling has no jitter)                             |
| A11 | Cache applies to schema-loading requests too; mount-time concurrent-same-request behavior is defined (propose: dedup to one in-flight by executable identity, second subscriber reuses).        | DESIGN-GAP | P0       | #3417                                                                                                                                             |
| A12 | N parallel data-sources each exposing loading are aggregated by the author (doc example), not auto-stacked spinners.                                                                            | DESIGN-GAP | P2       | #1534 — **RESOLVED (B7)**: watch-only (N parallel sources aggregated by author; each independent construct-true; recipe = optimization-candidate) |
| A13 | Status-branching (201→navigate, 202→dialog) is documented: belongs in `onSuccess`/`onError` actions reading `statusPath`/`failureReason` (with example), OR an `onStatus` map. Not unspecified. | DESIGN-GAP | P2       | #1535, #4077, #4932 — **RESOLVED (B7)**: watch-only (status-branching host/action concern construct-true; P2 low-freq)                            |

**Recommended actions:**

- A9: Add design note to `api-data-source.md` §DataSourceSchema: polling updates `isRefreshing` not `loading` unless `silent:false`.
- A10: Add design note: extend `interval` to accept `{base, jitter}`.
- A11: Add design note: cache applies to schema-fetches; define concurrent-same-request behavior (dedup by executable identity).
- A12: Add example: aggregating multiple `statusPath.loading` into one page indicator.
- A13: Add design note/example: status-branching in `onSuccess`/`onError` reading `statusPath`.

**Recommended tests:**

- A9: polling data-source with `silent` → primary `loading` not toggled, only `isRefreshing`.
- A11: two data-sources with identical executable request mounting together → one fetch, both receive result.

---

## C. Scope / Data-Binding (isolation, propagation, merge)

| #   | Property                                                                                                                                                                        | Signal     | Severity | AMIS-REF                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A14 | Lexical inheritance is **unbounded-depth** (not single-level); a write at any ancestor reachable by lexical lookup invalidates descendants.                                     | DESIGN-GAP | P0       | #3562                                                                                                                                                                 |
| A15 | Component-handle targeting and `refreshSource` are both namespaced per-runtime-instance; two co-mounted flux runtimes with identical schema IDs never collide.                  | DESIGN-GAP | P1       | #4766                                                                                                                                                                 |
| A16 | Location/route params bind to the current page/surface scope, not a global ancestor; navigating away does not leave stale params for sibling pages.                             | DESIGN-GAP | P1       | #5275                                                                                                                                                                 |
| A17 | When a published `name` already exists and a `resultMapping`/`mergeStrategy` is set on refresh, the previously-bound consumer re-renders with the new value (no stale binding). | TEST-GAP   | P2       | #4489 — **RESOLVED (B7)**: watch-only (name+resultMapping no-stale-binding construct-true; P2 niche)                                                                  |
| A18 | Sibling-to-sibling data flow is via a shared parent owner/source (not direct sibling reads) — documented with a worked example.                                                 | DESIGN-GAP | P3       | #220, #182, #1401 — **RESOLVED (B7)**: watch-only (sibling-to-sibling via shared parent owner; lexical scope construct-true; worked-example = optimization-candidate) |

**Recommended actions:**

- A14: Add design note to `scope-ownership-and-isolation.md` §Default Inheritance: lexical inheritance is unbounded-depth.
- A15: Add design note to `api-data-source.md` §Component Capabilities / `renderer-runtime.md`: component-handle targeting + `refreshSource` namespaced per-runtime.
- A16: Add design note: location/route params bind to current page/surface scope.
- A18: Add example: sibling data flow via shared parent owner/source.

**Recommended tests:**

- A14: grandparent.data read inside a 3-deep child scope (service>service>table) stays correct after grandparent mutation (the #3562 regression).
- A15: two mounted runtimes, same componentId, `setValue` targets only intended instance.
- A16: navigate A?name=x → B; B must not resolve `${name}` to x.
- A17: data-source with published `name`, refresh with `mergeStrategy:'merge'` + `resultMapping` → bound consumer re-renders with new value.

---

## D. Reaction (trigger conditions)

| #   | Property                                                                                                                                                                                                | Signal   | Severity | AMIS-REF            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------- | ------------------- |
| A19 | `sendOn` gates EVERY entry path (init, refresh, interval, AND action-triggered producer), not just init; `sendOn` reading a scope value written by a different owner (cross-owner) evaluates correctly. | TEST-GAP | P1       | #2137, #5633, #5685 |

**Recommended tests:**

- A19: (a) data-source `sendOn` suppresses interval polls and `refreshSource` calls, not just init; (b) `sendOn` reading a cross-owner scope value evaluates correctly.

---

## Highest-Leverage Items

1. **A11** — concurrent-same-request dedup + cache-for-schema-fetches (single highest-value data-source finding).
2. **A14** — unbounded-depth lexical propagation (the #3562 amis regression).
3. **A1/A2** — 4xx adaptor reachability + single error notification.
4. **A3** — request-adaptor GET-query mutation (Flux's deliberate divergence — must be locked).
5. **A16** — location-param isolation (will bite as soon as flux's app/navigation lands).
