# R2.0+R3.0 — Combined P1 Fix Expander: Code+Test + UI/UX+Doc+Security+Ops

> Plan Status: active
> Last Reviewed: 2026-07-27
> Source: `docs/backlog/audit-remediation-roadmap.md` R2.0, R3.0
> Related: MA3.1–MA3.3, MA4.1–MA4.3, MA5.1–MA5.2, MA6.1, MA7.1–MA7.2 audit plans
> Mission: audit-remediation

## Purpose

Combined expander for MR2 (code+test) and MR3 (UI/UX+doc+security+ops). Review all P0/P1/P2 findings from MA3 (Code Quality), MA4 (Test Coverage), MA5 (UI/UX), MA6 (Doc Contract), and MA7 (Security/Ops) audits; adjudicate each finding as Fix/Docs/Deferred; and expand into concrete work item rows (R2.x, R3.x) in `docs/backlog/audit-remediation-roadmap.md`.

This is an expander plan (same mechanism as R1.0) — it produces roadmap work items, not code changes.

## Current Baseline

- **MA3 (Code Quality)**: MA3.1–MA3.3 completed. arm-index lists:
  - P1: MA3-F01 (empty catch in `container-hooks.ts:87`), MA3-P2-F1 (crud-renderer.tsx:512 runtime-raw-schema-read)
  - P2: MA3-F02 (form-runtime-owner.ts 739 lines), MA3-F03 (node-compiler.ts 731 lines), MA3-F04 (shape-validation-rules.ts 706 lines), MA3-P2-F2/F3/F4/F5/F6 (mobile styling, FieldFrame bypass, copy-to-clipboard dup, picker-renderer.tsx 743 lines), MA3-DO-P2-01/02 (spreadsheet void swallow, oversized hook return)
- **MA4 (Test Coverage)**: MA4.1–MA4.3 completed. Arm-index lists:
  - P0: MA43-P0-01 through MA43-P0-05 (5 report-designer zero-coverage items)
  - P1: MA4-F01 through MA4-F09 (9 core+runtime cross-layer gaps), MA42-B-P1-01, MA42-F-P1-01/02/03, MA42-D-P1-01, MA42-C-P1-01 (6 basic/form/data/content gaps), MA43-P1-01 through MA43-P1-10 (10 designer/office gaps)
  - Pre-existing P1: AI-P1-1, AI-P1-2, SCHED-F73 (from pre-M0 audits)
- **MA5 (UI/UX)**: MA5.1–MA5.2 completed. Arm-index lists no P0/P1 — findings are P2/P3. MA5.1 produced 2 P2, MA5.2 produced 4 MEDIUM (→P2).
- **MA6 (Doc Contract)**: MA6.1 completed. Arm-index lists:
  - P1: MA6-P1-001 through MA6-P1-008 (8 doc drift findings)
- **MA7 (Security/Ops)**: MA7.1–MA7.2 completed. Arm-index lists:
  - P1: MA72-P1-001 (scheduling 7 deprecated fields missing replacement JSDoc)
  - P2: MA7-XSS-P2-01 (ai-citations href javascript:), MA7-ASYNC-P2-01 (word-editor catch unhandled)
- **arm-index** status: all findings marked `open` with `Pending MR2` or `Pending MR3` in Fix Plan column.
- **Baseline**: `pnpm typecheck`/`build`/`test` green.

## Goals

- Adjudicate all MA3+MA4+AI+SCHED findings (MR2 scope) — classify each as Fix/Docs/Deferred. Produce R2.x work items.
- Adjudicate all MA5+MA6+MA7 findings (MR3 scope) — classify each as Fix/Docs/Deferred. Produce R3.x work items.
- Append R2.x/R3.x rows to `docs/backlog/audit-remediation-roadmap.md`.
- Update `docs/audits/arm-index.md` — set `Pending MR2`/`Pending MR3` → specific R2.x/R3.x number.
- Leave no finding unadjudicated within scope.

## Non-Goals

- No code or doc changes (execution deferred to successor fix plans).
- No R1.x re-adjudication (already complete).
- No cross-dimension conflict resolution (R4.0).
- No full verification (handled by MV).

## Scope

### In Scope

- MR2 findings (MA3+MA4+pre-existing AI/Scheduling):
  - MA3: 2 P1 + 10 P2
  - MA4: 5 P0 + 25 P1 + P2 (indexed in report)
  - Pre-existing: 3 P1 (AI-P1-1, AI-P1-2, SCHED-F73)
- MR3 findings (MA5+MA6+MA7):
  - MA5: 0 P0/P1, ~6 P2
  - MA6: 8 P1 + 59 P2
  - MA7: 1 P1 + 2 P2
- Roadmap expansion: create R2.x and R3.x work item rows
- arm-index update: link findings to specific R2.x/R3.x

### Out Of Scope

- R1.x findings (already adjudicated)
- MA1/MA2 findings (already adjudicated)
- Code execution (future fix plans)
- R4.0 cross-dimension resolution

## Test Strategy

档位选择：`不适用：纯展开器计划，不修改产品代码，无行为变更`

## Execution Plan

### Phase 1 — MR2 adjudication and roadmap expansion

Status: planned
Targets: `docs/audits/arm-MA3-*-code-quality.md`, `docs/audits/arm-MA4-*-test-coverage.md`, pre-existing AI/Scheduling reports, `docs/audits/arm-index.md`, `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Decision`

For each MA3+MA4 finding (including pre-existing AI/Scheduling P1):

- [ ] Read the source audit report for full finding context
- [ ] Verify finding is still live (grep current code)
- [ ] Adjudicate as `Fix` / `Docs` / `Deferred`, with work item classification
- [ ] Assign R2.x sequential ID
- [ ] Record: fix target files, estimated size (S/M/L), dependencies

Exit Criteria:

- [ ] All MA3 P0/P1/P2 findings adjudicated and mapped to R2.x
- [ ] All MA4 P0/P1/P2 findings adjudicated and mapped to R2.x
- [ ] All pre-existing AI/Scheduling P1 findings adjudicated and mapped to R2.x
- [ ] arm-index findings updated from `Pending MR2` → specific R2.x reference
- [ ] Roadmap MR2 section populated with R2.x rows

### Phase 2 — MR3 adjudication and roadmap expansion

Status: planned
Targets: `docs/audits/arm-MA5-*-ux.md`, `docs/audits/arm-MA6-doc-contract.md`, `docs/audits/arm-MA7-*-*.md`, `docs/audits/arm-index.md`, `docs/backlog/audit-remediation-roadmap.md`

- Item Types: `Decision`

For each MA5+MA6+MA7 finding:

- [ ] Read the source audit report for full finding context
- [ ] Verify finding is still live
- [ ] Adjudicate as `Fix` / `Docs` / `Deferred`, with work item classification
- [ ] Assign R3.x sequential ID
- [ ] Record: fix target files, estimated size, dependencies

Exit Criteria:

- [ ] All MA5 P0/P1/P2 findings adjudicated and mapped to R3.x
- [ ] All MA6 P0/P1/P2 findings adjudicated and mapped to R3.x
- [ ] All MA7 P0/P1/P2 findings adjudicated and mapped to R3.x
- [ ] arm-index findings updated from `Pending MR3` → specific R3.x reference
- [ ] Roadmap MR3 section populated with R3.x rows

## Draft Review Record

> Review by independent sub-agent. Plan is an expander (no code changes), producing R2.x/R3.x roadmap items.

- Reviewer / Agent: MISSION_DRIVER (independent review agent)
- Verdict: `pass-with-minors`
- Rounds: 1
- Findings addressed:
  - **Blocker (fixed)**: MA3 P2 count in Scope was "8 P2" but arm-index shows 10 P2 (MA3-F02/F03/F04 + MA3-P2-F2/F3/F4/F5/F6 + MA3-DO-P2-01/02). Corrected to "10 P2".
  - **Minor (unresolved)**: Test Strategy section uses merged format ("档位选择：...") instead of two-line template ("档位选择（三选一）" + "本档选择："). Semantic intent is clear — no fix needed.
  - **Minor (unresolved)**: `> Mission:` field is not in the standard template but harmless metadata.

## Closure Gates

- [ ] All MR2-scope findings adjudicated and expanded to R2.x roadmap items
- [ ] All MR3-scope findings adjudicated and expanded to R3.x roadmap items
- [ ] `docs/backlog/audit-remediation-roadmap.md` MR2 and MR3 sections populated
- [ ] `docs/audits/arm-index.md` findings status updated to point to specific R2.x/R3.x numbers
- [ ] No in-scope finding silently deferred without documented `Why Not Blocking Closure`
- [ ] Closure audit by independent sub-agent (fresh session) completed

## Deferred But Adjudicated

> _To be populated during execution. Any finding adjudicated as deferred must list reasoning here._

## Non-Blocking Follow-ups

- `docs/backlog/audit-remediation-roadmap.md` MA4.1/MA7.1 phase status → update from `todo` to `done` (these audit plans are already completed)

## Closure

Status Note: _To be filled on completion_

Closure Audit Evidence:

- _To be filled by independent sub-agent_

Follow-up:

- _R2.x execution plan(s) and R3.x execution plan(s) as successors_
