# Container Spacing Design

## Status: Draft

## Problem Statement

Playground flux-basic examples show that container children and sibling containers have **no visible spacing**. Form fields stack with zero gap. Page sections collide. Containers have no internal padding. The root cause: layout renderers emit marker classes only and defer all visual styling to schema, but:

1. **No spacing tokens exist** in `theme-tokens/src/styles.css` — only color, radius, shadow tokens.
2. **No default gap/padding** is applied by any layout renderer (page, form, fieldset, container).
3. **`stack-*`/`hstack-*` utilities are playground-only** — they live in `apps/playground/src/styles-theme-utilities.css`, not in any shared package.
4. **FieldFrame internal CSS is playground-only** — `.nop-field` layout rules live in `apps/playground/src/styles.css`.
5. **No theme-level spacing scale** — AMIS defines `--gap-xs` through `--gap-xl` as CSS variables; we have nothing equivalent.

Every schema author must manually add `className: "stack-md"` or `gap: "md"` to every container, form, fieldset, and page — which is impractical for a low-code system.

## Design Goal

Provide a **theme-tunable spacing system** where:

1. **Out of the box**, pages, forms, fieldsets, and containers render with sensible spacing — no manual `className` required.
2. **The spacing is defined once** as CSS custom properties in `theme-tokens`, making it globally adjustable via theme.
3. **Schema authors can override** spacing per-container via semantic props (`gap`) or `className` on the root element.
4. **Widget renderers** (table, condition-builder, etc.) remain self-styled and unaffected.
5. **Tailwind utility classes always win** over default spacing rules.

## Reference: How AMIS Handles This

AMIS uses a three-layer spacing architecture:

### Layer 1: Gap Scale (CSS Custom Properties)

```scss
// _properties.scss
--gap-xs: var(--sizes-size-3);    // 4px
--gap-sm: var(--sizes-size-5);    // 8px
--gap-base: var(--sizes-size-7);  // 12px
--gap-md: var(--sizes-size-9);    // 16px
--gap-lg: var(--sizes-base-10);   // 20px
--gap-xl: var(--sizes-base-12);   // 24px
```

Each theme (`cxd`, `antd`, `dark`) provides concrete pixel values for `--sizes-size-*` and `--sizes-base-*`. Switching themes changes all spacing.

### Layer 2: Component-Level Spacing Variables

```scss
// _components.scss
--Form-item-gap: var(--sizes-base-12);             // 24px between form items
--Form-mode-default-labelGap: var(--sizes-size-5); // 8px label-to-control
--Form--horizontal-label-gap: var(--sizes-base-8); // 16px horizontal label gap
--Form-group-gutterWidth: var(--gap-md);            // 16px between grouped fields
--Page-body-padding: var(--gap-base);               // 12px page body padding
--Panel-bodyPadding: var(--gap-base);               // 12px panel body
--Panel-marginBottom: var(--sizes-base-10);         // 20px between panels
```

### Layer 3: Per-Container Defaults

| Container | Default Internal Spacing | Mechanism |
|-----------|------------------------|-----------|
| Form items | 24px vertical gap | `margin-bottom: var(--Form-item-gap)` on each `.Form-item`, last-child zeroed |
| Grid/HBox | 16px column gutters | Negative margin/pad pattern with `--Form-group-gutterWidth` |
| Page body | 12px padding | `padding: var(--Page-body-padding)` |
| Panel body | 12px padding | `padding: var(--Panel-bodyPadding)` |
| FieldSet (in Form) | 0px content padding, relies on Form-item-gap | Collapse content padding zeroed when inside Form |
| Wrapper | 16px padding (size="md") | `padding: var(--gap-md)` — only Wrapper defaults to `size='md'`; Container has no default size |

**Key insight**: AMIS applies **default spacing automatically** — schema authors get good spacing without writing any CSS. They override only when they want something different.

### AMIS Architectural Difference: `margin-bottom` vs CSS `gap`

AMIS uses `margin-bottom` with `:last-child` zeroing as its primary inter-element spacing mechanism. This proposal uses CSS `gap` on flex containers instead. These produce equivalent visual results (no trailing space after the last child), but `gap` is:
- Simpler (no `:last-child` rule needed)
- More predictable (declared on the parent, not each child)
- Supported by all modern browsers

One case `gap` cannot handle: **edge-to-edge negative-margin layout** (AMIS Grid/HBox gutter pattern). This is out of scope for this proposal and will be addressed when/if a responsive Grid renderer is added.

## Proposed Design: Theme-Spaced Defaults

### Principle: Sensible Defaults, Explicit Overrides

Current architecture says: "No default layout styles in layout renderers." This is correct for a **host-embedded** renderer where the host provides all styling. But for a **standalone low-code page** (the primary use case), it produces unusable output.

**Revised principle**: Layout renderers apply **theme-derived default spacing** that is:
- Defined as CSS custom properties (globally adjustable via theme)
- Applied inside `@layer base` so Tailwind utilities always override
- Visible in the DOM (inspectable, predictable)
- Sufficient for a good out-of-box experience

### Step 1: Spacing Tokens in theme-tokens

Add **semantic spacing tokens** (concrete pixel values, no Tailwind dependency) to `packages/theme-tokens/src/styles.css`:

```css
:root {
  /* Semantic spacing tokens — used by default-spacing.css, overridable per-theme.
     Named --space-{semantic-role}. Values are concrete px (not Tailwind var refs)
     so theme-tokens remains self-contained with no Tailwind load-order dependency. */
  --space-page-body: 16px;
  --space-section-gap: 24px;
  --space-form-item-gap: 16px;
  --space-fieldset-body-gap: 16px;
  --space-form-actions-gap: 12px;
  --space-form-body-to-actions: 16px;
  --space-field-internal: 4px;
  --space-field-label-gap: 8px;
  --space-field-label-h-gap: 16px;
  --space-tabs-content-gap: 16px;
}
```

**Why concrete pixel values instead of referencing Tailwind's `--spacing-*`**: The `theme-tokens` package is a standalone CSS file that may be loaded before Tailwind. Using `var(--spacing-4)` would create a load-order dependency. Concrete values ensure `theme-tokens` is self-contained. The semantic names (`--space-form-item-gap`) are what themes override; the actual pixel values are implementation details.

**Why no `--space-1` through `--space-12` scale tokens**: Tailwind already provides `--spacing-1` through `--spacing-12` as its spacing scale. Duplicating this scale creates two sources of truth with no benefit. Schema authors use Tailwind's `gap-4` directly; the `--space-*` tokens are only for theme-level semantic overrides.

Themes can override the semantic tokens:

```css
:root[data-theme='glass'][data-mode='light'] {
  --space-page-body: 24px;
  --space-form-item-gap: 20px;
}
```

### Step 2: CSS Layer Strategy — `@layer base`

**This is the most critical architectural decision.** All default spacing rules must live in `@layer base` so that:

1. Tailwind utilities (in `@layer utilities`) **always override** the defaults
2. Schema `className` values like `gap-1`, `gap-4` work correctly
3. Semantic prop Tailwind classes (from `resolveGap()`) take precedence

In Tailwind v4's cascade:
- `@layer base` — lowest priority
- `@layer components` — middle
- `@layer utilities` — highest

Without `@layer`, bare CSS rules would have higher effective priority than Tailwind utilities (which are layered), **breaking all overrides**.

```css
/* CORRECT — in @layer base */
@layer base {
  .nop-form > [data-slot="form-body"] { gap: var(--space-form-item-gap); }
}

/* WRONG — unlayered, blocks Tailwind overrides */
.nop-form > [data-slot="form-body"] { gap: var(--space-form-item-gap); }
```

### Step 3: Renderer Default Spacing Rules

Create `packages/flux-react/src/default-spacing.css`:

```css
/*
 * Default spacing for layout renderers.
 *
 * MUST be wrapped in @layer base so Tailwind utilities (gap-*, flex-*, etc.)
 * always override these defaults.
 *
 * Themes adjust spacing by overriding the --space-* CSS custom properties.
 * Hosts can opt out by setting all --space-* tokens to 0px.
 */

@layer base {

/* ===== Page ===== */
.nop-page {
  display: flex;
  flex-direction: column;
}

.nop-page > [data-slot="page-body"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-section-gap);
  padding: var(--space-page-body);
}

/* ===== Form ===== */
.nop-form {
  display: flex;
  flex-direction: column;
}

.nop-form > [data-slot="form-body"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-form-item-gap);
}

.nop-form > [data-slot="form-actions"] {
  display: flex;
  flex-direction: row;
  gap: var(--space-form-actions-gap);
  margin-top: var(--space-form-body-to-actions);
}

/* ===== FieldSet ===== */
.nop-fieldset {
  display: flex;
  flex-direction: column;
  min-inline-size: 0;
  border: 1px solid hsl(var(--border));
  border-radius: var(--radius-sm);
  padding: 0 var(--space-form-item-gap) var(--space-form-item-gap);
}

.nop-fieldset > legend {
  padding: 0 var(--space-field-label-gap);
  font-weight: 500;
  font-size: 0.875rem;
}

.nop-fieldset > [data-slot="fieldset-body"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-fieldset-body-gap);
}

/* ===== Container — bare path only (no semantic props) ===== */
.nop-container > [data-slot="container-body"]:not([data-flex]) {
  display: flex;
  flex-direction: column;
  gap: var(--space-form-item-gap);
}

.nop-container > [data-slot="container-header"] {
  margin-bottom: var(--space-field-label-gap);
}

.nop-container > [data-slot="container-footer"] {
  margin-top: var(--space-field-label-gap);
}

/* ===== Tabs content panel ===== */
[data-slot="tabs-content"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-tabs-content-gap);
}

/* ===== Flex — NO default gap ===== */
/* Flex is a layout primitive. Use the gap semantic prop:
   { "type": "flex", "gap": "md", ... } */

/* ===== FieldFrame internal layout ===== */
.nop-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-field-internal);
}

.nop-field--label-top {
  flex-direction: column;
  gap: var(--space-field-label-gap);
}

.nop-field--label-left {
  flex-direction: row;
  align-items: flex-start;
  gap: var(--space-field-label-h-gap);
}

.nop-field > [data-slot="field-control"] {
  display: flex;
  flex-direction: column;
  gap: var(--space-field-internal);
}

} /* end @layer base */
```

**Key design decisions**:

1. **`@layer base` wrapping**: All rules are in the base layer, so Tailwind utilities always win.

2. **Container uses `:not([data-flex])`**: When `ContainerRenderer` activates the flex-child path (semantic props present), it adds `data-flex` attribute to the inner div. The CSS defaults only apply to the bare path (no semantic props). This prevents:
   - CSS `flex-direction: column` overriding the renderer's `flex-row`
   - CSS default gap overriding the renderer's explicit gap class
   - Duplicate `display: flex` declarations

3. **No dialog/drawer body rules**: The `@nop-chaos/ui` Dialog has `gap-4` on its content area, so header/body/footer children are spaced. **Drawer has no `gap` on `DrawerContent`** — only `p-4` internal padding on header and footer sub-slots. Body content renders directly inside `DrawerContent` with no vertical spacing from header or footer. This is a known limitation: either add `gap` to `DrawerContent` in the UI component, or rely on body content's own spacing (e.g., a Form's `--space-form-item-gap` handles internal field spacing, but not the outer margin from the drawer chrome). Adding `[data-slot="dialog-body"]`/`[data-slot="drawer-body"]` rules in `default-spacing.css` would be dead CSS since the renderers don't emit those data-slot attributes.

4. **Tabs content panel**: Added `[data-slot="tabs-content"]` rule for spacing between children inside tab panels. The `@nop-chaos/ui` Tabs `gap-2` is between the tab list and tab content, not inside the content panel.

5. **FieldSet CSS reset**: Added explicit border, border-radius, and padding for `<fieldset>` since browser defaults are inconsistent across Chrome/Firefox/Safari. Legend gets explicit styling.

### Step 4: ContainerRenderer `data-flex` Attribute

Add a `data-flex` attribute to `container.tsx` when the flex-child path is active:

```tsx
// container.tsx — the flex-child path
{useFlexChild ? (
  <div
    data-slot="container-body"
    data-flex=""           // ← NEW: signals to CSS that renderer handles layout
    className={cn(
      'flex',
      resolveDirection(direction),
      wrap && 'flex-wrap',
      /* ... */
      gap.className
    )}
    style={gap.style}
  >
    {bodyContent}
  </div>
) : (
  <div data-slot="container-body">{bodyContent}</div>
)}
```

This ensures the CSS defaults only apply when the renderer does NOT handle layout.

### Step 5: Add `gap` Semantic Prop to Form and FieldSet

Currently only Container and Flex support the `gap` semantic prop. To allow per-instance override of form-body and fieldset-body gap, add `gap` to Form and FieldSet schemas:

```ts
// In FormSchema (flux-renderers-form/src/schemas.ts):
export interface FormSchema extends BaseSchema {
  // ... existing props
  /** Gap between form body items: named token ('none'|'xs'|'sm'|'md'|'lg'|'xl'), number(px) or CSS value */
  gap?: number | string;
}

// In FieldsetSchema (flux-renderers-form/src/renderers/fieldset.tsx):
export interface FieldsetSchema extends BaseSchema {
  // ... existing props
  /** Gap between fieldset body items */
  gap?: number | string;
}
```

In the renderers, apply the resolved gap to the body slot div:

```tsx
// form.tsx — apply gap to form-body
const gap = resolveGap(props.props.gap as number | string | undefined);
// ...
<div data-slot="form-body" className={cn(gap.className)} style={gap.style}>

// fieldset.tsx — apply gap to fieldset-body
const gap = resolveGap(props.props.gap as number | string | undefined);
// ...
<div data-slot="fieldset-body" className={cn(gap.className)} style={gap.style}
     style={collapsed ? { display: 'none', ...gap.style } : gap.style}>
```

The Tailwind gap class (from `@layer utilities`) overrides the CSS default (from `@layer base`), enabling per-form spacing control.

### Step 6: Override Mechanism — How It Actually Works

**Theme-level override** (affects all instances):

```css
/* In theme-tokens theme block */
:root[data-theme='glass'] { --space-form-item-gap: 20px; }
```

**Per-node override** via schema `className`:

Schema `className` is applied to the root element (e.g., `.nop-form`), not to internal slots like `[data-slot="form-body"]`. This means:

| What you want to override | Mechanism |
|--------------------------|-----------|
| Gap between form-body and form-actions (siblings of `.nop-form`) | `className: "gap-1"` on `.nop-form` — works because both body and actions are direct children |
| Gap between items inside form-body | Use `gap` prop on Form/FieldSet (see Step 5) — applies Tailwind gap class directly to `[data-slot="form-body"]` |
| Container gap when using semantic props | `gap: "md"` prop — works because Tailwind classes in `@layer utilities` override `@layer base` |
| Container gap without semantic props | `className: "gap-1"` — goes on `.nop-container`, NOT on the inner `[data-slot="container-body"]`. **This does NOT override the inner body gap.** To control inner body gap, either add semantic props or set `--space-form-item-gap` at a higher level. |

**Honest assessment**: Per-node `className` cannot override internal slot spacing (form-body, fieldset-body, container-body inner) because `className` goes on the root element only. The practical workarounds are:

1. **Use `gap` semantic prop on Form/FieldSet** (Step 5) — targets the inner body div directly
2. Use semantic props (`gap: "md"`) on container/flex — these target the inner body div directly
3. Set theme-level `--space-*` tokens to adjust all instances
4. Future: add per-slot className support

### Step 7: Playground CSS Migration

Move these styles from `apps/playground/src/styles.css` to `default-spacing.css`:

```css
/* MOVE to default-spacing.css (replaced by theme-variable versions) */
.nop-field { display: flex; flex-direction: column; gap: 4px; }
.nop-field--label-left { flex-direction: row; align-items: flex-start; gap: 8px; }
[data-slot="field-control"] { display: flex; flex-direction: column; gap: 4px; }
```

**Keep in playground** (playground-specific, not shared renderer spacing):
- All code-editor rules (`nop-code-editor`, `code-editor-*`)
- All report-designer rules (`report-designer-demo`, `report-demo-*`)
- All inspector rules (`inspector-content`, `inspector-section`, `inspector-field`)
- All log panel rules
- `stack-*`/`hstack-*` utilities — keep as convenience aliases for schema authors

## Container Component Inventory

### Level 1: UI Components (`@nop-chaos/ui`) — Built-In Spacing

These components are self-styled and already include internal gap/padding:

| Component | Internal Spacing | Notes |
|-----------|-----------------|-------|
| **Card** | `gap-4` (default), `gap-3` (sm); `py-4`; `px-4` on header/content/footer | Has `CardHeader`, `CardContent`, `CardFooter`, `CardTitle`, `CardDescription`, `CardAction` sub-slots. Size variants: `default`, `sm`. |
| **Accordion** | `flex-col` on root; `py-2.5` on trigger; `pb-2.5` on content | Each `AccordionItem` has trigger + content. |
| **Collapsible** | None (transparent primitive) | Wraps content, no visual chrome. |
| **Tabs** | `gap-2` on root (between list and content) | Content is `flex-1`. **Note**: `gap-2` is between tab list and content area, NOT inside each tab panel. |
| **Dialog** | `gap-4` on content; `gap-2` on header/footer; `p-4` padding | Size variants: `sm`, `default`, `lg`. |
| **Drawer** | `gap-0.5` on header; `gap-2` on footer; `p-4` padding | Side/bottom sheet. |
| **ResizablePanelGroup** | None (structural only) | Panels with drag handles. |
| **ScrollArea** | None (overflow wrapper) | Just manages scroll behavior. |
| **Separator** | `h-px` / `w-px` (1px line) | Visual divider, not a content container. |

**Key point**: Card, Accordion, Tabs, Dialog, Drawer already have **their own internal spacing**. When a Flux renderer wraps these UI components, the UI component handles slot-to-slot gaps. The Flux default-spacing.css handles spacing **between children rendered inside each content slot** (e.g., inside `TabsContent`, inside `CardContent`).

### Level 2: Flux Layout Renderers (`flux-renderers-basic`) — Currently No Spacing

| Renderer | Marker | Semantic Props | Default Spacing |
|----------|--------|---------------|-----------------|
| **Page** | `nop-page` | None | Zero. `page-body`, `page-header`, `page-toolbar`, `page-footer` are bare `<div>`s. |
| **Container** | `nop-container` | `direction`, `gap`, `wrap`, `align` | Zero (unless semantic props activate the flex path). Bare `<div>` when no semantic props. |
| **Flex** | `nop-flex` | `direction`, `gap`, `wrap`, `align`, `justify` | Always `display: flex` with direction, but **zero gap** unless `gap` prop is set. |
| **Fragment** | None | None | Transparent wrapper, no DOM at all. |
| **Loop** | None | None | Repeats children, no wrapper. |

### Level 3: Flux Semantic Containers (`flux-renderers-form`) — Currently No Spacing

| Renderer | Marker | Default Spacing |
|----------|--------|-----------------|
| **Form** | `nop-form` | Zero. `form-body` and `form-actions` are bare `<div>`s. |
| **FieldSet** | `nop-fieldset` | Zero. `fieldset-body` is a bare `<div>`. |
| **FieldFrame** | `nop-field` | Layout CSS is **playground-only** (`styles.css`). Label/control/error gap only exists in playground. |

### The Spacing Responsibility Matrix

| Container Type | Who owns spacing? | Current | Proposed |
|---------------|-------------------|---------|----------|
| **Card** (UI) | `@nop-chaos/ui` — already has `gap-4`, `px-4`, `py-4` | Working | No change needed. Content inside `CardContent` gets container-body default gap. |
| **Accordion** (UI) | `@nop-chaos/ui` | Working | No change needed |
| **Tabs** (UI) | `@nop-chaos/ui` — `gap-2` between list and content | Working | Add `[data-slot="tabs-content"]` rule for panel children |
| **Dialog** (UI) | `@nop-chaos/ui` — `gap-4`, `p-4` | Working | No change needed — Dialog handles its own spacing |
| **Drawer** (UI) | `@nop-chaos/ui` — `p-4` on header/footer, **no gap on DrawerContent** | Working for slots | Add `gap` to DrawerContent in UI component, or rely on body content's own spacing |
| **Page** (Flux) | `default-spacing.css` | Zero | `--space-section-gap` + `--space-page-body` padding |
| **Container** (Flux) | `default-spacing.css` + semantic props | Zero | CSS default `--space-form-item-gap` on bare path; semantic props override via `data-flex` marker |
| **Flex** (Flux) | Semantic `gap` prop — author must set | Zero | **Remains zero** — layout primitive |
| **Form** (Flux) | `default-spacing.css` | Zero | `--space-form-item-gap` between fields; `--space-form-actions-gap` between buttons |
| **FieldSet** (Flux) | `default-spacing.css` | Zero | `--space-fieldset-body-gap` between children; CSS reset for border/padding |
| **FieldFrame** (Flux) | `default-spacing.css` | Playground-only | `--space-field-label-gap`, `--space-field-internal` |

### Why Flex Has No Default Gap

Flex is a **layout primitive**, not a semantic container. It arranges children in a row or column with explicit control:

- A flex row of buttons in a toolbar → needs `gap-2`
- A flex column of cards → needs `gap-4`
- A flex row of form fields → needs `gap-3`
- A flex row wrapping tags → needs `gap-1`

No single default is correct. This matches AMIS's `Flex` renderer (which also has no default gap). If you want a flex column with a standard gap, use **Container** (which gets the CSS default) or explicitly set `gap`:

```json
{ "type": "flex", "direction": "column", "gap": "md", "body": [...] }
```

### Out of Scope: Responsive Grid and Multi-Column Forms

**Responsive Grid**: AMIS's Grid renderer provides responsive column-based layout with 12-column system and breakpoint-aware widths. This cannot be replicated with `flex + gap` alone. Options for Flux:
1. Use Tailwind's responsive grid utilities via `className`: `"className": "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"`
2. Add a dedicated `grid` renderer type using CSS Grid

This proposal defers the Grid renderer to future work. The spacing tokens (`--space-*`) will integrate naturally when it is added.

**Multi-Column Forms**: AMIS supports `Form--column-N` with negative-margin/percentage-width pattern. The modern equivalent uses CSS Grid: `display: grid; grid-template-columns: repeat(N, 1fr); gap: var(--space-form-item-gap)`. This can be added as a `columns` prop on the Form renderer in future work.

**Edge-to-Edge Negative-Margin Layout**: AMIS uses negative margins on the row + padding on columns for edge-to-edge alignment. CSS `gap` cannot replicate this (gap creates transparent space between items). This pattern is needed only for Grid and is out of scope.

## Known Limitations

> **Warning: `className` targets the root element, not internal slots.**
>
> Setting `className: "gap-2"` on a Form affects only the gap between `form-body` and `form-actions` (the two direct children of `.nop-form`). It does **not** change the 16px gap between individual fields inside `form-body`. To control field-level spacing per-form, use the `gap` semantic prop (see Step 5) or adjust theme-level `--space-form-item-gap`.

**Spacing accumulation**: Nested containers accumulate gaps. A form inside a container inside a page gets: page-body 24px + container-body 16px + form-body 16px = three layers. This is usually desirable (each level serves a different purpose), but for compact layouts, use `className: "gap-1"` on the outer containers or `gap: "sm"` on the form.

**Container `className: "gap-2"` without semantic props**: This adds `gap-2` to `.nop-container`, NOT to the inner `[data-slot="container-body"]`. The inner body still has the CSS default 16px gap. To control the inner body gap, add semantic props (`direction: "column", gap: "sm"`) or adjust theme tokens.

**Drawer body spacing**: `DrawerContent` has no `gap` — body content sits directly adjacent to header/footer with no vertical spacing. Body content's own spacing (e.g., a Form's field gap) handles internal items but not the outer margin. This should be fixed by adding `gap` to the `DrawerContent` UI component.

**No `padding` semantic prop**: Container has `gap` default but no `padding` default or prop. Add padding via `className: "p-4"`.

## Container vs Flex — Decision Guide

| You want... | Use | Why |
|------------|-----|-----|
| A generic section with children, sensible defaults | `container` | Gets CSS default gap (16px) without any props |
| A form with auto-spaced fields | `form` | Gets field gap, action gap, body-to-actions gap |
| Precise control over gap, direction, alignment | `flex` + `gap`/`direction`/`align`/`justify` props | No defaults — you specify everything |
| A row layout with specific gap | `container` + `direction: "row"` + `gap: "md"` | Semantic props activate flex layout |
| A row layout with specific gap (alternative) | `flex` + `direction: "row"` + `gap: "md"` | Same result, different type |
| A grouping of form fields with a title | `fieldset` | Gets border + legend + default gap |
| A card-like box | `container` + `className: "rounded-xl bg-card p-4 ring-1 ring-foreground/10"` | Visual chrome via className, spacing from defaults |

## Typical Container Examples

### Example 1: Basic Form

```json
{
  "type": "form",
  "body": [
    { "type": "input-text", "name": "username", "label": "Username" },
    { "type": "input-email", "name": "email", "label": "Email" },
    { "type": "select", "name": "role", "label": "Role", "options": [...] }
  ],
  "actions": [
    { "type": "button", "label": "Cancel" },
    { "type": "button", "label": "Submit" }
  ]
}
```

**Spacing behavior** (no schema change needed):
- Form body: `gap: var(--space-form-item-gap)` = 16px between fields
- FieldFrame: `gap: var(--space-field-label-gap)` = 8px between label and control
- Actions row: `gap: var(--space-form-actions-gap)` = 12px between buttons
- Actions section: `margin-top: var(--space-form-body-to-actions)` = 16px below body

### Example 2: Form with FieldSet

```json
{
  "type": "form",
  "body": [
    { "type": "input-text", "name": "title", "label": "Title" },
    {
      "type": "fieldset",
      "title": "Contact Info",
      "body": [
        { "type": "input-text", "name": "phone", "label": "Phone" },
        { "type": "input-email", "name": "email", "label": "Email" }
      ]
    },
    { "type": "textarea", "name": "notes", "label": "Notes" }
  ]
}
```

**Spacing behavior**:
- Form body: 16px gap between all children (title field, fieldset, notes field)
- FieldSet: 1px border + border-radius + 16px padding (from CSS reset)
- FieldSet legend: styled with `font-weight: 500`, `padding: 0 8px`
- FieldSet body: 16px gap between phone and email fields

### Example 3: Page with Multiple Sections

```json
{
  "type": "page",
  "title": "User Management",
  "body": [
    {
      "type": "container",
      "body": [
        { "type": "text", "text": "Search filters here" }
      ]
    },
    {
      "type": "form",
      "body": [
        { "type": "input-text", "name": "keyword", "label": "Keyword" }
      ],
      "actions": [
        { "type": "button", "label": "Search" }
      ]
    },
    {
      "type": "table",
      "columns": [...]
    }
  ]
}
```

**Spacing behavior**:
- Page body: `gap: var(--space-section-gap)` = 24px between sections
- Page body: `padding: var(--space-page-body)` = 16px padding
- Container body: `gap: var(--space-form-item-gap)` = 16px (from CSS defaults)
- Form body: 16px between fields; actions spaced as in Example 1

### Example 4: Container with Semantic Props Override

```json
{
  "type": "container",
  "direction": "row",
  "gap": "lg",
  "align": "center",
  "body": [
    { "type": "text", "text": "Left" },
    { "type": "text", "text": "Right" }
  ]
}
```

**Spacing behavior**:
- Semantic props activate the flex-child path → inner div gets `data-flex=""` attribute
- CSS default rule uses `:not([data-flex])` → **does not apply** (no conflict)
- Renderer produces: `className="flex flex-row gap-6"` (from semantic props)
- `gap: "lg"` → `gap-6` (24px) Tailwind utility in `@layer utilities` — wins over any CSS default

### Example 5: Compact Form Override

```json
{
  "type": "form",
  "className": "gap-1",
  "body": [
    { "type": "input-text", "name": "q", "label": "Search" }
  ],
  "actions": [
    { "type": "button", "label": "Go" }
  ]
}
```

**Spacing behavior**:
- `className: "gap-1"` applies to `.nop-form` root element
- `gap-1` (in `@layer utilities`) overrides `.nop-form` base layer rules
- Result: 4px gap between form-body and form-actions (the two direct children of `.nop-form`)
- **Note**: The 16px gap *inside* form-body is controlled by `--space-form-item-gap` CSS variable, not by `className` on the root. To make the entire form compact, also adjust the theme variable or add a `gap` semantic prop to the Form schema.

### Example 6: Horizontal Form (labelAlign: "left")

```json
{
  "type": "form",
  "mode": "horizontal",
  "labelAlign": "left",
  "body": [
    { "type": "input-text", "name": "name", "label": "Name" },
    { "type": "input-email", "name": "email", "label": "Email" }
  ]
}
```

**Spacing behavior**:
- Form body: 16px vertical gap between field rows (from CSS default)
- Each field: `.nop-field--label-left` → `flex-direction: row` with `gap: var(--space-field-label-h-gap)` = 16px between label and control
- Label width: controlled by `labelWidth` prop (applied as inline `style` by FieldFrame)

### Example 7: Card Container (Manual className)

```json
{
  "type": "page",
  "body": [
    {
      "type": "container",
      "className": "rounded-xl bg-card py-4 ring-1 ring-foreground/10",
      "body": [
        {
          "type": "container",
          "className": "px-4",
          "body": [
            { "type": "text", "tag": "h3", "text": "Card Title" },
            { "type": "text", "text": "Card description text" }
          ]
        },
        {
          "type": "container",
          "className": "px-4",
          "body": [
            { "type": "text", "text": "Card content goes here" }
          ]
        }
      ]
    }
  ]
}
```

**Spacing behavior**:
- Outer container: CSS default `gap: var(--space-form-item-gap)` = 16px between header-area and content-area
- Inner containers: each gets 16px gap between their text children
- Visual chrome (rounded corners, background, ring): from schema `className`
- **Future**: A dedicated `card` renderer type should wrap `@nop-chaos/ui` Card, using `CardHeader`/`CardContent`/`CardFooter` for sub-slots with built-in `gap-4`/`px-4`.

### Example 8: Flex Layout (Explicit Gap Required)

```json
{
  "type": "flex",
  "direction": "row",
  "gap": "md",
  "align": "center",
  "justify": "between",
  "body": [
    { "type": "text", "tag": "h2", "text": "Dashboard" },
    {
      "type": "flex",
      "direction": "row",
      "gap": "sm",
      "align": "center",
      "body": [
        { "type": "button", "label": "Refresh" },
        { "type": "button", "label": "Export", "variant": "outline" }
      ]
    }
  ]
}
```

**Spacing behavior**:
- Outer flex: `gap: "md"` → `gap-4` (16px) between title and button group
- Inner flex: `gap: "sm"` → `gap-2` (8px) between buttons
- **No CSS default gap** — Flex requires explicit `gap` prop

### Example 9: Card-Based Page Layout

```json
{
  "type": "page",
  "title": "Dashboard",
  "body": [
    {
      "type": "flex",
      "direction": "row",
      "gap": "md",
      "body": [
        {
          "type": "container",
          "className": "flex-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
          "body": [
            { "type": "text", "tag": "h3", "text": "Total Users" },
            { "type": "text", "tag": "p", "text": "1,234" }
          ]
        },
        {
          "type": "container",
          "className": "flex-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10",
          "body": [
            { "type": "text", "tag": "h3", "text": "Active Sessions" },
            { "type": "text", "tag": "p", "text": "567" }
          ]
        }
      ]
    },
    {
      "type": "form",
      "body": [
        { "type": "input-text", "name": "search", "label": "Search" }
      ],
      "actions": [
        { "type": "button", "label": "Search" }
      ]
    }
  ]
}
```

**Spacing behavior**:
- Page body: 24px gap between stats row and search form; 16px padding
- Stats flex: 16px gap between stat cards (from `gap: "md"`)
- Stat cards: 16px gap between title and number (container CSS default); `p-4` padding from className
- Search form: 16px gap between fields, 16px body-to-actions gap

### Example 10: Compact Form with `gap` Prop

```json
{
  "type": "form",
  "gap": "sm",
  "body": [
    { "type": "input-text", "name": "q", "label": "Search" },
    { "type": "select", "name": "category", "label": "Category", "options": [...] }
  ],
  "actions": [
    { "type": "button", "label": "Go" }
  ]
}
```

**Spacing behavior**:
- `gap: "sm"` → `gap-2` (8px) Tailwind class on `[data-slot="form-body"]` (from Step 5)
- `gap-2` in `@layer utilities` overrides CSS default `gap: var(--space-form-item-gap)` in `@layer base`
- Result: compact 8px spacing between fields

### Example 11: Tabs with Form Content

```json
{
  "type": "tabs",
  "items": [
    {
      "title": "Profile",
      "body": [
        { "type": "input-text", "name": "name", "label": "Name" },
        { "type": "input-email", "name": "email", "label": "Email" }
      ]
    },
    {
      "title": "Settings",
      "body": [
        { "type": "switch", "name": "notifications", "option": { "onLabel": "On", "offLabel": "Off" } }
      ]
    }
  ]
}
```

**Spacing behavior**:
- Tab panel (`[data-slot="tabs-content"]`): `gap: var(--space-tabs-content-gap)` = 16px between children
- **Note**: These are direct field elements in the tab, NOT wrapped in a form. Each field is a `.nop-field` rendered directly inside the tab panel. The tabs-content gap spaces them.
- If the tab body contains a `form` instead, the form's own `form-body` rule handles field spacing, and the tabs-content gap spaces only the form from other siblings. No double-spacing because the form is a single child of the tab panel.

### Example 12: Two-Column Layout (Interim Pattern)

For two-column forms without a dedicated Grid renderer, use Tailwind grid utilities:

```json
{
  "type": "container",
  "className": "grid grid-cols-2 gap-4",
  "body": [
    { "type": "input-text", "name": "firstName", "label": "First Name" },
    { "type": "input-text", "name": "lastName", "label": "Last Name" },
    { "type": "input-email", "name": "email", "label": "Email" },
    { "type": "input-text", "name": "phone", "label": "Phone" }
  ]
}
```

**Spacing behavior**:
- `className: "grid grid-cols-2 gap-4"` applies to `.nop-container` root
- `grid` and `grid-cols-2` Tailwind utilities (in `@layer utilities`) override the CSS default `display: flex` on the inner body... **Wait** — `className` goes on `.nop-container`, not on `[data-slot="container-body"]` where the CSS default applies. The grid class would need to be on the inner body.

**Actual working pattern**: Use semantic props to activate the flex-child path, then add grid via className override:

```json
{
  "type": "container",
  "direction": "row",
  "gap": "md",
  "className": "![&>[data-slot=container-body]]:grid ![&>[data-slot=container-body]]:grid-cols-2",
  "body": [
    { "type": "input-text", "name": "firstName", "label": "First Name" },
    { "type": "input-text", "name": "lastName", "label": "Last Name" },
    { "type": "input-email", "name": "email", "label": "Email" },
    { "type": "input-text", "name": "phone", "label": "Phone" }
  ]
}
```

This uses Tailwind's arbitrary variant selector `[&>[data-slot=container-body]]` to target the inner body div. It's verbose, which is why a dedicated Grid renderer with a `columns` prop is planned for future work.

## Implementation Plan

### Phase 1: Spacing Tokens (theme-tokens)

1. Add semantic `--space-*` variables to `packages/theme-tokens/src/styles.css` with concrete pixel defaults
2. Optionally add per-theme overrides in theme blocks
3. Add AMIS spacing bridge mapping in `amis-theme-bridge.css` (see below)

### Phase 2: Default Spacing CSS (flux-react)

1. Create `packages/flux-react/src/default-spacing.css` (wrapped in `@layer base`)
2. Add baseline spacing rules for page, form, fieldset, container, field-frame, tabs-content
3. Import from `packages/flux-react/src/index.ts` (side-effect import)

### Phase 3: ContainerRenderer `data-flex` Attribute

1. Add `data-flex=""` attribute to container-body when the flex-child path is active
2. CSS uses `:not([data-flex])` to scope defaults to the bare path only

### Phase 4: Add `gap` Prop to Form and FieldSet

1. Add `gap?: number | string` to `FormSchema` and `FieldsetSchema`
2. In FormRenderer, apply `resolveGap()` to `[data-slot="form-body"]` div
3. In FieldsetRenderer, apply `resolveGap()` to `[data-slot="fieldset-body"]` div
4. Tailwind gap class from prop overrides CSS default in `@layer base`

### Phase 5: Playground CSS Migration

1. Move `.nop-field` layout rules from `apps/playground/src/styles.css` to `default-spacing.css`
2. Replace hardcoded pixel values with `var(--space-*)` references
3. Keep code-editor, report-designer, inspector, log-panel rules in playground
4. Keep `stack-*`/`hstack-*` utilities in playground as convenience aliases

### Phase 6: AMIS Theme Bridge Mapping

Add to the host application's `amis-theme-bridge.css`:

```css
.amis {
  /* Map AMIS spacing tokens to our semantic tokens */
  --sizes-size-3: var(--space-field-internal, 4px);
  --sizes-size-5: var(--space-field-label-gap, 8px);
  --sizes-size-7: var(--space-form-actions-gap, 12px);
  --sizes-size-9: var(--space-form-item-gap, 16px);
  --sizes-base-10: var(--space-page-body, 20px);
  --sizes-base-12: var(--space-section-gap, 24px);

  --Form-item-gap: var(--space-form-item-gap);
  --Page-body-padding: var(--space-page-body);
  --Panel-bodyPadding: var(--space-form-actions-gap);
}
```

### Phase 7: Host Embedding Opt-Out

Hosts that embed `flux-react` but provide their own layout system can disable defaults by setting all tokens to zero. Provide a convenience preset:

```css
/* Host application CSS (loaded after theme-tokens) */
.flux-spacing-none {
  --space-page-body: 0;
  --space-section-gap: 0;
  --space-form-item-gap: 0;
  --space-fieldset-body-gap: 0;
  --space-form-actions-gap: 0;
  --space-form-body-to-actions: 0;
  --space-field-internal: 0;
  --space-field-label-gap: 0;
  --space-field-label-h-gap: 0;
  --space-tabs-content-gap: 0;
}
```

### Future Work (Not in This Proposal)

- **Responsive Grid renderer** — CSS Grid with responsive column widths
- **Multi-column Form** — `columns` prop generating `display: grid; grid-template-columns: repeat(N, 1fr)`
- **Container `padding` semantic prop** — xs/sm/md/lg/xl mapping to Tailwind `p-1` through `p-6`
- **Card renderer type** — wraps `@nop-chaos/ui` Card with CardHeader/CardContent/CardFooter sub-slots
- **Mobile responsive spacing** — `@media` breakpoints adjusting `--space-*` tokens
- **Per-slot className** — allowing schema authors to target internal slots directly

## Comparison: Current vs Proposed

| Aspect | Current | Proposed |
|--------|---------|----------|
| Card | Not a renderer; manual `className` | UI Card has built-in spacing; future card renderer wraps it |
| Accordion/Tabs/Dialog/Drawer | UI components have built-in spacing | No change; add tabs-content gap rule |
| Form field spacing | Zero | 16px via `--space-form-item-gap`; per-form override via `gap` prop |
| Page section spacing | Zero | 24px via `--space-section-gap` in `@layer base` |
| FieldSet child spacing | Zero | 16px gap + CSS reset; per-fieldset override via `gap` prop |
| Container (no props) | Zero | 16px gap via CSS, scoped to `:not([data-flex])` |
| Container (with props) | Semantic props control layout | Unchanged — `data-flex` prevents CSS defaults from interfering |
| Flex gap | Zero | **Stays zero** — must set `gap` prop explicitly |
| FieldFrame spacing | Playground-only hardcoded px | Shared `@layer base` CSS with theme-tunable variables |
| CSS cascade | No defaults → nothing to override | `@layer base` → Tailwind `@layer utilities` always wins |
| Theme adjustability | None | Full via `--space-*` CSS variables per theme |
| AMIS integration | No spacing bridge | Bridge mapping in `amis-theme-bridge.css` |
| Override mechanism | Must add `className` to every node | Theme-level CSS variable override; semantic props for per-node control |

## Relationship to styling-system.md

The "No Default Layout Styles in Layout Renderers" rule in `styling-system.md` was designed for **host-embedded** scenarios. This design introduces **library-default spacing** that:

1. Lives in a **CSS file** in `@layer base` (not hardcoded in renderer components)
2. Uses **CSS custom properties** (globally tunable via theme)
3. Is **overridable by Tailwind utilities** (because `@layer base` < `@layer utilities`)
4. Does not conflict with the host-embedded case — hosts can zero all tokens or apply `.flux-spacing-none`

**Recommended update to styling-system.md**: Change "No Default Layout Styles" to "No Hardcoded Layout Styles in Renderer Code" — defaults come from theme CSS in `@layer base`, not from renderer component code. Renderer components remain pure (marker classes + schema-derived classes only).

## Appendix: AMIS Default Gap Values for Reference

| AMIS Container | Default Spacing | Token |
|---------------|----------------|-------|
| Form items (vertical) | 24px | `--Form-item-gap: var(--sizes-base-12)` |
| Form label (normal mode) | 8px | `--Form-mode-default-labelGap: var(--sizes-size-5)` |
| Form label (horizontal) | 16px | `--Form--horizontal-label-gap: var(--sizes-base-8)` |
| Form group columns | 16px | `--Form-group-gutterWidth: var(--gap-md)` |
| Grid (default gutter) | 16px | `$Grid-gutterWidth: px2rem(16px)` — SCSS-compiled, not runtime-tunable |
| Grid (gap='xs') | 4px total gutter | CSS variable `var(--gap-xs)` — runtime-tunable |
| HBox (default='xs') | 4px total gutter | `gap: 'xs'` default prop |
| Page body padding | 12px | `--Page-body-padding: var(--gap-base)` |
| Panel body padding | 12px | `--Panel-bodyPadding: var(--gap-base)` |
| Panel margin-bottom | 20px | `--Panel-marginBottom: var(--sizes-base-10)` |
| Wrapper (size='md') | 16px padding | `padding: var(--gap-md)` — Wrapper defaults to size='md'; Container does not |
