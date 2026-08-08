# 90 Designer Toolbar Stale Disabled State - Template Not Re-Resolved Fix

## Symptom

In the flow designer, the toolbar buttons driven by snapshot templates
(`${!canUndo}` on 撤销/Undo, `${!canRedo}` on 重做/Redo, `${!isDirty}` on
保存/Save, `${isDirty ? ...}` badges) never updated after the first render:
deleting a node left 撤销 disabled, the dirty badge stuck at 已保存, and 保存
disabled — even though the designer core correctly pushed history and marked
the document dirty (verified via the JSON export dialog and inspector counts).

## Reproduction

`/#/flow-designer` (playground workflow example): click a node → press Delete
→ node count drops 6→5 and core history/canUndo are true, but the toolbar
撤销/重做/保存 buttons keep their initial disabled state. No console errors.

## Root Cause

Two layers conspired:

1. `DesignerToolbarContent` (designer-toolbar.tsx) derived its rendered item list
   inside a `useMemo` whose deps were `[config.toolbar?.items, resolveToolbarValue,
props.readOnly]`. `resolveToolbarValue` is a `useCallback` over
   `[runtime, scope]` where `scope` is the designer host ScopeRef — the ScopeRef
   identity is stable across snapshot changes (the underlying scope data is
   replaced in place via `useHostScope`). So the memoized `items` array was never
   recomputed when the designer snapshot changed: every `${...}` template in
   `disabled`/`active`/`body`/`text`/`level` was resolved exactly once, at first
   render, and then frozen.

2. **Latent StrictMode scope disposal (flux-react + flux-runtime)**: in StrictMode
   the playground double-mounts, so `useHostScope`'s simulated unmount disposes
   the current scope while the store still references it; the recreation guard
   only checked `parent`/`id` prefix and kept the DISPOSED scope. Any later
   `materializeVisible()` on it returns `{}` — which is why naively removing the
   toolbar's memo (re-resolving on every render) crashed the page with
   `Expression evaluation failed for: ${doc.name}`. The stale memo had been
   masking the disposed scope all along.

The snapshot subscription (`useDesignerSnapshotSelector`) was present and
re-rendered the component, but re-rendering with the same memo deps returned
the stale cached items — a classic "memoized derivation misses reactive input"
bug. Note that static (`disabled: false`) items and the e2e delete path via
the node toolbar worked, which is why the defect was invisible to earlier e2e
scenarios that never asserted toolbar state after a mutation.

## Fix

- `designer-toolbar.tsx`: removed the `useMemo` wrapper; the items list is now
  derived inline on every render (`const items = (() => { ... })()`), so
  `resolveToolbarValue` runs against the live scope each time the component
  re-renders from the snapshot subscription. No memo-level caching of
  template-resolved values remains.
- `flux-react/src/workbench/hooks.ts` + `flux-runtime/src/runtime-host-projection-scope.ts`:
  `useHostScope`'s guard now also recreates the scope when the current one was
  disposed (`__fdDisposed__` marker set by `createHostProjectionScope.dispose()`).
  Without this, re-resolving against the disposed scope crashes. This is a
  host-family-wide fix (spreadsheet/report/word-editor all consume `useHostScope`).

## Tests

- Test-first regression: `designer-controls.test.tsx`
  `re-resolves toolbar button disabled templates when the snapshot changes`
  — renders the toolbar with `disabled: '${!canUndo}'` / `'${!canRedo}'`,
  asserts both buttons disabled with `canUndo: false`, then mutates the
  snapshot to `canUndo: true` and re-renders, asserting both enabled. Red
  before the fix (stale disabled stayed `true`), green after.
- The mock `evaluate` in designer-controls.test.tsx was extended to resolve a
  single `${expr}` template to its raw value (boolean) — mirroring the real
  expression compiler, needed to make the re-resolution assertion meaningful.
- Package suite: flow-designer-renderers 35 files / 241 tests green;
  flux-react + flux-runtime suites green after the `useHostScope` guard fix.
- e2e `flow-designer-undo-clipboard.spec.ts` (new, Phase 5) asserts undo/redo
  availability through the toolbar after Delete/Ctrl+Z/Ctrl+Y in a real
  browser, and the page loads without `Expression evaluation failed`
  console errors after the disposed-scope fix.
