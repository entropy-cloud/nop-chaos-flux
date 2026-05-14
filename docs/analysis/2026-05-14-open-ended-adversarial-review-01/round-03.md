# Open-Ended Adversarial Review — 2026-05-14 — Round 3

This round followed two boundary smells that surfaced while checking exported designer/editor primitives: global keyboard listeners that bypass the owning widget's focus boundary, and source-owner path fields that are compiled like runtime values even though publication ownership treats paths as structural identity.

## Finding 1: Spreadsheet Keyboard Shortcuts Are Global to `window`, Not Scoped to the Owning Grid Instance

**Where**

- `packages/spreadsheet-renderers/src/spreadsheet-interactions/use-keyboard.ts:21-65` installs a `window` `keydown` listener and only skips `HTMLInputElement` / `HTMLTextAreaElement` targets.
- `packages/spreadsheet-renderers/src/use-spreadsheet-interactions.ts:287-299` calls `useKeyboard(...)` without passing a grid/root ref or focus/active-instance signal.
- `packages/spreadsheet-renderers/src/spreadsheet-grid.tsx:390-443` already has a focusable grid-level `onKeyDown` path for navigation/edit start, so the missing scope is specifically in the command shortcuts layer.
- `packages/flow-designer-renderers/src/use-designer-shortcuts.ts:31-41` shows the safer local pattern: skip editable targets and ignore key events whose target is outside the owning designer root.

**What**

Once a spreadsheet instance has a selected cell, its shortcut hook reacts to document-level `Ctrl/Cmd+C`, `Ctrl/Cmd+X`, `Ctrl/Cmd+V`, `Ctrl/Cmd+Z`, `Ctrl/Cmd+Y`, style shortcuts, `Ctrl/Cmd+F`, `Delete`, `Backspace`, and `Escape` even when focus is elsewhere on the page. The listener does not verify that the event target is inside this spreadsheet, that the grid is focused, or that this instance is the active spreadsheet among multiple mounted editors.

This is not just a cosmetic keyboard issue. The handler calls mutating bridge commands such as cut, paste, redo/undo, style changes, clear, and find/replace toggling. If two spreadsheet/report-designer bodies are mounted, both can process the same global shortcut if each has selection state.

**Why It Matters**

Spreadsheet and Report Designer are domain host owners; their command streams need instance isolation. A user pressing `Delete` while interacting with a toolbar, side panel, another canvas, or a sibling spreadsheet can clear the last selected cell in a hidden or unfocused sheet. A user pressing `Ctrl+Z` outside the spreadsheet can roll back spreadsheet history instead of the currently focused owner. This also compounds the readonly/UI leak from round 1: even after visible affordances are gated, the global shortcut path can remain an invisible mutation surface unless it is scoped independently.

The root cause is that spreadsheet shortcuts are modeled as document-global commands rather than root-scoped owner interactions. Flow Designer already carries the appropriate root-ref containment guard, so this is a concrete cross-owner consistency gap rather than an unknown design question.

**Confidence**: High.

## Finding 2: `data-source.name` / `statusPath` Are Compiled as Runtime Values, but Runtime Freezes Their Publication Paths at Registration

**Where**

- `packages/flux-core/src/types/schema.ts:167-177` types `BaseDataSourceSchema.name` and `statusPath` as plain `string` authoring fields.
- `packages/flux-compiler/src/source-compiler.ts:60-64` compiles `schema.name` with `compiler.compileValue<string>(...)` into `compiled.targetPath`.
- `packages/flux-compiler/src/source-compiler.ts:131-135` does the same for `schema.statusPath`.
- `packages/flux-core/src/types/compilation.ts:303-325` exposes both as `CompiledRuntimeValue<string>`, which can be static, template, or expression-backed.
- `packages/flux-runtime/src/async-data/source-registry.ts:121-135` evaluates both compiled values exactly once during `registerDataSource(...)`.
- `packages/flux-runtime/src/async-data/source-registry.ts:192-196` builds the ignored dependency roots from those one-time values.
- `packages/flux-runtime/src/async-data/source-registry.ts:268-307` only indexes a source by `name` when the compiled target path is static.
- `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:53-92` and `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:81-142` publish status/data through the frozen `input.statusPath` / `input.targetPath` captured at controller creation.
- `docs/architecture/form-external-publication-and-reserved-bindings.md:264-267` describes `data-source.name` as the main value publication path and `statusPath` as the readonly summary publication path.
- `docs/architecture/field-binding-and-renderer-contract.md:419` says structural `statusPath` fields are read once and do not support expressions, but data-source compilation currently does not enforce that structural contract.

**What**

The compiler tells one story and the runtime tells another. Because `name` and `statusPath` go through generic `compileValue<string>`, schema authors can write expression/template-looking paths such as `"${activeTab}.users"` or `"status.${tenantId}"` and receive a dynamic `CompiledRuntimeValue`. Runtime registration then evaluates those values once, constructs the controller and dependency-ignore set around that initial result, and never reevaluates the publication paths when the referenced scope values change.

This creates two bad modes:

- If dynamic paths are supposed to be legal, the data source publishes later refreshes to the wrong old target/status path after the routing key changes. Its ignored-roots filter also keeps ignoring the old target/status roots, so self-write suppression can be stale.
- If dynamic paths are not supposed to be legal, validation/compilation should reject them as structural fields. Today the compiler accepts them, but the registry only partially admits this by refusing to add a dynamic target path to `nameIndex`.

**Why It Matters**

`data-source` is a non-rendering owner whose main observable contract is publication into scope. A stale publication path means downstream renderers can show tenant A's fetched data under tenant B's UI state, or status summaries can keep updating a status slot that no longer corresponds to the visible source owner. This is also hard to debug because the source refresh itself can be healthy; only the owner identity/path has drifted.

The root issue is an unclosed contract boundary around structural paths. Other owner docs already describe `statusPath` as a read-once structural configuration field. Data-source should either follow that rule by validating `name` / `statusPath` as literal paths, or explicitly model dynamic path changes as owner re-registration with cleanup of old publications, ignored roots, and name indexing. The current halfway state gives authors dynamic syntax without dynamic ownership semantics.

**Confidence**: High.

## Round Summary

The common theme is owner-boundary leakage. Spreadsheet commands escape their widget/root boundary into document-global keyboard handling, while data-source publication paths escape the structural-owner contract through generic runtime-value compilation. Both issues can remain invisible in single-instance happy-path tests but become dangerous once multiple hosts, tabs, tenants, or embedded editors coexist.

## Blind-Spot Self-Assessment

I did not run browser repros for multi-spreadsheet shortcut collisions, and I did not build a schema fixture for dynamic data-source paths. I also intentionally did not re-report the fixed-key Word Editor localStorage collision or production test hooks because prior analysis/logs already covered or explicitly accepted those patterns. A useful next round would inspect other domain hosts for global event listeners or structural path fields that still use generic `compileValue`.
