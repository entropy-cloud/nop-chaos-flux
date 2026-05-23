# Open-Ended Adversarial Review — Round 3

**Date**: 2026-05-13
**Perspective used**: Cross-cutting concern tracer, integration independence tester
**De-duplication baseline**: Rounds 1-2 + all prior adversarial reviews

---

## Summary

Round 3 traced cross-cutting concerns across three domains: CRUD query-table-datasource coordination, SchemaRenderer recompilation and state preservation, and theme-tokens independence. The most impactful finding is that SchemaRenderer has no structural equality check on the schema prop — any identity change (including inline object creation in JSX) triggers full recompilation, destroying all form values, scroll positions, focus state, and subscriptions. A second major finding is that the theme-tokens package cannot be used independently: it provides zero unconditional color fallbacks, and the playground's own `:root` overrides make all four theme variants dead code.

---

## Finding 1: Schema Identity Change Triggers Full Recompilation — Destroys All Subtree State

**Where**: `packages/flux-react/src/schema-renderer.tsx:51-75`

**What**: `CompiledSchemaTree` uses `useMemo` with `props.schema` as a dependency. If the parent re-renders and passes a new schema object that is structurally identical (same JSON, different reference), the memo recomputes, triggering `runtime.schemaCompiler.compile()`. The compiler has no cache or structural equality check — it creates a fresh `symbolTable`, runs the full compilation pipeline, and produces new `TemplateNode` objects with new IDs.

This causes:

1. New `TemplateNode` objects with new `templateNodeId` values
2. All `NodeRenderer` instances unmount/remount (because `node.id` changes in the key)
3. All form state, scroll positions, component registration, and scope subscriptions are destroyed and recreated
4. Data source subscriptions are re-established with fresh queries

The natural pattern `<SchemaRenderer schema={{ type: 'page', body: [...] }} />` creates a new schema object on every parent render, destroying the entire subtree.

**Why it matters**: This is the single most impactful performance and state-preservation issue in the rendering pipeline. Any component tree using SchemaRenderer with inline schema objects will reset all user state on every parent re-render. The fix would be either a structural hash/memoization layer in the schema compiler, or a `useMemo`-by-default wrapper in SchemaRenderer's public API. This is a "lightning rod" issue that connects compilation, rendering, state management, and performance.

**Confidence**: Certain

---

## Finding 2: Theme-Tokens Package Has Zero Unconditional Color Fallbacks — Cannot Be Used Independently

**Where**: `packages/theme-tokens/src/styles.css:1-46`

**What**: The `:root` block in theme-tokens provides only structural tokens (radius, shadows, spacing, transitions, icon sizes, chart colors, sidebar references). It provides ZERO unconditional color definitions. Every color token (`--background`, `--foreground`, `--primary`, `--border`, etc.) is defined only inside `[data-theme='...'][data-mode='...']` selectors.

This means:

- `packages/ui/src/styles/base.css` unconditionally requires `--border`, `--background`, `--foreground` — all undefined without `data-theme` + `data-mode`
- A consumer importing only `@nop-chaos/theme-tokens/styles.css` + `@nop-chaos/ui/base.css` gets transparent backgrounds, invisible text, and no borders
- There is no "works out of the box" experience for a new consumer

The playground masks this because its own `:root` block (styles.css:35-62) defines ALL color tokens unconditionally, overriding theme-tokens completely.

**Why it matters**: The theme-tokens package is published as a standalone package but cannot be used without either: (1) setting `data-theme` + `data-mode` attributes, or (2) importing the playground's styles.css. The package's own four theme variants (classic/light, classic/dark, glass/light, glass/dark) are effectively dead code in the playground context — the playground never sets `data-theme` or `data-mode`.

**Confidence**: Certain

---

## Finding 3: Playground Never Activates Theme-Tokens' Theme Variants — 200 Lines of Dead Code

**Where**:

- `packages/theme-tokens/src/styles.css:48-250` — four theme variant selectors
- `apps/playground/src/styles.css:35-62` — playground's own `:root` overrides

**What**: The playground never sets `data-theme` or `data-mode` attributes on its root element. This means the four theme variant selectors in theme-tokens (`[data-theme='classic'][data-mode='light']`, etc.) are never activated. The playground uses its own hardcoded warm-neutral palette defined directly in `:root`.

The theme variants define ~200 lines of carefully crafted color tokens (backgrounds, foregrounds, accents, chart colors, glass effects) that are completely unused. Any testing of theme variants can only be done outside the playground, which has no test infrastructure for visual themes.

**Why it matters**: Theme variants are the core feature of the theme-tokens package, but they are never exercised in the project's primary development environment. Bugs in theme variants (incorrect contrast ratios, missing tokens, broken glass effects) would not be caught during normal development. This is a "last mile" integration gap — the tokens are defined but never activated.

**Confidence**: Certain

---

## Finding 4: CRUD `handleRefresh` Stale Closure on Rapid Invocation

**Where**: `packages/flux-renderers-data/src/crud-renderer.tsx:167-216`

**What**: `handleRefresh` is a `useCallback` that closes over `queryState.refreshCount`. On rapid invocation (double-click, programmatic rapid fire), both calls capture the same `refreshCount` value and both write `N + 1`, resulting in a single increment instead of two. The `refreshCount` is the sole mechanism by which `effectiveQuery` switches from `defaultQuery` to `queryState.values` (line 106: `queryState.refreshCount > 0`). A missed increment means the first user query might never take effect.

The same stale-closure pattern affects `handleQuerySubmit` (crud-renderer-ownership.ts:189-212), which is async — two concurrent calls both pass validation and both call `submitQueryValues` with the same stale `refreshCount`.

**Why it matters**: The CRUD is the primary data interaction pattern for most applications. Stale closures in the refresh/query path mean that rapid user interactions can silently skip data refreshes. This is a class of bug that only manifests under specific timing conditions, making it hard to reproduce and diagnose.

**Confidence**: Likely

---

## Finding 5: CRUD Has No Guard Against Selection Changes During In-Flight Operations

**Where**: `packages/flux-renderers-data/src/crud-renderer.tsx` (entire file)

**What**: The CRUD renderer tracks `selectedRowKeys` reactively from scope but has no concept of "operation in progress." When a user selects rows and triggers a bulk action (e.g., delete), the action dispatches via `props.events` but CRUD has no loading/pending state. The user can change the selection while the delete is in flight. When the delete completes and triggers a refresh (clearing selection per `autoClearSelectionOnRefresh`), the stale selection keys may reference already-deleted rows.

**Why it matters**: No guard against selection modification during async CRUD operations. In practice, this could cause "delete by ID" actions to fail silently or target wrong rows. Combined with Finding 4 (stale closures), the CRUD coordination layer has multiple concurrent-state issues.

**Confidence**: Likely

---

## Finding 6: Latent `--radius` Circular Dependency Between Theme-Tokens and Playground `@theme inline`

**Where**:

- `packages/theme-tokens/src/styles.css:3-7` — `--radius: var(--radius-md)` at `:root`
- `apps/playground/src/styles.css:29-32` — `@theme inline` defines `--radius-md: calc(var(--radius) - 2px)`
- `apps/playground/src/styles.css:61` — `:root` override `--radius: 0.75rem` breaks the cycle

**What**: Theme-tokens defines `--radius: var(--radius-md)`. The playground's `@theme inline` block redefines `--radius-md: calc(var(--radius) - 2px)`. This creates a potential circular dependency: `--radius → var(--radius-md) → calc(var(--radius) - 2px) → var(--radius) → ...`. The cycle is broken only because the playground's `:root` block overrides `--radius` with an absolute value `0.75rem` that comes later in cascade order.

If the `:root` override were accidentally removed, reordered, or if a different consumer set up `@theme inline` without the `:root` override, ALL radius-dependent layout would silently break (CSS resolves circular custom properties to "invalid at computed-value time" = no border-radius anywhere).

**Why it matters**: This is a latent trap for anyone trying to use theme-tokens independently. The `--radius` token model is inherently circular without an absolute-value override, but this requirement is not documented.

**Confidence**: Certain

---

## Finding 7: Compilation Error Boundary Retry Is a Dead Loop for Deterministic Errors

**Where**: `packages/flux-react/src/schema-renderer.tsx:51-75`

**What**: The `useMemo` that calls `runtime.schemaCompiler.compile()` executes during render. If `compile()` throws (unknown renderer type, malformed schema), the error propagates to `SchemaRootErrorBoundary`. The boundary catches it and shows a retry button. But pressing retry calls `this.setState({ hasError: false })`, which triggers a re-render of `CompiledSchemaTree`. Since `props.schema` hasn't changed, the `useMemo` returns the same cached value — but wait, `useMemo` doesn't cache errors. On re-render, the factory function runs again, calling `compile()` with the same schema, which throws again. Dead loop.

For schema preparation errors, the situation is worse: `SchemaRootError` (rendered outside the error boundary) has no retry button at all. The user sees a static error display with no recovery mechanism.

**Why it matters**: Users who encounter a deterministic schema compilation error get an error boundary with a "retry" button that never works. The only recovery is for the parent to change the `schema` prop, which is outside the error boundary's control. This is a poor user experience for what should be a recoverable error (the schema author can fix the schema and the app should reflect the fix).

**Confidence**: Certain

---

## Finding 8: Error Boundary Catch/Retry Temporarily Unhides Form Fields, Enabling Phantom Validation

**Where**: `packages/flux-react/src/node-error-boundary.tsx:113-165`, `packages/flux-react/src/node-renderer-resolved.tsx:310-320`

**What**: When a `NodeErrorBoundary` catches an error, React unmounts the subtree, which fires cleanup effects including `notifyFieldHidden(fieldName, false)` — telling the form "this field is no longer hidden." Fields that were hidden are now temporarily marked as visible. If the form validates during the error-display window (e.g., due to a scope change triggering revalidation), it validates fields that should be hidden, producing validation errors the user can't see.

On retry, `notifyFieldHidden(fieldName, true)` fires again, clearing the errors. But during the error-display window, `form.validateForm()` or `form.submit()` would include these phantom fields and potentially fail.

**Why it matters**: In a form with hidden fields and an error boundary, an error in one part of the form can cause validation failures in an unrelated part (the hidden fields). This is a subtle cross-cutting interaction between the error boundary, form validation, and field visibility systems.

**Confidence**: Likely
