# Static Capability Validation

## Purpose

This document defines the accepted compile-time validation baseline for schema-visible capability selectors when the relevant contract source is already statically available to the compiler.

Use it when:

- deciding whether validation mode should reject a built-in compatibility alias such as `submit` instead of silently accepting it as canonical authoring vocabulary
- deciding how validation mode should classify built-in, component-targeted, plain named, and namespaced actions before lowering
- deciding how `xui:actions`, host capability manifests, and import static metadata participate in compile-time selector validation
- clarifying which capability checks are compile-time responsibilities and which remain runtime-only

Read this together with:

- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/capability-projection-manifest.md`

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-core/src/constants.ts`
- `packages/flux-core/src/types/actions.ts`
- `packages/flux-core/src/types/compilation.ts`
- `packages/flux-core/src/named-action-provider.ts`
- `packages/flux-compiler/src/action-compiler.ts`
- `packages/flux-compiler/src/schema-compiler/shape-validation-rules.ts`
- `packages/flux-compiler/src/schema-compiler/host-action-validation.ts`
- `packages/flux-action-core/src/action-dispatcher.ts`
- `packages/flux-action-core/src/action-dispatcher/built-in-actions.ts`

## Main Rule

`ActionScope` is runtime infrastructure.

Validation mode still must perform semantic selector validation whenever selector legitimacy can be derived from statically available contracts.

The boundary is:

- runtime resolves and executes live capabilities
- compiler validates only the selector classes and method names that are provably knowable from schema, platform registries, manifests, and import static metadata

Do not use runtime ownership as an excuse to skip compile-time validation for already-declared contracts.

Do not overclaim compile-time proof where the required attribution or target-binding metadata does not exist.

## Static Contract Sources

Validation mode may enforce only what is backed by an explicit static contract source.

The supported sources are:

1. platform built-in selector registry
2. platform-built-in compatibility alias policy
3. lexical `xui:actions` definitions from schema
4. active host capability manifest for the published host family namespace
5. import static metadata when it is already available to the compiler or validator
6. renderer-level closed prop and event validators where the renderer definition already exposes them

This document does not treat undeclared runtime conventions as static contract sources.

## Selector Resolution Model For Validation

Validation must mirror the runtime selector classes and ordering from `docs/architecture/action-scope-and-imports.md`.

The validation classifier should distinguish these classes before lowering:

1. built-in platform selector
2. component-targeted selector matching `component:<method>`
3. plain named action resolved through lexical `xui:actions`
4. namespaced selector resolved through host/import namespace contracts

These are separate resolution tracks, not one flattened generic namespace.

Important consequences:

- built-ins remain unshadowable by `xui:actions`
- plain named actions do not fall through to host/import namespace lookup
- namespaced actions do not resolve through bare `xui:actions` names
- `xui:actions` names cannot contain `:` and therefore do not collide with namespaced selector classes

## Built-In Selector Validation

The platform knows:

- which built-in selectors exist
- which names are canonical
- which names are compatibility aliases
- which selector a compatibility alias lowers to at runtime
- which payload and targeting requirements belong to each built-in

Therefore validation mode should enforce a single built-in selector registry that records at least:

- canonical selector name
- compatibility aliases
- deprecation status or compatibility status
- runtime lowering target

Validation policy:

- canonical built-ins are accepted
- compatibility aliases are diagnosed according to the active validation profile through the central built-in registry, not by treating alias names as equally canonical vocabulary
- unknown plain selectors that are neither built-in nor lexically resolved named actions are rejected

Example baseline:

- `submitForm` is canonical current-form submit authoring vocabulary
- `submit` may remain runtime-compatible, but validation mode must not treat it as equally canonical

This rule is not limited to `submit`. The registry must own alias policy consistently for all retained built-in aliases.

## `xui:actions` Validation

`xui:actions` definitions are compile-time facts because they are declared directly in schema.

Validation mode should:

- collect `xui:actions` names lexically
- respect parent inheritance and child shadowing exactly as the named-action provider does
- reject unresolved plain action names in validation mode
- preserve the runtime rule that built-ins remain higher priority than plain named actions

The active compiler baseline now implements this through the same lexical traversal used for schema validation:

- nearest-child `xui:actions` names shadow parent definitions
- built-in selectors still win over same-named `xui:actions` entries
- unresolved bare names emit `unresolved-action-selector` instead of silently lowering into runtime-only behavior

Validation mode should not claim that bare action names resolve through host/import namespaces. That is a different selector class.

## Host Capability Validation

When a host manifest is active and capability publication attribution is compiler-visible, validation mode should enforce the published host family namespace.

The host manifest can validate:

- that the namespaced method exists
- that the method args shape matches the published contract
- that deprecated host methods emit the documented diagnostic severity

This remains a namespace-specific validation path.

The host manifest does not redefine validation for:

- built-in platform selectors
- component-targeted selectors
- plain named actions
- unrelated imported namespaces

## Import Namespace Validation

Import namespace validation is limited to the static metadata the repository actually exposes.

Today that means `ImportedLibraryStaticMeta`, whose capability surface is limited to:

- `helpers`
- `namespaceMethods`

Therefore the supported import-validation baseline is:

- if static metadata is available, validation mode may check namespace method existence against `namespaceMethods`
- if static metadata is unavailable, validation mode must emit an explicit skipped-validation or unresolved-contract diagnostic according to policy
- validation mode must not pretend it knows args/result/deprecation contracts for imported namespace methods unless a richer import contract model is introduced

The active compiler baseline now emits:

- `unknown-import-member` when `namespaceMethods` metadata exists and the requested method is absent
- `missing-import-static-meta` when the import alias is visible but the library did not publish `namespaceMethods`, so compile-time method validation had to be skipped

Import namespace validation in this baseline is method-existence validation only.

## Component-Targeted Selector Validation

Component-targeted selectors are a separate selector family, but current compile-time knowledge is limited.

Validation mode may enforce:

- selector-family syntax such as `component:<method>`
- method-contract validation only when an explicit compile-time target-to-renderer binding source exists

Without such a binding source, validation mode must not claim that it knows:

- which renderer type a `componentId`, `componentName`, or `_targetCid` refers to
- whether the target is unique
- whether the target exists in the mounted runtime tree

So the current compile-time baseline for component-targeted selectors is conservative.

Absent a separate target-binding contract, validation mode may validate selector family but not concrete target typing.

The active compiler baseline emits `unvalidated-component-target` for `component:<method>` selectors so the weakened semantic validation is explicit rather than silent.

## Host Projection Validation Boundary

Host projection-path validation is intentionally narrower than host capability-method validation.

`docs/architecture/capability-projection-manifest.md` already defines the current constraint:

- generic projection-path diagnostics are only sound after the publication boundary is compiler-visible

Therefore the accepted baseline in this document is:

- host capability method validation is in scope when capability publication attribution is compiler-visible
- generic host projection property/path validation is deferred until projection publication attribution becomes compiler-visible to the compiler

This document does not claim that generic host projection reads are currently fully attributable at compile time.

## Validation Profiles

This document refines the capability-selector part of the structural profiles defined in `docs/architecture/schema-file-validator.md`.

### Authoring Profile

- canonical built-ins pass
- compatibility aliases emit at least warnings
- unresolved plain named actions emit errors or strong warnings
- unknown host capability methods emit errors when host capability attribution is active
- import namespaces emit method-existence diagnostics only when `namespaceMethods` metadata is present
- missing import metadata emits explicit skipped-validation diagnostics rather than silent success

### Strict Validation Profile

- compatibility aliases may be escalated to errors by policy
- unresolved plain named actions error
- unknown host capability methods error when host capability attribution is active
- import namespace method existence errors when static metadata is present and the method is unknown
- skipped import validation is surfaced explicitly and must not be silently treated as success

### Compatibility Profile

- compatibility aliases may remain warnings
- import/static-contract absence may warn rather than block
- the diagnostics output must still say that semantic validation was weakened

## What Validation Mode Must Reject

When the corresponding static contract source is available, validation mode must reject:

- unknown built-in selector usage after built-in classification
- unresolved plain action names after lexical `xui:actions` resolution
- unknown host namespace methods when host capability attribution is active
- invalid host capability args when host method contracts are available
- unknown import namespace methods when `namespaceMethods` metadata is available

## What Validation Mode Must Report Explicitly

Validation mode must emit explicit diagnostics when:

- a compatibility alias is accepted only for migration compatibility
- import namespace validation was skipped because no static metadata was available
- component-targeted selector typing could not be validated because no compile-time binding source exists

Silent downgrade is not acceptable in strict validation mode.

## What Remains Runtime-Only

The following remain runtime-owned unless a future contract source is added:

- runtime existence and uniqueness of `componentId` / `componentName` targets
- concrete renderer typing for component targets without explicit compile-time binding metadata
- generic host projection property/path validation before publication attribution is compiler-visible
- imported namespace args/result/deprecation validation beyond `namespaceMethods` existence checks
- live provider mounting and scope publication success

## Deferred Extensions

The following are valid future extensions, but they are not part of the accepted baseline in this document:

1. generic host projection-path validation after projection publication attribution is compiler-visible
2. richer import contract metadata beyond `namespaceMethods`
3. compile-time target-to-renderer binding for `component:<method>` validation

Those slices require new contract carriers. They must not be presented as already-known compile-time facts before those carriers exist.

## Bottom Line

Validation mode should be strong where the platform already has explicit static contracts, and conservative where it does not.

That means:

- built-in canonical-vs-alias policy should be enforced
- lexical `xui:actions` resolution should be enforced
- host capability method existence and args shape should be enforced when attribution is visible
- import namespaces should only be validated to the extent `ImportedLibraryStaticMeta` really allows
- host projection generic path validation and component-target typing stay deferred until their attribution contracts become real
