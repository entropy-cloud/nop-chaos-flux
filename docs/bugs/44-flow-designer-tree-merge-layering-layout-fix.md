# 44 Flow Designer Tree Merge Layering Layout Fix

## Problem

- In Flow Designer tree mode, DingTalk workflow and Action orchestration could stop looking like a real tree after inserting a new condition branch.
- Branch leaves still rendered, but the continuation after the branch group could stay on the wrong layer or drift horizontally, so the post-merge chain looked structurally incorrect.

## Diagnostic Method

- Rechecked the tree-mode design baseline in `docs/architecture/flow-designer/tree-mode.md` to confirm that branch leaves must fan out first and the downstream continuation must appear after the implicit merge.
- Compared tree editing code in `packages/flow-designer-renderers/src/tree-commands.ts` with the fallback relayout path in `packages/flow-designer-renderers/src/designer-command-adapter-helpers.ts`.
- Confirmed the mutation commands were rebuilding the TreeDocument correctly, so the bug was not branch insertion itself.
- Added focused layout assertions around a projected branch-plus-merge graph; the failing test showed that `simpleTreeLayout()` could keep `continuation.child` above the merge continuation because merge edges were not treated as layering constraints consistently.

## Root Cause

- The previous fallback layout in `packages/flow-designer-core/src/tree-layout.ts` still treated tree mode primarily as a projected graph and tried to infer layering from projected edges.
- That model was fundamentally weaker than DingFlow's nested-tree structure: branch groups were flattened into graph rows, continuation positioning depended on merge-edge heuristics, and nested branch groups were not owned by a real branch-column layout model.
- As a result, adding condition or parallel branches could keep the document structurally correct while still producing a visual result that no longer looked like a tree.

## Fix

- Replaced tree mode's primary synchronous layout baseline with a structured recursive tree layout derived directly from `TreeDocument`.
- The new algorithm measures subtree width/height first, then places branch groups as sibling columns, places continuation below the full branch fan-out, and keeps nested branch groups inside their owning branch column.
- Tree projection remains responsible for nodes/edges, but branch/continuation geometry is now owned by tree structure instead of graph-edge heuristics.

## Tests

- `packages/flow-designer-core/src/tree-layout.test.ts` verifies condition branches, parallel branches, and nested branch groups preserve DingFlow-style nested-tree positioning.
- `packages/flow-designer-renderers/src/designer-command-adapter.test.ts` verifies adding a branch through tree commands keeps the continuation below all branch leaves in the resulting graph document.

## Affected Files

- `packages/flow-designer-core/src/tree-layout.ts`
- `packages/flow-designer-core/src/tree-layout.test.ts`
- `packages/flow-designer-renderers/src/designer-command-adapter.test.ts`
- `docs/testing/2026/05-06.md`

## Notes For Future Refactors

- Tree mode should continue to treat `TreeDocument` as the owner of layout semantics; projected edges are a render artifact, not the source of truth for nested-tree geometry.
- If ELK tree layout behavior changes later, keep it aligned with `layoutStructuredTree()` so manual command relayout, initial render, and explicit auto-layout do not diverge semantically.
