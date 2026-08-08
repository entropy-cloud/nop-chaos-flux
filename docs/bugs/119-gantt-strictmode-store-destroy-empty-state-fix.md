# 119 Gantt StrictMode Store Destroy Empty-State Fix

## Problem

- `gantt-editor-and-keyboard.spec.ts:9` (editor dialog opens), `gantt-bars-and-links.spec.ts:92` (bar click selects), and `gantt-demo.spec.ts:59` (zoom out changes scale header) failed: the gantt rendered fine initially, but after any store-driven re-render (dblclick a bar / click a bar / zoom) the whole gantt content collapsed to an empty `<div data-slot="gantt">`.
- Regression window: green at CV (2026-08-06) → failing from 08-08 D3.2 onward (previously misattributed to "environment"; D3.2 log listed "gantt ×3").

## Diagnostic Method

- Diagnosis difficulty: medium — the page had zero console/page errors; the gantt collapsed silently on interaction.
- Investigation path:
  1. DOM dump after dblclick (`page.evaluate` on `document.body.outerHTML`) showed the gantt container rendered the **empty-state branch** (`gantt.tsx` line ~454: `totalTaskCount === 0` → bare empty div).
  2. Removed `<React.StrictMode>` from the playground temporarily → test passed → StrictMode double-mount interplay confirmed.
  3. Code review: `ecb54998` (P3-5, plan-2026-08-08-0715-3) added `store.destroy()` to the gantt unmount cleanup — under the React StrictMode dev cycle (setup → cleanup → setup, state preserved) the cleanup empties the store, and the re-seed effect's `lastDataRef` snapshot is unchanged so it early-returns without re-parsing → store permanently empty.

## Root Cause

- `store.destroy()` in the unmount cleanup (P3-5 "reset parsed state") runs during StrictMode's simulated unmount. The gantt's preserved `useState` store instance is destroyed (tasks cleared), and the re-seed effect only re-parses when prop references change — which they don't during the double-mount cycle.
- The empty state is invisible until the next store-driven re-render (destroy does not bump `layoutRevision`), which is why the page looked fine until a user interaction (dblclick/click/zoom) re-rendered it into the empty state.

## Fix

- Self-heal in the re-seed effect (`packages/flux-renderers-scheduling/src/gantt/gantt.tsx`): when the store is empty at effect run (`store.tasks.size === 0`), re-parse from the current schema data (`storeEmpty` check added to the early-return gate and the parse branch). Idempotent — a legitimately empty schema re-parses to the same empty state.
- `store.destroy()` stays in the unmount cleanup (real unmounts still reset parsed state).

## Tests

- `packages/flux-renderers-scheduling/src/gantt/gantt-mount-timing.test.tsx` — "re-seeds the store after a StrictMode double-mount destroy cycle so bars still render (119)": renders the Gantt under `<React.StrictMode>` with stable task prop references, dblclicks a bar, and asserts the Radix `[role="dialog"]` editor opens (portals to `document.body`). Fails red without the fix.
- e2e: gantt-editor-and-keyboard / gantt-bars-and-links / gantt-demo 47/47 green (were 3 failed).

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx`
- `packages/flux-renderers-scheduling/src/gantt/gantt-mount-timing.test.tsx`

## Notes For Future Refactors

- Any unmount cleanup that mutates a `useState`-held store must be checked against StrictMode double-mounting: the preserved state outlives the simulated unmount. Either make the mount side self-healing (this fix) or guard the cleanup with a real-unmount detection.
- `destroy()`-style resets that do not bump the render subscription version (layoutRevision) mask the broken state until the next store-driven re-render — tests must drive an interaction, not just assert initial render.
- Same StrictMode trap family as bug 112 (report-designer StrictMode core dispose, plan-2026-08-08-1315-2).
