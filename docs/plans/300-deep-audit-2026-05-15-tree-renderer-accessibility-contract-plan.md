# 300 Deep Audit 2026-05-15 Tree Renderer Accessibility Contract Plan

> Plan Status: completed
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

Status: completed
Targets: `packages/flux-renderers-data/src/tree-renderer.tsx`, focused tests/docs

- Item Types: `Decision | Fix | Proof`

- [x] Freeze one explicit supported focus-entry and keyboard-navigation contract for the data tree renderer while it continues to claim `role="tree"` / `role="treeitem"` semantics.
- [x] Fix the default mode so treeitems themselves have a usable focus entry instead of delegating keyboard entry only to the chevron button.
- [x] Fix `expandOnClickNode` mode so tree keyboard navigation is complete on the supported tree baseline rather than stopping at Enter/Space-only interaction.
- [x] Add focused proof that covers both default mode and `expandOnClickNode` mode.
- [x] Update affected accessibility/renderer docs.

Exit Criteria:

- [x] Retained `20-02` is fixed in live code, or a fresh live re-audit proves it is no longer live and the scope change is recorded in this plan before closure.
- [x] Focused proof covers the default-mode focus entry and the `expandOnClickNode` tree-navigation path.
- [x] Affected owner docs are updated, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-15.md` includes Phase 1 execution notes.

### Phase 2 - Verification And Closure Audit

Status: completed
Targets: touched packages, docs, this plan

- Item Types: `Proof | Fix | Decision`

- [x] Run all focused tests added or modified in Phase 1.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after all in-scope changes land.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-15.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, linked analysis files, live code/docs/tests, and verification output.
- [x] Fix any blocking closure-audit finding before marking this plan completed.

Exit Criteria:

- [x] Focused verification for the in-scope defect family has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining plan-owned blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] Retained `20-02` is fixed.
- [x] Tree keyboard/focus semantics converge to one supported baseline across the retained modes.
- [x] Necessary focused verification exists for the touched accessibility contract.
- [x] No in-scope live defect is silently downgraded to deferred/follow-up.
- [x] Affected owner docs are synced to the live baseline, or `No owner-doc update required` is explicit.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None currently.

## Non-Blocking Follow-ups

- None currently.

## Closure

Status Note: `tree` now exposes one explicit keyboard/focus contract across default and `expandOnClickNode` modes, focused proof covers both retained paths, owner docs are synced to the landed Enter/Space plus row-click semantics, and the repo hard gates were rerun green after closure-evidence repair.

Closure Audit Evidence:

- Reviewer / Agent: Independent closure audit subagent.
- Evidence: Initial closure audit `ses_1d3d194f0ffe7XYmZJzIyqiqy8` failed honestly because `docs/components/tree/design.md` overstated the mode-specific Enter/Space ownership change, the plan did not record a concrete audit trail, and the saved `tool_e2c18b96e001TxNiT9TxlnH3sS` artifact only proved the final `pnpm test` pass. Those gaps were then repaired by syncing the owner doc and recording rerun evidence in this plan and `docs/logs/2026/05-15.md`; final pass evidence is recorded after the fresh closure rerun/audit.
- Verification rerun evidence: workspace `pnpm typecheck` passed with `Tasks: 49 successful, 49 total` in 2m48.58s; workspace `pnpm build` passed with `Tasks: 26 successful, 26 total` in 3m33.036s; workspace `pnpm lint` passed with `Tasks: 26 successful, 26 total` in 19.132s; workspace `pnpm test` passed with `Tasks: 49 successful, 49 total` in 17m0.801s, with the saved test output at `C:\Users\a758371\.local\share\opencode\tool-output\tool_e2c3925640012soKwEU7c651T4`.
- Non-blocking note: a later attempt to force `--output-logs full` through workspace scripts was only a tooling experiment to try to generate extra saved artifacts; it failed because the flag propagated into package `tsc` / `eslint` scripts, and it does not invalidate the already-green plain-command reruns above.

Follow-up:

- No remaining plan-owned work.
