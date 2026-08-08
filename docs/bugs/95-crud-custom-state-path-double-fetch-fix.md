# 95 CRUD Custom State Path Double Fetch Fix

## Problem

A CRUD with a custom `paginationStatePath` (state hoisted outside the default
crud state) fired **two** load requests per page change instead of one. The
comment in the load code even admitted "at most 1 extra fetch" — but for
custom paths it was every change, not just occasionally.

## Diagnostic Method

- Hard part: two different dispatch channels both look "correct" in
  isolation; the duplication only appears when both channels react to the
  same state write.
- Mapped the two channels: (1) reactive `force()` re-dispatch triggered by
  subscribed state-path writes, (2) the imperative load effect that runs on
  state change.
- Inspected `__setIgnoreWritesTo` (`crud-renderer-load.ts`) — the existing
  suppression mechanism that prevents the reactive channel from double-firing
  for the _default_ state paths.
- Decisive evidence: the ignore list covered `ownerStatePath` etc. but not
  `paginationStatePath`; a custom pagination path therefore escaped
  suppression and both channels fired on every change.

## Root Cause

- `crud-renderer-load.ts` `__setIgnoreWritesTo` ignore list only covered the
  default/owner state paths. A custom `paginationStatePath` write triggered
  both the reactive `force()` dispatch and the imperative load effect
  dispatch (`:346-350`, "server-correction" comment `:358-364`).

## Fix

- Extended the ignore list with `paginationStatePath` (and same-batch custom
  paths) (`crud-renderer-load.ts:211-225`). With the reactive `force()`
  channel suppressed, only the imperative load effect survives — the request
  count converges to one per change.

## Tests

- `packages/flux-renderers-data/src/__tests__/crud-loadaction-reaction-regression.test.tsx:234`
  (test-first, red before the fix): custom `paginationStatePath` +
  `loadAction` — asserts a single request/change.

## Affected Files

- `packages/flux-renderers-data/src/crud-renderer-load.ts`

## Notes For Future Refactors

- Any new custom state path consumed by CRUD load logic must be added to the
  `__setIgnoreWritesTo` suppression list; otherwise the reactive + imperative
  dual-channel design double-fires.
- The dual-channel design is intentional (reactive force + imperative load);
  suppression lists are the only thing keeping it at one request.
