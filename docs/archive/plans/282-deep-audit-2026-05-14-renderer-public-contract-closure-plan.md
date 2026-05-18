# 282 Deep Audit 2026-05-14 Renderer Public Contract Closure Plan

> Plan Status: completed
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,03-api-surface.md,09-renderer-contract.md,12-field-slot.md,13-type-safety.md,17-naming.md,18-cross-package.md}`
> Related: `docs/plans/279-resolved-boolean-props-contract-plan.md`, `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 renderer-facing public contract、field-slot compile contract、bundle typing、naming vocabulary、以及 cross-package page-level API drift。

## Current Baseline

- The retained public-contract, renderer-contract, field-slot, typing, naming, and cross-package drift is now closed on the live baseline. Code, tests, and owner docs were re-audited after the final fixes landed.
- Final closure pass confirmed `DesignerPageSchemaInput.config` is required, Flow Designer host scope now converges on canonical `runtime.dirty` without publishing duplicate `runtime.isDirty`, `report-designer-page` now enforces canonical `config` with compatibility-only `designer` authoring normalization, report-designer invalid required inputs emit observable diagnostics instead of silently degrading, tree controls publish canonical root markers, `designer-field.label` supports `value-or-region`, duplicated inspector root-meta publication is removed, compiler `value-or-region + allowSource` classification no longer misroutes source carriers, `FieldCompileContext.compileValue()` honors local `symbolTable` overrides, `flux-bundle` facade types match core contracts, and the remaining report-designer vocabulary/doc drift is synced.
- The final owner-doc sync includes `docs/components/report-inspector-shell/design.md`, `docs/components/report-designer-page/design.md`, the Report Designer family docs under `docs/architecture/report-designer/`, and the Flow Designer runtime docs so the live baseline consistently documents canonical `config`, `selectionTarget`, and `runtime.dirty` surfaces.
- `09-02` 与 `09-06` 不在本计划内：它们依赖 Plan `279` 所拥有的 renderer-facing node-control meta projection contract（`className` / `testid` / `cid` into `props.props`），不得在本计划里平行实现。
- `03-06` 不在本计划内，因为 Plan `280` 已接管 `spreadsheet-page` default body/canvas contract drift。

## Goals

- Align schema types, renderer definitions, runtime behavior, and owner docs for the retained public and renderer-facing contract defects.
- Close retained field-slot and bundle typing drifts without weakening public contracts behind `unknown` or fake schema-node typing.
- Close retained naming and cross-package vocabulary drift where the current batch still confirms a supported-baseline mismatch.

## Non-Goals

- 不接管 Plan `279` 的 boolean-like prop normalization 或 node-control meta projection contract。
- 不接管 Plan `280` 的 `spreadsheet-page` default host/body contract。
- 不吸收 runtime owner/async/lifecycle、styling/UI/a11y、structural/test hard-gate、或 plan-baseline text governance。

## Scope

### In Scope

- `03-01/02/03/04/05`
- `09-01/03/04/05/07/08`
- `12-01/12-02`
- `13-01/13-02/13-03`
- `17-01/17-02/17-03`
- `18-01`
- 相关 docs: `docs/components/report-inspector-shell/design.md`, `docs/components/report-designer-page/design.md`, `docs/references/renderer-interfaces.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/logs/2026/05-14.md`

### Out Of Scope

- `09-02`, `09-06` owned by Plan `279`
- `03-06` owned by Plan `280`
- `04-*`, `05-*`, `06-*`, `07-*`, `08-*`, `10-*`, `11-*`, `14-*`, `15-*`, `16-*`, `19-*`, `20-*`

## Execution Plan

### Phase 1 - Public Surface And Typing Closure

Status: completed
Targets: `packages/flow-designer-renderers/src/**`, `packages/report-designer-renderers/src/**`, `packages/flux-bundle/**`, `packages/flux-core/src/**`, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] Land the completed minimal retained slice for package exports, widened report-designer page region inputs, `text.tag` registration, fallback root meta preservation, and matching owner-doc/test updates.
- [x] Fix the remaining `03-01/02/03/04/05`, `13-01/13-02/13-03`, `17-01/17-02/17-03`, and `18-01` items so all supported host/public vocabulary and facade typing surfaces converge.
- [x] Add or update focused proof in the affected package suites for the landed public-facing contract slice.
- [x] Update affected owner docs and references for the landed slice.

Exit Criteria:

- [x] Retained IDs `03-01/02/03/04/05`, `13-01/13-02/13-03`, `17-01/17-02/17-03`, and `18-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused tests or type-level proof exist and pass for the landed public-facing contracts in this phase, including `createReportDesignerActionProvider` package export and the retained region/root-meta slice.
- [x] No change in this phase duplicates Plan `279` or Plan `280` ownership.
- [x] Affected owner docs are updated.
- [x] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Renderer Contract And Field-Slot Closure

Status: completed
Targets: `packages/flux-renderers-basic/src/**`, `packages/flux-renderers-form-advanced/src/**`, `packages/report-designer-renderers/src/**`, `packages/flow-designer-renderers/src/**`, `packages/flux-compiler/src/**`, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [x] Fix `09-01/03/04/05/07/08` so renderer field registration, root marker identity, region handling, fallback root meta behavior, and duplicate root identity publication all match the supported renderer contract.
- [x] Fix `12-01/12-02` so field-slot classification and `FieldCompileContext` option surfaces are honest and live-behavior-aligned.
- [x] Add or update focused proof in renderer/compiler package suites for every retained renderer or field-slot contract changed in this phase.
- [x] Update affected renderer/field-slot docs to the final live baseline.

Exit Criteria:

- [x] Retained IDs `09-01/03/04/05/07/08` and `12-01/12-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof exists and passes for the changed renderer and field-slot contracts in this phase, including `text.tag` registration, tree-control root markers, report-designer root marker separation, `designer-field.label` region handling, fallback root meta behavior, duplicated inspector-shell root identity removal, `value-or-region + allowSource` classification, and `FieldCompileContext.compileValue()` symbol-table behavior.
- [x] No fix in this phase relies on Plan `279`-owned meta projection work being reimplemented locally.
- [x] Affected owner docs are updated.
- [x] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for all touched defect families has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `279` or `280`.
- [x] Affected docs/logs are updated.

## Closure Gates

- [x] All in-scope retained renderer/public-contract, field-slot, typing, naming, and cross-package drift is fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [x] No in-scope confirmed drift is silently deferred.
- [x] Required focused verification exists for every changed contract family.
- [x] Affected owner docs are synced to the live baseline.
- [x] Independent closure audit confirms no remaining in-scope blocker.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Completed. The retained renderer/public-contract, field-slot, typing, naming, and cross-package drift tracked by this plan has been closed on the live baseline, with focused proof, repo-level verification, and final owner-doc sync.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1d847067dffec3fsF7ESEVzi4j`
- Evidence: Re-audited `docs/plans/282-deep-audit-2026-05-14-renderer-public-contract-closure-plan.md` and `docs/logs/2026/05-14.md` against the current live repo baseline after the latest Flow Designer naming cleanup. Verified the retained in-scope items `03-01/02/03/04/05`, `09-01/03/04/05/07/08`, `12-01/12-02`, `13-01/13-02/13-03`, `17-01/17-02/17-03`, and `18-01` in live code/docs/tests.
- Evidence: Confirmed the prior blocker is closed: `packages/flow-designer-renderers/src/designer-context.ts` no longer publishes duplicate `runtime.isDirty`, `packages/flow-designer-renderers/src/designer-manifest.ts` documents canonical `runtime.dirty`, and `docs/architecture/flow-designer/{runtime-snapshot.md,config-schema.md}` align to the canonical `runtime.dirty` host-scope surface.
- Evidence: Confirmed no remaining Plan-282-owned blocker in live code/docs/tests. Retained public-contract, renderer-contract, field-slot, typing, naming, and cross-package items remain closed on the current baseline, with focused proof present in the touched package suites.
- Evidence: Confirmed no ownership conflict with Plans `279` and `280`: `09-02` / `09-06` remain excluded under Plan `279`, and `03-06` remains excluded under Plan `280`.
- Evidence: Verified the saved workspace test artifact `C:\Users\a758371\.local\share\opencode\tool-output\tool_e27a298570015o0R2kiC2nlptG` still records a green repo-level baseline for the closure run, including Turbo `49 successful, 49 total`; no retained Plan-282 audit finding contradicts that saved baseline.

Follow-up:

- None.
