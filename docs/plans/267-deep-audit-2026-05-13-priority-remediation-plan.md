# 267 Deep Audit 2026-05-13 Priority Remediation Plan

> Plan Status: planned
> Last Reviewed: 2026-05-13
> Source: `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, `docs/analysis/2026-05-13-deep-audit-batch1/{02-module-responsibility,05-reactive-precision,06-async-safety,07-lifecycle,08-validation,10-styling,12-field-slot,13-type-safety,14-test-coverage,15-security-performance,16-doc-code-consistency,17-naming,18-cross-package,19-error-fidelity,20-accessibility}.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/262-deep-audit-2026-05-13-structural-owner-successor-plan.md`, `docs/plans/263-deep-audit-2026-05-13-public-surface-narrowing-successor-plan.md`, `docs/plans/264-deep-audit-2026-05-13-layout-contract-and-theme-boundary-successor-plan.md`, `docs/plans/265-deep-audit-2026-05-13-reactive-owner-boundary-successor-plan.md`, `docs/plans/266-deep-audit-2026-05-13-async-lifecycle-owner-successor-plan.md`

## Purpose

收口 `2026-05-13-deep-audit-batch1` 中仍值得优先处理的 live runtime defects / contract drifts / verification blind spots，并为本轮未直接修复的 retained items 建立明确 owner 路径，避免把 20 维审计结论再次留在仅有分析、没有执行 owner 的状态。

完成态要求：

- P1 retained items 全部获得最小正确修复、focused proof、必要 owner-doc sync 与 workspace verification。
- 会导致 stale settlement、owner contract 失真、错误保真度丢失、host seed/schema trust boundary 失守、主路径假绿、或主表单可访问性失败的高风险 P2 在本计划中被修复。
- 其余 retained items 必须在 Phase 7 中落到且只落到一种状态：fixed here、moved to explicit successor ownership、removed from active issue set through recorded re-audit、或 adjudicated non-blocking residual with `Why Not Blocking Closure`。
- 计划关闭前必须完成独立子 agent closure audit；不能把“接口已出现”误当成“语义已落地”。

## Current Baseline

- `docs/analysis/2026-05-13-deep-audit-batch1/summary.md` 顶部统计记录的是 54 个深挖发现的复核结果：49 retain、14 downgrade、5 reject；同一份 summary 的 P1/P2/P3 表格列出了 66 个最终 retained IDs。两套数字的语义不同：前者是复核结论计数，后者是后续 remediation owner matrix 应覆盖的 retained ID 集合。
- 当前 batch 的零发现维度是 `03 API 表面积` 与 `09 渲染器契约`。本计划不重开这两个零发现结论，但仍会处理跨维度 summary 中落入 16/17/18/20 等维度的 public-contract、doc-baseline、accessibility、host-boundary retained items。
- P1 retained set 共 10 项：`02-01`, `02-04`, `05-01`, `05-02`, `05-04`, `06-01`, `07-04`, `07-05`, `08-01`, `15-01`。
- 高风险 P2 主要集中在 6 个簇：variant/validation owner 漂移、reactive subscription precision、async abort/stale settlement、error fidelity、host input narrowing、main-path accessibility/focus semantics。
- 现有 `262-266` successor plans 来自前一轮 deep-audit 的 retained set，命名和 owner 方向可复用，但其 scope 尚未覆盖本次 batch 的全部 retained IDs；本计划必须在执行时决定是更新这些 successor plans、创建新的 successor plans，还是在本计划内直接修复。
- `summary.md` 已明确标出一批“可暂缓项”，但这些条目在计划关闭前仍必须被诚实裁定为 residual 或 successor ownership，不能因为 ROI 较低就保持 ownerless。

## Goals

- 修复 10 个 P1 retained items，并为每个行为改动建立 focused regression proof。
- 修复下列高风险 P2 retained items：`04-03`, `05-03`, `06-02`, `06-03`, `06-04`, `07-01`, `07-03`, `07-06`, `08-02`, `08-03`, `08-04`, `12-01`, `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `14-01`, `14-02`, `14-03`, `14-04`, `14-06`, `14-07`, `15-03`, `15-04`, `18-03`, `19-01`, `19-02`, `19-03`, `20-01`, `20-02`, `20-03`, `20-04`.
- 同步受影响的 owner docs、component docs、plan docs 与 daily log，使修复后的 live baseline 在文档层可追踪。
- 为未在本计划直接修复的 retained IDs 建立明确 successor ownership matrix，并记录为什么它们不阻塞本计划 closure。
- 在 closing slice 中完成 full workspace verification 与独立 closure audit。

## Non-Goals

- 不在本计划中要求 66 个 retained IDs 全部直接修复落地；本计划允许 Phase 7 把低风险 structural/style/doc/perf residual 分配给 successor ownership。
- 不重开 summary 已驳回的条目：`01-01`, `04-01`, `04-02`, `15-02`, `18-02`。
- 不把零发现维度 `03`、`09` 重新扩展成 open-ended 探索；只有在某个 in-scope fix 证明 summary 结论失效时才允许重开对应边界。
- 不做 broad visual redesign、全面 accessibility redesign、或全仓测试基础设施重构，除非某个 in-scope defect 证明无法局部修复。
- 不把 large-file split、plan hygiene、naming drift、coverage gate、layout/style cleanup 一概提升为本计划 closure blocker；这些项必须经明确裁定后进入 successor ownership 或合法 residual。

## Scope

### In Scope

- 全部 66 个 retained IDs，分为两类：
- 直接修复集：P1 全量 + Goals 中列出的高风险 P2。
- owner-assignment 集：其余 retained IDs，需在 Phase 7 中进入 explicit successor ownership 或合法 residual classification。
- 受影响的代码路径：`packages/flux-compiler`, `packages/flux-runtime`, `packages/flux-react`, `packages/flux-renderers-form`, `packages/flux-renderers-form-advanced`, `packages/flux-renderers-basic`, `packages/flux-renderers-data`, `packages/report-designer-renderers`, `packages/word-editor-core`, `packages/word-editor-renderers`, `packages/ui`, `apps/playground`, `tests/e2e`, `scripts/verify-no-src-artifacts.mjs`, `scripts/clean-src-artifacts.mjs`。
- 受影响的文档路径：`docs/architecture/*`, `docs/components/*`, `docs/plans/*`, `docs/logs/*`。

### Out Of Scope

- summary 已驳回条目与零发现维度的重新立案。
- 不在 retained matrix 中的额外 open-ended repo cleanup。
- 与本 batch 无关的旧 plan closure work，除非其 plan status drift 本身是本次 retained finding 的直接修复对象（`16-05`, `16-06`, `16-07`）。

## Execution Plan

### Phase 1 - Fix Structural Guardrails And Compiler Hotspots

Status: planned
Targets: `packages/flux-compiler/src/schema-compiler/*`, `packages/flux-renderers-form/src/renderers/input.tsx`, `scripts/{verify-no-src-artifacts,clean-src-artifacts}.mjs`, `packages/*/src/**/*.d.ts.map`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Split or otherwise decompose `packages/flux-compiler/src/schema-compiler/node-compiler.ts` so the main compiler path no longer exceeds the enforced large-file threshold with mixed responsibilities (`02-01`).
- [ ] [Fix] Extend the src-artifact guard/cleanup scripts to detect and clean `.d.ts.map`, then add regression proof that the guard fails when declaration maps leak into `src/` (`02-04`).
- [ ] [Fix] If touched by the `02-04` root-cause repair, clean the currently leaked `.d.ts.map` artifacts and either split or narrow the remaining input-renderer hotspots that still violate the file-ownership threshold (`02-02`, `02-03`).
- [ ] [Proof] Add focused structural verification proving the compiler split preserves current compile behavior and the artifact guard now fails on declaration-map leakage.
- [ ] [Decision] Update any owner docs or package-structure notes required by the compiler split; otherwise record `No owner-doc update required`.

Exit Criteria:

- [ ] `02-01` and `02-04` are fixed and test-covered.
- [ ] Any directly touched `02-02` / `02-03` fallout is either fixed here or explicitly left to Phase 7 successor ownership.
- [ ] Structural guard behavior is repo-observable through a focused proof command or test fixture.
- [ ] Related owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Fix Reactive Precision And Renderer-Owned Publication Drift

Status: planned
Targets: `packages/flux-react/src/{hook-subscriptions.ts,use-source-value.ts}`, `packages/flux-runtime/src/projected-scope-store.ts`, `packages/flux-renderers-form/src/{field-utils/field-handlers.tsx,renderers/form-status-publication.ts}`, `packages/flux-renderers-basic/src/status-hooks.ts`, `packages/flux-renderers-data/src/table-renderer/use-table-visible-columns.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Repair nested `paths` tracking so `useScopeSelector(..., { paths })` and dependent helpers subscribe to exact nested paths rather than root-key broad subscriptions (`05-01`).
- [ ] [Fix] Make non-form field binding preserve precise scope subscriptions instead of falling back to whole-scope observation (`05-02`).
- [ ] [Fix] Add missing `paths` precision for table visible-column state and any related hot-path selectors (`05-03`).
- [ ] [Fix] Remove or narrow stale `$form` summary exposure in projected read-only bindings so non-value updates cannot publish stale snapshots (`05-04`).
- [ ] [Fix] Move renderer-owned `statusPath` / `valuesPath` publication semantics toward runtime-owned publication or otherwise eliminate clear-then-republish effect churn (`07-01`, `07-02`, `07-03`).
- [ ] [Fix] Recreate source observer/controller resources when runtime identity changes so `use-source-value` does not pin old runtime instances (`07-06`).
- [ ] [Proof] Add focused subscription-precision and runtime-swap regression tests, including stale snapshot, nested path, and publish-order cases.
- [ ] [Decision] Update `docs/architecture/renderer-runtime.md` and `docs/architecture/flux-runtime-module-boundaries.md` if the final fix changes publication ownership contracts.

Exit Criteria:

- [ ] `05-01`, `05-02`, and `05-04` are fixed and test-covered.
- [ ] `05-03`, `07-01`, `07-02`, `07-03`, and `07-06` are either fixed here or explicitly assigned in Phase 7 with no ownerless leftovers.
- [ ] Focused proof demonstrates exact nested-path subscriptions and no stale runtime-bound resource retention.
- [ ] Related owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Fix Validation, Lifecycle, And Async Authoritative-Owner Semantics

Status: planned
Targets: `packages/flux-runtime/src/{form-runtime-owner.ts,form-runtime-submit-flow.ts,runtime-owned-factories.ts,runtime-factory.ts,async-data/api-data-source-controller-runtime.ts}`, `packages/flux-react/src/render-nodes.tsx`, `packages/flux-renderers-form-advanced/src/{variant-field/variant-field.tsx,detail-view/projected-validation-runtime.ts,tag-list.tsx}`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Change owner-level validation semantics so disposed/inactive owners cannot report clean success and cannot leave parent submit flows permanently stuck (`06-01`, `08-01`).
- [ ] [Fix] Ensure page/surface validation without a validation plan settles deterministically instead of returning a never-settling promise (`06-02`).
- [ ] [Fix] Thread abort through schema prepare / import loader paths and add authoritative-run gating for async data source `parallel` mode so stale runs cannot publish old results (`06-03`, `06-04`).
- [ ] [Fix] Remove uncontrolled microtask / cleanup `setState` fragment-scope gates and preserve fragment-scope identity across parent-scope changes (`07-04`, `07-05`).
- [ ] [Fix] Align variant-field and projected-validation ownership so owner-selected variant state, projected `validateAll()`, inherit-owner registration, and hidden-branch participation all match the documented runtime contract (`04-03`, `08-02`, `08-03`, `08-04`).
- [ ] [Proof] Add focused tests for owner disposal, submit cancellation, stale async result dropping, fragment scope identity, projected validation scope, and hidden-branch descendant participation.
- [ ] [Decision] Update `docs/architecture/form-validation.md` and any renderer/runtime owner docs that describe projected validation or fragment-scope lifecycle behavior.

Exit Criteria:

- [ ] `04-03`, `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `08-01`, `08-02`, `08-03`, and `08-04` are fixed and test-covered.
- [ ] No in-scope async/validation path can publish stale owner state or hang submit/validation indefinitely.
- [ ] Validation and lifecycle owner docs match the repaired semantics.
- [ ] Focused package tests pass for touched runtime/react/advanced-form paths.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 4 - Fix Error Fidelity, Host Narrowing, And Field-Slot Contract Gaps

Status: planned
Targets: `packages/flux-runtime/src/async-data/request-runtime.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts`, `packages/flux-action-core/src/action-dispatcher/action-execution.ts`, `packages/report-designer-renderers/src/{page-renderer.tsx,renderers.tsx}`, `packages/word-editor-core/src/document-io.ts`, `packages/word-editor-renderers/src/hooks/use-word-editor-state.ts`, `packages/flux-react/src/node-frame-wrapper.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Preserve primary failure semantics across submit follow-up handlers and diagnostics callbacks so hooks cannot overwrite the original validation/submit/action error (`19-01`, `19-03`).
- [ ] [Fix] Preserve HTTP failure structure in async-data requests instead of collapsing `ok:false` into message-only errors (`19-02`).
- [ ] [Fix] Narrow external host/schema/document seeds before promoting them into trusted runtime/core contracts in report designer and word editor paths (`13-01`, `13-02`, `13-03`).
- [ ] [Fix] Align field chrome and metadata typing so `node-frame-wrapper` and report-designer renderer metadata consume the live resolved contract instead of raw-schema fallback or over-narrow types (`12-02`, `12-04`).
- [ ] [Fix] Add structured diagnostics/reporting for report refresh and flow-designer lifecycle hook failures where current behavior only notifies UI or drops detail (`15-03`, `15-04`).
- [ ] [Proof] Add focused tests covering failure propagation, narrowed host inputs, and resolved field-slot typing behavior.
- [ ] [Decision] Update `docs/architecture/renderer-runtime.md`, `docs/architecture/report-designer/design.md`, and any error-handling references affected by the final contract.

Exit Criteria:

- [ ] `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-03`, `15-04`, `19-01`, `19-02`, and `19-03` are fixed and test-covered.
- [ ] Main-path failure reporting preserves primary causes and structured context.
- [ ] Host seed/schema narrowing rules are documented where they form supported behavior.
- [ ] Focused package tests pass for touched runtime/host/editor paths.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 5 - Fix Main-Path Accessibility, Field Interaction, And Test-Gate False-Green Risks

Status: planned
Targets: `packages/flux-react/src/field-frame.tsx`, `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flux-renderers-form-advanced/src/{tag-list.tsx,tree-controls.tsx}`, `tests/e2e/exploratory/*`, `tests/e2e/debug-collapsible.spec.ts`, `packages/flow-designer-renderers/vitest.config.ts`, `packages/report-designer-renderers/vitest.config.ts`, `packages/flux-runtime/src/__tests__/async-data-contracts.test.ts`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Add programmatic label, error, and focus-target associations for composite field chrome, radio-group source errors, and tree-control error targets (`12-01`, `20-01`, `20-02`, `20-03`).
- [ ] [Fix] Remove pseudo-checkbox dead-focus behavior from tree controls and ensure keyboard/focus semantics land on real interactive targets (`20-04`).
- [ ] [Fix] Isolate exploratory/debug Playwright scripts from default gating and remove conditional-execution/swallowed-error patterns that currently allow false-green E2E passes (`14-01`, `14-02`, `14-06`).
- [ ] [Fix] Normalize renderer-package test environments and split omnibus test files where mixed environments or oversized tests hide signal (`14-03`, `14-04`, `14-07`).
- [ ] [Proof] Add focused DOM/ARIA assertions and test-runner proof that the repaired suites now fail on real regressions instead of silently skipping.
- [ ] [Decision] Update owner docs/components docs if the supported accessibility contract or test-runner entrypoints change.

Exit Criteria:

- [ ] `12-01`, `14-01`, `14-02`, `14-03`, `14-04`, `14-06`, `14-07`, `20-01`, `20-02`, `20-03`, and `20-04` are fixed and test-covered.
- [ ] Main-path form controls expose correct accessible label/error/focus semantics.
- [ ] Default test gates no longer include exploratory/debug suites that can pass via conditional execution or swallowed errors.
- [ ] Related owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 6 - Fix Main-Path Performance And Styling/Registration Defects That Remain User-Visible

Status: planned
Targets: `packages/report-designer-renderers/src/{page-renderer.tsx,renderers.tsx}`, `packages/flux-bundle/src/style.css`, `packages/flux-react/src/node-renderer-resolved.tsx`, `apps/playground/src/pages/ding-talk-flow-demo.tsx`

- Item Types: `Fix | Decision | Proof`

- [ ] [Fix] Replace hot-path `JSON.stringify` document change detection with a bounded authoritative dirty-check path in report designer (`15-01`).
- [ ] [Fix] Repair package-owned field-panel CSS registration so the exported field-panel styling reaches the supported consumer path (`18-03`).
- [ ] [Fix] Remove dead BEM fallback selectors from the public bundle CSS and make `frameClassName` participate in `classAliases` expansion where it is part of the supported styling contract (`10-01`, `10-02`).
- [ ] [Fix] Reduce DingTalk overlay node-lookup hot-path complexity if it still reproduces after the other hot-path fixes land (`15-05`).
- [ ] [Proof] Add focused proof for dirty-check performance semantics, CSS registration coverage, and `classAliases` expansion behavior.
- [ ] [Decision] Update styling/runtime docs if the supported class alias or exported CSS contract changes.

Exit Criteria:

- [ ] `10-01`, `10-02`, `15-01`, `15-05`, and `18-03` are fixed and test-covered, or any remaining non-blocking optimization candidate is explicitly adjudicated in Phase 7.
- [ ] No supported styling entrypoint depends on dead fallback selectors or unexpanded alias paths.
- [ ] Performance-sensitive fixes have focused proof rather than anecdotal claims.
- [ ] Related owner docs are updated, or `No owner-doc update required` is recorded.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 7 - Assign Successor Ownership For Remaining Retained IDs

Status: planned
Targets: `docs/plans/*`, `docs/analysis/2026-05-13-deep-audit-batch1/summary.md`, this plan, `docs/logs/*`

- Item Types: `Decision | Follow-up | Proof`

- [ ] [Decision] Build a retained-ID matrix for all 66 retained IDs, marking each one as fixed in Phases 1-6, moved to explicit successor ownership, removed through recorded re-audit, or adjudicated non-blocking residual.
- [ ] [Decision] Reuse and update `262-266` where their owner boundaries still fit; create new successor plans where the existing owner buckets are too broad, stale, or semantically misaligned with this batch.
- [ ] [Decision] Route the lower-priority retained IDs at minimum: `01-02`, `07-07`, `12-03`, `14-05`, `14-08`, `14-09`, `16-01`, `16-02`, `16-03`, `16-04`, `16-05`, `16-06`, `16-07`, `17-01`, `17-02`, `17-03`, `18-01`, plus any item from Phases 1-6 not fixed in-place.
- [ ] [Decision] Ensure no confirmed live defect, contract drift, owner-doc drift, or hard-gate issue is hidden under vague follow-up wording.
- [ ] [Proof] Reconcile the retained-ID matrix against the summary tables so every retained ID has exactly one owner/status at closure time.

Exit Criteria:

- [ ] Every retained ID from `summary.md` appears exactly once in the retained-ID matrix.
- [ ] Any unresolved live defect, contract drift, owner-doc drift, or hard-gate issue has a named successor plan rather than a generic follow-up note.
- [ ] Residual classifications are limited to `watch-only residual`, `optimization candidate`, or `out-of-scope improvement`, each with `Why Not Blocking Closure`.
- [ ] Successor plans or updated successor scopes are linked from this plan and from the relevant daily log entry.
- [ ] `docs/logs/` corresponding date entry is updated.

### Phase 8 - Full Verification And Independent Closure Audit

Status: planned
Targets: full workspace verification, focused tests, this plan, successor plans, daily log

- Item Types: `Proof | Decision | Fix`

- [ ] [Proof] Run all focused tests added or changed by Phases 1-6.
- [ ] [Proof] Run workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all code/doc changes land.
- [ ] [Decision] Run an independent closure audit with a fresh subagent that re-reads this plan, the retained-ID matrix, touched code/docs, and relevant deep-audit files.
- [ ] [Fix] Address any closure-audit blocker before marking the plan `completed`.
- [ ] [Decision] If closure audit finds an item misclassified as residual/non-blocking, move it back into a fix slice or explicit successor ownership before closure.

Exit Criteria:

- [ ] All focused verification passes.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit concludes there is no remaining in-scope blocker, no interface-vs-semantics mismatch, and no silent downgrade of confirmed retained findings.
- [ ] Daily log records execution and closure evidence.

## Closure Gates

> 只有本 section 与各 Phase Exit Criteria 全部勾选后，才能把 `Plan Status` 改为 `completed`。

- [ ] All 10 P1 retained IDs are fixed and test-covered.
- [ ] The high-risk P2 IDs named in `Goals` are either fixed here with proof or moved to explicit successor ownership through a recorded scope change before closure.
- [ ] No confirmed live defect, contract drift, owner-doc drift, or hard-gate issue remains ownerless.
- [ ] Relevant owner docs, component docs, and plan docs are synchronized to the final live baseline.
- [ ] Focused tests cover every behavior-changing fix.
- [ ] Every retained ID from `docs/analysis/2026-05-13-deep-audit-batch1/summary.md` appears exactly once in the retained-ID matrix.
- [ ] Independent closure audit is completed and recorded with evidence.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None yet. Any deferred item must be added here during execution with classification, `Why Not Blocking Closure`, and successor ownership when required.

## Non-Blocking Follow-ups

None yet. Confirmed live defects, contract drifts, owner-doc drifts, and hard-gate issues may not appear here.

## Retained-ID Matrix

### Direct Fix Set In This Plan

- Phase 1: `02-01`, `02-04`, with opportunistic fallout handling for `02-02`, `02-03`
- Phase 2: `05-01`, `05-02`, `05-03`, `05-04`, `07-01`, `07-02`, `07-03`, `07-06`
- Phase 3: `04-03`, `06-01`, `06-02`, `06-03`, `06-04`, `07-04`, `07-05`, `08-01`, `08-02`, `08-03`, `08-04`
- Phase 4: `12-02`, `12-04`, `13-01`, `13-02`, `13-03`, `15-03`, `15-04`, `19-01`, `19-02`, `19-03`
- Phase 5: `12-01`, `14-01`, `14-02`, `14-03`, `14-04`, `14-06`, `14-07`, `20-01`, `20-02`, `20-03`, `20-04`
- Phase 6: `10-01`, `10-02`, `15-01`, `15-05`, `18-03`

### Explicit Successor Ownership Required Unless Fixed As Incidental Fallout

- Structural / package hygiene candidate bucket: `01-02`, `02-02`, `02-03`, `12-03`
- Reactive/runtime residual bucket: `07-07`
- Test-governance residual bucket: `14-05`, `14-08`, `14-09`
- Doc / plan / naming baseline bucket: `16-01`, `16-02`, `16-03`, `16-04`, `16-05`, `16-06`, `16-07`, `17-01`, `17-02`, `17-03`, `18-01`

### Totals To Reconcile During Execution

- P1 retained IDs in summary table: 10
- P2 retained IDs in summary table: 42
- P3 retained IDs in summary table: 14
- Total retained IDs to reconcile in Phase 7: 66

## Closure

Status Note: pending execution.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending Phase 7 retained-ID adjudication.
