# 328 Deep Audit 2026-05-16 Flow Designer Host-Page Authoring Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{18-cross-package.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 Flow Designer host-page family authoring contract：page input 缺少 peer-common props，缺少 peer-style `define*PageSchema` helper，并保留 `$designer` additive export asymmetry 需要明确裁定。

## Current Baseline

- `18-01`、`18-02`、`18-03` 共享 host-page family public authoring surface。
- 这些问题不是一般 docs drift，而是 Flow Designer 与 peer host-page packages 的 code-level authoring parity。

## Goals

- Make Flow Designer host-page inputs honestly align with the supported peer baseline, or document explicit exceptions.
- Provide a peer-style schema helper if that is the supported host-page entry contract.
- Adjudicate the additive `$designer` export as supported or narrow it.

## Non-Goals

- 不接管 generic doc terminology cleanup。
- 不重构 Flow Designer runtime internals。

## Scope

### In Scope

- `18-01`
- `18-02`
- `18-03`
- `packages/flow-designer-renderers/src/{schemas.ts,index.tsx,renderer-definitions.ts}`
- relevant docs and focused tests

### Out Of Scope

- `16-01`
- `17-01`
- unrelated Flow Designer runtime fixes

## Execution Plan

### Phase 1 - Freeze Host-Page Authoring Baseline

Status: completed
Targets: touched Flow Designer public files, peer host-page packages, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the peer host-page authoring baseline and record whether Flow Designer aligns or keeps explicit supported exceptions.
- [x] Decide whether `$designer` remains an additive supported contract or is narrowed.
- [x] Add focused proof where public authoring types or helpers change.

Exit Criteria:

- [x] The plan records one explicit host-page authoring baseline for all three findings.
- [x] Focused proof or explicit no-proof rationale exists for any public-surface change.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Host-Page Authoring Contract Fixes

Status: completed
Targets: `packages/flow-designer-renderers/src/{schemas.ts,index.tsx,renderer-definitions.ts}`

- Item Types: `Fix | Proof`

- [x] Fix `18-01` so Flow Designer page input exposes peer-common props or records a clear supported exception.
- [x] Fix or honestly adjudicate `18-02` so `$designer` additive export has a documented/tested status.
- [x] Fix `18-03` so Flow Designer exports a peer-style `define*PageSchema` helper or records a clear supported exception.

Exit Criteria:

- [x] Flow Designer host-page authoring surface is aligned with peers or explicitly documented as an exception.
- [x] Focused proof is green for any public authoring-surface change.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for all in-scope residuals has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining Flow Designer host-page authoring blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope retained items (`18-01`, `18-03`) are fixed, and `18-02` is fixed or honestly adjudicated.
- [x] Flow Designer host-page authoring contract converges to one supported baseline.
- [x] Necessary focused verification exists for every touched defect family.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed on the 2026-05-17 live baseline after final workspace verification and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: `general` subagent `ses_1ce657a57ffehya0nv61esDKO2`
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `328` is closure-ready with no remaining Flow Designer host-page authoring blocker.

Follow-up:

- None currently.
