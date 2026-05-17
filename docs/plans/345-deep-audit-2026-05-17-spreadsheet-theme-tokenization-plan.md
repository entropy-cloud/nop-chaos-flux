# 345 Deep Audit 2026-05-17 Spreadsheet Theme Tokenization Plan

> Plan Status: completed
> Last Reviewed: 2026-05-17
> Source: `docs/analysis/2026-05-17-deep-audit-full/{10-styling.md,summary.md}`, live code verification of `packages/spreadsheet-renderers/src/canvas-styles.css`, `docs/plans/343-deep-audit-2026-05-17-review-completion-and-owner-routing-plan.md`
> Related: `docs/plans/00-plan-authoring-and-execution-guide.md`, `docs/plans/324-deep-audit-2026-05-16-spreadsheet-shell-styling-and-header-interaction-plan.md`, `docs/architecture/{styling-system.md,theme-compatibility.md}`

## Purpose

收口 `10-01` 的 retained residual：Plan `324` 已关闭 spreadsheet shell selector ownership / header interaction surface，但它对 `10-01` 的 token-closure 结论在 live repo 上不成立，find/replace panel、cell editor、comment editor 相关 shell selectors 仍存在 package-owned hard-coded colors，未对齐 theme-token baseline。

## Current Baseline

- `packages/spreadsheet-renderers/src/canvas-styles.css:355-367,389-406` 仍为 spreadsheet-owned panel/input/result chrome 直接写入 `rgb(226, 232, 240)`、`rgb(255, 255, 255)`、`rgb(59, 130, 246)`、`rgb(71, 85, 105)`。
- `docs/architecture/theme-compatibility.md` 明确 package-owned visuals 应读取 CSS variables 而不是硬编码颜色。
- Plan `324` 对 selector ownership、header baseline、header interaction primitive 的 closure 仍有效，但它对 `10-01` 的“已修复”结论需要由本 successor 诚实接管：当前问题不是重新选择 selector，而是这些已支持的 shell slots 还没完全 token 化。
- `docs/analysis/2026-05-17-deep-audit-full/10-styling.md` 将此条目单独保留为 `P1`，说明它是 2026-05-17 baseline 上唯一 surviving styling defect。

## Goals

- Replace spreadsheet shell hard-coded colors on the supported panel/editor/result paths with shared CSS variable usage.
- Keep spreadsheet shell styling aligned with the project token contract and host theme compatibility rules.
- Add focused proof that the touched shell selectors read the supported token baseline instead of package-private RGB literals.

## Non-Goals

- 不重开 spreadsheet selector ownership、header interaction、或 raw HTML primitive 问题。
- 不重新设计 spreadsheet core rendering 或 cell content styling。
- 不把整个 spreadsheet stylesheet 全量改写成 token-only theme system beyond the confirmed shell residual.

## Scope

### In Scope

- `2026-05-17/10-01` spreadsheet shell tokenization residual
- `packages/spreadsheet-renderers/src/canvas-styles.css`
- focused tests for the touched spreadsheet shell selectors
- `docs/architecture/theme-compatibility.md` and/or `docs/architecture/styling-system.md` if the live token contract needs clarification
- `docs/logs/2026/05-17.md`

### Out Of Scope

- `10-02`
- `10-03`
- `10-04`
- `11-01`
- spreadsheet command / edit failure fidelity

## Execution Plan

### Phase 1 - Freeze Spreadsheet Shell Token Baseline

Status: completed
Targets: `packages/spreadsheet-renderers/src/canvas-styles.css`, relevant styling docs, focused tests

- Item Types: `Decision | Proof`

- [x] Re-audit the exact in-scope selectors still using hard-coded colors and record the supported token mapping for each touched surface: `spreadsheet-find-replace-panel`, `spreadsheet-cell-editor`, `spreadsheet-comment-editor`, `spreadsheet-find-input`, `spreadsheet-replace-input`, `spreadsheet-find-results`.
- [x] Define mandatory focused proof for the tokenized selectors, including why Plan `324` remains closed for selector/header ownership while its `10-01` token-closure claim is superseded by this successor.

Exit Criteria:

- [x] The plan records a clean boundary against Plan `324`.
- [x] The touched shell selectors have an explicit token baseline.
- [x] Affected styling docs are updated if the live token contract needs clarification; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the baseline decision.

### Phase 2 - Land Spreadsheet Theme Tokenization Fixes

Status: completed
Targets: `packages/spreadsheet-renderers/src/canvas-styles.css`, focused tests

- Item Types: `Fix | Proof`

- [x] Replace the in-scope hard-coded colors with supported CSS variables for border, surface, focus, and secondary text roles on the enumerated selectors only.
- [x] Add or update focused proof that the spreadsheet shell paths no longer depend on package-private RGB literals.

Exit Criteria:

- [x] The enumerated in-scope spreadsheet shell selectors read supported token variables instead of hard-coded RGB values.
- [x] Focused proof is green for the touched shell styling paths.
- [x] Affected styling docs match the final baseline, or `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-17.md` records the landed fix.

### Phase 3 - Verification And Closure Audit

Status: completed
Targets: touched stylesheet/tests/docs, this plan

- Item Types: `Proof | Decision | Fix`

- [x] Run all focused tests added or modified in Phases 1-2.
- [x] Run `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` after the in-scope fix lands.
- [x] Record execution, verification, and doc-sync evidence in `docs/logs/2026/05-17.md`.
- [x] Run an independent closure audit with a fresh subagent that re-reads this plan, Plan `324`, linked analysis, live code/tests/docs, and verification output.

Exit Criteria:

- [x] Focused verification for the enumerated `2026-05-17/10-01` selectors has passed.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Independent closure audit confirms no remaining spreadsheet shell theme-token blocker.
- [x] This plan's statuses, checklists, closure gates, and daily log evidence are textually consistent.

## Closure Gates

- [x] The in-scope confirmed live defect (`2026-05-17/10-01` on the enumerated selectors) is fixed.
- [x] The enumerated spreadsheet shell selectors converge to one supported token baseline.
- [x] Necessary focused verification exists for the touched shell selectors.
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

Status Note: Completed. The in-scope spreadsheet shell panel/editor/result selectors now read the shared `--nop-*` token baseline without retained RGB fallbacks, and focused/workspace verification stayed green.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1c9c98c7dffeT2tkRiULA7FBJX` (`general` subagent)
- Evidence: Final independent closure audit found no remaining spreadsheet shell token blocker; focused proof now covers runtime toolbar rendering and direct stylesheet contract, with full verification green in `tool_e362d7ff6001MPuSig14CcdoVo`.

Follow-up:

- None.
