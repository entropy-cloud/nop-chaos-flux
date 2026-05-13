# 272 Compile-Time Prop Value Validation And Variant Convergence Plan

> Plan Status: completed
> Last Reviewed: 2026-05-13
> Source: `docs/architecture/schema-file-validator.md`, `docs/architecture/variant-vocabulary.md`, `docs/logs/2026/05-13.md`
> Related: `docs/plans/117-renderer-definition-unified-static-contract-plan.md`, `docs/plans/144-flux-execution-boundary-diagnostics-and-host-contract-tooling-plan.md`, `docs/plans/151-json-schema-property-coverage-100-percent-plan.md`

## Purpose

Make compiler-integrated schema validation enforce known finite option ranges for renderer props and related schema-owned config fields.

The plan closes the specific live gap where invalid authored values such as `button.variant: "primary"` are accepted because `propContracts` currently only make the key known, not the value range enforced.

## Current Baseline

- `docs/architecture/variant-vocabulary.md` now defines the desired vocabulary split: component-local visual `variant`, action `intent`, passive visual `level`, and domain-specific names for business discriminants.
- `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` already registers `button.variant` and `button.size` as `propContracts.shape.kind: 'union'` of `literal` values.
- `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts` currently uses `propContracts` and `propSchema` to build accepted key sets only.
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts` reports unknown bare properties and invokes renderer-owned `schemaValidator`, but it does not generically validate ordinary renderer prop values against `propContracts.shape`.
- `packages/flux-compiler/src/schema-compiler/host-action-validation.ts` validates `FluxValueShape` `union` and `literal` values for host capability action args, but that shape validator is scoped to host action args and is not reused for renderer props.
- Flow Designer toolbar still declares `variant?: 'default' | 'accent' | 'danger'` in `packages/flow-designer-core/src/types.ts`.
- Report Designer toolbar still declares `variant?: 'default' | 'primary' | 'danger'` in `packages/report-designer-renderers/src/schemas.ts`.
- Existing docs/examples still contain invalid or soon-to-be-migrated style vocabulary, including Flow Designer docs with `variant: 'primary'`.
- `scripts/analyze-variant-vocabulary.mjs` can inventory current `variant` definitions/usages and should be used as a pre/post migration proof.

## Goals

- Enforce finite option ranges for statically knowable renderer prop values during compiler validation.
- Require renderer definitions to register finite option ranges for any public finite-valued schema field.
- Normalize `variant` definitions according to `docs/architecture/variant-vocabulary.md` before enabling repo-wide enforcement.
- Fix all schema/docs/tests/code/CSS issues exposed by the new validation mechanism, including invalid `variant` values and toolbar `variant` versus `intent` drift.
- Add focused tests proving invalid static values are rejected and valid dynamic/non-static values are handled intentionally.
- Update owner docs so the final design describes the implemented validation baseline, not a future target.

## Non-Goals

- Do not evaluate runtime expressions during compile-time validation.
- Do not validate user-entered form values; this plan is for authored schema/config validation.
- Do not create a global `variant` enum.
- Do not silently add broad backward compatibility aliases unless Phase 1 records a concrete persisted-schema or external-consumer requirement.
- Do not replace renderer-owned `schemaValidator` hooks; this plan adds generic prop-value validation and keeps renderer-specific structural validators for nested or domain-specific shapes.

## Scope

### In Scope

- `RendererPropContract.shape` validation for ordinary renderer props.
- Static literal value checking for `FluxValueShape` `literal`, `union`, primitive kind, arrays, and objects where shape information exists.
- Diagnostics behavior for invalid finite option values.
- Registration coverage for finite-valued public renderer schema fields.
- Variant/intent/level migration for supported public docs/examples and shipped renderer/domain toolbar contracts.
- CSS or selector updates needed after variant vocabulary migration.
- New static checks or scripts that prevent future finite-valued public fields from missing a registered option-range contract.

### Out Of Scope

- Runtime validation of expression results.
- Runtime coercion of invalid values at render time beyond existing defensive fallbacks.
- Complete JSON Schema generation for all renderer contracts.
- Migration of archived historical docs, except when they are used as active examples or validation fixtures.

## Execution Plan

### Phase 1 - Variant Vocabulary Contract Freeze

Status: completed
Targets: `docs/architecture/variant-vocabulary.md`, `docs/references/flux-json-conventions.md`, `packages/flow-designer-core/src/types.ts`, `packages/report-designer-renderers/src/schemas.ts`, `packages/*/src/**/*.{ts,tsx,css}`, `docs/**/*.{md,json}`

- Item Types: `Decision`, `Fix`, `Proof`

- [x] Re-run `node scripts/analyze-variant-vocabulary.mjs` and record the live pre-migration value inventory in the daily log or plan notes.
- [x] Freeze the final supported public vocabularies before compiler enforcement: `ButtonVariant`, `TabsVariant`, `ActionIntent`, and visual `StatusLevel` exactly as owned by `docs/architecture/variant-vocabulary.md`.
- [x] Replace new/active toolbar action authoring surfaces that currently use semantic `variant` values with `intent` where the contract is owned by this repo.
- [x] For Flow Designer toolbar, migrate `variant: 'accent' | 'danger' | 'default'` to `intent: 'primary' | 'danger' | 'neutral'` or record an explicit persisted-schema compatibility requirement before keeping an alias.
- [x] For Report Designer toolbar, migrate `variant: 'primary' | 'danger' | 'default'` to `intent: 'primary' | 'danger' | 'neutral'` or record an explicit persisted-schema compatibility requirement before keeping an alias.
- [x] Fix active docs/examples that still show public `button.variant: 'primary' | 'danger' | 'accent' | 'success' | 'warning'` unless they are deliberately documenting legacy migration behavior.
- [x] Audit CSS, `data-variant` selectors, component class maps, and toolbar renderers for variant-name-dependent logic and update them to `intent`, `level`, or shadcn-compatible `variant` as appropriate.
- [x] Keep UI-private cva variants such as Badge `success`/`warning` documented as component-private unless a public renderer explicitly owns them.

Exit Criteria:

- [x] Active docs and shipped examples no longer present invalid public `button.variant` values as current guidance.
- [x] Flow Designer and Report Designer toolbar contracts have an explicit live baseline: migrated to `intent` or documented with a concrete compatibility reason and validation strategy.
- [x] CSS/selectors/renderers affected by vocabulary changes have been updated or explicitly proven unaffected.
- [x] `scripts/analyze-variant-vocabulary.mjs` output has no unexplained public-schema `variant` values outside the normalized vocabulary.
- [x] Relevant owner docs are updated: `docs/architecture/variant-vocabulary.md`, `docs/references/flux-json-conventions.md`, and any touched domain docs under `docs/architecture/flow-designer/` or `docs/architecture/report-designer/`.
- [x] `docs/logs/` corresponding date entry has been updated.

### Phase 2 - Generic FluxValueShape Prop Validation

Status: completed
Targets: `packages/flux-compiler/src/schema-compiler/`, `packages/flux-core/src/schema-diagnostics/`, `packages/flux-core/src/types/renderer-core.ts`

- Item Types: `Fix`, `Decision`, `Proof`

- [x] Extract or introduce a reusable `validateFluxValueShape(...)` helper that is not host-action-specific and can validate authored schema values against `FluxValueShape`.
- [x] Preserve host action arg validation behavior while making renderer prop validation use the same shape semantics where appropriate.
- [x] Validate only statically knowable authored values. Dynamic expressions, source objects, and values that require runtime scope evaluation must be skipped or diagnosed according to an explicit documented rule.
- [x] Validate primitive kinds, literals, unions, arrays, and objects using existing `FluxValueShape` semantics.
- [x] Add compiler diagnostics for invalid known prop values, including a stable code such as `invalid-property-value`.
- [x] Ensure diagnostics include path, renderer type, property name, expected range/type, and actual value summary.
- [x] Ensure invalid-value diagnostics participate in `validateSchema(...)`, compile diagnostics mode, and React `strictValidation` consistently.
- [x] Decide and implement whether invalid known prop values should be skipped from prop lowering when severity is `error`, matching or intentionally differing from unknown-property skipped behavior.

Exit Criteria:

- [x] `button.variant: "primary"` produces a deterministic compiler diagnostic in validation mode.
- [x] `button.variant: "outline"` passes validation.
- [x] `button.variant: "${expr}"` or equivalent dynamic value behavior is covered by an explicit test and documented rule.
- [x] Host action arg validation tests still pass and prove the reusable helper did not weaken host validation semantics.
- [x] `docs/architecture/schema-file-validator.md` is updated from current limitation to final implemented behavior.
- [x] `docs/logs/` corresponding date entry has been updated.

### Phase 3 - RendererDefinition Option-Range Registration Sweep

Status: completed
Targets: `packages/flux-renderers-*/src/`, `packages/flow-designer-*/src/`, `packages/report-designer-*/src/`, `packages/word-editor-*/src/`, `packages/flux-code-editor/src/`, `packages/ui/src/`, `scripts/`

- Item Types: `Fix`, `Proof`

- [x] Audit every public renderer schema field with a finite value range and ensure the owning `RendererDefinition` registers `propContracts` or an equivalent renderer-owned validation contract.
- [x] Require each finite option-range contract to include authoring metadata: `displayName`, `description` where useful, `editorType: 'select'` or equivalent, and literal/union `shape` values.
- [x] Add or update a static check script that fails when a public finite-valued renderer prop exists in schema/types but has no registered option-range contract.
- [x] Cover public `variant`, `intent`, `level`, `size`, `orientation`, layout token, and mode-like fields that are statically finite.
- [x] For nested domain config objects that are not ordinary top-level renderer props, add renderer-specific `schemaValidator` or shape contracts so nested finite values are checked.
- [x] Ensure private UI component variants are not accidentally exposed as public schema contracts unless a renderer explicitly owns them.

Exit Criteria:

- [x] Static registration check passes and is wired into `pnpm lint` or an existing validation gate.
- [x] Public finite option ranges in shipped renderer schemas have registered metadata or an explicit documented exception.
- [x] Nested toolbar/config finite values are validated by either generic prop-shape validation or renderer-owned schema validators.
- [x] Owner docs are updated if public renderer contracts changed; otherwise explicitly record `No additional owner-doc update required` in the daily log.
- [x] `docs/logs/` corresponding date entry has been updated.

### Phase 4 - Fix All Validation Failures And Variant Drift

Status: completed
Targets: `apps/`, `docs/`, `packages/`, `tests/`

- Item Types: `Fix`, `Proof`

- [x] Run the new validator against representative docs/examples, playground schemas, component lab schemas, and package tests.
- [x] Fix every invalid `variant` value surfaced by the new validator rather than weakening validation.
- [x] Replace semantic toolbar `variant` usages with `intent` where Phase 1 selected migration.
- [x] Map `intent: 'danger'` to shadcn `variant="destructive"` inside renderer/UI adapter code.
- [x] Map `intent: 'primary'` to shadcn `variant="default"` or an explicitly documented component-specific visual mapping.
- [x] Update CSS selectors, data attributes, snapshot expectations, and tests that depended on old semantic `variant` values.
- [x] Keep `level` for passive visual status and avoid changing notification/diagnostic API severities from `error` to `danger`.

Exit Criteria:

- [x] No active supported schema/doc/test fixture fails due to invalid finite option values.
- [x] `scripts/analyze-variant-vocabulary.mjs` output is explainable under `variant-vocabulary.md` with no remaining public-contract drift.
- [x] Focused tests cover old failure examples such as public `button.variant: "primary"`.
- [x] CSS and renderer visual behavior for migrated toolbar intents is verified by unit/component tests or focused DOM assertions.
- [x] `docs/logs/` corresponding date entry has been updated.

### Phase 5 - Verification And Closure Audit

Status: completed
Targets: workspace verification, `docs/logs/`, affected owner docs

- Item Types: `Proof`

- [x] Run focused compiler validation tests for prop shape/literal/union enforcement.
- [x] Run focused renderer/domain tests for migrated `variant`/`intent`/`level` behavior.
- [x] Run `node scripts/analyze-variant-vocabulary.mjs` and archive the final summary in the daily log.
- [x] Run `pnpm typecheck`.
- [x] Run `pnpm build`.
- [x] Run `pnpm lint`.
- [x] Run `pnpm test`.
- [x] Run an independent closure-audit subagent after implementation is complete.

Exit Criteria:

- [x] All focused validation and migration tests pass.
- [x] Workspace verification passes.
- [x] Daily log records final test counts/summary after the full green rerun.
- [x] Independent closure audit confirms no remaining plan-owned validation or variant drift.
- [x] `docs/logs/` corresponding date entry has been updated.

## Closure Gates

> **关闭条件**：只有本 section 所有条目以及每个 Phase 的 Exit Criteria 全部勾选为 `[x]` 后，才能将 `Plan Status` 改为 `completed`。

- [x] Generic compiler validation enforces statically knowable renderer prop values against registered `FluxValueShape` ranges.
- [x] RendererDefinition registration coverage exists for public finite-valued schema fields, with static enforcement against missing registrations.
- [x] Public `variant` vocabulary is normalized according to `docs/architecture/variant-vocabulary.md`.
- [x] Toolbar semantic styling uses `intent`.
- [x] CSS/selectors/renderers/tests affected by variant/intent/level migration are updated.
- [x] All validation failures introduced by the stricter checker are fixed, not hidden by weakening rules.
- [x] Relevant architecture and reference docs describe the final live behavior.
- [x] Independent closure audit has been completed and recorded.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`

## Deferred But Adjudicated

None at plan creation time. Confirmed live validation gaps and public-contract drifts in this plan cannot be deferred without successor ownership.

## Non-Blocking Follow-ups

None at plan creation time.

## Closure

Status Note: Phases 1-5 are complete. Full-workspace verification is green, the final closure audit has been recorded, and no remaining in-scope plan-owned gaps remain.

Closure Audit Evidence:

- Reviewer / Agent: independent closure audit rerun recorded after repository doc sync on 2026-05-13.
- Evidence: Plan 272 implementation, docs, and verification gates are now synchronized; final task id and verdict are recorded in the daily log entry for 2026-05-13.

Follow-up:

- No remaining plan-owned work may be listed here unless independently adjudicated as non-blocking before closure.
