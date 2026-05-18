# 61 Performance Table StrictMode Row Scope Runtime Key Fix

## Problem

- In `apps/playground` performance table Full Stress mode under `React.StrictMode`, host row mutations produced hundreds of render errors.
- The visible failures were table cell and expanded-row expressions such as `${$slot.record.index}` and `${$slot.record.children}` failing after a keyed schema remount plus host data updates.
- Focused Playwright coverage could pass after row-scope lifecycle fixes, but the happy-dom app-level StrictMode regression still caught the stale table row scope ownership bug.

## Diagnostic Method

- Confirmed the page-level regression had unified `console.error` monitoring and reproduced `312` render errors from `apps/playground/src/pages/performance-table-page.test.tsx`.
- Verified earlier fixes for fragment cleanup, row-scope delayed disposal, and explicit `scope: rowScope` region rendering with focused renderer and E2E tests.
- Inspected `SchemaRenderer`, runtime-owned page creation, and table row-scope cache keys. The decisive clue was that `createPageRuntime()` gives each page root the stable scope id `page-root-validation`, while keyed `SchemaRenderer` remounts create different `runtime.runtimeId` values.
- Adding the runtime id to the table owner key made the app-level StrictMode failure disappear, confirming stale cache reuse across replaced renderer runtimes.

## Root Cause

- `TableRenderer` owner-qualified row-scope cache keys included table template identity, table instance path, and `props.node.scope.id`.
- The root page scope id is intentionally stable across runtime instances, so keyed `SchemaRenderer` remounts could reuse a module-level table row-scope cache created by a previous runtime.
- Those reused row scopes could already be disposed or contain stale slot frame state, causing `$slot.record.*` expressions to fail during subsequent table cell and expanded-row renders.

## Fix

- `packages/flux-renderers-data/src/table-renderer.tsx` now includes `useRendererRuntime().runtimeId` in the table owner key used by `useTableRowScopeCache`.
- The row-scope cache remains table-owned and row-key stable inside one runtime, but it no longer crosses runtime replacement boundaries.
- `docs/architecture/table-row-identity-and-scope-performance.md` now records that runtime identity is required when owner ids can be stable across keyed remounts.

## Tests

- `packages/flux-renderers-data/src/__tests__/data-table-row-scope-identity.test.tsx` verifies keyed StrictMode schema remounts create a new row scope instead of reusing the old runtime's row scope.
- `packages/flux-renderers-data/src/__tests__/data-table-pagination-selection.test.tsx` verifies local table rows and row-selection controls are available immediately after render while cache snapshots still update through the external-store version.
- `apps/playground/src/pages/performance-table-page.test.tsx` verifies Full Stress mode and `Run 20 Host Mutations` stay free of console render errors.
- `tests/e2e/performance-table.spec.ts` verifies the browser scenario mode switch and host-mutation path with tracked page errors asserted.

## Affected Files

- `packages/flux-renderers-data/src/table-renderer.tsx`
- `packages/flux-renderers-data/src/__tests__/data-table.test.tsx`
- `packages/flux-renderers-data/src/__tests__/data-table-row-scope-identity.test.tsx`
- `packages/flux-renderers-data/src/__tests__/data-table-pagination-selection.test.tsx`
- `apps/playground/src/pages/performance-table-page.test.tsx`
- `tests/e2e/performance-table.spec.ts`
- `docs/architecture/table-row-identity-and-scope-performance.md`

## Notes For Future Refactors

- Do not use stable page/root validation scope ids alone as cache owner identity for module-level renderer caches.
- Table row scopes may be reused inside one table runtime, but runtime replacement is an ownership boundary.
- Keep app-level StrictMode tests alongside renderer-level tests because this class of bug depends on keyed host remounts and runtime recreation.
