# 251 Deep Audit 2026-05-12 Priority Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-05-12
> Source: `docs/analysis/2026-05-12-deep-audit-full/summary.md`, `docs/analysis/2026-05-12-deep-audit-full/final-review-results-{01-05,06-10,11-15,16-20}.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/250-open-ended-adversarial-review-2026-05-12-remediation-plan.md`

## Purpose

收口 2026-05-12 deep-audit 最终复核确认的最高优先级 live defects / contract drifts / user-visible failures，并为剩余保留项建立明确 owner 队列，避免把 112 个 retained findings 塞进一个不可执行的大计划。

完成态要求：Phases 1-6 纳入的 P1 与高风险 P2 均有最小正确修复、focused regression proof、必要 owner-doc sync、workspace verification，以及独立 closure audit；Phase 7 必须把未纳入 Phases 1-6 的 retained findings 分配到具体 successor ownership 或裁定为允许的 residual class，不能用模糊 follow-up 代替。

## Current Baseline

- `docs/analysis/2026-05-12-deep-audit-full/summary.md` 最终统计为 118 个复核条目、112 个保留项、6 个驳回项、7 个 P1、61 个 P2、44 个 P3。
- 第 5 轮 deep-dig 仍有新增，因此该审计按“达到执行上限后进入最终复核”归档，不声称自然收敛；本计划只能基于已复核的 retained findings 执行，不能假装审计已自然穷尽所有细节。
- P1 retained items 是当前最高优先级修复集：`04-03` TreeDocument history owner mismatch、`07-05` render-phase fragment scope cache mutation、`08-01` validation owner precedence、`08-02` disposed/unactivated validation success、`08-04` mixed sync+async validation publication delay、`08-05` TagList validateOn bypass、`16-03` `setValues.args.path` ignored in form context。
- 高风险 P2 retained items 集中在 async cancellation/stale settlement、array validation timing、submitForm retry/error fidelity、Word editor save error fidelity、form/field accessibility association、host discovery/contract drift、public API subpath/documentation drift。
- 大量 P2/P3 是 boundary hygiene、large-file split、styling/UI primitive、test coverage declaration、naming residual 等治理项；它们不能被丢弃，但不应阻塞本 priority remediation plan 的 closure。
- `docs/plans/250-open-ended-adversarial-review-2026-05-12-remediation-plan.md` 已 completed，修复的是同日开放式对抗审查确认的另一组 defects；本计划不得重复承接 `250` 已关闭范围。

## Goals

- 修复 7 个 P1 retained findings，并添加 focused tests 覆盖每个修复语义。
- 修复会导致用户数据丢失、stale mutation、错误重试/传播失真、或可访问性主路径失败的高风险 P2。
- 同步相关 owner docs，使 public contract、runtime behavior、renderer contract、validation/accessibility docs 与修复后 live baseline 一致。
- 为未纳入本计划执行面的 retained P2/P3 建立明确 successor owner buckets，禁止以 `optional` 或 `if time permits` 形式悬空。
- 在完成前运行 full workspace verification，并由独立子 agent 做 closure audit。

## Non-Goals

- 不在本计划中拆分所有 large files、清理所有 BEM/raw UI/style/naming residual、或修完全部 112 个 retained findings。
- 不重做 deep-audit，也不扩大到未被 final review 保留的驳回项，例如 `12-02`、`16-04`、`07-01`、`07-02`、`07-06`。
- 不重开 `docs/plans/250-open-ended-adversarial-review-2026-05-12-remediation-plan.md` 已完成的 CRUD/Table sort、table slot `$slot.record`、hiddenFieldPolicy、tree readOnly/chevron fixes。
- 不进行 broad visual redesign、full accessibility redesign、or whole formula language strictness redesign，除非某个 in-scope fix 证明无法局部修复。
- 不把 P3 hygiene 项作为本计划 closure blocker；它们必须进入 successor ownership 或 residual classification。

## Scope

### In Scope

- `packages/flow-designer-renderers/src/designer-tree-mode.tsx`
- `packages/flow-designer-core/src/core.ts`
- `packages/flux-react/src/{render-nodes.tsx,hooks/use-form-hooks.ts,field-frame.tsx,node-frame-wrapper.tsx,schema-renderer.tsx}`
- `packages/flux-runtime/src/{form-runtime-validation.ts,form-runtime-submit-flow.ts,action-adapter.ts}`
- `packages/flux-action-core/src/action-dispatcher/action-execution.ts`
- `packages/flux-renderers-form-advanced/src/{tag-list.tsx,array-editor.tsx,composite-field/object-field.tsx,composite-field/array-field-runtime.ts}`
- `packages/flux-renderers-data/src/chart-renderer.tsx`, `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx`, and directly coupled table renderer tests for `20-06`
- `packages/spreadsheet-renderers/src/{spreadsheet-grid.tsx,spreadsheet-interactions/use-editing.ts}`
- `packages/flow-designer-renderers/src/dingflow/*`
- `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts`
- `packages/word-editor-renderers/src/word-editor-action-provider.ts`, `packages/word-editor-core/src/document-io.ts`
- `packages/report-designer-renderers/src/field-panel-renderer.tsx`, report/flow/spreadsheet host provider and manifest files used by Phase 6
- `packages/*/package.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `packages/flux-i18n/**`, `packages/flux-renderers-form/src/test-support.tsx`
- Focused tests colocated with touched packages
- Owner docs likely affected: `docs/architecture/form-validation.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/styling-system.md`, `docs/architecture/report-designer/design.md`, `docs/references/form-validation-runtime-types.md`, `docs/references/flux-json-conventions.md`
- `docs/logs/2026/05-12.md` or execution-date daily log

### Out Of Scope

- Large-file/test split items `02-*` unless directly touched by a fix in this plan.
- Styling/BEM/raw UI primitive cleanup `10-*` and `11-*`, except where accessibility fix requires touching the same control.
- Low-risk naming/doc examples `17-01`, `17-03` through `17-08`, except where Phase 6 public contract alignment covers `17-02` generic Button docs.
- Component Lab coverage declaration work `14-*`.
- Report/spreadsheet stringify performance `15-01`, unless Phase 4 or 5 implementation touches report spreadsheet bridge anyway.
- Large public API and styling hygiene items not explicitly listed in Phases 1-6; Phase 7 must assign them to successor ownership before this plan can close.

## Execution Plan

### Phase 1 - Fix P1 State And Render Lifecycle Defects

Status: completed
Targets: `packages/flow-designer-renderers/src/designer-tree-mode.tsx`, `packages/flow-designer-core/src/core.ts`, `packages/flux-react/src/render-nodes.tsx`

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Re-audit live tree-mode ownership path and choose a single source for history snapshots: either core-owned current `TreeDocument` or explicit tree snapshot passed into history push.
- [x] [Fix] Ensure `replaceDocumentWithHistory(nextDoc, treeDocument)` cannot push a history entry containing new `GraphDocument` and stale `TreeDocument`.
- [x] [Proof] Add focused tree-mode undo/redo tests proving Graph/Tree snapshots stay paired after tree command replacement and history traversal.
- [x] [Fix] Move `RenderNodes` fragment child-scope creation/cache mutation out of render/useMemo phase or make allocation lifecycle-safe under aborted concurrent renders.
- [x] [Proof] Add React-focused regression coverage or deterministic unit coverage proving fragment scope cache does not retain allocations from uncommitted renders and still cleans committed scopes.

Exit Criteria:

> 每个 Phase 完成后，必须逐条勾选本节。所有 `[x]` 后才能将 Phase Status 改为 `completed`。

- [x] `04-03` fixed and test-covered.
- [x] `07-05` fixed and test-covered.
- [x] No owner-doc update required is recorded, or `docs/architecture/flow-designer/design.md` / `docs/architecture/renderer-runtime.md` are updated if ownership semantics change.
- [x] Focused tests pass for touched flow-designer and flux-react packages.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Fix P1 Validation Semantics

Status: completed
Targets: `packages/flux-react/src/hooks/use-form-hooks.ts`, `packages/flux-runtime/src/form-runtime-validation.ts`, `packages/flux-renderers-form-advanced/src/tag-list.tsx`, validation tests

- Item Types: `Fix | Proof | Decision`

- [x] [Decision] Define current-form validation owner precedence for nested forms: current form owner must win unless an explicit projection/no-owner sentinel is used.
- [x] [Fix] Update `useCurrentValidationScope()` or provider wiring so fields inside a form do not accidentally read ancestor validation owner.
- [x] [Fix] Change disposed/unactivated validation result semantics from clean success to explicit cancelled/blocked result, or equivalent sentinel that submit callers cannot mistake for valid.
- [x] [Fix] Publish sync validation errors immediately for mixed sync+async field rules, then merge async results after debounce/async completion.
- [x] [Fix] Route TagList change handling through shared field controller validation behavior or gate direct `validateField` / `validateAt('change')` with `validateOn` policy.
- [x] [Proof] Add focused tests for nested form validation owner resolution, disposed/unactivated validation submit behavior, sync+async error timing, and TagList `validateOn: submit/blur` behavior.
- [x] [Decision] Update `docs/architecture/form-validation.md` and `docs/references/form-validation-runtime-types.md` if lifecycle result or owner precedence semantics are public.

Exit Criteria:

- [x] `08-01`, `08-02`, `08-04`, and `08-05` fixed and test-covered.
- [x] Validation docs reflect final owner precedence, lifecycle cancellation, and validation publication semantics.
- [x] Focused validation/form advanced tests pass.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Fix Action Mutation Contract And Submit Retry/Error Fidelity

Status: completed
Targets: `packages/flux-runtime/src/action-adapter.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/word-editor-core/src/document-io.ts`, `packages/word-editor-renderers/src/word-editor-action-provider.ts`, form submit/action tests, word-editor save tests

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Make built-in `setValues` honor `args.path` consistently in form and non-form contexts.
- [x] [Decision] Decide whether `invocation.targeting.targetId` remains as a compatibility fallback; if retained, document exact precedence and add tests.
- [x] [Proof] Add action-adapter tests showing `setValues.args.path` scopes form writes and does not write to root unexpectedly.
- [x] [Fix] Repair `submitForm` action-level retry semantics or explicitly route retry ownership to nested submit/ajax with documentation and tests proving intended behavior.
- [x] [Proof] Add tests for `submitForm` retry controls, including soft failure and attempt count behavior.
- [x] [Fix] Preserve Word editor save root causes by replacing `saveDocument()` catch-all `null` with structured errors or thrown errors with `cause`, and propagate the reason through the action provider.
- [x] [Proof] Add tests for quota/security/serialization/bridge save failures proving the action result preserves a distinguishable reason instead of generic `Unable to save word document.` only.
- [x] [Decision] Update `docs/references/flux-json-conventions.md` and relevant action docs to match final `setValues` and `submitForm` retry semantics.

Exit Criteria:

- [x] `16-03` fixed and test-covered.
- [x] `19-01` fixed or explicitly documented with tests proving retry ownership.
- [x] `19-02` fixed and test-covered.
- [x] Public action docs match live behavior.
- [x] Focused action/runtime tests pass.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Fix High-Risk Async/Stale Mutation Defects

Status: completed
Targets: `packages/flux-react/src/schema-renderer.tsx`, `packages/word-editor-renderers/src/word-editor-action-provider.ts`, `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-editing.ts`, `packages/flux-renderers-form-advanced/src/composite-field/object-field.tsx`, `packages/flux-code-editor/src/code-editor-renderer/use-sql-editor-state.ts`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Thread `AbortSignal` through schema import preparation and import loading so schema replacement/unmount cancels underlying import work where supported.
- [x] [Fix] Check abort after WordEditor host save hook before clearing dirty state or publishing saved document.
- [x] [Fix] Preserve spreadsheet edit draft until `setCellValue` dispatch succeeds, and surface failure without losing user input; this fix must close both `06-08` and the overlapping `04-01` editing state/data-loss risk or explicitly split the remaining `04-01` state-owner work into Phase 7.
- [x] [Fix] Add unmount/dependency invalidation to object-field `transformOut` sequence guard so stale pending transforms cannot write parent form/scope.
- [x] [Fix] Add latest-request and unmount guard to CodeEditor SQL execution so old requests cannot overwrite newer results.
- [x] [Proof] Add focused tests for each async/stale mutation path, including cancellation/stale settlement cases.

Exit Criteria:

- [x] `04-01`, `06-01`, `06-06`, `06-08`, `06-13`, and `06-16` fixed and test-covered, or any remaining non-data-loss part of `04-01` is assigned to a named successor in Phase 7.
- [x] No stale async path can mutate state after owner identity/unmount/cancellation in the covered cases.
- [x] Owner docs updated if cancellation semantics become public; otherwise `No owner-doc update required` recorded.
- [x] Focused package tests pass.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 5 - Fix Validation/Field Projection And Accessibility P2 Main Paths

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts`, `packages/flux-react/src/{field-frame.tsx,node-frame-wrapper.tsx}`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-renderers-form-advanced/src/condition-builder/*`, `packages/flux-renderers-data/src/{chart-renderer.tsx,table-renderer/*}`, `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx`, `packages/flow-designer-renderers/src/dingflow/*`

- Item Types: `Fix | Proof | Decision`

- [x] [Fix] Gate ArrayEditor parent array validation with `validateOn` policy, separating structural sync from visible validation publication.
- [x] [Fix] Enable array mutation delegation for array-field projected item forms and test nested array controls.
- [x] [Fix] Route FieldFrame chrome inputs through resolved props/meta/regions rather than raw schema for `hint`, `description`, `remark`, `labelRemark`, `labelAlign`, and `labelWidth`.
- [x] [Fix] Add programmatic label/error association for FieldFrame composite/rootTag=`div`, Select, and RadioGroup focus targets.
- [x] [Fix] Add first-invalid focus behavior after submit validation failure.
- [x] [Fix] Add selected-state semantics to condition-builder AND/OR and explicit accessible name for remove subgroup action.
- [x] [Fix] Add semantics for interactive table rows or move activation into named controls; add chart data equivalent; prevent spreadsheet `aria-activedescendant` from pointing to unmounted virtual cells; add DingFlow add-node keyboard dismissal/focus/menu semantics.
- [x] [Proof] Add focused DOM/a11y tests for each fixed path, using programmatic inspection rather than screenshots.
- [x] [Decision] Update `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, and component docs where supported accessibility/field chrome contracts change.

Exit Criteria:

- [x] `08-06`, `12-01`, `12-04`, `20-01`, `20-02`, `20-03`, `20-04`, `20-05`, `20-06`, `20-07`, `20-09`, and `20-10` fixed and test-covered.
- [x] Focus target label/error/state behavior is verified through DOM/ARIA assertions.
- [x] Field projection and field chrome docs reflect final behavior.
- [x] Focused package tests pass.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 6 - Public Contract And Host Discovery Alignment

Status: completed
Targets: `packages/*/package.json`, `vite.workspace-alias.ts`, `tsconfig.base.json`, `packages/flux-i18n`, `packages/flux-renderers-form/src/test-support.tsx`, report/flow/spreadsheet host manifest/provider files, relevant docs

- Item Types: `Fix | Decision | Proof`

- [x] [Fix] Document or implement `subscribeToModelGeneration` and `FormErrorQuery` in public runtime/reference docs.
- [x] [Fix] Resolve `reactComponent` registration path inconsistency by adding a React registry wrapper or documenting core-normalized registry requirements with tests.
- [x] [Fix] Resolve `test-support` public subpath by either making dependency/side effects explicit and safe or moving it to a dedicated internal/test support package.
- [x] [Fix] Add workspace aliases/paths for exported CSS and `flux-i18n` locale public subpaths, or remove exports that should not be public.
- [x] [Fix] Align Flow Designer `$designer` scope export contract with live projection.
- [x] [Fix] Align report designer `selection`/`target` aliases and `inspectorPanels` docs/live projection.
- [x] [Fix] Repair host action discovery for spreadsheet/report designer providers and manifests so every command that remains publicly callable is discoverable through the documented manifest/provider surface, or remove/block/document unsupported arbitrary forwarding with tests proving the final finite contract.
- [x] [Fix] Align generic Button variant docs with live `ButtonSchema` or implement documented aliases.
- [x] [Proof] Add focused tests/static checks for every changed public export, workspace alias/path, host provider discovery surface, or scope projection. For doc-only corrections, record a per-item proof rationale explaining why no runtime test applies.

Exit Criteria:

- [x] `03-02`, `03-03`, `03-04`, `03-05`, `03-06`, `03-07`, `16-01`, `16-02`, `17-02`, `18-01`, `18-02`, `18-03`, and `18-04` are fixed in this phase and have matching proof or explicit doc-only proof rationale.
- [x] Public package exports, workspace aliases, docs, and host discovery surfaces agree.
- [x] Focused tests/static checks cover every changed public export, alias/path, host provider discovery surface, and scope projection unless the item is documented as doc-only with a per-item proof rationale.
- [x] For `18-02`, `18-03`, and `18-04`, no live callable host command remains intentionally undiscoverable unless it is removed from public support and documented as unsupported.
- [x] Docs updated for any public contract changes.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 7 - Successor Ownership For Remaining Retained Items

Status: completed
Targets: `docs/plans/` successor plans, `docs/analysis/2026-05-12-deep-audit-full/summary.md`, `docs/logs/`

- Item Types: `Decision | Follow-up | Proof`

- [x] [Decision] Build a retained-finding matrix for all findings not fixed by Phases 1-6.
- [x] [Decision] Split remaining module-boundary, large-file, styling, UI primitive, test coverage, performance, type hygiene, and naming residuals into owner-scoped successor plans or explicit residual classifications.
- [x] [Decision] Explicitly route retained P2 public/security documentation drift such as `15-02` to a named successor plan unless it is fixed in this plan.
- [x] [Decision] Ensure no confirmed live defect, public-contract drift, owner-doc drift, or hard-gate issue is downgraded to advisory follow-up.
- [x] [Proof] Add links from this plan to every successor plan or residual classification entry.
- [x] [Proof] Reconcile the matrix against the final audit totals: 118 reviewed entries, 112 retained entries, 6 rejected entries, and every retained ID from `final-review-results-01-05.md`, `final-review-results-06-10.md`, `final-review-results-11-15.md`, and `final-review-results-16-20.md` has exactly one owner/status.

Exit Criteria:

- [x] Every retained item from the 2026-05-12 deep audit not fixed in Phases 1-6 is assigned exactly one status in the retained-finding matrix: fixed here, named successor plan, allowed residual, or recorded scope removal.
- [x] Allowed residual classification is limited to watch-only residual, optimization candidate, or out-of-scope improvement with `Why Not Blocking Closure`; confirmed live defects, public-contract drift, owner-doc drift, and hard-gate failures require a named successor plan or an in-scope fix, not residual classification.
- [x] No P1/P2 live defect, public-contract drift, owner-doc drift, or hard-gate issue remains ownerless.
- [x] Successor plans follow `00-plan-authoring-and-execution-guide.md` status/closure requirements.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 8 - Full Verification And Independent Closure Audit

Status: completed
Targets: workspace verification, this plan, daily log, closure evidence

- Item Types: `Proof | Decision | Fix`

- [x] [Proof] Run all focused tests added or modified by Phases 1-6.
- [x] [Proof] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc updates land.
- [x] [Decision] Run an independent closure audit with a fresh subagent that re-reads this plan, live code, focused tests, affected docs, and the deep-audit final review files.
- [x] [Fix] Address any closure-audit blocker before marking this plan completed.
- [x] [Decision] If closure audit finds a true out-of-scope residual, move it to `Deferred But Adjudicated` or a named successor plan with concrete non-blocking reason.

Exit Criteria:

- [x] All focused verification passes.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit concludes no remaining in-scope blocker, no interface-vs-semantics mismatch, and no silent downgrade of confirmed defects.
- [x] Daily log records execution and closure evidence.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] All 7 P1 retained findings are fixed and test-covered.
- [x] In-scope high-risk P2 findings listed in Phases 3-6 are fixed and covered by focused proof, or the plan is revised before execution to remove the item from those phases and assign concrete successor ownership.
- [x] No confirmed live defect, public-contract drift, owner-doc drift, or hard-gate issue is silently deferred.
- [x] Relevant owner docs are synced to final live behavior.
- [x] Focused tests cover every behavior-changing fix.
- [x] Full workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit passes and is recorded in this plan or daily log.
- [x] Text consistency check confirms `Plan Status`, phase statuses, exit criteria, closure gates, and daily log agree.

## Deferred But Adjudicated

### Large Test/Hygiene Residuals

- Classification: `optimization candidate`
- IDs: `02-05`, `02-06`, `02-10`
- Why Not Blocking Closure: `docs/analysis/2026-05-12-deep-audit-full/summary.md` records this oversized-test-file family as downgraded because final review did not reconfirm a hard check failure on 2026-05-12; they remain structural cleanup candidates, not proven hard-gate blockers.
- Successor Required: `no`

### Deferred Naming Residual

- Classification: `watch-only residual`
- IDs: `17-06`
- Why Not Blocking Closure: the final review already classified this docs/naming item as a deferred residual rather than a live contract blocker.
- Successor Required: `no`

### Discussion-Only Naming Residual

- Classification: `watch-only residual`
- IDs: `17-08`
- Why Not Blocking Closure: the remaining drift lives in `docs/discussions`, not active owner-doc baseline, so it does not block closure of the supported runtime contract.
- Successor Required: `no`

## Non-Blocking Follow-ups

None yet. Low-risk P3/hygiene items may only appear here after Phase 7 assigns ownership or records a valid `Why Not Blocking Closure` rationale.

## Phase 7 Matrix

### Fixed In This Plan

- Phase 1: `04-03`, `07-05`
- Phase 2: `08-01`, `08-02`, `08-04`, `08-05`
- Phase 3: `16-03`, `19-01`, `19-02`
- Phase 4: `04-01`, `06-01`, `06-06`, `06-08`, `06-13`, `06-16`
- Phase 5: `08-06`, `12-01`, `12-04`, `20-01`, `20-02`, `20-03`, `20-04`, `20-05`, `20-06`, `20-07`, `20-09`, `20-10`
- Phase 6: `03-02`, `03-03`, `03-04`, `03-05`, `03-06`, `03-07`, `16-01`, `16-02`, `17-02`, `18-01`, `18-02`, `18-03`, `18-04`

### Successor Ownership

- `docs/plans/254-deep-audit-2026-05-12-reactive-and-owner-boundary-follow-up-plan.md`: `02-14`, `02-16`, `04-04`, `05-01`, `05-02`, `05-03`, `05-04`, `05-05`, `05-06`, `05-07`, `05-08`, `09-02`, `09-05`
- `docs/plans/255-deep-audit-2026-05-12-async-lifecycle-follow-up-plan.md`: `06-02`, `06-03`, `06-04`, `06-05`, `06-07`, `06-09`, `06-10`, `06-11`, `06-12`, `06-14`, `06-15`, `06-17`, `07-03`, `07-04`, `07-07`
- `docs/plans/256-deep-audit-2026-05-12-module-boundary-and-test-hygiene-plan.md`: `02-01`, `02-02`, `02-03`, `02-04`, `02-07`, `02-08`, `02-09`, `02-11`, `02-12`, `02-13`, `14-01`, `14-02`, `14-03`
- `docs/plans/257-deep-audit-2026-05-12-doc-baseline-and-public-contract-successor-plan.md`: `02-15`, `03-01`, `08-03`, `15-02`, `17-01`, `17-03`, `17-04`, `17-05`, `17-07`
- `docs/plans/258-deep-audit-2026-05-12-renderer-slot-and-typing-follow-up-plan.md`: `09-03`, `09-04`, `12-03`, `13-01`, `13-02`
- `docs/plans/259-deep-audit-2026-05-12-styling-and-ui-primitive-cleanup-plan.md`: `09-01`, `10-01`, `10-02`, `10-03`, `10-04`, `10-05`, `11-01`, `11-02`, `11-03`
- `docs/plans/260-deep-audit-2026-05-12-accessibility-polish-successor-plan.md`: `20-08`, `20-11`
- `docs/plans/261-deep-audit-2026-05-12-performance-redline-follow-up-plan.md`: `15-01`

### Totals Reconciliation

- Fixed in Plan 251 Phases 1-6: 40 retained IDs
- Assigned to named successor plans: 67 retained IDs
- Allowed residuals: 5 retained IDs
- Total retained IDs reconciled: 112

## Plan Review Log

- 2026-05-12 initial draft created from `docs/analysis/2026-05-12-deep-audit-full/summary.md` and `final-review-results-*.md`.
- 2026-05-12 independent plan audit round 1 found blockers around missing `19-02`, unclear Phase 6 successor-split language, weak public-contract proof gates, In Scope/Targets mismatch, and overlapping `04-01`/`06-08`; draft revised to address those blockers.
- 2026-05-12 independent plan audit round 2 produced one approval and one blocker list; draft revised to strengthen host command discovery, Phase 7 matrix reconciliation, residual classification, `15-02` routing, `17-02` scope wording, and Phase 3 high-risk P2 closure gates.
- 2026-05-12 independent plan audit round 3 reached consensus: `general` subagents `ses_1e4b1f79bffeBUwSKX7piZ2RBQ` and `ses_1e4b1f78effehzlPM7CTOaHKuf` both returned `APPROVE` with no remaining blockers.
- 2026-05-12 execution advanced through Phases 1-6 with code fixes, focused regression proof, public-contract doc sync, workspace alias/path alignment, and Phase 7 successor ownership split across Plans 254-261.
- 2026-05-12 Phase 8 closure verification passed: focused regression checks completed, workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed, and closure audit `ses_1e38950f6ffe6zC5JOJP5QMTAV` was cleared after reconciling stale plan/log bookkeeping.
