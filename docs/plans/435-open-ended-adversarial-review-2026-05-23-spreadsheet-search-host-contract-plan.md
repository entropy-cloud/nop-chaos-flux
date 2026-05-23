# 435 Open-Ended Adversarial Review 2026-05-23 Spreadsheet Search Host Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-23
> Source: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/round-04.md`, `docs/plans/00-plan-authoring-and-execution-guide.md`
> Related: `docs/plans/392-deep-audit-2026-05-19-spreadsheet-host-semantics-plan.md`, `docs/plans/409-open-ended-adversarial-review-2026-05-19-report-and-spreadsheet-host-contract-plan.md`

## Purpose

收口 Spreadsheet search/find-replace 公共 host contract 的 option vocabulary drift，让 manifest、provider、runtime implementation 和 focused proof 对同一套搜索语义说同一种话。

## Current Baseline

- `R23-04`: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/round-04.md` 已确认 manifest 为 `find` / `findNext` / `replace` / `replaceAll` 发布的 options 仍是 `wholeCell` / `includeFormulas`，而 core 实际读取 `matchWholeCell` / `useRegex`，provider 不做转换。
- 已完成计划 `392` 只 owning spreadsheet host save/cancel result semantics，不 owning search option vocabulary、regex discoverability、或 find/replace manifest-provider-runtime parity。`R23-04` 因此不是 `392` 的 reopen。
- 已完成计划 `409` 处理的是 spreadsheet/report host provider enforcement 的 earlier retained set，但没有处理这组已显式建模的 search option 字段名 drift；本轮 residual 不是“缺 args contract”，而是“args contract 已存在但写错了 API”。

## Goals

- 修复 `R23-04`。
- 让 Spreadsheet search host contract、provider forwarding、core behavior、owner docs/verification 对同一 final option vocabulary 达成一致。

## Non-Goals

- 不扩大为 Spreadsheet 全部 host method contract inventory 清理。
- 不处理 fixed-size interactive surface、save/cancel semantics、或其他已审 host-semantics family。
- 不把 formula search 实现作为本计划默认 closure 路径；若需要新增 formula search 支持，必须显式转入 successor plan。

## Scope

### In Scope

- `R23-04`
- `packages/spreadsheet-renderers/src/{spreadsheet-manifest.ts,host-action-provider.ts}`
- `packages/spreadsheet-core/src/core/search-operations.ts`
- Focused tests in touched spreadsheet packages
- `docs/components/spreadsheet-page/design.md`, plus any other spreadsheet/report owner doc that is found during live-baseline review to publish this search surface; otherwise closure must explicitly record that no additional owner doc currently owns it
- `docs/logs/2026/05-23.md`

### Out Of Scope

- full spreadsheet host manifest cleanup
- unrelated spreadsheet shell, performance, or interaction findings
- implicit feature expansion beyond the adjudicated search contract outcome

## Execution Plan

### Phase 1 - Re-verify Search Contract Boundary

Status: completed
Targets: this plan, live search contract code paths, `docs/logs/2026/05-23.md`

- Item Types: `Decision | Proof`

- [x] Re-verify `R23-04` against manifest, provider, runtime implementation, and focused tests.
- [x] Record explicit non-overlap with completed Plans `392` and `409` if boundary wording needs tightening during re-audit.

Exit Criteria:

- [x] `R23-04` remains accurately scoped as a search option vocabulary drift.
- [x] No owner-doc update required.
- [x] `docs/logs/2026/05-23.md` is updated.

### Phase 2 - Align Public Search Contract With Final Supported Semantics

Status: completed
Targets: touched spreadsheet manifest/provider/core files, focused tests, owner docs listed above

- Item Types: `Fix | Decision | Proof`

- [x] Adjudicate one honest closure path for the public search option vocabulary by narrowing the published surface to the semantics the runtime actually supports; formula-search support remains out of scope for this plan.
- [x] Align manifest/provider/runtime to that final option vocabulary for `find`, `findNext`, `replace`, and `replaceAll`.
- [x] Add focused proof for whole-cell and regex/final-option behavior under the chosen contract.
- [x] Update `docs/components/spreadsheet-page/design.md`; no additional owner doc currently owns this search surface.

Exit Criteria:

- [x] `R23-04` is fixed.
- [x] Focused proof confirms manifest/provider/runtime parity for the final search option contract.
- [x] Affected owner docs are updated if needed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-23.md` is updated.

## Closure Gates

- [x] The in-scope confirmed contract drift is fixed.
- [x] Spreadsheet search public contract now matches final runtime semantics.
- [x] Necessary focused verification is complete.
- [x] No in-scope residual is silently downgraded to deferred or follow-up.
- [x] Affected owner docs are synced to the final live baseline, or each phase explicitly records `No owner-doc update required`.
- [x] Independent subagent / independent reviewer closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Draft Review Record

- Draft split from the original umbrella 2026-05-23 host-contract plan after independent review concluded `R23-04` is a separate Spreadsheet public-contract closure surface.

## Deferred But Adjudicated

None at draft time.

## Non-Blocking Follow-ups

- If execution reveals additional search-adjacent host methods with similarly wrong but explicit args shapes, extend scope only with an explicit scope-change note and matching proof bundle.

## Closure

Status Note: `R23-04` is fixed in live code, focused proof and owner-doc sync are complete, workspace verification passed, and an independent closure audit found no remaining plan-owned work.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit subagent `ses_1ad94538dffeskWerOoXF8tPyx`
- Evidence: fresh-session audit re-checked the spreadsheet search manifest/provider/tests and confirmed the public contract now honestly publishes `matchWholeCell` / `useRegex` across `spreadsheet-manifest.ts`, `host-action-provider.ts`, and `schema-integration.test.tsx`, with `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` already passing in the workspace.

Follow-up:

- No remaining plan-owned work.
