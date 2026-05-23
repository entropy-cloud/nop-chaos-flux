# 399 Deep Audit 2026-05-19 Compiler Diagnostic Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `19-04` 与 `19-05`：让 compiler diagnostics 保留真实 compile/branch failure information。

## Current Baseline

- formula compile errors are downgraded to static strings。
- union value-shape diagnostics drop branch failure details。

## Goals

- 修复 `19-04` 与 `19-05`。
- 同步 compiler diagnostic docs if needed。

## Non-Goals

- 不处理 runtime or flow-designer error fidelity。

## Scope

### In Scope

- `19-04`, `19-05`
- relevant compiler/formula files/tests
- `docs/architecture/flux-core.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- non-compiler error surfaces

## Execution Plan

### Phase 1 - Preserve Compiler Diagnostic Fidelity

Status: completed
Targets: compiler diagnostic code, tests, owner doc

- Item Types: `Fix | Proof`
- [x] Preserve original compile failure detail instead of collapsing to static strings.
- [x] Preserve union branch failure reasons in diagnostics.
- [x] Update `docs/architecture/flux-core.md` if the supported diagnostic contract needs sync.

Exit Criteria:

- [x] `19-04` and `19-05` are fixed.
- [x] Focused proof covers the final diagnostic output.
- [x] `docs/architecture/flux-core.md` is updated, or `No change required` is explicitly adjudicated.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Completed after restoring compiler diagnostic fidelity for formula compile failures and union value-shape validation. `packages/flux-formula/src/compile/compile-node.ts` now reports the original thrown error through diagnostic `cause` while keeping readable messages, `packages/flux-core/src/schema-diagnostics/index.ts` and `packages/flux-compiler/src/schema-compiler/diagnostics.ts` now preserve that `cause` on the exported schema-diagnostic surface, and `packages/flux-compiler/src/schema-compiler/flux-value-shape-validation.ts` now preserves per-branch union failure detail in emitted diagnostics.

Closure Audit Evidence:

- Reviewer / Agent: general subagent `ses_1bd3b13deffe2H2QYZd127tFnY`
- Evidence: re-audit returned `Verdict: acceptable` with no remaining in-scope semantic blocker; `19-04` owner-surface `cause` fidelity and `19-05` union branch-detail fidelity are both confirmed fixed, and the current live tree also has green `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`.
