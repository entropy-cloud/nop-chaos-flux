# 282 Deep Audit 2026-05-14 Renderer Public Contract Closure Plan

> Plan Status: planned
> Last Reviewed: 2026-05-14
> Source: `docs/analysis/2026-05-14-deep-audit-batch1/{summary.md,03-api-surface.md,09-renderer-contract.md,12-field-slot.md,13-type-safety.md,17-naming.md,18-cross-package.md}`
> Related: `docs/plans/279-resolved-boolean-props-contract-plan.md`, `docs/plans/280-open-ended-adversarial-review-2026-05-14-remediation-plan.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 `deep-audit-batch1` 中 renderer-facing public contract、field-slot compile contract、bundle typing、naming vocabulary、以及 cross-package page-level API drift。

## Current Baseline

- `03-01/02/03/04/05` 仍显示 schema types、renderer definition、runtime fallback、package exports、以及 owner docs 的 public contract 漂移。
- `09-01/03/04/05/07/08` 仍显示 field registration drift、root marker drift、region contract drift、fallback root meta drift、以及 duplicated root identity publication。
- `12-01/12-02` 仍显示 `value-or-region + allowSource` classifier 问题与 `FieldCompileContext.compileValue()` 的 fake option surface。
- `13-01/13-02/13-03` 仍显示 `flux-bundle` public facade typing 与 live runtime contract 不一致。
- `17-01/17-02/17-03` 与 `18-01` 仍显示 dirty naming split、selection alias drift、owner-doc stale path、以及 page-level `designer` vs `config` vocabulary drift。
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

Status: planned
Targets: `packages/flow-designer-renderers/src/**`, `packages/report-designer-renderers/src/**`, `packages/flux-bundle/**`, `packages/flux-core/src/**`, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `03-01/02/03/04/05` so schema inputs, renderer definition requirements, runtime fallback behavior, package exports, and owner docs all describe the same supported contract.
- [ ] Fix `13-01/13-02/13-03` so `flux-bundle` public facade matches the live runtime contract instead of narrowing object values to fake schema nodes or erasing runtime contexts behind `unknown`.
- [ ] Fix `17-01/17-02/17-03` and `18-01` so supported host/public vocabulary is consistent across code, tests, and owner docs.
- [ ] Add or update focused proof in the affected package suites for every changed public-facing contract.
- [ ] Update affected owner docs and references to the final live baseline.

Exit Criteria:

- [ ] Retained IDs `03-01/02/03/04/05`, `13-01/13-02/13-03`, `17-01/17-02/17-03`, and `18-01` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused tests or type-level proof exist and pass for the changed public-facing contracts in this phase, including `DesignerPageSchemaInput.config`, `report-inspector-shell` schema/docs/registration alignment, `createReportDesignerActionProvider` package export, `FluxSchemaValue`/`FluxApiRequestContext` public facade typing, and the retained naming/config vocabulary changes.
- [ ] No change in this phase duplicates Plan `279` or Plan `280` ownership.
- [ ] Affected owner docs are updated.
- [ ] `docs/logs/2026/05-14.md` includes Phase 1 execution notes.

### Phase 2 - Renderer Contract And Field-Slot Closure

Status: planned
Targets: `packages/flux-renderers-basic/src/**`, `packages/flux-renderers-form-advanced/src/**`, `packages/report-designer-renderers/src/**`, `packages/flow-designer-renderers/src/**`, `packages/flux-compiler/src/**`, related docs/tests

- Item Types: `Fix | Proof | Decision`

- [ ] Fix `09-01/03/04/05/07/08` so renderer field registration, root marker identity, region handling, fallback root meta behavior, and duplicate root identity publication all match the supported renderer contract.
- [ ] Fix `12-01/12-02` so field-slot classification and `FieldCompileContext` option surfaces are honest and live-behavior-aligned.
- [ ] Add or update focused proof in renderer/compiler package suites for every retained renderer or field-slot contract changed in this phase.
- [ ] Update affected renderer/field-slot docs to the final live baseline.

Exit Criteria:

- [ ] Retained IDs `09-01/03/04/05/07/08` and `12-01/12-02` are fixed in live code, or a fresh live re-audit proves a given item is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof exists and passes for the changed renderer and field-slot contracts in this phase, including `text.tag` registration, tree-control root markers, report-designer root marker separation, `designer-field.label` region handling, fallback root meta behavior, duplicated inspector-shell root identity removal, `value-or-region + allowSource` classification, and `FieldCompileContext.compileValue()` symbol-table behavior.
- [ ] No fix in this phase relies on Plan `279`-owned meta projection work being reimplemented locally.
- [ ] Affected owner docs are updated.
- [ ] `docs/logs/2026/05-14.md` includes Phase 2 execution notes.

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: touched packages, touched docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phases 1-2.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-14.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code, touched docs, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for all touched defect families has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker and no overlap conflict with Plans `279` or `280`.
- [ ] Affected docs/logs are updated.

## Closure Gates

- [ ] All in-scope retained renderer/public-contract, field-slot, typing, naming, and cross-package drift is fixed, or a fresh live re-audit recorded in this plan proves a given item is no longer live on the current baseline.
- [ ] No in-scope confirmed drift is silently deferred.
- [ ] Required focused verification exists for every changed contract family.
- [ ] Affected owner docs are synced to the live baseline.
- [ ] Independent closure audit confirms no remaining in-scope blocker.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: Pending implementation, verification, and independent closure audit.

Closure Audit Evidence:

- Reviewer / Agent: pending
- Evidence: pending

Follow-up:

- Pending closure audit.
