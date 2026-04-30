# 2026-04-30 References Doc-Code Consistency Audit

## Scope

This audit reviews all 21 documents under `docs/references/` against the live codebase and `docs/architecture/` normative requirements.

For each finding, we adjudicate:

- **Docs lagging behind code**: the reference doc describes an older or incomplete state; code has moved forward.
- **Code lagging behind docs**: the doc describes a contract the code does not implement.
- **Mixed drift**: both sides have diverged, or the doc uses fictional names/conventions.

## Method

Four parallel subagent passes inspected:

1. `terminology.md` + `renderer-interfaces.md` — type names, field lists, interface maps
2. `action-payload-matrix.md` + `flux-json-conventions.md` — action fields, authoring conventions
3. `form-validation-runtime-types.md` + `form-validation-execution-details.md` — validation model types
4. Remaining docs — status matrix, guardrails, guidelines, integration guides

Each pass compared doc claims against actual source code in `packages/`.

---

## Per-Document Findings

### 1. `terminology.md`

**Overall: Directionally correct, but has several field-list gaps.**

| Item                                | Adjudication     | Detail                                                                                                                                                                                           |
| ----------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| All 29 type names                   | OK               | All exist in codebase                                                                                                                                                                            |
| `RendererComponentProps` field list | **Docs lagging** | Missing `id`, `path`, `templateNode` — three fields that exist in actual code (`renderer-core.ts:106-109`)                                                                                       |
| `RendererHelpers` capabilities      | **Docs lagging** | Missing `executeSource` method (`renderer-core.ts:59`)                                                                                                                                           |
| `ActionContext` field list          | **Docs lagging** | Doc uses vague "It can carry" framing but omits `instancePath`, `getInstanceKey`, `interactionId`, `signal`, `actionScope`, `componentRegistry`, `event`, `surfaceRuntime`, `evaluationBindings` |
| `DataSourceSchema.stopWhen`         | **Mixed drift**  | Doc implies universally available; actually only on `ActionDataSourceSchema`, not `FormulaDataSourceSchema` (`actions.ts:168`)                                                                   |
| All other type field lists          | OK               | `NodeRuntimeState`, `NodeMetaProgram`, `ResolvedNodeMeta`, `CompiledValueNode` kinds all match                                                                                                   |
| `ApiResponse` description           | OK               | Behavioral description matches runtime contract                                                                                                                                                  |

**Architecture compliance**: This is a reference doc and correctly defers to architecture docs for normative behavior. The gaps are completeness issues, not normative conflicts.

---

### 2. `renderer-interfaces.md`

**Overall: Structurally sound but missing significant fields on two key interfaces.**

| Item                                  | Adjudication     | Detail                                                                                                                                                                                       |
| ------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RendererDefinition` 22 listed fields | OK               | All present in code                                                                                                                                                                          |
| `RendererDefinition` missing fields   | **Docs lagging** | 5 code fields not in doc: `reactComponent` (required alternative to `component`, validated at registration), `propSchema`, `injectedLocals`, `authoringTransform`, `staticCapable`           |
| Renderer classification baseline      | OK               | `instance-renderer`, `flux-owner-renderer`, `domain-host-renderer` all exist                                                                                                                 |
| `SchemaRendererProps` boundary inputs | **Docs lagging** | Missing 8 fields incl. required `schemaUrl`, plus `surfaceRuntime`, `moduleCache`, `actionScope`, `componentRegistry`, `onRuntimeChange`, `onComponentRegistryChange`, `onActionScopeChange` |
| `SchemaFieldRule` kinds               | OK               | All 6 kinds match                                                                                                                                                                            |
| Plugin extension points               | OK               | All 5 hooks present; doc omits required `name` field                                                                                                                                         |

**Architecture compliance**: The `RendererDefinition` field map is the primary interface reference. Missing `reactComponent` is significant because it's a validated required-alternative at registration time (`registry.ts:4`). Missing `staticCapable` is architecturally relevant (tied to plan 131 and static analysis optimization).

---

### 3. `action-payload-matrix.md`

**Overall: Core contract is accurate, but two items are incomplete.**

| Item                                | Adjudication                 | Detail                                                                                                                                                                                                           |
| ----------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `args` as canonical payload carrier | OK                           | Confirmed in `ActionShapeFields`, `CompiledActionPayload`, `evaluateActionArgs`                                                                                                                                  |
| Built-in actions list               | **Docs lagging**             | Missing `closeSurface` — exists as dedicated case in `built-in-actions.ts:177-189`, has its own type `CloseSurfaceActionSchema`                                                                                  |
| Targeting fields list               | **Docs lagging**             | Missing `surfaceId` (`actions.ts:38`) and `dataPath` (`actions.ts:39`)                                                                                                                                           |
| Control-flow fields                 | OK                           | All 10 fields match                                                                                                                                                                                              |
| `setValue`/`setValues` DTOs         | OK                           | Match exactly                                                                                                                                                                                                    |
| `submitForm` convergence status     | **Code lagging behind docs** | Doc says `submitForm → args: ApiSchema` is "LANDED", but `SubmitFormActionSchema` has no `args` constraint and dispatcher creates invocation with `args: undefined`. Form data comes from `ctx.form`, not `args` |

**Architecture compliance**: The `submitForm` claim is the most significant finding — the doc marks a convergence as landed that the code has not implemented.

---

### 4. `flux-json-conventions.md`

**Overall: Highly consistent with code.**

| Item                                   | Adjudication | Detail                                                                    |
| -------------------------------------- | ------------ | ------------------------------------------------------------------------- |
| `frameWrap` values                     | OK           | `FrameWrapMode = boolean \| 'label' \| 'group' \| 'none'` matches exactly |
| `${xxx}` syntax, no `xxxOn`            | OK           | No `xxxOn` patterns anywhere in codebase                                  |
| `$form` is readonly status             | OK           | `FormStatusSummary` is status-only; bound readonly                        |
| `$store` not public contract           | OK           | Zero references in codebase                                               |
| Namespaced keys + `delegate-or-ignore` | OK           | `xui:imports` in `BaseSchema`; `delegate-or-ignore` is compiler default   |

**Architecture compliance**: No issues. This doc accurately reflects the current authoring contract.

---

### 5. `form-validation-runtime-types.md`

**Overall: Mixed drift. The reference doc is stale against live code, and some of that drift came from copying target/pseudotype material out of the owner architecture thread into what should be a code-accurate reference.**

| Item                                 | Adjudication                     | Detail                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ValidateOnPolicy`                   | **Mixed drift**                  | Doc type name doesn't exist; code uses `ValidationTrigger` with values `'change' \| 'blur' \| 'submit'` — missing `'manual'` that doc claims                                                                                                                                                                                                                                |
| `ShowErrorOnPolicy`                  | **Mixed drift**                  | Values match but type name is `ValidationVisibilityTrigger` in code                                                                                                                                                                                                                                                                                                         |
| `ValidationOwnerLifecycleState`      | OK                               | Matches exactly                                                                                                                                                                                                                                                                                                                                                             |
| `ValidationReason`                   | **Docs lagging**                 | Code has additional `'manual'` variant                                                                                                                                                                                                                                                                                                                                      |
| `ValidationScopeRuntime`             | **Mixed drift**                  | The architectural abstraction is real, but the reference shape is not the live exported interface. Code uses `validation?` (not `compiledModel`), returns `FormValidationResult` for subtree/scope operations, accepts `RuntimeFieldRegistration`, and includes `store`, `scope`, `refreshCompiledModel`, `dispose`, `registerChildContract`, and `unregisterChildContract` |
| `FormRuntime`                        | **Mixed drift**                  | `validateOn`/`showErrorOn` not on code interface; `submit()` returns `ActionResult` not `FormSubmitResult`; code has many additional methods not documented                                                                                                                                                                                                                 |
| `CompiledFormValidationModel`        | **Docs lagging**                 | Doc shows `rootPath`, `ownerId`, `nodes`, `validationOrder` as required; code has them optional plus adds `order` (required), `behavior` (required), `defaultHiddenFieldPolicy`                                                                                                                                                                                             |
| `FieldTreeNodeKind`                  | **Mixed drift**                  | Doc lists 8 kinds; code type `CompiledValidationNodeKind` has only 4 (`'field' \| 'object' \| 'array' \| 'form'`)                                                                                                                                                                                                                                                           |
| `FormStoreApi` subscription methods  | OK                               | All 5 listed methods match                                                                                                                                                                                                                                                                                                                                                  |
| `ScopeValidationStateSnapshot.ready` | OK                               | Exists                                                                                                                                                                                                                                                                                                                                                                      |
| `ValidationResult`                   | **Docs ahead / reference drift** | Doc includes `validating?`, but live code does not export that field                                                                                                                                                                                                                                                                                                        |
| `ScopeValidationResult`              | **Docs ahead / reference drift** | Type does not exist in codebase; code uses `FormValidationResult`                                                                                                                                                                                                                                                                                                           |
| `FormSubmitResult`                   | **Docs ahead / reference drift** | Type does not exist in codebase; `FormRuntime.submit()` returns `Promise<ActionResult>`                                                                                                                                                                                                                                                                                     |
| `FieldRegistrationState`             | **Docs ahead / reference drift** | Type does not exist in codebase; live runtime uses `RuntimeFieldRegistration` with behavior callbacks instead of UI state flags                                                                                                                                                                                                                                             |
| `applyExternalErrors` input shape    | OK                               | Matches                                                                                                                                                                                                                                                                                                                                                                     |

**Architecture compliance**: `docs/architecture/form-validation.md` explicitly allows a phased “current live baseline + target architecture” presentation. This reference doc does not. Per `docs/index.md`, non-plan active docs should describe the latest baseline only. Synchronization should therefore update this reference doc to the live exported types, and move any target-only pseudotypes back into the owner architecture discussion if they are still needed.

---

### 6. `form-validation-execution-details.md`

**Overall: Conceptual content is mostly aligned with the owner architecture, but it is contaminated by stale type teaching from the reference/type thread.**

This doc is primarily scenario-based and conceptual. The behavioral descriptions (validation closure, dependency expansion, overlay semantics, owner lifecycle) are directionally correct and consistent with `docs/architecture/form-validation.md`. The problem is stronger than a passive stale cross-reference: parts of the document actively teach non-existent types such as `ScopeValidationResult`. Synchronization should keep the conceptual behavior sections, but replace all API/type examples with current exported names.

---

### 7. `architecture-doc-status-matrix.md`

**Overall: Partially updated; still missing several active docs.**

| Missing doc                            | Exists on disk? | Listed in matrix?                         |
| -------------------------------------- | --------------- | ----------------------------------------- |
| `container-spacing-design.md`          | YES             | NO                                        |
| `composite-value-owner-clean-slate.md` | YES             | Referenced as dependency only, no own row |
| `module-cache-and-import-stack.md`     | YES             | NO                                        |
| `flux-formula.md`                      | YES             | NO                                        |
| `static-analysis.md`                   | YES             | NO                                        |

Previously missing docs (`capability-contract-model.md`, `node-level-compile-time-transforms.md`, `word-editor/design.md`) have been added.

**Architecture compliance**: The matrix is a routing aid per `docs/architecture/README.md`. Its gaps mean some active docs are not discoverable through this routing layer, which violates the maintenance checklist's guidance to keep routing docs synchronized.

---

### 8. `architecture-guardrails-from-bugs.md`

**Overall: Fully consistent.**

All 8 referenced bug files exist on disk. The guardrail descriptions accurately reflect the architecture anchors they reference.

---

### 9. `complex-component-design-process.md`

| Item                            | Adjudication                                 | Detail                                                                                                                                                                                                                                                                                |
| ------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "AMIS JSON 是核心 DSL" baseline | **Docs lagging behind current architecture** | Current owner docs (`docs/architecture/frontend-programming-model.md`, `docs/architecture/flux-design-principles.md`) define Flux as a `Final Execution Schema` runtime. AMIS may be a historical/input reference, but it is no longer the active core DSL framing for new owner docs |
| "已应用组件" status table       | **Docs lagging**                             | Flow Designer listed as "进行中", Report Designer as "待设计" — both are now active families with full doc trees and shipped renderers                                                                                                                                                |
| CSS variable `--fd-*` prefix    | OK                                           | Used in `designer-theme.css`                                                                                                                                                                                                                                                          |
| CSS variable `--na-*` prefix    | **Mixed drift**                              | `--na-*` does not exist in the codebase. Actual theme tokens use `--nop-*` prefix (e.g., `--nop-primary` in `apps/playground/src/styles.css`)                                                                                                                                         |

---

### 10. `integrating-third-party-components.md`

| Item                                                    | Adjudication     | Detail                                                                                                                        |
| ------------------------------------------------------- | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `useFormFieldController` export                         | OK               | Exists in `field-utils.tsx`                                                                                                   |
| `useFieldPresentation` signature                        | **Docs lagging** | Doc shows second param as `form`/`currentForm` (implying `FormRuntime`); actual type is `ValidationScopeRuntime \| undefined` |
| `resolveRendererSlotContent` / `hasRendererSlotContent` | OK               | Both exported from `flux-react`                                                                                               |
| `createRendererRegistry`                                | OK               | Exported from `flux-core`                                                                                                     |
| `registerRendererDefinitions`                           | OK               | Exported from `flux-core`                                                                                                     |

---

### 11. `renderer-implementation-guidelines.md`

**Overall: Fully consistent.** All 5 referenced candidate files and the `tree-options.ts` helper exist on disk.

---

### 12. `refactoring-guidelines.md`

| Item             | Adjudication     | Detail                                                                                                                                                                                                                                                                       |
| ---------------- | ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency chain | **Docs lagging** | Shows `flux-core → flux-formula → flux-runtime → flux-react → flux-renderers-*`; actual chain per AGENTS.md is `flux-core → flux-formula → flux-compiler → flux-action-core → flux-runtime → flux-react → flux-renderers-*` — missing `flux-compiler` and `flux-action-core` |

---

### 13. `code-comment-policy.md`

**Overall: Policy doc, not code-verifiable.** The policy aligns with AGENTS.md code conventions and does not make specific code claims that could be stale.

---

### 14. `expression-processor-notes.md`

**Overall: Historical reference, self-identified as prototype lesson.** No code consistency issues — it correctly describes what to keep and what to discard from the prototype.

---

### 15. `legacy-implementation-notes.md`

**Overall: Historical reference, self-identified.** No code consistency issues — it describes the old `nop-chaos-amis` prototype, not current code.

---

### 16. `maintenance-checklist.md`

**Overall: Routing doc, directionally correct.** References to `docs/examples/user-management-schema.md` and `docs/analysis/2026-04-01-docs-design-review-2026-03-29.md` should be verified to still exist, but the routing structure itself is sound.

---

### 17. `runtime-and-renderer-faq.md`

**Overall: Conceptually accurate.** The FAQ describes relationships between concepts rather than exact type shapes. The mental models and layer descriptions are consistent with the architecture. One note: it references `docs/components/page/design.md` which should be verified.

---

### 18. `react-hook-form-template-notes.md`

**Overall: Research note, self-identified.** No current-code claims; correctly framed as lessons learned from an external template.

---

### 19. `yup-template-notes.md`

**Overall: Research note, self-identified.** Same category as RHF notes. No current-code claims.

---

### 20. `ui-interaction-review-checklist.md`

**Overall: Generic UX quality checklist.** No code-level claims to verify.

---

### 21. `audit-rules/` directory

Contains `README.md` and `surface-shell-consistency.md`. These are reusable audit rule templates, not code claims.

---

## Summary: Docs Lagging Behind Code vs Code Lagging Behind Docs

### Independent Review Results

An independent subagent verified the top 5 findings against the codebase. Results:

- Finding 1 (`form-validation-runtime-types.md` substantially drifted): **CONFIRMED**
- Finding 2 (`renderer-interfaces.md` missing `reactComponent`): **CONFIRMED**
- Finding 3 (`action-payload-matrix.md` submitForm "LANDED" claim): **CONFIRMED**
- Finding 4 (`SchemaRendererProps` missing `schemaUrl`): **CONFIRMED**
- Finding 5 (`refactoring-guidelines.md` dependency chain): **CONFIRMED**

The reviewer also identified 2 additional issues and 1 classification correction:

1. **`FormSubmitResult` is a fictional type** — defined in `form-validation-runtime-types.md:59-62` and referenced at line 165 (`submit(): Promise<FormSubmitResult>`), but does not exist in code. Code returns `Promise<ActionResult>`.
2. **`FieldRegistrationState` is a fictional type** — defined in `form-validation-runtime-types.md:237-250` with 8 fields, but does not exist in code. The actual type is `RuntimeFieldRegistration` with a completely different shape.
3. **Classification correction**: `ValidationResult.validating?` was classified as "Docs lagging" but the doc HAS the field and code DOES NOT. This is docs-ahead/reference drift, not docs lagging.
4. **Cross-file contamination**: `form-validation-execution-details.md` section 7.1 actively teaches developers to use the non-existent `ScopeValidationResult` type — this is more than "inherited references".
5. **Architecture-baseline correction**: `complex-component-design-process.md` still treats AMIS JSON as the current core DSL framing, but the normative baseline has moved to Flux `Final Execution Schema` / SchemaRenderer-centric wording.

All corrections have been incorporated into the findings below.

---

### Docs Lagging Behind Code / Current Architecture

| Doc                                     | What's stale                                                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `terminology.md`                        | `RendererComponentProps` missing 3 fields, `RendererHelpers` missing `executeSource`, `ActionContext` missing ~9 fields                   |
| `renderer-interfaces.md`                | `RendererDefinition` missing 5 fields (esp. `reactComponent`), `SchemaRendererProps` missing 8 fields incl. required `schemaUrl`          |
| `action-payload-matrix.md`              | Missing `closeSurface` action, missing `surfaceId`/`dataPath` targeting fields                                                            |
| `architecture-doc-status-matrix.md`     | Missing 5 active docs from the matrix                                                                                                     |
| `complex-component-design-process.md`   | Still frames AMIS JSON as the current core DSL, has a stale status table, and uses fictional `--na-*` tokens instead of current `--nop-*` |
| `integrating-third-party-components.md` | `useFieldPresentation` signature mismatch                                                                                                 |
| `refactoring-guidelines.md`             | Incomplete dependency chain                                                                                                               |

### Code Lagging Behind Docs / Logged Convergence Claims

| Doc                        | What code doesn't implement                                                                                                                                                                                                                                      |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `action-payload-matrix.md` | `submitForm → args: ApiSchema` is marked "LANDED", and 2026-04-20 / 2026-04-21 logs also record that convergence as landed, but current built-in dispatch still invokes `submitForm` with `args: undefined` and `action-adapter` submits only through `ctx.form` |

### Mixed Drift / Target-Vs-Live Contamination

| Doc                                    | Detail                                                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `form-validation-runtime-types.md`     | A reference doc that should mirror live exported types instead mixes current runtime interfaces with target/pseudotype names copied from the broader validation architecture thread |
| `form-validation-execution-details.md` | Conceptual behavior is mostly correct, but examples and API/type teaching still use non-existent types from the stale reference thread                                              |
| `complex-component-design-process.md`  | CSS variable `--na-*` is fictional; actual code uses `--nop-*`                                                                                                                      |

---

## Priority-Ordered Remediation

### P0: Fix the most drifted doc

1. **`form-validation-runtime-types.md`** — Rewrite it as a strict live-code reference. Keep target architecture only in `docs/architecture/form-validation.md` where phased status is already explicit.
2. **`docs/architecture/form-validation.md` small cleanup pass** — Keep the owner doc's phased current-vs-target structure, but remove stale summary/example type names (`ScopeValidationResult`, `FormSubmitResult`, `FieldTreeNodeKind`, `ValidationCompileContribution`) so the owner doc no longer feeds drift back into the reference doc.

### P1: Fix interface completeness gaps

3. **`renderer-interfaces.md`** — Add missing `RendererDefinition` fields (`reactComponent`, `staticCapable`, `authoringTransform`, `propSchema`, `injectedLocals`) and missing `SchemaRendererProps` fields (esp. required `schemaUrl`).
4. **`terminology.md`** — Add missing `RendererComponentProps` fields, `RendererHelpers.executeSource`, and expand `ActionContext` field list.
5. **`action-payload-matrix.md`** — Add `closeSurface`, `surfaceId`, `dataPath`. Then either implement `submitForm` `args` end-to-end or downgrade the doc/log status from LANDED to target/in-progress.

### P2: Fix routing and status docs

6. **`architecture-doc-status-matrix.md`** — Add missing entries for `container-spacing-design.md`, `composite-value-owner-clean-slate.md`, `module-cache-and-import-stack.md`, `flux-formula.md`, `static-analysis.md`.
7. **`complex-component-design-process.md`** — Update the core DSL framing from AMIS-first to Flux/SchemaRenderer-first, then update the status table and `--na-*` → `--nop-*`.
8. **`refactoring-guidelines.md`** — Fix dependency chain to include `flux-compiler` and `flux-action-core`.

### P3: Fix minor signature inaccuracies

9. **`integrating-third-party-components.md`** — Fix `useFieldPresentation` parameter type.

---

## Architecture Compliance Assessment

### Docs that correctly defer to architecture owners

All reference docs correctly identify themselves as "reference documents" and point to `docs/architecture/` for normative behavior. No reference doc claims to be an architecture owner. This is compliant with the doc routing model in `docs/architecture/README.md`.

### No major owner-doc conflict, but one important exception

Most findings are about completeness and accuracy of type-level details. The architecture docs (`renderer-runtime.md`, `form-validation.md`, `flux-core.md`, etc.) remain the authoritative source. The notable exception is `complex-component-design-process.md`, whose AMIS-first DSL framing has fallen behind the current Flux owner-doc baseline and should be updated.

### One architecture-adjacent concern

`form-validation-runtime-types.md` is so far from the current code that it risks misleading developers into implementing against a non-existent type system. The deeper issue is document-role leakage: the phased target discussion belongs in the owner architecture doc, while the reference doc should stay code-accurate. The clean sync path is to split those responsibilities more strictly rather than forcing runtime code to match stale pseudotypes.
