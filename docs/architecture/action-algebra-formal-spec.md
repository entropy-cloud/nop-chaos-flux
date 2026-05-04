# Action Algebra Formal Spec

## Purpose

This document defines the derived action-control-flow system layered above `Capability`.

Use it when you need to answer questions such as:

- how `ActionSchema` steps compose into one execution graph
- how `when`, `then`, `onError`, and `parallel` behave
- how `ActionResult` values are classified for control flow
- which transient result bindings are visible while chained actions evaluate

This document is normative for action-control-flow semantics.

It does not redefine the primitive set. The primitive authority layer remains `Capability` as defined in `docs/architecture/frontend-programming-model.md`.

## Precedence

`docs/architecture/frontend-programming-model.md` defines the top-level primitive model and the rule that `Action Algebra` is derived rather than primitive.

This document owns the narrower rules for action control flow, branch execution, aggregate execution, and chained result context.

If this document conflicts with the top-level programming-model document about primitive identity or effect authority, the top-level document wins.

## Core Claim

`Action Algebra` is the runtime system that composes, sequences, branches, aggregates, and classifies `Capability` dispatch through `ActionSchema` and `ActionResult`.

It belongs inside the `Flux` `Execution Model` as a derived runtime system. It is neither a peer primitive nor an external authoring-layer concern.

It answers questions that `Capability` does not answer:

- when a step is skipped
- when downstream steps run
- how success, failure, timeout, cancellation, and neutral outcomes are classified
- how branching and aggregation work

`Capability` answers authority lookup and targeting only.

## Authoring Surface And Graph Semantics

The authoring surface should stay progressive:

1. single-step dispatch with `{ action, args }`
2. guarded dispatch with `when`
3. success continuation with `then`
4. failure continuation with `onError`
5. aggregate fan-out with `parallel`

Semantically, once those fields exist, execution is already `DAG`-shaped:

- one action step is one node
- `when` is a guard on that node
- `then` is a success edge
- `onError` is a failure edge
- `parallel` is a fan-out and join aggregate

Ordered action lists execute sequentially in stable input order unless a narrower aggregate node such as `parallel` says otherwise.

This ordered-list form is part of the normative authoring surface:

- `then` and `onError` may carry one action or an ordered action list
- the ordered-list form is progressive shorthand for sequential composition, not a second graph language
- `parallel` remains the explicit aggregate fan-out node and should not be collapsed into a generic `steps` carrier plus a mode boolean

## Visual Authoring Projection

A future visual action designer may use explicit `next` edges, branch handles, guarded groups, or other authoring-only graph conveniences.

That does not change the exported runtime DSL.

Rules:

1. visual authoring constructs should lower back to ordered arrays, `when`, `then`, `onError`, and `parallel`
2. designer convenience is not by itself a reason to rename `parallel` or remove ordered-list shorthand
3. node optionality should continue to lower to `when` plus the existing `skipped` result semantics rather than introducing a new bare `optional` execution field

See `docs/architecture/action-graph-authoring.md` for the authoring-model projection rules.

## Compiler-Assembled Acyclic Graph

The execution graph is assembled from schema structure during compilation. It is not an arbitrary runtime graph language authored through back-references.

Consequences:

1. ordinary action authoring remains structurally acyclic under normal nested schema authoring
2. executor complexity should focus on branch semantics, result propagation, aggregation, timeout, cancellation, and scheduling, not on discovering arbitrary graph cycles inside one action tree

This does not remove the need for broader runtime cascade protection at the store, `Reaction`, or writeback level.

## Compiler Validation Responsibilities

The action compiler or narrower schema validator should validate everything structurally knowable before dispatch reaches the executor.

That includes checks such as:

1. required fields for the selected action contract are present
2. expression syntax is valid before execution
3. target references required by a narrower contract are structurally valid where static knowledge exists
4. reserved control-flow fields such as `then`, `onError`, and `parallel` are parsed as control-flow structure rather than ordinary payload fields
5. narrower shape or nesting limits are enforced where defined

Runtime lookup may still be required for capabilities or component instances that only exist when the live runtime boundary exists.

## Compiled Action IR

The action compiler produces a `CompiledActionProgram` containing `CompiledActionNode` elements. This IR is assembled at schema compilation time and executed directly by the runtime without further structural discovery.

### IR Type Definitions

```typescript
interface CompiledActionProgram {
  nodes: CompiledActionNode[];
  isFullyStatic: boolean;
}

interface CompiledActionNode {
  action: string;
  when?: CompiledRuntimeValue<boolean>;
  payload: CompiledActionPayload;
  targeting: CompiledActionTargeting;
  control: CompiledActionControl;
  then?: CompiledActionNode[];
  onError?: CompiledActionNode[];
  onSettled?: CompiledActionNode[];
  parallel?: CompiledActionNode[];
  source: ActionSchema;
  sourcePath?: string;
}
```

### Field Categories

| Category                                                           | Compiled Form                                   | Rationale                                                                       |
| ------------------------------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| `when`                                                             | `CompiledRuntimeValue<boolean>`                 | Expression evaluated at dispatch time                                           |
| `args`                                                             | `CompiledRuntimeValue<Record<string, unknown>>` | Payload is authored through one explicit carrier and may contain dynamic values |
| `targetId`, `componentId`, `formId`, `dialogId`, `surfaceId`, etc. | Original values (uncompiled)                    | Targeting fields are structural selectors, not runtime value payloads           |
| `timeout`, `retry`, `debounce`, `continueOnError`, `control`       | Original values (uncompiled)                    | Static execution control config                                                 |
| `then`, `onError`, `onSettled`, `parallel`                         | `CompiledActionNode[]`                          | Recursive branch compilation                                                    |

### Compiler Lowering Rules

1. `when`: Compile the expression string to `CompiledRuntimeValue<boolean>`. At dispatch, evaluate and skip if false.
2. `args`: Compile to `CompiledRuntimeValue<Record<string, unknown>>`.
3. `then`, `onError`, `onSettled`, `parallel`: Recursively compile each branch action to `CompiledActionNode[]`.
4. Targeting and control fields are passed through unchanged because they are structural configuration, not expression payload.

Reasons for this choice:

1. one payload carrier keeps action parsing and diagnostics simple
2. payload and targeting stay separate, so authors can tell whether a field changes data or chooses a target
3. compile-time action validation becomes narrower because each built-in action can demand one DTO shape under `args`
4. runtime execution no longer needs fallback shape inference, which reduces branching and ambiguity

For write actions, the authoring baseline is also `args`-first:

```json
{
  "action": "setValue",
  "args": {
    "path": "config.host",
    "value": "127.0.0.1"
  }
}
```

```json
{
  "action": "setValues",
  "args": {
    "path": "config",
    "values": {
      "host": "127.0.0.1",
      "port": 8080
    }
  }
}
```

`setValues.args.path` defines the base path. When present, keys inside `args.values` are relative to that base path. Without `args.path`, `args.values` keys are ordinary target paths.

Reasons for this choice:

1. `setValue` and `setValues` share the same mental model: optional base path plus write payload
2. `path` is shorter and matches the existing runtime vocabulary used by scope reads, writes, validation, and dependency tracking
3. the older `dataPath` name would blur write-path semantics with other legacy publication terminology, so `path` stays the canonical write DTO field
4. `setValues.args.path` allows concise subtree patching without forcing every patch key to repeat the same prefix

### Static Optimization Hint

`CompiledActionProgram.isFullyStatic` indicates whether all nodes contain only static values. When true, the runtime may skip state allocation and dependency tracking for the action program.

## `ActionSchema` Baseline

Current typed schema fields already include control-flow carriers such as:

- `action`
- `args`
- `when`
- `parallel`
- `retry`
- `timeout`
- `debounce`
- `continueOnError`
- `then`
- `onError`

Built-in platform actions use plain camelCase selectors such as `ajax`, `setValue`, `refreshSource`, `openDialog`, `openDrawer`, `closeSurface`, and `showToast`.

`args` is the only author-visible payload carrier.

Reasons for this choice:

1. one payload carrier reduces schema surface area and author confusion
2. built-in actions, component actions, and namespace actions all follow the same payload entry point
3. control-flow fields remain visually distinct from payload fields, which keeps action graphs readable
4. runtime and compiler can reject malformed actions earlier because they do not need to guess which top-level fields were intended as payload

Instance and imported capabilities keep explicit selector forms such as `component:<method>` and `namespace:method`.

## `ActionResult` Baseline

The normalized `ActionResult` vocabulary includes:

- `ok`
- `cancelled`
- `skipped`
- `timedOut`
- `data`
- `results`
- `attempts`
- `error`

### Result Classes

For control-flow purposes, action results fall into three classes:

1. `success-class`: `ok === true` and not `skipped`, not `cancelled`, not `timedOut`
2. `failure-class`: `ok === false` or `cancelled === true` or `timedOut === true`
3. `neutral-class`: `skipped === true`

These classes define branch behavior. They are not optional interpretation hints.

## Chained Result Context

Actions executing inside `then` or `onError` evaluate with a reserved transient branch-result context.

`onSettled` uses the same reserved branch-result context and reads the original triggering result rather than any replacement result returned by `then` or `onError`.

Reserved names are:

- `result`: the triggering `ActionResult`
- `error`: `result.error` when the triggering result is `failure-class`; otherwise `undefined`
- `prevResult`: the prior action result in the current chain when one exists

Rules:

1. `result` is the canonical schema-visible name for the triggering `ActionResult`
2. `error` is a convenience alias for `result.error`, not an independent channel
3. `prevResult` aligns with `ActionContext.prevResult` on the runtime side
4. these names are reserved for chained-action evaluation and must not be published into ordinary scope as ambient data
5. `then`, `onError`, `args`, `value`, `values`, and nested `when` expressions may read this branch-result context

## Control-Flow Rules

### `when`

1. `when` is a structured precondition on one action node
2. if `when` evaluates false, dispatch returns a normal `ActionResult` with `skipped: true`
3. a skipped step is `neutral-class`, not `success-class`
4. `when` is also the canonical exported way to express optional node execution; a future visual authoring tool may wrap this in richer UI, but exported semantics stay on `when`

### `then`

1. `then` executes only for `success-class`
2. `then` reads the triggering result through the reserved chained-result context
3. `then` may be a single action or an ordered action list under the narrower schema contract that owns that shape

### `onError`

1. `onError` executes only for `failure-class`
2. `onError` does not execute for `success-class` or `neutral-class`
3. if `onError` is absent, framework fallback error handling applies
4. actions inside `onError` may themselves have their own `onError`
5. a child failure inside `onError` does not recursively retrigger the parent `onError`; it is handled by that child's own failure handling or by framework fallback

### `continueOnError`

1. `continueOnError` affects only whether the main sequential chain aborts after a failed step
2. it does not convert a `failure-class` result into `success-class`
3. it does not decide whether `onError` runs

### `onSettled`

1. `onSettled` executes for `success-class` and `failure-class` results
2. `onSettled` does not execute for `neutral-class` skipped results in the current baseline
3. on the success path, `onSettled` runs after `then`
4. on the failure path, `onSettled` runs after `onError`
5. `onSettled` is side-effect-only for chain propagation and does not replace the result returned to the outer sequential chain
6. if `onSettled` itself fails, runtime reports that failure through the ordinary framework/plugin error path, while preserving the original triggering result as the returned chain result

### Branch Exclusivity

`then` and `onError` are sibling control-flow branches. They do not both execute for one result.

## `parallel`

`parallel` is the aggregate action node for concurrent child dispatch.

Rules:

1. all child actions are dispatched concurrently
2. aggregate `ActionResult.results` contains one child `ActionResult` per child action in stable input order
3. the aggregate result is `success-class` only if every child is `success-class` or `neutral-class`
4. if any child is `failure-class`, the aggregate result is `failure-class`
5. `parallel` does not automatically cancel sibling actions when one child fails
6. `then` or `onError` attached to the aggregate node read the aggregate `ActionResult`
7. when the aggregate node has downstream `then` or `onError`, child branches join into the aggregate result before that downstream branch is evaluated

## Framework Fallback Error Handling

If no explicit `onError` handles a `failure-class` result, the framework should provide a default observable failure path.

Recommended fallback rule:

1. surface an error toast or equivalent host notification
2. message selection priority is `error.userMessage` -> `error.message` -> generic fallback text
3. duplicate same-turn same-source fallback notifications should be deduplicated
4. localization of fallback text belongs to the host environment

## `Reaction` Versus `Action Algebra`

Use `then` and `onError` when the next step depends on completion, success, or failure of the current action.

Use `Reaction` when the trigger condition is a watched `Value` over time.

Do not use `Reaction` as a substitute for immediate action branching, and do not stretch `Action Algebra` into a long-running workflow engine.

## Relation To Other Systems

- `Capability` remains the authority primitive that actually performs effects
- `Operation Control` provides shared timeout, cancellation, retry, debounce, dedup, and related execution control beneath consumer-specific semantics
- `Semantic Lifecycle Entry` may use `Action Algebra` to implement node-owned business pipelines such as form submit or dialog confirm

## Current Baseline Versus Convergence Target

At the time of writing, the active runtime already supports the main branch model described here, including:

- `when`
- `then`
- `onError`
- `parallel`
- `retry`
- `timeout`
- `debounce`
- sequential action-list execution
- `continueOnError`
- transient `result` / `error` / `prevResult` bindings for chained evaluation

Narrower docs should call out any subsystem-specific deviations explicitly instead of silently redefining the branch model.

## Related Documents

- `docs/architecture/frontend-programming-model.md`
- `docs/architecture/action-graph-authoring.md`
- `docs/architecture/action-scope-and-imports.md`
- `docs/architecture/api-data-source.md`
- `docs/architecture/form-validation.md`
- `docs/architecture/flux-core.md`
