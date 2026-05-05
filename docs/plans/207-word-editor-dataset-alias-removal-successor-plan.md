# 207 Word-Editor Dataset Alias Removal Successor Plan

> Plan Status: proposed
> Last Reviewed: 2026-05-05
> Source: successor ownership assigned from `docs/plans/206-public-api-and-schema-compatibility-convergence-plan.md`, `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`, `docs/analysis/2026-05-05-open-ended-adversarial-review-01/round-04.md`
> Related: `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`

## Purpose

如果仓库决定不再保留 `DataSet*` compatibility aliases，则需要一个显式 successor plan 来 supersede plan 181 的旧裁定，并把所有剩余 live consumers、public exports、focused tests、owner docs 一次性迁移到 canonical `Dataset*` vocabulary。

## Current Baseline

- plan 181 已关闭，并把 `Dataset*` 定为 canonical public vocabulary，同时保留 `DataSet*` 作为 explicit deprecated compatibility aliases。
- `docs/architecture/word-editor/design.md` 和 `docs/components/word-editor-page/design.md` 仍记录这一 baseline。
- live consumers 仍使用 `DataSet*`，包括 `packages/word-editor-renderers/src/__tests__/dataset-panel.test.tsx` 与 `packages/word-editor-renderers/src/__tests__/field-list.test.tsx`。
- 因此这项工作不是“小删别名”，而是一次明确的 closed-plan supersession 与 consumer migration。

## Goals

- 显式 supersede plan 181 对 `DataSet*` compatibility alias 的保留决定。
- 删除 `word-editor-core` 的 `DataSet*` public exports，并把 in-scope live consumers/tests/docs 迁移到 `Dataset*`。
- 用 focused tests 和 owner docs 证明 word-editor public vocabulary 只剩 canonical `Dataset*`。

## Non-Goals

- 不处理 word-editor 的 save/autosave、workbench shell、host action、或 canvas/editor 行为改造。
- 不扩展到与 dataset vocabulary 无关的 word-editor 功能改动。

## Scope

### In Scope

- `packages/word-editor-core/src/{index.ts,dataset-model.ts,dataset-store.ts,document-io.ts}`
- `packages/word-editor-renderers/src/{word-editor-page.tsx,types.ts,__tests__/dataset-panel.test.tsx,__tests__/field-list.test.tsx}`
- directly affected word-editor tests under `packages/word-editor-core/src/__tests__/`
- `docs/architecture/word-editor/design.md`
- `docs/components/word-editor-page/design.md`
- `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`
- execution-day `docs/logs/`

### Out Of Scope

- unrelated word-editor runtime semantics
- vendor wrapper or workbench-boundary redesign

## Execution Plan

### Phase 1 - Supersede The Old Compatibility Decision

Status: planned
Targets: `docs/plans/181-word-editor-dataset-vocabulary-convergence-plan.md`, `docs/architecture/word-editor/design.md`, `docs/components/word-editor-page/design.md`, this plan

- Item Types: `Decision | Fix`

- [ ] Record that this plan supersedes plan 181's compatibility-alias retention decision for `DataSet*`.
- [ ] Update owner docs so `DataSet*` is no longer described as supported compatibility surface.

Exit Criteria:

- [ ] supersession decision is explicit in plan/doc text
- [ ] active docs no longer describe `DataSet*` as retained compatibility baseline
- [ ] affected owner docs/plans are synced to the landed baseline
- [ ] `docs/logs/` corresponding date entry is updated

### Phase 2 - Remove DataSet Aliases And Migrate Consumers

Status: planned
Targets: in-scope code/tests above

- Item Types: `Fix | Proof`

- [ ] Remove `DataSet*` exports from `word-editor-core`.
- [ ] Migrate all in-scope live consumers and tests to canonical `Dataset*` vocabulary.
- [ ] Add or update focused tests proving the surviving public export surface is `Dataset*` only.

Exit Criteria:

- [ ] `word-editor-core` public exports use only `Dataset*`
- [ ] in-scope live consumers/tests use only `Dataset*`
- [ ] focused tests cover the canonical export surface
- [ ] affected owner docs/plans are synced to the landed baseline
- [ ] `docs/logs/` corresponding date entry is updated

### Phase 3 - Verification And Closure Audit

Status: planned
Targets: focused tests, owner docs, this plan

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

- [ ] superseded plan-181 compatibility decision is explicitly recorded
- [ ] no in-scope `DataSet*` public alias or consumer remains
- [ ] owner docs describe only canonical `Dataset*` vocabulary
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

- no remaining plan-owned work once dataset alias removal lands
