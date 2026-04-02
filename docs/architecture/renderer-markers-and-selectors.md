# Renderer Markers And Selector Protocol

This document defines the current DOM marker and selector protocol for Flux renderers.

- This is a stable architecture rule, not a migration guide.
- One-time migration work belongs under `docs/plans/`.
- `docs/architecture/styling-system.md` remains the umbrella styling architecture document.
- This file defines the narrower selector contract for root markers, `data-slot`, and `data-*` / `aria-*` state semantics.

## Purpose

Flux needs a stable DOM protocol for:

1. renderer-aware testing
2. host integration and external targeting
3. AI/automation inspection
4. consistent alignment with shadcn/ui and Radix markers

The goal is not to remove every class. The goal is to keep one coherent marker system.

## Marker Layers

### Layer 1: shadcn/ui native markers

Use shadcn/ui and Radix markers as-is:

- `data-slot`
- `data-state`
- `role`
- `aria-*`

Do not wrap these with redundant renderer-specific BEM classes.

### Why `data-slot` in addition to `role`

`role` and `data-slot` do different jobs.

Use `role` for accessibility semantics and user-level interaction meaning:

- `button`
- `dialog`
- `checkbox`
- `tab`
- `tabpanel`

This is the right layer for:

1. screen-reader semantics
2. keyboard interaction expectations
3. high-level user-facing test queries such as `getByRole(...)`

Use `data-slot` for internal structure identity:

- `dialog-content`
- `dialog-title`
- `dialog-close`
- `table-header`
- `table-pagination`
- `container-body`

`role` answers: "what kind of control is this?"

`data-slot` answers: "which structural part of the component is this?"

Why `role` alone is not enough:

- many elements share the same role, for example multiple buttons in one dialog
- some structural nodes should not expose a dedicated role at all
- internal regions such as headers, toolbars, pagination areas, or close affordances need stable structure-level targeting

Selector priority:

1. prefer `role`, label, and text queries when you want user semantics
2. use `data-slot` when you need stable component-internal structure targeting
3. use Flux root markers when you need renderer-level identity

### Layer 2: Flux semantic markers

Flux renderer markers exist to describe renderer-owned business structure.

Keep:

- root semantic class markers such as `nop-container`, `nop-page`, `nop-table`, `nop-field`
- renderer state attributes such as `data-field-dirty`, `data-field-invalid`

Do not use root marker classes for visual styling.

### Layer 3: Visual classes

Visual styling belongs to:

- Tailwind utility classes
- schema-driven `className`
- `classAliases`
- shadcn/ui variant classes

These are not part of the structural selector protocol.

## Root Marker Rules

Use root marker classes only for renderer identity.

Examples:

- `nop-container`
- `nop-page`
- `nop-table`
- `nop-chart`
- `nop-field`

Rules:

- root markers use the `nop-` prefix
- root markers identify the renderer type only
- root markers must not encode internal regions or state
- root markers must not be the source of visual layout or color rules

## Internal Region Rules

Renderer-internal regions use `data-slot`, not BEM region classes.

Examples:

- `data-slot="page-header"`
- `data-slot="container-body"`
- `data-slot="table-pagination"`

Do not introduce or preserve renderer-internal region classes such as:

- `nop-page__header`
- `nop-container__footer`
- `nop-table__pagination`

## State Rules

Renderer state uses `data-*` or `aria-*`, not BEM modifier classes.

Examples:

- `data-field-visited`
- `data-field-touched`
- `data-field-dirty`
- `data-field-invalid`
- `aria-invalid`

Do not use modifier classes such as:

- `nop-field--dirty`
- `nop-field--invalid`
- `nop-table__row--interactive`
- `nop-icon--check`

State attributes in this project are generally presence-only:

```tsx
<label
  className="nop-field"
  data-field-dirty={fieldState.dirty ? '' : undefined}
  data-field-invalid={showError ? '' : undefined}
/>
```

## Testing Guidance

Prefer the most semantic selector available in this order:

1. `getByRole` / label / text queries
2. shadcn/ui native markers such as `data-slot` or `data-state`
3. Flux root markers such as `.nop-field` or `.nop-table`
4. schema-driven `data-testid`

Examples:

- keep `input.closest('.nop-field')`
- prefer `[data-slot="input"]` over `.nop-input`
- prefer `hasAttribute('data-field-invalid')` over class modifier checks

## Performance Note

This selector protocol is not performance-driven.

- `class`, `data-*`, and `aria-*` are all ordinary DOM attributes
- replacing a class with a `data-*` attribute is not treated as a meaningful hot-path optimization by itself
- the primary benefits are semantic consistency, test stability, and alignment with shadcn/ui and Radix

If performance is the concern, focus first on:

1. rerender frequency
2. subscription granularity
3. DOM size
4. selector complexity

## Decision Checklist

When adding or changing renderer DOM markers:

- Is this a root renderer identity? Use a root `nop-*` class if needed.
- Is this an internal region? Use `data-slot`.
- Is this a state signal? Use `data-*` or `aria-*`.
- Is this only visual? Use Tailwind or schema-driven classes, not semantic markers.
- Is this a one-time migration concern? Put it in `docs/plans/`, not here.