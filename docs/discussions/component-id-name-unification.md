# Discussion: Unify componentId and componentName

## Status

Adopted — 方案 B 已落地。`componentName` 从 targeting 类型中移除，`resolve()` 先匹配 `handle.id` 再匹配 `handle.name`。

## Background

Flux's component targeting currently uses two separate properties:

- `componentId` — matches `handle.id` (from schema `id` attribute, intended unique)
- `componentName` — matches `handle.name` (from schema `name` attribute, can be shared)

Both are available on every `ActionShapeFields` (all action schemas inherit them).
The `resolve()` function has **separate lookup paths** for each.

In practice, callers frequently write fallbacks like `formModel.name || formModel.id`,
indicating they don't care which field matches — they just want to find the component.

## Problem

Two properties for the same conceptual operation ("find this component") creates:

1. **Cognitive overhead** — schema authors must decide which to use
2. **Inconsistent usage** — some actions pass `componentId`, others `componentName`
3. **Redundant xpl code** — `componentName: formModel.name || formModel.id` everywhere
4. **Resolve logic duplication** — two separate code paths in `component-handle-registry.ts`

## Options

### Option A: Keep separate (current)

No change. `componentId` and `componentName` remain independent properties.

**Pros:**

- Maximum precision — caller explicitly declares intent (id vs name)
- No ambiguity — `componentId` only matches `handle.id`, never `handle.name`

**Cons:**

- API surface remains wide
- Callers still write `name || id` fallbacks
- Two resolve code paths to maintain

### Option B: Single `componentId`, resolve checks id first then name (recommended)

Remove `componentName` from `ActionShapeFields`. Keep only `componentId`.
`resolve()` logic:

```
1. Check handlesById[componentId] → if found, return
2. Check handlesByName[componentId] → if found, return
3. Walk children (DFS), then parent
```

**Pros:**

- One property, one mental model
- Existing schemas using `componentName` migrate trivially (rename to `componentId`)
- Resolve logic is unified — one code path
- id-first gives deterministic behavior when id and name spaces overlap
- Backward compatible at runtime: `handle.id` and `handle.name` still exist on handles

**Cons:**

- Cannot explicitly target "by name only, ignoring id matches"
  - In practice this is never needed — if you know the name, and no id collides, it works
  - If collision exists, it's a schema design problem, not an API problem
- If `handle.id === "foo"` and a different `handle.name === "foo"`, targeting
  `componentId: "foo"` always hits the id one. The name-only handle is shadowed.
  - Acceptable: ids are meant to be unique identifiers; if someone uses a name
    that collides with an existing id, that's a naming conflict to fix.

### Option C: Single `componentId`, resolve checks both simultaneously

Remove `componentName`. `resolve()` collects handles where
`handle.id === componentId || handle.name === componentId`. If matches from both
fields exist, throw Ambiguous.

**Pros:**

- Most thorough — no shadowing
- Explicitly surfaces id/name collisions

**Cons:**

- Throws Ambiguous in cases that Option B would silently resolve
- Surprising behavior: adding a new component with `name="X"` can break existing
  `componentId: "X"` targeting if another component already has `id="X"`
- Over-engineered for a rare edge case

## Analysis: When does id/name collision actually happen?

| Scenario                      | id           | name         | Collision?                                   |
| ----------------------------- | ------------ | ------------ | -------------------------------------------- |
| Form                          | `"editForm"` | `"editForm"` | No — id and name are the same value          |
| Form + its field              | `"editForm"` | `"userName"` | No — different values                        |
| Two forms (different dialogs) | `"editForm"` | `"editForm"` | No — each in separate child registry         |
| Field + another field         | N/A          | `"status"`   | Only if same registry — handled by Ambiguous |

Collisions between a component's `id` and another component's `name` are **extremely
rare** in well-designed schemas. When they do occur, Option B's id-first resolution
gives predictable behavior.

## Recommendation

**Option B.** Merge into single `componentId`, resolve checks `handle.id` first,
then `handle.name`. This simplifies the API without practical loss.

### Migration

1. `CompiledActionTargeting`: remove `componentName`, keep `componentId`
2. `ActionShapeFields`: remove `componentName`
3. `resolveInScope`: unify lookup — check `handlesById` then `handlesByName`
4. `ComponentActionInvocation.target`: remove `componentName`
5. Existing schemas using `componentName` → rename to `componentId`
6. Adapter metadata (`ActionResult.componentName`) → derive from resolved handle

### Impact on submitForm

With the surface form auto-discovery (already implemented), `submitForm` works
zero-config. The `componentId` targeting is only needed for edge cases (multiple
forms, explicit targeting). Merging simplifies this further — one property for all
targeting needs.
