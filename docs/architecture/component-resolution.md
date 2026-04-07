# Component Resolution

## Purpose

This document defines how component-targeted actions resolve their live targets.

It depends on the clean-slate template/instance model in:

- `docs/architecture/template-instantiation-and-node-identity.md`

This document is intentionally narrow. It does not redefine template ids, repeated-instance identity, scope ownership, or debugger identity.

## Main Rule

Component resolution should target live node instances, not raw schema nodes.

Compile-time lowering may point to template structure, but runtime resolution must end at a live `NodeLocator` or a live `ComponentHandle`.

Compile-time lowering must not directly target live `cid`, because `cid` is allocated at runtime per live node instance.

## Target Categories

### 1. Canonical runtime target

The canonical target is a `NodeLocator`.

```ts
interface NodeLocator {
  runtimeId: string;
  templateGraphId: string;
  templateNodeId: number;
  instancePath?: readonly InstanceFrame[];
}
```

If a caller already has a `NodeLocator`, no further semantic resolution is needed.

Canonical singleton rule:

- singleton nodes omit `instancePath`
- `undefined` is the canonical singleton representation
- `[]` must be normalized to the same singleton case and must not represent a distinct identity

### 2. Compile-time static target plan

For a singleton target known at compile time:

```ts
interface StaticTargetPlan {
  kind: 'static';
  templateGraphId: string;
  templateNodeId: number;
}
```

Runtime combines this with the current `runtimeId` to form a singleton `NodeLocator`.

Live `cid` resolution happens only after the singleton instance is materialized.

### 3. Compile-time repeated target plan

For a target inside a repeated boundary:

```ts
interface RepeatedTargetPlan {
  kind: 'repeated';
  templateGraphId: string;
  templateNodeId: number;
  repeatedTemplateId: string;
}
```

`repeatedTemplateId` must identify exactly one repeated boundary within the owning `templateGraphId`.

Runtime combines this with the current repeated-instance context to form the final `NodeLocator`.

Live `cid` resolution happens only after the repeated instance is materialized.

### 4. Explicit repeated-instance selector

For cross-instance repeated targeting, the action may carry an explicit repeated-instance selector:

```ts
interface RepeatedInstanceSelector {
  templateGraphId: string;
  repeatedTemplateId: string;
  instanceKey: string;
  templateNodeId: number;
}
```

This is the preferred path when the caller means "that specific row/item instance", not "the current repeated instance".

Constraint for nested repeated structures:

- `RepeatedInstanceSelector` is only unambiguous when `repeatedTemplateId + instanceKey` identifies a unique repeated instance in the current runtime/template context
- if nested or cross-owner repeated structures make that selector ambiguous, callers should use full `NodeLocator` instead of relying on `RepeatedInstanceSelector`

### 5. Author selectors

Author selectors are convenience selectors, not canonical targets:

- `componentId`
- `componentName`

They resolve inside the visible component-registry boundary.

## Compile-Time Lowering Rules

### Lower unique singleton `componentId`

If a `componentId` points to a unique singleton target inside the compiled template, lower it to `StaticTargetPlan`.

### Lower repeated-local targets only when the repeated boundary is explicit

If the source and target both live inside the same repeated template boundary, lowering to `RepeatedTargetPlan` is valid.

### Do not globally lower `componentName`

`componentName` should not lower to a global template id map.

Reasons:

- conditional branches may legally reuse names
- name uniqueness is naturally enforced by visible registry boundaries, not the whole compiled page tree

## Runtime Resolution Algorithm

Resolution order should be:

1. if action already carries `NodeLocator`, resolve directly
2. if action carries `StaticTargetPlan`, materialize singleton locator and resolve
3. if action carries `RepeatedTargetPlan`, combine with current repeated-instance context and resolve
4. otherwise, resolve `componentId` / `componentName` inside the visible registry boundary

Canonical result contract:

```ts
type ResolutionResult =
  | { kind: 'resolved'; locator: NodeLocator; handle?: ComponentHandle }
  | { kind: 'notMaterialized'; locator: NodeLocator }
  | { kind: 'notFound' }
  | { kind: 'ambiguous'; matches: readonly NodeLocator[] };
```

Structural target resolution is runtime-owned. The component registry may contribute live-handle lookup and selector lookup, but it is not the canonical source of structural/template truth.

```ts
function resolveTarget(target: ActionTarget, ctx: ResolutionContext): ResolutionResult {
  if (target.locator) {
    return runtime.resolveNode(target.locator);
  }

  if (target.staticPlan) {
    return runtime.resolveNode({
      runtimeId: ctx.runtimeId,
      templateGraphId: target.staticPlan.templateGraphId,
      templateNodeId: target.staticPlan.templateNodeId
    });
  }

  if (target.repeatedPlan) {
    return runtime.resolveNode({
      runtimeId: ctx.runtimeId,
      templateGraphId: target.repeatedPlan.templateGraphId,
      templateNodeId: target.repeatedPlan.templateNodeId,
      instancePath: ctx.instancePathFor(target.repeatedPlan.repeatedTemplateId)
    });
  }

  if (target.repeatedSelector) {
    return runtime.resolveNode({
      runtimeId: ctx.runtimeId,
      templateGraphId: target.repeatedSelector.templateGraphId,
      templateNodeId: target.repeatedSelector.templateNodeId,
      instancePath: ctx.instancePathForExplicit(
        target.repeatedSelector.repeatedTemplateId,
        target.repeatedSelector.instanceKey
      )
    });
  }

  return registry.resolveSelector({
    id: target.componentId,
    name: target.componentName
  }, ctx);
}
```

`ResolutionContext.instancePathFor(...)` and `instancePathForExplicit(...)` must reconstruct the full ancestor `instancePath`, not only the innermost repeated frame. Nested repeated targeting cannot safely work from one flat row/item token alone.

## Registry Boundary Rule

Selector resolution must follow visible component-registry boundaries, not lexical data scope chains.

That means:

- `ScopeRef` is not the component-resolution carrier
- component lookup crosses form/dialog/local registry boundaries only through explicit registry composition

## Repeated Structures

Table rows and future `type: 'loop'` use the same model:

- template compiles once
- each repeated instance contributes an `instancePath`
- repeated-local targets resolve by `templateGraphId + templateNodeId + instancePath`

There is no need for a fake compile-time global `cid` space.

Selectors inside repeated content follow this rule:

- `componentId` / `componentName` are convenience lookups in the current visible registry boundary
- they are suitable for targeting the current repeated instance when that boundary is unambiguous
- they are not the preferred cross-instance targeting mechanism
- cross-instance operations should use `RepeatedInstanceSelector` or a full `NodeLocator`

## Failure Modes

### Duplicate `componentId`

If compile-time analysis finds duplicate `componentId` definitions in the same compiled template where singleton lowering would be required, it must report the conflicting template paths and skip static lowering.

### Missing repeated context

If a repeated target plan is evaluated outside the required repeated-instance context, resolution must fail explicitly. It should not silently fall back to an arbitrary instance.

### Not materialized versus not found

If a target is structurally valid but not currently materialized because of virtualization, conditional rendering, or deferred fragment lifetime, resolution must return an explicit `notMaterialized` result rather than `notFound`.

### Ambiguous selector resolution

If runtime selector lookup by `componentId` or `componentName` is ambiguous inside the visible registry boundary, the result must be explicit ambiguity, not "pick first".

## Related Documents

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/renderer-runtime.md`
- `docs/architecture/debugger-runtime.md`
