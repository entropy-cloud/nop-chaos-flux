# Open-Ended Adversarial Review — 2026-05-14 — Round 2

This round followed a performance/identity smell. Recent plans removed `JSON.stringify(...)` from Report Designer document sync, so I looked for adjacent live instances where the same pattern still sits in an interactive renderer path.

## Finding 1: `detail-view` Deep-Serializes the Current Business Value During Render and Uses It as a React Key

**Where**

- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:121-148` builds `viewerRenderKey` from `currentValue`; object values go through `JSON.stringify(currentValue)`.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view.tsx:448-459` renders the viewer slot, then assigns `key={viewerRenderKey}` to the viewer wrapper.
- `packages/flux-renderers-form-advanced/src/detail-view/detail-view-owner-updates.test.tsx:47-149` locks the user-visible requirement that viewer content updates after first/second confirm when the detail value changes.
- `docs/architecture/performance-design-requirements.md:132-136` explicitly lists deep `JSON.stringify` comparisons on every interactive update as a prohibited pattern.

**What**

`detail-view` solves stale viewer content by turning the entire current object value into a React key. For every render where `currentValue` is an object, the renderer performs a full JSON serialization. Any serialized change then remounts the complete viewer subtree instead of letting the normal renderer/scope subscription model update it in place.

This is especially risky because `detail-view` is an editor for object/detail records. Large detail objects, immutable parent form updates, or frequent source refreshes all pay serialization cost in the render path. If the object contains circular data, the code catches the exception and falls back to a constant `object` key, which reintroduces stale viewer risk for precisely the non-plain object cases where serialization cannot represent identity.

**Why It Matters**

This is a residual instance of the exact performance smell recently removed from Report Designer sync, but now inside a form renderer hot path. The performance problem is only half the issue: using serialized data as a React key also destroys local state, focus, subscriptions, and child lifecycles inside the viewer whenever any serialized field changes, even if the viewer only reads a small subset such as `${summary.title}`.

The root cause appears to be a missing precise invalidation path for viewer slot rendering. The workaround bypasses that by forcing remounts from outside the normal region/scope update model. That makes future rich viewer content fragile: a viewer containing tabs, collapsible sections, async child widgets, or expensive child renderers will be torn down for unrelated sibling field changes.

This is not a duplicate of the prior Report Designer `JSON.stringify` finding: that one was whole-document sync dedup in `report-designer-renderers`; this one is `detail-view` viewer remount identity in `flux-renderers-form-advanced`. It is also distinct from the older `detail-view` bug where `name` was ignored as `scopePath`; the current code added this serialization key after that class of viewer-staleness fix.

**Confidence**: High.

## Round Summary

The interesting pattern is not merely "JSON.stringify is slow". It is that stale-region symptoms are being patched with remount-by-key rather than by making the region's data dependencies precise. That can hide correctness issues in small tests while creating performance and lifecycle problems once viewer slots become richer.

## Blind-Spot Self-Assessment

I did not benchmark large detail objects or trace the exact region subscription failure that made `viewerRenderKey` necessary. A follow-up should reproduce the stale viewer case without this key, then fix the invalidation mechanism directly rather than only replacing serialization with a cheaper revision counter.
