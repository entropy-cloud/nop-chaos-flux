# Documentation Maintenance Checklist

## Purpose

This document explains which active docs should be reviewed when specific parts of the codebase change.

Use it as a lightweight sync checklist after architecture, runtime, renderer, or validation changes.

This is a maintenance guide, not an architecture source of truth.

## Core Rule

When code changes alter any of the following, review docs in the same change or immediately after:

- exported contracts
- runtime behavior
- schema authoring semantics
- package ownership boundaries
- examples that demonstrate the affected behavior

## Fast Path

If you do not know where to start, check these first:

1. `docs/index.md`
2. the most relevant file in `docs/architecture/`
3. `docs/references/terminology.md` if vocabulary changed
4. `docs/references/renderer-interfaces.md` if public or semi-public contracts changed
5. `docs/examples/user-management-schema.md` if authoring semantics or action behavior changed

## Change Triggers

## 1. Core contract or type changes

Examples:

- changes in `packages/amis-schema/src/index.ts`
- renamed exported types
- added or removed fields on core runtime contracts

Review:

- `docs/architecture/amis-core.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/index.md` if the recommended reading path changes

## 2. Schema compiler or field classification changes

Examples:

- changes in `packages/amis-runtime/src/schema-compiler.ts`
- new field kinds
- different region extraction behavior
- changed event-field handling

Review:

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`

## 3. React renderer boundary or hook changes

Examples:

- changes in `packages/amis-react/src/index.tsx`
- new hooks
- changed renderer component props
- changed fragment rendering behavior

Review:

- `docs/architecture/renderer-runtime.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/index.md` if the recommended reading path should change

## 4. Action semantics changes

Examples:

- changes in `packages/amis-runtime/src/action-runtime.ts`
- changed `setValue`, `ajax`, `dialog`, `closeDialog`, or `refreshTable` behavior
- changed chained action context or `prevResult` flow

Review:

- `docs/architecture/amis-core.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/flow-designer/canvas-adapters.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/examples/user-management-schema.md`

Examples also include:

- adding namespaced host actions such as `designer:*`, `spreadsheet:*`, or `report-designer:*`
- introducing or changing `xui:import` semantics
- changing action-scope resolution or imported namespace visibility

## 5. Page or dialog runtime changes

Examples:

- changes in `packages/amis-runtime/src/page-runtime.ts`
- changed dialog stack behavior
- changed nearest-dialog close semantics

Review:

- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- relevant examples if dialog authoring changed

## 6. Form runtime or validation behavior changes

Examples:

- changes in `packages/amis-runtime/src/form-runtime.ts`
- changes in `packages/amis-runtime/src/form-runtime-validation.ts`
- changed touched/dirty/visited behavior
- changed async debounce or validation visibility semantics

Review:

- `docs/architecture/form-validation.md`
- `docs/architecture/amis-core.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/examples/user-management-schema.md` if authoring guidance changed

## 7. Validation rule model changes

Examples:

- changes in `packages/amis-schema/src/index.ts` for `ValidationRule`
- changes in `packages/amis-runtime/src/validation/rules.ts`
- new relational or aggregate rules

Review:

- `docs/architecture/form-validation.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/analysis/form-validation-comparison.md` only if the higher-level comparison conclusion changes

## 8. Workspace or tooling baseline changes

Examples:

- root script changes in `package.json`
- workspace package layout changes
- baseline tooling upgrades that alter expectations

Review:

- `docs/architecture/frontend-baseline.md`
- `docs/index.md`

## 9. Example or playground behavior changes

Examples:

- changes in `apps/playground/src/App.tsx`
- changed recommended authoring patterns
- changed representative schema flows

Review:

- `docs/examples/user-management-schema.md`
- the most relevant file in `docs/architecture/`
- `docs/index.md` if the example is no longer the best reference entry point

## 9a. Action-scope or import-extension changes

Examples:

- changes in future action-scope runtime infrastructure
- changes in namespaced action resolution order
- changes in `xui:import` loading, dedupe, namespace visibility, or policy checks
- changes in host bridge registration for complex components

Review:

- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flow-designer/api.md` when designer integration changes
- `docs/architecture/report-designer/design.md` when report/spreadsheet integration changes

## 10. Spreadsheet editor or report designer changes

Examples:

- changes in future `packages/spreadsheet-*` packages
- changes in future `packages/report-designer-*` packages
- changed workbook editor boundaries, report field drag-drop behavior, or inspector customization contracts
- changed expression editor adapter boundary for report-designer properties

Review:

- `docs/architecture/report-designer/design.md`
- `docs/architecture/report-designer/config-schema.md`
- `docs/architecture/report-designer/api.md`
- `docs/index.md` if the recommended entry point changes

## What Usually Does Not Need Immediate Doc Changes

- refactors that preserve contracts, behavior, and ownership
- internal helper extraction with no visible runtime or authoring impact
- test-only changes
- historical plan files under `docs/plans/`

Even in those cases, update docs if a file's `Current Code Anchors` section becomes misleading.

## Update Order

When docs do need changing, prefer this order:

1. update the primary architecture doc
2. update `docs/references/terminology.md` if shared vocabulary changed
3. update `docs/references/renderer-interfaces.md` if contract maps changed
4. update examples
5. update `docs/index.md` only if navigation or recommended reading changed

## Quick Review Questions

Before finishing a code change, ask:

- did any exported type name, field, or union change?
- did any runtime behavior described in present tense change?
- did any example become misleading?
- did any architecture doc now point at the wrong source file?
- did any new concept appear often enough to deserve a terminology entry?

## Related Documents

- `docs/index.md`
- `docs/references/terminology.md`
- `docs/references/renderer-interfaces.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/action-scope-and-imports.md`
