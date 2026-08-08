# 104 Flow Designer NaN Shell Width Fail-Closed Gap Fix

## Problem

A flow-designer schema action `setPanelWidths` passing `paletteWidth: NaN`
(from a template/expression or a bad `JSON.parse` of stored config) polluted
the shell state: panel width became `NaN`, and because the idempotent guard
`NaN !== NaN` was always true, **every** subsequent dispatch emitted another
`NaN` change — a permanently dirty, non-recoverable state.

## Diagnostic Method

- Hard part: `NaN` is a number — `typeof NaN === 'number'` — so the naive
  type checks on the input path admit it; the failure surfaces as weird UI
  layout, not a crash.
- Traced the width pipeline end to end: schema action provider →
  command adapter → core shell controls.
- Rejected "UI layout code is at fault": the corruption entered through the
  state-setting API, not layout math.
- Decisive evidence: `clampShellWidth` (`shell-controls.ts:17-24`) had no
  `Number.isFinite` guard, so `Math.max(NaN, min) === NaN`; the
  `typeof args.paletteWidth === 'number'` check in the action provider
  (`designer-action-provider.ts:450`) admitted NaN; the command adapter's
  `!== undefined` check (`designer-command-adapter.ts:256-264`) passed it
  through; and the idempotent guard in `shell-controls.ts:112-120`
  compared with `===` which NaN never satisfies.

## Root Cause

- Missing `Number.isFinite` fail-closed guard at the core clamp, plus
  permissive input checks (`typeof === 'number'`, `!== undefined`) at the
  action-provider/command-adapter boundary that admit `NaN`.
- `NaN !== NaN` makes equality-based idempotent guards permanently false, so
  the pollution re-emitted on every dispatch.

## Fix

- `clampShellWidth` now fails closed with `Number.isFinite`
  (`shell-controls.ts`), and the action provider / command adapter reject
  non-finite widths with `{ ok: false, reason: 'invalid-width' }` without
  calling `setPaletteWidth`/`setInspectorWidth`. NaN injection no longer
  reaches shell state; finite updates keep working.

## Tests

- `packages/flow-designer-core/src/__tests__/core-ui-state.test.ts:455`
  (test-first, red before the fix) — rejects NaN palette/inspector widths
  fail-closed without state change or emit; `:473` — finite updates still
  work after a NaN rejection.
- `packages/flow-designer-renderers/src/designer-action-provider.test.ts:57`
  — `setPanelWidths` NaN rejection with `{ok:false, reason:'invalid-width'}`
  and no `setPaletteWidth` call.

## Affected Files

- `packages/flow-designer-core/src/core/shell-controls.ts`
- `packages/flow-designer-core/src/core/shell-state.ts`
- `packages/flow-designer-renderers/src/designer-action-provider.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter.ts`

## Notes For Future Refactors

- `typeof x === 'number'` admits `NaN`; numeric contract guards must use
  `Number.isFinite` for anything that will be clamped/stored/compared.
- Never rely on equality (`===`) for idempotence or dedupe of values that can
  be `NaN` — use `Number.isFinite`/`Object.is` semantics or fail closed.
