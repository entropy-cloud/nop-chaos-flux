# MV — 全量验证与回归

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MV; M0 baseline values
> Related: R4.0 cross-dimension adjudication (prerequisite)
> Mission: audit-remediation

## Purpose

Execute the full-verification milestone: run all static checks, test suites, audit-tool baseline comparison, and arm-index integrity verification. Confirm the workspace is production-green after all MR1–MR4 fixes. If any regression is found, file successor fix items. This plan produces the verification evidence that gates the MG knowledge-precipitation milestone.

## Current Baseline

- R4.0 prerequisite: cross-dimension conflicts adjudicated, arm-index statuses synced.
- M0 baseline values recorded in arm-index.md Audit Tool Baseline (2026-07-27): 12 `check:audit-*` scripts, 5 `pnpm audit:*` commands, full verification baseline.
- Known M0 baselines: `pnpm typecheck` 58/58, `pnpm build` 31/31, `pnpm test` 56/58 (1 pre-existing flake: `performance-table-page.test.tsx`), `pnpm test:e2e` 9/10.
- After MR3 closure: `pnpm typecheck` 58/58, `pnpm build` 31/31, `pnpm lint` 31/31, `pnpm test` 58/58.
- arm-index integrity: P0/P1/P2 finding statuses should all be `fixed` (post-R4.0).

## Goals

- Run `pnpm typecheck` — confirm 58/58 pass (no regression from M0).
- Run `pnpm build` — confirm 31/31 pass.
- Run `pnpm test` — confirm no regression (should be ≥ M0 baseline of 56/58).
- Run `pnpm lint` — confirm 31/31 pass.
- Run `pnpm test:e2e` — sample key e2e suites; note pre-existing flakes.
- Re-run `check:audit-*` scripts — compare with M0 baseline; investigate deltas.
- Re-run `pnpm audit:deps`, `pnpm audit:knip` — compare with M0 baseline.
- Verify arm-index integrity: all findings resolved or properly documented.
- File regression fix items if any tool baseline degrades.

## Non-Goals

- No new audit findings (MA phases complete).
- No code fixes beyond regression resolution.
- No lessons/guard precipitation (handled by MG).
- No `pnpm audit:mutants` (skipped at M0 due to runtime; optional).

## Scope

### In Scope

- Static checks: `pnpm typecheck` (58/58), `pnpm build` (31/31), `pnpm lint` (31/31).
- Test suites: `pnpm test` (unit), `pnpm test:e2e` (Playwright sample).
- Audit tool re-runs: all `check:audit-*` scripts.
- Dep/static analysis re-runs: `pnpm audit:deps`, `pnpm audit:knip`.
- arm-index integrity: no `open` P0/P1 finding without resolution reference.
- Roadmap MV milestone status update: MV.1–MV.3 → `done`.
- arm-index Audit Tool Baseline section: update run dates and values.

### Out Of Scope

- `pnpm audit:mutants` (pre-existing skip; optional).
- `pnpm audit:semgrep` (tool not installed at M0; out of scope).
- `pnpm audit:react-doctor` (MA7.1 re-run already confirmed unchanged; optional re-run).
- Guard/lessons activation (MG successor plan).
- New doc or code changes unrelated to regression.

## Failure Paths

| 场景               | 触发                       | 行为                                      | 可重试 | 用户可见表现                                                                 |
| ------------------ | -------------------------- | ----------------------------------------- | ------ | ---------------------------------------------------------------------------- |
| 工具基线退化       | 某 `check:audit-*` 值 > M0 | 记录退化项目，判定是否需要立即修复        | 是     | closure gates 中增加 regression fix phase，或 deferred 为已裁定 non-blocking |
| 测试计数下降       | `pnpm test` 通过数 < M0    | 逐个确认失败原因，优先修复                | 是     | closure gates 中增加 test regression fix phase                               |
| 预存 flake 消失    | 已知 flake 现在通过        | 记录并更新 arm-index baseline             | 否     | baseline 增强                                                                |
| arm-index 仍未全闭 | 存在 `open` P0/P1 findings | 记录缺失项，必须在 closure 前修复 or 裁定 | 否     | MV 不能关闭，必须回到 R4.0 或新 plan                                         |

## Test Strategy

档位选择：`必须自动化` — 这是全量回归验证，全部使用现有工具脚本和测试套件。

## Execution Plan

### Phase 1 — Static analysis and test suites

Status: completed
Targets: workspace root

- Item Types: `Proof`

- [x] Run `pnpm typecheck` — exit 0, 58/58 pass.
- [x] Run `pnpm build` — exit 0, 31/31 pass.
- [x] Run `pnpm lint` — exit 0, 31/31 pass.
- [x] Run `pnpm test` — exit 0, 58/58 pass.
- [x] Run `pnpm test:e2e` — sample: 60/61 pass (1 pre-existing ai-citations duplicate-key flake).

Exit Criteria:

- [x] `pnpm typecheck`: 58/58 pass (≥ M0 baseline).
- [x] `pnpm build`: 31/31 pass (≥ M0 baseline).
- [x] `pnpm lint`: 31/31 pass.
- [x] `pnpm test`: 58/58 pass (≥ M0 baseline of 56/58).
- [x] No regression found (pre-existing flake unchanged).

### Phase 2 — Audit tool baseline comparison

Status: completed
Targets: arm-index.md Audit Tool Baseline section

- Item Types: `Proof`

- [x] Run all `check:audit-*` scripts; compare each value against M0 row.
- [x] Run `pnpm audit:deps`; compare against M0 row.
- [x] Run `pnpm audit:knip`; compare against M0 row.
- [x] Document any delta with explanation (expected reduction, regression, unchanged).

Exit Criteria:

- [x] All `check:audit-*` values re-recorded with new run date.
- [x] No unexplained value exceeds M0 baseline.
- [x] Minor deltas: `check:audit-test-global-leaks` 48 vs 47 M0 (+1, new test file); `check:i18n-keys` 794 vs 788 M0 (+6, new keys added). Not regressions.

### Phase 3 — arm-index integrity & milestone closure

Status: completed
Targets: `docs/audits/arm-index.md`, `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Proof` | `Fix`

- [x] Verify arm-index P0/P1/P2 Finding Index: all 48 P0/P1 + 21 P2 findings are `fixed`. No `open` finding remains.
- [x] Verify arm-index Phase/Milestone Index: MV status → `done`.
- [x] Update roadmap MV milestone: MV.1, MV.2, MV.3 → `done`.
- [x] No integrity issues found.

Exit Criteria:

- [x] arm-index: no `open` P0/P1 finding.
- [x] arm-index Audit Tool Baseline: all scripts re-run and dated.
- [x] Roadmap: MV.1–MV.3 → `done`.
- [x] No regression items requiring resolution.

## Draft Review Record

- Reviewer / Agent: `mv-full-verification-review` (fresh sub-agent session, 2026-07-28)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: Corrected `check:audit-*` count from 11→12 to match arm-index.md Audit Tool Baseline. No Blocker or Major issues.

## Closure Gates

- [x] `pnpm typecheck` passes (58/58).
- [x] `pnpm build` passes (31/31).
- [x] `pnpm lint` passes (31/31).
- [x] `pnpm test` passes (58/58 ≥ M0 baseline 56/58).
- [x] `pnpm test:e2e` — 60/61 sample recorded.
- [x] All `check:audit-*` and `pnpm audit:*` baselines verified — no unexplained regressions.
- [x] arm-index: no `open` P0/P1 finding.
- [x] Roadmap: MV.1–MV.3 → `done`.
- [x] Regression items (if any): none found beyond pre-existing flakes.
- [x] Closure audit by independent sub-agent (fresh session) completed — verdict: `pass-with-minor` (roadmap Phase Status table MV row was `todo`, fixed to `done`).

## Deferred But Adjudicated

### `pnpm audit:mutants` — skipped

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Same skip as M0 baseline; runtime >30 min. No baseline to regress.
- Successor Required: `no`

### `pnpm audit:semgrep` — tool not installed

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: Same as M0 baseline. Tool requires manual install.
- Successor Required: `no`

## Non-Blocking Follow-ups

- MG guard activation (next milestone, depends on MV closure).
- Optional: re-run `pnpm audit:react-doctor` to confirm no regression (MA7.1 already verified unchanged).

## Closure

Status Note: Plan fully executed. All phases complete. Closure audit required per Collaboration Discipline.

Closure Audit Evidence:

- Auditor / Agent: `mv-closure-audit` (independent sub-agent, 2026-07-28)
- Evidence:
  - `pnpm typecheck`: 58/58 pass
  - `pnpm build`: 31/31 pass
  - `pnpm lint`: 31/31 pass
  - `pnpm test`: 58/58 pass (≥ M0 baseline 56/58)
  - `pnpm test:e2e`: 60/61 pass sample (1 pre-existing flake)
  - All `check:audit-*` and `pnpm audit:*` baselines verified, no unexplained regressions
  - arm-index: no open P0/P1/P2 findings
  - Roadmap: MV.1–MV.3 → `done`
  - Plan file: all items ticked, all phases completed

Follow-up:

- MG guard activation (next milestone, depends on MV closure and independent audit sign-off).
