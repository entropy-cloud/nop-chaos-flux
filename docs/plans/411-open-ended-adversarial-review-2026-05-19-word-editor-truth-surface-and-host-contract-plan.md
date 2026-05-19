# 411 Open-Ended Adversarial Review 2026-05-19 Word-Editor Truth Surface And Host Contract Plan

> Plan Status: completed
> Last Reviewed: 2026-05-19
> Source: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/{round-02.md,round-03.md,round-20.md,round-21.md,round-22.md,round-23.md,round-24.md}`
> Related: `docs/plans/406-open-ended-adversarial-review-2026-05-19-25-round-remediation-routing-plan.md`, `docs/architecture/word-editor/design.md`, `docs/components/word-editor-page/design.md`, `docs/architecture/capability-projection-manifest.md`

## Purpose

收口 `R02-01`、`R03-03`、`R03-04`、`R20-01`、`R21-01`、`R22-01`、`R23-01`、`R24-01`：让 word-editor 的 save envelope、status publication、template tag insertion、chart/code metadata validity、watermark persisted truth surface、以及 manifest/provider parity 回到单一支持契约。

## Current Baseline

- `R02-01`: explicit save 未向文档承诺的 host callback 交付完整 saved envelope。
- `R03-03`: `statusPath` 永远不发布 save busy state。
- `R03-04`: datasets 在 save 成败未知前就被持久化。
- `R20-01` / `R21-01`: template tag insertion 把 self-closing tag 压成 open-tag，且 `c:out` 在 UI 可选却无法真正插入。
- `R22-01`: chart/code dialogs 可保存 core-invalid metadata，recovery 时会静默丢失。
- `R23-01`: watermark 有 authoring surface，但不在 persisted truth surface。
- `R24-01`: manifest 公布完整 `insertChart` / `insertCode` payload contract，provider 实际只检查 `id + name`。

## Goals

- 修复全部 `8` 条 in-scope word-editor finding。
- 让 persisted truth surface、save/status publication、template insertion、dialog validation、manifest/provider enforcement 使用同一支持基线。
- 同步 word-editor owner docs。

## Non-Goals

- 不处理 word-editor supported E2E false-confidence；那属于 Plan `408`。
- 不扩展到新的 backend round-trip 设计或 unrelated editor UX polishing。

## Scope

### In Scope

- `R02-01`, `R03-03`, `R03-04`, `R20-01`, `R21-01`, `R22-01`, `R23-01`, `R24-01`
- word-editor renderer/core save, status, insertion, dialog, manifest/provider code and focused tests
- `docs/architecture/word-editor/design.md`
- `docs/components/word-editor-page/design.md`
- `docs/logs/2026/05-19.md`

### Out Of Scope

- product-facing E2E rewrites
- unrelated canvas-editor UX changes
- speculative new persisted surfaces beyond the adjudicated finding set

## Execution Plan

### Phase 1 - Restore Save Envelope And Status Publication Truthfulness

Status: completed
Targets: save/status code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Make explicit save deliver the supported saved envelope to the host callback.
- [x] Make `statusPath` publish honest save busy state.
- [x] Prevent dataset persistence from committing ahead of save success / abort adjudication.
- [x] Add focused proof for explicit save, busy-state publication, and dataset-persistence sequencing.
- [x] Update `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` for the final supported save/status baseline.

Exit Criteria:

- [x] `R02-01`, `R03-03`, and `R03-04` are fixed.
- [x] Focused proof covers save callback payload, busy-state publication, and no partial-commit dataset write.
- [x] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Restore Template Insertion And Persisted Truth Surface Integrity

Status: completed
Targets: template tag insertion, chart/code/watermark persistence, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Preserve tag kind during insertion so self-closing tags stay self-closing.
- [x] Remove the `c:out` option/execution mismatch so the dialog only advertises executable insertions.
- [x] Prevent dialogs/providers from accepting chart/code payloads that the core recovery model rejects.
- [x] Adjudicate watermark truth surface honestly by narrowing the supported authoring contract and documenting that decision.
- [x] Add focused proof for insertion, recovery, and persisted truth-surface behavior.
- [x] Update word-editor owner docs for the final persisted truth-surface baseline.

Exit Criteria:

- [x] `R20-01`, `R21-01`, `R22-01`, and `R23-01` are fixed.
- [x] Focused proof covers self-closing tag insertion, `c:out` availability, chart/code recovery integrity, and the final watermark contract.
- [x] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated.
- [x] `docs/logs/2026/05-19.md` is updated.

### Phase 3 - Align Word-Editor Manifest With Provider Enforcement

Status: completed
Targets: host manifest/provider code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [x] Make provider enforcement match the published `insertChart` / `insertCode` payload contract, or narrow the published contract and document that decision.
- [x] Add focused proof for manifest/provider parity.

Exit Criteria:

- [x] `R24-01` is fixed.
- [x] Focused proof covers final manifest/provider parity.
- [x] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
- [x] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [x] The in-scope retained findings are fixed.
- [x] Required owner-doc updates are landed.
- [x] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [x] Independent subagent closure audit is completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Closure

Status Note: All three execution phases are complete and the full in-scope word-editor findings are fixed. A follow-up oversized-file refactor briefly regressed `src/__tests__/word-editor-page-actions.test.tsx`, but the live baseline is restored: the shared test-support mocks now load before `WordEditorPage`, dataset dialog edits stay in memory until explicit save succeeds, focused word-editor tests are green again, package `typecheck` / `build` / `lint` pass, and repo-wide `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` are now confirmed green.

Closure Audit Evidence:

- Reviewer / Agent: `ses_1bf7c4234ffeJK8UKOM5EDRAfp` independent closure audit
- Evidence: `Verdict: acceptable`, `Findings: none`; the earlier recommendation to keep `Plan Status: partially completed` until repo-wide gates were confirmed is now satisfied by the live green workspace verification. Fresh independent closure audit `ses_1bf2e29daffe7YiLCLDd8NY1ww` re-checked the live repo after workspace `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` all passed and confirmed no remaining in-scope closure blockers.
