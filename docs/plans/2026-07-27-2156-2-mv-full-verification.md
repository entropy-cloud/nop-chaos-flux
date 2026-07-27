# MV — 全量验证与回归

> Plan Status: active
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

Status: planned
Targets: workspace root

- Item Types: `Proof`

- [ ] Run `pnpm typecheck` — record exit code, pass count.
- [ ] Run `pnpm build` — record exit code, pass count.
- [ ] Run `pnpm lint` — record exit code.
- [ ] Run `pnpm test` — record exit code, pass/fail/skip counts.
- [ ] Run `pnpm test:e2e` — sample; record results.

Exit Criteria:

- [ ] `pnpm typecheck`: 58/58 pass (≥ M0 baseline).
- [ ] `pnpm build`: 31/31 pass (≥ M0 baseline).
- [ ] `pnpm lint`: 31/31 pass.
- [ ] `pnpm test`: ≥ 56/58 pass (≥ M0 baseline).
- [ ] If any regression found: regression `Fix` items created in follow-up.

### Phase 2 — Audit tool baseline comparison

Status: planned
Targets: arm-index.md Audit Tool Baseline section

- Item Types: `Proof`

- [ ] Run all `check:audit-*` scripts; compare each value against M0 row.
- [ ] Run `pnpm audit:deps`; compare against M0 row.
- [ ] Run `pnpm audit:knip`; compare against M0 row.
- [ ] Document any delta with explanation (expected reduction, regression, unchanged).

Exit Criteria:

- [ ] All `check:audit-*` values re-recorded with new run date.
- [ ] No unexplained value exceeds M0 baseline.
- [ ] Any regression item documented.

### Phase 3 — arm-index integrity & milestone closure

Status: planned
Targets: `docs/audits/arm-index.md`, `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Proof` | `Fix`

- [ ] Verify arm-index P0/P1/P2 Finding Index: no `open` P0 or P1 finding remains.
- [ ] Verify arm-index Phase/Milestone Index: MV status → `done`.
- [ ] Update roadmap MV milestone: MV.1, MV.2, MV.3 → `done`.
- [ ] If integrity found lacking (e.g., stale `open` findings): fix or document.

Exit Criteria:

- [ ] arm-index: no `open` P0/P1 finding.
- [ ] arm-index Audit Tool Baseline: all scripts re-run and dated.
- [ ] Roadmap: MV.1–MV.3 → `done`.
- [ ] All regression items either fixed or properly adjudicated.

## Draft Review Record

- Reviewer / Agent: `mv-full-verification-review` (fresh sub-agent session, 2026-07-28)
- Verdict: `pass`
- Rounds: 1
- Findings addressed: Corrected `check:audit-*` count from 11→12 to match arm-index.md Audit Tool Baseline. No Blocker or Major issues.

## Closure Gates

- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` passes.
- [ ] `pnpm lint` passes.
- [ ] `pnpm test` passes (≥ M0 baseline).
- [ ] `pnpm test:e2e` — results recorded.
- [ ] All `check:audit-*` and `pnpm audit:*` baselines verified — no unexplained regressions.
- [ ] arm-index: no `open` P0/P1 finding.
- [ ] Roadmap: MV.1–MV.3 → `done`.
- [ ] Regression items (if any) properly documented with resolution or adjudication.
- [ ] Closure audit by independent sub-agent (fresh session) completed.

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

Status Note: _待完成时填写_

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- MG guard activation.
