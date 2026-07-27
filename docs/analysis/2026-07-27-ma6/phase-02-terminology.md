# MA6 Phase 2 — terminology.md Audit

Audit date: 2026-07-27
Reference: `docs/references/terminology.md` (546 lines, 45 terms)
Verification target: live code in `packages/` (primarily `flux-core`, `flux-react`, `flux-renderers-ai`)

---

### Finding 1: `RendererComponentProps` omits `reactions` field

- Severity: P1
- Category: inaccurate-definition
- Term: `RendererComponentProps`
- Doc definition: Lists 11 fields — `id`, `path`, `schema`, `templateNode`, `node`, `props`, `meta`, `regions`, `events`, `helpers`
- Code reality: The actual interface at `flux-core/src/types/renderer-core.ts:252-274` includes a 12th field:
  ```typescript
  reactions: Readonly<Record<string, ReactionHandle>>;
  ```
  This is a first-class channel parallel to `events` and `regions`, introduced during the reaction/`loadAction` work.
- Fix direction: Add `reactions` to the field list with a brief description referencing the `kind: 'reaction'` field semantic.

### Finding 2: `NodeMetaProgram` omits `when`

- Severity: P2
- Category: inaccurate-definition
- Term: `NodeMetaProgram`
- Doc definition: Lists 7 compiled meta fields — `id`, `className`, `frameClassName`, `visible`, `hidden`, `disabled`, `testid`
- Code reality: The actual type at `flux-core/src/types/node-identity.ts:104-113` includes an 8th field:
  ```typescript
  when?: CompiledRuntimeValue<boolean | unknown>;
  ```
  The `when` expression is compiled as part of meta and resolved at render time to control conditional rendering.
- Fix direction: Add `when` to the field list in the `NodeMetaProgram` definition.

### Finding 3: `ResolvedNodeMeta` omits `when`

- Severity: P2
- Category: inaccurate-definition
- Term: `ResolvedNodeMeta`
- Doc definition: Lists 9 fields — `id`, `className`, `frameClassName`, `visible`, `hidden`, `disabled`, `testid`, `changed`, `cid`
- Code reality: The actual interface at `flux-core/src/types/resolved-node-types.ts:7-18` includes a 10th field:
  ```typescript
  when?: boolean;
  ```
  This is the runtime-resolved conditional visibility flag. Used in `node-renderer-effects.ts:25,61` for conditional rendering gating.
- Fix direction: Add `when` to the field list in `ResolvedNodeMeta`.

### Finding 4: `FieldFrame` — doc uses `wrap: true` but the property is `wrap`

- Severity: P3
- Category: inaccurate-definition
- Term: `FieldFrame`
- Doc definition: "Renderers declare `wrap: true` in their `RendererDefinition` to opt into `FieldFrame` wrapping"
- Code reality: The property is simply `wrap?: boolean` on `RendererDefinitionShape` at `flux-core/src/types/renderer-definition-types.ts:135`. The rendering logic in `node-frame-wrapper.tsx` calls `resolveFrameWrapMode(definitionWrap, schemaFrameWrap)` which treats any truthy value as an opt-in. The `wrap === true` phrasing is not wrong per se but suggests a literal `true` check which doesn't exist.
- Fix direction: Rephrase to "Renderers declare `wrap: boolean` in their `RendererDefinition`" or just "set `wrap` to opt into FieldFrame wrapping".

### Finding 5: `CompiledValueNode` kinds are accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `CompiledValueNode`
- Doc definition: Lists 5 kinds: `static-node`, `expression-node`, `template-node`, `array-node`, `object-node`
- Code reality: The exact 5 kinds confirmed at `flux-core/src/types/compiled-value-types.ts:33-66`. Match is exact.
- Fix direction: None.

### Finding 6: `RenderRegionHandle` doc is accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `RenderRegionHandle`
- Doc definition: "host-neutral rendering handle", `flux-core` owns contract, `flux-react` layers React alias
- Code reality: Confirmed — `RenderRegionHandle<R = unknown>` in `flux-core/src/types/render-fragment-types.ts:20`, React usage in `flux-react/src/react-contracts.ts`.
- Fix direction: None.

### Finding 7: `ActionContext` — `page` and `form` are wrapper types, not the runtime types directly

- Severity: P3
- Category: inaccurate-definition
- Term: `ActionContext`
- Doc definition: Lists fields including `form` and `page`
- Code reality: The `form` field is typed as `ActionContextForm` (a subset interface) and `page` as `ActionContextPage`, not `FormRuntime`/`PageRuntime` directly. These wrapper types expose only a safe subset of the full runtime interfaces. The doc doesn't note this indirection.
- Fix direction: Add a note that `form` and `page` are context-specific wrapper types (`ActionContextForm`, `ActionContextPage`), not the full runtime interfaces.

### Finding 8: `RuntimeContext` — correctly marked as informal

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `RuntimeContext`
- Doc definition: "informal term", "There is no single `RuntimeContext` type"
- Code reality: Verified — no `interface RuntimeContext` or `type RuntimeContext` exists anywhere in the codebase. The doc is correct.
- Fix direction: None.

### Finding 9: `DataSourceSchema` doc is accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `DataSourceSchema`
- Doc definition: Describes `name`, `mergeToScope`, `stopWhen`, `includeScope` fields
- Code reality: Confirmed at `flux-core/src/types/schema.ts:250` — `type DataSourceSchema = FormulaDataSourceSchema | ActionDataSourceSchema`. Fields verified.
- Fix direction: None.

### Finding 10: Data Source naming convention table is accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `data-source` naming convention
- Doc definition: Three-way distinction — `data-source` (schema type discriminator), `source` (prop key), `source` (schema type for inline data)
- Code reality: Confirmed — `DataSourceSchema` uses `type: 'data-source'`, `SourceSchema` uses `type: 'source'`, renderers read via `source` prop key.
- Fix direction: None.

### Finding 11: `ApiResponse` doc is accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `ApiResponse`
- Doc definition: Host-boundary result type from `env.fetcher()`, not the business-level type
- Code reality: Confirmed at `flux-core/src/types/renderer-api.ts:15` — `ApiResponse<T>` with `ok`, `data`, `code`, `msg`, `errors` fields.
- Fix direction: None.

### Finding 12: AI package terms are accurate

- Severity: P0 (no fix needed)
- Category: N/A
- Term: `MessageEngine`, `AiConnector`, `ChatMessage`, `MessageStateAdapter`, `ReactMessageAdapter`
- Doc definition: Describes engine lifecycle, connector IO boundary, message format, adapter interface, React adapter
- Code reality: All terms verified against `flux-renderers-ai/src/engine/types.ts`, `create-engine.ts`, `state-adapter.ts`, `react-adapter.ts`. `MessageEngine` is an interface, `AiConnector` has `stream()` and optional `complete()`, `ChatMessage` has `id`/`role`/`content`/`tool_calls`/`metadata`/`state`, `MessageStateAdapter` is an interface, `ReactMessageAdapter` is a module-local class with `createReactMessageAdapter()` factory.
- Fix direction: None.

### Finding 13: All remaining terms verified correct

- Severity: P0 (no fix needed)
- Category: N/A
- Terms confirmed accurate: `CompiledRuntimeValue`, `NodeRuntimeState`, `TemplateRegion`, `RendererHelpers`, `RendererEventHandler`, `SchemaFieldRule`, `value-or-region`, `event` field, `ScopeRef`, `ImportStackEntry`, `ImportFrame`, `ImportStack`, `RendererRuntime`, `PageStoreApi`, `FormStoreApi`, `PageRuntime`, `FormRuntime`, `SurfaceRuntime`, `SurfaceEntry`, `page` renderer, `ValidationRule`, `CompiledValidationRule`, `CompiledValidationNode`, `CompiledFormValidationModel`, `ValidationContributor`, `RuntimeFieldRegistration`, `ActionSchema`, `ComponentRegistry`, `SlotFrame`, `ScopeSelector`, `ActionScope`, `includeScope`, `params`, `prevResult`
- Verification: All types/interfaces exist at documented locations with documented meanings. Cross-references to source files are correct. The distinction between related types (e.g., `ScopeRef` vs `ActionScope` vs `ImportFrame`) is accurately described.

---

## Summary

| Severity | Count | Findings                                                        |
| -------- | ----- | --------------------------------------------------------------- |
| P1       | 1     | Missing `reactions` on `RendererComponentProps`                 |
| P2       | 2     | Missing `when` on `NodeMetaProgram` and `ResolvedNodeMeta`      |
| P3       | 2     | `wrap: true` phrasing, `ActionContext` wrapper-type indirection |
| P0 (ok)  | 40    | Verified accurate, no changes needed                            |

**Total terms audited**: 45  
**Issues found**: 5 (3 missing fields, 2 wording/nuance issues)
