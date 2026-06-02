# Open-Ended Adversarial Review — 2026-06-02 — Round 08

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: performance algorithmic complexity, Flow Designer drag-and-drop, schema compilation pipeline, state persistence/serialization

---

## Finding 1: `sanitizeSnapshot` only strips prototype keys, silently passing `NaN`, `undefined`, `Date`, `Map`, `Set` through the snapshot layer — these types corrupt on JSON serialization

**Severity**: High

**Where**:

- `packages/flux-runtime/src/scope.ts:89-136` — `sanitizeSnapshot` and `sanitizeValue`
- Calee at lines 31, 180, 485 — scope state creation and `setSnapshot`
- `packages/flux-runtime/src/scope.ts:185` — `materializeVisible()` output consumed by consumers that may JSON-serialize it

**What**:  
The `sanitizeSnapshot` function strips only prototype-pollution keys (`__proto__`, `constructor`, `prototype`) from scope data. Its recursive helper `sanitizeValue` (lines 111-136) only distinguishes `null` / non-object / Array / plain-object — it has **no special handling** for any of the following types:

| Type          | Stored in snapshot as | `JSON.stringify` yields  | `JSON.parse` yields |
| ------------- | --------------------- | ------------------------ | ------------------- |
| `undefined`   | `undefined`           | **key dropped entirely** | N/A (key missing)   |
| `NaN`         | `NaN`                 | `"null"`                 | `null`              |
| `Infinity`    | `Infinity`            | `"null"`                 | `null`              |
| `Date`        | `Date` instance       | ISO string               | `string` (not Date) |
| `Map` / `Set` | `Map`/`Set` instance  | `"{}"`                   | `{}`                |

These types pass through `sanitizeValue` unchecked because the function only checks `null`, non-object (typeof check passes for NaN, undefined), array, and plain-object. `Date` instances satisfy `typeof value === 'object'` and `!Array.isArray(value)` so they fall into the plain-object branch and have their enumerable properties sanitized (which for a Date instance is nothing).

The `materializeVisible()` output (line 185) extracts snapshot values that may be consumed by downstream logic including JSON serialization. A benchmark test at `scope-read-benchmark.test.ts:254` explicitly feeds it to `JSON.stringify()`.

**Why it matters**:  
If scope data contains any of these types — from form field values, host projections, `setSnapshot` calls, or programmatic scope merges — the data silently corrupts at the first JSON serialization boundary. The corruption is invisible in memory and only manifests as missing fields, wrong types, or null values after a save/load cycle. For example:

- A form field bound to a computed `NaN` value serializes to `null`, then loads back as `null` — the field shows "0" or "null" instead of the computation
- A Date value in scope serializes to a string (ISO format) on save, then loads back as a plain string — code expecting `instanceof Date` breaks
- A Map used in scope state collapses to an empty object on serialization

The `value-adapter.ts:206` `numberAdapter` does strip NaN at the field-adapter boundary for number fields, but this only covers fields using that specific adapter — it does not protect scope data from other sources (host projections, raw `setSnapshot`, host scope values).

**Confidence**: Certain  
**Non-duplication note**: No prior round addressed serialization, type handling, or data corruption. All previous findings were about contracts, async lifecycle, security boundaries, resource leaks, CSS layering, or accessibility.

**Recommendation**:  
Add explicit type guards in `sanitizeValue` for:

- `undefined` → convert to `null` (or skip key)
- `Number.isNaN(value)` → convert to `null`
- `value === Infinity` / `value === -Infinity` → convert to `null` or clamp
- `value instanceof Date` → convert to ISO string (and mark for Date reconstruction on deserialization)
- `value instanceof Map` / `value instanceof Set` → convert to plain object/array

Or, at minimum, add a development-mode `console.warn` when these types are encountered during `sanitizeSnapshot`.

---

## Finding 2: Flow Designer node drag has no canvas boundary constraints — nodes can be silently dragged off-screen to arbitrary coordinates

**Severity**: Medium

**Where**:

- `packages/flow-designer-core/src/core/node-operations.ts:68-70` — `moveNodesInDocument()` adds delta with no clamp
- `packages/flow-designer-core/src/core-node-commands.ts:116` — `moveNodeCommand()` stores position without validation
- `packages/flow-designer-renderers/src/designer-xyflow-canvas/use-xyflow-interactions.ts:86-93` — passes `Math.round(change.position)` without clamp
- `packages/flow-designer-renderers/src/designer-canvas.tsx:359-372` — `onMoveNode` dispatches position without validation
- `packages/flow-designer-renderers/src/designer-command-adapter-graph.ts:107-121` — `moveNode` passes position to core without boundary check

**What**:  
The entire chain from React Flow interaction through to core document mutation — five layers — has **no coordinate validation**:

```ts
// node-operations.ts:68-70
const nextPosition = {
  x: node.position.x + delta.dx, // no clamp, no isFinite check
  y: node.position.y + delta.dy,
};
```

Dragging a node to the edge of the canvas and beyond produces negative or arbitrarily large coordinates that are stored directly into the document state. The resulting node position can be:

- Negative (off-screen to the top/left)
- Abnormally large (off-screen to the bottom/right, or overflow from rapid drag with high DPI)
- `NaN` or `Infinity` (if the delta calculation receives unexpected values from React Flow)

The `onMoveNode` handler at `designer-canvas.tsx:359-372` dispatches the position as-is. `core-node-commands.ts:116` stores it directly. There is no `clampPosition()`, `Number.isFinite()`, or boundary enforcement anywhere in the pipeline.

By contrast, zoom values ARE clamped (`core/viewport.ts:7-8` applies `clampZoom` with explicit min/max bounds). The asymmetry is notable.

**Secondary: Palette drop uses raw screen coordinates when `reactFlowInstance` is null**

`designer-xyflow-canvas.tsx:344-352` — when `reactFlowInstance` is null (possible during rapid unmount/re-render), the onDrop fallback uses `event.clientX` / `event.clientY` (browser screen coordinates in the hundreds–thousands range) as flow coordinates, placing the node far from the visible canvas with no error feedback. The add-node command at `core-node-commands.ts:69` stores this position without any finite or non-negative check.

**Why it matters**:  
Off-screen nodes are invisible to the user with no indication they exist. The document state contains the node (it still appears in counts, still participates in validations, still affects edge routing), but the user cannot find or interact with it. There is no "zoom to fit" or "find node" feature to recover off-screen nodes. A misplaced drag or palette drop effectively "loses" the node in document space.

**Confidence**: Certain  
**Non-duplication note**: No prior round addressed any Flow Designer implementation detail. The earlier Round 01 finding was about Flow Designer API doc contract drift — a different concern entirely.

**Recommendation**:  
Add a `clampPosition(position, canvasBounds)` utility and apply it at:

- Node drag delta application (`node-operations.ts:68-70`)
- Palette drop position (`designer-xyflow-canvas.tsx:348-350`)
- Direct position assignment (`core-node-commands.ts:116`)

At minimum, guard against non-finite values with `Number.isFinite()` checks.

---

## Finding 3: API cache key generation uses `JSON.stringify` for primitives, causing `NaN` and `Infinity` to collide with `null` in cache keys

**Severity**: Medium

**Where**:

- `packages/flux-runtime/src/async-data/api-cache.ts:44-45` — `stableStringifyInternal`: `JSON.stringify(value)` for primitives
- `packages/flux-runtime/src/async-data/api-cache.ts:120` — `hashValue64`: same pattern for primitives
- `packages/flux-runtime/src/async-data/api-cache.ts:239` — cache key includes serialized API `.data`
- `packages/flux-runtime/src/async-data/request-runtime.ts:209` — query param serialization: `JSON.stringify(value)`

**What**:  
The `stableStringify` function produces deterministic cache keys for API requests. For primitive values it delegates directly to `JSON.stringify`:

```ts
// api-cache.ts:44-45
if (value === null || typeof value !== 'object') {
  return { value: JSON.stringify(value), bounded: false };
}
```

`JSON.stringify(NaN)` → `"null"`  
`JSON.stringify(Infinity)` → `"null"`

This means API cache keys for requests whose data contains `NaN` or `Infinity` in the same position are **identical** to keys for requests with literal `null` in that position:

```ts
// api-cache.ts:239
const dataStr = api.data !== undefined ? stableStringifyForIdentity(api.data) : '';
```

If `api.data` is `{ value: NaN }` and another request has `{ value: null }`, both produce the same cache key. The cached response for one request is incorrectly returned for the other. The `hashValue64` function (line 120) has the same gap:

```ts
return `primitive:${JSON.stringify(current)}`; // NaN → "primitive:null"
```

The query param serialization at `request-runtime.ts:209` uses the same unguarded `JSON.stringify`:

```ts
searchParams.append(key, JSON.stringify(value));
```

**Why it matters**:  
This is a silent correctness bug in the caching layer. A cached API response for a request with `NaN` data can be served for a subsequent request with `null` data (or vice versa). The cache correctly handles the TTL and LRU eviction, but the key collision means the wrong response is returned. The `Max-Age` and TTL mechanisms only control when entries are evicted — they do not prevent the collision itself.

This is distinct from Finding 1 (scope snapshot serialization), which is about data persistence. This finding is about in-memory cache correctness for API requests.

**Confidence**: Certain  
**Non-duplication note**: Prior rounds did not examine the API cache layer or caching strategy at all. This finding is specific to the `stableStringify` identity function and `JSON.stringify`'s handling of IEEE 754 special values.

**Recommendation**:  
Replace `JSON.stringify(value)` in `stableStringifyInternal` and `hashValue64` with an explicit type check that handles special float values:

```ts
function primitiveKey(value: unknown): string {
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'primitive:NaN';
    if (!Number.isFinite(value)) return `primitive:${value > 0 ? 'Infinity' : '-Infinity'}`;
  }
  return `primitive:${JSON.stringify(value)}`;
}
```

---

## Synthesis: Round Assessment

This round explored 4 dimensions (performance complexity, Flow Designer drag-drop, schema compilation, serialization). Performance and schema compilation were well-handled architecturally — the only notable aspects were the depth-limit strategy and duplicate ID design choice, neither of which constitutes a bug. Flow Designer drag-drop and serialization each produced concrete issues.

**Updated Final Tally**:

| Round     | New Findings | Cumulative |
| --------- | ------------ | ---------- |
| 01        | 4            | 4          |
| 02        | 1            | 5          |
| 03        | (stop-check) | 5          |
| 04        | 3            | 8          |
| 05        | 1            | 9          |
| 06        | 3            | 12         |
| 07        | 3            | 15         |
| 08        | 3            | 18         |
| **Total** | **18**       |            |

Explored dimensions count: **20 distinct codebase areas** across 8 rounds.

## Blind-Spot Self-Assessment

Remaining unexamined, now very narrow:

- Performance profiling (requires running benchmarks)
- CSS/Tailwind monorepo deep scanning
- Undo/redo state management
- WebSocket/realtime data paths
- CodeMirror widget SSR impact (single narrow point noted in Round 06)

Most dimensions that are amenable to static code analysis without running the application have now been sampled. The remaining blind spots largely require dynamic analysis (benchmarks, browser testing, accessibility screen reader verification, E2E test gap remediation).
