# MG — Guard 激活与知识沉淀

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` MG; MR1–MR4 failure patterns
> Related: MV full verification (prerequisite)
> Mission: audit-remediation

## Purpose

Prevent regression by activating organizational guards: record new failure modes as lessons, update project context, and publish known failure detection patterns to skills. After this plan completes, the audit-remediation closed-loop is fully closed — the workspace is production-green and the team can detect or prevent each fixed pattern going forward.

## Current Baseline

- MV prerequisite: not yet completed (roadmap shows `todo`). Plan execution requires MV verification (typecheck + build + test + e2e) to pass first.
- MR1–MR3 fix plans each documented individual defect fixes.
- `docs/lessons/README.md` exists but may be empty or sparse.
- `docs/skills/README.md` lists available audit skills but may not document known false-positive/failure patterns.
- `docs/context/project-context.md` freshness: `partially stale` — last updated during M0. Needs review after all MR1–MG work.
- No "known failure mode registry" or "remediation pattern catalog" exists.

## Goals

- Extract repeatable failure patterns from MR1–MR3 fixes and audit findings → document in `docs/lessons/`.
- Update `docs/context/project-context.md` to reflect post-remediation state.
- Update `docs/skills/README.md` with known failure detection patterns and guard recommendations.
- Mark MG.1–MG.3 → `done` in roadmap.

## Non-Goals

- No code changes.
- No new audit tool creation (covered by skills).
- No re-running audits (already complete per MV).
- No redesign of CI/CD pipeline.

## Scope

### In Scope

- Review MR1–MR3 fix plans and audit reports for repeatable failure patterns.
- `docs/lessons/README.md`: add or update lessons entries. Each lesson: pattern description, how detected, how fixed, prevention guard.
- `docs/context/project-context.md`: update freshness status → `fresh`, verify all sections accurate.
- `docs/skills/README.md`: add known failure patterns section with detection method references.
- Roadmap MG milestone: MG.1, MG.2, MG.3 → `done`.

### Out Of Scope

- Creating new `check:audit-*` bash scripts (infrastructure).
- Creating new skill prompts (maintained separately).
- Re-running full verification (already done in MV).
- Modifying CI config or eslint rules.

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`不适用：纯文档计划，不涉及产品代码变更`

## Execution Plan

### Phase 1 — Lessons extraction

Status: planned
Targets: MR1–MR3 closure plans, MA1–MA7 audit reports, `docs/lessons/README.md`

- Item Types: `Fix` (documentation)

- [ ] Review MR1 closure plan and arm-index for repeatable patterns (e.g., BEM naming drift, async void-promise without structured error routing).
- [ ] Review MR2 closure plan for repeatable patterns (e.g., empty catch blocks, oversized files, FieldFrame bypass, raw schema reads).
- [ ] Review MR3 closure plan for repeatable patterns (e.g., hardcoded strings bypassing i18n, doc drift from live code, XSS href scheme).
- [ ] Write lessons entries: each with detection method, fix pattern, prevention guard.

Exit Criteria:

- [ ] `docs/lessons/README.md` contains ≥3 lessons entries derived from MR1–MR3 patterns.
- [ ] Each entry patterned as: `## <Pattern Name>` → detection → fix → prevention.

### Phase 2 — project-context.md refresh

Status: planned
Targets: `docs/context/project-context.md`

- Item Types: `Fix` (documentation)

- [ ] Review all sections for accuracy against live repo state.
- [ ] Update freshness from `partially stale` → `fresh` (with justification: all audit-remediation phases complete, verification green, findings tracked to closure).
- [ ] Verify verification commands still accurate.
- [ ] Verify AI Block Conditions still accurate.

Exit Criteria:

- [ ] `project-context.md` freshness: `fresh`.
- [ ] All factual claims verified against live repo.

### Phase 3 — skills/README.md update

Status: planned
Targets: `docs/skills/README.md`

- Item Types: `Fix` (documentation)

- [ ] Review current `docs/skills/README.md` for known failure pattern section existence.
- [ ] Add "Known Failure Detection Patterns" section: reference each lesson entry with detection method.
- [ ] Add guard recommendations: CI hooks, lint rules, or script additions that would catch each pattern.

Exit Criteria:

- [ ] `docs/skills/README.md` has a "Known Failure Detection Patterns" section.
- [ ] Each pattern references the corresponding lesson and detection method.

### Phase 4 — Roadmap closure

Status: planned
Targets: `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Fix`

- [ ] Update roadmap Phase Status: MG → `done`.
- [ ] Verify all preceding milestones (M0–MV) are `done`.
- [ ] Update arm-index: MG → `done`.

Exit Criteria:

- [ ] Roadmap: MG → `done`.
- [ ] arm-index Phase/Milestone Index: MG → `done`.
- [ ] All audit-remediation milestones consistently `done`.

## Draft Review Record

> 由独立子 agent 填写。

- Reviewer / Agent: MISSION_DRIVER (fresh session)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - Major: Current Baseline misstated MV status as "verification complete" when roadmap shows MV is `todo` — fixed to accurately state MV is a pending prerequisite.
  - Minor: Test Strategy format aligned with template (added `本档选择：` line).

## Closure Gates

- [ ] `docs/lessons/README.md` updated with ≥3 MR-derived lessons.
- [ ] `docs/context/project-context.md` freshness updated to `fresh`.
- [ ] `docs/skills/README.md` updated with known failure detection patterns.
- [ ] Roadmap: MG → `done`.
- [ ] arm-index: MG → `done`.
- [ ] No stale or contradictory documentation remains.
- [ ] Closure audit by independent sub-agent (fresh session) completed.

## Deferred But Adjudicated

_None — all items are documentation updates with no prerequisites beyond MV._

## Non-Blocking Follow-ups

- Future: consider adding `check:audit-*` scripts for patterns discovered in lessons (infrastructure, not scope of this plan).
- Future: consider integrating `eslint-plugin-deprecation` for `@deprecated` CI guard (MA72-P2-001 deferred item).

## Closure

Status Note: _待完成时填写_

Closure Audit Evidence:

- Auditor / Agent:
- Evidence:

Follow-up:

- No remaining audit-remediation work. All milestones (M0 → MG) complete.
