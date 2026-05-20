# Open-Ended Adversarial Review — 2026-05-20 — Round 02

**Execution date**: 2026-05-20
**Result directory**: `docs/analysis/2026-05-20-open-ended-adversarial-review-01/`
**Exploration areas**: check/lint guardrail scripts, package manifest dependency checks, schema property coverage automation
**Discovery source**: guardrail truthfulness review, excluding the i18n issue already recorded in round 01

---

## Finding 1: finite prop contract automation is an opt-in sample list, not a finite-contract guard

- **Where**:
  - `scripts/check-finite-prop-contracts.mjs:8-51`
  - `packages/flux-renderers-basic/src/schemas.ts:143-148`
  - `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:138-179`
  - `packages/flux-renderers-data/src/schemas.ts:69-72`
  - `package.json:46`
- **What**: `pnpm lint` runs `check-finite-prop-contracts`, and recent analysis lists it as an automated finite-prop guard. The script, however, is a small hardcoded regex checklist. It checks `button.variant` but not `button.size`, even though `ButtonSchema.size` is also a finite union and the renderer definition already has a matching `propContracts.size`. It also samples only some table ownership fields even though `selectionOwnership` and `sortOwnership` are finite schema properties alongside `paginationOwnership` and `filterOwnership`.
- **Why it matters**: the guardrail can go green while finite schema unions drift out of authoring contracts, designer select metadata, or static validation shapes. Because the script name and lint integration imply broader coverage, future maintainers may believe finite prop contracts are protected when most new finite properties still require someone to remember to manually extend the regex list.
- **Confidence**: High. The finite union fields and missing script entries are explicit. The current live code happens to define `button.size`; the defect is that deleting or corrupting that contract would not be caught by this active guard.
- **Non-duplication note**: this is not the previously reported package CSS or bundle/public-type guard issue. It is a separate authoring-contract automation gap.

---

## Finding 2: workspace manifest dependency check misses bare side-effect imports

- **Where**:
  - `scripts/check-workspace-manifest-deps.mjs:10-11,70-81`
  - `packages/report-designer-renderers/src/report-spreadsheet-canvas.tsx:1-12`
  - `packages/spreadsheet-renderers/src/renderers.tsx:1`
  - `package.json:8,46`
- **What**: `check-workspace-manifest-deps` scans `from '@nop-chaos/...'` and dynamic `import('@nop-chaos/...')`, normalizes subpaths, then checks `package.json` declarations. It does not match legal bare side-effect imports such as `import '@nop-chaos/spreadsheet-renderers/canvas-styles.css';`, even though this pattern exists in tracked package source.
- **Why it matters**: a package can depend on another workspace package purely through a CSS or initialization side-effect import and still pass the manifest dependency check if the dependency is missing from `package.json`. That matters for published/private package installs, dependency pruning, and package-level builds where the source import is real but the manifest does not expose the relationship.
- **Confidence**: High. The current report-designer manifest declares `@nop-chaos/spreadsheet-renderers`, so this is not a live missing dependency today. The finding is that the active guard would fail to catch that class if it regressed.
- **Non-duplication note**: a May 3 report covered false positives for workspace subpath imports before normalization. This is the opposite residual after normalization: false negatives for bare side-effect import syntax.

---

## Finding 3: schema property coverage is documented as a 100% guard but is no longer green and is not in the main check chain

- **Where**:
  - `scripts/check-schema-prop-coverage.mjs:1-16,261-278,473-481`
  - `package.json:8,46`
  - `docs/articles/ai-native-large-system-development-lessons.md:455,784`
  - `docs/archive/plans/151-json-schema-property-coverage-100-percent-plan.md:99,126,141,145,160`
- **What**: project docs describe `scripts/check-schema-prop-coverage.mjs` as a 100% schema property coverage guard. The script itself exits non-zero when any property is uncovered, but root `pnpm check` and `pnpm lint` do not run it. A fresh run now reports 78 declared properties, 75 covered, 3 uncovered: `array-field.addable`, `array-field.removable`, and `form.shape`.
- **Why it matters**: the historical 100% property-coverage baseline has silently decayed while the normal verification entry points stay green. This weakens the exact contract the script was created for: new JSON-visible schema properties should not land without a test fixture proving they compile/render through the intended path.
- **Confidence**: Certain. `node scripts/check-schema-prop-coverage.mjs --json` returns 96.2% coverage and exits non-zero; neither root `check` nor `lint` references the script.
- **Non-duplication note**: this is not a generic "missing tests" complaint. It is a stale automation-contract problem: a documented guard exists, fails today, and is absent from the active verification chain.

## Round Assessment

The common thread is **automation as an attractive nuisance**. Several scripts are valuable, but their names, documentation, and check-chain placement now overstate what they protect:

- one active lint guard samples finite prop contracts instead of deriving them;
- one active manifest guard parses only import forms that carry bindings;
- one historical 100% coverage guard is no longer part of the main verification path and has already regressed.

Immediate improvement direction: either downgrade the claims and names to "sample/suspect checks", or make these scripts derive coverage from the same source of truth used by the compiler and registry. For guardrails that remain mandatory, they should be in `pnpm check` and fail only on real actionable drift.

## Blind-Spot Self-Assessment

This round did not audit every `scripts/audit/*.mjs` suspect scanner, nor did it mutate files to prove each false-negative mechanically. It focused on guardrails with direct evidence in live code and command output. A later pass could inspect whether audit-suspect scripts also report stale patterns that are no longer actionable.
