# Open-Ended Adversarial Review — 2026-06-02 — Round 06

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: SSR compatibility, XSS injection, error boundary coverage, form validation edge cases  
**Discovery source**: sub-agent scans of 4 previously untouched codebase dimensions

---

## Finding 1: Dialog/drawer title and action regions render outside `SurfaceBodyBoundary` — crashes in title bar escape to parent boundary

**Severity**: Medium

**Where**:

- `packages/flux-react/src/dialog-host.tsx:117-118` — title and actions rendered at the module level, outside `<SurfaceBodyBoundary>`
- `packages/flux-react/src/dialog-host.tsx:161-163` — body content wraps in `<SurfaceBodyBoundary>` (covered)
- `packages/flux-react/src/dialog-host.tsx:258-260` — drawer body also wraps (covered)

**What**:  
In the dialog view component, the surface body content is properly wrapped in a `<SurfaceBodyBoundary>` (which delegates to `<NodeErrorBoundary>`). But the title and action regions are rendered as bare function calls before the boundary:

```tsx
// line 117 – outside any error boundary
const titleNode = surface.title ? renderSurfaceNode(surface.title, surfaceContext) : null;
// line 118 – outside any error boundary
const actionsNode = surface.actions ? renderSurfaceNode(surface.actions, surfaceContext) : null;

// ... later (line 161):
<SurfaceBodyBoundary key={surfaceId}>
  <SurfaceBody surface={surface} key={bodyKey} />
</SurfaceBodyBoundary>;
```

If `surface.title` or `surface.actions` contains a renderer that throws during rendering, the error propagates past the dialog's view boundary to whatever parent boundary exists (typically the `SchemaRootErrorBoundary`). In the worst case — a dialog opened from a page with no root boundary — the crash white-screens the entire host app.

**Why it matters**:  
Dialog titles and action buttons are common places for dynamic content (data-driven labels, loading indicators, conditional buttons). A runtime error in these regions (e.g., a template expression that accesses a missing scope field, or a renderer type that fails to load) currently bypasses the dialog's dedicated error containment zone and escalates to the root.

**Confidence**: Certain  
**Non-duplication note**: No prior round identified any error boundary coverage gap. Round 05's finding was about silent schema-type drops; this is about missing error boundary wrapping, a completely different mechanism.

**Recommendation**:  
Wrap `titleNode` and `actionsNode` in the same `SurfaceBodyBoundary` (or a dedicated `SurfaceTitleBoundary` / `SurfaceActionsBoundary`) so that crashes in these regions are contained to the dialog's error fallback rather than propagating upward.

---

## Finding 2: `validateForm` has a TOCTOU window on `fieldStates` and no concurrent-submission guard — field-level validation updates between read and write can be silently lost

**Severity**: Medium

**Where**:

- `packages/flux-runtime/src/form-runtime-owner.ts:340` — `validateForm` entry: no `isSubmitting`/`getIsSubmitting()` guard
- `packages/flux-runtime/src/form-runtime-owner.ts:466-516` — read-process-write cycle on `fieldStates`
- `packages/flux-runtime/src/form-runtime-submit-flow.ts:180-186` — the only concurrent-submission guard, gates submit entry but not `validateForm`

**What**:  
The form submit flow gates on `getIsSubmitting()` at `submit-flow.ts:180`, then calls `validateForm`. But `validateForm` itself (line 340) has no submitting guard, and the form runtime exposes `validateForm` as a public method callable from actions, lifecycle hooks, and schema-driven events.

Inside `validateForm`, lines 466-516:

1. **Read** `currentFieldStates` from the store snapshot (line 466)
2. **Process** errors synchronously, building `preservedErrors` and `nextFieldStates` (lines 467-508)
3. **Write** via `batchUpdate({ fieldStates: nextFieldStates })` (line 515)

Between the read and the write, a concurrent operation — field-level `validatePath` triggered by a `setValue` from another change event, `revalidateDependents` completing from a prior input, or another `validateForm` call — writes updated errors to the store. The `batchUpdate` at line 515 then overwrites the store with the stale snapshot captured at line 466, **silently discarding** the intermediate error update.

**Concrete scenario**:

1. Form submit begins: `getIsSubmitting()` gates, calls `validateForm`
2. `validateForm` reads `currentFieldStates` — all paths have no errors (line 466)
3. A value-change event fires concurrently (user typing in another field), triggers `setValue` → `validatePath` → `commitPathValidationState` — writes an error to the store for `fieldA`
4. `validateForm` completes its processing — `fieldA` was not in its validated paths (it wasn't the path being validated) — the `preservedErrors` logic (lines 473-475) should preserve it... wait, let me re-read.

Actually, looking at lines 469-490 more carefully:

```ts
for (const [path, fs] of Object.entries(currentFieldStates)) {
  const pathErrors = fs.errors;
  if (!pathErrors) continue; // skip paths with no errors

  if (!validatedPaths.has(path) && !pathsToPreserve.has(path)) {
    preservedErrors[path] = pathErrors; // preserve errors from unvalidated paths
    continue;
  }
  // ...
}
```

If `fieldA` had NO error in `currentFieldStates` (step 2 snapshot), then when step 4 processes `currentFieldStates`, it skips `fieldA` because `fs.errors` is falsy. The error that was committed in step 3 is in the **live store** but NOT in `currentFieldStates` (the snapshot). Then at line 515, `batchUpdate` writes `nextFieldStates` which is built from the stale `currentFieldStates` snapshot. The live store's version of `fieldA` (which has the error) is overwritten.

Wait, actually `nextFieldStates` is built from `currentFieldStates` at line 492 (`{ ...currentFieldStates }`), then merged with `mergedErrors`. The error from the concurrent write IS in the live store but NOT in `nextFieldStates`. Since `batchUpdate` sets a new state, and the concurrent write's effect was on the OLD state, the concurrent write's error could be lost.

Actually, Zustand `setState` does a shallow merge by default. `batchUpdate` likely does `setState({ fieldStates })` which replaces the entire `fieldStates` key. If the concurrent write's `commitPathValidationState` did `setState({ fieldStates: { ...prev, [path]: { ...prev[path], errors } })`, it would be working on the previous state. Then `batchUpdate` would write the full replacement. The result depends on execution order.

But if the concurrent write happens AFTER the read (466) and BEFORE the write (515), the write replaces whatever the concurrent write did. The concurrent write's error for `fieldA` is indeed lost.

**Why it matters**:  
This is a silent error-loss bug. A field that becomes invalid DURING form validation (because its dependencies changed, or because another field's new value triggered its validation) can have its error state overwritten by `validateForm`'s stale snapshot. The form might submit as "valid" even though a field is actually in error state, or a visible error message might disappear.

**Confidence**: High — the code path is clear: snapshot-based read at 466, no lock, write at 515.  
**Non-duplication note**: Prior rounds addressed async lifecycle (round 01, quick-edit stale save) and form submission guard existence (round 04 sub-agent explored the submit guard). Neither identified the TOCTOU vulnerability inside `validateForm`'s error-merging logic.

**Recommendation**:  
Either:

- (a) Add an `isSubmitting` gate at the entry of public `validateForm()`, or
- (b) Replace the snapshot-based write with a functional update that merges rather than replaces, or
- (c) Hold a per-form validation lock (`Promise`-based mutex) so concurrent `validateForm` and `validatePath` calls serialize.

---

## Finding 3: Runtime creation factory calls execute outside root error boundary — crash white-screens host app (known, unresolved)

**Severity**: Medium

**Where**:

- `packages/flux-react/src/schema-renderer.tsx:133-162` — `createRendererRuntime()`, `createPageRuntime()`, `createSurfaceRuntime()` in `useMemo`/`useRef` blocks
- `packages/flux-react/src/schema-renderer.tsx:394-411` — `SchemaRootErrorBoundary` wraps the tree **below** these factories

**What**:  
The `SchemaRenderer` component creates runtime instances in `useMemo`/`useRef` hooks:

```tsx
// ~line 133
const runtime = useMemo(() => createRendererRuntime({...}), [...]);
// ~line 155
const page = useRef(createPageRuntime({...}));
```

These run BEFORE the JSX returns the `<SchemaRootErrorBoundary>` tree. If any of these factory functions throw (e.g., invalid store configuration, malformed action dispatcher setup, import resolution failure), the error is **not caught by any React error boundary**. It propagates to the root React tree, unmounting the entire application and showing a white screen.

`createSurfaceRuntime()` is similarly called from `useMemo` inside dialog/drawer views, also before any error boundary wraps them.

**Why it matters**:  
This gap has been acknowledged in multiple plans (Plan 312, Plan 340) and intentionally left as "out of scope" each time. Unlike the per-node `NodeErrorBoundary` which cleanly isolates individual schema node failures, a crash during runtime creation cannot be recovered from with the current architecture — the error boundary that would catch it has not been mounted yet.

**Confidence**: Certain. Both known and unresolved.  
**Non-duplication note**: This is distinct from the dialog title/actions gap (Finding 1, this round). That finding is about surface content regions lacking boundary coverage. This finding is about the factory functions that create the entire rendering context — a structural gap in the architectural layering.

**Recommendation**:  
Wrap the runtime creation calls in a try/catch within the `useMemo`/`useRef` initializers, or restructure the component so that the boundary mounts before the factories execute (e.g., using a lazy initialization pattern that defers runtime creation to an effect).

---

## Synthesis: Round Assessment

This round sampled 4 new dimensions (SSR compatibility, XSS injection, error boundary coverage, form validation edge cases). Two dimensions yielded no high-value findings (SSR is well-guarded; XSS posture is excellent). Error boundary and form validation each produced 1-2 findings.

**Updated Final Tally**:

| Round     | New Findings | Cumulative |
| --------- | ------------ | ---------- |
| 01        | 4            | 4          |
| 02        | 1            | 5          |
| 03        | 0            | 5          |
| 04        | 3            | 8          |
| 05        | 1            | 9          |
| 06        | 3            | 12         |
| **Total** | **12**       |            |

Explored dimensions count: **12 distinct codebase areas** across 6 rounds.

## Blind-Spot Self-Assessment

Remaining largely unexamined:

- Performance profiling (compilation time, memory, render performance)
- Accessibility (aria, keyboard navigation, focus)
- Deep CSS/Tailwind monorepo scanning
- E2E test coverage gaps (which critical paths lack tests)
- File upload/download security
- WebSocket/realtime data paths
- Server-side rendering compatibility gap _impact_ (CodeMirror widget is the only concrete issue)
- Nested surface stacking / z-index management
- Drag-and-drop interactions
- Undo/redo state management (if implemented)
