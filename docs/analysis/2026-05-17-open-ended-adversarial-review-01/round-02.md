# Open-Ended Adversarial Review — 2026-05-17 — Round 2

This round's entry angles: **failure isolation perimeter** (where does a crash stop propagating?) and **silent data loss** (where does data disappear without error?). The previous round covered CSS duplication, timeout contract gap, and single-quote escape handling. This round finds that content in dialogs/drawers has no error boundary, custom field compilation errors drop fields without fallback, and the API cache key generator can silently collide.

---

## Finding 1: Surface Dialog/Drawer Content Has No Error Boundary Isolation

**Where**:

- `packages/flux-react/src/dialog-host.tsx:149-159` (`DialogView` renders surface body without error boundary)
- `packages/flux-react/src/dialog-host.tsx:244-254` (`DrawerView` renders surface body without error boundary)
- Compare: `packages/flux-react/src/node-renderer.tsx:225` (every `NodeRenderer` wraps children in `NodeErrorBoundary`)
- Compare: `packages/flux-react/src/schema-renderer.tsx:170-192` (root is wrapped in `SchemaRootErrorBoundary`)

**What**: Every node in the main render tree is individually isolated by `NodeErrorBoundary` (wrapping `NodeRendererResolved` at `node-renderer.tsx:225`). If any single renderer crashes, its error is caught by `NodeErrorBoundary`, which renders a localized error card. The rest of the schema tree continues rendering normally.

But `DialogView` and `DrawerView` (the components that render dialog/drawer body content) render `renderSurfaceNode(surface.body...)` directly inside `DialogBody`/`DrawerBody` WITHOUT any error boundary wrapping:

```tsx
// dialog-host.tsx lines 149-159
<SurfaceScopeProviders {...surfaceContext}>
  {titleNode && (
    <DialogHeader>
      <DialogTitle>{titleNode}</DialogTitle>
    </DialogHeader>
  )}
  <DialogBody>{renderSurfaceNode(surface.body ?? surface.surface.body, surfaceContext)}</DialogBody>
  {actionsNode ? <DialogFooter>{actionsNode}</DialogFooter> : null}
</SurfaceScopeProviders>
```

If a dialog body renderer throws (e.g., a null dereference in a custom renderer, an invalid prop that triggers a render error), the error propagates up past `DialogView`, past the `Dialog` component, and into the host component tree. Depending on the surface's parent context, the nearest error boundary could be the root `SchemaRootErrorBoundary` — which would collapse the ENTIRE schema, not just the dialog.

This is an asymmetry: the main tree has per-node error isolation, but surface content has NO error isolation.

**Why it matters**:

- A dialog is often the most failure-prone part of a schema (complex nested forms, custom component renderers, data-dependent visibility). If a dialog body crashes, the entire application goes down.
- Error boundaries are the only mechanism React provides for render-phase crash containment. Their absence for surface content means surface crashes behave as application crashes.
- The fix is straightforward: wrap the surface body in `<NodeErrorBoundary>`.
- This also applies to `DrawerView` (lines 244-254), which has the identical pattern.

**Root cause**: Error boundary placement was done per-node for the main tree but not extended to surface rendering. The surface rendering code (`dialog-host.tsx`) was likely implemented as a focused feature, and error containment was inherited from the shared component tree familiarity rather than explicitly designed.

**Confidence**: Certain. Verified by reading both dialog-host.tsx and node-renderer.tsx.

---

## Finding 2: Custom Field Compilation Error Silently Drops the Field

**Where**: `packages/flux-compiler/src/schema-compiler/node-compiler.ts:249-261`

**What**: When a renderer declares custom field compilation via `rule.compile`, the compilation is wrapped in a try/catch:

```typescript
try {
  compiledPropEntries[key] = compileRuntimeValueTree(rule.compile(value, fieldContext));
} catch (error) {
  diagnostics.emit({
    code: 'invalid-schema',
    path: `${path}.${key}`,
    message:
      error instanceof Error
        ? `Custom field compilation failed: ${error.message}`
        : 'Custom field compilation failed.',
    severity: 'error',
  });
}
continue; // <-- skips to next key, compiledPropEntries[key] is never set
```

On compilation failure, a diagnostic is emitted with severity `'error'`, but the field key is simply absent from `compiledPropEntries`. The `continue` skips to the next schema key. The compiled output omits this field entirely.

In compile mode where diagnostics are enabled and `continueOnError` is false (the default for development builds), this diagnostic should halt compilation. But in `continueOnError` mode (production) or when diagnostics are disabled, the field silently disappears from the compiled output. No fallback value, no `undefined` placeholder, no type-coerced default.

**Why it matters**: Unlike expression compilation failures (which fall back to the raw value), or missing renderer types (which emit warnings), custom field compilation errors have no fallback path. The field is structurally removed from the compiled template node. A consumer of the compiled node (runtime, renderer, event system) will see the field as simply not existing.

This is particularly dangerous for fields that carry semantic meaning for the renderer:

- A `columnConfig` field that fails compilation would silently vanish, potentially causing a table to render with no column configuration.
- A `validationRules` field that fails would silently vanish, causing the form to validate incorrectly.
- A `requiredWhen` expression field would vanish, silently bypassing required-field validation.

The `error`-severity diagnostic is not surfaced in production unless the host explicitly checks it. Many hosts check `diagnostics.some(d => d.severity === 'error')` and halt rendering, but this depends on the host's implementation.

**Contrast with regular expression compilation**: At the same file lines ~167-176, expression string values that fail compilation are wrapped with `compileValue(value, ...)` and fall back to `value` (the raw string) as a `StaticRuntimeValue`. They don't vanish.

**Root cause**: The try/catch was added for resilience (prevent one bad field from crashing the entire compilation), but the catch handler does not provide a fallback. It only emits a diagnostic. The intent was probably that diagnostics are always checked and compilation stops on error, but the `continueOnError` and `diagnostics.enabled` flags create a path where the field is silently dropped.

**Confidence**: Certain. Verified by reading the exact code path. No compiledPropEntries assignment occurs after the catch block for the failing key.

---

## Finding 3: API Cache Key Collision When `stableStringify` Exceeds Node/Depth Limits

**Where**: `packages/flux-runtime/src/async-data/api-cache.ts:28-77` (`stableStringifyInternal`)

**What**: Cache key generation for API requests uses `stableStringify()` to produce a deterministic string from method, URL, headers, and body. The stringification has two hard limits:

- `MAX_STRINGIFY_NODES = 2000` (line 18)
- `MAX_STRINGIFY_DEPTH = 12` (line 17)

When a value exceeds these limits, `stableStringifyInternal` returns a sentinel string embedded in the output (lines 36, 44):

```typescript
if (budget.remaining < 0) {
  return '"[MaxNodesExceeded]"'; // line 36
}
if (depth >= MAX_STRINGIFY_DEPTH) {
  return '"[MaxDepthExceeded]"'; // line 44
}
```

These sentinel strings are valid JSON string literals. They are embedded directly into the output at the point of truncation. Two DIFFERENT payloads that both exceed the budget limit will produce outputs that share the same truncated suffix — the sentinel.

The cache key for a request is:

```typescript
return `${method}:${url}:${headersStr}:${dataStr}`;
```

If two different requests share the same method and URL but differ only in data payloads that both exceed the budget limit, their cache keys will be identical after stringification truncation. The first request's response will incorrectly serve as the cache entry for the second.

**Practical risk**: A 1000-element array of objects with 3 fields each would cost 1000 (array) + 3000 (element properties) = 4000 budget units — well over the 2000 limit. Any request with a data payload of more than ~500-700 flat objects would hit the budget limit. For deeply nested payloads (12 levels), even small payloads hit the depth limit.

**Why it matters**: API cache key collisions produce WRONG DATA serving from cache. A user's request with payload `{items: [long_array_a]}` would get the cached response from a previous request with `{items: [long_array_b]}`. This is a cache correctness bug, not just a performance issue. The error is silent — no warning is emitted when the budget or depth limit is hit.

The test at api-cache.test.ts:239-249 only verifies that two DIFFERENT payloads produce different keys. It does not test payloads that exceed the budget limit.

**Root cause**: The budget-limited `stableStringify` was designed for bounded serialization in a cache key context, but the truncation behavior produces non-unique keys for sufficiently large payloads. The budget limits were set low enough (2000 nodes) that many real-world API payloads will exceed them. No hash function (like SHA-256) is applied to produce a collision-resistant key from truncated input.

**Confidence**: High. The truncation logic is deterministic and the budget limits are reachable with common payload sizes. The exact collision probability depends on payload structure, but the sentinel-based truncation guarantees that any two payloads exceeding the limit will have key-identical suffixes.

---

## Round Summary

| #   | Area                  | Severity | Summary                                                                                                                                            |
| --- | --------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | React/error isolation | High     | Surface dialog/drawer content has no error boundary; a crash in a dialog body propagates to the root, collapsing the entire app                    |
| 2   | Compiler/diagnostics  | High     | Custom field compilation errors silently drop the field from compiled output; no fallback value — field structurally vanishes                      |
| 3   | API cache             | Medium   | `stableStringify` budget limits (2000 nodes, 12 depth) produce truncation sentinels that can cause cache key collisions between different payloads |

**Connecting theme**: All three findings are **silent degradation mechanisms**. In Finding 1, a dialog crash becomes an app crash without any local signal that isolation failed. In Finding 2, a bad field disappears from the schema silently (in production, where diagnostics may not be checked). In Finding 3, two different requests silently share a cache entry. These are not noisy failures; they're quiet failures where the system continues operating but in a degraded or incorrect state.

**Blind-spot self-assessment for this round**: I did not test the cache key collision experimentally. The finding relies on static analysis of the truncation budget. I also did not verify whether the `beforeAction` plugin pipeline has additional schema-boundary weaknesses beyond what's reported here. The `NodeErrorBoundary` retry-not-remount asymmetry (noted in exploration but not reported — it was already partially covered by the `attemptKey` pattern existing in the root boundary) is a minor residual that could be revisited.

Areas still not covered in this session:

- Debugger runtime state fidelity
- Accessibility patterns beyond the findings in the 2026-05-16 deep audit
- E2E test contract validation
- i18n/internationalization paths
- The `word-editor-core` and `word-editor-renderers` packages
