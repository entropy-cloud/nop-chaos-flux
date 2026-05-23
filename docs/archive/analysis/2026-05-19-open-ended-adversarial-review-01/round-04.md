# Open-Ended Adversarial Review — 2026-05-19 — Round 04

**Execution date**: 2026-05-19
**Result directory**: `docs/analysis/2026-05-19-open-ended-adversarial-review-01/`
**Exploration areas**: `report-designer-renderers`, `report-designer` architecture contracts
**Discovery source**: default-shell capability reread + bridge summary verification

---

## Finding 1: `ReportDesignerBridge.getDesignerSnapshot()` still downgrades undo/redo to spreadsheet-only runtime state

- **Where**:
  - `packages/report-designer-renderers/src/bridge.ts:70-94`
  - `packages/spreadsheet-renderers/src/bridge.ts:19-25,54-60`
  - `packages/report-designer-renderers/src/host-data.ts:148-180`
  - `docs/architecture/report-designer/design.md:444-450`
- **What**: `deriveDesignerHostSnapshot()` reuses `spreadsheet.runtime` and only patches `dirty`. It does not aggregate `canUndo` / `canRedo` the way `host-data.ts` and `statusPath` publication already do. So `getDesignerSnapshot().runtime.canUndo/canRedo` still reflect spreadsheet history only, even though the active baseline says report-designer bridge/status/host scope should all use the same canonical aggregation rules.
- **Why it matters**: host consumers reading `getDesignerSnapshot()` can silently believe undo/redo is unavailable when report-owned changes are actually undoable. This creates a split between bridge consumers and `statusPath` / host-scope consumers for one of the primary workbench capability signals.
- **Confidence**: Certain
- **Non-duplication note**: distinct from the already-known `ReportDesignerBridge.subscribe()` gap and from the round-02 inspector-open shell mismatch. Subscription can be perfect and the bridge summary can still carry the wrong undo/redo semantics.

---

## Finding 2: The renderer-advertised default report field panel is only a static list, so the default shell drops both drag-drop and keyboard insert contracts

- **Where**:
  - `docs/architecture/report-designer/api.md:120-126`
  - `docs/architecture/report-designer/design.md:242-258`
  - `packages/report-designer-renderers/src/page-renderer.tsx:560-571`
  - `packages/report-designer-renderers/src/fallbacks.tsx:32-37`
- **What**: the active docs say `report-designer-page` renders `fieldPanel` and that when the region is not overridden the renderer provides a default field panel. The same family-level design also says the field panel baseline includes drag-drop to cell/range and a non-drag insert path. But the live default fallback used by `page-renderer.tsx` is just `renderFieldSourceSections(fieldSources)`: a static nested text list with no drag source, no insert control, and no action wiring.
- **Why it matters**: a page using the default shell gets a left panel that looks like a field panel but cannot perform the core field-panel job. This is a real host-capability gap in the out-of-the-box path, not just a missing enhancement for a custom override renderer.
- **Confidence**: Certain
- **Non-duplication note**: this is different from the round-02 `report-field-panel` renderer bug about unsupported keyboard targets. That issue concerned the dedicated interactive renderer. This round's issue is that the default shell path silently falls back to a non-interactive list while docs still describe a default field panel capability.

---

## Round Assessment

This round found a narrower but important pattern: **default/report-public surfaces are weaker than the contract language around them suggests**.

- the bridge snapshot still publishes a weaker undo/redo truth than the canonical host projection baseline
- the default field panel is not actually a field-panel capability surface; it is a read-only placeholder dressed as one

The main direction to watch next is whether other complex-control families also have a difference between:

1. the default shell path
2. the richer override/custom renderer path
3. the docs that describe them as one unified capability surface

## Blind-Spot Self-Assessment

This round stayed specifically on Report Designer default-shell and bridge fidelity. I did not deeply inspect default toolbar behavior, preview/export defaults, or whether similar fallback-contract gaps exist in Spreadsheet Page or Word Editor side panels. If continuing, the next best cut is to inspect default-vs-override capability parity across the remaining host families.
