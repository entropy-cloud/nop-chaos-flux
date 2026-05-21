# 427 Deep Audit 2026-05-21 Truthfulness, Doc Routing, And Naming Baseline Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-20-deep-audit-full/summary.md`, reviewed dimension files under `docs/analysis/2026-05-20-deep-audit-full/`, `docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/plans/418-open-ended-adversarial-review-2026-05-20-automation-guardrail-truthfulness-plan.md`, `docs/plans/422-open-ended-adversarial-review-2026-05-20-debugger-accessibility-semantics-plan.md`

## Purpose

收口 2026-05-20 deep audit 中负责“支持基线是否真实可信”的 retained findings，包括 verification truthfulness、active docs routing、naming baseline、以及 debugger built-in semantics/i18n residual，使仓库的检查链、active docs、示例命名、和 debugger built-ins 不再对当前 supported baseline 产生误导。

## Current Baseline

- 本计划承接 Plan `424` 的 Bucket C，共 `45` 条 retained findings。
- 这些 findings 虽然分布在 tests、docs、examples、debugger panels、和 references 中，但共同点不是“同一产品 surface”，而是“同一 trusted baseline”：仓库当前怎么被验证、怎么被讲解、怎么被命名、怎么被内建 UI 表达。
- 因此它们仍适合合并到一个 docs-and-truthfulness owner plan，但 plan 内部必须把 verification truthfulness、active docs routing、runtime/action naming、component/example naming、以及 debugger baseline 明确拆成可执行 workstreams，而不是只保留笼统 bucket。

## Goals

- 修复 Bucket C 中全部 `45` 条 retained findings，或在执行中若发现单一计划已不再诚实，则显式产出 successor ownership，而不是静默缩 scope。
- 让 `pnpm test` / CI / supported proof、active docs routing、author-facing naming、以及 debugger built-ins 全部指向同一当前 baseline。
- 同步受影响 docs、references、examples、and debugger surfaces 到 live repo reality。

## Non-Goals

- 不处理维度 `19` runtime error fidelity。
- 不处理其余 code-facing renderer/runtime/workbench defects；这些工作由 Plan `426` 单独 owning。
- 不为了模板一致性去机械回写无关的已完成历史计划。

## Scope

### In Scope

- Plan `424` Bucket C 的全部 retained findings：`11-02` through `11-04`, `14-01` through `14-14`, `16-01` through `16-14`, `17-01` through `17-05`, `17-07` through `17-14`, `18-08`
- Affected tests, verification scripts, CI wiring, docs, references, plans, examples, and debugger UI files
- `docs/logs/2026/05-21.md`

### Out Of Scope

- `19-01` through `19-19`
- Plan `424` Bucket B code-facing findings
- Brand-new audit rounds or unrelated doc polish outside the retained set

## Workstreams

### Workstream 1 - Test-Local And Supported-E2E Proof Fidelity

Status: completed
Targets: affected tests under `packages/report-designer-renderers/`, `packages/word-editor-renderers/`, and `tests/e2e/`, `docs/testing/e2e-standards.md`, `docs/references/audit-tooling.md`

- Item Types: `Fix | Proof`
- [x] 收口弱断言/私有测试入口/假端到端 proof findings：`14-01`, `14-02`, `14-03`, `14-04`, `14-07`, `14-14`。
- [x] 补 focused proof，覆盖 real failure-path assertions、failure-safe cleanup、public runtime/render entry usage、real drag-based E2E path、and supported E2E user-visible assertions。
- [x] 同步 `docs/testing/e2e-standards.md` 与 `docs/references/audit-tooling.md` 到最终 live baseline。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Test-local and supported-E2E claims are truthful against the live repo.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 2 - Verification Gate And CI Truthfulness

Status: completed
Targets: root `package.json`, affected package `package.json` files, `.github/workflows/ci.yml`, `vitest.config.ts`, `playwright.config.ts`, `stryker.runtime.conf.mjs`, related scripts, `docs/testing/e2e-standards.md`, `docs/references/audit-tooling.md`, `docs/references/maintenance-checklist.md`, `docs/architecture/frontend-baseline.md`

- Item Types: `Fix | Proof`
- [x] 收口 gate / CI truthfulness findings：`14-05`, `14-06`, `14-08`, `14-09`, `14-10`, `14-11`, `14-12`, `14-13`。
- [x] 让 package test inclusion、coverage/mutation gates、artifact checks、`pnpm check`、cross-platform `NODE_OPTIONS`、zero-test policy、and Playwright `forbidOnly` 与默认 CI 路径真实一致。
- [x] 补 focused proof，覆盖 default CI command chain、cross-platform script behavior、and hard-gate execution truthfulness。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Verification gate and CI claims are truthful against the live repo.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 3 - Active Docs And Routing Baseline Closure

Status: completed
Targets: `AGENTS.md`, `docs/index.md`, `docs/architecture/performance-diagnostics-and-e2e-design.md`, `docs/architecture/performance-design-requirements.md`, `docs/architecture/static-analysis.md`, affected plan files, affected active docs and examples

- Item Types: `Fix | Proof`
- [x] 收口 `16-01` through `16-14`，修复 active docs 对 archived plan、future draft、失效路径、以及已变更 live contract 的错误指向。
- [x] 同步当前 active routing baseline，确保文档与 live code / live plans 的关系是一对一且可解析的。
- [x] 补 focused proof，抽查关键 doc path、引用目标、and active example references 的 live truthfulness。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Active docs no longer route readers to stale, archived, or nonexistent baselines.
- [x] Listed owner docs and affected plan/doc references are updated to the current live baseline.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 4 - Runtime And Action Vocabulary Convergence

Status: completed
Targets: affected runtime/action source files, tests, active examples, `docs/references/flux-json-conventions.md`, `docs/references/action-payload-matrix.md`, `docs/references/terminology.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/api-data-source.md`

- Item Types: `Fix | Proof`
- [x] 收口 runtime/action vocabulary findings：`17-01` through `17-05`, `17-07`, `17-09`, `17-11`。
- [x] 让 `path` / `submitForm` / `args.path` / `closeSurface` / `targetId` / `name` / `level` / `refreshSource` 等 canonical author-facing vocabulary 与 runtime adapters、references、and active examples 一致。
- [x] 补 focused proof，覆盖 canonical naming usage、runtime fallback removal or explicit contract publication、and action payload/reference truthfulness。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Runtime and action vocabulary match the current supported baseline.
- [x] Listed owner docs/references are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 5 - Component And Example Naming Convergence

Status: completed
Targets: affected playground examples, schema examples, renderer schema files, `docs/components/crud/design.md`, `docs/components/designer-page/design.md`, `docs/components/word-editor-page/design.md`, `docs/components/index.md`, `docs/architecture/flow-designer/config-schema.md`, affected example docs

- Item Types: `Fix | Proof`
- [x] 收口 component/example naming findings：`17-08`, `17-10`, `17-12`, `17-13`, `17-14`。
- [x] 让 Badge、Word Editor dataset、Tabs、CRUD toolbar、and Flow Designer toolbar 的 active examples / component docs 只教学当前 canonical vocabulary。
- [x] 补 focused proof，覆盖 active example payloads、component docs、and public schema vocabulary publication。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Component and example naming match the current supported baseline.
- [x] Listed owner docs/references are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 6 - Debugger Semantics And I18n Baseline Closure

Status: completed
Targets: `packages/nop-debugger/src/`, affected tests, `packages/flux-i18n/src/locales/`, `docs/architecture/debugger-runtime.md`

- Item Types: `Fix | Proof`
- [x] 收口 debugger baseline findings：`11-02`, `11-03`, `11-04`, `18-08`。
- [x] 将 debugger disclosure 触发器收敛到共享 UI semantics，并把 debugger chrome/title/tooltip/placeholder 文案全部接入 `flux.debugger` locale namespace。
- [x] 补 focused proof，覆盖 debugger disclosure semantics、accessible trigger behavior、and debugger built-in i18n truthfulness。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Debugger semantics and built-in i18n match the current supported baseline.
- [x] Listed owner docs/references are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

## Closure Gates

- [x] All in-scope retained findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Verification, docs routing, naming, and debugger baseline all point to one truthful supported baseline.
- [x] Necessary focused verification is complete and matches the final supported contract.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Independent draft review iteration 1: `needs revision` (`ses_1b80a450cffedx9kYqjVUlpXds`) because the original 3-workstream shape left verification truthfulness too abstract, left naming/debugger work too broad, and under-declared the owner-doc obligations for the naming surfaces.
- Note: this section records draft-stage independent review only. It is not the closure audit required before `Plan Status: completed`.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution later finds a pure terminology cleanup that no longer blocks the supported baseline, adjudicate it explicitly at that time instead of silently leaving it in this plan.

## Closure

Status Note: Completed after syncing the remaining active docs/examples to the current retained-renderer baseline, reconciling the audit-tooling contract with explicit migration-example exclusions, and recording an independent closure audit that found no remaining Plan `427` execution debt.

Closure Audit Evidence:

- Reviewer / Agent: fresh-session general subagent `ses_1b681fab3ffeq3LyeXKWs4voIp`
- Evidence: closure audit concluded `can close`; it found no remaining active-doc routing or non-retained-renderer blocker, confirmed the plan text is now internally consistent, and accepted the recorded audit-tooling plus verification evidence as sufficient for honest closure.

Follow-up:

- None.
