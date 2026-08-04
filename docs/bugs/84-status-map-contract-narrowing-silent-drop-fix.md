# 84 Status Map PropContracts Narrower Than Schema — Compile-Time Whole-Prop Drop (Silent Data Loss)

## Problem

- `status`'s `propContracts` declared `labelMap`/`levelMap`/`iconMap` as `{ kind: 'record', value: { kind: 'string' } }`, but `StatusSchema` declares `Record<string, SchemaValue>` (`packages/flux-renderers-content/src/schemas.ts:283-287`) — a value that may legitimately be a number/boolean/null per the schema contract.
- Compile-time shape validation (`shape-validation-node-fields.ts:63-65`) treats a violation as `skippedPropKeys.add(key)` → the WHOLE prop is dropped from the props program:
  - `labelMap: { ok: 123 }` → `props.labelMap === undefined` → the entire status falls into the `miss` branch, even for keys that exist in the map.
  - Same for `levelMap: { done: 1 }` and `iconMap: { done: 5 }`.
- The failure is a warning-severity diagnostic — non-blocking, silent at runtime. Authors see their status labels vanish with no error.

## Diagnostic Method

- C6.3 component audit, dimension 16 (测试质量) hardening test: added a "falls back to the raw key when labelMap value is not a string" case through the **schema-renderer pipeline** — it failed with `data-state="miss"` (badge missing), while the same props rendered correctly when passed directly to the renderer via `createMockRendererProps` (renderer-level fallback `typeof labelMap[key] === 'string' ? labelMap[key] : key` at `status.tsx:71` was already correct).
- A temporary `console.log` of `slotProps.labelMap` confirmed the value arrives as `undefined` through the compile pipeline — narrowing the search to the compiler's prop-skip logic.

## Root Cause

- Contract narrowing: the propContracts (editor-facing, and shape-validation's authority) were narrower than the schema type. `validateKnownPropValue` (`shape-validation-node-fields.ts:39-66`) validates the authored value against `contract.shape` and, when invalid, adds the key to `skippedPropKeys` — the key is then excluded from the compiled props program (`node-compiler.ts:159-161`). A single non-string entry invalidates the whole record, dropping all entries.

## Fix

- Widened the three `status` propContracts' record value kind from `'string'` to `'unknown'` (`content-renderer-definitions.ts:383-401`), matching:
  - `StatusSchema`'s `Record<string, SchemaValue>` declaration (the schema-level public contract);
  - the sibling `mapping`'s `map` contract precedent (`record/unknown`, `content-renderer-definitions.ts:342`);
  - the renderer's existing tolerant fallbacks (`status.tsx:71-74`).
- No renderer behavior change: non-string labels fall back to the raw key, non-string levels fall back to `secondary`, non-string icon names render without an icon (all pre-existing graceful degradation, previously unreachable via the schema path).

## Tests

- `packages/flux-renderers-content/src/status.test.tsx` — 2 new cases, test-first (failed against the old contract):
  1. `keeps non-string labelMap/levelMap/iconMap values through the compile pipeline` — `{ok: 123}` labelMap → `data-state="hit"` + label `ok`; `levelMap: {done: 1}` → `data-level="default"`; `iconMap: {done: 5}` → no svg.
  2. `falls back to the raw key when labelMap value is not a string` — `labelMap: {ok: 123}` → badge text `ok`.
- Full package suite 255 → 259 green.

## Affected Files

- `packages/flux-renderers-content/src/content-renderer-definitions.ts` (status propContracts)
- `packages/flux-renderers-content/src/status.test.tsx`

## Notes For Future Refactors

- propContracts are shape-validation authority, not just editor hints: a contract NARROWER than the schema type causes whole-prop silent drops at compile time. Keep contract shapes ≥ schema type width for record/array containers.
- Test hardening for fallback branches must go through the full schema-renderer pipeline — renderer-direct tests cannot see compile-time prop skips.
