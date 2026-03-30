# 17 JSON Viewer Class Override Breaks react-json-view-lite Highlighting

## Problem

- `react-json-view-lite` rendered JSON without syntax highlighting — all text was plain black
- Collapse/expand icons (the `▸`/`▾` triangles) were completely invisible
- The JSON was displayed as flat text with no visual differentiation between keys, strings, numbers, booleans, or null values

## Diagnostic Method

- **Diagnosis difficulty: medium.** The library appeared to render, but the output looked like unstyled text.

### Investigation path

1. Verified `react-json-view-lite` was installed and imported correctly — no import errors
2. Inspected the rendered DOM: each JSON value was wrapped in a `<span>` with a hashed CSS class name (e.g., `._1MGIk`, `._3bHx7`)
3. Checked the `<style>` tag injected by the library: the hashed class names had corresponding CSS rules with colors
4. Found the initial implementation passed custom `className` overrides to `JsonView` via a wrapper that replaced the library's default class names with semantic names like `json-viewer-string`, `json-viewer-number`, etc.
5. The custom class names had no corresponding CSS rules — the library's injected `<style>` only defined rules for the hashed class names

### Key evidence

- Library's `defaultStyles` object maps element types (string, number, boolean, etc.) to `{ className: "hashedName" }` — the hashed names are what the injected CSS targets
- Replacing `className` with custom names (e.g., `json-viewer-string`) breaks the link between the style definition and the CSS rule
- The collapse icons are rendered via `::after` pseudo-elements on the container element's class — overriding that class name removes the CSS rule that defines the pseudo-element

## Root Cause

- `react-json-view-lite` uses CSS Modules-style hashed class names (e.g., `._1MGIk`) that are defined in the library's injected `<style>` tag
- The `defaultStyles` object maps semantic roles to these hashed class names: `{ string: { className: "_1MGIk" } }`
- Overriding `className` in the style object with custom names (e.g., `"json-viewer-string"`) replaced the hashed class name with one that has no corresponding CSS rule
- This affected all visual styling: syntax colors, collapse icons (`::after` pseudo-elements), and layout spacing

## Fix

- Use `defaultStyles` directly as the `style` prop without modifying `className` properties
- Control layout and spacing via wrapper elements (`<div className="json-viewer">`) instead of overriding the library's internal class names
- If custom styling is needed in the future, write CSS rules that target the hashed class names or use CSS specificity to override the injected styles

## Tests

- No new automated test — visual regression for syntax highlighting is best caught by screenshot tests or manual review.
- Manual verification confirmed: syntax colors (blue strings, red numbers, green booleans, gray null), collapse/expand icons, and proper indentation all working.

## Affected Files

- `packages/ui/src/components/ui/json-viewer.tsx` — use `defaultStyles` directly, remove class name overrides

## Notes For Future Refactors

1. **Never override CSS class names in `react-json-view-lite`'s `defaultStyles`.** The library uses hashed class names that are linked to injected CSS rules. Changing the class name breaks the link. Use wrapper elements for layout control instead.
2. **`defaultStyles` is the correct customization point** for colors and fonts — modify properties like `color`, `fontSize`, `fontWeight` within each style entry, but never touch `className`.
3. **Collapse icons use `::after` pseudo-elements** on the container element's class. If the container class is overridden, icons disappear even if color styles are correct.
4. **This pattern (hashed class names in CSS-in-JS libraries) is common** — the same issue can occur with any library that uses CSS Modules or scoped styles. Always check whether class names are semantically meaningful or just hashed identifiers before overriding them.
