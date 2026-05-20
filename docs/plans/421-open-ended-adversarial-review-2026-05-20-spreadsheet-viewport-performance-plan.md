# 421 Open-Ended Adversarial Review 2026-05-20 Spreadsheet Viewport Performance Plan

> Plan Status: planned
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

Status: planned
Targets: viewport computation code, focused proof, affected docs

- Item Types: `Fix | Proof`

- [ ] Reduce or eliminate full-grid offset recomputation on ordinary scroll renders.
- [ ] Add focused proof or measurement-backed verification that the scroll path no longer rebuilds full-sheet row/column offsets on ordinary scroll renders, using a repo-observable targeted test, benchmark, or instrumentation-backed assertion.
- [ ] Update `docs/architecture/performance-design-requirements.md` if the supported hot-path baseline changes, or explicitly adjudicate `No owner-doc update required`.

Exit Criteria:

- [ ] `R06-01` is fixed.
- [ ] Focused proof covers the retained concern specifically: ordinary scroll renders no longer trigger full-sheet offset rebuild behavior.
- [ ] `docs/architecture/performance-design-requirements.md` is updated if needed, or `No owner-doc update required` is explicitly recorded.
- [ ] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
