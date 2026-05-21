# 426 Deep Audit 2026-05-21 Consolidated Code And Contract Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-21
> Source: `docs/analysis/2026-05-20-deep-audit-full/summary.md`, reviewed dimension files under `docs/analysis/2026-05-20-deep-audit-full/`, `docs/plans/424-deep-audit-2026-05-20-remediation-routing-plan.md`
> Related: `docs/plans/423-ux-audit-2026-05-21-remediation-plan.md`, `docs/plans/410-open-ended-adversarial-review-2026-05-19-flow-designer-host-contract-plan.md`, `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`, `docs/plans/411-open-ended-adversarial-review-2026-05-19-word-editor-truth-surface-and-host-contract-plan.md`

## Purpose

在不继续扩散 successor 计划数量的前提下，收口 2026-05-20 deep audit 中除 runtime error fidelity 和 truthfulness/docs baseline 之外的全部 code-facing retained findings，让当前代码、契约、owner behavior、以及相关 owner docs 回到一致、可验证的 live baseline。

## Current Baseline

- 本计划承接 Plan `424` 的 Bucket B，共 `99` 条 retained findings。
- 这些 findings 横跨 Flow Designer、Report Designer、Spreadsheet、Word Editor、form/detail/validation、table/CRUD/data-renderer、shared runtime/compiler/public contract、以及复杂控件的 accessibility/performance residual。
- 继续把这些 surface 拆成更多 successor plan 会回到先前过度碎片化的问题；因此当前策略是保留单一 Plan `426`，但必须把内部 workstreams 收紧到真实共享代码路径、共享 owner-doc 家族、以及共享 proof bundle，而不是继续停留在 umbrella routing 语言。
- Active Plan `423` 与本计划共享少量文件路径，但 `423` 只 owning searchable tree 零结果/clear affordance、async pending feedback、CRUD rich empty state、and drawer close affordance；本计划不重新 owning 这些 UX microinteraction surfaces，只 owning deep-audit contract / owner / host truth defects。

## Goals

- 修复 Bucket B 中全部 `99` 条 retained findings，或在执行中若发现单一计划已不再诚实，则显式产出 successor ownership，而不是静默缩 scope。
- 让 renderer/runtime/host/workbench surfaces 的 live behavior、published contract、owner state、and focused proof 重新一致。
- 将受影响 owner docs 同步到最新 live baseline，避免代码 landed 后继续保留旧 contract 描述。

## Non-Goals

- 不处理维度 `19` 的 runtime error propagation fidelity；该工作由 Plan `425` 单独 owning。
- 不处理 verification truthfulness、active docs routing、naming baseline、或 debugger built-in semantics/i18n baseline；这些工作由 Plan `427` 单独 owning。
- 不为了模板整齐把本计划重新拆回多个 micro-plan，除非执行期有新的 live-repo 证据证明单一 plan 已不诚实。

## Scope

### In Scope

- Plan `424` Bucket B 的全部 retained findings：`02-01` through `02-03`, `03-01`, `03-02`, `03-04` through `03-16`, `03-18`, `04-01` through `04-12`, `05-01` through `05-03`, `06-01`, `06-03`, `07-01` through `07-11`, `08-01` through `08-09`, `09-01` through `09-08`, `10-01` through `10-05`, `11-01`, `12-01`, `12-02`, `12-04`, `13-01` through `13-06`, `15-01` through `15-08`, `18-01` through `18-07`, `20-01` through `20-05`
- Affected code under `packages/flux-*`, `packages/flux-renderers-*`, `packages/flow-designer-*`, `packages/report-designer-*`, `packages/spreadsheet-*`, `packages/word-editor-*`, and `apps/playground`
- Affected focused tests / regression tests
- Affected owner docs listed in the workstreams below
- `docs/logs/2026/05-21.md`

### Out Of Scope

- `19-01` through `19-19`
- `11-02` through `11-04`, `14-01` through `14-14`, `16-01` through `16-14`, `17-01` through `17-05`, `17-07` through `17-14`, `18-08`
- Brand-new audit rounds or unrelated cleanup outside the retained set

## Workstreams

### Workstream 1 - Shared Runtime, Validation, And Field Ownership Closure

Status: completed
Targets: `packages/flux-core/src/`, `packages/flux-compiler/src/`, `packages/flux-runtime/src/`, `packages/flux-react/src/`, `packages/flux-renderers-form/src/`, `packages/flux-renderers-form-advanced/src/`, `packages/ui/src/`, affected tests, `docs/architecture/renderer-runtime.md`, `docs/architecture/flux-runtime-module-boundaries.md`, `docs/architecture/action-scope-and-imports.md`, `docs/architecture/capability-contract-model.md`, `docs/architecture/form-validation.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/value-adaptation-and-detail-field.md`

- Item Types: `Fix | Proof`
- [x] 收口 shared runtime / validation / field ownership findings：`03-04`, `07-01` through `07-11`, `08-01` through `08-09`, `12-01`, `12-02`, `12-04`, `13-03`, `13-04`。
- [x] 修复 render-phase lifecycle、validation owner semantics、field/detail metadata、以及 runtime-published capability/action contracts 的 live drift。
- [x] 补 focused proof，覆盖 runtime lifecycle、validation result semantics、projected-form remapping、detail/field metadata rendering behavior、and published action args contracts。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final runtime/validation/field ownership semantics.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 2 - Renderer Capability And Discovery Metadata Closure

Status: completed
Targets: `packages/flux-renderers-basic/src/`, `packages/flux-renderers-data/src/`, `packages/flux-code-editor/src/`, `packages/flux-renderers-form-advanced/src/`, affected tests, `docs/components/tabs/design.md`, `docs/components/table/design.md`, `docs/components/chart/design.md`, `docs/components/code-editor/design.md`, `docs/components/condition-builder/design.md`, `docs/components/package-splitting-strategy.md`, `docs/architecture/renderer-runtime.md`, `docs/references/renderer-interfaces.md`

- Item Types: `Fix | Proof`
- [x] 收口 renderer capability / discovery metadata findings：`03-12`, `03-13`, `03-14`, `03-18`。
- [x] 修复 Tabs / Table / Chart / migrated form-advanced components 在 runtime handle、definition metadata、owner docs、and source-package discovery 之间的公开契约漂移。
- [x] 补 focused proof，覆盖 `componentCapabilityContracts` publication、chart handle baseline、and migrated renderer `sourcePackage` discovery metadata。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final renderer capability/discovery metadata semantics.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 3 - Flow Designer Host And Workbench Contract Closure

Status: completed
Targets: `packages/flow-designer-*`, `apps/playground/src/taskflow-designer-lib/`, affected tests, `docs/architecture/flow-designer/design.md`, `docs/architecture/flow-designer/api.md`, `docs/architecture/flow-designer/runtime-snapshot.md`, `docs/architecture/flow-designer/tree-mode.md`, `docs/architecture/flow-designer/config-schema.md`, `docs/components/designer-page/design.md`, `docs/architecture/styling-system.md`

- Item Types: `Fix | Proof`
- [x] 收口 Flow Designer host/workbench findings：`02-01`, `03-01`, `03-02`, `03-09`, `03-10`, `04-04`, `04-05`, `05-01`, `05-02`, `10-04`, `10-05`, `13-01`, `15-01`, `18-02`, `18-04`, `18-05`, `20-05`。
- [x] 修复 Flow host payload narrowing、manifest result drift、tree/graph owner split、canvas chrome i18n/styling drift、and title/slot contract mismatch。
- [x] 补 focused proof，覆盖 host command/result contracts、designer tree/graph owner behavior、canvas quick-action semantics、and host page contract publication。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final Flow Designer host/workbench contract surfaces.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 4 - Report Designer And Spreadsheet Host Contract Closure

Status: completed
Targets: `packages/report-designer-*`, `packages/spreadsheet-*`, affected tests, `docs/architecture/report-designer/design.md`, `docs/architecture/report-designer/contracts.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`, `docs/architecture/capability-projection-manifest.md`, `docs/architecture/api-data-source.md`, `docs/architecture/styling-system.md`

- Item Types: `Fix | Proof`
- [x] 收口 Report Designer / Spreadsheet host findings：`02-02`, `03-07`, `03-08`, `03-11`, `03-16`, `04-01`, `04-02`, `04-03`, `04-07`, `04-08`, `04-10`, `05-03`, `06-01`, `06-03`, `10-01`, `10-02`, `10-03`, `13-05`, `13-06`, `15-05`, `15-06`, `15-07`, `18-03`, `18-06`, `20-04`。
- [x] 修复 host args/result drift、projection/selection target contract weakness、dual-owner state split、shell styling leakage、spreadsheet chrome i18n、and core canvas semantics。
- [x] 补 focused proof，覆盖 host action validation、manifest result publication、report/spreadsheet owner-state fidelity、and spreadsheet canvas accessibility/performance-critical semantics。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final report/spreadsheet host contract surfaces.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 5 - Word Editor Truth-Surface Closure

Status: completed
Targets: `packages/word-editor-*`, affected tests, `docs/architecture/word-editor/design.md`, `docs/components/word-editor-page/design.md`, `docs/architecture/capability-projection-manifest.md`

- Item Types: `Fix | Proof`
- [x] 收口 Word Editor truth-surface findings：`03-05`, `03-06`, `04-06`, `04-09`, `13-02`, `15-08`, `18-01`。
- [x] 修复 manifest/provider contract drift、dual-owner state split、host payload narrowing、toolbar i18n drift、and export-path performance residual。
- [x] 补 focused proof，覆盖 Word Editor manifest/provider args-result fidelity、single-owner state behavior、and localized built-in chrome。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final Word Editor truth surface.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

### Workstream 6 - Renderer, Table, CRUD, And Interaction Contract Closure

Status: completed
Targets: `packages/flux-renderers-*`, `packages/flux-react/src/`, affected tests, `docs/components/table/design.md`, `docs/components/crud/design.md`, `docs/components/input-tree/design.md`, `docs/components/tree-select/design.md`, `docs/components/code-editor/design.md`, `docs/architecture/renderer-runtime.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/value-adaptation-and-detail-field.md`

- Item Types: `Fix | Proof`
- [x] 收口 renderer/data/form interaction findings：`02-03`, `03-15`, `04-11`, `04-12`, `09-01` through `09-08`, `11-01`, `15-02`, `15-03`, `15-04`, `18-07`, `20-01`, `20-02`, `20-03`。
- [x] 修复 table/CRUD event and state contracts、detail renderer contract drift、code-editor public prop/event metadata gap、tree/code-editor accessibility gaps、and remaining interaction/performance mismatches。
- [x] 补 focused proof，覆盖 renderer contract payloads、code-editor authoring metadata publication、row/tree semantics、detail rendering behavior、and bounded hot-path performance expectations。

Exit Criteria:

- [x] Workstream-owned findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Focused proof covers the final renderer/table/CRUD/form interaction semantics.
- [x] Listed owner docs are updated if the supported baseline changes; otherwise explicitly record `No owner-doc update required`.
- [x] `docs/logs/2026/05-21.md` is updated.

## Closure Gates

- [x] All in-scope retained findings are fixed or explicitly moved to recorded successor ownership through a scope change.
- [x] Host/workbench/runtime/renderer contracts are consistent with the final live behavior.
- [x] Necessary focused verification is complete and matches the final supported contract.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each workstream explicitly records `No owner-doc update required`.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Independent draft review iteration 1: `needs revision` (`ses_1b80a45a0ffeQxgc1IpipTBv0p`) because the original 3-workstream shape still behaved like a routing umbrella, omitted component owner docs for `03-12` / `03-15` / `03-18`, mis-bucketed `03-15`, and left the overlap boundary with Plan `423` too vague.
- Independent draft review iteration 2: `needs revision` (`ses_1b8054372ffeDFObiRWYujKQzx`) because explicit targets still omitted `packages/flux-compiler/src/` for `13-04`, `apps/playground/src/taskflow-designer-lib/` for `02-01`, `packages/flux-react/src/` for `09-08`, and `docs/components/chart/design.md` for `03-14`.
- Independent draft review iteration 3: `needs revision` (`ses_1b80345ddffeXJwYC0np9PUBXn`) because `05-03` was still mis-bucketed into the Flow Designer workstream and `07-05` still lacked `packages/ui/src/` in the explicit target list.
- Note: this section records draft-stage independent review only. It is not the closure audit required before `Plan Status: completed`.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution proves a single workstream still spans multiple incompatible closure surfaces, create one explicit successor plan from that workstream instead of re-expanding the whole queue.

## Closure

Status Note: Completed after re-auditing the full in-scope retained set, syncing owner docs/examples to the current retained-renderer baseline, and recording an independent closure audit that found no remaining Plan `426` execution debt.

Closure Audit Evidence:

- Reviewer / Agent: fresh-session general subagent `ses_1b681fb89ffeEHJyPnxt21Xwpk`
- Evidence: closure audit concluded `can close`; it found no remaining Plan `426` blocker, confirmed all workstreams/closure gates are now internally consistent, and accepted the recorded verification plus owner-doc evidence as sufficient for honest closure.

Follow-up:

- None.
