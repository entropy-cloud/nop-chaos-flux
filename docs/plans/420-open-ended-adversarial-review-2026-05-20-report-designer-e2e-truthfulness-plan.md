# 420 Open-Ended Adversarial Review 2026-05-20 Report Designer E2E Truthfulness Plan

> Plan Status: planned
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-04.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/plans/408-open-ended-adversarial-review-2026-05-19-supported-e2e-truthfulness-plan.md`, `docs/testing/e2e-standards.md`

## Purpose

收口 `R04-01`：让 report-designer 字段拖拽 E2E 的标题、交互路径和最终断言重新对齐到真实 metadata binding contract。

## Current Baseline

- 当前 E2E 标题声称验证 cell value + metadata binding。
- 实际断言只证明 spreadsheet cell 文本写入，没有证明 semantic metadata binding。
- 这是 2026-05-19 supported E2E queue 之外的新 residual。

## Goals

- 修复 `R04-01`。
- 让 spec 通过真实用户路径证明 metadata binding，而不只是 visible text write。
- 只在需要时调整 spec wording 或 helper。

## Non-Goals

- 不处理 shared fixture reliability；那不属于本 residual surface。
- 不处理 report-designer 产品代码缺陷，除非 focused proof 暴露出新的 live bug 并需另行转交。

## Scope

### In Scope

- `R04-01`
- affected report-designer E2E and helpers if needed
- `docs/testing/e2e-standards.md` if required
- `docs/logs/2026/05-20.md`

### Out Of Scope

- unrelated supported E2E suites
- non-E2E product fixes outside proof necessity

## Execution Plan

### Phase 1 - Restore Report Designer Metadata-Binding Proof

Status: planned
Targets: report-designer E2E, helpers if needed, relevant docs

- Item Types: `Fix | Proof`

- [ ] Update the spec so it asserts semantic binding, not only visible cell text.
- [ ] Keep the title and supported proof surface aligned after the assertion change.
- [ ] Update `docs/testing/e2e-standards.md` if the supported proof rule changes, or explicitly adjudicate `No owner-doc update required`.

Exit Criteria:

- [ ] `R04-01` is fixed.
- [ ] Focused proof covers the final metadata-binding outcome.
- [ ] `docs/testing/e2e-standards.md` is updated if needed, or `No owner-doc update required` is explicitly recorded.
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
