# Component Resolution

## Purpose

This document defines how component-targeted actions resolve their live targets.

It depends on the clean-slate template/instance model in:

- `docs/architecture/template-instantiation-and-node-identity.md`

This document is intentionally narrow. It does not redefine template ids, repeated-instance identity, scope ownership, or debugger identity.

## Main Rule

Component resolution should target live node instances, not raw schema nodes.

Compile-time lowering may point to template structure, but runtime resolution must end at a live `cid` or a live `ComponentHandle`.

Compile-time lowering should prefer structural plans, but the final mounted target is a live `cid`. `NodeLocator` must not be used as the runtime target wrapper.

## Target Categories

### 1. Canonical runtime target

The canonical mounted target is a live `cid`.

Repeated-aware targeting may additionally carry `instancePath`, but runtime should not wrap that pair into a `NodeLocator` object.

Canonical singleton rule:

- singleton nodes omit `instancePath`
- `undefined` is the canonical singleton representation
- `[]` must be normalized to the same singleton case and must not represent a distinct identity

### 2. Compile-time static target plan

For a singleton target known at compile time:

```ts
interface StaticTargetPlan {
  kind: 'static';
  templateNodeId: number;
}
```

Runtime resolves this plan to the mounted singleton instance and obtains its live `cid`.

### 3. Compile-time repeated target plan

For a target inside a repeated boundary:

```ts
interface RepeatedTargetPlan {
  kind: 'repeated';
  templateNodeId: number;
  repeatedTemplateId: string;
}
```

`repeatedTemplateId` must identify exactly one repeated boundary inside the compiled template.

Runtime combines this with the current repeated-instance context, then resolves the matching mounted instance and obtains its live `cid`.

### 4. Explicit repeated-instance selector

For cross-instance repeated targeting, the action may carry an explicit repeated-instance selector:

```ts
interface RepeatedInstanceSelector {
  repeatedTemplateId: string;
  instanceKey: string;
  templateNodeId: number;
}
```

This is the preferred path when the caller means "that specific row/item instance", not "the current repeated instance".

Constraint for nested repeated structures:

- `RepeatedInstanceSelector` is only unambiguous when `repeatedTemplateId + instanceKey` identifies a unique repeated instance in the current runtime/template context
- if nested or cross-owner repeated structures make that selector ambiguous, callers should carry explicit repeated context rather than reintroducing a `NodeLocator` wrapper

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

1. if action already carries `_targetCid`, resolve directly
2. if action carries `StaticTargetPlan`, resolve the singleton live instance and obtain its `cid`
3. if action carries `RepeatedTargetPlan`, combine with current repeated-instance context and resolve the matching live instance
4. otherwise, resolve `componentId` / `componentName` inside the visible registry boundary

Canonical result contract:

```ts
type ResolutionResult =
  | { kind: 'resolved'; cid: number; instancePath?: readonly InstanceFrame[]; handle?: ComponentHandle }
  | { kind: 'notMaterialized'; instancePath?: readonly InstanceFrame[] }
  | { kind: 'notFound' }
  | { kind: 'ambiguous'; matches: ReadonlyArray<{ cid?: number; instancePath?: readonly InstanceFrame[] }> };
```

Structural target resolution is runtime-owned. The component registry may contribute live-handle lookup and selector lookup, but it is not the canonical source of structural/template truth.

```ts
function resolveTarget(target: ActionTarget, ctx: ResolutionContext): ResolutionResult {
  if (target._targetCid !== undefined) {
    return runtime.resolveCid(target._targetCid);
  }

  if (target.staticPlan) {
    return runtime.resolveStaticTarget(target.staticPlan);
  }

  if (target.repeatedPlan) {
    return runtime.resolveRepeatedTarget(target.repeatedPlan, ctx.instancePathFor(target.repeatedPlan.repeatedTemplateId));
  }

  if (target.repeatedSelector) {
    return runtime.resolveRepeatedSelector(
      target.repeatedSelector,
      ctx.instancePathForExplicit(target.repeatedSelector.repeatedTemplateId, target.repeatedSelector.instanceKey)
    );
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
- repeated-local targets resolve by structural target plan plus repeated context, then end at a live `cid`

There is no need for a `NodeLocator` wrapper. Structural targeting is compile-time/runtime-plan based; mounted execution ends at a live `cid`.

Selectors inside repeated content follow this rule:

- `componentId` / `componentName` are convenience lookups in the current visible registry boundary
- they are suitable for targeting the current repeated instance when that boundary is unambiguous
- they are not the preferred cross-instance targeting mechanism
- cross-instance operations should use `RepeatedInstanceSelector` plus explicit repeated context when needed

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
