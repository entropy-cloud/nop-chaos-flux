# 321 Deep Audit 2026-05-16 Active Doc And Terminology Baseline Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{16-doc-code-consistency.md,17-naming.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/298-deep-audit-2026-05-15-doc-governance-drift-remediation-plan.md`, `docs/plans/299-deep-audit-2026-05-15-entry-boundary-and-structural-doc-routing-plan.md`

## Purpose

收口 active docs / terminology baseline 上的新 retained drift：计划状态文本与 closure 事实不一致、维护清单仍把 live package families 写成 future，且 active examples / component docs 继续教授旧词汇。

## Current Baseline

- `16-*` / `17-*` 是当前 active docs 和 terminology baseline 的真实漂移，不是 archive-only noise。
- `18-*` 属 Flow Designer host-page authoring/public surface consistency，已经拆到独立 owner。
- 这组问题主要是 active doc drift，不需要把代码 surface 一起混进来。

## Goals

- Make active docs, examples, and maintenance references match the live package and terminology baseline.
- Remove plan/doc text contradictions that currently make closed work look incompletely closed or future-only.

## Non-Goals

- 不接管 Flow Designer host-page authoring contract；那部分由独立 successor owner 处理。
- 不接管 bundle/compiler runtime fixes。
- 不重写 historical completed plans except where a live active-plan text inconsistency is itself the defect.

## Scope

### In Scope

- `16-01`
- `16-02`
- `16-03`
- `17-01`
- `17-02`
- active docs under `docs/{plans,references,examples,components,architecture}` touched by those items

### Out Of Scope

- archive-only cleanup beyond references explicitly in-scope
- `18-01`
- `18-02`
- `18-03`

## Execution Plan

### Phase 1 - Active Doc And Terminology Drift Closure

Status: completed
Targets: active docs/examples/plans in scope

- Item Types: `Fix | Proof | Decision`

- [x] Fix `16-01` so Plan `281` no longer presents a completed baseline alongside unchecked in-scope closure text.
- [x] Fix `16-02` / `16-03` so active maintenance/routing docs no longer describe spreadsheet/report families as future or route readers to superseded archive planning by default.
- [x] Fix `17-01` / `17-02` so active examples and component docs use the current supported terminology (`visible` / `${...}`, alert severity vocabulary).

Exit Criteria:

- [x] Active docs/examples no longer teach rejected or superseded vocabulary/routing.
- [x] Plan `281` text is internally consistent with its claimed closure state, or its status is honestly revised.
- [x] `docs/logs/2026/05-17.md` records every active-doc baseline change.
- [x] No owner-doc update required beyond touched active docs, or that decision is explicit.

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Re-read all touched active docs to ensure no stale wording, future-package phrasing, or superseded links remain.
- [x] Record execution and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, and live docs.

Exit Criteria:

- [x] Independent closure audit confirms no remaining active-doc / terminology blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed active-doc and terminology drifts are fixed or honestly adjudicated.
- [x] Active docs and terminology converge to one supported baseline.
- [x] Necessary doc review evidence exists for every touched defect family.
- [x] No in-scope live defect or active-doc drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline after syncing Plan `281`, maintenance routing, and the retained active terminology surfaces to the current supported docs baseline.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: The previously flagged live drifts are now corrected: `docs/plans/281-deep-audit-2026-05-14-runtime-owner-lifecycle-validation-closure-plan.md` no longer mixes `completed` with unchecked exit criteria, and the touched active docs now align with the live terminology/routing baseline.

Follow-up:

- None currently.
