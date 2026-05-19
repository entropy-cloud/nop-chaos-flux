# 400 Deep Audit 2026-05-19 Test Harness Reliability Plan

> Plan Status: partially completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-deep-audit-full/summary.md`, `docs/analysis/2026-05-19-open-ended-adversarial-review-01/round-01.md`, `docs/plans/371-deep-audit-2026-05-19-owner-routing-plan.md`, `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`

## Purpose

收口 `14-06`、`14-07`、`14-08`、`14-09` 以及 open-ended finding `R01-04`：让 test harness cleanup / zero-error proof discipline 回到可信 baseline。

## Current Baseline

- word-editor action tests lack failure-safe spy restore。
- `flux-basic` E2E lacks explicit zero-error gate。
- `FileReader` global stub is not unstubbed。
- console spy restore lacks failure-safe cleanup。
- shared E2E fixture gate still globally suppresses real `WebSocket connection` failures (`R01-04`)。

## Goals

- 修复 `14-06` 至 `14-09` 以及 `R01-04`。
- 恢复 test cleanup and zero-error proof discipline。

## Non-Goals

- 不重构 unrelated tests beyond reliability cleanup.

## Scope

### In Scope

- `14-06`, `14-07`, `14-08`, `14-09`, `R01-04`
- relevant unit/e2e tests
- `docs/logs/2026/05-19.md`

### Out Of Scope

- suite decomposition findings owned by other plans

## Execution Plan

### Phase 1 - Restore Test Reliability Discipline

Status: in progress
Targets: affected tests and focused proof

- Item Types: `Fix | Proof`
- [x] Add failure-safe cleanup for spies/stubs.
- [x] Add the explicit zero-error gate for the affected E2E surface.
- [ ] Stop globally suppressing real `WebSocket connection` failures in shared E2E entry paths, or replace the suppression with a targeted, honest gate.

Exit Criteria:

- [ ] `14-06` through `14-09` and `R01-04` are fixed.
- [ ] Focused proof covers cleanup, zero-error discipline, and the final shared error-gate behavior.
- [x] `No owner-doc update required`.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [x] `No owner-doc update required`.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Original `14-06` through `14-09` implementation and focused proof landed, but the plan was later widened to honestly own open-ended finding `R01-04`. The plan therefore remains in progress until the shared E2E error-gate suppression is corrected, then still needs independent closure audit plus repo-level `pnpm typecheck` / `pnpm build`, both currently blocked by a pre-existing Turborepo cycle between `@nop-chaos/flux-react` and `@nop-chaos/flux-renderers-basic`.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: Focused proof passed in `packages/word-editor-renderers` (`2` files / `14` tests), `packages/flux-react` targeted cleanup coverage (`4` files / `35` tests), Playwright `tests/e2e/flux-basic-row-inspect.spec.ts` (`1` test), and workspace `pnpm lint`. `pnpm typecheck` / `pnpm build` are presently blocked by the pre-existing Turborepo cycle noted above.
