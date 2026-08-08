# 91 PasteClipboard Command Gap - Designer Adapter Silent Unavailable Fix

## Symptom

In the flow designer, Ctrl+C (copy) worked but Ctrl+V (paste) silently did
nothing: the node count never changed and no error surfaced in the UI. Only a
programmatic result inspection showed `{ ok: false, error: "Unsupported
command: pasteClipboard", reason: "unavailable" }`.

## Reproduction

`/#/flow-designer` (playground workflow example): click a node → Ctrl+C →
Ctrl+V → node count stays 6. The copy actually succeeds (clipboard is
populated — copySelection ok), but paste always fails.

## Root Cause

`pasteClipboard` was declared in three places but the command adapter's
`execute` switch never handled it:

- `designer-command-adapter.ts:40` — `GRAPH_ONLY_COMMANDS` includes
  `'pasteClipboard'` (so tree mode correctly rejects it as graph-only),
- `designer-manifest.ts:333-335` — the published host method contract includes
  `pasteClipboard`,
- `use-designer-shortcuts.ts` — Ctrl+V dispatches `{ type: 'pasteClipboard' }`.

But in `createDesignerCommandAdapter`'s switch, `copySelection` had a case
(`:216-218`) while `pasteClipboard` had **none** — execution fell through to
the `default` branch returning `createFailure(core, 'Unsupported command:
pasteClipboard', 'unavailable')`. The failure was routed through
`notifyCommandFailure`... but the message was the generic unsupported-command
text and the e2e never asserted paste before this audit, so the gap stayed
silent. The graph-only adapter (`designer-command-adapter-graph.ts`) also has
no `pasteClipboard` case — the gap was purely in the shared adapter switch.

## Fix

`designer-command-adapter.ts:219-221`: added

```ts
case 'pasteClipboard':
  core.pasteClipboard();
  return createSuccess(core);
```

mirroring the existing `copySelection` case. `core.pasteClipboard()` already
handles tree-mode rejection and readonly guards.

## Tests

- Test-first regression: `designer-command-adapter.test.ts`
  `copySelection then pasteClipboard duplicates the copied node in graph mode`
  — select `task-1` → execute `copySelection` (ok, 3 nodes) → execute
  `pasteClipboard` (ok, 4 nodes, new `task` node). Red before the fix
  (paste returned `ok:false`), green after.
- e2e (Phase 5): `flow-designer-undo-clipboard.spec.ts` — Ctrl+C/Ctrl+V in a
  real browser bumps the node count 6→7; paste-without-copy leaves the
  document unchanged; Delete/Ctrl+Z/Ctrl+Y round-trip is asserted too.
- Package suite: flow-designer-renderers 35 files / 241 tests green.
