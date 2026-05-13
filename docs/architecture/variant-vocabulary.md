# Variant Vocabulary Normalization

## Purpose

This document defines how Flux names visual and semantic styling choices in schema and UI component contracts.

The short rule is:

- `variant` means **component-local visual form**.
- `intent` means **semantic action intent**.
- `level` means **passive status severity**.
- Business discriminants must use domain names such as `kind`, `case`, `branchKey`, or `discriminator`, not styling `variant`.

## Why This Needs A Rule

The word `variant` is overloaded in the current codebase:

- shadcn-style UI components use `variant` for cva visual branches.
- Flux public schema exposes `button.variant` and `tabs.variant`.
- Flow Designer toolbar currently uses `variant: 'default' | 'accent' | 'danger'` and Report Designer toolbar currently uses `variant: 'default' | 'primary' | 'danger'` for domain action semantics.
- `variant-field` uses `variant` as a business data discriminant in tests and examples.

These are different concepts. Keeping one field name for all of them makes authoring ambiguous and makes validator/editor metadata harder to reason about.

## How shadcn/ui Uses `variant`

shadcn/ui does not define one global `variant` enum. Each component owns its own cva variant vocabulary.

Representative upstream-style Button vocabulary is:

```ts
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
```

Important points:

- `default` is the filled primary-looking button because it uses the theme `primary` token.
- shadcn does **not** use `variant="primary"` for Button.
- shadcn uses `destructive`, not `danger`, for the destructive Button visual.
- Other components may have different variant sets, for example Alert commonly has only `default | destructive`.
- Local projects may extend copied shadcn components, but that does not make the added values globally valid.

Representative current `@nop-chaos/ui` examples:

| Component                              | Current UI/private variant values                                                       | Public schema status                                             |
| -------------------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `Button`                               | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`                       | Public through `button.variant`                                  |
| `TabsList`                             | `default`, `line`                                                                       | Public through `tabs.variant`                                    |
| `Badge`                                | `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`, `success`, `warning` | UI-private; Flux schema should prefer `level` for passive status |
| `Alert`                                | `default`, `destructive`                                                                | UI-private unless an alert renderer exposes it explicitly        |
| `DropdownMenuItem` / `ContextMenuItem` | `default`, `destructive`                                                                | UI-private action item visual branch                             |
| `SidebarLayout`                        | `sidebar`, `floating`, `inset`                                                          | UI-private layout mode                                           |
| `FieldLegend`                          | `legend`, `label`                                                                       | UI-private rendering mode                                        |

## Naming Matrix

| Concept                        | Field name           | Values                                                         | Meaning                         | Example                                             |
| ------------------------------ | -------------------- | -------------------------------------------------------------- | ------------------------------- | --------------------------------------------------- |
| Visual form of one component   | `variant`            | Component-owned, e.g. `default`, `outline`, `ghost`, `link`    | How this component is drawn     | `{ "type": "button", "variant": "outline" }`        |
| Action semantics               | `intent`             | `neutral`, `primary`, `danger`, `warning`, `success`, `info`   | Why this action matters         | `{ "type": "toolbar-button", "intent": "primary" }` |
| Passive visual status severity | `level`              | Renderer-owned, usually `info`, `success`, `warning`, `danger` | Status/pill severity            | `{ "type": "badge", "level": "warning" }`           |
| Size/density                   | `size`               | Component-owned, e.g. `sm`, `lg`, `icon`                       | Geometry, not color/meaning     | `{ "type": "button", "size": "sm" }`                |
| Layout mode                    | domain-specific name | e.g. `mode`, `layout`, `placement`                             | Structural mode                 | `{ "mode": "sidebar" }`                             |
| Business discriminant          | domain-specific name | Domain-owned                                                   | Which data shape/case is active | `{ "kind": "expr" }`                                |

## Normative Rules

### 0. Current Enforcement Status

This document defines authoring vocabulary, not a fully enforced compiler guarantee.

Current compiler-integrated validation can detect many structural issues and unknown bare properties, but it does not generically validate ordinary renderer prop values against `propContracts.shape` literal/union ranges. For example, `button.variant: "primary"` is an invalid authoring value by this document, but current `validateSchema(...)` / `strictValidation` does not reject it solely because `primary` is outside the `button.variant` enum.

Relevant implementation baseline:

- `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts` uses `propContracts` and `propSchema` to build accepted key sets.
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts` reports unknown keys and invokes renderer-owned `schemaValidator` hooks.
- `packages/flux-renderers-basic/src/basic-renderer-definitions.ts` declares `button.variant` as a union of literals for tooling/metadata.
- `packages/flux-compiler/src/schema-compiler/host-action-validation.ts` validates `union`/`literal` shapes for host capability action args, but that path is not applied to ordinary renderer props.

Any future prop-value validation should enforce this vocabulary in compiler diagnostics, especially for closed renderer prop contracts.

### 1. Do Not Create A Global `variant` Enum

`variant` is component-local. A value valid for one component is not automatically valid for another component.

Allowed:

```json
{ "type": "button", "variant": "outline" }
{ "type": "tabs", "variant": "line" }
```

Not allowed as a general assumption:

```json
{ "type": "any-component", "variant": "primary" }
```

### 2. Keep Public Button Variants shadcn-Compatible

For public `button.variant`, use the shadcn-compatible vocabulary:

```ts
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
```

Do not add `primary`, `danger`, `warning`, or `success` to `button.variant`.

If a schema author means a primary action, the direct shadcn-compatible Button form is:

```json
{ "type": "button", "label": "Save", "variant": "default" }
```

If a higher-level toolbar wants semantic authoring, expose `intent` and map it internally:

| `intent`  | Suggested Button mapping                     | Notes                                                |
| --------- | -------------------------------------------- | ---------------------------------------------------- |
| `primary` | `variant="default"`                          | Filled primary action                                |
| `neutral` | `variant="outline"` or `variant="secondary"` | Context decides weight                               |
| `danger`  | `variant="destructive"`                      | Flux semantic word maps to shadcn destructive visual |
| `warning` | custom classes or component-specific mapping | Not a standard shadcn Button variant                 |
| `success` | custom classes or component-specific mapping | Not a standard shadcn Button variant                 |
| `info`    | custom classes or component-specific mapping | Not a standard shadcn Button variant                 |

### 3. Use `intent` For New Toolbar Action Contracts

Toolbar/workbench buttons are often authored by semantic role: save, delete, publish, export, retry.

Those should not overload `variant` with domain values such as `primary`, `accent`, or `danger`.

This is target guidance for new or migrated contracts. Existing Flow Designer and Report Designer toolbar schemas still use `variant` today and remain live until a migration is explicitly implemented.

Preferred new contract:

```ts
type ActionIntent = 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';

interface ToolbarButtonItem {
  type: 'button';
  intent?: ActionIntent;
}
```

Examples:

```json
{ "type": "button", "label": "Save", "intent": "primary" }
{ "type": "button", "label": "Delete", "intent": "danger" }
{ "type": "button", "label": "Retry", "intent": "warning" }
```

Migration guidance for existing domain toolbar fields:

| Current field/value                     | Preferred field/value                                       | Reason                                                                   |
| --------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------ |
| `variant: "primary"`                    | `intent: "primary"`                                         | Semantic action importance, not visual form                              |
| `variant: "accent"`                     | `intent: "primary"` or domain-specific `emphasis: "accent"` | `accent` is theme/domain language, not shadcn Button variant             |
| `variant: "danger"`                     | `intent: "danger"`                                          | Flux semantic word; maps to shadcn `destructive` when rendered as Button |
| `variant: "default"` in toolbar configs | omit `intent` or use `intent: "neutral"`                    | `default` is a fallback, not a semantic intent                           |

### 4. Use `level` For Passive Visual Status

Badges, status pills, alert summaries, and non-action visual messages carry severity rather than action intent.

Use `level` for visual/status renderers that own a passive status contract:

```ts
type StatusLevel = 'info' | 'success' | 'warning' | 'danger';
```

Examples:

```json
{ "type": "badge", "text": "Saved", "level": "success" }
{ "type": "badge", "text": "Unsaved", "level": "warning" }
{ "type": "alert", "body": "Delete failed", "level": "danger" }
```

Do not use `variant: "success"` or `variant: "warning"` in public Flux schema unless the component owner explicitly documents that as a component-private visual contract.

Exceptions:

- Action/runtime notification APIs currently use host notification levels `info | success | warning | error`, not visual status `danger`. This includes `showToast.args.level` and `RendererEnv.notify(...)`. Do not silently rewrite notification `error` to `danger` unless that API is intentionally migrated.
- Compiler, validation, and diagnostics APIs use diagnostic severity words such as `error` and `warning`. Do not translate diagnostic `error` to visual `danger` inside diagnostics contracts. If a visual renderer displays diagnostics as badges or pills, that renderer may map diagnostic severity to its own visual `level` vocabulary at the display boundary.

### 5. Keep `danger` And `destructive` At Different Layers

Use `danger` in Flux semantic schema fields such as `intent` and `level`.

Use `destructive` only when directly targeting shadcn-compatible UI component `variant` values.

Rationale:

- `danger` is a general semantic level and aligns with `info/success/warning/danger`.
- `destructive` is the shadcn Button visual branch name.
- Mapping `danger -> destructive` should happen inside renderer/UI adapter code.

### 6. Do Not Use Styling `variant` For Business Data Shape

For discriminated value editors, object unions, or domain cases, prefer a domain name:

| Avoid                                | Prefer                                               |
| ------------------------------------ | ---------------------------------------------------- |
| `variant: "expr"`                    | `kind: "expr"`                                       |
| `variant: "text"`                    | `kind: "text"`                                       |
| `activeVariant` for a value branch   | `activeKind`, `activeCase`, or `activeBranchKey`     |
| `detectVariantAction` for data shape | `detectKindAction` or domain-specific detection name |

The renderer named `variant-field` is historical terminology for a union-like field renderer. Inside values and future APIs, prefer domain-specific discriminants over a generic styling word.

## Decision Rules

When adding a new property or value, ask these questions in order:

1. Is this a visual branch of one component? Use `variant` and keep the values component-local.
2. Is this an action's meaning or importance? Use `intent` with `neutral/primary/danger/warning/success/info`.
3. Is this a passive status severity? Use `level` with `info/success/warning/danger`.
4. Is this shape discrimination or business state? Use a domain-specific name such as `kind`, `case`, or `branchKey`.
5. Is this structural layout? Use a structural name such as `mode`, `layout`, `placement`, or a component-specific prop.

## Current Target Vocabulary

Public schema targets should converge on this split:

```ts
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type TabsVariant = 'default' | 'line';
type ActionIntent = 'neutral' | 'primary' | 'danger' | 'warning' | 'success' | 'info';
type StatusLevel = 'info' | 'success' | 'warning' | 'danger';
```

Interpretation:

- `default` is only a component fallback visual variant.
- `primary` is an `intent`, not a `variant`.
- `danger`, `warning`, `success`, and `info` are semantic values for `intent` or `level`.
- `destructive` is only a shadcn-compatible visual variant value.

## Related Files

- `packages/ui/src/components/ui/button.tsx` - current shadcn-compatible Button variant source.
- `packages/ui/src/components/ui/tabs.tsx` - current TabsList variant source.
- `packages/flux-renderers-basic/src/schemas.ts` - public `button.variant` and `tabs.variant` schema contracts.
- `packages/flux-compiler/src/schema-compiler/shape-validation.ts` - current schema structural diagnostics path.
- `packages/flux-compiler/src/schema-compiler/shape-validation-utils.ts` - accepted-key metadata usage for `propContracts` / `propSchema`.
- `docs/references/flux-json-conventions.md` - JSON authoring naming conventions.
- `scripts/analyze-variant-vocabulary.mjs` - current repository scanner for `variant` definitions and usages.
