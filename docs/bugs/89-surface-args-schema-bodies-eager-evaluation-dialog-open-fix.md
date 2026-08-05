# 89 Surface-Args Schema Bodies Eagerly Evaluated - Dialog Open Silent Failure Fix

## Symptom

`openDialog` (and `openDrawer`) with a dialog body whose nested event action
args use **member-access templates** (`${item.label}`) silently failed to open
the surface. No console error, no action error, zero dialogs — the surface
simply never appeared. Bare-key templates (`${index}`, `${toolStatus}`) worked
(they resolve to `undefined` instead of throwing).

## Reproduction

C8.3 Phase 3 host scenario (bug 73 pattern) `host-prompts-dlg`:

```ts
onClick: {
  action: 'openDialog',
  args: {
    title: 'Prompts host',
    body: {
      type: 'page',
      body: [
        {
          type: 'ai-prompts',
          onSelect: { action: 'probe:prompt', args: { value: '${item.label}|${index}' } },
        },
      ],
    },
  },
}
```

Clicking the button did nothing. Bisect narrowed the trigger to exactly the
`${item.label}` (dotted) template inside the dialog-body event args — the same
body with a static value, or `${index}` only, opened fine.

## Root Cause

Two layers conspired:

1. **`flux-compiler` `action-compiler.ts` `compilePayload`** compiled the whole
   `args` tree with the generic value compiler (`compileValue`). `compileNode`
   (`flux-formula/src/compile/compile-node.ts`) descends into EVERY plain
   object — including schema-valued args like the dialog `body` — and compiles
   any `${...}` string as a template/expression node.

2. **`flux-action-core` `built-in-actions.ts` `evaluateSurfaceArgs`** evaluates
   the compiled args eagerly at dispatch time (`evaluateActionArgs`), and only
   THEN overwrites schema args with the raw source value (the `isSchema`
   preservation loop at `built-in-actions.ts:54-58`). The eager evaluation of
   the body subtree is therefore always-discarded work — but a dotted template
   like `${item.label}` throws `TypeError: Cannot read properties of undefined`
   (`item` is not in the dispatch scope) before the preservation loop runs, so
   the whole `openDialog` action fails silently.

The dispatcher-side contract test (`built-in-surface-args-preservation.test.ts`)
models the compiled args with `body: { kind: 'static-node' }` — the intended
fulfillment-boundary design (option ①) — but the REAL compiler never produced a
static node for schema args, so the eager evaluation could throw.

## Fix

`flux-compiler` `action-compiler.ts`: `compilePayload` now runs schema-valued
top-level args (`isSchemaInput` — matches the dispatcher's `isSchema` check)
through the existing `__nopPreserveLiteral` envelope before `compileValue`, so
they compile to `static-node` and the eager surface-args evaluation never
touches nested event templates. The templates stay raw and are evaluated
lazily in the surface scope at event-dispatch time (where `item`/`index` exist
via the dispatch ctx).

Behavior change is strictly narrowing: schema args were ALWAYS overwritten with
the raw source at dispatch, so their eager evaluation was dead work that could
only throw.

## Tests

- `packages/flux-compiler/src/action-compiler.test.ts` — new test
  "preserves schema-valued args (openDialog body) as static, keeping nested
  event templates raw": asserts `args.node.entries.body.kind === 'static-node'`
  with the raw body, while ordinary args (`title`) stay dynamic. Red before the
  fix (body compiled to object-node).
- `tests/e2e/component-lab/c8-3-host-surfaces.spec.ts` `host-prompts-dlg` —
  real-browser proof: ai-prompts inside an openDialog, clicking a prompt item
  resolves `${item.label}|${index}` = `Translate|1` through the dispatch ctx.

## Scope

Public layer (`flux-compiler` action args). Affects any renderer whose event
args use member-access templates inside an `openDialog`/`openDrawer` body —
previously a silent open-failure. Cross-package root cause → roadmap CX-11
(inserted per roadmap §7, fixed in-plan C8.3).
