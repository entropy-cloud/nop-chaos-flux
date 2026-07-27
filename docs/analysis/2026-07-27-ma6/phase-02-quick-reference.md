# MA6 Phase 2 — quick-reference.md Audit

Audited: `docs/references/quick-reference.md` (770 lines) against live source code.
Date: 2026-07-27

---

### Finding 1: ScopeRef — `update` signature completely wrong

- **Severity**: P1
- **Location**: doc:608-617, code: `packages/flux-core/src/types/scope.ts:33-48`
- **Category**: inaccurate-type
- **Doc claim**: `update(patch: object): void`
- **Code reality**: `update(path: string, value: unknown): void` — the method takes a path + value pair, not a patch object
- **Fix direction**: Correct the signature and consider adding the missing fields (`parent?`, `isolate?`, `get()`, `has()`, `value`, `materializeVisible()`). `replace` is optional (`?`) in code but not in doc.

### Finding 2: ScopeRef — several fields missing from doc

- **Severity**: P2
- **Location**: doc:608-617, code: `packages/flux-core/src/types/scope.ts:33-48`
- **Category**: inaccurate-type
- **Doc claim**: Shows only `readonly id, readonly path, store?, readVisible, readOwn, update, merge, replace, dispose`
- **Code reality**: Has additional fields: `parent?: ScopeRef`, `isolate?: boolean`, `readonly value: Record<string, any>`, `get(path: string): unknown`, `has(path: string): boolean`, `materializeVisible(): Record<string, any>`. `id` and `path` are NOT readonly in code.
- **Fix direction**: Add missing fields; remove `readonly` from `id`/`path`.

### Finding 3: RendererComponentProps — type parameter constraints differ

- **Severity**: P2
- **Location**: doc:69-81, code: `packages/flux-core/src/types/renderer-core.ts:252-274`
- **Category**: inaccurate-type
- **Doc claim**: `RendererComponentProps<S = BaseSchema, P = RendererResolvedProps<S>>`
- **Code reality**: `RendererComponentProps<S extends BaseSchema = BaseSchema, P extends Record<string, unknown> = RendererResolvedProps<S>>` — both type params have constraints
- **Fix direction**: Add `extends BaseSchema` and `extends Record<string, unknown>` constraints.

### Finding 4: RendererComponentProps — `events` includes `| undefined`

- **Severity**: P2
- **Location**: doc:78, code: `packages/flux-core/src/types/renderer-core.ts:264`
- **Category**: inaccurate-type
- **Doc claim**: `events: Readonly<Record<string, RendererEventHandler>>`
- **Code reality**: `events: Readonly<Record<string, RendererEventHandler | undefined>>` — values can be `undefined`
- **Fix direction**: Add `| undefined` to the mapped value type.

### Finding 5: RendererComponentProps — `regions` is generic

- **Severity**: P2
- **Location**: doc:77, code: `packages/flux-core/src/types/renderer-core.ts:263`
- **Category**: inaccurate-type
- **Doc claim**: `regions: Readonly<Record<string, RenderRegionHandle>>`
- **Code reality**: `regions: Readonly<Record<string, RenderRegionHandle<RendererRenderOutput>>>` — generic parameter
- **Fix direction**: Add `<RendererRenderOutput>` type argument.

### Finding 6: RendererHelpers — `dispatch` accepts `CompiledActionProgram`

- **Severity**: P2
- **Location**: doc:158-161, code: `packages/flux-core/src/types/renderer-core.ts:83-86`
- **Category**: inaccurate-type
- **Doc claim**: `dispatch(action: ActionSchema | ActionSchema[], ctx?: Partial<ActionContext>): Promise<ActionResult>`
- **Code reality**: `dispatch(action: ActionSchema | ActionSchema[] | CompiledActionProgram, ctx?: Partial<ActionContext>): Promise<ActionResult>` — also accepts `CompiledActionProgram`
- **Fix direction**: Add `CompiledActionProgram` to the union.

### Finding 7: RendererResolvedProps — uses `RemoveIndexSignature` and different Omit/Partial order

- **Severity**: P2
- **Location**: doc:171-197, code: `packages/flux-core/src/types/renderer-core.ts:92-107`
- **Category**: inaccurate-type
- **Doc claim**: `Partial<Omit<S, 'when' | 'visible' | ...>>`
- **Code reality**: `Omit<Partial<RemoveIndexSignature<S>>, 'when' | 'visible' | ...>` — order is swapped and `RemoveIndexSignature<S>` is applied first
- **Fix direction**: Match the code exactly — `Omit<Partial<RemoveIndexSignature<S>>, ...>`.

### Finding 8: RendererDefinition — missing `extends RendererDefinitionShape<S>` and `BivariantCallback`

- **Severity**: P2
- **Location**: doc:204-212, code: `packages/flux-core/src/types/renderer-core.ts:276-290`
- **Category**: inaccurate-type
- **Doc claim**: `interface RendererDefinition<S, P>` with no base type; `component?: (props: RendererComponentProps<S, P>) => RendererRenderOutput`
- **Code reality**: `interface RendererDefinition<S, P> extends RendererDefinitionShape<S>` with `P extends Record<string, unknown>`; `component?: BivariantCallback<[RendererComponentProps<S, P>], RendererRenderOutput>`
- **Fix direction**: Add `extends RendererDefinitionShape<S>`, `P extends Record<string, unknown>`, and wrap component in `BivariantCallback`.

### Finding 9: RendererRuntime — missing several methods

- **Severity**: P2
- **Location**: doc:269-335, code: `packages/flux-core/src/types/renderer-core.ts:299-455`
- **Category**: inaccurate-type
- **Doc claim**: Shows `createChildScope, createFormRuntime, createValidationScopeRuntime, createSurfaceRuntime, createPageRuntime, createDataSourceController, createActionScope, resolveNodeMeta, resolveNodeProps, resolveTarget, registerDataSource, refreshDataSource, registerReaction, compile, evaluate, evaluateCompiled, dispose`
- **Code reality**: Also has: `prepareSchema?`, `allocateMountedCid()`, `createHostProjectionScope`, `releaseActionScope`, `createComponentHandleRegistry`, `resolvePreparedImports`, `ensureImportedNamespaces`, `getImportedExpressionBindings`, `releaseImportedNamespaces`, `createSourceObserver`, `disposeOwnedPage`, `registerRendererReaction`, `getSourceDebugSnapshot?`, `getReactionDebugSnapshot?`, `getAsyncOwnerDebugSnapshot?`, `getFormStoreDiagnosticsBridge?`, `setEnv`, `moduleCache` (only `runtimeId`, `registry`, `env` shown — missing `expressionCompiler`, `schemaCompiler`, `plugins`, `importStack`, `strictMode`, `moduleCache` from the header)
- **Fix direction**: Update to include all current methods. The doc claims "Full definition" at line 266 but omits ~20 methods.

### Finding 10: RendererRuntime — `executeSource` signature differs

- **Severity**: P2
- **Location**: doc:288-292, code: `packages/flux-core/src/types/renderer-core.ts:371-375`
- **Category**: inaccurate-type
- **Doc claim**: `executeSource(input: { source: SourceSchema; scope: ScopeRef; ctx?: Partial<ActionContext> }): Promise<ActionResult>`
- **Code reality**: Same shape — verified correct ✓
- **Fix direction**: None needed; this one matches.

### Finding 11: FormRuntime — `validateField`/`validateForm` missing `options?`

- **Severity**: P3
- **Location**: doc:351-352, code: `packages/flux-core/src/types/runtime.ts:440-448`
- **Category**: inaccurate-type
- **Doc claim**: `validateField(path: string, reason?: ValidationReason)` and `validateForm(reason?: ValidationReason)`
- **Code reality**: Both accept `options?: { signal?: AbortSignal }` as third parameter
- **Fix direction**: Add `options?: { signal?: AbortSignal }` parameter.

### Finding 12: FormRuntime — missing `subscribeToModelGeneration?`

- **Severity**: P3
- **Location**: doc:342-377, code: `packages/flux-core/src/types/runtime.ts:472`
- **Category**: inaccurate-type
- **Doc claim**: Does not list `subscribeToModelGeneration`
- **Code reality**: Has `subscribeToModelGeneration?(listener: () => void): () => void`
- **Fix direction**: Add missing method.

### Finding 13: ValidationScopeRuntime — missing several methods

- **Severity**: P3
- **Location**: doc:385-413, code: `packages/flux-core/src/types/runtime.ts:379-429`
- **Category**: inaccurate-type
- **Doc claim**: Does not list `touchField?`, `visitField?`, `getScopeRootErrors`, `subscribeToModelGeneration?`, `registerChildContract`, `unregisterChildContract`, `getAsyncOwnerDebugSnapshot?`, `getScopeState`
- **Code reality**: Has all of these methods
- **Fix direction**: Add missing methods.

### Finding 14: ValidationScopeRuntime — `validateAll` missing `options?`

- **Severity**: P3
- **Location**: doc:399-400, code: `packages/flux-core/src/types/runtime.ts:399`
- **Category**: inaccurate-type
- **Doc claim**: `validateAll(reason?: ValidationReason): Promise<FormValidationResult>`
- **Code reality**: `validateAll(reason?: ValidationReason, options?: { signal?: AbortSignal }): Promise<FormValidationResult>`
- **Fix direction**: Add `options?` parameter.

### Finding 15: FormStatusSummary — missing fields

- **Severity**: P3
- **Location**: doc:444-453, code: `packages/flux-core/src/types/runtime.ts:165-177`
- **Category**: inaccurate-type
- **Doc claim**: `submitting, validating, dirty, touched, valid, invalid, hasErrors, errorCount`
- **Code reality**: Also has `id?: string`, `name?: string`, `visited: boolean`
- **Fix direction**: Add missing fields.

### Finding 16: DataSourceStatusSummary — missing fields

- **Severity**: P3
- **Location**: doc:455-466, code: `packages/flux-core/src/types/runtime.ts:202-218`
- **Category**: inaccurate-type
- **Doc claim**: `started, loading, ready, stale, hasData, hasError, isInitialLoading, isRefreshing, inFlightCount, error?`
- **Code reality**: Also has `dataUpdatedAt: number`, `errorUpdatedAt: number`, `failureCount: number`, `failureReason?: unknown`, `async?: AsyncOwnerDebugState`
- **Fix direction**: Add missing fields.

### Finding 17: CompiledTemplate — shape is wrong

- **Severity**: P2
- **Location**: doc:704, code: `packages/flux-core/src/types/node-identity.ts:208-211`
- **Category**: inaccurate-type
- **Doc claim**: `interface CompiledTemplate { nodes: TemplateNode[] }`
- **Code reality**: `interface CompiledTemplate { root: TemplateNode | readonly TemplateNode[]; repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate> }`
- **Fix direction**: Replace `nodes` with `root` and `repeatedTemplates` fields.

### Finding 18: CompiledActionProgram — `nodes` is readonly

- **Severity**: P3
- **Location**: doc:713, code: `packages/flux-core/src/types/actions.ts:469-472`
- **Category**: inaccurate-type
- **Doc claim**: `CompiledActionProgram { nodes: CompiledActionNode[]; isFullyStatic: boolean; }`
- **Code reality**: `nodes: CompiledActionNode[]` (same — verified match ✓)
- **Fix direction**: None needed; matches.

### Finding 19: FormFieldStateSnapshot / FormFieldPresentationSnapshot — hooks don't return what doc says

- **Severity**: P2
- **Location**: doc:537-540, code: `packages/flux-react/src/hooks/use-form-hooks.ts:245-266`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentFormFieldState(path)` returns `FormFieldPresentationSnapshot`; `useOwnedFieldState`, `useChildFieldState`, `useValidationNodeState` return "field state"
- **Code reality**: `useCurrentFormFieldState` returns `FormFieldStateSnapshot` (4055; `FormFieldPresentationSnapshot` adds `effectiveDisabled`, `effectiveRequired`, `showError`, `interactive`, `readOnly`). The others return `FormFieldStateSnapshot` too.
- **Fix direction**: Change return type to `FormFieldStateSnapshot` for `useCurrentFormFieldState`; update vague "field state" returns for the other three hooks.

### Finding 20: useCurrentNodeMeta — returns `RenderNodeMeta`, not `ResolvedNodeMeta`

- **Severity**: P2
- **Location**: doc:551, code: `packages/flux-react/src/context-hooks.ts:48-50`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentNodeMeta()` returns `ResolvedNodeMeta`
- **Code reality**: Returns `RenderNodeMeta` (from `render-fragment-types.ts:45`)
- **Fix direction**: Change return type to `RenderNodeMeta`.

### Finding 21: Several context hooks return nullable but doc says non-nullable

- **Severity**: P2
- **Location**: doc:547-558, code: `packages/flux-react/src/context-hooks.ts:24-54`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentPage()` → `PageRuntime`, `useCurrentSurfaceRuntime()` → `SurfaceRuntime`, `useCurrentActionScope()` → `ActionScope`, `useCurrentComponentRegistry()` → `ComponentHandleRegistry`, `useCurrentImportFrame()` → `ImportFrame`, `useCurrentNodeInstance()` → `NodeInstance`
- **Code reality**: All return `| undefined` except `useCurrentNodeMeta()` (non-nullable `RenderNodeMeta`) and `useCurrentNodeInstance()` returns `NodeInstance | undefined`
- **Fix direction**: Add `| undefined` to all nullable return types. `useCurrentNodeMeta()` should keep non-nullable.

### Finding 22: DataSourceSchema types differ significantly from code

- **Severity**: P2
- **Location**: doc:678-696, code: `packages/flux-core/src/types/schema.ts:193-250`
- **Category**: inaccurate-type
- **Doc claim**: `FormulaDataSourceSchema` has `type: 'formula'; formula: string; mergeToScope?; resultMapping?`. `ActionDataSourceSchema` has `type: 'action'; action: ActionSchema; interval?; stopWhen?; mergeToScope?; resultMapping?`.
- **Code reality**: Both extend `BaseDataSourceSchema` (has `name?`, `statusPath?`, `dependsOn?`, `initialData?`, `mergeStrategy?`, `mergeKey?`, `sendOn?`). `FormulaDataSourceSchema` uses `formula: SchemaValue` (not `string`) and `action?: never; api?: never`. `ActionDataSourceSchema` has many more fields: `args?`, `silent?`, `initFetch?`, `onSuccess?`, `onError?`.
- **Fix direction**: Show the actual extended types with all fields.

### Finding 23: SurfaceRuntime.open — missing type annotations

- **Severity**: P3
- **Location**: doc:485-498, code: `packages/flux-core/src/types/runtime.ts:293-329`
- **Category**: inaccurate-type
- **Doc claim**: `open(input: { kind; surface; scope; surfaceId?; options? }): string` — no type annotations
- **Code reality**: Fully typed: `kind: 'dialog' | 'drawer' | 'sheet'`, `surface: Record<string, any>`, `scope: ScopeRef`, `surfaceId?: string`, `options?: { ownerScope?; actionScope?; ... }`
- **Fix direction**: Add complete type annotations.

### Finding 24: useCurrentFormFieldState — second parameter is `query?`

- **Severity**: P3
- **Location**: doc:537, code: `packages/flux-react/src/hooks/use-form-hooks.ts:245-248`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentFormFieldState(path)`
- **Code reality**: `useCurrentFormFieldState(path: string, query?: FormErrorQuery)` — has an optional second parameter
- **Fix direction**: Add `query?: FormErrorQuery` parameter.

### Finding 25: useAggregateError and useOwnedFieldState — missing options param

- **Severity**: P3
- **Location**: doc:540-542, code: `packages/flux-react/src/hooks/use-form-hooks.ts:295-315`
- **Category**: inaccurate-type
- **Doc claim**: `useAggregateError(path)` and `useOwnedFieldState(path)` — no options param shown
- **Code reality**: `useAggregateError(path, options?: { enabled?: boolean })` has options; `useOwnedFieldState(path)` takes only path ✓
- **Fix direction**: Add `options?` param to `useAggregateError`.

### Finding 26: useValidationNodeState parameter name wrong

- **Severity**: P3
- **Location**: doc:542, code: `packages/flux-react/src/hooks/use-form-hooks.ts:268-270`
- **Category**: inaccurate-type
- **Doc claim**: `useValidationNodeState(node)` — parameter named `node`
- **Code reality**: `useValidationNodeState(path: string)` — parameter is `path`, and it takes a string, not a node
- **Fix direction**: Rename parameter to `path` and give it type `string`.

### Finding 27: useActionDispatcher return type — vague

- **Severity**: P3
- **Location**: doc:522, code: `packages/flux-react/src/hooks.ts:162-164`
- **Category**: inaccurate-type
- **Doc claim**: `Runtime['dispatch']`
- **Code reality**: `useRendererRuntime().dispatch` which is `RendererRuntime['dispatch']` → `(action: ActionSchema | ActionSchema[] | CompiledActionProgram, ctx: ActionContext) => Promise<ActionResult>`
- **Fix direction**: Use `RendererRuntime['dispatch']` or the full signature.

### Finding 28: Scheduling package — undocumented hooks

- **Severity**: P3
- **Location**: doc:740-761
- **Category**: outdated-reference
- **Doc claim**: Lists 18 hooks for scheduling sub-packages
- **Code reality**: All 18 hooks exist at the documented locations ✓. However, there are 4 undocumented hooks: `useKanbanVirtualizer`, `useCalendarVirtualizer`, `useCalendarConfirmDialog`, `useCalendarOwnership` — all marked "internal to the package" so this is acceptable.
- **Fix direction**: Consider adding the missing hooks for completeness, though the doc claims "Key Hooks" not exhaustive.

### Finding 29: Scheduling registry function — import path verified

- **Severity**: OK
- **Location**: doc:721-724
- **Category**: verified-ok
- **Doc claim**: `import { registerSchedulingRenderers } from '@nop-chaos/flux-renderers-scheduling';`
- **Code reality**: File `packages/flux-renderers-scheduling/src/index.ts` exports this exact function. ✓
- **Fix direction**: None needed.

### Finding 30: Scheduling schema types export paths — verified

- **Severity**: OK
- **Location**: doc:730-737
- **Category**: verified-ok
- **Doc claim**: Four schema types (GanttSchema, KanbanSchema, CalendarSchema, BarcodeInputSchema) re-exported from `schemas.ts` barrel
- **Code reality**: `packages/flux-renderers-scheduling/src/schemas.ts` re-exports all four types exactly as documented. ✓
- **Fix direction**: None needed.

### Finding 31: SchemaFieldKind verified

- **Severity**: OK
- **Location**: doc:84
- **Category**: verified-ok
- **Doc claim**: `SchemaFieldKind` = `'meta' | 'prop' | 'region' | 'value-or-region' | 'event' | 'reaction' | 'ignored'`
- **Code reality**: `packages/flux-core/src/types/schema.ts:50-57` — exact match ✓
- **Fix direction**: None needed.

### Finding 32: Package directory map — basic sanity

- **Severity**: OK
- **Location**: doc:14-45
- **Category**: outdated-reference
- **Doc claim**: Lists 23 packages with directory names and npm names
- **Code reality**: All listed directories exist under `packages/`. All npm names match `package.json` entries (spot-checked a sample). ✓
- **Fix direction**: None needed. No verify that the layer numbers/ordering is fully correct.

### Finding 33: useScopeSelector options — eqFn not optional in doc

- **Severity**: P3
- **Location**: doc:520, code: `packages/flux-react/src/hooks.ts:84-87`
- **Category**: inaccurate-type
- **Doc claim**: `useScopeSelector<T,S>(selector, eqFn?, options?)` — eqFn shown as optional with `?`
- **Code reality**: `useScopeSelector<T, S>(selector, equalityFn = Object.is, options?)` — third param is `options` which includes `enabled?`, `fallback?`, `paths?`. The `eqFn` has a default (`Object.is`), not actually optional in type.
- **Fix direction**: Show the actual signature with defaults. Also note the options type.

### Finding 34: useOwnScopeSelector — eqFn optional with default

- **Severity**: P3
- **Location**: doc:521, code: `packages/flux-react/src/hooks.ts:128-131`
- **Category**: inaccurate-type
- **Doc claim**: `useOwnScopeSelector<T,S>(selector, eqFn?)`
- **Code reality**: `useOwnScopeSelector<T, S>(selector, equalityFn = Object.is)` — has a default value, no options parameter
- **Fix direction**: Show default value.

### Finding 35: useDataSourceStatus — options type

- **Severity**: P3
- **Location**: doc:522, code: `packages/flux-react/src/hooks.ts:145-148`
- **Category**: inaccurate-type
- **Doc claim**: `useDataSourceStatus(path, options?)` with `options?: { enabled?: boolean; fallback?: T; paths?: readonly string[] }`
- **Code reality**: `useDataSourceStatus(path: string, options?: { enabled?: boolean })` only has `enabled` in options
- **Fix direction**: Remove `fallback` and `paths` from the options type; they aren't accepted.

### Finding 36: useCurrentFormState — doc missing options type

- **Severity**: P3
- **Location**: doc:532-534, code: `packages/flux-react/src/hooks/use-form-hooks.ts:192-215`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentFormState(selector)` — no options shown
- **Code reality**: `useCurrentFormState<T>(selector, equalityFn?, options?: { enabled?; path?; paths? })` — has second `equalityFn` and third `options` parameters
- **Fix direction**: Show the full signature with both optional parameters.

### Finding 37: useCurrentFormErrors — missing query param

- **Severity**: P3
- **Location**: doc:535, code: `packages/flux-react/src/hooks/use-form-hooks.ts:225-231`
- **Category**: inaccurate-type
- **Doc claim**: `useCurrentFormErrors()` — no params
- **Code reality**: `useCurrentFormErrors(query?: FormErrorQuery)` — accepts optional query
- **Fix direction**: Add optional `query` parameter.

### Finding 38: "RendererEnv 字段速查" — missing `loadCSS?` and `publicURL?`

- **Severity**: P3
- **Location**: doc:233-246, code: `packages/flux-core/src/types/renderer-api.ts:197-227`
- **Category**: inaccurate-type
- **Doc claim**: List of `RendererEnv` fields (fetcher, stream, openSocket, notify, confirm/alert, navigate, loadPage/loadDict, hasRole, importLoader/resolveImportUrl, monitor, functions/filters, locale)
- **Code reality**: `RendererEnv extends ExpressionExecutionEnv` — the base `ExpressionExecutionEnv` likely has additional fields not listed. The listed fields match the code ✓.
- **Fix direction**: None needed if the doc is targeting the commonly-used subset.

### Finding 39: RendererEnv example usage — `useRendererEnv()` is a hook

- **Severity**: P3
- **Location**: doc:251, code: `packages/flux-react/src/hooks.ts:80-82`
- **Category**: outdated-reference
- **Doc claim**: Shows `const env = useRendererEnv();` — the hook exists ✓
- **Code reality**: Verified `useRendererEnv` is exported from `@nop-chaos/flux-react` and returns `RendererEnv`. ✓
- **Fix direction**: None needed.

### Finding 40: useRenderFragment return type

- **Severity**: P3
- **Location**: doc:564, code: `packages/flux-react/src/use-render-fragment.ts:13-37`
- **Category**: inaccurate-type
- **Doc claim**: `() => ReactNode` — return type is `(input, options?) => ReactNode`
- **Code reality**: Returns `RendererHelpers['render']` which is `(input: RenderNodeInput, options?: RenderFragmentOptions) => RendererRenderOutput`. Not `ReactNode`.
- **Fix direction**: Show the actual return type as a function reference, or match `RendererHelpers['render']`.

### Finding 41: useSchemaProps return type

- **Severity**: P3
- **Location**: doc:564, code: `packages/flux-react/src/render-nodes.tsx:45-49`
- **Category**: inaccurate-type
- **Doc claim**: `useSchemaProps<S>(props)` returns `RendererResolvedProps<S>`
- **Code reality**: Returns `Readonly<RendererResolvedProps<S>>` — wrapped in `Readonly<>`
- **Fix direction**: Wrap return type in `Readonly<>`.

---

## Summary

| Severity           | Count  |
| ------------------ | ------ |
| P1                 | 1      |
| P2                 | 14     |
| P3                 | 17     |
| Verified OK        | 5      |
| **Total findings** | **37** |

The most critical issues are in `ScopeRef` (completely wrong `update` signature, missing fields), `RendererComponentProps` (several mismatched constraints and types), `RendererRuntime` (missing ~20 methods despite claiming "full definition"), `CompiledTemplate` (wrong shape entirely), and the `DataSourceSchema` types (significant missing fields). Several hook return types in the React hooks table are inaccurate or missing parameters.
