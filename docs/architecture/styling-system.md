# Styling System Design

## Purpose

This document defines how the low-code framework handles styling in a TailwindCSS-first environment, including:
- Relationship between semantic props and Tailwind classes
- When to use semantic props vs raw className
- `classAliases` mechanism for reusable class definitions

## Design Principles

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
| `flux-core` | `BaseSchema.classAliases` type definition |
| `flux-runtime` | Alias resolution in schema compiler |
| `flux-react` | Apply resolved className to rendered components |

## Current Implementation

### Container Schema

`packages/flux-renderers-basic/src/index.tsx`:

```typescript
interface ContainerSchema extends BaseSchema {
  type: 'container';
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number | string;
  body?: BaseSchema[];
}
```

### Semantic Prop Mapping

| Prop | Values | Tailwind Output |
|------|--------|-----------------|
| `direction` | `'row'` \| `'column'` | `flex-row` \| `flex-col` |
| `wrap` | `boolean` | `flex-wrap` |
| `align` | `'start'` \| `'center'` \| `'end'` \| `'stretch'` | `items-* justify-*` |
| `gap` | `number` \| `'none'` \| `'xs'` \| `'sm'` \| `'md'` \| `'lg'` \| `'xl'` | `gap-*` |

### Gap Token Mapping

```typescript
const GAP_TOKENS: Record<string, string> = {
  'none': 'gap-0',
  'xs': 'gap-1',
  'sm': 'gap-2',
  'md': 'gap-4',
  'lg': 'gap-6',
  'xl': 'gap-8'
};
```

## className Merging Rule

When both semantic props and `className` are provided, merge them:

```typescript
const finalClassName = classNames(
  'na-container',
  flexClasses,        // from semantic props
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

## Non-Goals

- NOT a CSS-in-JS solution - aliases resolve to plain Tailwind classes
- NOT a replacement for semantic props - both serve different purposes
- NOT runtime theme switching - aliases are resolved at compile/render time

## Related Docs

- `docs/architecture/theme-compatibility.md` - CSS variables and host theming
- `docs/architecture/renderer-runtime.md` - Renderer props resolution
- `packages/flux-core/src/index.ts` - `BaseSchema.classAliases` type
- `packages/flux-runtime/src/class-aliases.ts` - Resolution implementation
