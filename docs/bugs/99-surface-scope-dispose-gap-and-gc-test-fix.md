# 99 Surface Scope Dispose Gap And Fake GC Test Fix

## Problem

Surfaces (`openDialog`/`openDrawer`/`openPage` runtime surfaces) leaked their
scope/store/disposer registrations on close: repeated open→close cycles
accumulated runtime-owned entries until the runtime itself was destroyed. The
existing "L1 regression gate" test (`surface-teardown-gc.test.ts`) stayed
green the whole time — because it mocked the disposal mechanism instead of
exercising the production chain.

## Diagnostic Method

- Hard part: two independent failures masked each other. The leak test was
  green, so the leak was invisible; and the leak made the test's green
  meaningless, so the test never caught anything.
- Audited the surface scope creation path (`runtime-factory.ts`) vs the
  standard child-scope path (`createChildScope`).
- Noticed `createSurfaceScope` used a raw `createScopeRef` — the same
  mechanism that registers real disposers in `createChildScope` was bypassed.
- Decisive evidence: (1) `disposeOwnedScope` (`surface-runtime.ts:121`) fell
  back to `disposeScopeTree`, which only clears source/reaction registrations
  and never calls `scope.dispose()`; (2) `surface-teardown-gc.test.ts:25-29`
  injected a mocked `disposeScope`, so the test asserted the mock's behavior,
  not the production path.

## Root Cause

- `createSurfaceScope` (`runtime-factory.ts:598-625`, incl. the `openingScope`
  at `:608-612`) bypassed `createChildScope`, so its scopes never entered
  `ownedScopeDisposers` (`createChildScope` `:353-374` registers a real
  `scope.dispose()`).
- `disposeOwnedScope` defaulted to `disposeScopeTree`
  (`runtime-owned-factories.ts:280`) which clears registrations but does not
  call `scope.dispose()` — a "looks disposed, leaks anyway" path.
- The GC test injected a mock `disposeScope`, giving the L1 gate zero
  discriminating power over the real chain.

## Fix

- Surface scope (main scope **and** `openingScope` — its id has no
  `${mainScopeId}:` prefix, so tree-dispose prefix matching cannot cover it)
  is now registered under disposer management; `disposeOwnedScope` walks the
  real `scope.dispose()` for surface scopes (aligned with the async-data
  pattern).
- `surface-teardown-gc.test.ts` de-mocked: it now asserts through the
  production chain (open surface → close → no residual scope store entries),
  restoring the gate's discriminating power.

## Tests

- `packages/flux-runtime/src/__tests__/surface-teardown-gc.test.ts` — mock
  removed; production-chain dispose asserted (surface open→close → scope
  store empty).

## Affected Files

- `packages/flux-runtime/src/runtime-factory.ts`
- `packages/flux-runtime/src/surface-runtime.ts`
- `packages/flux-runtime/src/runtime-owned-factories.ts`

## Notes For Future Refactors

- Every scope-creation path must route through the disposer-registering
  factory (`createChildScope` or an explicit disposer registration) — raw
  `createScopeRef` escapes lifecycle management.
- Tree-dispose prefix matching is not universal: scopes with non-prefixed ids
  (e.g. `openingScope`) need explicit registration.
- A regression gate that mocks the mechanism it claims to protect is worse
  than no gate — it produces false green.
