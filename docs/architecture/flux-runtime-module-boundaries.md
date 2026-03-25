# Flux Runtime Module Boundaries

## Purpose

This note records current file ownership inside `packages/flux-runtime`.

Use it when deciding where new runtime behavior belongs.

This document is about code placement and ownership.

For validation behavior and form semantics, use `docs/architecture/form-validation.md` as the primary document.

## Current Code Anchors

When this document needs to be checked against code, start with:

- `packages/flux-runtime/src/index.ts` for assembly boundaries
- `packages/flux-runtime/src/schema-compiler.ts` for compiler ownership
- `packages/flux-runtime/src/validation/` for reusable validation helpers
- `packages/flux-runtime/src/form-runtime.ts` and related `form-runtime-*` files for form flow ownership
- `packages/flux-runtime/src/action-runtime.ts`, `packages/flux-runtime/src/request-runtime.ts`, and `packages/flux-runtime/src/scope.ts` for runtime subsystem placement

## Main Rule

`packages/flux-runtime/src/index.ts` is an assembly layer.

It should stay limited to:

- wiring runtime dependencies together
- creating top-level runtime factories
- exporting stable package entry points

If new logic is not trivial assembly code, it should move to a focused runtime module.

## Current Runtime Ownership

### Entry and assembly

- `packages/flux-runtime/src/index.ts`
  - runtime assembly
  - top-level factory composition
  - package export surface

### Schema compilation

- `packages/flux-runtime/src/schema-compiler.ts`
  - schema-shape normalization
  - region extraction
  - renderer field classification
  - deep table column normalization
  - compiled form-validation model assembly

Keep compiler-specific shape handling here.

Do not move generic validation helpers back into this file when they can live in `packages/flux-runtime/src/validation/`.

### Validation runtime flow

- `packages/flux-runtime/src/validation-runtime.ts`
  - sync validator execution entry point
- `packages/flux-runtime/src/form-runtime-validation.ts`
  - field validation orchestration
  - subtree validation entry points
  - async debounce and stale-run cancellation
- `packages/flux-runtime/src/form-runtime.ts`
  - form-level validation entrypoints such as `validateField`, `validateSubtree`, and `validateForm`

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
  - action dispatch
  - debounce handling for actions
  - chained action execution and `prevResult` flow
- `packages/flux-runtime/src/request-runtime.ts`
  - request execution
  - adaptor application
  - request cancellation plumbing

### Scope and state plumbing

- `packages/flux-runtime/src/scope.ts`
  - scope store creation
  - lexical lookup behavior
  - scope materialization and update behavior
- `packages/flux-runtime/src/form-store.ts`
  - form store state updates
  - page store state updates
- `packages/flux-runtime/src/form-runtime-state.ts`
  - initial form field-state derivation
- `packages/flux-runtime/src/form-runtime-array.ts`
  - runtime-specific array field-state remapping
- `packages/flux-runtime/src/form-runtime-registration.ts`
  - runtime field registration lookup and synchronization
- `packages/flux-runtime/src/form-runtime-subtree.ts`
  - subtree target collection helpers

### Page and node runtime helpers

- `packages/flux-runtime/src/page-runtime.ts`
  - page runtime creation
  - dialog stack management
- `packages/flux-runtime/src/node-runtime.ts`
  - resolved node meta and prop evaluation helpers
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

## Related Documents

- `docs/references/terminology.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/flux-core.md`

