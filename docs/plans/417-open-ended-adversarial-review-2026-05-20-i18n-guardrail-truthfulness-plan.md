# 417 Open-Ended Adversarial Review 2026-05-20 I18n Guardrail Truthfulness Plan

> Plan Status: planned
> Last Reviewed: 2026-05-20
> Source: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/round-01.md`
> Related: `docs/plans/416-open-ended-adversarial-review-2026-05-20-remediation-routing-plan.md`, `docs/plans/402-deep-audit-2026-05-19-cross-package-i18n-alignment-plan.md`

## Purpose

收口 `R01-01`：让 i18n key guardrail 的检查范围与仓库实际 key 使用方式重新对齐。

## Current Baseline

- `check:i18n-keys` 当前只对字面量 `flux.*` key 提供强保护。
- namespace-relative key 与 dynamic key 使用仍可能被误报为未使用或完全漏检。
- Plan `402` 已完成 UI-local i18n instance integration，但不 owning 这个 repo-wide guardrail truthfulness surface。

## Goals

- 修复 `R01-01`。
- 让 i18n key guardrail 对支持中的 key authoring pattern 有诚实覆盖。
- 同步相关文档或显式裁定 `No owner-doc update required`。

## Non-Goals

- 不重做整个 i18n architecture。
- 不处理 UI local i18n instance wiring。
- 不处理与 key guardrail 无关的翻译内容增删。

## Scope

### In Scope

- `R01-01`
- `scripts/check-i18n-keys.mjs`
- 相关 focused proof
- `docs/references/audit-tooling.md`
- `docs/logs/2026/05-20.md`

### Out Of Scope

- runtime i18n provider integration
- unrelated i18n content cleanup

## Execution Plan

### Phase 1 - Align I18n Key Guardrail With Live Key Usage

Status: planned
Targets: i18n guardrail script, focused proof, relevant docs

- Item Types: `Fix | Proof`

- [ ] Extend the guardrail so namespace-relative and supported dynamic key patterns are handled honestly.
- [ ] Add focused proof covering the key forms that motivated `R01-01`.
- [ ] Adjudicate owner-doc impact explicitly: update `docs/references/audit-tooling.md` if the supported hard-gate coverage contract changes, and update `docs/references/maintenance-checklist.md` or `docs/index.md` only if the repo's recommended maintenance/routing baseline changes; otherwise explicitly record `No owner-doc update required`.

Exit Criteria:

- [ ] `R01-01` is fixed.
- [ ] Focused proof covers the final supported key-usage patterns.
- [ ] `docs/references/audit-tooling.md` is updated if needed, and `docs/references/maintenance-checklist.md` / `docs/index.md` are updated if needed; otherwise `No owner-doc update required` is explicitly recorded for each unchanged owner doc.
- [ ] `docs/logs/2026/05-20.md` is updated.

## Closure Gates

- [ ] The in-scope retained finding is fixed.
- [ ] Required owner-doc updates are landed.
- [ ] No in-scope retained finding is silently downgraded to deferred or follow-up.
- [ ] Independent subagent closure audit is completed and recorded.
- [ ] `pnpm typecheck`
- [ ] `pnpm build`
- [ ] `pnpm lint`
- [ ] `pnpm test`
