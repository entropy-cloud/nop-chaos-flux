# 2026-04-17 Deep Audit Summary

- Audit date: `2026-04-17`
- Execution model: 18 `explore` subagents, one per audit dimension, dispatched in 5 handbook batches
- Source prompt: `docs/skills/deep-audit-prompts.md`
- Result storage rule: one file per dimension, plus this summary index
- Calibrated follow-up review: `docs/analysis/2026-04-17-deep-audit-meta-review.md`

## Scope

- Dimensions covered: `01`-`18`
- Repo areas covered: `packages/*`, `apps/playground`, `docs/*`, `AGENTS.md`
- Output files:
  - `01-dependency-boundaries.md`
  - `02-module-boundaries.md`
  - `03-api-surface-and-contracts.md`
  - `04-state-ownership.md`
  - `05-subscription-precision.md`
  - `06-async-cancellation-safety.md`
  - `07-lifecycle-effect-ownership.md`
  - `08-validation-consistency.md`
  - `09-renderer-contracts.md`
  - `10-styling-system-compliance.md`
  - `11-ui-component-usage.md`
  - `12-field-slot-modeling.md`
  - `13-type-safety-boundaries.md`
  - `14-test-coverage-quality.md`
  - `15-security-performance-redlines.md`
  - `16-doc-code-consistency.md`
  - `17-naming-terminology-consistency.md`
  - `18-cross-package-pattern-consistency.md`

## P0 List

- None reported.

## P1 List

| Dimension | Theme | Key files |
| --- | --- | --- |
| 03 | Public API leaks test support and inconsistent renderer registration | `packages/flux-renderers-form/src/index.tsx`, `packages/word-editor-renderers/src/index.ts` |
| 04 | Complex field values and spreadsheet selection still have double-state ownership | `packages/flux-renderers-form-advanced/src/array-editor.tsx`, `packages/spreadsheet-renderers/src/use-selection.ts` |
| 05 | Field/error subscriptions still wake on whole-form or whole-context changes | `packages/flux-react/src/field-frame.tsx`, `packages/flow-designer-renderers/src/designer-page.tsx` |
| 06 | Request refresh/drop and submit cancellation guarantees are incomplete | `packages/flux-runtime/src/data-source-runtime.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts` |
| 07 | Anonymous source lifecycle is still owned by React effects | `packages/flux-react/src/use-node-source-props.ts`, `packages/flux-react/src/useSourceValue.ts` |
| 08 | Validation owner model and submit propagation do not match the architecture doc | `packages/flux-runtime/src/schema-compiler/validation-collection.ts`, `packages/flux-runtime/src/form-runtime-submit-flow.ts` |
| 09 | Multiple renderers break contract rules around state ownership, slots, or implicit styling | `packages/flux-renderers-data/src/table-renderer.tsx`, `packages/flux-renderers-form-advanced/src/*.tsx` |
| 10 | Styling contract drift: internal `nop-*` styling, hardcoded colors, spreadsheet CSS mismatch | `packages/flux-renderers-form/src/renderers/input.tsx`, `packages/flow-designer-renderers/src/*`, `packages/spreadsheet-renderers/src/*` |
| 11 | Playground and utility surfaces still have actionable raw HTML usage | `apps/playground/src/flow-designer/*`, `packages/word-editor-renderers/src/dialogs/ChartDialog.tsx` |
| 12 | Advanced field renderers still bypass `FieldFrame` or misuse field slots | `packages/flux-renderers-form-advanced/src/*`, `packages/flux-code-editor/src/types.ts` |
| 13 | `any` still escapes through public renderer/env/action contracts | `packages/flux-core/src/types/renderer-core.ts`, `packages/flux-core/src/types/renderer-api.ts` |
| 14 | Core runtime/react/formula coverage gaps and weak E2E assertions | `packages/flux-runtime/src/*`, `packages/flux-react/src/*`, `tests/e2e/component-lab/*` |
| 15 | Whole-store error subscriptions and mutable report document updates hit performance redlines | `packages/flux-react/src/hooks.ts`, `packages/report-designer-core/src/core-dispatch.ts` |
| 17 | `name` vs `dataPath` terminology still coexists in DataSource authoring | `packages/flux-core/src/types/schema.ts`, `packages/flux-runtime/src/source-registry.ts` |

## Frequent Problem Files

| File | Dimensions |
| --- | --- |
| `packages/flux-runtime/src/runtime-factory.ts` | 02, 06 |
| `packages/flux-runtime/src/source-registry.ts` | 02, 06, 17 |
| `packages/flux-runtime/src/form-runtime-submit-flow.ts` | 06, 08 |
| `packages/flux-react/src/hooks.ts` | 08, 15 |
| `packages/flux-react/src/field-frame.tsx` | 05, 08 |
| `packages/flow-designer-renderers/src/designer-page.tsx` | 05, 10 |
| `packages/flux-renderers-data/src/table-renderer.tsx` | 09 |
| `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` | 10 |
| `packages/flux-renderers-form-advanced/src/array-editor.tsx` | 04, 09, 12 |
| `packages/flux-renderers-form-advanced/src/key-value.tsx` | 04, 09, 12 |
| `packages/flux-renderers-form-advanced/src/condition-builder/ConditionBuilder.tsx` | 09, 12 |

## Cross-Dimension Patterns

- Boundary drift is now concentrated in a few remaining runtime/react/doc contract mismatches; the major dimension-02 entrypoint and renderer-file splits have been landed.
- Single-source-of-truth drift: complex field renderers, spreadsheet/report designer state, and validation owner flow all show duplicated ownership or React-local copies of runtime state.
- Runtime/React split still incomplete: anonymous source execution, status aggregation, submit cancellation, and validation propagation still rely on React-layer orchestration.
- Contract/document divergence: API exports, docs, plans, and naming rules are no longer fully aligned with the live repo.
- Missing automation: many high-value findings are structural and still depend on manual review because lint/tests do not enforce them yet.

## Automated Checks Already Covering Part Of This Review

- Existing lint/typecheck already prevent some direct type errors and stale `@ts-expect-error` usage.
- Existing tests already cover some array-editor/key-value reset regressions, but not the deeper ownership model.
- Existing Tailwind workspace scanning and `classAliases` behavior look aligned in the checked paths.
- No `eval` / `new Function` violations were reported.

## Suggested New Automation

- Add a package-boundary rule to flag cross-package internal-path imports, dependency cycles, and package manifest/runtime mismatches.
- Add a calibrated raw-HTML lint rule for renderer/playground code with explicit allowlists for native platform controls and spreadsheet-style high-performance host surfaces.
- Add a lint/check for `FieldFrame`-capable field renderers that still render `FieldLabel` / `FieldHint` directly.
- Add checks for whole-store form subscriptions in field/error hooks where `subscribeToPath` is available.
- Add an API-surface check to block exporting `__tests__` support from package root barrels.
- Add a plan closure audit check so `completed` plans cannot keep unchecked validation items.

## Lower-Priority Or Deferrable Items

- `theme-tokens` and `tailwind-preset` package metadata/test gaps are real but lower ROI than runtime/react/validation issues.
- File naming consistency (`button.tsx` vs `*-renderer.tsx`) is worth cleaning up after boundary and ownership fixes.
- Some test-support raw HTML violations are lower priority than production renderer/playground violations.

## False-Positive Exclusions

- No cycle was reported in the package dependency graph.
- No cross-package internal-path imports like `@nop-chaos/*/src/...` were reported.
- Public `renderers -> flux-core` / `flux-formula` / `flux-runtime` dependencies were recalibrated as acceptable when they target stable public APIs.
- `report-designer-renderers -> spreadsheet-renderers` was recalibrated as valid shared-package reuse.
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx` native table/input structure was recalibrated as a valid host-surface exception, not a UI violation.
- No `ThemeProvider` dependency issue was reported.
- No spreadsheet canvas Tailwind misuse beyond the specific hybrid-style mismatch was reported.
- Several large files were explicitly judged acceptable orchestrators or algorithm files; see `02-module-boundaries.md`.

## Provenance

| Dimension | Task ID |
| --- | --- |
| 01 | `ses_2690a309fffeSqRo7YpWUWrvpS` |
| 02 | `ses_268e2cd03ffevRLou0TmAA8N1k` |
| 03 | `ses_268cac7c9ffeGURGzSgzg1uNv3` |
| 04 | `ses_2690a2fc6ffeSj1DuzAB1kSLVd` |
| 05 | `ses_268f5badfffe5d3tQ59Yf96wBo` |
| 06 | `ses_268f5b160ffeZYrngIp1lQ4jbe` |
| 07 | `ses_268e2c9c0ffeW43hKgWoNyNLQI` |
| 08 | `ses_268e2c51cffeheY8h43KKSHNBF` |
| 09 | `ses_268f5ada6ffeRRI3Twt0r9zM7a` |
| 10 | `ses_268cac48affe9LucoGdwsnD938` |
| 11 | `ses_268b251b3ffe1enEyagM0LSTYx` |
| 12 | `ses_268b25019ffe0h9fiZL3cMdylq` |
| 13 | `ses_268cac141ffeYNzPyFPpuY790y` |
| 14 | `ses_268e2be72ffeZkORV4FIongYPl` |
| 15 | `ses_2690a2ef2ffe08deH13Df3wUC4` |
| 16 | `ses_268b24f47ffeFeJB5eU3XtrqFQ` |
| 17 | `ses_268b24db9ffeQduL4y0KA5NG2F` |
| 18 | `ses_268b24ce3ffewHKs4kxVhQ5fYu` |
