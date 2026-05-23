# Open-Ended Adversarial Review — 2026-05-20 — Round 01

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: i18n key checker, `flux-i18n`, validation messages, condition-builder labels
**Discovery source**: guardrail trustworthiness review after de-duplicating recent Word Editor and bundle-public-type findings

---

## Finding 1: `check:i18n-keys` only protects one i18n spelling even though runtime supports three

- **Where**:
  - `scripts/check-i18n-keys.mjs:328-345`
  - `packages/flux-i18n/src/i18n.ts:40-47,92-124`
  - `packages/flux-runtime/src/validation/message.ts:11-43`
  - `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:35-40,167-209`
  - `packages/flux-renderers-form-advanced/src/condition-builder/operators.ts:10-33`
- **What**: the runtime deliberately accepts namespace-relative keys by stripping an optional `flux.` prefix before resolving translations. Live production code uses that supported spelling heavily, for example `t('conditionBuilder.conditionCount')`, `t('conditionBuilder.requiredMessage')`, and validation message keys from `getMessageFormatter()` such as `validation.required`. The key checker, however, records only literal calls whose scanned key starts with `flux.`. It also cannot follow dynamic constants such as `OPERATOR_LABEL_KEYS`.
- **Why it matters**: the check now gives a misleading green signal. Removing or misspelling `flux.validation.required`, `flux.conditionBuilder.requiredMessage`, or `flux.conditionBuilder.operators.equal` can pass `pnpm check:i18n-keys` because the actual use sites are invisible to `usedKeys`. Conversely, a normal run currently reports many real condition-builder keys as "potentially unused" even though they are live, so the warning stream trains maintainers to ignore or accidentally delete active resources.
- **Confidence**: Certain. `pnpm check:i18n-keys` reports "All used i18n keys are defined" while listing `flux.conditionBuilder.*` keys as potentially unused; the production call sites use namespace-relative or dynamic keys that the scanner excludes by construction.
- **Non-duplication note**: prior i18n reports covered UI fallback bridging and hardcoded/English text in specific renderers. This is a different guardrail defect: the repo's advertised i18n consistency check does not model the key forms that `flux-i18n` itself supports and live code uses.

## Round Assessment

The useful pattern here is **guardrails that encode an older convention than the runtime contract**. `flux-i18n` intentionally allows both `flux.common.save` and `common.save`, but the check script only treats the prefixed spelling as real usage. That creates both false negatives for missing translations and false-positive unused warnings for live resources.

Immediate improvement direction: make the checker normalize literal namespace-relative keys to `flux.*`, and add an explicit allow/collection path for known dynamic key maps such as `OPERATOR_LABEL_KEYS`. If dynamic maps remain too hard to analyze generally, they should be declared in a small manifest so `check:i18n-keys` can distinguish "used dynamically" from actually unused.

## Blind-Spot Self-Assessment

This round stayed on i18n guardrails and did not inspect async locale loading, all locale resources, or every dynamic `t(key)` call. It also did not attempt to fix the checker. The next round should switch away from i18n unless a new adjacent contract issue appears, because prior reports already covered many user-visible text inconsistencies.
