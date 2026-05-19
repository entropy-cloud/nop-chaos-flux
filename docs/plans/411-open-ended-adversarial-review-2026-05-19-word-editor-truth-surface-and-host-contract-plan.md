# 411 Open-Ended Adversarial Review 2026-05-19 Word-Editor Truth Surface And Host Contract Plan

> Plan Status: planned
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

Status: planned
Targets: save/status code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [ ] Make explicit save deliver the supported saved envelope to the host callback.
- [ ] Make `statusPath` publish honest save busy state.
- [ ] Prevent dataset persistence from committing ahead of save success / abort adjudication.
- [ ] Add focused proof for explicit save, busy-state publication, and dataset-persistence sequencing.
- [ ] Update `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` for the final supported save/status baseline.

Exit Criteria:

- [ ] `R02-01`, `R03-03`, and `R03-04` are fixed.
- [ ] Focused proof covers save callback payload, busy-state publication, and no partial-commit dataset write.
- [ ] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

### Phase 2 - Restore Template Insertion And Persisted Truth Surface Integrity

Status: planned
Targets: template tag insertion, chart/code/watermark persistence, focused tests, owner docs

- Item Types: `Fix | Proof`

- [ ] Preserve tag kind during insertion so self-closing tags stay self-closing.
- [ ] Remove the `c:out` option/execution mismatch so the dialog only advertises executable insertions.
- [ ] Prevent dialogs/providers from accepting chart/code payloads that the core recovery model rejects.
- [ ] Adjudicate watermark truth surface honestly: either persist it as a supported surface or remove/narrow the authoring contract and document that decision.
- [ ] Add focused proof for insertion, recovery, and persisted truth-surface behavior.
- [ ] Update word-editor owner docs for the final persisted truth-surface baseline.

Exit Criteria:

- [ ] `R20-01`, `R21-01`, `R22-01`, and `R23-01` are fixed.
- [ ] Focused proof covers self-closing tag insertion, `c:out` availability, chart/code recovery integrity, and the final watermark contract.
- [ ] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated.
- [ ] `docs/logs/2026/05-19.md` is updated.

### Phase 3 - Align Word-Editor Manifest With Provider Enforcement

Status: planned
Targets: host manifest/provider code, focused tests, owner docs

- Item Types: `Fix | Proof`

- [ ] Make provider enforcement match the published `insertChart` / `insertCode` payload contract, or narrow the published contract and document that decision.
- [ ] Add focused proof for manifest/provider parity.

Exit Criteria:

- [ ] `R24-01` is fixed.
- [ ] Focused proof covers final manifest/provider parity.
- [ ] `docs/architecture/word-editor/design.md` and `docs/components/word-editor-page/design.md` are updated if the public contract changed; otherwise `No owner-doc update required` is explicit.
- [ ] `docs/logs/2026/05-19.md` is updated.

## Closure Gates

- [ ] The in-scope retained findings are fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`

## Closure

Status Note: Pending.

Closure Audit Evidence:

- Reviewer / Agent: pending independent closure audit
- Evidence: not yet run
