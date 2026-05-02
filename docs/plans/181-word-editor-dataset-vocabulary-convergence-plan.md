# 181 Word Editor Dataset Vocabulary Convergence Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-02
> Source: `docs/analysis/2026-05-02-deep-audit-full/summary.md`, live code verification of `packages/word-editor-core/src/index.ts`, `packages/word-editor-core/src/dataset-model.ts`, `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/word-editor-renderers/src/types.ts`, `docs/architecture/word-editor/design.md`, `docs/components/word-editor-page/design.md`
> Related: `docs/plans/171-workbench-surface-and-package-boundary-successor-plan.md`, `docs/plans/176-deep-audit-residual-owner-assignment-plan.md`

## Purpose

Close the retained word-editor public-vocabulary residual by converging the current mixed `DataSet` / `Dataset` baseline to one explicit public contract.

## Current Baseline

- `packages/word-editor-core/src/index.ts:7-34` still exports both `Dataset*` and `DataSet*` vocabulary forms.
- `packages/word-editor-core/src/dataset-model.ts:1-105` still uses `DataSet*` internally.
- Live consumers still use the old spelling across package boundaries, including `packages/word-editor-renderers/src/word-editor-page.tsx`, `packages/word-editor-renderers/src/types.ts`, `packages/word-editor-core/src/dataset-store.ts`, and `packages/word-editor-core/src/document-io.ts`.
- Current docs are also split: `docs/architecture/word-editor/design.md` already uses `Dataset`, while `docs/components/word-editor-page/design.md:36` still says `DataSet[]`.
- Because active consumers still exist, this plan must decide between explicit canonical export plus deprecated alias versus a wider consumer rename. It cannot silently delete the old spelling without a documented migration path.

## Goals

- Choose one canonical Dataset vocabulary for the public word-editor surface.
- Make any compatibility alias explicit and documented rather than silently co-equal.
- Align current owner docs to the same vocabulary and add focused coverage for the supported export/migration contract.

## Non-Goals

- Do not reopen broader word-editor authority, save/autosave, or workbench-shell work.
- Do not remove active consumers without a documented migration or deprecation path.

## Scope

### In Scope

- `packages/word-editor-core/src/index.ts`
- `packages/word-editor-core/src/dataset-model.ts`
- `packages/word-editor-core/src/document-io.ts`
- `packages/word-editor-core/src/dataset-store.ts`
- `packages/word-editor-renderers/src/word-editor-page.tsx`
- `packages/word-editor-renderers/src/types.ts`
- focused tests in `packages/word-editor-core/src/__tests__/dataset-model.test.ts`, `packages/word-editor-core/src/__tests__/document-io.test.ts`, `packages/word-editor-core/src/__tests__/dataset-store.test.ts`, `packages/word-editor-core/src/__tests__/dataset-store-crud.test.ts`, `packages/word-editor-core/src/__tests__/dataset-store-columns.test.ts`, and any directly affected renderer tests
- `docs/architecture/word-editor/design.md`
- `docs/components/word-editor-page/design.md`
- `docs/logs/2026/05-02.md`

### Out Of Scope

- unrelated word-editor runtime semantics
- vendor wrapper or workbench-boundary work already owned by Plan 171

## Execution Plan

### Phase 1 - Canonical Dataset Vocabulary

Status: planned
Targets: in-scope code/tests/docs above

- [ ] Choose the canonical Dataset spelling for the supported public surface.
- [ ] Decide whether compatibility aliases remain temporarily; if they do, mark them as explicit compatibility/deprecation surface rather than silent peers.
- [ ] Update live consumers and owner docs as needed for the chosen baseline.
- [ ] Add focused tests for the supported export surface or deprecation/migration contract.

Exit Criteria:

- [ ] `word-editor-core` public exports use one canonical Dataset vocabulary.
- [ ] Any compatibility alias is explicitly documented rather than silently co-equal.
- [ ] In-scope live consumers and owner docs use the same final baseline vocabulary.
- [ ] Focused tests cover the supported export surface or alias contract.
- [ ] `docs/logs/2026/05-02.md` records the naming convergence work.

## Validation Checklist

- [ ] word-editor public surface uses one canonical Dataset vocabulary
- [ ] any compatibility alias is explicit and documented
- [ ] focused tests cover the in-scope naming/export behavior family
- [ ] independent closure audit confirms no remaining plan-owned vocabulary residual in scope
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: <<fill when completed>>

Closure Audit Evidence:

- Reviewer / Agent: <<independent reviewer or subagent>>
- Evidence: <<task id / daily log link / findings summary>>

Follow-up:

- if wider consumer migration is still needed after the canonical export baseline lands, move that work to a separate successor rather than widening this plan
