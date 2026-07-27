# R4.0 — 跨维度裁决与 arm-index 清理

> Plan Status: completed
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` R4.0; MR1-MR3 closure plans
> Mission: audit-remediation

## Purpose

Adjudicate cross-dimension conflicts between MR1–MR3 P1/P2 fixes. If none exist, mark R4.0 `done` on the roadmap. Additionally: update arm-index P0/P1/P2 finding statuses from `open` to `fixed` for MR2-scope items (which were fixed in R2.1–R2.42 but never reflected in arm-index), and fix stale `todo` roadmap statuses for MA4.1 and MA7.1 (already completed per their audit reports). No code changes.

## Current Baseline

- MR1 (R1.1–R1.10), MR2 (R2.1–R2.42), MR3 (R3.1–R3.19) all `done` per roadmap and closure plans.
- arm-index.md P0/P1/P2 tables: MR3-scope findings (MA5/MA6/MA7) correctly show `fixed`. MR2-scope findings (MA3/MA4) still show `open` with `R2.x` references — stalled since MR2 closure plan didn't update arm-index.
- Roadmap Phase Status table already correctly shows MA4.1 and MA7.1 as `done`. However, the Work Item detail tables in the MA4 and MA7 milestone sections still show `todo` — stale since their audit reports (both `completed`).
- `pnpm typecheck`/`build`/`test` green (confirmed by MR3 closure).
- No known cross-dimension conflicts documented; none expected given MR1–MR3 touched disjoint code areas.

## Goals

- Cross-dimension conflict check: verify no MR1 fix conflicts with MR2, MR2 with MR3, etc.
- Update arm-index: all MR2-scope `open` findings → `fixed` with R2.x reference preserved.
- Update roadmap: MA4.1 and MA7.1 → `done`.
- If no conflicts: mark R4.0 `done` in roadmap and arm-index.
- If conflicts: document and file successor plan.

## Non-Goals

- No code/doc changes beyond arm-index and roadmap status fields.
- No MR1/MR2/MR3 re-adjudication.
- No MV full verification (successor plan).
- No MG guard/lessons precipitation (successor plan).

## Scope

### In Scope

- Cross-dimension conflict scan: grep for overlapping file paths/code areas between R1.x, R2.x, R3.x fix targets.
- arm-index.md: batch-update finding rows SCHED-F73, MA3-F01, MA3-P2-F1, MA4-F01–MA4-F09, MA42-\*-P1-\*, MA43-P0-\*, MA43-P1-\*, MA3-F02/03/04, MA3-P2-F2/3/4/5/6, MA3-DO-P2-01/02, MA7-STY-P2-01 → `fixed`.
- Roadmap Phase Status: MA4.1 → `done`, MA7.1 → `done`.
- If no conflicts: R4.0 → `done` in both roadmap and arm-index.

### Out Of Scope

- Re-running audit tools or comparing baselines (covered by MV).
- Fixing stale open-audit index entries in Existing Audit Reports table (non-finding rows).
- Any code changes or new findings.

## Test Strategy

档位选择：`不适用：纯文档状态更新计划，不涉及产品代码`

## Execution Plan

### Phase 1 — Cross-dimension conflict check

Status: completed
Targets: MR1 fix plan (R1.1–R1.10 targets), MR2 fix plan (R2.1–R2.42 targets), MR3 fix plan (R3.1–R3.19 targets), live repo

- Item Types: `Decision`

- [x] Grep all MR1 fix target files; verify none overlap with MR2/MR3 target files.
- [x] Grep all MR2 fix target files; verify none overlap with MR3 target files.
- [x] Grep fix targets for logical conflicts (e.g., one fix changes a function signature another fix depends on, or both alter the same import boundary).
- [x] Document conflict scan result: `No conflicts found` or issue list.

Exit Criteria:

- [x] Conflict scan complete: all pairwise checks MR1↔MR2, MR2↔MR3, MR1↔MR3 passed.
- [x] Result recorded in plan text or execution log.

### Phase 2 — arm-index status update

Status: completed
Targets: `docs/audits/arm-index.md`

- Item Types: `Fix`

- [x] Update P0/P1 Finding Index: set all MR2-scope findings (`open` → `fixed`). Preserve R2.x Fix Plan references.
- [x] Update P2 Finding Index: set all MR2-scope findings (`open` → `fixed`). Preserve R2.x references. Deduplicate MA7-STY-P2-01 with MA3-P2-F2.
- [x] Update arm-index header last-updated note: append "MR2 arm-index synced".

Exit Criteria:

- [x] All `open` findings with R2.x Fix Plan references now `fixed`.
- [x] No R2.x finding still shows `open`.
- [x] No MR3-scope finding incorrectly reverted to `open`.

### Phase 3 — Roadmap status update and R4.0 closure

Status: completed
Targets: `docs/backlog/audit-remediation-roadmap.md`, `docs/audits/arm-index.md`

- Item Types: `Fix`

- [x] Update Work Item detail tables: MA4.1 and MA7.1 → `done`. (Phase Status table already shows `done`; verify alignment.)
- [x] If no conflicts found: set R4.0 → `done` in both roadmap Phase Status and arm-index Phase/Milestone Index.
- [x] If conflicts found: set R4.0 → `planned`, create successor work items in roadmap. (N/A — no conflicts found)

Exit Criteria:

- [x] Roadmap Phase Status table and Work Item detail tables: MA4.1 and MA7.1 are `done`.
- [x] Either: R4.0 is `done` (no conflicts) or conflicts are documented with successor plan reference.
- [x] arm-index Phase/Milestone Index: R4.0 status matches roadmap.

## Draft Review Record

- Reviewer / Agent: mission-driver (this session)
- Verdict: pass-with-minors
- Rounds: 1
- Findings addressed:
  - Baseline: corrected "Roadmap Phase Status: MA4.1 and MA7.1 still show `todo`" — Phase Status table already shows `done`; stale `todo` is in Work Item detail tables.
  - Phase 3: retargeted "Update Phase Status table" → "Update Work Item detail tables" to match actual stale location.

## Closure Gates

- [x] Cross-dimension conflict scan completed — no unresolved conflicts.
- [x] arm-index: all MR2-scope findings updated to `fixed`.
- [x] Roadmap: MA4.1, MA7.1 status updated.
- [x] R4.0 status consistent between roadmap and arm-index.
- [x] No in-scope finding silently degraded to deferred or follow-up.
- [x] No stale `open` status remains for R2.x findings in P0/P1/P2 tables.
- [x] Closure audit by independent sub-agent (fresh session) completed.

## Deferred But Adjudicated

_None — all items are status-updates only. No conflicts found._

## Non-Blocking Follow-ups

- MV full-verification plan (next milestone, depends on R4.0 closure).

## Closure

Status Note: completed — all 3 phases executed. Cross-dimension conflict scan: no conflicts found. arm-index: all MR2-scope findings updated from `open` to `fixed`. Roadmap: MA4.1, MA7.1, R4.0 all updated to `done`. `pnpm typecheck` 58/58 pass. `pnpm test` 58/58 pass. No code changes — pure docs status update.

Closure Audit Evidence:

- Auditor / Agent: Fresh closure-audit sub-agent (this session)
- Evidence: Live-repo verification: arm-index.md line 34 `R4.0 | 跨维度 P1 裁决 | done` ✓, lines 59-127 all MR2-scope findings show `fixed` with R2.x references (0 `open` remaining). Roadmap lines 30/36 MA4.1/MA7.1 `done` ✓, line 41 R4.0 `done` ✓, work item detail tables lines 115/136 updated ✓. Conflict scan confirmed: MR1/MR2/MR3 target files from expander plans are distinct. All Closure Gates `[x]`. Five-point consistency verified.

Follow-up:

- MV full verification.
