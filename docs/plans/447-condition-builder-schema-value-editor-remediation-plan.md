# 447 Condition Builder Schema Value Editor Remediation Plan

> Plan Status: completed
> Last Reviewed: 2026-06-12
> Source: `docs/components/condition-builder/design.md`, `docs/architecture/field-metadata-slot-modeling.md`, `docs/architecture/renderer-runtime.md`, `docs/logs/2026/06-12.md`
> Related: `docs/plans/445-form-store-diagnostics-and-debugger-bridge-plan.md`

## Purpose

Remove the incorrect React widget-registry extension direction from `condition-builder` and re-establish a Flux-native value-editor extensibility model where custom value editors are authored as Flux JSON schema / compiled fragments rather than runtime-registered React components.

## Current Baseline

- `docs/components/condition-builder/design.md` previously drifted into a React widget-registry design (`valueWidget` -> registered React component), which conflicts with the higher-precedence renderer/field architecture docs.
- Live code currently contains that same drift in `packages/flux-renderers-form-advanced/src/condition-builder/value-input.tsx` and package exports from `packages/flux-renderers-form-advanced/src/index.tsx`.
- The higher-precedence architecture baseline already requires declarative schema inputs, renderer-owned field semantics, and compiled/rendered fragment adaptation instead of raw React-component injection.
- `ConditionCustomField` already has a closer-to-correct owner shape (`value: BaseSchema`) in `packages/flux-renderers-form-advanced/src/condition-builder/types.ts`, but the runtime path does not consistently use that as the custom value-editor extension contract.

## Goals

- Remove the React widget-registry extension surface from `condition-builder`.
- Define one Flux-native custom value-editor contract based on JSON schema / compiled fragments.
- Keep operator extensibility and value-editor extensibility separate: operators stay metadata-driven; UI stays schema-driven.
- Align code, tests, package exports, and owner docs to the same single contract.

## Non-Goals

- Broad redesign of all `condition-builder` value semantics.
- Introducing a general-purpose plugin framework for arbitrary React component injection.
- Reworking unrelated `condition-builder` operator vocabularies or persistence formats.
- Generalizing the same pattern to all advanced composite renderers in this plan.

## Scope

### In Scope

- `packages/flux-renderers-form-advanced/src/condition-builder/{types.ts,value-input.tsx,condition-item.tsx,condition-builder.tsx}` as needed
- package exports in `packages/flux-renderers-form-advanced/src/index.tsx`
- focused tests for custom value-editor contract behavior
- owner-doc updates in `docs/components/condition-builder/design.md`
- any required architecture/reference cross-links if the public contract shape changes

### Out Of Scope

- unrelated condition-builder UX changes
- broad renderer-runtime refactors outside the custom value-editor seam
- new non-condition-builder extension systems

## Failure Paths

| Scenario                     | Trigger                                                                            | Expected Behavior                                                                              | Retry                       | User-visible Result                                                   |
| ---------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------- |
| invalid-custom-editor-schema | field declares custom value-editor schema with unsupported shape                   | compiler/runtime surfaces truthful schema/render failure; no silent fallback to React registry | schema fix required         | editor does not silently disappear behind an unrelated default widget |
| missing-context-binding      | custom value editor expects `name` / `value` but the contract wiring is incomplete | focused tests fail and docs stay explicit about the required binding contract                  | implementation fix required | no hidden writeback drift                                             |
| stale-react-registry-import  | package consumer still imports removed React widget-registry API                   | typecheck/build catches the removed export or explicit deprecation path                        | code fix required           | no silent runtime no-op                                               |

## Test Strategy

档位选择（三选一）：`必须自动化` / `建议有测` / `不适用：理由`

本档选择：`必须自动化`

Reason:

- This plan corrects a public extensibility contract and must prove that schema-driven custom value editors work through the supported Flux path instead of private React injection.

## Execution Plan

### Phase 1 - Contract Correction And Owner Docs

Status: completed
Targets: `docs/components/condition-builder/design.md`, relevant architecture cross-links

- Item Types: `Fix | Decision | Proof`

- [x] Replace all React widget-registry wording with a Flux-native schema/compiled-fragment value-editor contract.
- [x] Explicitly separate operator extension metadata from value-editor rendering extension.
- [x] Document the required contextual contract for custom value editors (`name`, `value`, and other supported bindings) as Flux schema-facing semantics rather than React props registry semantics.

Exit Criteria:

- [x] `docs/components/condition-builder/design.md` no longer describes React component registration as the supported extension path.
- [x] The owner doc states one consistent Flux-native value-editor contract.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 2 - Code Contract Remediation

Status: completed
Targets: `packages/flux-renderers-form-advanced/src/condition-builder/`, package exports

- Item Types: `Fix | Decision | Proof`

- [x] Remove `registerValueWidget` / `getValueWidget` / `ValueWidgetComponent` React-registry APIs from the live package surface unless an explicitly adjudicated compatibility shim is required.
- [x] Rewire `ValueInput` so custom value-editor rendering consumes a Flux schema/compiled-fragment contract instead of a runtime React registry lookup.
- [x] Keep built-in type-based value dispatch intact for existing non-custom fields.
- [x] Ensure the supported custom contract can read/write through Flux-standard bindings instead of bespoke React callback semantics.

Exit Criteria:

- [x] Live code no longer requires runtime React widget registration for custom condition-builder value editors.
- [x] Built-in condition-builder value input behavior remains green for existing supported field types.
- [x] Public exports reflect the corrected contract with no stale React-registry API.
- [x] `docs/logs/` corresponding date entry is updated.

### Phase 3 - Focused Proof And Closure

Status: completed
Targets: focused tests in `packages/flux-renderers-form-advanced/src/condition-builder/`, plan/log closure

- Item Types: `Proof | Follow-up`

- [x] Add or update focused regression tests proving schema-driven custom value-editor rendering and writeback.
- [x] Add negative proof where invalid custom-editor configuration fails honestly instead of silently falling back to unrelated behavior.
- [x] Re-run full workspace verification gates required for code changes.

Exit Criteria:

- [x] Focused tests prove the Flux-native custom value-editor contract.
- [x] `pnpm typecheck`, `pnpm build`, `pnpm lint`, and `pnpm test` pass.
- [x] Closure audit evidence is recorded before marking the plan `completed`.
- [x] `docs/logs/` corresponding date entry is updated.

## Closure Gates

- [x] The React widget-registry direction is removed from both docs and live code.
- [x] `condition-builder` custom value-editor extensibility is Flux-schema-driven, not React-component-injection-driven.
- [x] Operator extension and editor rendering extension are documented as separate concerns.
- [x] Focused automated proof covers the corrected contract.
- [x] `pnpm typecheck`
- [x] `pnpm build`
- [x] `pnpm lint`
- [x] `pnpm test`
- [x] Independent closure audit completed before marking the plan `completed`.

## Deferred But Adjudicated

- `watch-only residual` - future extraction of a more reusable schema-driven custom-value-editor helper shared by multiple composite renderers. Why not blocking closure: this plan only needs to restore the correct `condition-builder` contract and remove the wrong React-registry path.

## Closure

Status Note: completed

Closure Audit Evidence:

- Reviewer / Agent: OpenCode independent closure audit (`gpt-5.4`), 2026-06-12
- Evidence: Verified against the current plan, landed remediation diff, and full verification results. React condition-builder widget-registry API was removed from `packages/flux-renderers-form-advanced/src/index.tsx`; custom value editors were remediated to render `field.value` as Flux schema fragments through the condition-builder runtime path; stale `valueWidget` / `widgetProps` field-base contract was removed; focused regression coverage landed for schema-driven custom editors, writeback, and honest invalid-config behavior; supporting test mocks were updated; owner docs and `docs/logs/2026/06-12.md` were updated. Verification passed for focused custom-editor tests (`value-input.test.tsx` 16, `condition-builder-renderer.test.tsx` 11, `config-actions.test.tsx` 10, `config-display.test.tsx` 29, `config-integration.test.tsx` 39) and full workspace gates: `pnpm typecheck`, `pnpm build`, `pnpm lint`, `pnpm test`, including `@nop-chaos/flux-renderers-form-advanced` (72 files / 678 tests) and `apps/playground` (19 files / 88 tests).

Follow-up:

- no remaining plan-owned work once the corrected Flux-native contract lands and verifies green
