# Open-Ended Adversarial Review — 2026-05-23 — Round 04

**Execution date**: 2026-05-23
**Result directory**: `docs/analysis/2026-05-23-open-ended-adversarial-review-01/`
**Exploration areas**: `spreadsheet-renderers`, public host method contracts for search/find-replace
**Discovery source**: manifest-vs-runtime contract reread after excluding earlier spreadsheet API-surface findings

---

## Finding 1: Spreadsheet public search contract advertises the wrong option names and silently drops real search semantics

- **Where**:
  - `packages/spreadsheet-renderers/src/spreadsheet-manifest.ts:64-74,585-633`
  - `packages/spreadsheet-renderers/src/host-action-provider.ts:86-145`
  - `packages/spreadsheet-core/src/core/search-operations.ts:24-31,50-79,104-110,145-150,169-192`
  - `packages/spreadsheet-core/src/p1-features.test.ts:361-380`
  - `packages/spreadsheet-core/src/types.ts:98-104`
- **What**: the published host-method contract for `spreadsheet:find`, `findNext`, `replace`, and `replaceAll` says callers should send search options named `wholeCell` and `includeFormulas`. The action provider validates against that manifest and forwards payloads unchanged. But the live core implementation actually reads `matchWholeCell` and `useRegex`; it never reads `wholeCell` or `includeFormulas`, and search logic only inspects `cell.value`, not `cell.formula`. Tests also lock in the real core API by calling `matchWholeCell` and `useRegex` directly.
- **Why it matters**: this is a public host-contract defect, not an internal naming nit. A caller can send a manifest-compliant payload and get silently wrong behavior: `wholeCell` is ignored, `includeFormulas` is ignored, and the actually implemented regex feature is undiscoverable from the published contract. That breaks compile-time tooling, schema authoring, and runtime expectations for all four search/replace methods while still returning superficially valid results.
- **Confidence**: Certain
- **Non-duplication note**: prior spreadsheet API-surface reviews reported missing args/results for some methods in general. This is narrower and live-behavioral: these methods now have explicit args contracts, but the named options in that contract still do not match the implementation that actually runs.

## Round Assessment

This round exposed another high-value pattern: **the contract exists, but it encodes an older or imagined API instead of the one the runtime and tests really use**. That is more dangerous than a missing contract because it gives schema authors a false sense of safety while steering them toward payloads the runtime will quietly misinterpret.

Immediate improvement direction: align `findOptionsShape` with the real core option names and semantics, then decide explicitly whether formula search is truly supported. If it is not, remove `includeFormulas`; if it is, wire it end to end instead of leaving it as a no-op field.

## Blind-Spot Self-Assessment

This round stayed on spreadsheet search contracts and did not inspect UI affordances, translated labels, or whether the spreadsheet toolbar itself sends the documented or the implemented option names. If continuing, the next useful cut would be other manifest-defined host methods whose payloads look specific enough to be wrong rather than merely missing.
