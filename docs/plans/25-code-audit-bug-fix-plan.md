# Code Audit Bug Fix Plan (#25)

> Plan Status: completed
> Last Reviewed: 2026-04-02


> Based on three code audit documents in `docs/articles/` (2026-04-01).
> Every issue has been verified against the current working tree.
> This plan consolidates the three documents and resolves their disagreements.

---

## Verification Summary

| Audit Doc | Issues Claimed | Verified | Resolved/Not Found | Disagreements |
|-----------|---------------|----------|-------------------|---------------|
| `code-audit-issues-2026-04-01.md` | 11 | 9 confirmed | 1 resolved (B-2 artifacts) | M-1 conclusion wrong |
| `code-audit-issues-2026-04-01-revised.md` | 22 | 20 confirmed | 1 resolved (B-2 artifacts) | Most accurate |
| `code-audit-issues-2026-04-01-revised2.md` | 17 | 15 confirmed | 1 resolved (B-2 artifacts) | M-1 conclusion wrong |

### Key Disagreement Resolution

**M-1 `createNodeId` path collision**: The three documents disagree on whether `a.b` collides with `a_b`.

The regex is `/[^a-zA-Z0-9-_:.]/g` (`flux-core/src/utils/schema.ts:21`). In regex character classes, `-_` is a **character range** (code point 45–95). ASCII `.` is code point 46, which falls **within** this range. Therefore `.` is **NOT** replaced — `a.b` stays `a.b`, no collision with `a_b`.

- **`revised.md` is CORRECT**: `.` is not replaced, collision does not exist.
- **Original and revised2 are WRONG**: they claim `.` gets replaced to `_`.

However, `revised.md` correctly identified a secondary issue: the range `-_` (45–95) unintentionally allows `/` (47), `=` (61), `?` (63), `@` (64), `[` (91), `\` (92), `]` (93), `^` (94) to pass through — none of which are valid HTML ID characters.

**Conclusion**: No collision bug, but regex allows illegal characters. Downgraded to P2.

---

## Phase 1 — Build & Engineering Hygiene (P0)

### FIX-1. Fix three tsconfig include paths

**Status**: ✅ Confirmed  
**Location**: `packages/flux-renderers-data/tsconfig.json:6`, `packages/flux-renderers-form/tsconfig.json:6`, `packages/flux-code-editor/tsconfig.json:6`  
**Problem**: All three contain `"../flux-react/src/**/*.d.ts"` in `include`. When `flux-react/src/` has leaked `.d.ts` files, TypeScript sees them as both input and output → TS5055.  
**Fix**: Remove `"../flux-react/src/**/*.d.ts"` from all three `include` arrays. Use TypeScript project references for cross-package type resolution.  
**Verification**: `pnpm build` passes without TS5055.

### FIX-2. Add CI guard against src/ artifact leakage

**Status**: ✅ Confirmed (artifacts already cleaned, guard script missing)  
**Problem**: `scripts/verify-no-src-artifacts.mjs` does not exist. No CI protection against future leaks.  
**Fix**: 
1. Create `scripts/verify-no-src-artifacts.mjs` that scans `packages/*/src/` for `.d.ts`, `.js`, `.js.map` files (excluding `packages/ui/src/`).
2. Add `"check:src-artifacts": "node scripts/verify-no-src-artifacts.mjs"` to root `package.json`.
3. Wire into `lint` script or CI pipeline.  
**Verification**: `pnpm check:src-artifacts` passes cleanly.

---

## Phase 2 — Logic Correctness (P0–P1)

### FIX-3. Delete erroneous `allowMultiEdge=true` duplicate-edge check

**Status**: ✅ Confirmed  
**Location**: `packages/flow-designer-core/src/core.ts:197-199`  
**Problem**: Copy-paste bug. Two mutually exclusive conditions both return `EDGE_DUPLICATE_ERROR`:

```typescript
// line 193 — correct: reject when NOT allowed
if (!normalizedConfig.rules.allowMultiEdge && hasEdgeConnection(...)) {
  return EDGE_DUPLICATE_ERROR;
}
// line 197 — BUG: also rejects when allowed
if (normalizedConfig.rules.allowMultiEdge && hasEdgeConnection(...)) {
  return EDGE_DUPLICATE_ERROR;
}
```

Default config sets `allowMultiEdge: true` (~line 240), so the flag is **completely non-functional**.  
**Fix**: Delete lines 197–199.  
**Tests**: Add tests for both `allowMultiEdge: false` (rejects duplicates) and `allowMultiEdge: true` (allows duplicates). Current test `core.test.ts:162` only tests default config.  
**Verification**: `pnpm --filter @nop-chaos/flow-designer-core test` passes with new assertions.

### FIX-4. Implement Report Designer import/export commands

**Status**: ✅ Confirmed  
**Location**: `packages/report-designer-core/src/core.ts:702-708`  
**Problem**: `report-designer:importTemplate` and `report-designer:exportTemplate` return hard-coded "not implemented" errors.  
**Fix**:
1. `importTemplate`: Look up codec adapter → call `importDocument` → replace document → reset selection.
2. `exportTemplate`: Look up codec adapter → call `exportDocument` → return result in `CommandResult.data`.
3. Codec resolution: `profile.codecId` > `config.codec.provider`.
4. No codec configured → return structured error (not thrown exception).  
**Tests**: Cover success path, missing codec error, invalid format error.  
**Verification**: `pnpm --filter @nop-chaos/report-designer-core test` passes.

### FIX-5. DataSourceRenderer reads raw schema, bypasses precompiled pipeline

**Status**: ✅ Confirmed  
**Location**: `packages/flux-renderers-data/src/data-source-renderer.tsx:19-20, 55`  
**Problem**: 
- Line 20: `const api = schema.api` — reads raw schema, not `props.props.api` (precompiled).
- Line 55: `runtime.evaluate<ApiObject>(api, ...)` — recompiles on every request including every polling cycle.
- `runtime.evaluate()` calls `compileValue()` without caching (`flux-runtime/src/index.ts:205-208`).  
**Fix**:
1. Change line 20 to `const api = props.props.api`.
2. Remove `runtime.evaluate()` call — `api` is already evaluated.
3. If scope-dependent API params need re-evaluation on each poll, use `evaluateWithState()` to preserve compilation cache and state reuse.  
**Verification**: `pnpm --filter @nop-chaos/flux-renderers-data build` passes. Same `ApiObject` under `data-source` and `ajax` paths produces identical behavior.

### FIX-6. DynamicRenderer double-evaluates already-resolved API

**Status**: ✅ Confirmed  
**Location**: `packages/flux-renderers-basic/src/dynamic-renderer.tsx:15, 30`  
**Problem**: Line 15 correctly reads `props.props.schemaApi` (precompiled), but line 30 passes it to `runtime.evaluate()` which recompiles.  
**Fix**: Remove `runtime.evaluate()` call. Use `schemaApi` directly with `env.fetcher()`.  
**Verification**: `pnpm --filter @nop-chaos/flux-renderers-basic build` passes.

### FIX-7. Unify request execution pipeline (DataSourceRenderer vs ajax action)

**Status**: ✅ Confirmed  
**Location**: `packages/flux-renderers-data/src/data-source-renderer.tsx:69`, `packages/flux-runtime/src/request-runtime.ts`  
**Problem**: `DataSourceRenderer` calls `env.fetcher(evaluatedApi, ...)` directly, bypassing `prepareApiData`, `buildUrlWithParams`, `applyRequestAdaptor`, `applyResponseAdaptor` pipeline that `executeAjaxAction` uses. An `ApiObject` with `requestAdaptor`/`responseAdaptor` behaves differently under the two paths.  
**Fix**: Extract `executeApiObject(api, scope, env, options)` in `request-runtime.ts` as the single entry point. Both `executeAjaxAction` and `DataSourceRenderer` call it.  
**Verification**: Integration test showing identical adaptor behavior under both paths.

---

## Phase 3 — Defensive Fixes (P1–P2)

### FIX-8. `evaluateArray` boundary guard for schema hot-reload

**Status**: ✅ Confirmed  
**Location**: `packages/flux-formula/src/evaluate.ts:140`  
**Problem**: `node.items.map((item, index) => evaluateNode(item, context, env, stateNode.items[index]))` — no bounds check. If schema is reloaded with different array length while `useRef` retains old state, `stateNode.items[index]` is `undefined` → crash on `stateNode.kind` access.  
**Fix**: Add guard before map:
```typescript
if (stateNode.items.length !== node.items.length) {
  stateNode.items = node.items.map((item) => createStateFromNode(item).root);
}
```
Same for `evaluateObject` — missing keys in `stateNode.entries` after schema change.  
**Verification**: HMR / dynamic schema replacement does not crash.

### FIX-9. NodeRenderer missing `React.memo`

**Status**: ✅ Confirmed  
**Location**: `packages/flux-react/src/node-renderer.tsx:40`  
**Problem**: `NodeRenderer` is a plain function export. Parent re-renders unconditionally re-execute all child `NodeRenderer` function bodies (context reads, hook calls) even when props haven't changed.  
**Fix**: Wrap in `React.memo`. Props (`node`, `scope`, `actionScope`, `componentRegistry`, `form`, `page`) are stable references — default shallow comparison is sufficient.  
**Verification**: `pnpm --filter @nop-chaos/flux-react build` passes.

### FIX-10. `createNodeId` regex allows illegal HTML ID characters

**Status**: ✅ Confirmed (downgraded — no collision, but illegal chars pass)  
**Location**: `packages/flux-core/src/utils/schema.ts:21`  
**Problem**: `[^a-zA-Z0-9-_:.]` — the `-_` range (45–95) unintentionally allows `/`, `=`, `?`, `@`, `[`, `\`, `]`, `^`.  
**Fix**: Replace range with explicit characters:
```typescript
return path.replace(/[^a-zA-Z0-9_.\-:]/g, '_');
```
**Verification**: `pnpm --filter @nop-chaos/flux-core test` passes.

### FIX-11. `createFormulaScope` Proxy `get` trap double traversal

**Status**: ✅ Confirmed  
**Location**: `packages/flux-formula/src/scope.ts:70-74`  
**Problem**: `get` trap calls `context.has(property)` then `context.resolve(property)` — two independent scope-chain traversals per property access.  
**Fix**: Remove `has` guard. Call `resolve` directly, fallback to `materialize` only on `undefined`:
```typescript
get(_target, property) {
  if (typeof property !== 'string' || property === '__proto__') return undefined;
  const value = context.resolve(property);
  if (value !== undefined) return value;
  return getIn(context.materialize(), property);
}
```
**Caveat**: Conflates "key absent" with "key present, value is `undefined`". Acceptable in current scope model.  
**Verification**: `pnpm --filter @nop-chaos/flux-formula test` passes.

---

## Phase 4 — Performance Optimization (P2)

### FIX-12. `evaluateArray`/`evaluateObject` early-exit before allocation

**Status**: ✅ Confirmed  
**Location**: `packages/flux-formula/src/evaluate.ts:140, 170`  
**Problem**: Always allocates new array/object, then compares with `shallowEqual`. Unchanged values produce garbage allocations.  
**Fix**: Track `anyChildChanged` flag during child iteration. If no child changed and state is initialized, return `lastValue` directly without allocating.  
**Verification**: `pnpm --filter @nop-chaos/flux-formula test` passes.

### FIX-13. API cache unbounded growth — add LRU cap

**Status**: ✅ Confirmed  
**Location**: `packages/flux-runtime/src/api-cache.ts`  
**Problem**: `Map`-backed cache with TTL but no capacity limit. Dynamic URL patterns (`/api/users/${id}`) can grow unbounded.  
**Fix**: Add `maxEntries` (e.g. 200) with LRU eviction. Simple doubly-linked list + `Map` index.  
**Verification**: `pnpm --filter @nop-chaos/flux-runtime test` passes.

### FIX-14. `createFormulaScope` creates new Proxy per call

**Status**: ✅ Confirmed  
**Location**: `packages/flux-formula/src/scope.ts:57`  
**Problem**: `new Proxy({}, handler)` on every formula evaluation. GC pressure in hot paths.  
**Fix**: Cache Proxy by `EvalContext` identity using `WeakMap`:
```typescript
const formulaScopeCache = new WeakMap<EvalContext, Record<string, any>>();
```
**Verification**: `pnpm --filter @nop-chaos/flux-formula test` passes.

---

## Phase 5 — Deferred Items (P3, not in scope)

| ID | Issue | Reason for Deferral |
|----|-------|-------------------|
| FIX-15 | `evaluateLeaf` in-place mutation of stateNode | Optimization only. `Object.is` guard + `equalityFn` prevent incorrect data. Worst case: unnecessary re-render in concurrent mode. |
| FIX-16 | `ownKeys` triggers full scope materialization | Double-layer caching (`materialize()` memo + `createScopeReader` snapshot) mitigates impact. Document as known limitation. |
| FIX-17 | `resolveNodeMeta` pre-allocates before `shallowEqual` | `shallowEqual` returns old reference on match. Low impact. |
| FIX-18 | `scope.read()` deep chain cost | Snapshot-level memoization exists. Typical depth (3–5) is acceptable. |
| FIX-19 | Node subscription at scope level (not path-level) | Requires compiled dependency extraction + `subscribePath` API — significant architectural change. |
| FIX-20 | Form validation parallel execution | Requires dependency topology analysis + concurrency control. Current serial execution is correct, just slower for large forms. |
| FIX-21 | Flow Core O(N) lookups + `JSON.stringify` dirty check | Requires adding indexes + revision counters. Correct behavior, just slower for large graphs. |
| FIX-22 | Flow Designer docs drifted from implementation | Requires doc/code cross-reference pass. |

---

## Recommended Execution Order

```
Week 1 — Build hygiene + Critical logic bugs
  Day 1-2: FIX-1 (tsconfig) + FIX-2 (CI guard)
  Day 3:   FIX-3 (allowMultiEdge)
  Day 4-5: FIX-4 (Report Designer import/export)

Week 2 — Renderer pipeline correctness
  Day 1-2: FIX-5 + FIX-6 (DataSourceRenderer + DynamicRenderer precompiled pipeline)
  Day 3-4: FIX-7 (unified request execution)
  Day 5:   FIX-8 (evaluateArray boundary guard)

Week 3 — Performance
  Day 1:   FIX-9  (React.memo)
  Day 2:   FIX-10 (createNodeId regex)
  Day 3:   FIX-11 (double traversal)
  Day 4:   FIX-12 (early-exit allocation)
  Day 5:   FIX-13 + FIX-14 (LRU cache + Proxy cache)
```

---

## Acceptance Criteria

After all fixes:

- [x] `pnpm typecheck` passes
- [x] `pnpm build` passes (no TS5055)
- [x] `pnpm lint` passes
- [x] `pnpm test` passes
- [x] `pnpm check:src-artifacts` passes
- [x] `pnpm --filter @nop-chaos/flow-designer-core test` covers `allowMultiEdge` both true/false
- [x] `pnpm --filter @nop-chaos/report-designer-core test` covers import/export success + error
- [x] `pnpm --filter @nop-chaos/flux-formula test` passes (boundary + allocation fixes)
- [x] Same `ApiObject` under `data-source` and `ajax` paths produces identical results

Closure note:

- This plan is complete as of 2026-04-02.
- Deferred items in Phase 5 remain intentionally out of scope for plan #25 and should not block closure.

---

## Source Documents

- `docs/articles/code-audit-issues-2026-04-01.md` — Original audit
- `docs/articles/code-audit-issues-2026-04-01-revised.md` — Revised (most accurate)
- `docs/articles/code-audit-issues-2026-04-01-revised2.md` — Second revision


