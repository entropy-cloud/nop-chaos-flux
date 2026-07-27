# MA6 Phase 1 — Core Architecture Docs Audit

**Date**: 2026-07-27
**Scope**: 7 core architecture documents verified against live codebase
**Method**: Doc claims extracted → source grep/read → cross-reference

---

## Document: `docs/architecture/flux-core.md`

### Finding F1: ScopeRef interface missing `isolate` field

- **Severity**: P2
- **Location**: `docs/architecture/flux-core.md:317-347` and `packages/flux-core/src/types/scope.ts:33-48`
- **Category**: inaccurate-type
- **Doc claim**: The `ScopeRef` interface is printed without an `isolate` property.
- **Code reality**: The actual `ScopeRef` interface at `scope.ts:37` includes `isolate?: boolean`. This field is part of the active runtime contract — `CreateScopeOptions.isolate` controls scope isolation, and `ScopeRef.isolate` records it on the created scope.
- **Fix direction**: Add `isolate?: boolean` to the printed interface in the doc.

### Finding F2: `CompiledValueNode` template-node variant uses wrong compiled type name

- **Severity**: P2
- **Location**: `docs/architecture/flux-core.md:86-87` and `packages/flux-core/src/types/compiled-value-types.ts:44-47`
- **Category**: inaccurate-type
- **Doc claim**: The `template-node` variant has `compiled: CompiledTemplate<T>`.
- **Code reality**: The actual type is `compiled: CompiledStringTemplate<T>` (`compiled-value-types.ts:47`). `CompiledTemplate` (defined at `node-identity.ts:208`) is a completely different type — the top-level compiled schema container with `root` and `repeatedTemplates`. The doc has confused two unrelated types.
- **Fix direction**: Change `CompiledTemplate<T>` to `CompiledStringTemplate<T>` in the doc.

### Finding F3: `parsePath` caching described as "LRU" but is actually FIFO-like

- **Severity**: P3
- **Location**: `docs/architecture/flux-core.md:459` and `packages/flux-core/src/utils/path.ts:5-23`
- **Category**: inaccurate-type
- **Doc claim**: "Results are LRU-cached (max 1000 entries)."
- **Code reality**: The cache uses a `Map` with max 1000 entries, but eviction deletes `keys().next().value` — the first-inserted entry, not the least-recently-used. Cache hits (`Map.get`) do not re-order the entry; only `rememberParsedPath` (called on successful new/re-parse) does (via `delete` + `set`). This means entries that are frequently read via cache hits but never re-parsed will still be evicted first. The behavior is closer to a FIFO with write-side re-insertion than LRU.
- **Fix direction**: Either correct the doc to "FIFO-cached with map-based reordering" or upgrade the implementation to true LRU by reordering on get.

### Finding F4: `CompiledSchemaNode` elimination — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-core.md:363-372`
- **Category**: owner-doc-drift (negative — doc is correct)
- **Doc claim**: `CompiledSchemaNode` has been fully eliminated. The compiler directly produces `TemplateNode`.
- **Code reality**: Zero references to `CompiledSchemaNode` in `packages/flux-core/src/`. Confirmed eliminated.
- **Fix direction**: None needed.

### Finding F5: `read()` removed from ScopeRef — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-core.md:120`
- **Doc claim**: "`read()` has been removed. All callers use either `readVisible()` or `materializeVisible()`."
- **Code reality**: No `read()` method on `ScopeRef` at `scope.ts:33-48`. Only `readVisible()`, `materializeVisible()`, and `readOwn()` exist.
- **Fix direction**: None needed.

### Finding F6: `i18n-sink.ts` as only stateful module — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-core.md:38`
- **Code reality**: Module exists at `packages/flux-core/src/i18n-sink.ts`, exports `setMessageFormatter` / `getMessageFormatter` (mutable singleton), and is explicitly documented as the only stateful module.
- **Fix direction**: None needed.

### Finding F7: Shared utility functions exist as claimed — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-core.md:459-464`
- **Code reality**: `parsePath` at `path.ts:26`, `getIn` at `path.ts:175`, `setIn` at `path.ts:192`, `resolveRelativePath` at `path.ts:147`, `normalizeRootPath` at `path.ts:111`, `normalizeRootPaths` at `path.ts:125`, `createPathBinding` at `path-binding.ts:14`. All confirmed.
- **Fix direction**: None needed.

---

## Document: `docs/architecture/flux-runtime-module-boundaries.md`

### Finding F8: `@nop-chaos/flux` facade package entry point references verified — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-runtime-module-boundaries.md:450-465`
- **Doc claim**: `@nop-chaos/flux` is the supported host-facing facade. Hosts should create renderer registry through `createFluxRendererRegistry()` or `createFluxSchemaRenderer()` and import CSS through `@nop-chaos/flux/style.css`.
- **Code reality**: Package directory is `packages/flux-bundle/` with `name: "@nop-chaos/flux"` in `package.json`. `style.css` exists at `packages/flux-bundle/src/style.css` and has the `.nop-flux-root` CSS root. The package name reference is correct, though the directory layout (`flux-bundle/` vs `flux/`) could confuse future maintainers.
- **Fix direction**: Docs are correct. Consider adding a note about the directory layout.

### Finding F9: `createReadonlyScopeBinding` export chain — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/flux-runtime-module-boundaries.md:473`
- **Doc claim**: Reachable from `@nop-chaos/flux-runtime` root, `@nop-chaos/flux-react` root, and `@nop-chaos/flux-react/unstable`.
- **Code reality**: Confirmed via `public-surface.test.ts` that tests `fluxReact.createReadonlyScopeBinding` exists.
- **Fix direction**: None needed.

---

## Document: `docs/architecture/renderer-runtime.md`

### Finding F10: `TemplateNode.component` type is `CompiledRendererContract`, not `RendererDefinition`

- **Severity**: P2
- **Location**: `docs/architecture/renderer-runtime.md:69` (and `:228-229`) vs `packages/flux-core/src/types/node-identity.ts:140`
- **Category**: inaccurate-type
- **Doc claim**: "`TemplateNode.component` carries the resolved `RendererDefinition` directly from compile time."
- **Code reality**: `TemplateNode.component` is typed as `CompiledRendererContract<S>` at `node-identity.ts:140`. `CompiledRendererContract` (defined at `compiled-renderer-contract.ts:5`) is a **compile-time subset** of `RendererDefinition` — it carries `type`, `component?`, `scopePolicy`, `actionScopePolicy`, `componentRegistryPolicy`, `fields`, `validation` (compact form), `validationDefaults`, `compilation`, `wrap`, `frameRootTag`, and `staticCapable`. The full `RendererDefinition` (with `validation` contributor functions, `rendererClass`, `rendererTraits`, `propContracts`, `eventContracts`, `componentCapabilityContracts`, `scopeExportContracts`, etc.) is **not** the same type.
- **Fix direction**: Replace "`RendererDefinition`" with "`CompiledRendererContract` (a compile-time subset of `RendererDefinition`)" and note which fields are preserved vs dropped.

### Finding F11: `ReactionHandle.dispatch` parameter type mismatch

- **Severity**: P2
- **Location**: `docs/architecture/renderer-runtime.md:763` vs `packages/flux-core/src/types/renderer-core.ts:218-221`
- **Category**: inaccurate-type
- **Doc claim**: `dispatch(ctx?: Partial<ActionContext>): Promise<ActionResult>`
- **Code reality**: `dispatch(ctx?: { signal?: AbortSignal; evaluationBindings?: Record<string, unknown>; }): Promise<ActionResult>` — the parameter is NOT `Partial<ActionContext>` but a narrower object with explicit `signal` and `evaluationBindings` fields. This matters because renderers cannot pass arbitrary `ActionContext` fields; only `signal` and `evaluationBindings` are accepted.
- **Fix direction**: Correct the doc signature to match the actual typed interface.

### Finding F12: `ReactionHandleDebugState` interface matches — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-runtime.md:773-780` vs `packages/flux-core/src/types/renderer-core.ts:188+`
- **Code reality**: The doc's `phase: 'initial-paused' | 'ready' | 'explicit-paused' | 'disposed'` matches the actual interface.
- **Fix direction**: None needed.

### Finding F13: Hooks list comprehensive — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-runtime.md:822-882`
- **Doc claim**: Full list of exported hooks with signatures.
- **Code reality**: All 24+ hooks match the actual exports in `packages/flux-react/src/hooks.ts` and `context-hooks.ts`. Signatures match closely.
- **Fix direction**: None needed.

### Finding F14: `RendererComponentProps` interface — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-runtime.md:193-219` vs `packages/flux-core/src/types/renderer-core.ts:252-274`
- **Code reality**: The doc's interface matches the code. All 12 fields (`id`, `path`, `schema`, `templateNode`, `node`, `props`, `meta`, `regions`, `events`, `reactions`, `helpers`) are present with matching types.
- **Fix direction**: None needed.

### Finding F15: `BaseSchema` lifecycle actions `onMount`/`onUnmount` — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-runtime.md:798-801` vs `packages/flux-core/src/types/schema.ts:103-104`
- **Code reality**: Both `onMount?: ActionSchemaLike | ActionSchemaLike[]` and `onUnmount?: ActionSchemaLike | ActionSchemaLike[]` exist on `BaseSchema`.
- **Fix direction**: None needed.

---

## Document: `docs/architecture/styling-system.md`

### Finding F16: `resolveGap` function location — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:653-663` vs `packages/flux-react/src/resolve-gap.ts:10-19`
- **Code reality**: Function exists at the exact claimed location with matching signature.
- **Fix direction**: None needed.

### Finding F17: Gap token mapping — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:652-663` vs `packages/flux-react/src/resolve-gap.ts:1-8`
- **Code reality**: All 6 tokens match exactly: `none->gap-0`, `xs->gap-1`, `sm->gap-2`, `md->gap-4`, `lg->gap-6`, `xl->gap-8`.
- **Fix direction**: None needed.

### Finding F18: `classAliases` ownership split — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:376-381`
- **Doc claim**: `resolveClassAliases` and `mergeClassAliases` in `flux-core`; `NodeRenderer` derives merged alias map, publishes through `ClassAliasesContext`.
- **Code reality**: Functions at `packages/flux-core/src/class-aliases.ts:1/34`. Context at `packages/flux-react/src/contexts.ts:47`. Provider in `node-renderer-providers.tsx:68`. Consumer in `node-renderer-resolved.tsx:68,457`.
- **Fix direction**: None needed.

### Finding F19: Container renderer emits only marker class — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:618-639` vs `packages/flux-renderers-basic/src/container.tsx:42`
- **Code reality**: Outer `<div>` has `cn('nop-container', props.meta.className)` — only the marker class plus user-provided className. No hardcoded layout. Semantic props create a flex inner `<div>` only when present.
- **Fix direction**: None needed.

### Finding F20: `default-spacing.css` location — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:417`
- **Code reality**: File exists at `packages/flux-react/src/default-spacing.css` with `@layer base` rules for `nop-flex`, `nop-page`, `nop-form`, `nop-fieldset`, `nop-field`, etc.
- **Fix direction**: None needed.

### Finding F21: `frameRootTag` type allows `'div' | 'label'`, not just `'div'`

- **Severity**: P3
- **Location**: `docs/architecture/styling-system.md:351-359` vs `packages/flux-core/src/types/renderer-definition-types.ts:136`
- **Category**: inaccurate-type
- **Doc claim**: `frameRootTag` is described as `'div'` — the section lists `frameRootTag: 'div'` as the value for wrapped composite controls.
- **Code reality**: The actual type is `frameRootTag?: 'div' | 'label'` at `renderer-definition-types.ts:136`. The doc only mentions `'div'` as the value, omitting the `'label'` option.
- **Fix direction**: Update the description to mention both `'div'` and `'label'` as valid values, noting that `'label'` is the default (semantic root for form fields).

### Finding F22: Spreadsheet canvas CSS hybrid strategy doc reference — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:777-779`
- **Code reality**: `docs/architecture/report-designer/spreadsheet-canvas-css.md` exists. `packages/spreadsheet-renderers/src/canvas-styles.css` exists.
- **Fix direction**: None needed.

### Finding F23: No `@apply` in copy-assembled CSS — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/styling-system.md:793`
- **Code reality**: Doc claims zero `@apply` across entire monorepo (audited 2026-07-23). Quick check: no `@apply` found in `flux-renderers-scheduling/src/*.css`.
- **Fix direction**: None needed.

---

## Document: `docs/architecture/theme-compatibility.md`

### Finding F24: `.nop-theme-root` CSS defined only in playground, not in any reusable package

- **Severity**: P2
- **Location**: `docs/architecture/theme-compatibility.md:72-88`
- **Category**: outdated-reference / owner-doc-drift
- **Doc claim**: `.nop-theme-root` is "the canonical shared theme scope for the project" that should define "default project-wide visual tokens" and allow hosts to "scope host overrides to a mounted subtree." It describes a shared token contract across all packages.
- **Code reality**: `.nop-theme-root` CSS is defined ONLY in `apps/playground/src/styles.css:73`. No reusable package (`@nop-chaos/flux`, `@nop-chaos/flux-react`, `@nop-chaos/theme-tokens`, `@nop-chaos/ui`) defines or exports `.nop-theme-root` CSS. The tests in `packages/word-editor-renderers/src/styles.test.ts:7-9` and `packages/nop-debugger/src/panel/styles.test.ts:6` explicitly assert that packages should NOT publish to `.nop-theme-root`. The contract exists only in the playground app and has no package-level enforcement or default publication.
- **Fix direction**: Either publish `.nop-theme-root` as a stable token root from `@nop-chaos/theme-tokens` or `@nop-chaos/flux/style.css`, or update the doc to clarify that it's a host-side convention (defined by the playground as an example) rather than a package-owned contract.

### Finding F25: `.nop-flux-root` CSS — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/theme-compatibility.md:57-69`
- **Code reality**: Defined at `packages/flux-bundle/src/style.css:6-8` with `display: contents`. The doc accurately describes its responsibility as CSS isolation root for the host-facing facade.
- **Fix direction**: None needed.

### Finding F26: `.fd-theme-root` — no CSS definition found in any package

- **Severity**: P3
- **Location**: `docs/architecture/theme-compatibility.md:90-103`
- **Category**: outdated-reference
- **Doc claim**: `.fd-theme-root` is an optional Flow Designer specialization marker. "Flow Designer package CSS reads `--fd-*` tokens with fallback values at each usage site."
- **Code reality**: No `.fd-theme-root` CSS rule found in any package CSS file. The doc itself says `fd-theme-root` is "no longer the owner of default `--fd-*` token publication" and that "package defaults do not re-publish those tokens on `.fd-theme-root` or `.nop-designer`." The doc describes a former convention that's been sunset — but still devotes significant space to it, which could confuse readers about whether it's still an active contract.
- **Fix direction**: Either add a "(historical)" annotation or remove the deprecated `.fd-theme-root` section and keep only the current baseline (fallback reads at usage sites).

---

## Document: `docs/architecture/renderer-markers-and-selectors.md`

### Finding F27: `data-field-dirty`, `data-field-invalid`, `data-field-touched`, `data-field-visited` usage — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-markers-and-selectors.md:142-146` vs `packages/flux-react/src/field-frame.tsx:227-230`
- **Code reality**: All four state attributes are emitted as presence-only markers (`data-field-dirty={fieldState.dirty ? '' : undefined}`). Matches the doc's assertion that "state attributes in this project are generally presence-only."
- **Fix direction**: None needed.

### Finding F28: `nop-field` marker for FieldFrame — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-markers-and-selectors.md:83,88` vs `packages/flux-react/src/default-spacing.css:81+`
- **Code reality**: `nop-field` is used in `default-spacing.css` for field chrome styling, and referenced by tests. The doc correctly states it's a root semantic marker.
- **Fix direction**: None needed.

### Finding F29: `data-slot` used for internal regions — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-markers-and-selectors.md:122-134`
- **Code reality**: `data-slot="container-body"` in `container.tsx:53`, `data-slot="container-header"` at `:47`, `data-slot="container-footer"` at `:78`. Page/field/form slots similarly confirmed.
- **Fix direction**: None needed.

### Finding F30: No BEM modifier classes — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/renderer-markers-and-selectors.md:130-134,148-154`
- **Code reality**: No `nop-page__header`, `nop-field--dirty` etc. found in renderer packages. Confirmed.
- **Fix direction**: None needed.

---

## Document: `docs/architecture/layout-selection-guide.md`

### Finding F31: Layout marker classes — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/layout-selection-guide.md:10-15`
- **Code reality**: `nop-page` (page), `nop-container` (container), `nop-flex` (flex), `nop-tabs` (tabs), `nop-grid` (grid), `nop-collapse` (collapse) all confirmed in code.
- **Fix direction**: None needed.

### Finding F32: Container vs flex `className` routing — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/layout-selection-guide.md:496-514`
- **Code reality**: Container's `className` goes on outer `<div>` with `nop-container` (container.tsx:42), not on the body flex container. Flex's `className` goes on the root `<div>` with `nop-flex` (flex.tsx:70). Matches the doc.
- **Fix direction**: None needed.

### Finding F33: Flex semantic props — CONFIRMED CORRECT

- **Severity**: N/A
- **Location**: `docs/architecture/layout-selection-guide.md:215-226`
- **Code reality**: Flex renderer supports `direction` (including `row-reverse`, `column-reverse`), `wrap`, `align` (including `baseline`), `justify` (including `evenly`, `between`, `around`), `alignContent` (including `evenly`, `between`, `around`, `stretch`), `gap`, `responsiveDirection`, `responsiveWrap` — all confirmed in `flex.tsx:40-66`. The doc examples show the core set accurately.
- **Fix direction**: None needed.

---

## Summary

| #   | Doc                    | Severity | Category           | Finding                                                                                         |
| --- | ---------------------- | -------- | ------------------ | ----------------------------------------------------------------------------------------------- |
| F1  | flux-core.md           | P2       | inaccurate-type    | ScopeRef missing `isolate` field from printed interface                                         |
| F2  | flux-core.md           | P2       | inaccurate-type    | CompiledValueNode template-node uses `CompiledTemplate` instead of `CompiledStringTemplate`     |
| F3  | flux-core.md           | P3       | inaccurate-type    | parsePath cache described as LRU but is FIFO-like                                               |
| F10 | renderer-runtime.md    | P2       | inaccurate-type    | TemplateNode.component is `CompiledRendererContract`, not `RendererDefinition`                  |
| F11 | renderer-runtime.md    | P2       | inaccurate-type    | ReactionHandle.dispatch param is `{signal?, evaluationBindings?}`, not `Partial<ActionContext>` |
| F21 | styling-system.md      | P3       | inaccurate-type    | frameRootTag type is `'div' \| 'label'`, doc implies only `'div'`                               |
| F24 | theme-compatibility.md | P2       | outdated-reference | `.nop-theme-root` CSS exists only in playground, not in any reusable package                    |
| F26 | theme-compatibility.md | P3       | outdated-reference | `.fd-theme-root` has no CSS definition; section describes deprecated/sunset convention          |

**P2 issues to fix**: 5 (F1, F2, F10, F11, F24)
**P3 issues to fix**: 3 (F3, F21, F26)
**Confirmed correct claims**: 25+

Recommend focusing on P2 fixes: interface corrections in flux-core.md and renderer-runtime.md, and the `.nop-theme-root` ownership clarification.
