# 191 Deep Audit Full-5 Doc Baseline And Audit Automation Plan

> Plan Status: planned
> Last Reviewed: 2026-05-03
> Source: `docs/analysis/2026-05-03-deep-audit-full-5/summary.md`, `docs/analysis/2026-05-03-deep-audit-full-5/01-dependency-graph.md`, `docs/analysis/2026-05-03-deep-audit-full-5/03-api-surface.md`, `docs/analysis/2026-05-03-deep-audit-full-5/16-doc-code-consistency.md`, `docs/analysis/2026-05-03-deep-audit-full-5/17-naming.md`
> Related: `docs/plans/188-deep-audit-2026-05-03-summary-remediation-plan.md`, `docs/plans/190-deep-audit-full-4-doc-baseline-successor-plan.md`, `docs/plans/161-workspace-quality-and-dx-improvement-plan.md`

## Purpose

收口 `deep-audit-full-5` 中已经通过独立复核、且 owner surface 明确落在 `docs/*` 与 audit automation 的 residual：

- active docs/examples 仍把 action `dataPath` 当正式字段；
- `flux-runtime-module-boundaries.md` 和 `renderer-runtime.md` 有已确认的 current-baseline 漂移；
- 活跃计划 `189` 的状态字面量不符合当前 plan guide；
- `check-workspace-manifest-deps` 仍会把合法 workspace 子路径导出误判成 manifest hygiene 失败。

本计划只负责把这些 residual 收口到一个新的 live baseline，不混入 `full-5` 其余 renderer/runtime/validation 代码整改。

## Current Baseline

- `docs/analysis/2026-05-03-deep-audit-full-5/summary.md` 已从 18 个维度初审、18 个维度复核和 8 个子项复核中收敛出 25 条保留项，其中一批明确属于 doc-baseline / audit-automation owner surface，而不是 production runtime code。
- `docs/analysis/2026-05-03-deep-audit-full-5/01-dependency-graph.md` 已确认 `scripts/check-workspace-manifest-deps.mjs` 当前把 `@nop-chaos/flux-react/unstable` 这类合法导出子路径误判为缺失依赖；这不是边界违规，而是治理脚本失真。
- `docs/analysis/2026-05-03-deep-audit-full-5/16-doc-code-consistency.md` 已确认：
  - `docs/architecture/flux-runtime-module-boundaries.md` 中关于 `resolveGap` / `createReadonlyScopeBinding` 的迁移叙述落后于 live code；
  - `docs/architecture/renderer-runtime.md` 的 `useCurrentFormState` 签名块漏了 `paths`；
  - `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md` 仍使用 `in_progress`，不符合当前 plan guide。
- `docs/analysis/2026-05-03-deep-audit-full-5/17-naming.md` 已确认：`docs/references/action-payload-matrix.md`、`docs/architecture/api-data-source.md`、`docs/architecture/action-algebra-formal-spec.md`、`docs/architecture/action-graph-authoring.md`、`docs/examples/action-flow-tree.md`、`docs/examples/user-management-schema.md` 仍把 action `dataPath` 写成当前正式 contract；子项复核已明确排除 `DataSourceSchema` 的 legacy `dataPath` compatibility 表述，不应混报。
- `Plan 188` 已关闭 `deep-audit-full` 的代码侧 residual，不 owner 这批 `full-5` 新确认的 doc/automation residual。
- `Plan 190` 已关闭 `full-4` 的 doc-baseline successor，只 owner当时的 stale route 与 `ImportFrame` / `ImportStack` glossary，不应重开到 `full-5` 的 action/dataPath/doc-automation 语义。
- `Plan 161` 涉及 workspace-quality / DX 广义基建，但本计划只 owner一个已确认的 live script defect：workspace manifest checker 对导出子路径的错误归类；不重开 broad DX program。

## Goals

- 让 active docs/examples 中的 action targeting 词汇回到当前 live contract：action 写入目标统一通过 `args.path`，不再把 action `dataPath` 当正式字段。
- 让 `docs/architecture/flux-runtime-module-boundaries.md` 和 `docs/architecture/renderer-runtime.md` 回到当前 live baseline，而不是继续描述已完成但实际上未完成的迁移叙事或遗漏现有 API 选项。
- 让 `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md` 的 plan status 语法符合当前 guide，避免 active plan baseline 自己违约。
- 修正 `scripts/check-workspace-manifest-deps.mjs`，使其把 workspace 子路径 import 归一化到根包名后再比对 manifest，消除当前误报。
- 为这类 doc/action-contract drift 与 workspace-manifest audit automation 建立 closure 证据，避免下一轮 deep audit 再次重复报告同一批问题。

## Non-Goals

- 不处理 `full-5` 中任何 runtime / renderer / validation / async safety 的代码整改项，例如 `frameWrap:none` root-meta 缺口、hidden participation、designer async guard、word-editor save catch 等。
- 不把 `flux-code-editor` source-ref `dataPath` 命名 rough edge 混入本计划；该条在 `full-5` 里已被独立复核降级，且不属于已确认的 active-doc drift。
- 不在本计划内重开 `Plan 188`、`Plan 190` 已关闭的 scope，也不扩大成全仓 docs refresh。
- 不把 `DataSourceSchema` legacy `dataPath` compatibility wording 当成本计划的 action-contract drift 修复目标。
- 不把 workspace manifest hygiene 扩大成 apps/\*、外部依赖分类、或广义 monorepo DX 改造。

## Scope

### In Scope

- `scripts/check-workspace-manifest-deps.mjs`
- `package.json` root scripts only if needed to preserve or clarify the verification entrypoint
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/renderer-runtime.md`
- `docs/references/action-payload-matrix.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/action-algebra-formal-spec.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/examples/action-flow-tree.md`
- `docs/examples/user-management-schema.md`
- `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md`
- `docs/logs/2026/05-03.md`

### Out Of Scope

- `packages/*` production code other than `scripts/check-workspace-manifest-deps.mjs`
- any `full-5` retained item under dimensions 02, 04, 06, 08, 09, 10, 11, 12, 13, 14, or 18
- `docs/components/*` unless a directly in-scope doc edit makes one specific component/example file impossible to keep self-consistent
- broader plan-hygiene work outside correcting Plan 189's status marker
- generalized workspace dependency governance beyond normalizing exported subpath imports to their root package owners

## Closure Gates

- [ ] All in-scope active docs/examples no longer present action `dataPath` as a live supported contract.
- [ ] `flux-runtime-module-boundaries.md` and `renderer-runtime.md` match the current live owner/API baseline for the in-scope statements.
- [ ] `check-workspace-manifest-deps.mjs` no longer misclassifies legal workspace export subpaths as missing manifest dependencies.
- [ ] Plan 189 uses guide-compliant status markers.
- [ ] Necessary focused verification is completed and recorded.
- [ ] All affected docs and `docs/logs/2026/05-03.md` are synchronized to the final baseline.

## Deferred But Adjudicated

### CodeEditor Source-Ref `dataPath` Naming

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: `full-5` independent recheck downgraded this item to a public naming rough edge rather than an already-confirmed active-doc/public-contract drift; no active owner doc currently claims it must already be `path`.
- Successor Required: `yes`
- Successor Path: `docs/plans/192-code-editor-source-ref-contract-review-plan.md` (create only if/when that surface is actively converged)

### Broad Workspace DX Expansion

- Classification: `out-of-scope improvement`
- Why Not Blocking Closure: the only confirmed live defect in this owner area is subpath-normalization inside the existing manifest check script. Broadening to apps/\*, package boundary policies, or new DX programs would violate the single-owner-surface rule.
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- If the fixed manifest checker reveals additional real package-local missing dependencies after subpath normalization, route those concrete findings to a narrow successor instead of widening this plan mid-flight.
- If action `dataPath` wording is discovered in other active docs during execution, either bring those files into scope through an explicit scope change or record them as named successor work before closure.

## Execution Plan

### Phase 1 - Freeze Action Contract And Doc Drift Baseline

Status: planned
Targets: `docs/references/action-payload-matrix.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-graph-authoring.md`, `docs/examples/action-flow-tree.md`, `docs/examples/user-management-schema.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`, `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md`, `docs/logs/2026/05-03.md`

- Item Types: `Decision | Proof`

- [ ] Re-audit every in-scope doc/example against `packages/flux-core/src/types/actions.ts` and the `full-5` retained notes so the plan starts from one frozen list of true drifts, not from stale audit shorthand.
- [ ] Record one explicit decision per in-scope drift: action `dataPath` removal, `resolveGap` / `createReadonlyScopeBinding` wording, `useCurrentFormState(..., { paths })`, and Plan 189 status-literal correction.
- [ ] Record in `docs/logs/2026/05-03.md` that this successor plan owns the `full-5` doc-baseline and audit-automation residual set.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Every in-scope residual is restated as a current live fact with a concrete owner file path.
- [ ] Any excluded wording (especially `DataSourceSchema` legacy `dataPath` compatibility) is explicitly recorded as out of scope rather than silently omitted.
- [ ] `docs/logs/2026/05-03.md` records the frozen baseline and owner assignment.

### Phase 2 - Sync Active Docs And Plan Metadata

Status: planned
Targets: `docs/references/action-payload-matrix.md`, `docs/architecture/api-data-source.md`, `docs/architecture/action-algebra-formal-spec.md`, `docs/architecture/action-graph-authoring.md`, `docs/examples/action-flow-tree.md`, `docs/examples/user-management-schema.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/renderer-runtime.md`, `docs/plans/189-deep-audit-full-4-workbench-surface-and-boundary-plan.md`, `docs/logs/2026/05-03.md`

- Item Types: `Fix | Proof`

- [ ] Remove action `dataPath` from active docs/examples in scope, rewriting affected examples to the current `args.path` baseline.
- [ ] Update `flux-runtime-module-boundaries.md` so it describes the current `resolveGap` and `createReadonlyScopeBinding` ownership/export baseline without stale migration-complete wording.
- [ ] Update `renderer-runtime.md` so `useCurrentFormState`'s signature and explanatory text both include `paths?: readonly string[]`.
- [ ] Update Plan 189's status markers from `in_progress` to `in progress` wherever the current guide requires it.
- [ ] Append the doc-sync decision and touched file list to `docs/logs/2026/05-03.md`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] No in-scope active doc/example still describes action `dataPath` as a current supported action contract.
- [ ] `flux-runtime-module-boundaries.md` and `renderer-runtime.md` match the final live baseline for their touched statements.
- [ ] Plan 189 uses guide-compliant status strings.
- [ ] `docs/logs/2026/05-03.md` is updated.

### Phase 3 - Fix Workspace Manifest Audit Automation

Status: planned
Targets: `scripts/check-workspace-manifest-deps.mjs`, root verification command/docs if needed, `docs/logs/2026/05-03.md`

- Item Types: `Fix | Proof`

- [ ] Normalize workspace import specifiers to their root package name before manifest dependency comparison so `@nop-chaos/*/subpath` imports map back to the owning package.
- [ ] Add or update a focused test/verification path proving legal export subpaths such as `@nop-chaos/flux-react/unstable` are accepted when the root package is declared.
- [ ] Re-run the manifest hygiene command and record the corrected behavior in `docs/logs/2026/05-03.md`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] `check-workspace-manifest-deps.mjs` no longer reports legal workspace export subpaths as missing dependencies.
- [ ] The verification path is narrow enough to prove the fixed defect without reopening broad workspace DX scope.
- [ ] `docs/logs/2026/05-03.md` records the automation fix and the concrete verification command.

### Phase 4 - Closure Audit

Status: planned
Targets: all in-scope docs/scripts, this plan, `docs/logs/2026/05-03.md`

- Item Types: `Proof | Follow-up`

- [ ] Re-audit the live repo against every in-scope row from `Current Baseline` rather than relying on implementation notes.
- [ ] Confirm all in-scope residuals are either landed or explicitly moved out through named successor ownership.
- [ ] Record an independent closure audit from a fresh subagent or reviewer.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] Independent closure audit re-checks docs, script behavior, and the scope table against the live repo.
- [ ] No in-scope doc/action-contract drift or script defect is silently downgraded into follow-up.
- [ ] Any newly discovered out-of-scope residual is assigned explicit successor ownership.
- [ ] `docs/logs/2026/05-03.md` records closure evidence.

## Validation Checklist

> **关闭条件**：只有本 section 所有条目、`Closure Gates`、以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本计划涉及文档和脚本修改，因此关闭前需要完成 focused verification；若脚本改动触发 workspace command，则应记录对应命令结果。\
> **脚本范围说明**：除非执行中引入了新的仓库级变更需求，本计划不默认要求 full-workspace `pnpm typecheck/build/lint/test` 作为 closure gate；需要的是 in-scope docs/script 的 focused verification 和独立 closure audit。

- [ ] In-scope active docs/examples present one final action-targeting vocabulary baseline (`args.path`, not action `dataPath`).
- [ ] In-scope architecture docs match the current live owner/API baseline.
- [ ] The workspace manifest checker correctly handles legal export subpaths.
- [ ] Plan 189 is guide-compliant for the touched status markers.
- [ ] `docs/logs/2026/05-03.md` records execution and closure evidence.
- [ ] Independent closure audit is completed and recorded.

## Risks And Rollback

- The main scope risk is accidentally widening from “confirmed doc baseline + script defect” into a new all-doc cleanup campaign; execution should reject any residual that lacks the same level of audit evidence.
- The main semantic risk is conflating removed action `dataPath` with still-supported `DataSourceSchema` compatibility wording; those must stay separate during edits and closure audit.
- The main tooling risk is overfitting the manifest checker to one subpath instead of normalizing package-root ownership generically for all workspace exports.
- The main closure risk is treating a locally green script edit as sufficient without a fresh independent audit of both docs and automation behavior.

## Closure

Status Note: planned

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- If the code-editor source-ref naming surface is actively converged later, route it through a dedicated successor rather than widening this plan after doc/script closure.
