# 399 Deep Audit 2026-05-19 Compiler Diagnostic Fidelity Plan

> Plan Status: planned
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

Status: planned
Targets: compiler diagnostic code, tests, owner doc

- Item Types: `Fix | Proof`
- [ ] Preserve original compile failure detail instead of collapsing to static strings.
- [ ] Preserve union branch failure reasons in diagnostics.
- [ ] Update `docs/architecture/flux-core.md` if the supported diagnostic contract needs sync.

Exit Criteria:

- [ ] `19-04` and `19-05` are fixed.
- [ ] Focused proof covers the final diagnostic output.
- [ ] `docs/architecture/flux-core.md` is updated, or `No change required` is explicitly adjudicated.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
