# 189 Deep Audit Full-4 Workbench Surface And Boundary Plan

> Plan Status: completed
> Last Reviewed: 2026-05-03
> Source: `docs/analysis/2026-05-03-deep-audit-full-4/summary.md`, `docs/analysis/2026-05-03-deep-audit-full-4/01-dependency-graph.md`, `docs/analysis/2026-05-03-deep-audit-full-4/02-module-responsibility.md`, `docs/analysis/2026-05-03-deep-audit-full-4/03-api-surface.md`, `docs/analysis/2026-05-03-deep-audit-full-4/10-styling.md`, `docs/analysis/2026-05-03-deep-audit-full-4/18-cross-package.md`
> Related: `docs/plans/167-test-quality-and-reliability-improvement-plan.md`, `docs/plans/169-complex-renderer-contract-and-field-slot-convergence-plan.md`, `docs/plans/171-workbench-surface-and-package-boundary-successor-plan.md`, `docs/plans/177-deep-audit-doc-baseline-sync-plan.md`, `docs/plans/188-deep-audit-2026-05-03-summary-remediation-plan.md`

## Purpose

收口 `deep-audit-full-4` 中仍未被现有计划清晰 owning 的同一类 residual：workbench/package public surface 过宽、包边界被 app 私有实现反向绑定、workbench family 中“真实反向依赖 app 私有 CSS/token”的 theme independence drift、以及 spreadsheet/report host action provider 的命令边界与返回契约继续偏离统一基线。

这份计划只 owner `public surface + package boundary + workbench host command/result contract + app-private theme dependency cleanup` 这一组残留，不把 reactive precision、validation owner、field-slot、测试质量、纯文档导航 drift、或更宽泛的 token layering 优化混进同一 owner plan。

## Current Baseline

- `docs/analysis/2026-05-03-deep-audit-full-4/summary.md` 已把 full-4 深审收敛到 35 条保留项，但其中只有一部分属于同一个 workbench/package boundary owner surface。
- 本计划允许吸收与该 owner surface 同属一面的 retained P2 条目，只要它们已在 source 维度文档中被保留且与同一 public-surface/theme boundary 收口直接相关；不自动吸收 summary 中列为“可暂缓”的低 ROI 命名项。
- 现有已完成计划的 owner 范围如下：
  - `Plan 171` 已收口 2026-05-01 那一轮 workbench/package surface 问题，但不覆盖本次新确认的 `apps/playground -> ui/src` 直连、`flux-react` 根入口过宽、以及 spreadsheet/report `ActionResult.error` 丢失。
  - `Plan 169` 已处理 2026-05-01 的 complex renderer contract / field-slot convergence，但不 owner 本轮的 root barrel/public surface/theme token/result normalization 问题。
  - `Plan 177` 已关闭 2026-05-02 的 active doc baseline sync，但不 owner `docs/index.md` 这次新确认的 archived-plan routing drift。
  - `Plan 167` 仍 owner 测试质量与可靠性；本计划不重复 owner `ui` / `flux-i18n` coverage gap 或共享 mutable harness。
- 与已完成 plan 的 seam 进一步冻结如下：
  - 与 `Plan 169` 共享文件并不代表共享 owner 面；`word-editor-page.tsx`、`spreadsheet/report page-renderer.tsx` 在本计划中只 owner namespaced host command adapter/result normalization 与 theme baseline，不重开 root meta / renderer contract 收口。
  - 与 `Plan 167` 的边界是“测试质量”而不是“public export correctness”；若某个 retained private `src/*` import 只有通过补稳定 package export 才能消除，它仍属于本计划的 package boundary owner 面，不转交测试计划。
- 本计划只 owner下表中同属 workbench/package boundary surface 的条目：

| Finding                                                           | File(s)                                                                                                             | In Scope | Why                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| Playground 直接导入 `ui` 私有 CSS 源码                            | `apps/playground/src/styles.css`, `packages/ui/package.json`                                                        | yes      | 真实跨包内部路径依赖，且已有公开子路径可用                                                         |
| `flux-react` 根入口公开内部编排层                                 | `packages/flux-react/src/index.tsx`                                                                                 | yes      | public surface 过宽，且已有跨包消费者                                                              |
| flow / word 根入口暴露过多实现叶子                                | `packages/flow-designer-renderers/src/index.tsx`, `packages/word-editor-renderers/src/index.ts`                     | yes      | root barrel 已开始冻结内部实现                                                                     |
| spreadsheet/report host action provider 用 `any` 打穿命令边界     | `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`  | yes      | 与同一 host command/result adapter seam 属于同一 owner 面                                          |
| word-editor 依赖 playground 私有 `--nop-*` token                  | `packages/word-editor-renderers/src/*`, `apps/playground/src/styles.css`, `packages/theme-tokens/src/styles.css`    | yes      | package theme independence 未成立                                                                  |
| `ReportFieldPanel` 公开组件依赖 playground CSS                    | `packages/report-designer-renderers/src/report-field-panel.tsx`, `apps/playground/src/styles.css`                   | yes      | 公开 surface 仍反向依赖 app 私有样式                                                               |
| spreadsheet/report host action provider 丢失 `ActionResult.error` | `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`  | yes      | workbench host family 的统一结果契约已经分裂                                                       |
| `flux-react` retained internal-orchestration exports 过宽         | `packages/flux-react/src/index.tsx`                                                                                 | yes      | 仅 owner 已保留的 root export widening，不重开已降级的 facade 噪音                                 |
| `createFlowDesignerRegistry` 的 create 语义漂移                   | `packages/flow-designer-renderers/src/index.tsx`, flow docs                                                         | no       | full-4 summary 已归入“可暂缓项”，本计划只记录为 deferred naming residual                           |
| Flow Designer 默认 token 层未优先复用共享 `--nop-*`               | `packages/flow-designer-renderers/src/designer-theme.css`, `packages/flow-designer-renderers/src/designer-page.tsx` | no       | 这是 cross-surface token layering 优化，不是 app-private theme dependency 或 package boundary leak |
| `docs/index.md` archived plan routing drift                       | `docs/index.md`                                                                                                     | no       | 这是 doc-baseline owner 面，需单独 successor                                                       |
| `ImportFrame` / `ImportStack` glossary drift                      | `docs/references/terminology.md`                                                                                    | no       | 同上，属于文档基线而非本计划 public surface                                                        |
| `ui` / `flux-i18n` test gap 与 shared mutable harness             | `packages/ui`, `packages/flux-i18n`, form test-support                                                              | no       | 仍由 test-quality successor owner                                                                  |

- 当前更高风险的 in-scope residual 不是“单点 style cleanup”，而是以下 4 类真实 boundary drift：
  1. app/public package surface 仍直连 `packages/*/src/*`
  2. root barrel 把内部编排/叶子实现冻结成实际公共 API
  3. package-owned workbench UI 依赖 playground-only theme/root CSS
  4. spreadsheet/report namespaced host command/result adapter 面与 flow/word family 不一致

## Goals

- 让 workbench/package public surface 回到更窄、更可解释的公开契约。
- 消除 app 对 package 私有 `src/` 路径的真实依赖，统一走 package exports。
- 让 word/report 这类 package-owned workbench UI 不再依赖 playground 私有 token/CSS 才能成立。
- 让 spreadsheet/report host action provider 与 flow/word family 收敛到统一的 typed command boundary 与 `ActionResult` 错误出口。
- 在同一 owner plan 中同步必要的 architecture/component docs、focused tests 与 daily log，避免再次靠 audit 手工兜底。

## Non-Goals

- 不处理 `DialogHost` broad subscription、`validateForm()` swallowed rejection、source-prop React owner、validation owner bootstrap 等 reactive/async/validation residual。
- 不重开 `detail-field` / `detail-view` / field-slot / renderer region contract 收口；这些属于 renderer contract successor 面。
- 不处理 `ui` / `flux-i18n` 覆盖率、shared mutable harness、以及一般性的跨包 `src/*` 测试导入治理；但若某条 retained import 只能通过补稳定 package export 才能收口，则仍留在本计划。
- 不在本计划内处理 `docs/index.md` archived-plan routing、`ImportFrame` glossary drift、或其他纯 doc-baseline residual；这些应进入单独 doc successor。
- 不把 playground demo 的 BEM 残留当作 closure blocker；它只是示例层样式债务。
- 不把 `createFlowDesignerRegistry` 命名语义偏差当作本计划 closure blocker；full-4 summary 已将其列为可暂缓项。
- 不处理 Flow Designer `--fd-*` 是否优先分层复用共享 `--nop-*` 的 token layering 优化；该项虽被 retained，但不属于本计划要收口的 app-private theme dependency owner 面。

## Scope

### In Scope

- `apps/playground/src/styles.css`
- `packages/ui/package.json`
- `vite.workspace-alias.ts`（如需要仅做与 `@nop-chaos/ui/base.css` 公开入口一致性的同步）
- `packages/flux-react/src/index.tsx`
- `packages/flow-designer-renderers/src/index.tsx`
- `packages/word-editor-renderers/src/index.ts`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/word-editor-renderers/src/preview/doc-preview-page.tsx`
- `packages/word-editor-renderers/src/panels/dataset-panel.tsx`
- `packages/word-editor-renderers/src/panels/field-list.tsx`
- `packages/report-designer-renderers/src/report-field-panel.tsx`
- `packages/report-designer-renderers/src/index.ts`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/theme-tokens/src/styles.css`
- `docs/architecture/theme-compatibility.md`
- `docs/architecture/flux-runtime-module-boundaries.md`
- `docs/architecture/flow-designer/api.md`
- `docs/architecture/flow-designer/design.md`
- 如 public surface 改变时直接受影响的组件/owner docs
- focused tests covering exports, theme-token fallback, and host command/result normalization
- `docs/logs/2026/05-03.md`

### Out Of Scope

- `docs/index.md`
- `docs/references/terminology.md`
- `packages/flux-runtime/src/form-runtime*`
- `packages/flux-react/src/dialog-host*.tsx`
- `packages/flux-react/src/use-node-source-props.ts`
- `packages/flux-renderers-form-advanced/src/detail-view/*`
- `packages/flux-renderers-form-advanced/src/composite-field/*`
- `packages/ui` / `packages/flux-i18n` coverage expansion
- `packages/flux-renderers-form/src/test-support.tsx` 及 test harness 清理
- playground BEM demo CSS migration

## Closure Gates

- [x] 所有 in-scope confirmed public-surface leaks 都已收敛到 package exports 或更窄的根入口 surface
- [x] 所有 in-scope confirmed package/theme independence drifts 都已收敛，不再依赖 playground 私有 CSS/token 作为默认前提
- [x] spreadsheet/report host namespace provider 的 typed command boundary 与 `ActionResult` 契约已与 peer family 对齐
- [x] 必要 focused verification 已完成
- [x] 所有适用的 lint / script / CI hard gates 已通过
- [x] 受影响的 owner docs 已同步到 live baseline，或明确写明 `No owner-doc update required`

## Deferred But Adjudicated

### Playground Flow-Designer BEM Residual

- Classification: `watch-only residual`
- Why Not Blocking Closure: 该问题位于 playground demo/example 层，不影响本计划要收口的 package public surface、theme independence、或 host result contract。
- Successor Required: `no`
- Successor Path: n/a

### `createFlowDesignerRegistry` Naming Drift

- Classification: `optimization candidate`
- Why Not Blocking Closure: full-4 summary 已将该项列为“可暂缓项”；它影响认知清晰度，但不阻断本计划要收口的 package export、theme independence、或 host command/result contract 成立。
- Successor Required: `no`
- Successor Path: n/a

### Flow Designer Shared-Token Layering Residual

- Classification: `optimization candidate`
- Why Not Blocking Closure: full-4 retained 的是 cross-surface token layering 改进，而不是 package 对 playground 私有 token 的真实反向依赖；它不阻断本计划要收口的 app-private theme dependency baseline 成立。
- Successor Required: `no`
- Successor Path: n/a

## Non-Blocking Follow-ups

- `docs/index.md` archived-plan routing drift 与 `ImportFrame` / `ImportStack` glossary 缺口由 `docs/plans/190-deep-audit-full-4-doc-baseline-successor-plan.md` 单独 owning。
- `ui` / `flux-i18n` coverage gap 与 shared mutable harness 继续由测试质量 successor owner。

## Execution Plan

### Phase 1 - Freeze The Retained Boundary Baseline

Status: completed
Targets: this plan, in-scope public barrels, theme docs, `docs/logs/2026/05-03.md`

- Item Types: `Decision | Proof`

- [x] Re-audit each in-scope residual against live code and freeze the final “real defect vs accepted convenience surface” boundary.
- [x] Decide the final support level for `flux-react` root exports: stable root surface vs `unstable/internal` vs facade-only.
- [x] Decide whether `ReportFieldPanel` remains a public package surface or is demoted behind a narrower export path.
- [x] Freeze the final theme-independence baseline for `--nop-*`: shared token package vs package-local fallback, but no longer playground-private.
- [x] Freeze the final host-provider boundary baseline: explicit typed command adapter plus top-level error normalization, not raw `Record<string, unknown> + as any` glue.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] The plan records one final repo-observable decision for every in-scope residual.
- [x] Any deferred/non-blocking items have explicit justification instead of implicit omission.
- [x] Any owner-doc baseline changed by Phase 1 decisions is updated in the affected architecture docs, or `No owner-doc update required` is explicitly recorded for this phase.
- [x] `docs/logs/2026/05-03.md` records the frozen baseline decisions.

### Phase 2 - Public Surface And Package Boundary Cleanup

Status: completed
Targets: `apps/playground/src/styles.css`, `packages/ui/package.json`, `packages/flux-react/src/index.tsx`, `packages/flow-designer-renderers/src/index.tsx`, `packages/word-editor-renderers/src/index.ts`, focused tests, related docs

- Item Types: `Fix | Proof`

- [x] Replace the direct `packages/ui/src/styles/base.css` import in playground with the public `@nop-chaos/ui/base.css` entry.
- [x] Narrow `flux-react` root exports so the retained internal orchestration helpers / raw contexts are no longer silently treated as broad public API, or explicitly move them to a narrower `unstable` surface with docs.
- [x] Narrow `flow-designer-renderers` and `word-editor-renderers` root barrels to the intended stable package surface.
- [x] Add focused tests or static verification proving the narrowed public surfaces still support the intended consumers.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] No in-scope app/package path still imports `packages/*/src/*` where a public export exists.
- [x] Root barrels in scope no longer expose implementation-leaf surfaces without an explicit support decision.
- [x] Focused verification proves the retained public entry points still work.
- [x] `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/flow-designer/api.md`, and any directly affected owner docs are updated to the final baseline, or `No owner-doc update required` is recorded.
- [x] `docs/logs/2026/05-03.md` is updated.

### Phase 3 - Workbench Theme Independence And Asset Ownership

Status: completed
Targets: `packages/word-editor-renderers/src/*`, `packages/report-designer-renderers/src/report-field-panel.tsx`, `packages/report-designer-renderers/src/index.ts`, `packages/theme-tokens/src/styles.css`, focused tests, `docs/architecture/theme-compatibility.md`, `docs/logs/2026/05-03.md`

- Item Types: `Fix | Proof`

- [x] Move the package-owned default `--nop-*` baseline needed by `word-editor-renderers` out of playground-private CSS and into a shared/package-supported theme layer.
- [x] Ensure `ReportFieldPanel` no longer depends on playground-only `.field-*` classes if it remains publicly exported.
- [x] If `ReportFieldPanel` is not meant to remain public, explicitly narrow the export surface and document the supported replacement.
- [x] Add focused verification proving in-scope package-owned UI still renders with the supported token/CSS baseline outside playground-specific style assumptions.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `word-editor-renderers` no longer requires `apps/playground/src/styles.css` to provide default package-owned token values.
- [x] `ReportFieldPanel` either has package-owned styling support or is no longer part of the root public surface.
- [x] `docs/architecture/theme-compatibility.md` and any affected component docs describe the final supported baseline only.
- [x] Focused verification proves the new theme/token baseline in live code.
- [x] `docs/logs/2026/05-03.md` is updated.

### Phase 4 - Host Action Boundary And Result Contract Convergence

Status: completed
Targets: `packages/spreadsheet-renderers/src/page-renderer.tsx`, `packages/report-designer-renderers/src/page-renderer.tsx`, peer provider references in flow/word packages, focused tests, related docs, `docs/logs/2026/05-03.md`

- Item Types: `Fix | Proof`

- [x] Replace raw `Record<string, unknown> + as any` namespaced host-command glue with an explicit typed adapter at the spreadsheet/report provider boundary.
- [x] Normalize spreadsheet/report provider result mapping so core `error` becomes top-level `ActionResult.error` instead of being buried in `data.error`.
- [x] Ensure in-scope host providers still preserve any needed `data` payload while converging on the shared result/error contract.
- [x] Add focused tests proving spreadsheet/report host providers keep the supported command boundary and expose failed namespaced actions through `result.error` the same way as flow/word family.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Spreadsheet/report namespaced providers no longer erase the host command boundary through `as any`.
- [x] Spreadsheet/report namespaced providers no longer return lossy `ActionResult` objects.
- [x] Focused tests prove the typed provider boundary and `result.error` surface consistently across in-scope host families.
- [x] Any affected architecture/component docs describe one shared result contract baseline.
- [x] `docs/logs/2026/05-03.md` is updated.

### Phase 5 - Verification And Closure Audit

Status: completed
Targets: in-scope packages, focused tests, owner docs, this plan

- Item Types: `Proof | Follow-up`

- [x] Run focused verification for each landed public-surface, theme, and host-result change.
- [x] Run required workspace verification after code/doc changes land.
- [x] Perform an independent closure audit that re-checks live code, package exports, theme roots, and host action result semantics.
- [x] Explicitly route the out-of-scope doc residuals to the recorded successor plan before closure.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] Focused verification is recorded for every landed slice.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining in-scope workbench/package surface residuals owned by this plan.
- [x] Deferred/out-of-scope residual classifications remain honest and the doc residuals have explicit successor ownership.
- [x] `docs/logs/2026/05-03.md` records closure evidence.

## Validation Checklist

> **关闭条件**：只有本 section 所有条目、`Closure Gates`、以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] In-scope package surfaces use supported exports rather than private source paths.
- [x] In-scope root barrels no longer over-expose internal orchestration or implementation-leaf surfaces without an explicit support decision.
- [x] In-scope package-owned workbench UI no longer depends on playground-private theme/CSS defaults.
- [x] Spreadsheet/report host action providers preserve a typed command boundary and expose the shared `ActionResult` error contract.
- [x] All affected docs and `docs/logs/2026/05-03.md` are synchronized to the final baseline.
- [x] No in-scope live defect or contract drift has been silently downgraded into deferred / follow-up.
- [x] Independent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: 计划 owner 的 public-surface narrowing、package-boundary cleanup、package-owned theme baseline、以及 spreadsheet/report host action result normalization 都已在 live code、owner docs、focused tests 与 workspace verification 中闭环；其余 residual 已明确留在 deferred 或 successor owner 面，因此本计划可以关闭。

Closure Audit Evidence:

- Reviewer / Agent: independent general subagent `ses_211f2df27ffemBBU9Z5aflDm0s`
- Evidence: re-checked live owner surface across `apps/playground/src/styles.css`, `packages/{ui,flux-react,flow-designer-renderers,word-editor-renderers,spreadsheet-renderers,report-designer-renderers}`, owner docs, and successor Plan 190; found no remaining in-scope Plan 189 blockers, and doc-only residuals remain explicitly owned by `docs/plans/190-deep-audit-full-4-doc-baseline-successor-plan.md`.

Follow-up:

- `docs/index.md` archived-plan routing drift and `ImportFrame` / `ImportStack` glossary sync remain outside this plan's owner surface and are owned by `docs/plans/190-deep-audit-full-4-doc-baseline-successor-plan.md`.
- playground demo BEM cleanup remains a non-blocking successor item unless a later owner plan chooses to adopt it.
