# 425 Deep Audit 2026-05-21 Runtime Error Propagation Fidelity Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-20-deep-audit-full/summary.md`, `docs/analysis/2026-05-20-deep-audit-full/19-error-propagation.md`, `docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`
> Related: `docs/plans/389-deep-audit-2026-05-19-runtime-async-listener-and-stale-promise-fidelity-plan.md`, `docs/plans/395-deep-audit-2026-05-19-flow-designer-error-fidelity-plan.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/debugger-runtime.md`, `docs/architecture/api-data-source.md`

## Purpose

收口 2026-05-20 deep audit 在 Bucket A 中路由的 `19-01` 至 `19-19` retained findings，让 `ActionResult`、abort reason、provider metadata、async owner settlement、以及 host/provider bridge 失败语义重新回到可诊断且一致的 supported baseline。

## Current Baseline

- 2026-05-19 的 Plan `389` 和 `395` 已经收口了上一轮 runtime listener cleanup、stale-request/debug summary fidelity、以及 flow-designer 的旧一组 error-fidelity finding。
- 本计划中的 `19-01` 至 `19-19` **明确指向 `docs/analysis/2026-05-20-deep-audit-full/19-error-propagation.md` 的编号**，不是对 Plan `389` / `395` 中同名编号的重开；若某条 root cause 与旧计划表面相邻，也以 2026-05-20 审计文件中当前 retained finding 的 live code path 为唯一 scope 基线。
- 旧文件名 `420-deep-audit-2026-05-21-error-propagation-fidelity-closure-plan.md` 只是编号错误的 draft；当前唯一有效 successor owner 路径是本文件 `425-deep-audit-2026-05-21-runtime-error-propagation-fidelity-plan.md`。
- 2026-05-20 维度 19 仍保留 19 个问题，且已在独立复核中确认成立，主要集中在四类根因：
  - `ActionResult` / aggregate result 在跨层时被扁平化为通用 `Error`
  - `cancelled` / `timedOut` / `AbortSignal.reason` 在 action、request、submit、source observer 边界被丢失或误分类
  - namespaced/component/provider/host bridge 的 owner metadata、structured reason、non-Error cause 没有穿透到 `ActionResult` / debugger / monitor
  - source / reaction / validation / formula owner 的 async settlement 与最终 state/debug surface 不一致
- 当前 active owner docs 已经把 cancellation ownership、ActionResult branch context、runtime-owned async owner diagnostics 视为 supported baseline；因此本计划中的 retained findings 都是 `Fix`，不是可降级的 follow-up。

## Goals

- 修复 `维度19-01` 至 `维度19-19` 的剩余 retained findings，或在执行中若发现 plan 必须拆分，则显式产出 successor ownership，而不是静默缩 scope。
- 让 action-core、runtime、source/reaction/validation owner、以及 host provider/renderer bridge 对失败、取消、超时、aggregate result 的结构化语义重新一致。
- 补齐 focused proof，覆盖 error fidelity、cancellation fidelity、async owner settlement、以及 debugger/monitor 可见的最终 contract。
- 同步受影响 owner docs 到 live baseline，避免 code landed 后继续保留旧的 failure/cancellation 描述。

## Non-Goals

- 不处理维度 13、16、17、18、20 的 retained findings；即使这些问题与 diagnostics 有邻接关系，也不在本计划内顺手扩 scope。
- 不重做已由 Plan `389` / `395` 关闭的旧 finding，除非 live repo 复核证明存在回归。
- 不把所有 domain UX 提示统一成同一文案风格；本计划只处理错误保真度和结构化失败语义，不做文案润色计划。
- 不在本计划内重构与 retained findings 无关的 runtime module boundaries。

## Scope

### In Scope

- `docs/analysis/2026-05-20-deep-audit-full/19-error-propagation.md` 中最终保留的 `19-01` 至 `19-19`
- `packages/flux-core/src/`
- `packages/flux-action-core/src/`
- `packages/flux-runtime/src/`
- `packages/flow-designer-renderers/src/`
- `packages/word-editor-renderers/src/`
- `packages/report-designer-renderers/src/`
- `packages/spreadsheet-renderers/src/`
- 受影响 focused tests / new regression tests
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/api-data-source.md`（若 data-source / source-owner failure contract 发生可见变化）
- `docs/architecture/form-validation.md`
- `docs/architecture/value-adaptation-and-detail-field.md`
- `docs/logs/2026/05-21.md`

### Out Of Scope

- 非 error-fidelity 目的的 a11y / naming / doc-routing / i18n / performance 修复
- 不相关的 compiler diagnostics 或 host manifest shape narrowing（除非某条 proof 必须依赖现有 public contract 文档说明）
- 不相关的 workbench UX polish、通知视觉样式、button 文案调整

## Execution Plan

### Phase 1 - Restore Shared Action Failure Semantics

Status: completed
Targets: `packages/flux-action-core/src/`, `packages/flux-runtime/src/`, `packages/flux-core/src/value-adapter.ts`

- Item Types: `Fix | Proof`

- [x] 修复 shared action / request / submit substrate 中对 structured failure result 的扁平化：覆盖 `19-01`, `19-04`, `19-05`, `19-06`, `19-09`, `19-12`, `19-15`。
- [x] 收敛 cancellation / timeout propagation：保留 `AbortSignal.reason`、`cancelled`、`timedOut` 语义，不再在 shared layer 重建无 cause 的通用错误。
- [x] 补 focused proof，覆盖 import-stack pending failure propagation、parallel aggregate、`onError` branch、namespaced/component dispatch metadata preservation、submit abort、retry abort、value-adapter failure 的最终 ActionResult / error cause contract。

Exit Criteria:

- [x] `19-01`, `19-04`, `19-05`, `19-06`, `19-09`, `19-12`, and `19-15` are fixed.
- [x] Focused proof covers the final shared failure/cancellation semantics at action-core/runtime/value-adapter boundaries.
- [x] `No owner-doc update required` for `docs/architecture/action-scope-and-imports.md`, `docs/architecture/flux-runtime-module-boundaries.md`, and `docs/architecture/value-adaptation-and-detail-field.md`; the live supported contract already described the preserved failure/cancellation semantics, and this phase only brought implementation back in line.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 2 - Restore Async Owner And Source Settlement Fidelity

Status: completed
Targets: `packages/flux-runtime/src/async-data/`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/runtime-action-helpers.ts`

- Item Types: `Fix | Proof`

- [x] 修复 async owner / source observer / formula source / reaction / validation 路径上的 cancelled-vs-failure 误分类与 failed settlement 缺口：覆盖 `19-02`, `19-07`, `19-08`, `19-13`, `19-16`, `19-17`, `19-19`。
- [x] 让 source/reaction/validation/debugger surfaces 使用同一套 async outcome vocabulary，并保留 owner-local structured failure context。
- [x] 补 focused proof，覆盖 action-backed data-source failed-result preservation、request-runtime abort-reason forwarding、anonymous source observer、多 source rejected attribution、formula source refresh failure settlement、async validation cancelled settlement、reaction failure diagnostics。

Exit Criteria:

- [x] `19-02`, `19-07`, `19-08`, `19-13`, `19-16`, `19-17`, and `19-19` are fixed.
- [x] Focused proof covers async owner settlement, source observer classification, and debugger-visible owner summaries.
- [x] `docs/architecture/debugger-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/api-data-source.md`, and `docs/architecture/form-validation.md` are updated if the supported owner-state/debug contract text changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 3 - Restore Domain Host Provider Error Fidelity

Status: completed
Targets: `packages/word-editor-renderers/src/`, `packages/report-designer-renderers/src/`, `packages/spreadsheet-renderers/src/`

- Item Types: `Fix | Proof`

- [x] 修复 Word Editor / Report Designer / Spreadsheet host provider 对 cancelled semantics、non-Error cause、structured failure 的丢失：覆盖 `19-03`, `19-11`, `19-14`。
- [x] 让这些 host/provider result 在 action chain / monitor / debugger 中保留 enough owner context，而不是退化为普通 failure 或字符串化 `Error`。
- [x] 补 focused proof，覆盖 word-editor abort classification、report provider non-Error cause preservation、spreadsheet provider non-Error cause preservation。

Exit Criteria:

- [x] `19-03`, `19-11`, and `19-14` are fixed.
- [x] Focused proof covers host-provider final failure semantics for word-editor, report-designer, and spreadsheet surfaces.
- [x] `docs/architecture/action-scope-and-imports.md` and `docs/architecture/flux-runtime-module-boundaries.md` are updated if the supported host-provider result contract text changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Phase 4 - Restore Flow-Designer Bridge Failure Fidelity

Status: completed
Targets: `packages/flow-designer-renderers/src/`

- Item Types: `Fix | Proof`

- [x] 修复 Flow Designer renderer bridge 对 provider metadata、command reason、silent failure 的丢失：覆盖 `19-10`, `19-18`。
- [x] 让 namespaced/component action failures、designer command results、create dialog submitAction failures 在 action chain / monitor / debugger 中保留 enough owner context。
- [x] 补 focused proof，覆盖 command `reason` preservation and create dialog failure reporting，不再把共享 action-dispatch metadata 问题留在 renderer-only proof 中。

Exit Criteria:

- [x] `19-10` and `19-18` are fixed.
- [x] Focused proof covers Flow Designer bridge final failure semantics.
- [x] `docs/architecture/action-scope-and-imports.md` and `docs/architecture/flux-runtime-module-boundaries.md` are updated if the supported Flow Designer bridge contract text changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

## Closure Gates

- [x] All in-scope retained findings (`19-01` through `19-19`) are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Shared `ActionResult` / cancellation / async owner semantics are consistent across action-core, runtime, source/reaction/validation, and host/provider bridges.
- [x] Necessary focused verification is complete and matches the final supported contract.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or the plan explicitly records `No owner-doc update required` for each changed phase.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

- None at draft time.

## Non-Blocking Follow-ups

- None at draft time. Any newly discovered non-blocking residual must be adjudicated explicitly during execution rather than assumed here.

## Draft Review Record

- Independent draft review iteration 1: `needs revision` (`ses_1b82fd066ffeZrkiX2uOaO7NH5`) due to overlap wording against completed Plans `389` / `395`, missing `packages/flux-core/src/` in scope, incomplete owner-doc obligations, and an over-coarse host/provider phase.
- Independent draft review iteration 2: `acceptable as-is` (`ses_1b82fd066ffeZrkiX2uOaO7NH5`) after clarifying the 2026-05-20 finding-number baseline, adding `packages/flux-core/src/`, naming `docs/architecture/value-adaptation-and-detail-field.md` and `docs/architecture/form-validation.md`, and splitting the old Phase 3 into separate domain-host and Flow-Designer slices.
- Independent draft review iteration 3: `needs revision` (`ses_1b80a45e4ffegZFkJUuz3hnOe4`) because `19-09` was mis-scoped into the Flow-Designer phase, scope text still omitted `docs/architecture/form-validation.md` and `docs/architecture/value-adaptation-and-detail-field.md`, and proof obligations did not explicitly cover `19-01`, `19-02`, and `19-08`.
- Note: this section records draft-stage independent review only. It is not the closure audit required before `Plan Status: completed`.

## Closure

Status Note: All in-scope retained findings `19-01` through `19-19` are landed with focused proof and synced owner-doc adjudication; the only remaining blockers were closure-text synchronization and final independent closure evidence.

Closure Audit Evidence:

- Reviewer / Agent: fresh independent closure audit on 2026-05-21 (`ses_1b5ff4e2dffewTvsmyE3lf6xJh` initial fail for closure-sync drift, then final pass after closure/text verification sync)
- Evidence: re-checked `docs/plans/00-plan-authoring-and-execution-guide.md`, this plan, `docs/analysis/2026-05-20-deep-audit-full/19-error-propagation.md`, the landed code/tests/docs, and `docs/logs/2026/05-21.md`; no remaining in-scope `19-01` through `19-19` blocker remains, and final workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed.

Follow-up:

- no remaining plan-owned work
