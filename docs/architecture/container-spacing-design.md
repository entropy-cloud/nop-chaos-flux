# Container Spacing Design

## Status: Final

## Overview

Flux provides out-of-box sensible spacing for page, form, fieldset, container, field-frame, and tabs renderers through theme-tunable CSS custom properties and `@layer base` default rules. No manual `className` is required for standard layouts. Schema authors can override spacing per-container via `gap` semantic props or `className`. Widget renderers (table, condition-builder, etc.) remain unaffected.

Within the container family, these defaults are intentionally asymmetric: `page`, `form`, `fieldset`, `tabs`, and `container` do not all mean the same kind of shell. In particular, `container` is the generic content-shell renderer, not a card/panel visual component, so its baseline includes internal body flow/gap but intentionally omits default padding.

## Architecture

Three layers, each independently overridable:

1. **Spacing tokens** — `--space-*` CSS custom properties in `theme-tokens`, globally adjustable per-theme.
2. **Default spacing CSS** — `flux-react/default-spacing.css` in `@layer base`, consuming the tokens. Tailwind utilities (`@layer utilities`) always override.
3. **Renderer integration** — `gap` semantic prop on Form/FieldSet and Container, with `data-flex` on Container marking the semantic flex-child path while default spacing still stays CSS-owned.

Facade bundle note:

- `@nop-chaos/flux` facade styling now composes the canonical package CSS sources via `@import '@nop-chaos/flux-react/default-spacing.css'` and `@import '@nop-chaos/flux-renderers-form/form-renderers.css'` instead of maintaining a hand-copied duplicate selector set
- facade-local CSS should stay limited to bundle-only root wrappers or truly facade-specific rules; field/form spacing selectors continue to be owned by the canonical package stylesheets above

## Spacing Tokens

Defined in `packages/theme-tokens/src/styles.css` `:root` block:

| Token                          | Default | Purpose                                   |
| ------------------------------ | ------- | ----------------------------------------- |
| `--space-page-body`            | 16px    | Page body padding                         |
| `--space-section-gap`          | 24px    | Gap between page sections                 |
| `--space-form-item-gap`        | 16px    | Gap between form body items               |
| `--space-fieldset-body-gap`    | 16px    | Gap between fieldset body items           |
| `--space-form-actions-gap`     | 12px    | Gap between form action buttons           |
| `--space-form-body-to-actions` | 16px    | Margin-top above form actions             |
| `--space-field-internal`       | 4px     | Internal field spacing (control-to-error) |
| `--space-field-label-gap`      | 8px     | Label-to-control gap (label-top)          |
| `--space-field-label-h-gap`    | 16px    | Label-to-control gap (label-left)         |
| `--space-tabs-content-gap`     | 16px    | Gap inside tabs content panel             |

Themes override these tokens in their theme blocks:

```css
:root[data-theme='glass'][data-mode='light'] {
  --space-page-body: 24px;
  --space-form-item-gap: 20px;
}
```

**Why concrete pixel values**: `theme-tokens` is standalone CSS loaded before Tailwind. Using `var(--spacing-4)` would create a load-order dependency. Concrete values keep `theme-tokens` self-contained.

**Why no scale tokens (`--space-1` through `--space-12`)**: Tailwind already provides `--spacing-1` through `--spacing-12`. Duplicating creates two sources of truth. Schema authors use Tailwind's `gap-4` directly; `--space-*` tokens are only for theme-level semantic overrides.

## CSS Layer Strategy

All default spacing rules live in `@layer base` so Tailwind utilities (`@layer utilities`) always override:

```css
@layer base {
  .nop-form > [data-slot='form-body'] {
    display: flex;
    flex-direction: column;
    gap: var(--space-form-item-gap);
  }
}
```

Without `@layer`, bare CSS rules would have higher effective priority than layered Tailwind utilities, breaking all overrides.

## Default Spacing Rules

File: `packages/flux-react/src/default-spacing.css`

### Page

| Selector                              | Rules                                                                                                   |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `.nop-page`                           | `display: flex; flex-direction: column`                                                                 |
| `.nop-page > [data-slot="page-body"]` | `display: flex; flex-direction: column; gap: var(--space-section-gap); padding: var(--space-page-body)` |

### Form

| Selector                                 | Rules                                                                                                                   |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `.nop-form`                              | `display: flex; flex-direction: column`                                                                                 |
| `.nop-form > [data-slot="form-body"]`    | `display: flex; flex-direction: column; gap: var(--space-form-item-gap)`                                                |
| `.nop-form > [data-slot="form-actions"]` | `display: flex; flex-direction: row; gap: var(--space-form-actions-gap); margin-top: var(--space-form-body-to-actions)` |

### FieldSet

| Selector               | Rules                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.nop-fieldset`        | `display: flex; flex-direction: column; min-inline-size: 0; border: 1px solid hsl(var(--border)); border-radius: var(--radius-sm); padding: 0 var(--space-form-item-gap) var(--space-form-item-gap)` |
| `.nop-fieldset legend` | `padding: 4px var(--space-field-label-gap); font-weight: 500; font-size: 0.875rem` (descendant — <legend> is inside <Collapsible>)                                                                   |

| `.nop-fieldset-body` | `display: flex; flex-direction: column; gap: var(--space-fieldset-body-gap)` (独立 class，不受嵌套结构影响) |

### Container

| Selector                                          | Rules                                                                    |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `.nop-container > [data-slot="container-body"]`   | `display: flex; flex-direction: column; gap: var(--space-form-item-gap)` |
| `.nop-container > [data-slot="container-header"]` | `margin-bottom: var(--space-field-label-gap)`                            |
| `.nop-container > [data-slot="container-footer"]` | `margin-top: var(--space-field-label-gap)`                               |

### Tabs content

| Selector                                                                                                                                                           | Rules                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| `.nop-flux-root [data-slot="tabs-content"], .nop-page [data-slot="tabs-content"], .nop-form [data-slot="tabs-content"], .nop-container [data-slot="tabs-content"]` | `display: flex; flex-direction: column; gap: var(--space-tabs-content-gap)` |

### FieldFrame

| Selector                                   | Rules                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------ |
| `.nop-field`                               | `display: flex; flex-direction: column; gap: var(--space-field-internal)`            |
| `.nop-field[data-label-align="top"]`       | `flex-direction: column; gap: var(--space-field-label-gap)`                          |
| `.nop-field[data-label-align="left"]`      | `flex-direction: row; align-items: flex-start; gap: var(--space-field-label-h-gap)`  |
| `.nop-field[data-label-align="right"]`     | Same row layout as `left`; label gets `justify-content: flex-end; text-align: right` |
| `.nop-field > [data-slot="field-control"]` | `display: flex; flex-direction: column; gap: var(--space-field-internal)`            |

### Field label/error/hint styling

Also in `default-spacing.css`: font-size, font-weight, color, and layout rules for `.nop-field [data-slot="field-label"]`, `.nop-field [data-slot="field-required"]`, `.nop-field [data-slot="field-error"]`, `.nop-field [data-slot="field-hint"]`, `.nop-field [data-slot="field-description"]`, `.nop-field [data-slot="field-remark"]`, `.nop-field [data-slot="field-label-remark"]`, and `.nop-field[data-label-align="left"]` label/control layout. These selectors are scoped to Flux-owned field wrappers and must not fall back to bare shared `[data-slot]` selectors that could style plain `@nop-chaos/ui` components outside Flux-owned roots.

## Container `data-flex` Attribute

When `ContainerRenderer` activates the flex-child path (semantic props `direction`, `gap`, `wrap`, `align` present), it adds `data-flex=""` to the inner body div. The attribute marks that the body layout is being shaped by semantic props rather than by the bare-path wrapper. Default spacing still remains in package CSS, while renderer code only adds explicit semantic classes or inline styles when the schema asked for them. This keeps the final owner split clean: CSS owns the default baseline, renderer code owns only author-requested overrides.

- CSS `flex-direction: column` providing the default column baseline that semantic classes such as `flex-row` or `flex-col` can override only when the schema explicitly requests them
- CSS default gap providing the shared default baseline until an explicit `gap` prop supplies a Tailwind utility or inline override
- Duplicate `display: flex` declarations on the semantic path remaining harmless, because the ownership distinction is about where defaults are declared, not whether the same computed value is restated

## Form/FieldSet `gap` Semantic Prop

`FormSchema` and `FieldsetSchema` accept `gap?: number | string`:

- Named token (`'none'|'xs'|'sm'|'md'|'lg'|'xl'`) → Tailwind gap class (e.g., `gap-4`)
- Number → inline `style` with `px` value
- CSS string → inline `style` with raw value

The resolved Tailwind gap class (in `@layer utilities`) overrides the CSS default (in `@layer base`) on the `[data-slot="form-body"]` / `[data-slot="fieldset-body"]` div.

## Per-Slot ClassName Override

Layout container schemas support per-slot `className` props that apply Tailwind classes to individual slot wrappers instead of the root element. This is the primary mechanism for grid layouts and other inner-body styling.

### Available Props

| Renderer  | Prop               | Target `data-slot` |
| --------- | ------------------ | ------------------ |
| Page      | `bodyClassName`    | `page-body`        |
| Page      | `headerClassName`  | `page-header`      |
| Page      | `footerClassName`  | `page-footer`      |
| Page      | `toolbarClassName` | `page-toolbar`     |
| Container | `bodyClassName`    | `container-body`   |
| Container | `headerClassName`  | `container-header` |
| Container | `footerClassName`  | `container-footer` |
| Form      | `bodyClassName`    | `form-body`        |
| Form      | `actionsClassName` | `form-actions`     |
| Fieldset  | `bodyClassName`    | `fieldset-body`    |
| Fieldset  | `titleClassName`   | `fieldset-title`   |
| Tabs      | `contentClassName` | `tabs-content`     |
| Tabs      | `toolbarClassName` | `tabs-toolbar`     |

### Usage

```json
{
  "type": "container",
  "bodyClassName": "grid grid-cols-2 gap-4",
  "body": [
    { "type": "text", "text": "Left" },
    { "type": "text", "text": "Right" }
  ]
}
```

Root `className` still targets the root element (no breaking change). All slot className props are optional; existing schemas work unchanged.

### Why not a `slots` configuration object

Per-slot props are simpler, match the existing pattern (`gap`, `direction`), and avoid nesting. A future `slots` object pattern is deferred.

## Override Mechanism

| What to override                       | Mechanism                                           |
| -------------------------------------- | --------------------------------------------------- |
| All instances globally                 | Override `--space-*` tokens in theme block          |
| Form body item gap                     | `gap` prop on Form schema                           |
| FieldSet body item gap                 | `gap` prop on FieldSet schema                       |
| Container gap with semantic props      | `gap` prop on Container (activates flex-child path) |
| Gap between form-body and form-actions | `className: "gap-1"` on `.nop-form` root            |
| All spacing to zero (host embedding)   | Set all `--space-*` tokens to `0px`                 |

**Limitation**: `className` on schema targets the root element (e.g., `.nop-form`), not internal slots like `[data-slot="form-body"]`. For per-slot styling control, use the `bodyClassName`, `headerClassName`, `footerClassName`, `toolbarClassName`, `actionsClassName`, `titleClassName`, or `contentClassName` props documented below.

## Container Inventory

| Container              | Default Internal Spacing                                                     | Mechanism                                       |
| ---------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- |
| Page                   | 24px gap between sections, 16px padding                                      | CSS `@layer base`                               |
| Form                   | 16px gap between fields, 12px between actions                                | CSS `@layer base`; override via `gap` prop      |
| FieldSet               | 16px gap + border/padding reset                                              | CSS `@layer base`; override via `gap` prop      |
| Container (bare)       | 16px gap between children                                                    | CSS `@layer base`                               |
| Container (flex-child) | Same default baseline, overridden only by explicitly authored semantic props | CSS `@layer base` + renderer semantic overrides |
| Flex                   | Zero                                                                         | Layout primitive — author sets `gap` prop       |
| Tabs content           | 16px gap between children                                                    | CSS `@layer base`                               |
| FieldFrame             | 4px internal, 8px label-top, 16px label-left                                 | CSS `@layer base`                               |

**Why Flex has no default gap**: Flex is a layout primitive. No single default is correct for toolbars, card grids, form rows, or tag lists.

**Why Container has no default padding**: `container` is the generic content-shell renderer. Default padding would make it look like a card/panel component and blur its boundary with future `card`/`panel` family renderers. Authors who want card-like chrome must declare padding explicitly.

## Known Limitations

- **Spacing accumulation**: Nested containers accumulate gaps (page 24px + container 16px + form 16px). For compact layouts, use `gap: "sm"` on inner containers or adjust theme tokens.
- **Container `className: "gap-2"` without semantic props**: Adds `gap-2` to `.nop-container` root, not to inner `[data-slot="container-body"]`. Use `bodyClassName` or semantic props to control inner body gap.
- **No `padding` semantic prop on Container**: Add padding via `className: "p-4"`.

## Rejected Alternatives

- **AMIS-style `margin-bottom` with `:last-child` zeroing**: CSS `gap` is simpler (declared on parent, no last-child rule), more predictable, and supported by all modern browsers.
- **Default gap in renderer component code**: Violates the "no hardcoded layout styles in renderer code" principle. Defaults belong in theme CSS (`@layer base`), not in JSX.
- **Scale tokens (`--space-1` through `--space-12`)**: Duplicates Tailwind's existing `--spacing-*` scale with no benefit.
- **Per-slot `className` support**: Added per-slot `className` props (`bodyClassName`, `headerClassName`, etc.) to Page, Container, Form, Fieldset, and Tabs schemas. Each prop routes classes to the corresponding `data-slot` wrapper.

## Future Work

- Responsive Grid renderer (CSS Grid with responsive column widths)
- Multi-column Form (`columns` prop)
- Container `padding` semantic prop
- Card renderer type (wrapping `@nop-chaos/ui` Card)
- Mobile responsive spacing (`@media` breakpoints adjusting `--space-*`)
- AMIS theme bridge mapping (`amis-theme-bridge.css`)
- Host embedding opt-out preset (`.flux-spacing-none`)
