# Report Designer to flow-designer2 Migration Plan

## Goal

Migrate report-designer capabilities into `flow-designer2` with complete package integration, runtime compatibility, and automated test parity.

Completion criteria:

- All migrated packages compile and resolve through workspace aliases/references.
- Runtime action dispatch works under flow-designer2 action-scope namespace rules.
- Automated tests for all affected packages pass.
- Workspace validation passes with final marker: `ALL_TESTS_PASSED`.

## Source and Target

- Source workspace: `../report-designer`
- Target workspace: `flow-designer2`

## Migration Scope

### Package scope

- `@nop-chaos/spreadsheet-core`
- `@nop-chaos/spreadsheet-renderers`
- `@nop-chaos/report-designer-core`
- `@nop-chaos/report-designer-renderers`

### Integration scope

- TypeScript project references
- TypeScript path mapping
- Vite workspace aliases
- Workspace lockfile/package graph

### Test scope

- Unit/integration tests in migrated packages
- Regression tests impacted by integration/runtime changes
- Full package-by-package test sweep for the workspace

## Detailed Plan

### Phase 1: Baseline and inventory

1. Verify source package structure and dependencies.
2. Verify target workspace conventions (scripts, tsconfig refs, alias strategy).
3. Capture known runtime differences:
   - `flow-designer2` routes namespaced actions via `ActionScope` namespace providers.

Deliverable:

- Explicit migration package list and integration checklist.

Status: Completed

### Phase 2: Package transfer

1. Copy the 4 target packages into `flow-designer2/packages`.
2. Exclude `node_modules` during transfer to avoid nested dependency duplication.
3. Validate package manifests and scripts remain executable in workspace mode.

Deliverable:

- Four packages present and build/test scripts available.

Status: Completed

### Phase 3: Workspace integration

1. Add migrated packages to root `tsconfig.json` references.
2. Add path aliases in `tsconfig.base.json`.
3. Add development aliases in `vite.workspace-alias.ts`.
4. Refresh lockfile/dependency graph in workspace context.

Deliverable:

- TypeScript and Vite resolve all migrated package imports in local workspace mode.

Status: Completed

### Phase 4: Runtime compatibility adaptation

1. Reconcile action dispatch differences between source runtime and flow-designer2 runtime.
2. Register namespace providers in report/spreadsheet page renderers:
   - `report-designer`
   - `spreadsheet`
3. Ensure namespaced actions map to core `dispatch` and return normalized action results.

Deliverable:

- `report-designer:*` and `spreadsheet:*` actions execute in target runtime.

Status: Completed

### Phase 5: Defect triage during test execution

1. Execute affected package tests.
2. Fix integration regressions and unstable tests.
3. Keep fixes minimal and aligned with target runtime behavior.

Observed and resolved defects:

- Invalid React hook call due to nested copied `node_modules` in migrated packages.
  - Resolution: remove package-local `node_modules` from migrated package folders.
- Missing module resolution for new packages after migration.
  - Resolution: add missing `paths` mappings in `tsconfig.base.json`.
- `canvas-bridge` test mismatches against current adapter behavior.
  - Resolution: align test assertions/mocks with current callback signatures and exports.
- report-designer namespaced update action not applied under target runtime.
  - Resolution: register proper action-scope namespace providers in page renderers.

Deliverable:

- Affected tests green and runtime behavior aligned.

Status: Completed

### Phase 6: End-to-end validation and acceptance

1. Run package-by-package automated test sweep for workspace packages/apps.
2. Record pass/fail per package.
3. Confirm final pass marker.

Validation result:

- All targeted package/app test runs passed.
- Final acceptance marker reached: `ALL_TESTS_PASSED`.

Status: Completed

## Files Integrated/Updated During Migration

Core workspace integration files:

- `tsconfig.json`
- `tsconfig.base.json`
- `vite.workspace-alias.ts`
- `pnpm-lock.yaml`

Runtime compatibility files:

- `packages/report-designer-renderers/src/page-renderer.tsx`
- `packages/spreadsheet-renderers/src/page-renderer.tsx`

Representative regression/test alignment file:

- `packages/flow-designer-renderers/src/canvas-bridge.test.tsx`

## Risk Controls Applied

- Avoided destructive git operations.
- Removed duplicated package-local dependencies introduced by copy operations.
- Re-tested after each high-impact fix.
- Used final full sweep acceptance gate rather than partial-package confidence.

## Acceptance Checklist

- [x] Four packages migrated into `flow-designer2`.
- [x] TS references, TS paths, and Vite aliases added.
- [x] Namespaced action dispatch compatibility implemented.
- [x] Migration-induced regressions fixed.
- [x] Automated tests all passing (`ALL_TESTS_PASSED`).

## Post-Migration Follow-ups

1. Keep future report-designer enhancements package-focused (`*-core`, `*-renderers`) to preserve composability.
2. Add targeted integration regression tests for namespace-provider registration paths to prevent future runtime drift.
3. Periodically run full package sweep before major merges touching runtime/action layers.
