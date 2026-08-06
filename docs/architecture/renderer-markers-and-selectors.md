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

Do not use root marker classes as a license for renderer component code to inject implicit visual styling.

Example: `FieldFrame` may emit `nop-field`, `data-slot="field-label"`, and `data-field-invalid`, but renderer component code must not rely on `nop-field` to inject implicit `grid`, `gap-*`, padding, or color styling. Package-owned base CSS may still key default themeable rules off `nop-field` together with slot selectors.

### Field selector contract attributes (stable, host-visible)

Beyond structural `data-slot`, FieldFrame exposes stable, host-visible attributes so downstream consumers (e2e adapters, host integration, AI inspection) can locate a field by name and know its control type without reverse-engineering id/slot/role:

- `data-field={name}` — the field's schema name, on the FieldFrame root (`.nop-field`). Present for every wrapped field regardless of control type; this is the single stable name hook (checkbox/switch interactive elements do NOT carry `${name}-control`).
- `data-renderer={rendererType}` — the schema control type (e.g. `input-text`, `select`, `checkbox`, `input-number`), sourced from `NodeMetaContext.type` (`templateNode.rendererType`). Emitted only when a `NodeMetaContext` provider is present (production render path); absent when `FieldFrame` is rendered in isolation without a provider.

Companion option/column hooks (not on FieldFrame):

- combobox options: `[data-slot="combobox-item"][data-value={option.value}]` — locate a select option by value. The option's visible text is still `option.label`, not `value`.
- table cells: `<td data-field={column.name}>` — locate a column cell by field name, replacing fragile column-index arithmetic.

Contract rules: these attributes are production-resident (never debug-gated), additive (existing `data-slot`/`controlId` are unchanged), and frozen by `packages/flux-renderers-form/src/__tests__/field-controls-dom-contract.test.tsx`.

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
- root markers must not cause renderer component code to smuggle in implicit layout or color rules

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

### Timeline v2 controlled current-event markers (registered 2026-08-05)

`timeline` v2 (controlled current event) publishes the following state markers:

- `data-state="active"` on the current-event `timeline-item` (Radix state vocabulary; distinct from steps' `data-current` by contract — do not unify)
- `data-active-index` on the `timeline-root` (logical-order index of the active event; absent when no active state)
- `data-clickable` on each `timeline-item` — present only when `onChange` is declared (click-seek reachable, `tabindex` + Enter/Space); absence means display-only
- `data-ownership` on the `timeline-root` (`local`/`controlled`/`scope`, mirrors steps)

## Schema-Authored Data Attributes

`schema` 作者可以直接在 flex / text / icon 节点上书写 `data-slot` 与任意 `data-*` 属性（如 `data-node-variant`），渲染器将其原样转发到 DOM 根元素。用途：schema 驱动的结构标记样式（典型场景：Flow Designer 节点 body 用 `data-slot="dt-node"` + `data-node-variant="approval"` 组合，配合 `flow-designer-nodes.css` 的 `[data-slot='dt-node'][data-node-variant='...']` 选择器实现钉钉卡片视觉）。

转发规则（`collectDataAttrs`，`packages/flux-renderers-basic/src/utils.ts`）：

- 白名单：`data-slot`（`data-` 前缀的子集）与全部 `/^data-/` 前缀键。
- 值类型：仅 string（非空）与有限 number（转字符串）；boolean / 对象 / 空字符串 / 求值失败的表达式结果一律跳过，不输出空属性。
- 非 `data-*` 的未知键不转发（与现有 open prop model 行为一致——编译期保留在 `props.props`，但渲染器不落 DOM）。

此机制只影响上述三个渲染器；其它渲染器如需同类转发，按同一 helper + 契约测试模式扩展（`__tests__/data-attrs-passthrough.test.tsx`）。

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

Additional package-CSS guardrails that follow from the current live baseline:

- package-owned selectors such as debugger `.ndbg-*` internals must be anchored under a stable package root (`.nop-debugger`, `.nop-debugger-launcher`, package `data-slot`, etc.) instead of publishing bare global helper classes
- package CSS may read host/public CSS variables with fallback values, but it must not publish shared token defaults onto `.nop-theme-root` or other global theme roots from a late-loaded runtime stylesheet
- when a package owns reusable chrome but the visible color should follow config/runtime metadata, prefer a tokenized slot/state path (for example Flow Designer palette `--fd-palette-accent`) over hardcoded id-to-class presentation tables
