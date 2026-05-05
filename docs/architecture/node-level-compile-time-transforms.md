# Node-Level Compile-Time Transforms

## Purpose

This document defines the architecture for node-level compile-time transforms in Flux.

It answers one narrow question:

- when a renderer wants migration-friendly or sugar-style authoring fields, where should that lowering happen before canonical compilation?

This document does not redefine runtime rendering, owner semantics, or field metadata classification. It only defines the compile-time canonicalization boundary for single schema nodes.

## Problem

Flux already has three nearby mechanisms, but none is the right exact fit for renderer-local authoring sugar:

- global `RendererPlugin.beforeCompile` can transform the whole schema tree before compile
- `RendererDefinition.fields` tells the compiler how to classify fields
- `RendererDefinition.schemaValidator` validates renderer-local structure

The gap is that a renderer sometimes needs to accept non-canonical authoring input and lower it into the renderer's canonical schema shape before validation and lowering continue.

Typical examples:

- `crud` compile-time transforms should accept only canonical authoring fields such as `listActions` and `queryForm`
- migrated AMIS `filter`-like input must be converted before it reaches the live compiler
- future toolbar sugar may need to lower into `toolbar`, `listActions`, and `columnSettings`

These are not runtime concerns. They are authoring-to-canonical compile-time concerns.

## Scope

Node-level compile-time transforms are for:

- one renderer type at a time
- one schema node at a time
- pure authoring normalization before canonical validation and lowering

They are not for:

- cross-tree global rewrites better handled by `RendererPlugin.beforeCompile`
- runtime dynamic adaptation
- effectful async preparation
- host-level manifest injection

## Core Rule

Node-level compile-time transforms must convert author-authored schema into the renderer's canonical schema shape before the compiler treats the node as final.

The transform is:

- pure
- deterministic
- local to the current node
- idempotent on already canonical input

## Recommended Contract

`RendererDefinition` supports a renderer-local compile-time canonicalization hook:

```ts
interface RendererAuthoringTransformContext<S extends BaseSchema = BaseSchema> {
  schema: S;
  path: string;
  schemaUrl?: string;
  emit: (issue: SchemaCompilerDiagnostic) => void;
}

interface RendererDefinition<S extends BaseSchema = BaseSchema> {
  authoringTransform?: (ctx: RendererAuthoringTransformContext<S>) => S;
}
```

Key constraint:

- the output must remain the same renderer type unless the compiler explicitly introduces a broader typed rewrite protocol in the future

That keeps this hook focused on canonicalization, not arbitrary AST substitution.

## Compiler Pipeline Placement

Recommended order for one node:

1. global `plugin.beforeCompile` on the whole schema input
2. resolve renderer definition for the node
3. apply `renderer.authoringTransform` to the node
4. run `renderer.schemaValidator` on the canonicalized node
5. run field classification, region extraction, action/source compilation, and the rest of normal lowering

This split keeps responsibilities clear:

- `beforeCompile`: global schema-wide preprocessing
- `authoringTransform`: renderer-local canonicalization
- `schemaValidator`: canonical contract validation
- lowering: compile canonical schema only

## Why This Is Renderer-Level, Not Field-Level

The transform should live at renderer-node granularity, not per-field granularity.

Reason:

- many authoring sugars depend on multiple fields together
- the transform often needs to merge, remove, or derive several fields at once

Examples:

- canonical `crud.listActions` interacts with `toolbar` and `footerToolbar`
- `columns-toggler` interacts with `headerToolbar`, `columnsTogglable`, and `columnSettings`
- canonical `queryForm` and `autoGenerateQueryForm` define the query-model surface

So the correct abstraction is node canonicalization, not a bag of unrelated field mappers.

## Canonicalization Rules

Node-level compile-time transforms should follow these rules:

1. Preserve semantics, not source spelling.
2. Prefer one canonical target shape for each meaning.
3. Remove migration-only aliases from the post-transform node when possible.
4. Emit diagnostics when two sugars conflict instead of guessing silently.
5. Do not make runtime behavior depend on whether the user wrote sugar or canonical fields.

## Examples

### Example 1: canonical `crud.listActions`

Authoring input:

```json
{
  "type": "crud",
  "listActions": [{ "type": "button", "label": "批量删除" }]
}
```

Canonical output:

```json
{
  "type": "crud",
  "listActions": [{ "type": "button", "label": "批量删除" }]
}
```

### Example 2: migrated query sugar -> `queryForm`

Authoring input should already use the canonical Flux query contract before runtime compile continues.

## Diagnostics Policy

The transform may emit diagnostics for authoring ambiguity, for example:

- multiple canonical action surfaces provided with incompatible values
- two canonical fields provided in conflicting ways
- non-canonical migration aliases that should be rejected or rewritten before compile

The transform should not silently pick one side in a real conflict unless there is a documented precedence rule.

## Relationship To Existing Contracts

- `RendererDefinition.fields` still owns field classification hints
- `RendererDefinition.schemaValidator` still validates canonical shape
- `RendererPlugin.beforeCompile` remains the global whole-schema precompile hook
- runtime renderers should consume canonical props only, not repeat authoring normalization ad hoc in React components

## Current Status

Current repo baseline:

- global `RendererPlugin.beforeCompile` exists
- renderer-local `schemaValidator` exists
- renderer-local `authoringTransform` exists on `RendererDefinition`
- `crud` authoring transforms operate on canonical field names only

## Design Consequences

Once this contract exists:

- migration-friendly syntax can stay near the owning renderer instead of leaking into global plugins
- runtime components can stay smaller because canonicalization no longer needs to be reimplemented in `useMemo(normalizeXxxSchema(...))`
- schema validation becomes stricter because validators can assume canonical input

## Cross References

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/schema-file-validator.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/components/crud/design.md`
- `packages/flux-core/src/types/renderer-core.ts`
- `packages/flux-core/src/types/renderer-plugin.ts`
