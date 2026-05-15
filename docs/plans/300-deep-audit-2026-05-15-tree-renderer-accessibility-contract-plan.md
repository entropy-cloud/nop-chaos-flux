# 300 Deep Audit 2026-05-15 Tree Renderer Accessibility Contract Plan

> Plan Status: planned
> Last Reviewed: 2026-05-15
> Source: `docs/analysis/2026-05-15-deep-audit-full/20-accessibility.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`

## Purpose

收口 data tree renderer 的 retained accessibility contract drift：default 模式 treeitem 无焦点入口，`expandOnClickNode` 模式缺完整树导航，ARIA `tree/treeitem` 语义与真实键盘模型脱节。

## Current Baseline

- `20-02` 仍 live：`packages/flux-renderers-data/src/tree-renderer.tsx` 在 default 模式下 treeitem 缺少可聚焦入口，键盘只能落到小 chevron 按钮。
- 同一 retained item 在 `expandOnClickNode` 模式下也仍缺 `Up/Down/Home/End` 等标准树导航。
- 审计结论明确指出这两个模式都属于同一个 retained accessibility defect；closure 不能只修其中一条路径。

## Goals

- Close retained `20-02` on one explicit tree keyboard/focus baseline.
- Give treeitems a supported focus-entry model and tree-navigation contract across both default and `expandOnClickNode` modes.

## Non-Goals

- 不扩展到 `input-tree` / `tree-select` family。
- 不做 unrelated visual redesign or data-tree feature work。

## Scope

### In Scope

- `20-02`
- `packages/flux-renderers-data/src/tree-renderer.tsx`
- focused accessibility tests and relevant docs/logs

### Out Of Scope

- any retained ID not listed above

## Execution Plan

### Phase 1 - Freeze The Supported Tree Keyboard Contract

Status: planned
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`, focused tests/docs

- Item Types: `Decision | Fix | Proof`

- [ ] Freeze one explicit supported focus-entry and keyboard-navigation contract for the data tree renderer while it continues to claim `role="tree"` / `role="treeitem"` semantics.
- [ ] Fix the default mode so treeitems themselves have a usable focus entry instead of delegating keyboard entry only to the chevron button.
- [ ] Fix `expandOnClickNode` mode so tree keyboard navigation is complete on the supported tree baseline rather than stopping at Enter/Space-only interaction.
- [ ] Add focused proof that covers both default mode and `expandOnClickNode` mode.
- [ ] Update affected accessibility/renderer docs, or explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] Retained `20-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [ ] Focused proof covers the default-mode focus entry and the `expandOnClickNode` tree-navigation path.
- [ ] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Verification And Closure Audit

Status: planned
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [ ] Run all focused tests added or modified in Phase 1.
- [ ] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [ ] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [ ] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [ ] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [ ] Focused verification for the in-scope defect family has passed.
- [ ] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [ ] Independent closure audit confirms no remaining plan-owned blocker.
- [ ] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [ ] Retained `20-02` is fixed.
- [ ] Tree keyboard/focus semantics converge to one supported baseline across the retained modes.
- [ ] Necessary focused verification exists for the touched accessibility contract.
- [ ] No in-scope live defect is silently downgraded to deferred/follow-up.
- [ ] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [ ] Independent subagent closure audit is completed and recorded.
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

- Reviewer / Agent: Pending.
- Evidence: Pending.

Follow-up:

- None currently.
