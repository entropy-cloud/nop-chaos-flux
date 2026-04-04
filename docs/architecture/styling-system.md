# Styling System Design

## Purpose

This document defines how the low-code framework handles styling in a TailwindCSS-first environment, including:
- Relationship between semantic props and Tailwind classes
- When to use semantic props vs raw className
- `classAliases` mechanism for reusable class definitions
- shadcn/ui component library integration

This is the umbrella styling architecture document.

- Use this file for renderer styling contracts, semantic props, class aliasing, spacing rules, and shadcn/ui integration.
- Use `docs/architecture/renderer-markers-and-selectors.md` for the focused DOM marker protocol: which root `nop-*` markers stay, when `data-slot` replaces renderer-internal regions, and when state must move to `data-*` / `aria-*`.
- If the two ever appear to disagree, this file defines the higher-level styling architecture and `renderer-markers-and-selectors.md` must be aligned to it.

## UI Component Library: shadcn/ui

### Why shadcn/ui

The framework uses shadcn/ui components (from `@nop-chaos/ui`) as the UI component layer for these reasons:

1. **Separation of Concerns**
   - **UI Interaction Layer** (shadcn/ui): hover, focus, keyboard navigation, accessibility, animations
   - **Business Logic Layer** (flux-runtime): action dispatch, form state, validation, data binding
   - **Schema Layer** (flux-core): JSON-driven configuration, semantic props

2. **No Lock-in**: shadcn/ui is "copy-paste" components, not a black-box library. We own the code and can modify it.

3. **TailwindCSS Native**: Built on Tailwind classes, matches our styling system perfectly.

4. **Accessibility Built-in**: radix-ui primitives provide ARIA support, keyboard navigation, focus management out of the box.

5. **Variant System**: `class-variance-authority` (cva) provides clean variant/size APIs that map naturally to schema props.

For the detailed DOM marker contract around `role`, `data-slot`, root `nop-*` markers, and state attributes, see `docs/architecture/renderer-markers-and-selectors.md`.

### Architecture Integration

```
┌─────────────────────────────────────────────────────────────┐
│                     JSON Schema                              │
│  { type: "button", variant: "primary", label: "Submit" }    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  flux-runtime (stateless)                    │
│  - Compile schema → props                                    │
│  - Resolve expressions                                       │
│  - Map schema props to component props                       │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   flux-react (renderers)                     │
│  - ButtonRenderer receives: { variant, size, disabled, ... }│
│  - Pass props to @nop-chaos/ui Button                        │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   @nop-chaos/ui (shadcn)                     │
│  - Button handles: hover, focus, disabled styles             │
│  - radix-ui provides: keyboard nav, ARIA                     │
│  - cva generates: Tailwind classes for variants              │
└─────────────────────────────────────────────────────────────┘
```

### What shadcn/ui Handles

| Concern | Owner | Example |
|---------|-------|---------|
| Hover/focus styles | shadcn/ui | `hover:bg-primary/90`, `focus-visible:ring-2` |
| Keyboard navigation | radix-ui | Tab, Enter, Escape handling |
| Accessibility | radix-ui | ARIA attributes, roles |
| Animation | Tailwind | `transition-colors`, `animate-in` |
| Variant styles | cva | `variant="destructive"` → red background |
| Size styles | cva | `size="sm"` → smaller padding |

### What flux-runtime Handles

| Concern | Owner | Example |
|---------|-------|---------|
| Disabled state | schema/runtime | `disabled: "${form.submitting}"` |
| Visibility | schema/runtime | `visible: "${hasPermission}"` |
| Click action | schema/runtime | `onClick: { action: "submitForm" }` |
| Label text | schema/runtime | `label: "${i18n.submit}"` |
| Form binding | schema/runtime | `name: "email"` with validation |

### Component Props Mapping

Renderer maps schema props to shadcn/ui component props:

```typescript
// flux-renderers-basic/src/button.tsx
function ButtonRenderer(props: RendererComponentProps<ButtonSchema>) {
  return (
    <Button
      variant={props.props.variant}      // schema → component
      size={props.props.size}            // schema → component
      disabled={props.meta.disabled}     // runtime → component
      onClick={props.events.onClick}     // action → handler
    >
      {props.props.label}
    </Button>
  );
}
```

### Dependency Profile

Core dependencies (shared across most components):
- `radix-ui` - UI primitives (Dialog, Select, Tabs, etc.)
- `class-variance-authority` - Variant/size class generation
- `clsx` + `tailwind-merge` - Tailwind class merging via `cn()`
- `lucide-react` - Icon library

Excluded dependencies (not needed for basic rendering):
- `react-hook-form` - Form validation (flux has its own)
- `zod` - Schema validation (flux has its own)
- `recharts` - Charts (separate concern)
- `cmdk` - Command palette (separate concern)
- `date-fns` - Date utilities (separate concern)

### Included Components

The authoritative list is `packages/ui/src/index.ts`. Current core components:

- Button, Checkbox, Switch, RadioGroup
- Dialog, Sheet, Drawer
- Select, NativeSelect, Input, InputGroup, Textarea, Label
- Tabs, DropdownMenu, Popover, Tooltip
- Table, Card, Badge, Avatar
- ScrollArea, Separator, Progress
- Alert, AlertDialog, Skeleton, Spinner
- Accordion, Breadcrumb, Calendar, Carousel, Collapsible
- Command, Combobox, ContextMenu, HoverCard
- InputOTP, Kbd, Menubar, NavigationMenu, Pagination
- RadioGroup, Resizable, Sidebar, Slider
- Toggle, ToggleGroup
- Field, ButtonGroup, Empty, Item, JsonViewer
- Toaster + toast (from sonner)
- Toolbar components (UndoRedoControls, ClipboardControls, etc.)

### How to add a new shadcn/ui component

1. Copy the shadcn/ui component source into `packages/ui/src/components/ui/<name>.tsx`.
2. Ensure imports use `@/lib/utils` → `../../lib/utils` (relative path within the package).
3. Add `export * from './components/ui/<name>';` to `packages/ui/src/index.ts`.
4. If the component needs a new dependency (e.g. a radix primitive), add it to `packages/ui/package.json`.
5. Verify with `pnpm --filter @nop-chaos/ui typecheck && pnpm --filter @nop-chaos/ui build`.

## Design Principles

## Architecture Guardrails (Bug-Derived)

These constraints prevent silent styling regressions in monorepo and renderer integration flows:

- Tailwind class generation must be treated as a runtime dependency, not an assumption. In monorepo apps, `@source` coverage and path correctness are required.
- `@source` and `@config` paths must be validated relative to the CSS file location, especially after directory moves.
- Semantic marker classes (for testing and host integration) are architecture contracts and should not be removed during visual refactors.

Use `docs/references/architecture-guardrails-from-bugs.md` for practical diagnostics and regression checks.

### 1. TailwindCSS as the Foundation

All styling ultimately resolves to TailwindCSS classes. The framework does not introduce a parallel styling system.

```
Schema → (semantic props OR className OR classAliases) → Tailwind classes → DOM
```

### 2. Three Authoring Modes

| Mode | User Type | Example |
|------|-----------|---------|
| Semantic Props | Visual editor users | `direction: "row", gap: "md"` |
| Raw className | Developers | `className: "flex flex-row gap-4"` |
| classAliases | Both (reusable patterns) | `className: "card"` → expands to full classes |

All modes can coexist. Semantic props and classAliases both convert to Tailwind classes internally.

### 3. Semantic Props as Sugar

Semantic props are "syntax sugar" that:
- Improve readability in JSON schema
- Enable visual editor UI (dropdowns, sliders)
- Provide type-safe, validated input
- Convert to Tailwind classes at render time

Example transformation:

```json
{
  "type": "container",
  "direction": "row",
  "gap": "md",
  "align": "center"
}
```

Internally converts to:

```json
{
  "type": "container",
  "className": "flex flex-row gap-4 items-center justify-center"
}
```

## classAliases Mechanism

### Purpose

Long Tailwind class strings are:
- Hard to read in schema
- Hard to maintain (change requires updating multiple places)
- Not semantic (what does `bg-white rounded-lg shadow-md p-4` mean?)

### Why `classAliases` (not `styles` or `stylePresets`)

| Name | Problem |
|------|---------|
| `styles` | Misleading - suggests inline styles `{color: red}` |
| `stylePresets` | Too long |
| `classNames` | Confusing - looks like an array of class names |
| `classAliases` | Accurate - expresses "short name → long name" mapping |

The name `classAliases` clearly expresses:
1. It's about CSS **classes** (not styles)
2. It's an **alias** mechanism (short name expands to full definition)

### Schema Definition

```typescript
interface BaseSchema {
  type: string;
  classAliases?: Record<string, string>;  // Alias name → Tailwind classes
  className?: string;
  // ...
}
```

### Usage Example

```json
{
  "type": "page",
  "classAliases": {
    "card": "bg-white rounded-lg shadow-md p-4 border border-gray-200",
    "card-hover": "hover:shadow-lg hover:border-blue-300",
    "heading": "text-2xl font-bold text-gray-900",
    "text-muted": "text-sm text-gray-500",
    "btn": "px-4 py-2 rounded font-medium transition-colors",
    "btn-primary": "btn bg-blue-500 text-white hover:bg-blue-600",
    "btn-danger": "btn bg-red-500 text-white hover:bg-red-600"
  },
  "body": [
    {
      "type": "container",
      "className": "card card-hover",
      "body": [
        { "type": "text", "text": "Title", "className": "heading" },
        { "type": "text", "text": "Description", "className": "text-muted" },
        { "type": "button", "label": "Submit", "className": "btn-primary" }
      ]
    }
  ]
}
```

### Nested Alias Expansion

Aliases can reference other aliases:

```json
{
  "classAliases": {
    "btn": "px-4 py-2 rounded font-medium",
    "btn-primary": "btn bg-blue-500 text-white",
    "btn-lg": "btn text-lg px-6 py-3"
  }
}
```

`btn-primary` expands to: `px-4 py-2 rounded font-medium bg-blue-500 text-white`

### Resolution Algorithm

```typescript
function resolveClassAliases(
  className: string | undefined,
  aliases: Record<string, string> | undefined,
  visited: Set<string> = new Set()
): string {
  if (!className || !aliases) return className ?? '';
  
  return className
    .split(/\s+/)
    .filter(Boolean)
    .flatMap(token => {
      // Prevent circular references
      if (visited.has(token)) {
        return [token];
      }
      
      // Not an alias, keep as-is
      if (!aliases[token]) {
        return [token];
      }
      
      // Expand alias recursively
      visited.add(token);
      const expanded = resolveClassAliases(aliases[token], aliases, visited);
      visited.delete(token);
      
      return expanded.split(/\s+/).filter(Boolean);
    })
    .join(' ');
}
```

### Scope Inheritance

`classAliases` defined at page level are available to all children:

```
page (classAliases: {card, btn})
  └── container (className: "card")  ✓ resolves
       └── button (className: "btn") ✓ resolves
```

Child components can add their own aliases that extend parent aliases:

```json
{
  "type": "page",
  "classAliases": { "btn": "px-4 py-2 rounded" },
  "body": [
    {
      "type": "form",
      "classAliases": { "btn": "px-4 py-2 rounded font-bold" },
      "body": [
        { "type": "button", "className": "btn" }
      ]
    }
  ]
}
```

Child aliases override parent aliases with the same name.

### Implementation Location

| Package | Responsibility |
|---------|----------------|
| `flux-core` | `resolveClassAliases` and `mergeClassAliases` utility functions |
| `flux-react` | Alias resolution at render time via `ClassAliasesContext` in node-renderer.tsx |

## Renderer Styling Contract

### Core Principle: Identity Only, No Implicit Layout

Every renderer (container, flex, text, icon, etc.) must follow a strict separation:

| Layer | Owns | Does NOT own |
|-------|------|-------------|
| **Renderer (code)** | Structural marker class (`nop-container`, `nop-flex`), ARIA attributes, DOM structure | gap, direction, padding, margin, width, height |
| **Schema (classAliases + className)** | All visual and layout decisions | — |
| **Global CSS (base.css)** | Interaction pseudo-states (`[data-selected]`, `:hover`), design tokens (`--foreground`, `--primary`) | Context-specific spacing values |

**Why**: A container used inside a card needs `gap-1` (4px), the same container in a form needs `gap-4` (16px), and in a list item it needs `gap-0`. The renderer cannot predict the correct value. When a renderer hardcodes `gap-4`, schema authors cannot see this hidden style and cannot override it without knowing it exists.

### Rule: No Default Layout Styles in Renderers

```
// Good: renderer is a transparent wrapper
<div className={classNames('nop-container', props.meta.className)}>
  {children}
</div>

// Bad: renderer injects invisible layout
<div className={classNames('nop-container grid gap-4', props.meta.className)}>
  {children}
</div>
```

### Marker Class Naming

Renderer marker classes use the `nop-` prefix for root-level semantic markers only:

| Renderer | Marker class | Purpose |
|----------|-------------|---------|
| Container | `nop-container` | Enables CSS targeting for state rules |
| Flex | `nop-flex` | Flex wrapper marker |
| Text | (none) | Inline element, no wrapper needed |
| Button | (handled by shadcn/ui) | `data-slot="button"` via shadcn |

Marker classes must NOT carry any visual styles. They exist solely for CSS selectors, debugging, host integration, and test anchoring.

Rules:

- Keep root semantic markers such as `nop-container`, `nop-page`, `nop-table`, `nop-field`.
- Do not introduce new BEM-style internal region classes such as `nop-page__header` or `nop-table__pagination`.
- Express internal renderer regions with `data-slot`.
- Express renderer state with `data-*` or `aria-*`, not with `--modifier` classes.

This rule is about semantic boundary clarity, not raw DOM performance. Replacing a class with a `data-*` attribute is not treated as a hot-path optimization by itself.

### Exception: Semantic Props Are Explicit

When a schema author writes `"direction": "column", "gap": "md"`, these are **explicit** declarations visible in the schema. The renderer may convert these to Tailwind classes because the author chose them. The rule only forbids **implicit** styles the author did not request.

## Spacing Conventions

### Context-Based Spacing Guide

Following shadcn/ui's approach: spacing is context-specific, always explicit at the usage site, but guided by these conventions:

| Context | Typical gap | Tailwind | Notes |
|---------|-----------|----------|-------|
| Card internal sections | 16px | `gap-4` | Header / body / footer separation |
| Icon + adjacent text | 12px | `gap-3` | Horizontal header layouts |
| Title + subtitle | 4px | `mt-1` or `gap-1` | Tight text pairing |
| Form fields (between) | 16px | `gap-4` | Vertical form spacing |
| Label + input (within field) | 8px | `gap-2` | Input group internal |
| Badge / chip spacing | 8px | `gap-2` | Horizontal tag groups |
| Footer items (between) | 8px | `gap-2` | Left/right footer split |

These values are **conventions, not enforced defaults**. Every usage site declares its spacing explicitly via classAliases or semantic props.

### Recommended classAlias Patterns

For schema authors, these alias patterns provide consistent, self-documenting spacing:

```json
{
  "classAliases": {
    "stack": "flex flex-col",
    "stack-xs": "flex flex-col gap-1",
    "stack-sm": "flex flex-col gap-2",
    "stack-md": "flex flex-col gap-4",
    "stack-lg": "flex flex-col gap-6",

    "hstack": "flex flex-row items-center",
    "hstack-xs": "flex flex-row items-center gap-1",
    "hstack-sm": "flex flex-row items-center gap-2",
    "hstack-md": "flex flex-row items-center gap-3",
    "hstack-lg": "flex flex-row items-center gap-4"
  }
}
```

These utility classes are pre-defined in `packages/tailwind-preset/src/styles/base.css` and available globally. Schema authors can use them directly in `className` without defining their own `classAliases`.

Usage in schema:

```json
{
  "type": "container",
  "className": "stack-xs",
  "body": [
    { "type": "text", "body": "Title", "className": "font-semibold" },
    { "type": "text", "body": "Description", "className": "text-muted-foreground" }
  ]
}
```

### Why Not a Global Default Gap?

A global default gap would reduce boilerplate but creates the exact problem we are solving: invisible styles that surprise schema authors. Consider:

- Title+subtitle in a card: needs 4px gap
- Same title+subtitle in a sidebar: needs 2px gap
- Same title+subtitle in a table cell: needs 0px gap

No single default is correct for all contexts. The `stack-*` alias convention reduces boilerplate while keeping the intent visible.

## Current Implementation

### Container Schema

`packages/flux-renderers-basic/src/container.tsx`:

The ContainerRenderer renders a `<div>` with only a marker class. All layout styles come from schema (`className` or semantic props):

```typescript
// Container renderer (simplified)
<div className={classNames('nop-container', props.meta.className)}>
  {children}
</div>
```

When semantic props (`direction`, `gap`, `align`) are present, the renderer wraps children in a flex inner div:

```typescript
{useFlexChild ? (
  <div className={classNames(flexClasses, gapClass)}>
    {children}
  </div>
) : (
  children
)}
```

The outer wrapper (`nop-container`) never injects layout styles.

### Semantic Prop Mapping

| Prop | Values | Tailwind Output |
|------|--------|-----------------|
| `direction` | `'row'` \| `'column'` | `flex-row` \| `flex-col` |
| `wrap` | `boolean` | `flex-wrap` |
| `align` | `'start'` \| `'center'` \| `'end'` \| `'stretch'` | `items-* justify-*` |
| `gap` | Named tokens: `'none'` \| `'xs'` \| `'sm'` \| `'md'` \| `'lg'` \| `'xl'` → Tailwind gap classes<br>Number values → inline style with px unit<br>Arbitrary CSS string values → inline style passthrough | `gap-*` or `style={{gap: '...'}}` |

### Gap Token Mapping

```typescript
// packages/flux-renderers-basic/src/utils.ts
export function resolveGap(gap: number | string | undefined): {
  className?: string;
  style?: React.CSSProperties;
} {
  if (gap === undefined) return {};
  if (typeof gap === 'number') return { style: { gap: `${gap}px` } };
  const tokenClass = GAP_TOKENS[gap];
  if (tokenClass) return { className: tokenClass };
  return { style: { gap } };
}
```

## className Merging Rule

When both semantic props and `className` are provided, merge them:

```typescript
const finalClassName = classNames(
  'nop-container',
  flexClasses,        // from semantic props (only when props are present)
  props.meta.className // user-provided className (after alias resolution)
);
```

User-provided `className` takes precedence for conflicts (Tailwind's last-wins behavior).

## Decision Matrix

| Scenario | Recommendation |
|----------|----------------|
| Simple layout (flex, gap) | Semantic props (`direction`, `gap`) |
| Complex custom styling | Direct `className` with Tailwind |
| Repeated patterns | Define in `classAliases`, reference by name |
| Visual editor | Semantic props only (editor provides UI) |
| Developer-authored schema | Either mode, prefer semantic for clarity |

## Component Guidelines

### When to Add Semantic Props

Add semantic props when:
- The prop is commonly used (layout, spacing, alignment)
- Visual editor needs a friendly control (dropdown, slider)
- The prop maps cleanly to Tailwind tokens

Do NOT add semantic props when:
- The styling is one-off or rarely used
- The prop would be too complex to validate
- Raw className is simpler and more flexible

### Example: Good Semantic Props

```typescript
interface ContainerSchema {
  direction?: 'row' | 'column';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}
```

### Example: Avoid Over-Abstracting

```typescript
// Bad: Too many props, confusing overlap
interface BadSchema {
  direction?: string;
  flexDir?: string;
  flexDirection?: string;
  gapSize?: number;
  spacing?: number;
  spaceBetween?: number;
}
```

## Performance-Critical Domain: Spreadsheet Canvas

The Renderer Styling Contract above governs the typical low-code renderers (buttons, forms, containers) where each component renders independently. The spreadsheet canvas is a fundamentally different rendering domain: it renders **thousands of homogeneous cells** in a single subtree, making Tailwind's per-element class strategy unsuitable.

### Why Tailwind Doesn't Scale Here

A typical visible spreadsheet area renders ~100 rows × 26 columns = **2,600 cells**. Applying Tailwind to each cell causes:

1. **DOM bloat**: ~80 chars of Tailwind classes × 2,600 cells = ~200 KB extra DOM text
2. **Continuous values**: Font sizes (13px), colors(#FF5733), font families(宋体) are continuous values Tailwind cannot express as utility classes
3. **Rule matching cost**: Each cell must match 10+ CSS rules at layout time

### Hybrid CSS Strategy

The spreadsheet canvas uses a three-layer hybrid approach instead:

| Layer | When | How |
|-------|------|-----|
| Predefined CSS classes (`ss-*`) | CellStyle properties with finite value sets (bold, alignment, border style) | Dedicated CSS file: `canvas-styles.css` |
| Inline `style` | CellStyle properties with continuous values (font size, font family, colors) | React `style` prop |
| `data-*` attributes | Interaction state (selected, editing, range highlight) | CSS attribute selectors |

This is a self-contained rendering subtree. The `ss-*` classes stay inside the canvas boundary and do not leak to the outer shell (toolbar, sidebar, dialogs), which continues to use shadcn/ui + Tailwind.

### Architecture Boundary

```
┌─────────────────────────────────────────────────────────────┐
│ Outer shell (toolbar, sidebar, inspector, dialogs)            │
│   shadcn/ui + Tailwind — matches this document                │
├─────────────────────────────────────────────────────────────┤
│ Spreadsheet Canvas (grid, cells, row/col headers, selection)   │
│   Predefined CSS (ss-*) + inline style + data-* — perf-first  │
└─────────────────────────────────────────────────────────────┘
```

### Key Design Points

1. **Baseline class `ss-cell`**: Carries Excel-default styles (Calibri 11pt, 22px height, left-aligned, gray gridlines). Only non-default properties produce additional classes or inline styles.
2. **`ss-*` prefix**: Namespace-isolated from `nop-*` marker classes and Tailwind utilities.
3. **`data-*` for state**: Follows the same pattern as shadcn/ui's `data-state` and flux renderer's `data-field-*`.
4. **No `cell-style-map.ts` in current implementation**: The current `spreadsheet-grid.tsx` applies inline styles directly from `cell?.style` — the mapping is implicit via React's `style` prop, The `ss-bold`, `ss-italic` etc. classes exist in `canvas-styles.css` but are not yet wired through an explicit style-to-class mapper.

### Full Design Doc

See `docs/architecture/report-designer/spreadsheet-canvas-css.md` for the complete hybrid CSS design rationale, property classification table, class inventory, and performance optimization strategies.

CSS file: `packages/spreadsheet-renderers/src/canvas-styles.css`

## Non-Goals

- NOT a CSS-in-JS solution - aliases resolve to plain Tailwind classes
- NOT a replacement for semantic props - both serve different purposes
- NOT runtime theme switching - aliases are resolved at compile/render time

## Related Docs
- `docs/architecture/theme-compatibility.md` - CSS variables and host theming
- `docs/architecture/renderer-runtime.md` - Renderer props resolution
- `docs/architecture/renderer-markers-and-selectors.md` - DOM marker protocol
- `packages/ui/src/index.ts` - Authoritative UI component export list
- `packages/flux-core/src/index.ts` - `BaseSchema.classAliases` type
- `packages/flux-runtime/src/class-aliases.ts` - Resolution implementation
