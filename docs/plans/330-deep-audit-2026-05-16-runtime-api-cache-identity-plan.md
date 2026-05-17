# 330 Deep Audit 2026-05-16 Runtime API Cache Identity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-16-deep-audit-full/{15-security-performance.md,summary.md}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 runtime API cache identity：默认 cache key 仍忽略 `api.headers`，会把不同上下文请求错误复用到同一缓存项。

## Current Baseline

- `15-01` 是独立的 cache identity correctness defect，不应埋在更宽的 observability/perf bucket 里。

## Goals

- Make default API cache identity include the data required to avoid cross-context aliasing.

## Non-Goals

- 不接管 validation diagnostics。
- 不接管 debugger observability 或 action error fidelity。

## Scope

### In Scope

- `15-01`
- `packages/flux-runtime/src/async-data/api-cache.ts`
- focused tests and relevant docs

### Out Of Scope

- `08-02`
- `15-02`
- `19-01`

## Execution Plan

### Phase 1 - Freeze Cache Identity Baseline

Status: completed
Targets: `api-cache.ts`, focused tests/docs

- Item Types: `Decision | Proof | Fix`

- [x] Re-audit the supported default cache identity baseline and decide whether headers join the default key or make implicit caching unsafe.
- [x] Add or update focused proof for header-sensitive cache identity.

Exit Criteria:

- [x] The plan records one explicit default cache identity baseline.
- [x] Focused proof exists for header-sensitive requests.
- [x] `docs/logs/2026/05-17.md` records the decision.

### Phase 2 - Land Cache Identity Fix

Status: completed
Targets: `packages/flux-runtime/src/async-data/api-cache.ts`

- Item Types: `Fix | Proof`

- [x] Fix `15-01` so header-sensitive requests no longer alias to the same default cache entry.

Exit Criteria:

- [x] Default cache identity no longer ignores context-critical headers on the supported baseline.
- [x] Focused proof is green.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.

Exit Criteria:

- [x] Focused verification for the in-scope defect has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining cache identity blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defect (`15-01`) is fixed.
- [x] Runtime API cache identity converges to one supported baseline.
- [x] Necessary focused verification exists for the touched defect family.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
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
- Evidence: Independent closure audit re-read Plans `316`-`335` against the live repo and current green workspace baseline; Plan `330` is closure-ready with no remaining cache identity blocker.

Follow-up:

- None currently.
