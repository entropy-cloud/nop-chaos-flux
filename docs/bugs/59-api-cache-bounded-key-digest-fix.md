# 59 API Cache Bounded Key Digest Fix

## Problem

- oversized request payloads in `packages/flux-runtime/src/async-data/api-cache.ts` could exceed the bounded stringify budget
- once the budget was exceeded, cache identity could collapse onto the same sentinel suffix even when the original payloads were different
- default cache reuse then risked aliasing distinct requests to the same cached response

## Diagnostic Method

- started from adversarial-review Finding 6, which called out the collision risk in bounded `stableStringify()`
- inspected `stableStringifyInternal()` and confirmed it emitted literal sentinels such as `"[MaxNodesExceeded]"` and `"[MaxDepthExceeded]"`
- compared existing tests with `generateCacheKey()` and found they only proved `stableStringify()` output diverged on one oversized shape, not that the default cache-key path stayed collision-resistant under truncation
- confirmed the fix direction by separating human-readable bounded output from cache-identity output

## Root Cause

- the same bounded stringify representation served both debug-friendly serialization and cache identity
- once depth or node limits were hit, identity quality degraded to shared sentinels without an additional collision-resistant discriminator

## Fix

- `stableStringifyInternal()` now reports whether depth/node bounds were hit while preserving the existing bounded sentinel output
- cache-key generation now appends an `fnv1a64` digest of the full payload when the bounded serializer overflows, so oversized payloads keep a stable collision-resistant identity
- ordinary payloads keep the previous readable key format with no hash suffix

## Tests

- `packages/flux-runtime/src/async-data/api-cache.test.ts` - verifies node-budget and depth-budget overflow still produce bounded output while default cache keys stay distinct for oversized payloads

## Affected Files

- `packages/flux-runtime/src/async-data/api-cache.ts`
- `packages/flux-runtime/src/async-data/api-cache.test.ts`
- `docs/architecture/api-data-source.md`

## Notes For Future Refactors

- keep bounded stringification and cache identity as separate concerns; a readable sentinel is not sufficient cache identity once truncation occurs
- if cache identity moves away from string keys later, preserve the invariant that oversized payloads cannot silently alias under the default path
