# Deep Audit Summary

## Scope

- Audit date: `2026-04-26`
- Audit focus: deep repository review with extra attention on performance-related issues across runtime, forms, spreadsheet, report-designer, and React integration.
- Baseline docs read before auditing:
  - `docs/index.md`
  - `AGENTS.md`
  - `docs/architecture/performance-design-requirements.md`
  - `docs/architecture/renderer-runtime.md`
  - `docs/architecture/form-validation.md`
  - `docs/architecture/scope-ownership-and-isolation.md`
  - `docs/architecture/security-design-requirements.md`
  - `docs/bugs/07-submit-concurrent-guard-fix.md`
  - `docs/bugs/15-render-nodes-setstate-during-render-fix.md`

## Method

- Ran a codebase-wide oversized-file baseline with `pnpm check:oversized-code-files`.
- Ran a repository-wide grep baseline for performance and async risk patterns.
- Performed first-pass parallel audits for dimensions 04, 05, 06, and 15.
- Performed independent review passes on each high-risk or uncertain finding before retaining it.
- Only findings that survived independent review are listed below.

## Review Statistics

- First-pass candidate findings considered across audited dimensions: 19
- Independently reviewed candidate groups: 10
- Retained after review: 8
- Downgraded after review: 5
- Rejected after review: 2

## Verified Findings

### P1

1. `packages/flux-runtime/src/async-data/api-data-source-controller.ts:259-274,331-351,393-426`
   The controller can settle a run as `succeeded` before result mapping and publish finish; if later mapping/publish work throws, the catch path can return early without failure state or telemetry. This violates observable-failure expectations and can leave async governance/state inconsistent with the real outcome.

### P2

2. `packages/flux-renderers-form/src/renderers/form.tsx:370-392`
   When `valuesPath` is enabled, the form renderer subscribes to the entire form store and performs `JSON.stringify(values)` on every store wake-up before deciding whether to republish to the parent scope. This creates avoidable whole-value serialization cost on large forms.

3. `packages/spreadsheet-core/src/core/clipboard-operations.ts:49-70`, `packages/spreadsheet-core/src/core/document-access.ts:40-42`
   Spreadsheet paste loops call `setCell(...)` for each cell, and each `setCell(...)` clones the full `sheet.cells` map. Large paste operations therefore pay repeated immutable-copy costs in a user-triggered hot path.

4. `packages/flux-renderers-form-advanced/src/condition-builder/condition-builder.tsx:48-52`, `packages/flux-renderers-form-advanced/src/condition-builder/utils.ts:18-20`
   Condition builder equality uses `JSON.stringify` on the full condition tree inside a form subscription path. Unrelated form-store updates can still trigger deep serialization work.

### P3

5. `packages/flux-react/src/hooks.ts:225-241`, `packages/flux-renderers-form/src/field-utils.tsx:75-80,368-390`
   `useCurrentFormState` is still a whole-store subscription for several field-level value/presentation reads. Equality functions limit rerenders, but the code remains short of the documented P7 path-subscription goal.

6. `packages/flux-react/src/schema-renderer.tsx:146-190`
   Schema preparation still uses a `disposed` flag because the `prepareSchema` chain is not abortable. This is a low-severity cancellation-gap in the API chain, not a standalone misuse inside `SchemaRenderer`.

7. `packages/report-designer-core/src/runtime/metadata.ts:92-115,232-268`
   Range-drop metadata updates rebuild semantic maps one cell at a time through the public command path. This is not the default built-in canvas drag path today, but it is still a real lower-priority performance risk for range-based integrations.

## Explicitly Rejected Or Downgraded Out

1. `object-field` local `resolvedValue` mirror was reviewed and downgraded out as an intentional transform-in/transform-out working-value layer rather than a confirmed current defect.
2. The broad `useCurrentFormState` finding was downgraded from a higher-severity architecture defect to a lower-priority P7 convergence debt because current equality functions and field-state path subscriptions already mitigate part of the impact.
3. The schema-preparation cancellation finding was downgraded from a local `schema-renderer` violation to a chain-level API capability gap.

## Most Important Next Steps

1. Fix `api-data-source-controller` so success settlement happens only after mapping/publish work that can still fail, and ensure every real failure reaches failure state and telemetry.
2. Replace form `valuesPath` whole-value stringify dedupe with a cheaper change signal or values-only subscription strategy.
3. Add a bulk cell-write path for spreadsheet paste that clones `sheet.cells` once per operation rather than once per pasted cell.
4. Replace condition-builder stringify equality with a cheaper stable-identity or targeted structural comparison strategy.
