# 225 Verification Gates And Hardening Plan

> Plan Status: completed
> Last Reviewed: 2026-05-08
> Source: `docs/analysis/2026-05-07-deep-audit-full-8/{summary.md,14-test-coverage.md,16-doc-code-consistency.md}`
> Related: `docs/plans/{213-doc-test-boundary-and-hardening-closure-plan.md,221-deep-audit-2026-05-07-confirmed-defect-remediation-plan.md,222-large-file-and-owner-boundary-successor-plan.md}`

## Purpose

收口 `full-8` 中测试门禁、coverage honesty、test discovery、以及关键 state-machine/browser path proof 缺口。完成态要求：关键 async data source / core state machine 有 direct proof，超大测试文件不再绕过硬门禁，e2e/coverage/trace/CI gate 的 supported baseline 清晰可执行，测试脚本不再依赖易漏测的手工枚举。

## Current Baseline

- 维度 14 保留的 retained set 包括：API data source controller 缺 direct tests、多个 >700 测试文件与 `max-lines` disable、serial e2e、Playwright trace 与 retries 不匹配、spreadsheet/report e2e gaps、README screenshot suite skipped、CI 不跑 `pnpm test:e2e`、default `pnpm test` 不启用 coverage thresholds、`flux-renderers-data` test script 手工枚举文件、word-editor persistence 仅检查 localStorage、不验证 UI reload state、word dataset e2e 缺隔离清理。
- 维度 16 额外确认 `221`-`226` 缺显式 `Validation Checklist` 是当前 plan governance drift。该 drift 由本次 successor plan 重写立即收敛；本计划不再把它留作未来 follow-up。
- `213` 已关闭 earlier doc/test hardening work；本计划只拥有 `full-8` 新保留或重新出现的 distinct test hardening gaps。
- final live-state audit on 2026-05-08 confirms the retained `full-8` test-hardening gaps owned by this plan are now closed in code, config, and focused proof: direct `createDataSourceController(...)` coverage is live, the oversized/manual-enumeration gate evasions are removed, CI runs the supported Chromium e2e baseline, and report/word browser reload paths now have honest proof.

## Goals

- 为 async data source controller 和关键 core state machines 增加 direct tests。
- 去掉超大测试文件和手工枚举/非诚实 gate 配置的长期脆弱点。
- 明确 e2e/coverage/trace/CI 的 supported gate baseline，并补齐 retained browser proof gaps。

## Non-Goals

- 不把本计划扩大成 repo-wide testing modernization campaign。
- 不接管各功能计划内部 already-required focused proof；本计划只拥有 retained shared hardening gaps。
- 不重开 `213` 已关闭的 earlier doc/test cleanup。

## Scope

### In Scope

- retained oversized/shared test files and their split surfaces, including the currently known `>700` families
- async data source controller and directly affected core state-machine tests
- Playwright config / CI config / package test scripts directly required to make gate behavior honest
- retained spreadsheet/report/word browser proof gaps named by `full-8`
- `docs/plans/221`-`228` only insofar as they must keep explicit `Validation Checklist` sections after this rebasing work

### Out Of Scope

- feature-specific focused proof already owned by `221`, `223`, `224`, `226`, `227`, or `228`
- generic test-style cleanup beyond the retained `full-8` gaps

## Execution Plan

### Workstream 1 - Add Direct Proof For Retained Core Gaps

Status: completed
Targets: async data source controller/core state-machine tests, retained browser proof gaps

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Add direct tests for the async data source controller and the key core state machines retained by the audit.
- [x] [Fix] Add the retained browser/integration proof for spreadsheet/report/word persistence or reload paths where package-level proof is not honest enough.
- [x] [Proof] Record which retained gaps are satisfied by package-level tests versus browser-level proof.

Exit Criteria:

- [x] The retained core/test-proof gaps named by `full-8` are covered by direct focused tests.
- [x] The retained browser-only gaps have honest coverage.
- [x] `No owner-doc update required` is explicit unless this work changes supported testing policy docs.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 2 - Remove Fragile Test Gate Evasions

Status: completed
Targets: oversized tests, package test scripts, CI/test config

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Split retained `>700` test files and remove `max-lines` bypasses that currently evade the hard gate.
- [x] [Fix] Replace manual test-file enumeration with discovery or add an explicit orphan-test guard.
- [x] [Fix] Make coverage/e2e/trace gate behavior honest in local scripts and CI, including the `trace: on-first-retry` / `retries: 0` mismatch.
- [x] [Fix] Resolve retained skipped-suite / serial / single-browser gate ambiguity by either enabling the missing gates or removing stale contradictory expectations and recording the supported baseline explicitly in docs/config/comments.

Exit Criteria:

- [x] The retained oversized/manual-enumeration test risks are removed.
- [x] CI/local gate behavior matches the documented supported baseline.
- [x] No retained skipped-suite / serial / single-browser gate ambiguity remains undocumented.
- [x] Focused verification exists for the final gate behavior.
- [x] Any affected testing-policy docs/config comments are updated if the stable baseline changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3 - Verification And Closure Audit

Status: completed
Targets: in-scope tests/config/docs, this plan

- Item Types: `Proof | Decision`

- [x] Run focused verification for direct proof additions and gate/config changes.
- [x] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test`, plus any honest e2e gate chosen by this plan.
- [x] Perform an independent closure audit and fix any remaining in-scope test-hardening ambiguity before closing the plan.

Exit Criteria:

- [x] Focused verification is recorded for retained direct-proof and gate-hardening families.
- [x] Workspace verification passes.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] `docs/logs/` 对应日期条目已更新。

## Closure Gates

- [x] All in-scope retained test-hardening gaps from `full-8` are closed.
- [x] Focused verification exists for direct-proof and gate-hardening families.
- [x] No in-scope retained defect is silently deferred or downgraded.
- [x] Affected docs/config comments are synced to the live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Validation Checklist

- [x] All active successor plans in this `full-8` set keep explicit `Validation Checklist` sections.
- [x] Direct-proof gaps are closed with real tests, not only by gate wording.
- [x] Gate changes are reflected honestly in CI/local scripts.
- [x] No retained `full-8` item from dimension 14 is left without an owner decision.

## Deferred But Adjudicated

### Browser Matrix Expansion Beyond Supported Gate Baseline

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: if this plan lands an explicit and honest Chromium-only supported baseline with no contrary CI/config/docs expectations, broader multi-browser expansion can remain a later quality investment rather than an in-scope retained defect.
- Successor Required: no
- Successor Path: `n/a`

## Closure

Status Note: final live-state audit on 2026-05-08 confirms this plan is now fully closed. The retained oversized test-file bypass is removed, package test discovery no longer depends on manual enumeration, CI now runs the supported Chromium e2e gate, Playwright trace/retry semantics are honest, serial/manual suites document their supported baseline explicitly, and the retained report/word browser reload paths now have focused proof. The final word-editor hardening slice also fixed a real product bug: dataset create/edit mutations now persist immediately instead of waiting for a later document save, so reload no longer drops newly created datasets.

Closure Audit Evidence:

- Reviewer / Agent: OpenCode independent closure re-audit on 2026-05-08 (`ses_1f901872affeEqxGdH9zh7Swb9`)
- Evidence: `packages/flux-runtime/src/__tests__/request-runtime-polling.test.ts`, `packages/flux-renderers-basic/src/__tests__/{basic-page-layout.test.tsx,basic-page-layout-structure.test.tsx,basic-page-layout-surfaces.test.tsx}`, `packages/flux-renderers-data/package.json`, `.github/workflows/ci.yml`, `playwright.config.ts`, `tests/e2e/{readme-flux-basic-screenshot.spec.ts,report-designer-demo.spec.ts,performance-table.spec.ts,code-editor.spec.ts,word-editor-persistence.spec.ts,word-editor-dataset.spec.ts}`, `packages/word-editor-renderers/src/{hooks/use-word-editor-actions.ts,hooks/use-word-editor-state.ts,__tests__/word-editor-page-actions.test.tsx,__tests__/word-editor-page-host-scope.test.tsx,window-probe.d.ts}`, plus green focused verification and workspace `pnpm {typecheck,build,lint,test}` evidence.

Follow-up:

- No successor required for plan-owned residuals.
