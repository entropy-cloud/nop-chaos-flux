# Renderer And Runtime Terminology

## Purpose

This document defines the most important terms used across the active `nop-amis` architecture documents.

Use it when a concept appears in more than one architecture file and you want the shortest shared definition.

This is a reference document.

Current behavior still belongs to the architecture docs and active source code.

## How To Use This File

- use this file for shared vocabulary
- use `docs/architecture/*.md` for behavior, rules, and ownership decisions
- use `packages/flux-core/src/index.ts` as the final type-level contract source

## Core Terms

## `CompiledValueNode`

The internal compiled value tree produced by the expression compiler.

It represents literals, expressions, templates, arrays, and objects before they are wrapped for runtime evaluation.

Current kinds include:

- `static-node`
- `expression-node`
- `template-node`
- `array-node`
- `object-node`

## `CompiledRuntimeValue`

The runtime-facing compiled value wrapper used when resolving node meta or props.

It distinguishes:

- fully static values that can be returned directly
- dynamic values that execute through runtime state and identity reuse rules

## `CompiledSchemaNode`

The executable compiled schema unit consumed by runtime and React rendering.

A compiled node carries:

- schema identity such as `id`, `type`, and `path`
- compiled meta and compiled props
- child `regions`
- optional validation metadata
- event action metadata
- runtime flags and runtime state creation support

## `CompiledRegion`

The compiled representation of a named child fragment on a node.

Typical examples are `body`, `actions`, `header`, or renderer-specific nested content areas.

## `RenderRegionHandle`

The React-side rendering handle for a compiled region.

It gives renderer components a stable way to render a named fragment with optional local scope overrides.

## `ResolvedNodeMeta`

The resolved render-time meta object for a node.

This typically includes values such as:

- `visible`
- `hidden`
- `disabled`
- resolved display text such as `label` or `title`

It is the runtime-evaluated form of compiled meta, not the raw schema.

## `RendererComponentProps`

The explicit boundary contract received by a concrete renderer component.

It includes:

- `schema`
- `node`
- resolved `props`
- resolved `meta`
- `regions`
- `events`
- `helpers`

## `RendererHelpers`

The stable helper object passed to renderer components.

It exposes imperative capabilities such as:

- rendering a fragment
- evaluating a target value
- creating child scope
- dispatching actions

## `RendererEventHandler`

The runtime callback shape used for declarative event fields after schema compilation and runtime adaptation.

This is not authored directly in raw schema JSON.

Schema authors provide action definitions; the runtime produces callable handlers.

## `SchemaFieldRule`

The renderer metadata entry that tells the compiler how to interpret a schema field.

In active code, field rules can classify a field as:

- `meta`
- `prop`
- `region`
- `value-or-region`
- `event`
- `ignored`

## `value-or-region`

A field semantic that allows one schema field name to behave either as:

- a normal value prop
- or a renderable child fragment

Typical use cases are fields like `title`, `label`, or `empty`.

The compiler decides which channel to use based on the raw value shape.

## `event` field

A schema field semantic for declarative actions attached to UI events.

Examples are fields like:

- `onClick`
- `onSubmit`
- `onChange`

These fields carry low-code action descriptions, not raw JavaScript callbacks.

## `ScopeRef`

The lexical runtime scope abstraction used for path lookup, shadowing, and current-scope updates.

It provides:

- path-based reads
- own-scope reads
- merged read fallback
- current-scope updates

It is the main bridge between compiled expressions and live runtime data.

## `PageStoreApi`

The state container API for page-level data.

It owns page-scoped state such as:

- page data
- dialog stack state
- refresh ticks

## `FormStoreApi`

The state container API for form-local data.

It owns:

- current form values
- validation errors
- validating state
- touched, dirty, and visited flags
- submitting state

## `PageRuntime`

The runtime container for page-level behavior.

It coordinates page state, dialogs, refresh flows, and page-oriented action context.

## `FormRuntime`

The runtime container for form-local behavior.

It owns:

- field value updates
- validation entry points
- submit flow
- field-state transitions
- runtime field registration for complex controls
- array operations

## `DialogState`

The runtime representation of an open dialog.

It records dialog identity and dialog-local rendering context, including compiled fragments and scope.

## `ValidationRule`

The schema-neutral validation rule union used by compiler and runtime.

It is the rule model that bridges schema declarations and runtime execution.

## `CompiledValidationRule`

The compiled runtime-ready validation rule record.

It adds:

- stable rule id
- dependency paths
- precompiled artifacts such as regexes

## `CompiledValidationNode`

The node-level validation graph entry used for subtree and aggregate validation reasoning.

Kinds include:

- `field`
- `object`
- `array`
- `form`

## `CompiledFormValidationModel`

The compiled form-level validation metadata bundle.

It contains field views, dependency views, and optionally node-graph views used by runtime validation.

## `ValidationContributor`

The optional renderer-side contract that explains how a renderer participates in validation.

It lets the compiler learn:

- whether the renderer is a field, container, or none
- how to derive its field path
- which rules it contributes

## `RuntimeFieldRegistration`

The runtime registration contract used for complex controls that cannot be modeled entirely through compile-time metadata yet.

It supplements the compiled validation model rather than replacing it.

## `ActionSchema`

The declarative low-code action description used in schema JSON.

Examples include:

- `ajax`
- `submitForm`
- `dialog`
- `closeDialog`
- `setValue`

## `ActionContext`

The runtime context object passed through action execution.

It can carry runtime, scope, page, form, node, dialog, and `prevResult` information.

## `prevResult`

The chained action result from the previous action in a `then` sequence.

It allows later actions to consume outputs from earlier ones without inventing ad hoc wiring.

## Related Documents

- `docs/references/maintenance-checklist.md`
- `docs/architecture/amis-core.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/field-metadata-slot-modeling.md`
- `docs/architecture/form-validation.md`
- `docs/references/renderer-interfaces.md`

