# 298 Deep Audit 2026-05-15 Doc Governance Drift Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/{16-doc-code-consistency.md,18-cross-package.md}`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `docs/plans/285-deep-audit-2026-05-14-plan-baseline-normalization-plan.md`

## Purpose

收口当前仍需要修改或需要最终 live re-audit 裁定的 governance drift：`AGENTS.md` 的 repo-level package 结构约定脱节，以及 retained `16-06` 的历史 plan 文本一致性裁定。

## Current Baseline

- 2026-05-15 审计把 `16-06` 保留为 live finding，指向 `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` 的 phase / exit-criteria consistency drift。
- 当前 live repo 中，Plan `282` 已显示为 fully completed and internally consistent；因此 `16-06` 的 active work 不是继续修 Plan `282`，而是由本计划负责完成最终 live re-audit、记录 retained-item 状态变化，并避免该 retained ID 变成 ownerless gap。
- `18-01` 仍 live as P2：`AGENTS.md` 对 package `src/index.ts` / `index.test.ts` 的统一约定已与 live 多包形态脱节。
- 当前 plan-owned governance work 包含两类：`16-06` 的 live-baseline re-audit / disposition record，以及 `18-01` 的真实文本修正。

## Goals

- Resolve retained `16-06` to one honest current-baseline outcome: either record that Plan `282` is now consistent on the live baseline or land the minimal text fix if the inconsistency still exists.
- Close retained `18-01` on a supported governance-doc baseline.
- Make repo-level package conventions match the live repo truth.

## Non-Goals

- 不回写其它已完成历史计划，除非本计划明确拥有该文本修正。
- 不改动任何 package 实现代码。

## Scope

### In Scope

- `16-06`
- `18-01`
- `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` for live-baseline re-audit only, and text repair only if the inconsistency is still real
- `AGENTS.md`
- `docs/logs/2026/05-15.md`

### Out Of Scope

- Plan `285` already-owned historical normalization files (`132`, `108`, `159`)
- any retained ID not listed above

## Execution Plan

### Phase 1 - Re-Audit Historical Plan Consistency And Align Repo Conventions

Status: completed
Targets: `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `AGENTS.md`

- Item Types: `Fix | Proof | Decision`

- [x] Re-audit retained `16-06` against the live `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` text and record whether the inconsistency is already closed or still needs a minimal text repair.
- [x] If `16-06` remains live, land the minimal Plan `282` text fix needed to make plan status, exit criteria, closure gates, and closure evidence consistent; otherwise record in this plan that the retained item is no longer live on the current baseline.
- [x] Fix `18-01` so repo-level package structure guidance matches the current live baseline for `src/index.tsx` and distributed test layouts.
- [x] Keep the guidance normative and final-state oriented instead of documenting migration history.
- [x] Update `docs/logs/2026/05-15.md` with the normalization evidence.

Exit Criteria:

- [x] Retained `16-06` and `18-01` are each either fixed in live text or proven no longer live on the current baseline, with the disposition recorded in this plan before closure.
- [x] `AGENTS.md` package-structure guidance matches live repo reality without contradictory template claims.
- [x] No owner-doc update required beyond the touched governance files themselves.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

Phase Notes:

- Live re-audit confirmed retained `16-06` is no longer live on the current baseline. `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` already presents completed status, consistent phase/checklist state, and non-pending closure evidence, so this plan records the retained item as resolved by current-baseline proof rather than by a new text repair.
- `18-01` was live and is now fixed in `AGENTS.md`: the repo-level package structure guidance now allows `src/index.ts` or `src/index.tsx` and recognizes colocated `*.test.ts` / `*.test.tsx` plus `src/__tests__/` layouts instead of the stale single-shape template wording.
- No owner-doc update was required beyond `AGENTS.md`, this plan, and `docs/logs/2026/05-15.md` because the work is governance-text convergence only.

### Phase 2 - Independent Closure Audit

Status: completed
Targets: touched docs, this plan, `docs/logs/2026/05-15.md`

- Item Types: `Proof | Fix | Decision`

- [x] Re-read `docs/plans/00-plan-authoring-and-execution-guide.md` and verify the final text against it.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, the guide, and all touched governance files.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Independent closure audit confirms no remaining plan-owned governance blocker.
- [x] All touched governance files and `docs/logs/2026/05-15.md` are updated.
- [x] No owner-doc update required beyond the touched governance files themselves.

Phase Notes:

- Independent closure audit passed via subagent `ses_1d63ba1ebffelrF4OU6rYcg1cz`, which re-read the plan-authoring guide, this plan, `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `AGENTS.md`, and `docs/logs/2026/05-15.md`.
- The audit confirmed there is no remaining in-scope governance blocker: retained `16-06` is no longer live on the current baseline, retained `18-01` is fixed in `AGENTS.md`, and the plan/log text is now consistent with that disposition.

## Closure Gates

- [x] All in-scope governance drifts (`16-06`, `18-01`) are fixed or explicitly proven no longer live on the current baseline in this plan.
- [x] No in-scope confirmed governance drift is silently deferred.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] All touched governance text is guide-consistent and live-baseline-aligned.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. Retained `16-06` is proven no longer live on the current baseline, retained `18-01` is fixed in `AGENTS.md`, and independent closure audit confirmed no remaining plan-owned governance blocker.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d63ba1ebffelrF4OU6rYcg1cz`
- Evidence: Re-read the plan-authoring guide, this plan, `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md`, `AGENTS.md`, and `docs/logs/2026/05-15.md`. Confirmed Plan `282` is already internally consistent on the live baseline, so retained `16-06` is not live anymore; confirmed `AGENTS.md` now matches the real package/test layouts (`src/index.ts` or `src/index.tsx`, colocated `*.test.*` or `__tests__/`); and found no remaining in-scope governance blocker after the plan/log sync.

Follow-up:

- None currently.
