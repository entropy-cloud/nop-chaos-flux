# Flux Runtime Module Boundaries

## Purpose

This note records current file ownership inside `packages/flux-runtime`.

Use it when deciding where new runtime behavior belongs.

This document is about code placement and ownership.

For validation behavior and form semantics, use `docs/architecture/form-validation.md` as the primary document.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-runtime/src/index.ts` for package export surface only
- `packages/flux-runtime/src/runtime-factory.ts` for runtime assembly boundaries
- `packages/flux-runtime/src/schema-compiler.ts` and `packages/flux-runtime/src/schema-compiler/` for compiler ownership
- `packages/flux-runtime/src/validation/` for reusable validation helpers
- `packages/flux-runtime/src/form-runtime.ts` and related `form-runtime-*` files for form flow ownership
- `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, and `packages/flux-runtime/src/scope.ts` for runtime subsystem placement
- `packages/flux-runtime/src/action-runtime-core.ts`, `packages/flux-runtime/src/action-runtime-handlers.ts`, `packages/flux-runtime/src/imports.ts`, `packages/flux-runtime/src/action-scope.ts`, and `packages/flux-runtime/src/component-handle-registry.ts` for action/capability/import/runtime-host boundaries

## Main Rule

`packages/flux-runtime/src/runtime-factory.ts` is the main assembly layer, while `packages/flux-runtime/src/index.ts` stays a thin package entry.

It should stay limited to:

- wiring runtime dependencies together
- creating top-level runtime factories
- exporting stable package entry points

If new logic is not trivial assembly code, it should move to a focused runtime module.

## Architecture Guardrails (Bug-Derived)

This document remains a placement guide, but the following boundaries are mandatory:

- Mutating async runtime methods must define explicit concurrency behavior (reject, dedupe, or queue) and return consistent cancellation semantics for intentionally skipped operations.
- Runtime-facing reactive contracts must be subscription-first. Non-reactive reads are allowed for command/event paths, but not as reactive render dependencies.
- Runtime state transitions should avoid silent race patterns where one in-flight call can clear state for another in-flight call.

Use `docs/references/architecture-guardrails-from-bugs.md` for detailed bug-to-guardrail mapping and verification patterns.

## Current Runtime Ownership

### Entry and assembly

- `packages/flux-runtime/src/index.ts`
  - package export surface
- `packages/flux-runtime/src/runtime-factory.ts`
  - runtime assembly
  - top-level factory composition
  - owned runtime factory wiring
- `packages/flux-runtime/src/runtime-eval-helpers.ts`
  - scope evaluation helpers extracted from the entry file
  - expression evaluation utilities used during runtime assembly
- `packages/flux-runtime/src/runtime-action-helpers.ts`
  - action-related helpers extracted from the entry file
  - action dispatch wiring utilities

### Schema compilation

- `packages/flux-runtime/src/schema-compiler.ts`
  - schema-shape normalization
  - region extraction
  - renderer field classification
  - deep table column normalization
  - compiled form-validation model assembly
- `packages/flux-runtime/src/schema-compiler/index.ts`
  - compiler submodule composition
- `packages/flux-runtime/src/schema-compiler/fields.ts`
  - renderer field classification helpers and meta-program compilation
- `packages/flux-runtime/src/schema-compiler/regions.ts`
  - region extraction and nested child normalization helpers
- `packages/flux-runtime/src/schema-compiler/tables.ts`
  - table-specific deep normalization helpers
- `packages/flux-runtime/src/schema-compiler/validation-collection.ts`
  - compiled validation model collection during compilation
- `packages/flux-runtime/src/schema-compiler/diagnostics.ts`
  - compiler diagnostic collection helpers
- `packages/flux-runtime/src/schema-compiler/shape-validation.ts`
  - schema-shape validation helpers used during compilation
- `packages/flux-runtime/src/schema-compiler/host-action-validation.ts`
  - host action validation and capability checks during compile
- `packages/flux-runtime/src/schema-compiler/target-enrichment.ts`
  - target enrichment helpers for compiled nodes

Keep compiler-specific shape handling here.

Do not move generic validation helpers back into this file when they can live in `packages/flux-runtime/src/validation/`.

### Validation runtime flow

- `packages/flux-runtime/src/validation-runtime.ts`
  - sync validator execution entry point
- `packages/flux-runtime/src/form-runtime-validation.ts`
  - field validation orchestration
  - subtree validation entry points
  - async debounce and stale-run cancellation
- `packages/flux-runtime/src/form-runtime-owner.ts`
  - owner-local validation orchestration shared by `FormRuntime`
  - full-traversal / subtree validation coordination
  - dependent revalidation, external-error publication, owner summary computation
- `packages/flux-runtime/src/form-runtime.ts`
  - `FormRuntime` assembly and form-specific specialization
  - submit orchestration, touched/visited/dirty policy, ordinary value writes, array mutation dispatch

These files own runtime sequencing and form lifecycle behavior.

They should not become generic helper dumps.

### Validation modules

- `packages/flux-runtime/src/validation/rules.ts`
  - schema rule extraction
  - trigger normalization
  - compiled dependency path helpers
- `packages/flux-runtime/src/validation/message.ts`
  - default validation message construction
- `packages/flux-runtime/src/validation/errors.ts`
  - validation error shaping and normalization helpers
- `packages/flux-runtime/src/validation/validators.ts`
  - built-in sync validator implementations
- `packages/flux-runtime/src/validation/registry.ts`
  - validator registration and lookup
- `packages/flux-runtime/src/validation/index.ts`
  - barrel for validation internals

This directory is the default home for reusable validation helpers.

### Action and request flow

- `packages/flux-runtime/src/action-runtime.ts`
  - top-level action dispatch orchestration
  - dispatch ordering across built-in / component / namespaced paths
  - debounce, retry, and timeout composition entry
- `packages/flux-runtime/src/action-runtime-core.ts`
  - action-evaluation helpers
  - compiled-value evaluation in action context
  - action monitor payload/result shaping
- `packages/flux-runtime/src/action-runtime-handlers.ts`
  - built-in action handlers such as `ajax`, `submitForm`, `dialog`, `refreshSource`, and component-action dispatch helpers
- `packages/flux-runtime/src/request-runtime.ts`
  - request execution
  - adaptor application
  - request cancellation plumbing
- `packages/flux-runtime/src/request-runtime-adaptor.ts`
  - request/response adaptor shaping shared by request execution paths
- `packages/flux-runtime/src/operation-control.ts`
  - timeout / retry / abort helpers shared by action and request execution paths
- `packages/flux-runtime/src/data-source-runtime.ts`
  - api-backed source execution
  - source status publication and result mapping application
  - request dependency tracking for runtime-owned sources
- `packages/flux-runtime/src/source-registry.ts`
  - scope-scoped source registration and replacement
  - source invalidation/refresh routing
  - source debug snapshot ownership
- `packages/flux-runtime/src/reaction-runtime.ts`
  - scope-scoped reaction registration and replacement
  - reaction scheduling / loop guard behavior
  - reaction debug snapshot ownership
- `packages/flux-runtime/src/surface-runtime.ts`
  - shared dialog/drawer surface ownership
  - stack-based open/close behavior and disposal hooks
- `packages/flux-runtime/src/status-owner.ts`
  - readonly status-summary publication helpers such as `statusPath` projection and owner-status binding helpers
- focused helpers such as `packages/flux-runtime/src/scope-change.ts` and `packages/flux-runtime/src/runtime-plugins.ts`
  - changed-path dependency matching
  - plugin ordering and similar hot-path coordination helpers

### Action/capability/import host boundaries

- `packages/flux-runtime/src/action-scope.ts`
  - lexical namespaced-action lookup
  - scope-local namespace registration and debug snapshot ownership
- `packages/flux-runtime/src/component-handle-registry.ts`
  - lexical component-handle registration and lookup by `cid`, `componentId`, or `componentName`
  - debugger-facing handle debug-data ownership
- `packages/flux-runtime/src/imports.ts`
  - import-module load dedupe
  - action-scope-local imported namespace registration lifecycle
  - expression-helper publication for imported aliases

These modules are runtime-host infrastructure.

They should not be folded into `ScopeRef`, pure domain cores, or generic renderer components.

### Scope and state plumbing

- `packages/flux-runtime/src/scope.ts`
  - scope store creation
  - lexical lookup behavior
  - scope materialization and update behavior
- `packages/flux-runtime/src/form-store.ts`
  - form store state updates
  - page store state updates
  - surface store state updates
- `packages/flux-runtime/src/form-runtime-state.ts`
  - initial form field-state derivation
- `packages/flux-runtime/src/form-runtime-array.ts`
  - runtime-specific array field-state remapping
- `packages/flux-runtime/src/form-runtime-registration.ts`
  - runtime field registration lookup and synchronization
- `packages/flux-runtime/src/form-runtime-subtree.ts`
  - subtree target collection helpers

`ScopeRef` remains the data lookup/update contract only.

Do not turn it into a mixed behavior registry for:

- namespaced actions
- component handles
- source/reaction runtime entries
- import loaders or debugger state

### Page and node runtime helpers

- `packages/flux-runtime/src/page-runtime.ts`
  - page runtime creation
  - page-shell state such as refresh tick and root scope ownership
- `packages/flux-runtime/src/node-runtime.ts`
  - resolved node meta and prop evaluation helpers
- `packages/flux-runtime/src/node-resolver.ts`
  - runtime target resolution across nearest-owner semantics, component targets, and compatibility carriers
- `packages/flux-runtime/src/registry.ts`
  - renderer registry creation and registration helpers

## Where To Add A New Validation Rule

For a new built-in sync rule:

1. Add schema extraction in `packages/flux-runtime/src/validation/rules.ts` if the rule has schema syntax.
2. Add the validator implementation in `packages/flux-runtime/src/validation/validators.ts`.
3. Add default messaging in `packages/flux-runtime/src/validation/message.ts` if needed.
4. Add focused coverage in `packages/flux-runtime/src/validation/validators.test.ts` or `packages/flux-runtime/src/validation/registry.test.ts`.
5. Add or update integration coverage in `packages/flux-runtime/src/index.test.ts` when runtime behavior changes.

For async rules:

- keep the generic rule shape in compiled validation metadata
- keep debounce and stale-run behavior in `packages/flux-runtime/src/form-runtime-validation.ts`
- do not force async request flow into the sync validator registry

## `schema-compiler.ts` Versus `validation/`

Keep code in `packages/flux-runtime/src/schema-compiler.ts` when it is primarily about schema shape:

- region extraction
- node tree traversal
- deep nested structure normalization
- ownership of compiled node paths
- renderer-driven field splitting into meta, props, regions, and events

Keep code in `packages/flux-runtime/src/validation/` when it is primarily about validation semantics:

- collecting rules from schema fields
- normalizing validation triggers and visibility triggers
- building messages
- shaping validation errors
- implementing reusable rule checks
- managing validator lookup

If a helper can be reused without knowledge of compiled regions or deep schema transformation, it usually belongs in `packages/flux-runtime/src/validation/`.

## Renderer Shared Primitives

Shared field chrome lives in `packages/flux-renderers-form/src/renderers/shared/`.

Use that area for small repeated presentation primitives such as:

- field labels
- field hints
- help text
- validation message chrome

Do not add a shared primitive just because two controls look similar once.

Add one when:

- markup is repeated across multiple controls
- accessibility semantics stay consistent after extraction
- the primitive removes renderer noise without hiding field-specific behavior

## Maintenance Rule

No runtime entry file should become the default home for new behavior.

When in doubt, prefer one more focused module over growing a general-purpose file.

Corollary:

- if a concern has become its own stable runtime boundary (`action-scope`, component handles, imported namespace lifecycle, operation control, status publication), keep it in its focused module instead of re-inlining it into `index.ts` or `action-runtime.ts`

Current rule for plugin ordering:

- sort renderer plugins once at runtime creation
- lower `priority` runs first
- equal priorities preserve original declaration order

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`
