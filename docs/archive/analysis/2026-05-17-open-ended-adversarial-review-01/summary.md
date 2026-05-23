# Open-Ended Adversarial Review — 2026-05-17 — Summary

**Execution date**: 2026-05-17
**Result directory**: `docs/analysis/2026-05-17-open-ended-adversarial-review-01/`
**Total finding rounds written**: 2
**Total findings**: 6

## Findings

### Round 1: Contract Archaeology — Declared Promises vs Implemented Behavior

| #   | Area            | Severity | Summary                                                                                                                                                                                                                                                     |
| --- | --------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | API runtime     | High     | `OperationControlConfig.timeout` declared at `schema.ts:124` but never wired in `request-runtime.ts:68`; requests can hang indefinitely                                                                                                                     |
| 2   | CSS/build       | High     | `flux-bundle/src/style.css` is a non-identical manual copy of `default-spacing.css` + `form-renderers.css`; selector semantics differ (broader scope, missing rules), creating a permanent drift risk and behavioral inconsistency between CSS entry points |
| 3   | Expression eval | Medium   | `parseStringLiteral` in `parser.ts:33-63` mishandles escape sequences in single-quoted strings; `\n`, `\t`, `\uXXXX` pass through literally instead of being interpreted                                                                                    |

### Round 2: Silent Degradation — Crash Containment, Silent Data Loss, Cache Key Collision

| #   | Area                  | Severity | Summary                                                                                                                                                                                                         |
| --- | --------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4   | React/error isolation | High     | `DialogView` and `DrawerView` in `dialog-host.tsx:149-159,244-254` render surface body content without `NodeErrorBoundary`; a render crash in a dialog/drawer propagates to the root, collapsing the entire app |
| 5   | Compiler/diagnostics  | High     | Custom field compilation error in `node-compiler.ts:249-261` silently drops the field from compiled output with no fallback; field structurally vanishes in `continueOnError` mode                              |
| 6   | API cache             | Medium   | `stableStringify` budget limits (2000 nodes, 12 depth) in `api-cache.ts:28-77` produce truncation sentinels that can cause cache key collisions between different payloads                                      |

## Overall Assessment

The two connecting themes across all six findings:

### Theme 1: "Declared But Not Fulfilled"

Three findings are concrete instances where the codebase declares a contract (type field, CSS file presence, string literal syntax) but the implementation silently diverges:

- `OperationControlConfig.timeout` has a type declaration and doc contract but zero runtime consumption.
- `flux-bundle/style.css` pretends to be "the same CSS as the canonical files" but has structurally different selectors and missing rules.
- Single-quoted strings in expressions look like they support escape sequences (because double-quoted strings do), but they don't.

These are not isolated mistakes. They share a root cause: **the project's type system and documentation layer make promises that only manual implementation verification can validate**. There is no automated mechanism (test, CI check, or runtime assertion) that catches these divergences. Each one requires a human to notice that the behavior doesn't match the declaration.

### Theme 2: Silent Degradation Without Explicit Signaling

Three findings share a failure pattern where the system continues operating in a degraded state without surface-level signaling:

- A dialog body crash becomes an app crash — the error containment failure is invisible until the entire root tree collapses.
- A bad custom field compilation produces a compiled template where the field simply doesn't exist — no placeholder, no coercion, no error visible to the renderer.
- A large API payload produces a cache key that silently collides with a different request's key — the wrong data is served with no warning.

Each of these has a diagnostic or error path somewhere, but in each case there's a gap in the chain: production builds may not check diagnostics, error boundaries don't cover surfaces, and cache key collisions have no validation layer.

## Blind-Spot Self-Assessment

**Areas covered in this execution**: flux-formula expression engine (security, correctness, test coverage), CSS/styling system contract consistency, build/packaging configuration across all packages, API data source caching and request lifecycle, flux-compiler compilation pipeline, flux-action-core dispatch and error handling, flux-react integration layer (error boundaries, lifecycle, type safety), flux-bundle facade, flux-i18n, flux-code-editor.

**Areas NOT covered**:

- **Debugger runtime** (`nop-debugger`) — the full state inspection and telemetry path was not walked.
- **Spreadsheet renderers** — the report/canvas interaction beyond the CSS findings from the 2026-05-16 deep audit.
- **Flow designer** — beyond what was already reported in the most recent deep audit.
- **Word editor** — both core and renderers.
- **E2E test contracts** — whether Playwright tests validate actual user-visible behavior or just existence.
- **Performance benchmarks** — no runtime profiling was done to validate documented hot-path rules under load.

**Best starting point for next round**: The debugger runtime is the largest uncovered area. A focused adversarial review of whether the debugger's internal state actually matches the runtime's live state would be valuable, especially given that stale `dist/` artifacts were found in `nop-debugger`, which could cause the public-facing debugger to load incorrect module versions. The second-best direction is the E2E test suite — verifying whether the Playwright tests that pass still exercise meaningful behavioral contracts.

## Files Written

- `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-01.md`
- `docs/analysis/2026-05-17-open-ended-adversarial-review-01/round-02.md`
- `docs/analysis/2026-05-17-open-ended-adversarial-review-01/summary.md`
