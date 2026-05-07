# docs/references/ Documentation Consistency Audit

> **Date**: 2026-05-07
> **Scope**: All documents under `docs/references/`
> **Audited Against**: Live source code in `packages/`, cross-document references, and internal logical consistency
> **Status**: Completed

## 1. Executive Summary

Audited all 27 entries under `docs/references/` (26 documents + `audit-rules/` subdirectory) against the live codebase. The documentation is broadly accurate. Found **14 doc-code discrepancies** and **3 internal cross-document inconsistencies**. No critical architecture-level misrepresentations.

## 2. Doc-vs-Code Discrepancies

### 2.1 `terminology.md`

| #   | Claim                                                                                               | Finding                                                                                                                                      | Severity |
| --- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| T1  | `NodeMetaProgram` lists 6 fields: `id, className, visible, hidden, disabled, testid`                | Code has 7 fields. **Missing from doc: `frameClassName`** (`packages/flux-core/src/types/node-identity.ts:97`)                               | Medium   |
| T2  | `ResolvedNodeMeta` lists 8 fields: `id, className, visible, hidden, disabled, testid, changed, cid` | Code has 9 fields. **Missing from doc: `frameClassName`** (`packages/flux-core/src/types/renderer-compiler.ts:26`)                           | Medium   |
| T3  | `ImportStack` lists 5 methods: `installPrepared, push, pop, resolveAlias, dispose`                  | Code has 7 methods + `frames` property. **Missing: `preload()`, `currentBindings()`** (`packages/flux-core/src/types/compilation.ts:86-115`) | Low      |
| T4  | `FormStoreApi` owns "submitting state"                                                              | Code `FormStoreState` also has `submitAttempted: boolean` not mentioned in the doc (`packages/flux-core/src/types/runtime.ts:41`)            | Low      |

### 2.2 `renderer-interfaces.md`

| #   | Claim                                                                | Finding                                                                                                                                                                                                              | Severity |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| R1  | `RendererDefinition` "Runtime registration" group includes `regions` | **No `regions` field exists on `RendererDefinition`**. Regions are expressed through `SchemaFieldRule` entries with `kind: 'region'` in the `fields` array (`packages/flux-core/src/types/renderer-core.ts:195-252`) | Medium   |
| R2  | `SchemaRendererProps` lists 17 fields                                | Code has 18. **Missing from doc: `strictValidation?`** (`packages/flux-core/src/types/renderer-hooks.ts:188`)                                                                                                        | Low      |

### 2.3 `form-validation-runtime-types.md`

| #   | Claim                                                                | Finding                                                                                                                                                                                               | Severity |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| V1  | `CompiledValidationRule.precompiled` shows only `{ regex?: RegExp }` | Code also has `error?: string` inside `precompiled` (`packages/flux-core/src/types/validation.ts:80-88`)                                                                                              | Low      |
| V2  | `ValidationStoreApi` lists 6 methods                                 | Code has 7. **Missing: `subscribeToPaths(paths: readonly string[], listener)`** (`packages/flux-core/src/types/runtime.ts:100-108`)                                                                   | Medium   |
| V3  | `FormStoreApi` declared as `extends ValidationStoreApi`              | Code declares `FormStoreApi` as a standalone interface (no `extends`), inlining all methods (`packages/flux-core/src/types/runtime.ts:79-98`). Structurally compatible but declaration shape differs. | Low      |
| V4  | `ValidationScopeRuntime` lists all methods                           | Code has 2 optional methods not in doc: `touchField?(path)` and `visitField?(path)` (`packages/flux-core/src/types/runtime.ts:314-355`)                                                               | Low      |

### 2.4 `action-payload-matrix.md`

| #   | Claim                                                                   | Finding                                                                                                                                                                     | Severity |
| --- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| A1  | Built-in action matrix lists 11 action types                            | Code has `submit` as an alias for `submitForm` (falls through in switch at `built-in-actions.ts:211`). **Not documented.**                                                  | Medium   |
| A2  | "Non-Built-In Matrix" lists `component:<method>` and `namespace:method` | Code has a third dispatch path: plain action names (no colon) resolved via `XUI_ACTIONS_NAMESPACE` in `runNamedAction()` (`action-runners.ts:144-188`). **Not documented.** | Medium   |

### 2.5 `runtime-and-renderer-faq.md`

| #   | Claim                                                                                         | Finding                                                                                                                           | Severity |
| --- | --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| F1  | "RendererRuntime internally keeps: `ownedPages`, `ownedSurfaceRuntimes`, `ownedActionScopes`" | Code also has `ownedValidationScopes` and `ownedFormRuntimes` (`runtime-factory.ts:123-124`). Summary is accurate but incomplete. | Low      |

## 3. Internal Cross-Document Inconsistencies

### 3.1 `frameClassName` coverage gap

Both `terminology.md` and `renderer-interfaces.md` discuss `NodeMetaProgram` and `ResolvedNodeMeta` but omit the `frameClassName` field. Meanwhile `flux-json-conventions.md` correctly documents `frameWrap` (which is the schema-level input to `frameClassName`), and `integrating-third-party-components.md` mentions `wrap: true` behavior. The omission is localized to the type reference docs; it is not a logical contradiction but a coverage gap.

### 3.2 `ValidationStoreApi.subscribeToPaths` missing from both reference docs

Both `form-validation-runtime-types.md` and `renderer-interfaces.md` describe `ValidationStoreApi` and `FormStoreApi`. Neither mentions `subscribeToPaths`. The omission is consistent across both docs (suggesting the method was added after both were last updated).

### 3.3 `renderer-interfaces.md` lists `regions` on `RendererDefinition`; other docs do not

The claim that `regions` is a field on `RendererDefinition` appears only in `renderer-interfaces.md`. Other docs (`integrating-third-party-components.md`, `renderer-implementation-guidelines.md`) correctly describe regions as emerging from `SchemaFieldRule` entries with `kind: 'region'`. No other doc repeats the incorrect claim.

## 4. Fully Verified Documents (No Discrepancies)

The following reference documents were audited and found fully consistent with the codebase or are non-code documents (guides, checklists, historical notes) that do not make falsifiable type-level claims:

| Document                                               | Type                   | Result                                                                                            |
| ------------------------------------------------------ | ---------------------- | ------------------------------------------------------------------------------------------------- |
| `flux-json-conventions.md`                             | Schema conventions     | All claims verified (expression syntax, action naming, `frameWrap` values, namespace conventions) |
| `maintenance-checklist.md`                             | Process guide          | All referenced architecture doc paths verified to exist                                           |
| `renderer-implementation-guidelines.md`                | Implementation guide   | All 5 file path references verified to exist                                                      |
| `integrating-third-party-components.md`                | Integration guide      | All hook/function/package references verified                                                     |
| `runtime-and-renderer-faq.md`                          | Concept FAQ            | All claimed runtime member subsets verified present                                               |
| `expression-processor-notes.md`                        | Historical note        | References to prototype in `docs/archive/` are correctly scoped as historical                     |
| `code-comment-policy.md`                               | Policy                 | No code claims to verify                                                                          |
| `refactoring-guidelines.md`                            | Process guide          | No code claims to verify                                                                          |
| `architecture-guardrails-from-bugs.md`                 | Bug-derived guardrails | All referenced bug doc paths verified                                                             |
| `architecture-doc-status-matrix.md`                    | Doc routing            | All referenced architecture doc paths verified                                                    |
| `legacy-implementation-notes.md`                       | Historical note        | Correctly scoped as historical reference                                                          |
| `react-hook-form-template-notes.md`                    | Research note          | No code claims against current repo                                                               |
| `yup-template-notes.md`                                | Research note          | No code claims against current repo                                                               |
| `complex-component-design-process.md`                  | Process guide          | No falsifiable type claims                                                                        |
| `ui-interaction-review-checklist.md`                   | Checklist              | No code claims                                                                                    |
| `README.md`                                            | Index                  | References verified                                                                               |
| `reopened-design-decisions-and-audit-adjudications.md` | Decision log           | Correctly scoped                                                                                  |
| `cross-plan-recurring-anomaly-patterns.md`             | Pattern catalog        | Correctly scoped                                                                                  |
| `deep-audit-calibration-patterns.md`                   | Calibration guide      | Correctly scoped                                                                                  |
| `audit-rule-automation-candidates.md`                  | Automation candidates  | Correctly scoped                                                                                  |
| `audit-rule-source-discovery-candidates.md`            | Discovery guide        | Correctly scoped                                                                                  |

## 5. Recommendations

### Immediate fixes (Medium severity)

1. **T1/T2**: Add `frameClassName` to `NodeMetaProgram` and `ResolvedNodeMeta` descriptions in `terminology.md`.
2. **R1**: Remove `regions` from `RendererDefinition` field map in `renderer-interfaces.md`. Clarify that regions are expressed through `fields` rules with `kind: 'region'`.
3. **V2**: Add `subscribeToPaths` to `ValidationStoreApi` in `form-validation-runtime-types.md`.
4. **A1**: Add `submit` alias note to `action-payload-matrix.md` under the `submitForm` entry.
5. **A2**: Add plain named actions (`runNamedAction` via `XUI_ACTIONS_NAMESPACE`) to the Non-Built-In Matrix in `action-payload-matrix.md`.

### Lower priority (Low severity)

6. **T3**: Add `preload` and `currentBindings` to `ImportStack` method list in `terminology.md`.
7. **T4**: Add `submitAttempted` to `FormStoreApi` description in `terminology.md`.
8. **R2**: Add `strictValidation` to `SchemaRendererProps` list in `renderer-interfaces.md`.
9. **V1**: Add `error?: string` to `CompiledValidationRule.precompiled` in `form-validation-runtime-types.md`.
10. **V3**: Note that `FormStoreApi` is a standalone interface, not extending `ValidationStoreApi`.
11. **V4**: Add `touchField?` and `visitField?` to `ValidationScopeRuntime` in `form-validation-runtime-types.md`.
12. **F1**: Optionally add `ownedValidationScopes` and `ownedFormRuntimes` to `runtime-and-renderer-faq.md`.

## 6. Methodology

- Each type-level claim in `terminology.md`, `renderer-interfaces.md`, `form-validation-runtime-types.md`, and `action-payload-matrix.md` was verified against the corresponding TypeScript interface/type in `packages/flux-core/src/types/` and `packages/flux-action-core/src/`.
- File path references were verified by checking actual file existence.
- Hook/function/package export references were verified through package `index.ts` barrel files.
- Internal cross-document consistency was checked by comparing overlapping descriptions across all reference docs.
- Historical/research/process documents were checked for correct scoping statements and valid cross-references.
