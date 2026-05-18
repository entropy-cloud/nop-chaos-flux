# 349 Open-Ended Adversarial Review 2026-05-18 Diagnostics Trustworthiness Plan

> Plan Status: completed
> Last Reviewed: 2026-05-18
> Source: `docs/analysis/2026-05-18-open-ended-adversarial-review-01/{round-01.md,summary.md}`, live code verification of `packages/nop-debugger/src/{controller-component-inspector.ts,panel/use-inspect-mode.ts}`, `tests/e2e/{fixtures.ts,code-editor.spec.ts,debugger-meta-diagnostic.spec.ts}`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/architecture/debugger-runtime.md`, `docs/testing/e2e-standards.md`, `docs/plans/347-deep-audit-2026-05-17-test-harness-isolation-plan.md`

## Purpose

收口 `2026-05-18` 对抗性审查里同属一个结果面的 3 个 live defects：debugger element inspection 与 Playwright shared gate / supported spec 目前都存在“表面看起来在执行诊断契约，实际却可以绕过或串台”的问题。该计划只拥有这组 diagnostics trustworthiness surface，不扩大为通用 debugger 重构或全仓 E2E 治理。

## Current Baseline

- `docs/analysis/2026-05-18-open-ended-adversarial-review-01/summary.md` 记录了 3 个 findings，主题一致：diagnostic surface overclaims safety.
- `docs/architecture/debugger-runtime.md:187-191` 明确要求 DOM inspect 在多 runtime 页面上先缩小到 active runtime root，因为 `cid` 只是 runtime-local identity。
- `packages/nop-debugger/src/controller-component-inspector.ts` 现已限制 `inspectByElement()` 只接受当前 runtime root 内的元素；foreign-runtime element 不再返回 inspect result。`packages/nop-debugger/src/panel/use-inspect-mode.ts` 也已同步避免 foreign-runtime click 污染当前选中态。
- `tests/e2e/fixtures.ts` 现已将 `assertTrackedPageErrors(page)` 收紧为 hard-fail helper：对非 fixture-managed page 直接抛错，不再静默 no-op。
- `tests/e2e/code-editor.spec.ts` 已移除 `browser.newContext().newPage()` 的假合规路径，clipboard 场景改为使用 fixture page 并显式授予 clipboard 权限。
- `tests/e2e/debugger-meta-diagnostic.spec.ts` 已改为 supported explanation proof：不再依赖 fixed sleep 或 log-only probe，而是对 `explainNodeMeta()` payload 做显式断言。
- Plan `347` 已关闭 renderer-form test harness isolation，但不 owning当前 Playwright shared gate honesty 或 debugger inspect runtime scoping；本计划不重开其 scope。

## Goals

- Make debugger pick-element inspection obey one supported runtime-scoped contract on multi-runtime pages.
- Make the shared Playwright zero-error gate fail loudly when a spec tries to use it on an untracked page, and define one explicit supported path or prohibition for extra non-fixture pages.
- Convert the in-scope debugger meta diagnostic surface into honest supported proof for the documented explanation contract within this plan-owned surface, without downgrading the proof obligation to a non-blocking successor.

## Non-Goals

- 不重构整个 debugger panel、timeline、automation hub 或 multi-controller architecture。
- 不处理本轮盲区中的 report designer、word editor、或 generic event aggregation math。
- 不把所有使用 `waitForTimeout()` 或 `console.log()` 的 E2E 文件都纳入本计划；只处理本次已确认的 supported-surface defects及其最小必要相邻 proof。

## Scope

### In Scope

- `packages/nop-debugger/src/{controller-component-inspector.ts,panel/use-inspect-mode.ts}`
- debugger inspect tests under `packages/nop-debugger/src/*inspect*.test*` as needed for focused proof
- `tests/e2e/fixtures.ts`
- `tests/e2e/code-editor.spec.ts`
- `tests/e2e/debugger-meta-diagnostic.spec.ts`
- `docs/architecture/debugger-runtime.md`
- `docs/testing/e2e-standards.md`
- `docs/logs/2026/05-18.md`

### Out Of Scope

- global debugger hub routing semantics beyond what is required to keep `inspectByElement()` runtime-scoped
- unrelated E2E diagnostic helpers or exploratory specs under `tests/e2e/exploratory/`
- any generic cleanup of diagnostic logging style across the repository

## Execution Plan

### Phase 1 - Freeze Diagnostics Contract Baseline

Status: completed
Targets: debugger inspect path, E2E fixture gate, supported debugger meta spec, owner docs

- Item Types: `Decision | Proof`

- [x] [Proof] Re-audit the three in-scope findings against live code and confirm they still reproduce and still belong to this plan's diagnostics-trustworthiness surface; if new evidence forces a scope split, record an explicit scope-change note and successor plan path instead of treating the split as an ordinary execution outcome.
- [x] [Decision] Record one supported runtime-scoped contract for debugger element inspection: a foreign-runtime click returns no inspect payload and leaves the current controller's inspect selection unchanged.
- [x] [Decision] Record one supported hard-failure contract for `assertTrackedPageErrors(page)` on untracked pages, and explicitly decide whether supported specs may use non-fixture pages via a documented setup path or whether such pages are forbidden in supported specs.
- [x] [Decision] Decide one exact fate for `tests/e2e/debugger-meta-diagnostic.spec.ts`: it may remain in place or be replaced by another supported spec, but this plan must land supported proof for the `explainNodeMeta()` contract before closure.
- [x] [Decision] Rewrite this plan after the above decisions so Phase 2 and closure text no longer contains open alternatives.

Exit Criteria:

- [x] The plan text itself records one explicit supported baseline for debugger runtime scoping and E2E gate behavior, with no unresolved branch wording.
- [x] The supported fate of `tests/e2e/debugger-meta-diagnostic.spec.ts` is explicitly decided, and the plan text makes clear that `explainNodeMeta()` proof remains in-scope until closure.
- [x] `docs/testing/e2e-standards.md` is updated to record the supported non-fixture-page policy, and `docs/architecture/debugger-runtime.md` is updated if its runtime-scoping wording needs to change; otherwise `No debugger owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-18.md` records the baseline decision.

### Phase 2 - Land Diagnostics Trustworthiness Fixes

Status: completed
Targets: debugger inspect implementation, E2E fixture, affected specs/tests/docs

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Land the exact Phase 1 runtime-scoping behavior for `inspectByElement()` and the panel inspect flow so a foreign-runtime click returns no inspect payload and leaves the current controller's inspect selection unchanged.
- [x] [Proof] Add focused debugger proof with a named test covering a multi-runtime page where a foreign-runtime element click returns no inspect payload and preserves the prior local selection.
- [x] [Fix] Make `assertTrackedPageErrors(page)` throw a deterministic failure when the target page was not prepared by the shared fixture hook.
- [x] [Decision] Land the exact Phase 1 supported policy for non-fixture pages in supported specs: either introduce a documented setup path for tracked extra pages/popups or explicitly forbid them and make the failure/docs say so.
- [x] [Proof] Update `tests/e2e/code-editor.spec.ts` to use the supported tracked-page policy for the clipboard case, and prove the zero-error contract actually executes on that path.
- [x] [Fix] If `tests/e2e/debugger-meta-diagnostic.spec.ts` remains in `tests/e2e/`, replace the fixed `waitForTimeout(1200)` and log-only probe behavior with repo-observable readiness checks plus explicit assertions on the `explainNodeMeta()` contract fields promised by the supported baseline.
- [x] [Fix] If `tests/e2e/debugger-meta-diagnostic.spec.ts` does not remain as the supported proof vehicle, replace it within this plan with another supported proof artifact that explicitly covers the `explainNodeMeta()` contract.

Exit Criteria:

- [x] A focused debugger test names and proves that a foreign-runtime inspect click returns no inspect payload and preserves the current local selection.
- [x] A test names and proves that `assertTrackedPageErrors(page)` throws on an untracked page instead of silently succeeding.
- [x] `tests/e2e/code-editor.spec.ts` follows the supported tracked-page policy and still exercises the clipboard scenario under a real zero-error gate.
- [x] `tests/e2e/debugger-meta-diagnostic.spec.ts` is either honest supported proof with explicit `explainNodeMeta()` assertions and no fixed sleep gate, or it has been replaced in this plan by another supported proof artifact covering the same contract.
- [x] `docs/testing/e2e-standards.md` matches the landed non-fixture-page policy, and `docs/architecture/debugger-runtime.md` matches the landed runtime-scoping baseline; otherwise `No debugger owner-doc update required` is explicit only for the debugger doc.
- [x] `docs/logs/2026/05-18.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched debugger tests, E2E specs, docs, this plan

- Item Types: `Proof | Decision`

- [x] [Proof] Run the named focused debugger inspect tests changed in this plan plus `tests/e2e/code-editor.spec.ts` and either `tests/e2e/debugger-meta-diagnostic.spec.ts` or its named supported replacement proof artifact.
- [x] [Proof] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fixes land.
- [x] [Proof] Record execution, verification, and evidence in `docs/logs/2026/05-18.md`.
- [x] [Proof] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis/docs, live code/tests, and the exact verification artifacts recorded in `docs/logs/2026/05-18.md`.

Exit Criteria:

- [x] Focused proof is green for debugger runtime-scoped inspection, untracked-page hard failure, the supported non-fixture-page policy, and the `explainNodeMeta()` regression surface still owned by this plan.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms all three in-scope findings are resolved or explicitly reassigned with honest successor ownership.
- [x] `docs/testing/e2e-standards.md` is confirmed current for the landed supported policy, and `docs/architecture/debugger-runtime.md` is confirmed current or explicitly unchanged for the landed debugger behavior.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] All in-scope confirmed live defects are fixed.
- [x] Debugger element inspection and the shared E2E gate converge to one honest supported baseline.
- [x] Necessary focused verification exists for the touched debugger and E2E contract paths.
- [x] The `explainNodeMeta()` supported contract has honest in-scope regression proof.
- [x] No in-scope live defect or contract drift is silently downgraded to deferred/follow-up.
- [x] `docs/testing/e2e-standards.md` is synced to the live baseline, and `docs/architecture/debugger-runtime.md` is also synced if its wording changed; otherwise `No debugger owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- If closure audit shows more supported specs are only diagnostic probes beyond the in-scope files here, route them through a separate E2E-surface owner plan instead of widening this one.
- If multi-controller debugger hub semantics turn out to affect this fix materially beyond element-inspection/runtime-boundary behavior, create a successor plan for that broader architecture surface.

## Closure

Status Note: Completed. The three diagnostics-trustworthiness findings owned by this plan are fixed, documented, and covered by focused proof. An extra full Playwright run still exposed unrelated CRUD and word-editor failures outside this plan's declared scope, so that run is recorded as out-of-scope discovery evidence rather than as a closure blocker or a green baseline.

Closure Audit Evidence:

- Reviewer / Agent: Independent general subagent closure audit `ses_1c73ab044ffeDO7ob9qNse7YXy`.
- Evidence: Audit returned `No findings.` after the added panel-level selection-preservation proof, and confirmed `completed` is honest once plan/log text are synced. Verification set: focused `pnpm vitest "packages/nop-debugger/src/controller-inspect-basic.test.ts" "packages/nop-debugger/src/panel.test.tsx"`, focused `pnpm exec playwright test "tests/e2e/fixtures-hard-gate.spec.ts" "tests/e2e/code-editor.spec.ts" "tests/e2e/debugger-meta-diagnostic.spec.ts" --reporter=list`, plus green `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`. Extra full Playwright run at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e38c0e37a001OyQ6ix67ZizSt7` recorded out-of-scope failures in `tests/e2e/component-lab/crud-query-and-ownership.spec.ts` and `tests/e2e/word-editor.spec.ts`.

Follow-up:

- None for this plan-owned surface. If the out-of-scope CRUD or word-editor failures discovered during the extra full Playwright run need owner-plan tracking, route them through a separate plan rather than reopening this diagnostics-trustworthiness scope.
