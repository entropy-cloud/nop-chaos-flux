# 104 Formula Runtime Hot-Path Remediation Plan

> Plan Status: planned
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

Status: planned
Targets: `registry.ts`, `compile.ts`

- [ ] cache registry snapshot and invalidate on function/namespace mutation
- [ ] make builtin installation idempotent

Exit Criteria:

- [ ] repeated snapshot reads reuse cached snapshot until registry mutation
- [ ] repeated compiler creation does not rewrite builtin registry state redundantly

### Phase 2 - Leaf Evaluation And Dependency Collection

Status: planned
Targets: `evaluate.ts`, `scope.ts`

- [ ] remove leaf-path eval-context spread where possible
- [ ] reduce collector allocation churn while preserving dependency semantics

Exit Criteria:

- [ ] leaf evaluation no longer allocates a fresh spread context object each time
- [ ] dependency collection semantics remain correct under focused tests

### Phase 3 - Lookup And Hot Helper Cleanup

Status: planned
Targets: `evaluator.ts`, `lexer.ts`

- [ ] merge frame-chain lookup into one pass
- [ ] hoist imported-function regex and lexer regex helpers
- [ ] optimize common single-parameter arrow-function frame construction

Exit Criteria:

- [ ] frame lookup no longer walks the same frame chain twice
- [ ] audited regex helpers are no longer recreated in hot loops
- [ ] common arrow-function path avoids avoidable frame-construction churn

### Phase 4 - Focused Verification And Docs Sync

Status: planned
Targets: tests, `docs/analysis/2026-04-16-performance-audit.md`, `docs/logs/`

- [ ] add/update focused tests for registry invalidation, dependency collection, and lambda execution behavior
- [ ] reverse-update audit/log text

Exit Criteria:

- [ ] focused tests cover all contract-sensitive hot-path changes
- [ ] docs reflect the new formula baseline

## Validation Checklist

- [ ] registry snapshot cache landed
- [ ] builtin installation idempotence landed
- [ ] leaf spread allocation removed
- [ ] collector churn reduced without semantic regression
- [ ] frame lookup single-pass landed
- [ ] regex hot helpers hoisted
- [ ] focused verification completed
- [ ] independent closure-audit completed and recorded
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: complete this section only after all confirmed formula hot-path defects in scope are closed and the `try/catch` benchmark candidate remains explicitly out of scope.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- if profiling later justifies `try/catch` extraction, create a measured successor plan
