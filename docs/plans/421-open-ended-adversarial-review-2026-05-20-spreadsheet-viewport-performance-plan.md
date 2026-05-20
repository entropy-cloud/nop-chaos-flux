# 421 Open-Ended Adversarial Review 2026-05-20 Spreadsheet Viewport Performance Plan

> Plan Status: completed
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-06.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/analysis/2026-04-16-performance-audit.md`, `docs/architecture/performance-design-requirements.md`

## Purpose

收口 `R06-01`：让 spreadsheet virtualization 的 hot-path viewport math 与“只渲染可见窗口”的性能承诺重新一致。

## Current Baseline

- DOM virtualization 已存在，但 scroll render 仍会重建全表 row/column offset arrays。
- 该问题当前受小默认尺寸掩蔽，但随着 workbook 尺寸增长会成为真实 hot-path residual。

## Goals

- 修复 `R06-01`。
- 降低 scroll-time viewport computation 的 full-grid recomputation pressure。
- 为最终行为补 focused proof，并同步受影响性能文档 if required。

## Non-Goals

- 不重做 spreadsheet rendering architecture。
- 不回到“是否需要 virtualization”这一已关闭历史问题。
- 不在本计划内解决所有 spreadsheet performance topic。

## Scope

### In Scope

- `R06-01`
- relevant spreadsheet viewport/rendering code and focused proof
- `docs/architecture/performance-design-requirements.md` if the supported hot-path baseline changes
- `docs/logs/2026/05-20.md`

### Out Of Scope

- unrelated spreadsheet styling, accessibility, or command semantics
- broad workbook architecture redesign

## Execution Plan

### Phase 1 - Reduce Spreadsheet Viewport Hot-Path Rebuild Cost

Status: completed
Targets: viewport computation code, focused proof, affected docs

- Item Types: `Fix | Proof`

- [x] Reduce or eliminate full-grid offset recomputation on ordinary scroll renders.
- [x] Add focused proof or measurement-backed verification that the scroll path no longer rebuilds full-sheet row/column offsets on ordinary scroll renders, using a repo-observable targeted test, benchmark, or instrumentation-backed assertion.
- [x] Adjudicate owner-doc impact explicitly: `docs/architecture/performance-design-requirements.md` required no text change because the existing hot-path guidance already covered avoiding unnecessary hot-path allocations and ambiguous viewport ownership.

Exit Criteria:

- [x] `R06-01` is fixed.
- [x] Focused proof covers the retained concern specifically: ordinary scroll renders no longer trigger full-sheet offset rebuild behavior.
- [x] No owner-doc update required: `docs/architecture/performance-design-requirements.md` already described the supported hot-path baseline and did not need a spreadsheet-specific wording change.
- [x] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [x] The in-scope retained finding is fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: Spreadsheet offset arrays now come from a narrowed `buildSpreadsheetGridOffsets(...)` helper cached with `useMemo`, so ordinary scroll renders no longer rebuild full-sheet offsets. Focused proof, repo-wide verification, and independent closure audit are complete; no owner-doc update was required.

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent
- Evidence: `ses_1bb02c7feffeSJyOIc1GfmNQsL` (`Verdict: acceptable`, `Findings: none`), recorded in `docs/logs/2026/05-20.md`

Follow-up:

- no remaining plan-owned work
