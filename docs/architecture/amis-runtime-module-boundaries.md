# AMIS Runtime Module Boundaries

## Purpose

This note records the intended file ownership inside `packages/amis-runtime` after the validation refactor work.

Use it when deciding where new runtime behavior belongs.

## Main Rule

`packages/amis-runtime/src/index.ts` is an assembly layer.

It should stay limited to:

- wiring runtime dependencies together
- creating top-level runtime factories
- exporting stable package entry points

If new logic is not trivial assembly code, it should move to a focused runtime module.

## Current Runtime Ownership

### Entry and assembly

- `packages/amis-runtime/src/index.ts`
  - runtime assembly
  - top-level factory composition
  - package export surface

### Schema compilation

- `packages/amis-runtime/src/schema-compiler.ts`
  - schema-shape normalization
  - region extraction
  - deep table column normalization
  - form-scoped validation model assembly

Keep compiler-specific shape handling here.

Do not move generic validation helpers back into this file when they can live in `packages/amis-runtime/src/validation/`.

### Validation runtime flow

- `packages/amis-runtime/src/validation-runtime.ts`
  - sync validator execution entry point
- `packages/amis-runtime/src/form-runtime-validation.ts`
  - field validation orchestration
  - subtree validation
  - async debounce and stale-run cancellation
- `packages/amis-runtime/src/form-validation-errors.ts`
  - runtime-facing normalization for compiled and runtime-registered errors

These files own runtime sequencing and form lifecycle behavior.

They should not become generic helper dumps.

### Validation modules

- `packages/amis-runtime/src/validation/rules.ts`
  - schema rule extraction
  - trigger normalization
  - compiled dependency path helpers
- `packages/amis-runtime/src/validation/message.ts`
  - default validation message construction
- `packages/amis-runtime/src/validation/errors.ts`
  - validation error shaping and normalization helpers
- `packages/amis-runtime/src/validation/validators.ts`
  - built-in sync validator implementations
- `packages/amis-runtime/src/validation/registry.ts`
  - validator registration and lookup
- `packages/amis-runtime/src/validation/index.ts`
  - barrel for validation internals

This directory is the default home for reusable validation helpers.

## Where To Add A New Validation Rule

For a new built-in sync rule:

1. Add schema extraction in `packages/amis-runtime/src/validation/rules.ts` if the rule has schema syntax.
2. Add the validator implementation in `packages/amis-runtime/src/validation/validators.ts`.
3. Add default messaging in `packages/amis-runtime/src/validation/message.ts` if needed.
4. Add focused validator or registry coverage in `packages/amis-runtime/src/validation/validators.test.ts` or `packages/amis-runtime/src/validation/registry.test.ts`.
5. Add or update integration coverage in `packages/amis-runtime/src/index.test.ts` when runtime behavior changes.

For async rules:

- keep the generic rule shape in compiled validation metadata
- keep debounce and stale-run behavior in `packages/amis-runtime/src/form-runtime-validation.ts`
- do not force async request flow into the sync validator registry

## `schema-compiler.ts` Versus `validation/`

Keep code in `packages/amis-runtime/src/schema-compiler.ts` when it is primarily about schema shape:

- region extraction
- node tree traversal
- deep nested structure normalization
- ownership of compiled node paths

Keep code in `packages/amis-runtime/src/validation/` when it is primarily about validation semantics:

- collecting rules from schema fields
- normalizing validation triggers
- building messages
- shaping validation errors
- implementing reusable rule checks
- managing validator lookup

If a helper can be reused without knowledge of compiled regions or deep schema transformation, it usually belongs in `packages/amis-runtime/src/validation/`.

## Renderer Shared Primitives

Shared field chrome now lives in `packages/amis-renderers-form/src/renderers/shared/`.

Use that area for small presentation primitives such as:

- field labels
- field hints
- validation message chrome

Do not add a shared primitive just because two controls look similar once.

Add one when:

- markup is repeated across multiple controls
- accessibility semantics stay consistent after extraction
- the primitive removes renderer noise without hiding field-specific behavior

## Maintenance Rule

No runtime entry file should become the default home for new behavior.

When in doubt, prefer one more focused module over growing a general-purpose file.
