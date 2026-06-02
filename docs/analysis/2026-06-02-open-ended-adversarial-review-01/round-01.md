# Open-Ended Adversarial Review — 2026-06-02 — Round 01

**Execution date**: 2026-06-02  
**Result directory**: `docs/analysis/2026-06-02-open-ended-adversarial-review-01/`  
**Exploration areas**: public host contract drift, host projection truth surfaces, async controller safety  
**Discovery source**: contract-vs-runtime reread across designer/editor families plus a stop-check on table quick-edit async behavior

---

## Finding 1: Flow Designer public API doc still teaches actions and payload keys that the live host contract does not support

- **Where**:
  - `docs/architecture/flow-designer/api.md:163-180,214-255`
  - `packages/flow-designer-renderers/src/designer-manifest.ts:107-121,248-267`
  - `packages/flow-designer-renderers/src/designer-action-provider.ts:312-337`
  - `packages/flow-designer-renderers/src/designer-toolbar.tsx:28-33`
- **What**: the public API doc still describes `designer:updateNodeData` / `designer:updateEdgeData` as taking `patch`, describes `designer:addEdge.edgeType`, and documents `designer:openInspector` plus `designer:autoLayout` as host actions. The live manifest/provider expose `data` instead of `patch`, do not publish or consume `edgeType`, and do not expose `openInspector` or `autoLayout` as `designer:*` host methods at all. `autoLayout` only exists as an imperative toolbar callback prop, not as a namespace action.
- **Why it matters**: this is not a mere doc lag. The manifest is the compiler/tooling contract, and the doc is what schema authors will follow. Today a user can write a doc-compliant action payload or action name that fails validation or silently targets a non-existent method. That breaks authoring trust exactly at the public boundary where the repo claims discoverable host capabilities.
- **Confidence**: Certain
- **Non-duplication note**: previous spreadsheet and word-editor findings were about other host families. This round is about live Flow Designer doc-to-manifest drift, not an already-reported designer transaction/result issue.

## Finding 2: Report Designer docs promise one canonical workbook baseline, but live host projection deliberately publishes contradictory workbook truths

- **Where**:
  - `docs/components/report-designer-page/design.md:103-110`
  - `packages/report-designer-renderers/src/host-data.ts:194-233`
  - `packages/report-designer-renderers/src/host-data.test.ts:241-264`
- **What**: the owner doc says `workbook`, `spreadsheet.workbook`, and `reportDocument.spreadsheet` must point at the same canonical workbook baseline. Live code does not do that when a spreadsheet snapshot is present: top-level `reportDocument` and `workbook` come from the report snapshot, while nested `spreadsheet.workbook` comes from the spreadsheet snapshot. The test suite explicitly locks in that divergence and asserts that draft-only cell edits appear only under `spreadsheet.workbook`, while `reportDocument.spreadsheet.workbook` and top-level `workbook` stay unchanged.
- **Why it matters**: this creates a public host projection where two adjacent fields claim to describe the current workbook but actually report different realities. Schema authors and host logic can read one branch for save/export decisions and another for live inspector/preview logic, with no contract signal that they are intentionally different. That is a cross-boundary truth-surface contradiction, not just a convenience alias.
- **Confidence**: Certain
- **Non-duplication note**: this is different from the already-documented dirty-state split in `report-designer:save`. The issue here is a separate host projection contract falsehood about workbook identity.

## Finding 3: Report Designer docs promise structured `preview` / `save` / `exportTemplate` results, but the live manifest still advertises opaque results and the provider returns raw payloads

- **Where**:
  - `docs/components/report-designer-page/design.md:114-118`
  - `packages/report-designer-renderers/src/report-designer-manifest.ts:376-427`
  - `packages/report-designer-renderers/src/host-action-provider.ts:66-73,83-107`
  - `packages/report-designer-core/src/core-dispatch.ts:214-215,273,321-328`
- **What**: the doc says `report-designer:preview`, `report-designer:save`, and `report-designer:exportTemplate` now have a structured live host action result contract. The live manifest still declares all three results as `unknown`, and the provider simply forwards `response.data` from core dispatch. Core currently returns raw adapter payload for preview/export and a cloned document for save, not a normalized discriminated envelope.
- **Why it matters**: this makes the public action contract impossible to rely on statically. Tooling sees `unknown`, docs teach structured branching, and runtime returns whatever each internal path happens to emit. Consumers trying to implement robust schema-side branching on preview/save/export outcomes cannot write against a stable published contract.
- **Confidence**: Certain
- **Non-duplication note**: this is not the previously reported `report-designer:save` dirty-baseline issue. It is a new action-result contract drift between docs, manifest, and runtime.

## Finding 4: Table quick-edit async save can commit stale data after the controller has already reset to a different record/field

- **Where**:
  - `packages/flux-renderers-data/src/table-renderer/table-quick-edit-controller.ts:249-273,321-350`
  - `packages/flux-renderers-data/src/table-renderer/table-quick-edit-cell.tsx:181-191,206-217`
- **What**: `runSave()` awaits `helpers.dispatch(saveAction, { scope: draftRowScope })` and then unconditionally writes `rowScope.update('record', committedRecord)` plus local `savedValue`/`draftValue` state. In parallel, the effect watching `field` and `record` performs an "honest reset" that replaces `draftRecordRef`, `savedRecordRef`, `draftValue`, dialog state, and error state whenever the backing row/field changes. There is no request id, abort, or generation guard tying the async save completion to the controller state that launched it.
- **Why it matters**: if the row re-renders onto different record data, a different field, or a recycled row scope before the save resolves, the stale completion can still write through the old save result into the current `rowScope` and overwrite the freshly reset controller state. This is exactly the kind of non-obvious stale async commit that only appears under fast table updates, virtualization, or reactive row replacement.
- **Confidence**: Very likely
- **Discovery source view**: 时序攻击者
- **Non-duplication note**: prior reviews explicitly avoided re-reporting the accepted quick-edit draft cache pattern. This finding is narrower and behavioral: a live stale async completion hazard in `runSave()`, not the existence of local draft state itself.

## Round Assessment

The strongest theme this round is **public contract authority drift**. In both Flow Designer and Report Designer, the repo now has three competing truths at once: owner docs, manifests/tooling contracts, and the provider/runtime behavior. When those three disagree, schema authors get a uniquely dangerous failure mode: they are not missing a contract, they are following the wrong one.

The second theme is **adjacent truth surfaces that look canonical but are not**. Report Designer exposes multiple workbook views with no explicit contract marker that they intentionally differ. Table quick-edit similarly allows an async save started from one logical generation to commit into a later one. In both cases, the boundary problem is not missing data but missing authority: which version of reality is allowed to win after time passes?

## Blind-Spot Self-Assessment

This round stayed near host contracts and one async controller path. I did not yet do a fresh pass on security boundaries for untrusted schemas, large-scale performance cliffs, or accessibility outside the already-known families. A good next stop-check is to sample another host family or another public contract surface and ask whether docs/manifests/runtime still agree after the recent contract-tightening work.
