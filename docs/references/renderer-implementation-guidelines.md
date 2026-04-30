# Renderer Implementation Guidelines

## Purpose

This document is a practical implementation guide for renderer authors.

It explains:

- when a renderer should stay as one file
- when to extract pure helper functions
- when to extract a local controller hook
- when a problem is no longer a renderer-local concern and should move to a domain core or shared runtime layer

This is a reference guide, not the top-level architecture owner doc.

Normative owner docs still live primarily in:

- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-binding-and-renderer-contract.md`
- `docs/architecture/flux-dsl-vm-extensibility.md`

## Use This Doc When

- implementing a new renderer
- refactoring a large renderer file
- deciding whether a complex control needs a local controller hook
- deciding whether a reusable behavior should stay renderer-local or move to domain core

## Baseline

Start from the current renderer contract, not from a generic headless-components ideology.

Active baseline:

- renderer input stays unified under `RendererComponentProps`
- renderer code reads runtime services through standard hooks
- field-like controls should prefer existing controller hooks such as `useFormFieldController(...)`
- complex controls may keep local state, but the state boundary must stay clear

Do not introduce a second component protocol just to make a renderer look more abstract.

## Primary Rule

Prefer the smallest correct implementation.

That means:

- keep a small renderer in one file
- extract pure helpers before extracting hooks when the problem is only data shaping
- extract a local controller hook only when the file is mixing several UI-control responsibilities
- move logic to domain core only when it is genuinely larger than one renderer and should not depend on React view structure

## Decision Order

Use this order when deciding how to structure a renderer:

1. Can the renderer stay as one file without becoming hard to read or unsafe to modify?
2. If not, is the problem mostly pure data shaping or utility logic?
3. If not, is the problem a renderer-local interaction/controller concern?
4. If not, is it actually a shared owner/runtime/domain concern?

Do not jump directly from `this file feels busy` to `we need a headless architecture`.

## Case 1: Keep One File

Keep the renderer in one file when most of the following are true:

- the file is still easy to scan in one pass
- state is trivial or absent
- there is only one main interaction path
- most logic is direct schema-to-UI mapping
- extracting helpers would create more names than clarity

Typical examples:

- ordinary field renderers that mostly map `props.props` and `props.meta` into `@nop-chaos/ui`
- small visual renderers with one or two event handlers

This is the default.

## Case 2: Extract Pure Helpers

Extract pure helper functions when the complexity is mostly data processing, not UI state.

Good candidates:

- normalization
- lookup/index building
- flattening/tree traversal
- key resolution
- equality checks
- option metadata shaping

Good signs:

- logic can be tested without rendering React
- logic has no local UI state
- logic has no dependency on DOM events or component lifecycle

Example pattern:

- `packages/flux-renderers-form-advanced/src/tree-options.ts` already holds pure tree-option helpers such as meta building, flattening, and selection toggling

If pure helper extraction solves the readability problem, stop there.

## Case 3: Extract A Local Controller Hook

Extract a local controller hook when one renderer file is mixing several of these concerns at the same time:

- local UI state
- derived display state
- filter/search projection
- interaction state machine
- async save/restore/confirm behavior
- view rendering

This is the main place where a local headless/controller abstraction is useful.

The hook should stay local to the control and should not invent a new framework layer.

### Good Responsibilities For A Local Controller Hook

- search query state
- expanded/collapsed state
- derived labels or summaries
- dirty/saving/open state
- commit/cancel/restore behavior
- keyboard interaction state that is not purely presentational

### Responsibilities That Should Stay In The View File

- JSX structure
- `@nop-chaos/ui` component composition
- slot layout
- visual class decisions
- simple event wiring that only forwards to the controller result

### Minimal Hook Shape

```ts
function useTreeSelectController(input: {
  options: unknown[];
  value: unknown;
  multiple: boolean;
  searchable: boolean;
  disabled: boolean;
  onCommit(nextValue: unknown): void;
}) {
  // query
  // filtered options
  // expanded state
  // selected labels
  // handlers
}
```

### Current Repo Candidates

Strong candidates:

- `packages/flux-renderers-form-advanced/src/tree-controls.tsx`
- `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-field.tsx`
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx`

These files already have enough behavior that a local controller hook would improve readability and testability without changing external renderer contracts.

## Case 4: Move To Domain Core Or Shared Runtime

Some problems are too large for a renderer-local hook.

Move logic out of the renderer when most of the following are true:

- multiple renderers need the same behavior
- the logic should work outside one React component tree
- the logic defines domain state, not just view-local interaction
- the logic needs its own event model, snapshot model, or command model
- the logic should remain stable even if the visual shell changes

This is where domain core or shared runtime code belongs.

Example:

- `flow-designer` is not a missing-local-controller problem
- it already has a domain-core split in `packages/flow-designer-core/`
- renderer files in `packages/flow-designer-renderers/` are host/view adapters over that core

Do not flatten that distinction into `everything is just a local hook`.

## Anti-Patterns

Avoid these mistakes:

### 1. Over-Abstracting Small Renderers

Do not extract a hook just because a file has one `useState` and one `useMemo`.

Simple local state is normal.

### 2. Inventing A Second Renderer Contract

Do not create a parallel component API that bypasses:

- `RendererComponentProps`
- `props` / `meta` / `regions` / `events` / `helpers`
- standard runtime hooks

The controller hook is an internal implementation detail, not a new public protocol.

### 3. Moving Pure Helpers Into Hooks For No Reason

If a function is pure, keep it pure.

Do not wrap lookup, flattening, or normalization logic in React hooks unless it genuinely needs component state or lifecycle.

### 4. Promoting Renderer-Local Problems Into Platform Architecture

Do not turn a renderer refactor into a new platform-wide `headless system`.

Most renderer complexity is solved by one of these:

- keep it in one file
- extract pure helpers
- extract one local controller hook

Only a small number of cases need domain core.

## Review Checklist

When reviewing a complex renderer, ask:

1. Is the external renderer contract still clean and standard?
2. Is the file mixing state, derivation, async control flow, and JSX in a way that is hard to follow?
3. Can pure data shaping move to helpers first?
4. If a hook is extracted, is it local and narrow rather than framework-like?
5. If logic is being moved to a lower layer, is it truly shared or domain-owned?

## Relationship To Existing Owner Docs

- `docs/architecture/renderer-runtime.md` owns the renderer/runtime contract
- `docs/architecture/field-binding-and-renderer-contract.md` owns field-like renderer binding rules
- `docs/architecture/flux-dsl-vm-extensibility.md` owns the complex-control and domain-host layering rules
- this document only helps decide implementation structure inside those boundaries

## Practical Heuristic

Use this heuristic:

- one concern -> one file is fine
- pure transformation concern -> helper module
- one control with mixed UI state and interaction semantics -> local controller hook
- shared domain behavior across shells/renderers -> domain core or runtime layer

That is usually enough.
