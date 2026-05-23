# Open-Ended Adversarial Review — 2026-05-21 — Round 04

**Execution date**: 2026-05-21
**Result directory**: `docs/analysis/2026-05-21-open-ended-adversarial-review-01/`
**Exploration areas**: host/workbench renderer metadata across report designer and flow designer
**Discovery source**: cross-host `propContracts` sweep after confirming the Word Editor metadata drift pattern

---

## Finding 1: `report-designer-page.config` is still published as an opaque object even though runtime and docs now depend on stable config vocabulary

- **Where**:
  - `packages/report-designer-renderers/src/renderers.tsx:195-201`
  - `packages/report-designer-renderers/src/page-renderer.tsx:245-279`
  - `docs/components/report-designer-page/design.md:25-29,44-45`
- **What**: `report-designer-page` formal metadata still declares `config` as `shape: { kind: 'object', fields: {} }`. But the live page renderer already treats specific config structure as canonical host input: left-panel existence depends on `config.features?.fieldPanel` and `config.fieldSources`, while right-panel existence depends on `config.features?.inspector` plus `config.inspector.body/byTarget/byProfile`. The owner doc also explicitly says side-panel existence is determined by resolved `config`, not by regions alone.
- **Why it matters**: this is a top-level builder-facing host renderer. Its `propContracts` are supposed to be the discoverable authoring surface for tooling and validation, yet the runtime and docs have already moved to a more concrete config vocabulary. Leaving metadata opaque forces schema authors and tool builders to reverse-engineer the real contract from docs or source, even though the supported config keys are no longer incidental implementation detail.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier `report-field-panel` styling/UI issue and not the previously reported `word-editor-page.config` drift. It is a separate host renderer whose formal metadata is lagging behind its own live config contract.

## Finding 2: `designer-page` formal metadata does not express the runtime prerequisite that at least one document input must exist

- **Where**:
  - `packages/flow-designer-renderers/src/renderer-definitions.ts:171-191`
  - `packages/flow-designer-renderers/src/designer-page.tsx:27-42`
  - `packages/flow-designer-renderers/src/designer-tree-mode.tsx:21-47`
  - `docs/components/designer-page/design.md:24-26,49-54`
- **What**: the active `designer-page` doc says the live baseline requires `config` plus at least one document input, and tree mode further narrows the source of truth to `treeDocument`. Runtime enforces that at render time: graph mode without `document` falls back to `documentRequired`, and tree mode without `treeDocument` falls back to `treeDocumentRequired`. But the formal metadata still models both `document` and `treeDocument` as optional opaque objects with no cross-field prerequisite, and the only `schemaValidator` checks toolbar button intent.
- **Why it matters**: this creates a builder-facing false green. Tooling that relies on renderer metadata can accept schemas that look formally valid but are guaranteed to render only a fallback error shell at runtime. For a domain-host root renderer, that is a serious contract gap: the formal authoring surface fails to express a prerequisite that runtime already treats as mandatory.
- **Confidence**: Certain
- **Non-duplication note**: this is not the earlier `designer-page.title` or toolbar `variant`/`intent` drift. The defect here is missing prerequisite modeling for host-root document inputs.

## Round Assessment

The cross-host sweep shows a broader pattern than Word Editor alone: **host/workbench runtime contracts are maturing faster than the formal metadata surfaces consumed by authoring/tooling**. Report Designer underspecifies a now-real config structure, while Flow Designer underspecifies a runtime prerequisite that determines whether the page can function at all.

Immediate improvement direction: audit all builder-facing host renderers so `propContracts` and `schemaValidator` encode the same minimal public truth that docs and runtime already depend on.

## Blind-Spot Self-Assessment

This round intentionally stayed within host-root metadata and did not inspect deeper nested component contracts or host action payload metadata. If the next round continues, it should change family entirely and avoid turning this review into a complete inventory of every opaque `config` object in the repo.
