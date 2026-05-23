# Open-Ended Adversarial Review — 2026-05-15 — Round 2

This round followed the structural-path clue left by the 2026-05-14 data-source finding. I checked whether other owner-style renderers consistently treat `statusPath` / `valuesPath` as structural owner paths or as dynamic renderer props.

## Finding 1: Renderer Owner `statusPath` Semantics Split Between Frozen Static Contract and Dynamic Prop Reality

**Where**

- `docs/architecture/field-binding-and-renderer-contract.md:343-360` says static structural fields are not runtime business values and do not support expression evaluation.
- `docs/architecture/field-binding-and-renderer-contract.md:413-423` explicitly lists `statusPath` for `page`, `form`, `dialog`, `drawer`, and `tree-renderer` as a raw-schema static field that is read once and does not support expressions.
- `packages/flux-compiler/src/schema-compiler/node-compiler.ts:295-300` compiles every `kind: 'prop'` field through `compileValue(...)`, which accepts static, template, and expression values.
- Live renderer definitions classify `statusPath` as `prop` in many owner renderers: `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:38`, `packages/flux-renderers-basic/src/basic-renderer-definitions.ts:372`, `packages/flux-renderers-data/src/data-renderer-definitions.ts:185`, `packages/flux-renderers-form/src/renderers/form-definition.ts:252`, `packages/flow-designer-renderers/src/index.tsx:224`, `packages/report-designer-renderers/src/renderers.tsx:203`, `packages/spreadsheet-renderers/src/renderers.tsx:52`, and `packages/word-editor-renderers/src/renderers.tsx:83`.
- `packages/flow-designer-renderers/src/designer-page.resolved-props.test.ts:17-45` explicitly locks in dynamic `statusPath: '${statusPath}'` resolution for `designer-page`.
- `packages/flux-react/src/status-path.ts:50-80` implements dynamic target cleanup/republish for hook-based status publication.
- `docs/analysis/2026-05-14-open-ended-adversarial-review-01/round-03.md:28-58` already reported the adjacent `data-source.name/statusPath` case, where the compiler accepts dynamic paths but runtime freezes them at registration.

**What**

The repository now has two incompatible `statusPath` contracts:

1. The frozen architecture contract says `statusPath` is a static structural path that should not be expression-capable.
2. Most live renderer definitions put `statusPath` in `props`, so schema authors can write `${statusPath}` and the React layer will resolve and often republish when it changes.

This is not just doc drift. Data-source now exhibits a different halfway behavior from hook-based renderers: data-source accepts the dynamic compiled shape but freezes it at registration, while page/tree/designer/word-style renderers accept it as a live prop and clear/republish old targets through `useStatusPathPublication(...)`. Form goes further and uses the resolved path to create a new `FormRuntime`.

**Why It Matters**

`statusPath` is an owner publication address. If one owner treats it as static identity, another treats it as a live routing prop, and the docs promise the static version, schema authors cannot predict whether `${tenant}.status` is invalid, frozen on first render, or live-rerouted with cleanup.

This also weakens future validation. A schema-file validator that follows the frozen contract would reject schemas that existing tests currently bless. A validator that follows live renderer metadata would need to update the owner docs and explicitly define dynamic rerouting behavior for every owner family, including cleanup and lifecycle side effects.

**Confidence**: High.

## Finding 2: Dynamic `form.statusPath` / `valuesPath` Can Replace the Form Runtime Without Disposing the Old One

**Where**

- `packages/flux-renderers-form/src/renderers/form-definition.ts:80-90` defines `statusPath` and `valuesPath` as path-like form owner publication props.
- `packages/flux-renderers-form/src/renderers/form-definition.ts:252-253` classifies both fields as `kind: 'prop'`, so they are runtime-resolved through `compileValue(...)`.
- `packages/flux-renderers-form/src/renderers/form.tsx:146-177` includes resolved `statusPath` and `valuesPath` in the `useMemo(...)` dependency list that creates `ownedForm = runtime.createFormRuntime(...)`.
- `packages/flux-runtime/src/runtime-owned-factories.ts:265-287` adds every created form runtime to `ownedFormRuntimes`.
- `packages/flux-renderers-form/src/renderers/form.tsx:213-282` and `:352-360` clean up lifecycle handlers and component registration for the current `ownedForm`, but there is no effect cleanup that calls `ownedForm.dispose()` when `ownedForm` is replaced or when the FormRenderer unmounts.
- `packages/flux-runtime/src/form-runtime.ts:234-282` makes external publication cleanup depend on `formRuntime.dispose()` calling `clearExternalPublication`.
- `packages/flux-runtime/src/form-runtime.ts:370-372` does clear `statusPath` / `valuesPath`, but only when the old form runtime is actually disposed.
- `packages/flux-runtime/src/runtime-factory.ts:510-517` disposes tracked form runtimes only during whole-runtime teardown, not when a renderer-local form runtime is replaced by a new one.

**What**

Because `statusPath` and `valuesPath` are dynamic props, a scope change can change their resolved strings. The FormRenderer then creates a new `FormRuntime` because those strings are dependencies of the `useMemo(...)` that owns `runtime.createFormRuntime(...)`.

The old form runtime is not disposed at replacement time. That leaves its external publication subscription active, so the old form can keep publishing status/value snapshots to the old parent-scope paths until the entire renderer runtime is disposed. Its validation owner state also remains tracked in `ownedFormRuntimes` but no longer corresponds to the currently rendered form.

This is a sharper failure mode than the older generic “FormRenderer creates FormRuntime but no unmount dispose” finding: dynamic path props make the leak possible while the same renderer instance stays mounted, and the user-visible symptom is stale external publication at the previous `statusPath` / `valuesPath`, not only eventual teardown leakage.

**Why It Matters**

External publication paths are often consumed by sibling renderers, submit buttons, debuggers, or host status panels. If `valuesPath: 'forms.${activeId}'` changes from `forms.a` to `forms.b`, the author expects ownership to move. Instead, the old owner can leave `forms.a` populated and subscribed while the new owner publishes to `forms.b`. That makes it look like two forms are alive, with one of them hidden and stale.

There are two viable design directions, but the current hybrid supports neither safely:

1. Treat `statusPath` / `valuesPath` as structural fields and reject expressions before they can replace owner runtimes.
2. Support dynamic rerouting explicitly, but dispose the old form runtime on replacement and document that changing publication paths recreates the form owner, clears old paths, resets lifecycle handlers, and may reset form state.

**Confidence**: High.

## Round Summary

The project has an unclosed structural-path migration. `statusPath` was documented as structural and static, then many renderers moved it into resolved props for convenience. That is survivable only if all owner families adopt the same dynamic-routing semantics. Today they do not: data-source freezes, hook-based renderers republish, and form recreates an owner without disposing the previous one.

## Blind-Spot Self-Assessment

I did not inspect every `statusPath` renderer implementation for cleanup quality. The form case is the strongest because the old `FormRuntime` owns a store subscription and explicit publication cleanup that depends on `dispose()`. A next pass could check dialog/drawer structural paths and component identity fields such as `componentId` for the same `prop` versus structural split.
