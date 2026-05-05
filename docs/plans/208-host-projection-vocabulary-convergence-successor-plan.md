# 208 Host Projection Vocabulary Convergence Successor Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-05
> Source: successor ownership assigned from `docs/plans/206-public-api-and-schema-compatibility-convergence-plan.md`, `docs/analysis/2026-05-05-open-ended-adversarial-review-01/round-04.md`, `docs/components/report-designer-page/design.md`, `docs/components/spreadsheet-page/design.md`

## Purpose

为 report/spreadsheet 等 host projection vocabulary 的后续收敛提供可执行 successor plan：先裁定哪些字段属于 canonical core contract、derived convenience projection、或 compatibility alias，再决定是否删除镜像字段。

## Current Baseline

- report-designer active component doc 已把部分顶层字段定为 canonical fields 或 explicit convenience mirrors。
- spreadsheet active component doc 尚未对 live top-level fields 做完整三层分类。
- 在 owner-doc 未先裁定前，任何删除 host projection mirror 的动作都不够诚实。

## Goals

- 为 report/spreadsheet host projection 建立明确的 contract layering baseline。
- 只在完成 owner-doc 裁定后，执行必要的 mirror/alias 删除或保留决策。

## Non-Goals

- 不处理 report/spreadsheet 的其他运行时功能 bug。
- 不重做整套 designer/workbench host architecture。

## Scope

### In Scope

- `packages/report-designer-renderers/src/{host-data.ts,report-designer-toolbar-helpers.ts}`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`
- directly affected focused tests
- `docs/components/report-designer-page/design.md`
- `docs/components/spreadsheet-page/design.md`
- related owner docs if required by the final baseline
- execution-day `docs/logs/`

### Out Of Scope

- unrelated report/spreadsheet feature work
- broader workbench-shell architecture redesign

## Execution Plan

### Phase 1 - Classify Host Projection Surfaces

Status: planned
Targets: component docs, this plan

- Item Types: `Decision`

- [ ] Classify each live host projection field as canonical core field, derived convenience projection, or compatibility alias.
- [ ] Record which fields are in-scope removal targets and which are explicitly retained convenience projections.

Exit Criteria:

- [ ] report and spreadsheet host projection docs have explicit three-layer classification
- [ ] in-scope removal target list is explicit
- [ ] affected owner docs/plans are synced to the landed baseline
- [ ] `docs/logs/` corresponding date entry is updated

### Phase 2 - Execute In-Scope Vocabulary Convergence

Status: planned
Targets: in-scope code/tests above

- Item Types: `Fix | Proof`

- [ ] Remove only the fields adjudicated as compatibility aliases or unsupported parallel surfaces.
- [ ] Keep or document fields adjudicated as derived convenience projections.
- [ ] Add focused tests proving the final host projection vocabulary.

Exit Criteria:

- [ ] host projection code/tests match the adjudicated layering baseline
- [ ] focused tests cover the final supported vocabulary
- [ ] affected owner docs/plans are synced to the landed baseline
- [ ] `docs/logs/` corresponding date entry is updated

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: focused tests, docs, this plan

- Item Types: `Proof`

- [ ] Run required verification gates.
- [ ] Perform independent closure audit.

Exit Criteria:

- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
- [ ] independent closure audit evidence recorded
- [ ] No owner-doc update required or owner-doc sync already completed in prior phases
- [ ] `docs/logs/` corresponding date entry is updated

## Closure Gates

- [ ] host projection layering is explicitly adjudicated before any deletion
- [ ] no in-scope compatibility alias or unsupported parallel surface remains
- [ ] retained convenience projections are explicitly documented
- [ ] required focused verification is complete
- [ ] independent closure audit is completed
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: Pending
- Evidence: Pending

Follow-up:

- no remaining plan-owned work once host projection vocabulary convergence lands
