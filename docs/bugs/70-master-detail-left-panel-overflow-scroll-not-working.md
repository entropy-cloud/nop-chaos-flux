# 70 Master-Detail Left Panel Overflow Scroll Not Working

## Problem

In the master-detail complex page (`#/complex-pages/master-detail`), when the left panel's order list has many items, the panel expands vertically instead of showing a scrollbar. The right content panel also expands, pushing content below the viewport. Expected behavior: the left panel scrolls internally while both panels remain within the Card height.

## Diagnostic Method

- Initial intuition: CSS properties `overflow-y-auto` and `min-h-0` on the left panel were insufficient — assumed missing flex height constraint on the flex row itself
- First "fix": added `overflow-y-auto` and `min-h-0` to containers, plus `flex-1 min-h-0` to the flex row. But the symptom persisted because these only work when the parent chain has a definite height.
- Second "fix": added `flex flex-col` to Card + CSS rules `(.nop-card > .nop-page) { flex: 1; }`. But still didn't work because the CSS `>` child combinator did not match (page was not a direct child of Card).
- **Decisive evidence**: a Playwright `page.evaluate()` script using `getComputedStyle()` showed:
  - Page `flex: 0 1 auto` instead of `1 1 0%` → CSS rule not matching
  - `pageAncestors` tree revealed `DIV.contents` between Card and page
  - Further investigation found `DIV[className=""]` (ShowcaseSchemaHost wrapper) as a SECOND wrapping layer
- Each incorrect fix was attempted without DOM inspection; `getComputedStyle` was the tool that finally revealed the actual DOM structure.

## Root Cause

Three layers of intervening elements broke the flex height chain:

1. **`ShowcaseSchemaHost` wrapper** (`render-host.tsx:86`): `<div className={className}>` — renders a plain block div with no class when `className` is not passed. This div generates a normal block box that completely terminates the flex chain — Card's `display: flex` cannot reach through it.

2. **`SchemaRenderer` wrapper** (`schema-renderer.tsx:426`): `<div className="contents">` — `display: contents` is transparent for CSS layout but NOT transparent for the DOM tree. The CSS `>` child combinator matches DOM tree, not layout tree. So `.nop-card > .nop-page` does not match even though the `contents` div is invisible for layout.

3. **CSS used child combinator** `>` which cannot pass through either wrapper.

Result: `.nop-page` never received `flex: 1`, the page sized to its content height (806px), and the left panel with `overflow-y: auto` never needed to scroll because nothing constrained its height.

## Fix

1. **`render-host.tsx`**: `<div className={className}>` → `<div className={cn('contents', className)}>`. The `contents` class makes this wrapper layout-transparent, allowing the flex chain to reach the page.

2. **`styles-theme-utilities.css`**: `.nop-card > .nop-page` → `.nop-card .nop-page` (descendant combinator). Also for page-body: `.nop-card .nop-page > [data-slot="page-body"]`. The space combinator matches regardless of intervening wrappers.

3. **`page-frame.tsx`**: Added `flex flex-col` to Card so that `.nop-card` is a flex container and `flex: 1` on its flex items (including the page, via `display: contents`) produces a definite height.

## Tests

No permanent regression test added (the diagnostic playwright script was removed after use). The issue is covered by visual/manual verification — left panel becomes scrollable when mock data has many orders.

## Affected Files

- `apps/playground/src/complex-pages/shared/page-frame.tsx` — added `flex flex-col`
- `apps/playground/src/complex-pages/shared/render-host.tsx` — added `contents` class to wrapper
- `apps/playground/src/styles-theme-utilities.css` — changed `>` to space combinator

## Notes For Future Refactors

- **`display: contents` + CSS `>` combinator is a known pitfall**: any future wrapping layer with `contents` will silently break child-selector-based CSS. Always use descendant selectors (space) for cross-layer layout rules.
- **`getComputedStyle()` via `page.evaluate()` should be the first diagnostic tool**, not the last. Reading element class names from the debugger would have revealed the `contents` divs immediately.
- If the `SchemaRenderer`'s `<div className="contents">` is ever removed or changed, the descendant selector is still correct — it degenerates to the same matching as the child combinator when no wrapper exists.
