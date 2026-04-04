# 21 frameWrap Schema Attribute Plan

> Plan Status: completed
> Last Reviewed: 2026-04-04


> Date: 2026-03-31
> Status: Completed on 2026-04-04
> Triggered by: `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md`

---

## Implementation Status

Completed on 2026-04-04.

Implemented in the current workspace:

- `BaseSchema.frameWrap` and `FrameWrapMode` added in `packages/flux-core/src/types/schema.ts`
- `resolveFrameWrapMode()` added in `packages/flux-react/src/node-renderer.tsx`
- `NodeRenderer` now resolves label/group/none wrapping per schema instance
- integration and unit coverage added in `packages/flux-react/src/index.test.tsx`
- direct and contextual docs listed below were updated during implementation

## 0. Background

`wrap: boolean` on `RendererDefinition` is a **registration-time** declaration — it tells `NodeRenderer` whether this component type should be wrapped in `FieldFrame` by default. It is shared by all instances of that renderer.

Some renderers (e.g. `code-editor`) may need FieldFrame wrapping in form contexts (with label, required indicator, error display) but NOT in standalone contexts. There is currently no per-instance override.

Bug #19 exposed a specific symptom: `FieldFrame` renders a `<label>` wrapper, and HTML spec causes `<label>` to forward clicks to its first labelable descendant. Inside a code-editor that had a `<button>` for fullscreen toggle, clicking anywhere in the editor text area would trigger that button.

**Code-editor 已通过 `<span role="button">` 替代 `<button>` 修复（commit `c5027b8`），无需迁移到 `frameWrap`。** 此计划是为未来其他遇到类似需求的 renderer 提供的通用框架级方案。

## 1. Design

### New schema attribute: `frameWrap`

Add `frameWrap` to `BaseSchema` as an optional per-instance override for FieldFrame wrapping behavior.

```typescript
// flux-core types.ts — BaseSchema
frameWrap?: boolean | 'label' | 'group' | 'none';
```

| `frameWrap` value | Behavior |
|---|---|
| unset (undefined) | Follow renderer definition's `wrap` (current default) |
| `true` / `'label'` | Force FieldFrame with `<label>` layout |
| `'group'` | Force FieldFrame with `<fieldset>` layout |
| `false` / `'none'` | Skip FieldFrame entirely |

### Semantic boundary: `wrap` vs `frameWrap`

| Aspect | `wrap` (RendererDefinition) | `frameWrap` (BaseSchema) |
|---|---|---|
| Level | Registration-time, per renderer type | Per schema instance |
| Meaning | "This renderer is designed to work inside FieldFrame" | "This instance wants/doesn't want FieldFrame" |
| Override | Cannot be changed per instance | Overrides `wrap` for this instance |
| When `wrap: false` | Renderer is NOT FieldFrame-compatible | `frameWrap: true` should be **ignored** — the renderer hasn't opted into FieldFrame semantics |

**Key rule**: `frameWrap` can only **suppress** or **restyle** wrapping, never **enable** it for a renderer that declared `wrap: false`. A renderer must declare `wrap: true` to signal FieldFrame compatibility before `frameWrap` can customize it.

### Resolution logic in NodeRenderer

```
function resolveWrapMode(definition, schema):
  if definition.wrap is falsy:
    return 'none'                          // renderer not FieldFrame-compatible

  const fw = schema.frameWrap
  if fw === false || fw === 'none':
    return 'none'                          // instance opts out
  if fw === 'group':
    return 'group'                         // instance wants fieldset
  if fw === true || fw === 'label':
    return 'label'                         // instance explicitly wants label
  // fw is unset
  return 'label'                           // default: use label (current behavior)
```

`FieldFrame` already accepts `layout: 'default' | 'checkbox' | 'radio'`, so `'group'` maps to `layout: 'checkbox'` (which renders `<fieldset>`).

### New field rule

Add `frameWrap` to `SchemaFieldRule` as a `meta` kind field so the compiler passes it through without treating it as a renderer prop:

```typescript
{ key: 'frameWrap', kind: 'meta' }
```

The compiler or `NodeRenderer` reads `schema.frameWrap` directly (it is on the raw schema, not a resolved prop).

## 2. Implementation Steps

### Step 1: Add type and field rule

**Package**: `flux-core`

- Add `frameWrap?: boolean | 'label' | 'group' | 'none'` to `BaseSchema` in `types.ts`
- Add `FrameWrapMode` type alias if desired
- No new field rule needed — `frameWrap` is read directly from `schema.frameWrap` in `NodeRenderer`, similar to how `schema.required` and `schema.name` are read today

### Step 2: Update NodeRenderer resolution

**Package**: `flux-react`

File: `packages/flux-react/src/node-renderer.tsx`

Current logic (line 289):
```typescript
if (props.node.component.wrap) {
  return <FieldFrame ...>{element}</FieldFrame>
}
```

New logic:
```typescript
const shouldWrap = resolveShouldWrap(props.node.component.wrap, props.node.schema.frameWrap);

if (shouldWrap !== 'none') {
  const frameLayout = shouldWrap === 'group' ? 'checkbox' : 'default';
  return <FieldFrame layout={frameLayout} ...>{element}</FieldFrame>
}
```

Helper function (can be inline or extracted):
```typescript
function resolveShouldWrap(
  definitionWrap: boolean | undefined,
  schemaFrameWrap: boolean | 'label' | 'group' | 'none' | undefined
): 'label' | 'group' | 'none' {
  if (!definitionWrap) return 'none';

  if (schemaFrameWrap === false || schemaFrameWrap === 'none') return 'none';
  if (schemaFrameWrap === 'group') return 'group';
  // true, 'label', or undefined → default label wrapping
  return 'label';
}
```

### Step 3: Add unit tests

**Package**: `flux-react`

- Test `resolveShouldWrap` with all combinations:
  - `definitionWrap: false` → always `none` regardless of `frameWrap`
  - `definitionWrap: true` + `frameWrap: undefined` → `label` (backward compat)
  - `definitionWrap: true` + `frameWrap: false` → `none`
  - `definitionWrap: true` + `frameWrap: 'none'` → `none`
  - `definitionWrap: true` + `frameWrap: 'group'` → `group`
  - `definitionWrap: true` + `frameWrap: true` → `label`
  - `definitionWrap: true` + `frameWrap: 'label'` → `label`
- Integration test: render a `wrap: true` component with `frameWrap: false` and verify no `<label>` wrapper in output

### Step 4: Update playground

Add a renderer using `frameWrap: false` to demonstrate the feature. Code-editor 无需改动（已通过 `<span>` 修复），可用其他 renderer（如一个独立使用、不需要 label 包裹的控件）来演示。

## 3. Docs To Update

### Must update (directly affected)

| Doc | What to change |
|---|---|
| `docs/architecture/field-frame.md` | Document `frameWrap` as the per-instance control for FieldFrame wrapping. Update the "Opt-in per control" section and the AMIS comparison table row `wrap: false`. Add `frameWrap` to the usage examples. |
| `docs/architecture/renderer-runtime.md` | Document the `frameWrap` resolution logic in the renderer component contract section. Mention it as a schema-level override that sits alongside renderer definition's `wrap`. |
| `docs/references/renderer-interfaces.md` | Add `frameWrap` to the `BaseSchema` field listing in the Core Schema Types section. |
| `docs/references/flux-json-conventions.md` | Add `frameWrap` as a recognized schema attribute with its allowed values and semantics. |
| `docs/references/maintenance-checklist.md` | Add a change trigger entry for `frameWrap` / FieldFrame wrapping changes. |
| `docs/architecture/field-metadata-slot-modeling.md` | Mention `frameWrap` as a way to opt out of field chrome (label, error, etc.) at the schema level. |

### Should update (contextual)

| Doc | What to change |
|---|---|
| `docs/bugs/19-code-editor-label-click-forwarding-triggers-fullscreen-fix.md` | Add note: code-editor 已通过 `<span role="button">` 修复，不需要 `frameWrap` 迁移。 |
| `docs/logs/index.md` | Entry when this plan is implemented. |

## 4. Scope and Risk

### Low risk

- `frameWrap` is additive — unset values preserve current behavior
- Only touches `flux-core` (type), `flux-react` (resolution logic), and docs
- No changes to `FieldFrame` component itself

### Backward compatibility

- All existing schemas without `frameWrap` behave identically
- `RendererDefinition.wrap` semantics unchanged
- No breaking changes to `FieldFrame` props

### Out of scope

- Changing `FieldFrame` to use `<div>` instead of `<label>` (separate concern)
- Adding `frameWrap` to `RendererDefinition` (stays schema-only)
- Any changes to form validation or field state management
- Migrating code-editor to use `frameWrap` (already fixed via `<span role="button">`)


