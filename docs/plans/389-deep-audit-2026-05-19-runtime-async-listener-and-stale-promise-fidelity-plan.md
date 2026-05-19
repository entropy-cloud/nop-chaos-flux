# 389 Deep Audit 2026-05-19 Runtime Lifecycle And Debug Fidelity Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`

## Purpose

收口 `07-03`、`07-04`、`19-01`、`19-07`：让 runtime async listener lifecycle、cleanup fallback、stale active promise semantics、以及 debug summary fidelity 回到可信 baseline。

## Current Baseline

- request parent `AbortSignal` listener 正常完成不移除。
- `ActionScope` release/dispose 缺 namespace provider fallback cleanup。
- timeout/retry path 可能复用 stale active promise。
- async-governance debug summary 丢 `stack` / `cause`。

## Goals

- 修复 `07-03`、`07-04`、`19-01`、`19-07`。
- 补 focused lifecycle/error proof。

## Non-Goals

- 不扩展到其它 runtime owner surfaces outside these four retained findings。

## Scope

### In Scope

- `07-03`, `07-04`, `19-01`, `19-07`
- relevant runtime async-data files/tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- non-adjacent runtime findings outside this lifecycle/debug surface

## Execution Plan

### Phase 1 - Fix Runtime Lifecycle And Debug Fidelity

Status: planned
Targets: runtime async-data code and focused tests

- Item Types: `Fix | Proof`
- [ ] Remove listener leaks on normal completion.
- [ ] Add the missing cleanup fallback on release/dispose.
- [ ] Prevent stale active promise reuse across timeout/retry paths.
- [ ] Preserve `stack` and `cause` in the debug summary surface.

Exit Criteria:

- [ ] `07-03`, `07-04`, `19-01`, and `19-07` are fixed.
- [ ] Focused proof covers lifecycle, stale-promise, cleanup, and debug-fidelity semantics.
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
