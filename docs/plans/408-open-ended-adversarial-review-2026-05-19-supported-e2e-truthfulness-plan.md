# 408 Open-Ended Adversarial Review 2026-05-19 Supported E2E Truthfulness Plan

> Plan Status: planned
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-02.md,round-05.md,round-07.md,round-08.md,round-09.md,round-10.md,round-11.md,round-12.md,round-13.md,round-14.md,round-15.md,round-16.md,round-17.md,round-18.md,round-19.md}`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/testing/e2e-standards.md`

## Purpose

收口 `R02-04`、`R02-05`、`R05-02`、`R07-01`、`R08-01`、`R09-01`、`R10-01`、`R11-01`、`R12-01`、`R13-01`、`R14-01`、`R15-01`、`R16-01`、`R17-01`、`R18-01`、`R19-01`：让 supported Playwright E2E 的标题、场景文案、用户路径和最终断言重新对齐。

## Current Baseline

- 多条 supported E2E 当前只证明中间态、debug state、按钮存在、shell close、或 test hook / DOM shortcut，而不是标题承诺的最终用户行为。
- 这些 finding 分散在 component-lab、flow-designer、report-designer、word-editor、code-editor，但共享同一 closure surface：supported E2E truthfulness。
- `R01-04` 的 harness-wide shared error gate 已归现有 Plan `400`；本计划只 owning product-facing assertion fidelity，不重复接管 shared fixture reliability。

## Goals

- 修复全部 `16` 条 in-scope supported E2E false-confidence finding。
- 让 supported E2E 通过真实用户路径和终态断言证明行为，不再停在 debug state / shell teardown / presence-only / test hook shortcut。
- 只在确实需要时调整 spec 标题、场景文案或 helper；不制造新的 vague coverage。

## Non-Goals

- 不处理 shared fixture-level error tracking / global console gate；那属于 Plan `400`。
- 不直接修复产品代码 defect，除非某条 E2E 无法通过而暴露出新的 live product bug，并且该 bug 必须先转交对应 owner plan。
- 不做 unrelated suite decomposition or test-style cleanup。

## Scope

### In Scope

- `R02-04`, `R02-05`, `R05-02`, `R07-01`, `R08-01`, `R09-01`, `R10-01`, `R11-01`, `R12-01`, `R13-01`, `R14-01`, `R15-01`, `R16-01`, `R17-01`, `R18-01`, `R19-01`
- affected `tests/e2e/**/*.spec.ts`
- test helpers under `tests/e2e/` when required for honest user-path coverage
- `docs/testing/e2e-standards.md` only if the supported proof standard itself changes
- `docs/logs/2026/05-19.md`

### Out Of Scope

- shared fixture error gate ownership
- runtime/host code fixes owned by plans `409`-`412`
- non-supported exploratory tests

## Execution Plan

### Phase 1 - Remove Shortcut And Presence-Only Coverage

Status: planned
Targets: flow-designer, report-designer, code-editor, word-editor E2Es and helpers

- Item Types: `Fix | Proof`

- [ ] Fix `R02-04`, `R02-05`, `R05-02`, `R07-01`, `R10-01`, `R18-01`, `R19-01` so tests exercise the claimed user path and assert the claimed end result.
- [ ] Remove or replace test-only shortcuts such as synthetic connect events and DOM `click()` bypasses where the title claims real interaction coverage.
- [ ] Tighten scenario titles when the supported path is intentionally narrower than the previous wording.

Exit Criteria:

- [ ] The in-scope non-Component-Lab suites no longer pass on presence-only, no-op, autosave-only, or test-hook shortcut coverage.
- [ ] Focused proof covers the final user-visible result for each touched scenario.
- [ ] `docs/testing/e2e-standards.md` is updated if the supported proof rule changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Restore Component-Lab End-State Assertions

Status: planned
Targets: `tests/e2e/component-lab/*.spec.ts`, component-lab helpers if needed

- Item Types: `Fix | Proof`

- [ ] Fix `R08-01`, `R09-01`, `R11-01`, `R12-01`, `R13-01`, `R14-01`, `R15-01`, `R16-01`, `R17-01` so each test asserts the promised user-visible end state rather than debug-only state or shell close.
- [ ] Keep scenario wording and assertions aligned when a page exposes explicit result text, toasts, or persisted summary surfaces.
- [ ] Re-audit touched specs for any remaining title/behavior mismatch before closing the phase.

Exit Criteria:

- [ ] The in-scope Component-Lab suites assert the promised final visible result.
- [ ] No touched spec still relies on `scope-debug-json` or teardown-only proof when the title promises a stronger supported outcome.
- [ ] `docs/testing/e2e-standards.md` is updated if the supported proof rule changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed, or each phase explicitly records `No owner-doc update required`.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
