# 113 Report Designer Toolbar Negated Boolean Templates Never Evaluate Fix

## Problem

- In the `report-designer-page` host, the toolbar **Undo/Redo buttons were always enabled** even with an empty undo/redo history: the default items declare `disabled: '${!designer.canUndo}'`, but the expression never evaluated, so the buttons stayed clickable and dispatched no-op commands.
- Any `!`-negated template (`${!designer.canUndo}`, `${!preview.running}`, `${!designer.dirty}`) silently degraded to "no value" — visible/active/disabled state driven by negation never worked.
- Minimal reproducible: `evalBooleanLike('${!designer.canUndo}', { designer: { canUndo: false } })` returns `undefined` instead of `true`.

## Diagnostic Method

- The e2e host spec asserted the initial Undo button state (`toBeDisabled`) and failed with the button enabled — the symptom surfaced only in the real browser host.
- Read `evalBooleanLike` (`report-designer-toolbar-helpers.ts`): the `!` branch recurses with a NUL-prefixed expression `` `\x00${expr.slice(1)}` `` so the inner call skips the `!` branch again, then the direct path strips `\u0000`.
- The recursion is dead code: the inner call runs `value.trim()` first — `String.prototype.trim` does **not** strip `\x00` (verified with `node -e`), so the NUL-prefixed string fails the `${...}` wrapper check and returns `undefined`; the `!` branch then propagates `undefined`.
- The NUL "escape marker" trick worked for the _strip_ side but never for the _contract check_ side — the negation path could never succeed.

## Root Cause

- The negation implementation tried to reuse the `${...}`-contract parser by prefixing a marker character; the marker survives `trim()` and fails the contract check. The whole `!` branch was dead code from introduction.

## Fix

- `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts`: the `!` branch now evaluates the inner expression directly via `readStatePath(expr.slice(1).trim(), snapshot)` and negates boolean results (non-boolean → `undefined`). The NUL-prefix recursion and the `startsWith('\u0000')` strip are removed.

## Tests

- `packages/report-designer-renderers/src/report-designer-toolbar-helpers.test.ts` — new `evalBooleanLike negation` block: `'${!designer.canUndo}'` → `true`/`false` for both states, and `undefined` for non-boolean state. Red before the fix, green after.
- e2e confirmation: `tests/e2e/report-designer-host.spec.ts` asserts Undo disabled initially (no history) and enabled after an edit.

## Affected Files

- `packages/report-designer-renderers/src/report-designer-toolbar-helpers.ts`
- `packages/report-designer-renderers/src/report-designer-toolbar-helpers.test.ts`

## Notes For Future Refactors

- If the toolbar expression language grows (ternary in boolean context, `&&`/`||`), keep the "no magic marker" rule: pass an explicit flag parameter instead of encoding state in the string.
- The default toolbar items depend on this evaluation for disabled/visible/active semantics — a regression here silently re-enables every button (no error, just wrong state), so the e2e disabled-state assertion is the cheap canary.
