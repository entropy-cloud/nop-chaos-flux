# MA6 Phase 1 — Action/Scope/Security Docs Audit

## Document: `docs/architecture/action-scope-and-imports.md`

### Finding 1: ActionScope interface matches code exactly

- Severity: P3 (clean match)
- Location: doc:199-219 and `packages/flux-core/src/types/actions.ts:357-365`
- Category: owner-doc-drift (no drift — confirming match)
- Doc claim: ActionScope interface with `id`, `parent?`, `resolve()`, `registerNamespace()`, `unregisterNamespace()`, `listNamespaces()`, `getDebugSnapshot?()`
- Code reality: Interface `ActionScope` at `actions.ts:357-365` matches identically, including all optional methods. Debug snapshot type `ActionScopeDebugSnapshot` also matches.
- Fix direction: None — clean contract.

### Finding 2: ActionNamespaceProvider has undocumented `release?()` method

- Severity: P2
- Location: doc:228-236 and `packages/flux-core/src/types/actions.ts:326-336`
- Category: owner-doc-drift
- Doc claim: `ActionNamespaceProvider` has `invoke()`, `dispose?()`, `listMethods?()`
- Code reality: Code additionally has `release?(): void` method (line 334), and `kind?: 'host' | 'import'` (line 327) not documented.
- Fix direction: Add `release?()` and `kind?` to the document's interface.

### Finding 3: ComponentCapabilities.invoke uses ComponentCapabilityActionContext, not ActionContext

- Severity: P1
- Location: doc:293 and `packages/flux-core/src/types/component-handle-core.ts:42-43`
- Category: inaccurate-type
- Doc claim: `capabilities.invoke(method, payload, ctx: ActionContext): Promise<ActionResult> | ActionResult`
- Code reality: Signature is `invoke(method: string, payload: Record<string, unknown> | undefined, ctx: ComponentCapabilityActionContext): Promise<ComponentCapabilityResult> | ComponentCapabilityResult` — both the context type and result type are different from the doc's description.
- Fix direction: Update doc to show `ComponentCapabilityActionContext` and `ComponentCapabilityResult`.

### Finding 4: ComponentHandleRegistry split into Core + extended interface not documented

- Severity: P2
- Location: doc:263-271 and `packages/flux-core/src/types/component-handle-core.ts:59-71` + `packages/flux-core/src/types/renderer-component.ts:53-62`
- Category: owner-doc-drift
- Doc claim: Single `ComponentHandleRegistry` interface with `id`, `parent`, `unregister()`, `register()`, `resolve()`, `inspectCid?()`, `getHandleByCid?()`
- Code reality: Two interfaces exist. `ComponentHandleRegistryCore` (in `component-handle-core.ts`) has `id`, `parent`, `register()`, `unregister()`, `resolve()`, `dispose?()`. `ComponentHandleRegistry extends ComponentHandleRegistryCore` (in `renderer-component.ts`) adds `inspectCid?()`, `getHandleByCid?()`, `setHandleDebugData?()`, `getHandleDebugData?()`, `getDebugSnapshot?()`, `debugEnabled?`, `setDebugEnabled?()`, `subscribeDebugEnabled?()`. The doc merges both layers.
- Fix direction: Document the two-layer split or update to match current interface structure.

### Finding 5: Shared method contract anchor file path is correct

- Severity: P3 (clean match)
- Location: doc:333 and `packages/flux-core/src/schema-diagnostics/manifest.ts`
- Category: none (confirming correctness)
- Doc claim: `packages/flux-core/src/schema-diagnostics/manifest.ts` as shared method contract anchor
- Code reality: File exists with `FluxValueShape`, `CapabilityMethodContract`, and manifest types.
- Fix direction: None.

### Finding 6: `__xui_actions__` reserved namespace claim is correct

- Severity: P3 (clean match)
- Location: doc:1139 and `packages/flux-core/src/constants.ts:69`
- Category: none
- Doc claim: `__xui_actions__` is a reserved runtime-owned namespace
- Code reality: Confirmed in `constants.ts` as `XUI_ACTIONS_NAMESPACE`. Further confirmed in `import-stack.ts` where `assertImportAliasAllowed()` rejects it as reserved.
- Fix direction: None.

### Finding 7: Reserved import aliases set in code differs from doc list

- Severity: P2
- Location: doc:1139 and `packages/flux-runtime/src/import-stack.ts:20-28`
- Category: owner-doc-drift
- Doc claim: Reserved aliases include `__xui_actions__` plus `$form`, `$page`, `$crud`, `$designer`, `$slot`, `$surface`, `$resource`
- Code reality: `RESERVED_IMPORT_ALIAS_NAMES` is `['crud', 'designer', 'form', 'page', 'resource', 'slot', 'surface']` (bare names without `$` prefix). `__xui_actions__` is checked separately in `assertImportAliasAllowed()`. Note: the $ prefix is not part of the reserved check; the code checks bare names.
- Fix direction: Update the reserved alias list to match code format (bare names, not `$`-prefixed). Document the separate `__xui_actions__` check as distinct from the RESERVED_IMPORT_ALIAS_NAMES set.

### Finding 8: Document correctly identifies that there is no built-in `reload` action

- Severity: P3 (clean match)
- Location: doc:675-681 and `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`
- Category: none
- Doc claim: Flux has no `reload` built-in, uses `refreshSource` + `targetId` and `component:refresh` instead
- Code reality: `built-in-actions.ts` has no `reload` case; `refreshSource` and `refreshTable` exist, `component:refresh` is handled through component capability dispatch. `refreshTick` test at `runtime-actions-advanced.test.ts:222` confirms the doc's claim.
- Fix direction: None.

## Document: `docs/architecture/action-algebra-formal-spec.md`

### Finding 9: CompiledActionProgram matches exactly

- Severity: P3 (clean match)
- Location: doc:112-117 and `packages/flux-core/src/types/actions.ts:469-472`
- Category: none
- Doc claim: `CompiledActionProgram` with `nodes: CompiledActionNode[]` and `isFullyStatic: boolean`
- Code reality: Exact match.
- Fix direction: None.

### Finding 10: CompiledActionNode has undocumented fields in code

- Severity: P2
- Location: doc:118-131 and `packages/flux-core/src/types/actions.ts:449-463`
- Category: owner-doc-drift
- Doc claim: `CompiledActionNode` has `action`, `when?`, `payload`, `targeting`, `control`, `then?`, `onError?`, `onSettled?`, `parallel?`, `source`, `sourcePath?`
- Code reality: Code additionally has `preventDefault?: CompiledRuntimeValue<boolean>` (line 452) and `stopPropagation?: CompiledRuntimeValue<boolean>` (line 453) not mentioned in doc.
- Fix direction: Add `preventDefault` and `stopPropagation` to the documented interface.

### Finding 11: CompiledActionPayload matches — `args` is the sole payload carrier

- Severity: P3 (clean match)
- Location: doc:212 and `packages/flux-core/src/types/actions.ts:415-417`
- Category: none
- Doc claim: `args` is the only author-visible payload carrier, `CompiledActionPayload` has only `args?`
- Code reality: `CompiledActionPayload` at `actions.ts:415-417` has exactly `args?: CompiledRuntimeValue<Record<string, unknown>>`.
- Fix direction: None.

### Finding 12: ActionResult has more fields than documented

- Severity: P2
- Location: doc:226-234 and `packages/flux-core/src/types/actions.ts:264-284`
- Category: owner-doc-drift
- Doc claim: `ActionResult` has `ok`, `cancelled`, `skipped`, `timedOut`, `data`, `results`, `attempts`, `error`
- Code reality: Code additionally has: `cause?`, `failureHandled?`, `failureCount?`, `onErrorError?`, `componentId?`, `componentName?`, `componentType?`, `namespace?`, `sourceScopeId?`, `providerKind?`, `settledError?`. Several of these are important for structured error handling described later in the same doc (e.g. `cause` preservation).
- Fix direction: Update the `ActionResult` interface in the doc to include the additional fields, especially `cause?`, `failureHandled?`, and `settledError?` which are referenced in the doc's own chained result context and cancellation sections.

### Finding 13: Doc references compileActions() — function exists

- Severity: P3 (clean match)
- Location: doc:937 and `packages/flux-compiler/src/action-compiler.ts:184`
- Category: none
- Doc claim: `compileActions()` pipeline compiles inline ActionSchema
- Code reality: `compileActions()` exported from `action-compiler.ts:184`. Also `compileAction()` at line 170.
- Fix direction: None.

## Document: `docs/architecture/action-interaction-state.md`

### Finding 14: Document is largely design-taxonomy, no code anchors to verify

- Severity: P3
- Location: entire document
- Category: missing-doc (code-side)
- Doc claim: Defines interaction-state ownership taxonomy for form, table, dialog, etc. Mentions `$form`, `$surface`, `$page` as reserved bindings.
- Code reality: `$form`, `$page` etc. appear as concept anchors but do not have strong verifiable code contract in `flux-core/src/types/scopes`. The owner taxonomy (Producer Owner, Semantic Lifecycle Owner, etc.) is architectural guidance without live code enforcement.
- Fix direction: No code drift issues found. This doc is intentionally design-level.

## Document: `docs/architecture/action-graph-authoring.md`

### Finding 15: Document is visual-authoring projection rules — no code contract drift

- Severity: P3
- Location: entire document
- Category: none
- Doc claim: Keep `then`/`onError` as `ActionSchema | ActionSchema[]`, keep `parallel`, do not switch to `steps`+`parallel:true`
- Code reality: `ActionSchema` in `flux-core` supports `then?: ActionSchema | ActionSchema[]`, `onError?: ActionSchema | ActionSchema[]`, `parallel?: ActionSchema[]`. The code matches the stated design.
- Fix direction: None.

## Document: `docs/architecture/scope-ownership-and-isolation.md`

### Finding 16: ScopeRef interface matches documented semantics

- Severity: P3 (clean match)
- Location: doc:22-27 and `packages/flux-core/src/types/scope.ts:33-48`
- Category: none
- Doc claim: `ScopeRef` has `get(path)`, `update(path, value)`, `readVisible()`, `materializeVisible()` + `id`, `parent?`, `isolate?`, `store?`
- Code reality: `ScopeRef` at `scope.ts:33-48` matches identically. Has all mentioned methods plus `merge()` and `replace?()`.
- Fix direction: None.

### Finding 17: `isolate` field existence confirmed on `CreateScopeOptions`

- Severity: P3 (clean match)
- Location: doc:118, `packages/flux-core/src/types/scope.ts:52`
- Category: none
- Doc claim: `isolate: true` creates own-scope-only child scope
- Code reality: `CreateScopeOptions.isolate?: boolean` exists at `scope.ts:52`. Also `source?: 'root' | 'row' | 'dialog' | 'form' | 'fragment' | 'custom'` at line 54.
- Fix direction: None.

### Finding 18: ScopePlan matches exactly

- Severity: P3 (clean match)
- Location: doc:398-411 and `packages/flux-core/src/types/node-identity.ts:76-87`
- Category: none
- Doc claim: ScopePlan union type with `inherit`, `child`, `form`, `dialog`, `repeated-item`
- Code reality: Exact match.
- Fix direction: None.

## Document: `docs/architecture/component-resolution.md`

### Finding 19: NodeLocator claim confirmed — zero references in code

- Severity: P3 (clean match)
- Location: doc:19-20, `packages/` (full grep)
- Category: none
- Doc claim: `NodeLocator` must be removed — not used
- Code reality: Zero matches for `NodeLocator` across all `.ts` files in packages/. Fully removed.
- Fix direction: None.

### Finding 20: `ResolutionResult` type not found in code — doc describes conceptual shape

- Severity: P2
- Location: doc:122-136 and codebase search
- Category: owner-doc-drift
- Doc claim: `ResolutionResult` with `kind: 'resolved' | 'notMaterialized' | 'notFound' | 'ambiguous'`
- Code reality: No `ResolutionResult` type exists in the codebase. The nearest equivalent is `InspectResult` in `node-identity.ts` which has `kind: 'resolved' | 'notMaterialized' | 'notFound'` (no `ambiguous`). The doc's `resolveTarget()` function at line 141 is a conceptual description, not a code signature.
- Fix direction: Either add the `ResolutionResult` type to code, or document that this is a design concept and point to `InspectResult` as the closest live equivalent.

### Finding 21: `ComponentTarget` matches documented shape

- Severity: P3 (clean match)
- Location: doc:499-506 and `packages/flux-core/src/types/component-handle-core.ts:31-35`
- Category: none
- Doc claim: `ComponentTarget` with `_targetCid?`, `instancePath?`, `componentId?`, `componentName?`
- Code reality: `ComponentTarget` at `component-handle-core.ts:31-35` has `_targetCid?`, `componentId?`, `componentName?` (no `instancePath?`). `instancePath` is not on `ComponentTarget` in code.
- Fix direction: Note the discrepancy — `instancePath` is not on `ComponentTarget` but on `ComponentTarget`-adjacent resolution context.

## Document: `docs/architecture/module-cache-and-import-stack.md`

### Finding 22: ModuleCache uses ImportedLibraryModuleLike, not ImportedLibraryModule

- Severity: P2
- Location: doc:98-108 and `packages/flux-core/src/types/compilation.ts:140-148`
- Category: inaccurate-type
- Doc claim: `ModuleCache.get(absUrl): ImportedLibraryModule | undefined`
- Code reality: `ModuleCache.get(absUrl: string): ImportedLibraryModuleLike | undefined`. `ImportedLibraryModuleLike` (compilation.ts:80-100) is structurally similar to `ImportedLibraryModule` (actions.ts:367-375) but has narrower context types — it uses `ImportActionScope` and `ImportActionNamespaceProvider` instead of the public `ActionScope` and `ActionNamespaceProvider`.
- Fix direction: Update ModuleCache interface documentation to reference `ImportedLibraryModuleLike`, or explain the internal/internal type split.

### Finding 23: ImportStack.push() parameters differ significantly from doc

- Severity: P1
- Location: doc:225-228 and `packages/flux-runtime/src/import-stack.ts:235-244`
- Category: owner-doc-drift
- Doc claim: `push(input: { nodeId: string; imports: readonly XuiImportSpec[]; cache: ModuleCache; actionScope: ActionScope })`
- Code reality: `push(input: { ownerNodeId: string; parentFrameId?: string; imports?: readonly XuiImportSpec[]; actionScope?: ActionScope; componentRegistry?: ComponentHandleRegistry; scope: ScopeRef; schemaUrl: string; nodeInstance?: NodeInstance })`. Different param name (`nodeId`→`ownerNodeId`), has `cache` implicitly through closure (not a param), adds `componentRegistry?`, `scope`, `schemaUrl`, `nodeInstance?`. Also `imports` is optional.
- Fix direction: Rewrite the documented `push()` interface to match current code. Add scope/schemaUrl/componentRegistry parameters.

### Finding 24: ImportStack.pop() parameter name differs

- Severity: P2
- Location: doc:229 and code: pop signature
- Category: owner-doc-drift
- Doc claim: `pop(nodeId: string)`
- Code reality: `pop(frameId: string)` — pops by frame ID, not node ID. The frame ID is created from owner node ID plus a suffix (see `createFrameId()` at import-stack.ts:206-209).
- Fix direction: Update to `pop(frameId: string)` and document that frame IDs are synthetic.

### Finding 25: ImportStack has undocumented methods preload() and installPrepared()

- Severity: P2
- Location: doc:219-234 and `packages/flux-core/src/types/compilation.ts:167-196`
- Category: owner-doc-drift
- Doc claim: `ImportStack` has `push()`, `pop()`, `resolveAlias()`, `currentBindings()`
- Code reality: Code additionally has `preload()` (line 169) and `installPrepared()` (line 183). These are significant — `installPrepared()` is the primary path for runtime import installation.
- Fix direction: Add `preload()` and `installPrepared()` to the documented ImportStack interface.

### Finding 27: ImportStackEntry has more fields in code than doc

- Severity: P2
- Location: doc:208-212 and `packages/flux-core/src/types/compilation.ts:150-156`
- Category: owner-doc-drift
- Doc claim: `ImportStackEntry` has `alias`, `actionProvider`, `expressionHelpers`
- Code reality: Code has `alias`, `spec: XuiImportSpec`, `actionProvider?: ImportActionNamespaceProvider`, `expressionHelpers?`, `staticMeta?: ImportedLibraryStaticMeta`. Additional fields `spec` and `staticMeta` are not documented.
- Fix direction: Update ImportStackEntry docs to include `spec` and `staticMeta`.

## Document: `docs/architecture/template-instantiation-and-node-identity.md`

### Finding 28: TemplateNode has many more fields than documented

- Severity: P2
- Location: doc:80-95 and `packages/flux-core/src/types/node-identity.ts:132-195`
- Category: owner-doc-drift
- Doc claim: `TemplateNode` has `templateNodeId`, `id`, `type`, `schema`, `templatePath`, `rendererType`, `component`, `propsProgram`, `metaProgram`, `eventPlans`, `regions`, `scopePlan`, `registryPlan?`, `validationPlan?`
- Code reality: Code additionally has: `schemaUrl?`, `structuralWhen?`, `structuralFields?`, `reactionPlans?`, `lifecycleActions?`, `providerPlan?`, `providerWrap?`, `classAliasesPlan?`, `importsPlan?`, `sourcePropKeys`, `sourceStatePropKeys`, `staticAnalysis?`, `compiledSources?`, `compiledReactions?`, `namedActionPlans?`. The doc is missing ~15 fields.
- Fix direction: Update TemplateNode documentation to reflect all current fields, or at minimum document the more important ones (`importsPlan`, `namedActionPlans`, `staticAnalysis`, `reactionPlans`, `lifecycleActions`).

### Finding 29: CompiledTemplate matches exactly

- Severity: P3 (clean match)
- Location: doc:75-78 and `packages/flux-core/src/types/node-identity.ts:208-211`
- Category: none
- Doc claim: `CompiledTemplate` with `root: TemplateNode | readonly TemplateNode[]` and `repeatedTemplates: ReadonlyMap<RepeatedTemplateId, RepeatedTemplate>`
- Code reality: Exact match.
- Fix direction: None.

### Finding 30: NodeInstance matches, with resolvedProps as readonly

- Severity: P3
- Location: doc:151-157 and `packages/flux-core/src/types/node-identity.ts:223-229`
- Category: none
- Doc claim: `NodeInstance` with `cid?`, `templateNode`, `instancePath?`, `scope`, `state`
- Code reality: Identical. Code has `NodeState` inline by import. The `state.resolvedProps` type is `Readonly<Record<string, unknown>>` as `NodeRuntimeState` shows.
- Fix direction: None.

### Finding 31: ComponentHandleRegistry interface documented differently from binary code

- Severity: P2
- Location: doc:472-484 and `packages/flux-core/src/types/component-handle-core.ts:59-71` + `renderer-component.ts:53-62`
- Category: owner-doc-drift
- Doc claim: `ComponentHandleRegistry` has `register()`, `unregister()`, `resolve()`, `getHandleByCid()`, `inspectCid()`, `setHandleDebugData()`, `getHandleDebugData()`
- Code reality: Same issue as Finding 4 — split into Core + extended. The doc correctly describes the merged interface but omits that the core interface does not have `debug` methods.
- Fix direction: Document the two-layer split (same as Finding 4).

## Document: `docs/architecture/security-design-requirements.md`

### Finding 32: No `new Function` or `eval` found in packages — R2 compliance verified

- Severity: P3 (clean match)
- Location: doc:58-61 and packages `packages/**/src`
- Category: none
- Doc claim: R2 forbids `new Function` and `eval` in `packages/**/src` or `apps/**/src`
- Code reality: Grep across all `packages/**/src` for `new Function` and `eval(` returned zero results. Compliance confirmed.
- Fix direction: None.

## Document: `docs/architecture/static-analysis.md`

### Finding 33: StaticAnalysisResult matches exactly

- Severity: P3 (clean match)
- Location: doc:18-23 and `packages/flux-core/src/types/node-identity.ts:28-47`
- Category: none
- Doc claim: `StaticAnalysisResult` with `isStaticContent: boolean` and `dependencies: readonly string[]`
- Code reality: Exact match.
- Fix direction: None.

### Finding 34: computeStaticAnalysis() exists and conditions match

- Severity: P3 (clean match)
- Location: doc:103 and `packages/flux-compiler/src/schema-compiler/static-analysis.ts:51`
- Category: none
- Doc claim: `computeStaticAnalysis()` function, conditions include `renderer.staticCapable`, `propsProgram.isStatic`, `schema.name`, empty `eventPlans`, `scopePlan.kind !== 'inherit'`, all children static
- Code reality: `computeStaticAnalysis()` exists at `static-analysis.ts:51-111`. All conditions match the doc exactly.
- Fix direction: None.

### Finding 35: `schema.name === undefined` is strict check in doc but truthiness check in code

- Severity: P3
- Location: doc:34 and `packages/flux-compiler/src/schema-compiler/static-analysis.ts:78`
- Category: owner-doc-drift
- Doc claim: `schema.name === undefined` (strict undefined check)
- Code reality: `if (schema.name)` (truthiness check). Empty string `""` would also skip static content, not just `undefined`. Minor but real difference.
- Fix direction: Update doc to match code: `if (schema.name)`.

### Finding 36: `compileSchemaToTemplateNodes` function exists

- Severity: P3 (clean match)
- Location: doc:75 and `packages/flux-compiler/src/schema-compiler.ts:77`
- Category: none
- Doc claim: `compileSchemaToTemplateNodes()` — top-level function in compilation flow
- Code reality: Defined as inner function in `schema-compiler.ts:77`, not a standalone export. But it exists and is used.
- Fix direction: None (minor — the doc correctly describes the function even if it's not exported).

## Document: `docs/architecture/static-capability-validation.md`

### Finding 37: ImportedLibraryStaticMeta exists in code

- Severity: P3 (clean match)
- Location: doc:511-525 and `packages/flux-core/src/types/compiled-value-types.ts`
- Category: none
- Doc claim: `ImportedLibraryStaticMeta` with `helpers?` and `namespaceMethods?`
- Code reality: Type exists with matching structure.
- Fix direction: None.

### Finding 38: Action selector validation baseline claims match code

- Severity: P3 (clean match)
- Location: doc:167-171
- Category: none
- Doc claim: Compiler emits `unknown-import-member` and `missing-import-static-meta` diagnostics
- Code reality: `SchemaDiagnosticCode` type at `schema-diagnostics-types.ts:3-39` includes `unknown-import-member` (line 30), `missing-import-static-meta` (line 29), `unvalidated-component-target` (line 16), `unresolved-action-selector` (line 15), `builtin-action-alias` (line 14).
- Fix direction: None.

## Document: `docs/architecture/capability-contract-model.md`

### Finding 39: `RendererDefinitionShape` in code has most documented fields

- Severity: P2
- Location: doc:124-138 and `packages/flux-core/src/types/renderer-definition-types.ts:110-139`
- Category: owner-doc-drift
- Doc claim: `RendererDefinition` should have `rendererClass?`, `rendererTraits?`, `propContracts?`, `eventContracts?`, `componentCapabilityContracts?`, `scopeExportContracts?`, `hostContract?`
- Code reality: `RendererDefinitionShape` at `renderer-definition-types.ts:110-139` has all of these plus more: `displayName?`, `icon?`, `category?`, `defaultSchema?`, `propSchema?`, `injectedLocals?`, `sourcePackage?`, `fields?`, `authoringTransform?`, `schemaValidator?`, `scopePolicy?`, `actionScopePolicy?`, `componentRegistryPolicy?`, `validation?`, `validationDefaults?`, `deepFields?`, `compilation?`, `wrap?`, `frameRootTag?`, `staticCapable?`, `hostContract?`. The doc is directionally aligned.
- Fix direction: None — doc is forward-looking and code largely matches the direction.

### Finding 40: `rendererClass` literal values match

- Severity: P3 (clean match)
- Location: doc:129 and `packages/flux-core/src/types/renderer-definition-types.ts:20-23`
- Category: none
- Doc claim: Renderer class is `'instance-renderer' | 'flux-owner-renderer' | 'domain-host-renderer'`
- Code reality: `RendererRendererClass` type at line 20-23 matches exactly.
- Fix direction: None.

### Finding 41: `FluxValueShape` definition matches

- Severity: P3 (clean match)
- Location: doc:60-78 and `packages/flux-core/src/schema-diagnostics/manifest.ts`
- Category: none
- Doc claim: FluxValueShape union with `string`, `number`, `boolean`, `null`, `literal`, `record`, `array`, `object`, `union`, `unknown`
- Code reality: All these shapes exist. `FluxValueShapeKind` (manifest.ts:14) includes all documented shapes.
- Fix direction: None.

### Finding 42: `CapabilityMethodContract` matches

- Severity: P3 (clean match)
- Location: doc:105-112 and `packages/flux-core/src/schema-diagnostics/manifest.ts`
- Category: none
- Doc claim: `CapabilityMethodContract` with `args?`, `result?`, `description?`, `deprecated?`
- Code reality: Type exists with same structure.
- Fix direction: None.

### Finding 43: `ResolvedAuthoringContract` exists exactly as described

- Severity: P3 (clean match)
- Location: doc:151-161 and `packages/flux-core/src/types/renderer-authoring-contract.ts:17-28`
- Category: none
- Doc claim: `ResolvedAuthoringContract` with `rendererType`, `rendererClass`, `editableProps`, `events`, `componentCapabilityContracts`, `scopeExports`, `hostProjection?`, `hostActions?`, `hostManifest?`
- Code reality: Exact match. Assembly at `renderer-authoring-contract.ts:71-96`.
- Fix direction: None.

## Document: `docs/architecture/capability-projection-manifest.md`

### Finding 44: `HostCapabilityProjectionManifest` matches code

- Severity: P3 (clean match)
- Location: doc:414-431 and `packages/flux-core/src/schema-diagnostics/manifest.ts:167-174`
- Category: none
- Doc claim: Manifest with `family`, `version`, `projection`, `capabilities`, `compatibility?`, `metadata?`
- Code reality: Exact match. Code also has `HostManifestCompatibility` and `HostManifestMetadata` types.
- Fix direction: None.

### Finding 45: `RendererHostContract` matches

- Severity: P3 (clean match)
- Location: doc:477-484 and `packages/flux-core/src/schema-diagnostics/manifest.ts:266-281`
- Category: none
- Doc claim: `hostContract` with `family`, `defaultVersion`, `resolveManifest()`
- Code reality: Code has `family`, `defaultVersion`, `resolveManifest()`, and additionally `capabilityPublication?: CapabilityPublicationAttribution` (line 280). The extra field aligns with the doc's own "Capability Publication Attribution" section.
- Fix direction: Document `capabilityPublication?` in the RendererHostContract shape.

### Finding 46: `resolveHostContractManifest` and `resolveRendererAuthoringContract` exist

- Severity: P3 (clean match)
- Location: doc:1153-1159 and `packages/flux-core/src/types/renderer-authoring-contract.ts:51-96`
- Category: none
- Doc claim: Shared helpers `resolveHostContractManifest()` and `resolveRendererAuthoringContract()`
- Code reality: Both functions exist with the documented signatures.
- Fix direction: None.

### Finding 47: Manifest files exist for designer, spreadsheet, report-designer, word-editor

- Severity: P3 (clean match)
- Location: doc:1124-1141 and renderer packages
- Category: none
- Doc claim: Host manifests should be published by domain packages
- Code reality: `FLOW_DESIGNER_MANIFEST_V1` in `flow-designer-renderers/src/designer-manifest.ts:438`, `SPREADSHEET_MANIFEST_V1` in `spreadsheet-renderers/src/spreadsheet-manifest.ts:25`, `REPORT_DESIGNER_MANIFEST_V1` in `report-designer-renderers/src/report-designer-manifest.ts:493`, `WORD_EDITOR_MANIFEST_V1` in `word-editor-renderers/src/word-editor-manifest.ts:180`. All have version resolvers.
- Fix direction: None.

## Document: `docs/architecture/schema-file-validator.md`

### Finding 48: `SchemaDiagnostic` interface in doc differs from code

- Severity: P2
- Location: doc:168-189 and `packages/flux-core/src/types/schema-diagnostics-types.ts:47-55`
- Category: owner-doc-drift
- Doc claim: `SchemaDiagnostic` with `code` (specific union), `path: string`, `message: string`, `severity`, `source`, `sourceLocation?`
- Code reality: Code has matching fields plus `cause?: unknown` (line 54). The `code` union in the doc lists fewer codes than the live type which has ~40 codes. The doc lists ~14 codes.
- Fix direction: Update the code union and add `cause?` field.

### Finding 49: `validateSchema()` adapter function matches

- Severity: P3 (clean match)
- Location: doc:215-223 and `packages/flux-compiler/src/schema-compiler.ts:264-278`
- Category: none
- Doc claim: `validateSchema(input: { schema, registry, expressionCompiler?, plugins?, options? }): SchemaDiagnostic[]`
- Code reality: Exact match.
- Fix direction: None.

### Finding 50: `SchemaCompileValidationOptions.hostContractContext` uses `HostContractContext` type

- Severity: P3 (clean match)
- Location: doc:636-651 and `packages/flux-core/src/types/schema-validation-types.ts:27`
- Category: none
- Doc claim: `hostContractContext` with `family`, `version`, `manifest`
- Code reality: Type `HostContractContext` in `manifest.ts:287-302` has `family`, `version`, `manifest` plus `capabilityPublication?`. The doc's inline shape at schema-file-validator.md:157-160 matches the core fields.
- Fix direction: None.

### Finding 51: `CompileSchemaOptions.diagnostics` and `validation` fields confirmed

- Severity: P3 (clean match)
- Location: doc:163-166 and `packages/flux-core/src/types/renderer-compiler.ts:21-34`
- Category: none
- Doc claim: `CompileSchemaOptions` with `diagnostics?` and `validation?`
- Code reality: Code has both fields plus internal compile-time fields (`cidState?`, `symbolTable?`, etc.).
- Fix direction: None.

### Finding 52: `SchemaCompileDiagnosticsOptions` matches exactly

- Severity: P3 (clean match)
- Location: doc:142-149 and `packages/flux-core/src/types/schema-diagnostics-types.ts:63-69`
- Category: none
- Doc claim: `SchemaCompileDiagnosticsOptions` with `enabled?`, `continueOnError?`, `maxIssues?`, `reporter?`, `collector?`
- Code reality: Exact match.
- Fix direction: None.

---

## Summary

### Severity Distribution

| Severity | Count |
| -------- | ----- |
| P1       | 2     |
| P2       | 16    |
| P3       | 34    |

### P1 Items (must fix)

1. **Finding 3**: `ComponentCapabilities.invoke()` uses `ComponentCapabilityActionContext` and returns `ComponentCapabilityResult`, not `ActionContext`/`ActionResult`. This is in the core capability contract doc and the most-used action-scope document — the type mismatch would mislead implementers.
2. **Finding 23**: `ImportStack.push()` parameters differ significantly from the documented interface. The code has richer requirements (`scope`, `schemaUrl`, `componentRegistry?`) and different parameter names.

### Key P2 Items (should fix)

- **Finding 2**: `ActionNamespaceProvider` has undocumented `release?()` and `kind?` fields
- **Finding 4**: `ComponentHandleRegistry` two-layer split (Core + extended) not documented
- **Finding 7**: Reserved import aliases set format differs (`$form` vs `form` bare)
- **Finding 10**: `CompiledActionNode` has undocumented `preventDefault` and `stopPropagation`
- **Finding 12**: `ActionResult` has many more fields than documented (~11+ extra fields)
- **Finding 20**: `ResolutionResult` type described in doc doesn't exist in code
- **Finding 22**: `ModuleCache` uses `ImportedLibraryModuleLike`, not `ImportedLibraryModule`
- **Finding 24**: `ImportStack.pop()` pops by `frameId`, not `nodeId`
- **Finding 25**: `ImportStack` has undocumented `preload()` and `installPrepared()` methods
- **Finding 27**: `ImportStackEntry` has additional `spec` and `staticMeta` fields
- **Finding 28**: `TemplateNode` missing ~15 fields in documented interface
- **Finding 48**: `SchemaDiagnostic` missing `cause?` field, code union incomplete

### P3 Items (minor/low priority)

Most are clean matches or very minor drift (30+ items). Key ones:

- `static-analysis.ts:78` uses truthy check for `schema.name`, doc claims strict `=== undefined`
- `ComponentTarget` in doc claims `instancePath?` field but code doesn't have it

### Overall Assessment

12 of 14 documents are structurally consistent with the codebase. The two documents with the most drift are:

- `module-cache-and-import-stack.md` (multiple interface mismatches, missing methods)
- `action-scope-and-imports.md` (component capability types use wrong context/result types)

The capability-contract, capability-projection, static-analysis, security, and schema-validator documents are well-aligned with the live codebase.
