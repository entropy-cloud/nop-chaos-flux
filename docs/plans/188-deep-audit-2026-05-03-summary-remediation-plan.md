# 188 Deep Audit 2026-05-03 Summary Remediation Plan

> Plan Status: in progress
> Last Reviewed: 2026-05-03
> Source: `docs/analysis/2026-05-03-deep-audit-full/summary.md`, `docs/analysis/2026-05-03-deep-audit-full/01-dependency-graph.md`, `docs/analysis/2026-05-03-deep-audit-full/02-module-responsibility.md`, `docs/analysis/2026-05-03-deep-audit-full/04-state-ownership.md`, `docs/analysis/2026-05-03-deep-audit-full/07-lifecycle.md`, `docs/analysis/2026-05-03-deep-audit-full/08-validation.md`
> Related: `docs/plans/178-validation-owner-bootstrap-and-hidden-participation-plan.md`, `docs/plans/166-module-hygiene-and-designer-async-cleanup-plan.md`, `docs/plans/161-workspace-quality-and-dx-improvement-plan.md`, `docs/plans/185-large-file-hotspot-split-plan.md`, `docs/plans/187-adversarial-review-2026-05-03-remediation-plan.md`

## Purpose

收口 `docs/analysis/2026-05-03-deep-audit-full/summary.md` 中已进入汇总的高置信 residual，但只 owner 其中 13 条需要一起落到 live code / docs / focused tests 的问题；剩余 1 条低风险 `DesignerXyflow*` root barrel cleanup 只做 follow-up routing，不作为本计划 closure 前提。

本计划不把仍待子项复核的 deep-audit residual 混进同一个 owner plan，也不重开已关闭 plan 的旧 scope。

## Current Baseline

- `docs/analysis/2026-05-03-deep-audit-full/summary.md` 已从 18 个维度初审、18 个维度复核和 4 个子项复核中，收敛出 14 条允许进入汇总的结论。
- 本计划只 owner `summary.md` 中以下 13 条条目；剩余 1 条低风险条目（`packages/flow-designer-renderers/src/index.tsx` 的 `DesignerXyflow*` root export）不作为本计划 closure 前提，需在 closure 时显式路由给 successor/follow-up。

| Summary Finding                                                          | Owner Slice            | In Scope |
| ------------------------------------------------------------------------ | ---------------------- | -------- |
| `form-runtime-field-ops.ts` containment                                  | Phase 1                | yes      |
| `form-runtime-validation.ts` pending/readiness semantics                 | Phase 1                | yes      |
| `form-runtime-submit-flow.ts` submit bootstrapping gating                | Phase 1                | yes      |
| `word-editor/page-controls.tsx` margin dialog owner sync                 | Workstream 3A          | yes      |
| `owner-based-validation-contracts.test.ts` oversized contract file       | Phase 1                | yes      |
| `flux-renderers-form/package.json` missing test dependency               | Workstream 3B          | yes      |
| `flux-renderers-data/package.json` missing test dependency               | Workstream 3B          | yes      |
| `crud-renderer-state.ts` cleanup                                         | Phase 2                | yes      |
| `tree-renderer.tsx` cleanup                                              | Phase 2                | yes      |
| `designer-page.tsx` cleanup                                              | Phase 2                | yes      |
| `spreadsheet/page-renderer.tsx` cleanup                                  | Phase 2                | yes      |
| `report-designer/page-renderer.tsx` cleanup                              | Phase 2                | yes      |
| `word-editor-page.tsx` cleanup                                           | Phase 2                | yes      |
| `flow-designer-renderers/src/index.tsx` `DesignerXyflow*` barrel cleanup | Follow-up routing only | deferred |

- 其中最高 ROI 的问题集中在 `packages/flux-runtime/src/form-runtime-field-ops.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`：
  - runtime field registration 仍缺少 owner subtree containment 校验。
  - submit 入口仍缺少 bootstrapping lifecycle gating。
  - debounced async validation 仍未计入 owner-level `validating` / `ready` truth semantics。
- `packages/word-editor-renderers/src/toolbar/page-controls.tsx` 仍把页边距对话框 state 作为脱离 owner 的本地 draft：打开时不从当前 paper settings hydrate，Apply 后也不回写 owner/store。
- `packages/flux-renderers-data/src/crud-renderer-state.ts`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx` 这 6 条 host/renderer `statusPath` publication 仍采用各自的 ad-hoc `useEffect(...)` 写法，缺少统一 cleanup-safe 基线。
- `packages/flux-renderers-form/package.json` 和 `packages/flux-renderers-data/package.json` 的测试源码仍直接导入 `@nop-chaos/flux-compiler`，但 manifest 未声明该 workspace 依赖；这与新增的 `docs/references/audit-rules/workspace-manifest-dependency-hygiene.md` 直接对应。
- `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts` 仍为 `>700` 行合同测试仓库化文件；`pnpm check:oversized-code-files` 已能报错，但 live file 还未拆。
- `Plan 178` 已关闭 page-root bootstrap publication 与 generic hidden participation 的上一轮 residual，但本次 summary 中确认的 containment / pending semantics / submit gating 属于新的 validation residual，不是对 Plan 178 已关闭 scope 的简单重复。
- `Plan 187` 的 Phase 1 当前也触达 `packages/flux-runtime/src/form-runtime-validation.ts` 与 `docs/architecture/form-validation.md`，但 owner 的语义不同：`Plan 187` 负责 projected child validation metadata 和 ordinary validation request 的 generic lifecycle gating；本计划不重新 owner ordinary validation 的 generic bootstrapping gating，只 owner containment、submit-entry gating、pending/readiness semantics，以及与这些语义直接绑定的 contract test split。
- `Plan 166` 已关闭一轮 designer async cleanup；本次 `statusPath` cleanup residual 是另一类 owner-summary publication consistency 问题，不应回写到 Plan 166 的 closed scope。
- `Plan 161` 曾覆盖 workspace-quality / DX 基建，但 summary 中这 2 条 manifest hygiene 缺口仍是新的、repo-observable residual。
- `Plan 185` 已关闭旧的 3-file hotspot split；当前超大文件 residual 仅剩 `owner-based-validation-contracts.test.ts` 这个测试合同聚合热点，不应重新打开 Plan 185。

## Goals

- 让 validation owner 的 registration containment、submit bootstrapping behavior、pending-readiness semantics 回到单一且可测试的 live baseline。
- 让 6 条 `statusPath` publication 路径收敛到 cleanup-safe owner summary publication 模式。
- 消除本次 summary 中确认的局部 owner state 脱节、workspace manifest hygiene 缺口和超大 contract 测试文件残留。
- 在同一个 owner plan 中把相关 focused tests、architecture docs、audit rules 引用和 `docs/logs/` 同步到最终状态。

## Non-Goals

- 不处理 `docs/analysis/2026-05-03-deep-audit-full/summary.md` 之外的未纳入汇总条目，尤其是不重复打开仍待子项复核的 dim 05/06/09/10/11/12/13/14/16/17/18 发现。
- 不在本计划内重开 `Plan 178` 已关闭的 hidden-field participation、page-root bootstrap publication 历史范围。
- 不在本计划内做 flow-designer / spreadsheet / report / word 的 broader host action provider、i18n、styling、API facade 收口。
- 不把 `packages/flow-designer-renderers/src/index.tsx` 的 `DesignerXyflow*` export 收窄当作本计划 closure 前提；它属于可暂缓的低风险 surface cleanup，应在本计划 closure 时明确归档到 successor plan 或 follow-up。
- 不在本计划内 owner generic ordinary validation request lifecycle gating under `bootstrapping` / `refreshing`；该语义归 `Plan 187` Phase 1。

## Scope

### In Scope

- `packages/flux-runtime/src/form-runtime-field-ops.ts`
- `packages/flux-runtime/src/form-runtime-validation.ts`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts`
- focused validation tests in `packages/flux-runtime/src/__tests__/owner-based-validation-contracts.test.ts` and any split successor files
- `packages/word-editor-renderers/src/toolbar/page-controls.tsx`
- `packages/word-editor-core/src/editor-store.ts` and related paper-settings owner surfaces if needed for synchronization
- `packages/flux-renderers-data/src/crud-renderer-state.ts`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- `packages/flow-designer-renderers/src/designer-page.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- any shared cleanup-safe helper introduced for status publication
- `packages/flux-renderers-form/package.json`
- `packages/flux-renderers-data/package.json`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/references/form-validation-execution-details.md` if the exported runtime semantics wording changes
- any stable doc/script added for workspace manifest hygiene verification
- `docs/logs/` corresponding execution-date entries

### Out Of Scope

- `packages/flow-designer-renderers/src/index.tsx` public surface cleanup
- generic ordinary validation request lifecycle gating under `bootstrapping` / `refreshing` beyond what is needed to keep submit-entry semantics honest (owned by `Plan 187`)
- dim 05 subscription precision residuals
- dim 06 async/cancellation residuals not already in `summary.md`
- dim 09 renderer-contract residuals
- dim 10/11/12/13/14/16/17/18 issues that were explicitly left out of `summary.md`

## Sequencing Dependencies

- `Plan 187 Phase 1` 与本计划 `Phase 1` 有文件重叠：`packages/flux-runtime/src/form-runtime-validation.ts`、`docs/architecture/form-validation.md`。
- 本计划默认 boundary 为：
  - `Plan 187` owner projected validation metadata 与 ordinary validation request 的 generic lifecycle gating。
  - `Plan 188` owner runtime registration containment、submit-entry bootstrapping gating、pending/readiness semantics，以及与这些语义直接绑定的 contract test split。
- 如果执行时 `Plan 187` 尚未落地，必须先做一次 live re-audit，再决定：
  - 先执行 `Plan 187 Phase 1`，再执行本计划 `Phase 1`；或
  - 在同一交付批次中按上述 boundary 一次性实现，但 closure 时两个 plan 都要能分别证明自己的 owner slice。
- `Phase 2` 只 owner `statusPath` publication cleanup，不重开 `Plan 166` 的 async cancellation，也不触碰 `Plan 187` 的 tree runtime / port semantics。
- `Workstream 3B` 只 owner package-local workspace import declaration hygiene，不重开 `Plan 161` 的广义 DX/tooling program。
- `Phase 1` 中的测试文件拆分只服务于 validation residual regression coverage，不重开 `Plan 185` 的 broader hotspot campaign。

## Execution Plan

### Phase 1 - Validation Owner Residual Convergence

Status: completed
Targets: `packages/flux-runtime/src/form-runtime-field-ops.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, focused runtime tests, `docs/architecture/form-validation.md`, `docs/references/form-validation-execution-details.md`, `docs/logs/`

- [x] Re-audit the live owner-registration and validation-entry paths against `owner-registration-containment-and-validation-participation.md` and `validation-pending-readiness-semantics.md` so this phase lands one final baseline rather than another local patch.
- [x] Add subtree containment checks to runtime field registration so `path` and `childPaths` are rejected before entering owner-local participation maps when they fall outside the receiving owner's subtree.
- [x] Make submit entrypoints under `bootstrapping` follow one explicit supported behavior instead of writing touched/submitting state and then behaving like ordinary clean success. The chosen behavior must be frozen in code, tests, and docs as either `wait until active` or an explicit structured rejection.
- [x] Make debounced-but-not-yet-started async validation count as pending owner work for `validating`, `ready`, and any equivalent owner summary semantics.
- [x] Split `owner-based-validation-contracts.test.ts` by contract theme while adding focused regressions for containment rejection, submit bootstrapping behavior, and pending debounce semantics.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Runtime registration rejects foreign `path` and `childPaths` before mutating owner-local maps.
- [x] Submit under `bootstrapping` has one repo-observable, test-backed baseline: either it waits for activation before mutating submit state, or it returns an explicit structured rejection without touching submit/touched state.
- [x] Debounced validation windows still publish owner-level pending work (`validating` / `ready` semantics remain honest).
- [x] `owner-based-validation-contracts.test.ts` is split below the hard-size limit, and the replacement test files preserve or extend coverage for containment, submit gating, and pending debounce semantics.
- [x] `docs/architecture/form-validation.md` and `docs/references/form-validation-execution-details.md` describe the final supported baseline only.
- [x] `docs/logs/` 对应日期条目已更新。

### Phase 2 - Shared Status Publication Cleanup Baseline

Status: completed
Targets: `packages/flux-renderers-data/src/crud-renderer-state.ts`, `packages/flux-renderers-data/src/tree-renderer.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx`, `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-page.tsx`, any shared helper extracted for cleanup-safe publication, focused tests, `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/logs/`

- [x] Introduce or standardize a cleanup-safe `statusPath` publication baseline instead of leaving 6 ad-hoc host/renderer `useEffect(...)` implementations.
- [x] Migrate the 6 confirmed summary paths to the shared helper or an equivalent cleanup-safe pattern, preserving existing summary payload semantics.
- [x] Add focused tests for publish-then-unmount behavior so parent scopes no longer retain stale host summaries after the publisher disappears.
- [x] Update owner docs to make the cleanup-safe publication baseline explicit and aligned with `status-path-publication-cleanup.md`.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] All 6 summary-owned `statusPath` publication paths (`crud-renderer-state.ts`, `tree-renderer.tsx`, `designer-page.tsx`, spreadsheet/report/word `page-renderer.tsx`) define explicit unmount cleanup.
- [x] Parent scopes do not retain stale summary objects after publisher unmount in focused tests.
- [x] If a shared helper is introduced, its owner file path and the 6 migrated call sites are explicit in code and docs; if no shared helper is introduced, the plan records why a per-file fix remained the stable baseline.
- [x] `docs/architecture/renderer-runtime.md` and/or `docs/architecture/flux-runtime-module-boundaries.md` reflect the final publication baseline.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3A - Word Editor Margin Owner Sync

Status: completed
Targets: `packages/word-editor-renderers/src/toolbar/page-controls.tsx`, `packages/word-editor-core/src/editor-store.ts`, focused tests, owner-facing docs if behavior wording is affected, `docs/logs/`

- [x] Make the page-margin dialog read from current owner paper settings when it opens, and ensure applying margins updates the owner/store truth rather than only the bridge command path.
- [x] Add a focused regression test for the page-margin dialog proving the dialog reflects current owner state and that Apply updates the owner-visible result.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Page-margin editing no longer keeps a disconnected local draft; open/apply flows are synchronized with owner truth.
- [x] Focused tests prove the page-margin dialog reads current owner state and writes back correctly.
- [x] Any owner-facing docs touched by this behavior are explicitly updated, or the plan records why no architecture/component doc update was required.
- [x] `docs/logs/` 对应日期条目已更新。

### Workstream 3B - Workspace Manifest Hygiene

Status: completed
Targets: `packages/flux-renderers-form/package.json`, `packages/flux-renderers-data/package.json`, any new or updated verification script/docs for manifest hygiene, `docs/references/audit-rules/workspace-manifest-dependency-hygiene.md` (if examples or cross-links need updating), `docs/logs/`

- [x] Add the missing workspace test dependencies to `flux-renderers-form` and `flux-renderers-data` manifests in the correct dependency section.
- [x] Add one concrete, repo-observable verification path for package-local workspace import declarations. The output must be one of: a committed script, an existing script extended to cover this case, or a documented repeatable command in a stable doc.
- [x] Verify that the chosen check covers at least the two packages identified by the audit and is phrased narrowly enough not to reopen general workspace DX work.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `packages/flux-renderers-form/package.json` and `packages/flux-renderers-data/package.json` declare the live workspace imports used by their tests.
- [x] The repository has one named, repeatable verification path for workspace manifest hygiene, with a concrete file path or command recorded in this plan and the updated docs/logs.
- [x] The added verification path is explicitly scoped to workspace import declaration hygiene, not a reopened broad DX/tooling program.
- [x] Relevant docs and `docs/logs/` entries are updated.

### Phase 4 - Closure Audit And Follow-Up Routing

Status: planned
Targets: in-scope packages, focused tests, this plan, successor-plan routing for deferred low-risk residuals

- [ ] Re-audit the live repo against `docs/analysis/2026-05-03-deep-audit-full/summary.md` and the 4 new audit rules added on 2026-05-03.
- [ ] Confirm every in-scope row from the routing matrix in `Current Baseline` is marked fixed or explicitly moved out of scope with a named successor before closure.
- [ ] Route the deferred low-risk `DesignerXyflow*` root barrel cleanup into a successor plan or explicit follow-up note instead of silently dropping it.
- [ ] Record an independent closure audit with live-code evidence and focused verification results.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [ ] All in-scope summary findings are fixed or explicitly moved to a named successor.
- [ ] Independent closure audit re-checks live behavior, tests, docs, and the routing matrix rather than relying on implementation notes alone.
- [ ] Deferred low-risk residuals have explicit follow-up ownership.
- [ ] This plan's `Closure` section contains independent reviewer/task evidence and the `Follow-up` section names any deferred successor work explicitly.
- [ ] `docs/logs/` 对应日期条目已更新。

## Validation Checklist

> **关闭条件**：只有本 section 所有条目及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。本计划涉及代码和文档变更，因此关闭前仍需完成 focused verification、repo-wide verification 和独立 closure audit。

- [ ] Validation owner containment, submit bootstrapping behavior, and pending-readiness semantics are a single live fact across runtime code, tests, and docs.
- [ ] The 6 summary-owned `statusPath` publishers clean up on unmount and focused tests prove parent scopes do not retain stale summaries.
- [ ] Page-margin editing is synchronized with owner truth rather than a disconnected local draft.
- [ ] Workspace manifest hygiene gaps are closed and have a repeatable verification path.
- [ ] The oversized validation contract test surface is split and still covers the same live contracts.
- [ ] All affected architecture/reference docs and `docs/logs/` entries are synchronized with the final live baseline.
- [ ] Independent subagent or independent reviewer closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Risks And Rollback

- The main scope risk is quietly reopening already-closed validation plans. Execution should keep this plan narrowly focused on the 2026-05-03 summary residuals only.
- The main semantic risk in Phase 1 is landing another local workaround for validation gating instead of one shared owner-truth baseline.
- The main refactor risk in Phase 2 is fixing cleanup for some host shells while leaving others on a forked publication helper.
- The main UX risk in Workstream 3A is changing page-margin synchronization without tests and accidentally regressing the bridge-driven paper settings flow.
- The main closure risk is treating the low-risk `DesignerXyflow*` barrel cleanup as implicitly solved without assigning explicit follow-up ownership.

## Closure

Status Note: Pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- pending; if low-risk surface cleanup or non-summary deep-audit residuals remain after this plan lands, move them into explicit successor plans rather than widening this scope during execution
