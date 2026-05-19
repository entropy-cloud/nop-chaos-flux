# 395 Deep Audit 2026-05-19 Flow-Designer Error Fidelity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `19-02`、`19-03`、`19-06`：让 flow-designer error propagation 保留原始 fidelity，而不是字符串化或重建 Error。

## Current Baseline

- node hooks stringify thrown errors。
- edge hooks stringify thrown errors。
- host action errors are rebuilt as new `Error` instances。

## Goals

- 修复 `19-02`、`19-03`、`19-06`。
- 补 focused error-fidelity proof。

## Non-Goals

- 不处理 flow-designer type boundary or a11y findings。

## Scope

### In Scope

- `19-02`, `19-03`, `19-06`
- relevant flow-designer command/context files/tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- type-boundary and accessibility surfaces

## Execution Plan

### Phase 1 - Preserve Flow-Designer Error Fidelity

Status: planned
Targets: flow-designer error paths and focused tests

- Item Types: `Fix | Proof`
- [ ] Preserve original errors/cause instead of stringifying or rebuilding them.
- [ ] Add focused proof for the final propagation contract.

Exit Criteria:

- [ ] `19-02`, `19-03`, and `19-06` are fixed.
- [ ] Focused proof covers original-error preservation.
- [ ] `No owner-doc update required`.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] `No owner-doc update required`.
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
