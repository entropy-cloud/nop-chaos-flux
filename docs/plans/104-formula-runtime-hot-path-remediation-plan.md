# 104 Formula Runtime Hot-Path Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-04-16
> Source: `docs/analysis/2026-04-16-performance-audit.md` sections 3.1-3.9, `docs/architecture/performance-design-requirements.md`
> Related: `docs/plans/101-performance-audit-closure-and-owner-assignment-plan.md`

## Purpose

收口 `packages/flux-formula/src/` 中仍然成立的 confirmed evaluation-path defects，优先解决重复分配、重复查找、和易于验证的 setup duplication。

## Current Baseline

- formula registry snapshot 仍按调用重建并 freeze。
- leaf evaluation 仍 spread eval context，并为 dependency collection 分配 collector/set/sorted array。
- lambda identifier resolution 仍双遍历 frame chain。
- imported-function parsing 与 lexer tight-loop helpers 仍在热路径内重复创建 regex。
- builtin installation 在 compiler creation 时仍重复执行。
- arrow-function callback frame construction 仍有 common-path allocation churn。

## Goals

- 为 registry snapshot 引入 cache + invalidation。
- 去掉当前最明确的 per-evaluation 重复对象 churn。
- 去掉 frame lookup 双遍历。
- hoist regex-based hot helpers。
- 让 builtin installation 幂等。

## Non-Goals

- 不把 `3.8` `try/catch` relocation 当作当前必做项。
- 不重写公式执行架构。

## Scope

### In Scope

- `packages/flux-formula/src/registry.ts`
- `packages/flux-formula/src/evaluate.ts`
- `packages/flux-formula/src/scope.ts`
- `packages/flux-formula/src/evaluator.ts`
- `packages/flux-formula/src/compile.ts`
- `packages/flux-formula/src/lexer.ts`
- focused tests and docs/log sync

### Out Of Scope

- broad compiler/runtime redesign
- benchmark-only `try/catch` extraction

## Execution Plan

### Phase 1 - Registry And Setup Duplication

Status: completed
Targets: `registry.ts`, `compile.ts`, `builtins.ts`

- [x] cache registry snapshot and invalidate on function/namespace mutation
- [x] make builtin installation idempotent

**Phase 1 Results (2026-04-16):**

`registry.ts`: Added `cachedSnapshot` field. `getFormulaRegistrySnapshot()` now returns cached snapshot if available. `registerFunction()`, `registerNamespace()`, and `resetFormulaRegistry()` invalidate the cache by setting it to `undefined`. No repeated Object.fromEntries + Object.freeze per call.

`builtins.ts` + `registry.ts`: Added `builtinsInstalled` flag managed via `getBuiltinsInstalled()`/`setBuiltinsInstalled()` in registry (to avoid circular dependency). `installBuiltins()` returns immediately if already installed. `resetFormulaRegistry()` resets the flag.

Exit Criteria:

- [x] repeated snapshot reads reuse cached snapshot until registry mutation
- [x] repeated compiler creation does not rewrite builtin registry state redundantly

### Phase 2 - Leaf Evaluation And Dependency Collection

Status: completed
Targets: `evaluate.ts`

- [x] remove leaf-path eval-context spread where possible
- [x] reduce collector allocation churn while preserving dependency semantics

**Phase 2 Results (2026-04-16):**

Replaced `{ ...context, collector }` spread with in-place `context.collector` mutation + restore pattern. This avoids creating a new object per leaf evaluation while preserving the collector contract.

Exit Criteria:

- [x] leaf evaluation no longer allocates a fresh spread context object each time
- [x] dependency collection semantics remain correct under focused tests (54/54 pass)

### Phase 3 - Lookup And Hot Helper Cleanup

Status: completed
Targets: `evaluator.ts`, `lexer.ts`, `compile.ts`

- [x] merge frame-chain lookup into one pass
- [x] hoist imported-function regex and lexer regex helpers
- [x] optimize common single-parameter arrow-function frame construction

**Phase 3 Results (2026-04-16):**

`evaluator.ts`:
- Merged `hasFrame()` + `lookupFrame()` into single `lookupFrame()` returning `FRAME_NOT_FOUND` sentinel. Single frame-chain traversal instead of two.
- Hoisted `parseImportedFunctionName` regex to module-level `IMPORTED_FUNCTION_RE`.
- Optimized arrow-function: single-param case uses computed property `{ [paramName]: args[0] }` instead of `Object.fromEntries(map)`. Multi-param case uses `for` loop instead of `map + fromEntries`.

`lexer.ts`: Hoisted 4 regex helpers (`RE_WHITESPACE`, `RE_DIGIT`, `RE_IDENTIFIER_START`, `RE_IDENTIFIER_PART`) to module level.

`compile.ts`: Hoisted 4 regex helpers (`RE_IDENTIFIER_CHAR`, `RE_IDENTIFIER_START`, `RE_ALIAS_START`, `RE_ALIAS_PREV_CHAR`) to module level.

Exit Criteria:

- [x] frame lookup no longer walks the same frame chain twice
- [x] audited regex helpers are no longer recreated in hot loops
- [x] common arrow-function path avoids avoidable frame-construction churn

### Phase 4 - Focused Verification And Docs Sync

Status: completed
Targets: tests, docs/logs

- [x] all 54 existing tests pass after changes
- [x] reverse-update log text

Exit Criteria:

- [x] focused tests cover all contract-sensitive hot-path changes
- [x] docs reflect the new formula baseline

## Validation Checklist

- [x] registry snapshot cache landed
- [x] builtin installation idempotence landed
- [x] leaf spread allocation removed
- [x] collector churn reduced without semantic regression
- [x] frame lookup single-pass landed
- [x] regex hot helpers hoisted
- [x] focused verification completed
- [x] independent closure-audit completed and recorded
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Plan 104 is now complete. All formula hot-path defects in scope are closed.

Closure Audit Evidence:

- Reviewer / Agent: Independent subagent session `ses_26a7594e0ffeXC1PqiMJ2uaCY0`
- Evidence: All 6 verification items passed across registry, builtins, evaluate, evaluator, lexer, compile

Follow-up:

- if profiling later justifies `try/catch` extraction, create a measured successor plan
