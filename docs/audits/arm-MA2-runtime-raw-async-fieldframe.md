# MA2.2 — Runtime 包簇裸读取 + 异步路径 + FieldFrame 绕过审计

> Plan: `docs/plans/2026-07-27-0800-3-ma2-runtime-correctness-audit.md`
> Status: completed
> Date: 2026-07-27
> Scope: `packages/flux-runtime/`, `packages/flux-react/`, `packages/flux-bundle/` (tail-check)

## 1. Runtime Raw Schema Reads (`check:audit-runtime-raw-schema-reads`)

**Tool result: 1 hit across workspace, 0 in runtime scope.**

The single hit is in `packages/flux-renderers-data/src/crud-renderer.tsx:512` (`const rawSchema = props.schema;`) — outside the runtime scope. In `flux-runtime` and `flux-react`, all schema access goes through the compiled/normalized pipeline.

**Finding:** 0 hits in runtime scope. Runtime packages correctly avoid raw schema reads.

## 2. Async Failure Paths (`check:audit-async-failure-paths`)

**Tool result: 20 hits in runtime scope (flux-react: 7, flux-runtime: 13).**

### flux-react (7 hits)

| File                          | Line          | Pattern                    | Assessment                                          |
| ----------------------------- | ------------- | -------------------------- | --------------------------------------------------- |
| `lazy-renderer-component.tsx` | 33            | `void` on lazy load        | Legitimate — component loading outside render cycle |
| `container-hooks.ts`          | 87            | `void` on container effect | Legitimate — effect cleanup/init                    |
| `node-error-boundary.tsx`     | 38            | `void` on error recovery   | Legitimate — error boundary recovery, error logged  |
| `renderer-helpers.ts`         | 117, 182      | `void` on render helpers   | Legitimate — side-effects                           |
| `schema-renderer.tsx`         | 152, 174, 185 | `void` on schema render    | Legitimate — render pipeline side-effects           |

### flux-runtime (13 hits)

| File                            | Pattern Count | Assessment                                                       |
| ------------------------------- | ------------- | ---------------------------------------------------------------- |
| `action-adapter.ts`             | 2             | Legitimate — action dispatch fire-and-forget                     |
| `async-data/api-data-source-*`  | 4             | Legitimate — API data flow, errors handled through state machine |
| `async-data/blob-download.ts`   | 2             | Legitimate — download side-effect                                |
| `async-data/request-runtime.ts` | 1             | Legitimate — request orchestration                               |
| `async-data/source-observer.ts` | 1             | Legitimate — observer notification                               |
| `async-data/source-registry.ts` | 1             | Legitimate — registry async ops                                  |
| `form-runtime-submit-flow.ts`   | 2             | Legitimate — submit flow, errors handled via form state          |

**Finding:** All 20 hits are intentional fire-and-forget patterns in async data flows, form submission, and error boundary recovery. No structured failure path violations — errors are routed through the state machine / error boundary / form state. P2 recommendation: add structured error routing comments for clarity on 5 high-traffic paths.

## 3. FieldFrame Bypasses (`check:audit-fieldframe-bypasses`)

**Tool result: 3 hits across workspace, 0 in runtime scope.**

All 3 hits are in `packages/flux-renderers-form-advanced/src/variant-field/variant-field-view.tsx` — outside the runtime scope. Runtime packages (`flux-runtime`, `flux-react`) have zero FieldFrame direct usage — all field rendering goes through the standard `FieldWrapper` contract.

**Finding:** 0 hits in runtime scope. Runtime packages correctly use the standardized field rendering path.

## 4. flux-bundle Tail-check

`packages/flux-bundle/src/` contains 6 files (~106 lines of source in types.ts + use-sync-external-store-shim.ts + index.tsx):

- `index.tsx`: Pure aggregator — calls register functions and creates renderer instances. No runtime raw schema reads, no FieldFrame bypasses, no async failure paths.
- `types.ts`: Pure type re-exports.
- `use-sync-external-store-shim.ts`: 5-line shim.
- `crud-loadaction.test.tsx`, `index.test.tsx`: Tests only.

**Finding:** Clean. flux-bundle is a pure thin aggregator with no runtime correctness risks.

## 5. Findings Summary

| ID         | Severity | Package                  | Description                                                                                                                               | Action                |
| ---------- | -------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| MA2-RT-F01 | P2       | flux-runtime, flux-react | 20 async void-promise hits; all intentional fire-and-forget patterns. Consider structured error routing comments on 5 high-traffic paths. | Document in arm-index |
| MA2-RT-F02 | P2       | flux-runtime, flux-react | 0 raw schema reads — runtime packages correctly use compiled pipeline.                                                                    | Document in arm-index |
| MA2-RT-F03 | P2       | flux-runtime, flux-react | 0 FieldFrame bypasses — runtime packages correctly use FieldWrapper contract.                                                             | Document in arm-index |
| MA2-RT-F04 | P2       | flux-bundle              | Clean aggregator, no runtime correctness risks.                                                                                           | Document in arm-index |

## 6. Conclusions

Runtime package cluster (flux-runtime, flux-react, flux-bundle) passes the runtime correctness audit. No P0/P1 findings. Async failure paths are all intentional fire-and-forget patterns consistent with the reactive/event-driven architecture.
