> Audit Status: closed
> Audit Type: open-ended
> Mission: industrial-hmi-editor

# Open-Ended Adversarial Audit — `industrial-hmi-editor`

- **Audit date**: 2026-08-07
- **Scope**: `packages/flux-renderers-industrial/src/editor/` — code, tests, contracts of the `industrial-hmi-editor` mission (the `scada-editor-canvas` renderer + connection / undo-redo / toolbox / inspector / palette subsystems).
- **Method**: `docs/skills/open-ended-adversarial-review-prompt.md` — discovery-led, not the 23-dimension sweep. Heuristics used as entry points: **契约考古学家** (interface promises vs. realized behavior), **生命周期/响应式追踪者** (does mutation reach the UI?), **组合爆炸测试者** (what breaks when `scada-group` nesting meets an editor path), **无障碍用户** (keyboard reachability), **死代码清道夫**.
- **Dedup context**: The companion multi-dimensional audit (`docs/audits/2026-08-07-1835-multi-audit-industrial-hmi-editor.md`, 13 P1 + 22 P2) was read in full and is the dedup baseline. Every finding below is **new** relative to it: either a different root cause, a different code location, or a strictly larger impact range than the multi-audit recorded. Where a finding touches the same _theme_ as a multi-audit item (e.g. grouping, session reactivity), the relationship and the delta are stated explicitly.
- **Baselines consumed**: live source read of `editor-working-helpers.ts`, `connection/connection-adapter.ts`, `connection/connection-link.ts`, `connection/connection-drag-controller.ts`, `connection/connection-overlay*.ts`, `toolbox/{clipboard,align-distribute,z-order}.ts`, `undo-redo/{compute-inverse,undo-redo-adapter}.ts`, `editor-session.ts`, `renderer/editor-engine.ts`, `renderer/hooks/use-editor-engine.ts` (full 824 lines), `renderer/hooks/use-editor-handles.ts`, `scada-editor-canvas.tsx`, `toolbox/toolbox-panel.tsx`, `inspector/inspector-panel.tsx`, `palette/editor-palette.tsx`. Mission state: E10 `pass-with-minors`, implementation closeout per `docs/logs/2026/08-07.md`.

## Heuristic used

I started from **契约考古学家 + 组合爆炸测试者**: take a declared first-class feature (`scada-group`, a documented M2 deliverable) and trace every editor code path that consumes the symbol tree, asking "does this path assume a flat top-level array or world-space coords?" independently for each. I then switched to **响应式追踪者** for the panels: "when the undo stack mutates, which React state tick causes the Undo button to re-evaluate `disabled`?" The two converged on the two headline clusters below.

---

## Executive summary

| Severity | Count | Drive remediation? |
| -------- | ----- | ------------------ |
| P0       | 0     | —                  |
| P1       | 5     | yes                |
| P2       | 7     | backlog            |

**Headline**: Two cross-cutting defects that the E-gate chain and the companion multi-audit both missed, each with systemic reach:

1. **The editor's panels are not reactive to the editing session.** `onSessionChange` is wired to a handler that only dispatches a schema event and calls **no React `setState`**. The canvas's only re-render triggers are `status` / `errorInfo` / `selection`. Consequently the toolbox **Undo/Redo `disabled` state and the inspector validation errors are stale** until an unrelated selection change re-renders the panels. A user who edits a property (no selection change) finds the Undo button still disabled even though the stack just gained an entry; a user who clicks Undo until the stack is empty finds the button still enabled. This is the root-cause gap of which the multi-audit's [P1-07] (selection-mirror divergence) is one symptom.

2. **`scada-group` nesting silently breaks ≥4 editor paths the multi-audit did not enumerate** (on top of its [P1-02] connection-coords instance): linkage-recompute junction discovery, align/copy selection resolution, fit/center bounds, and connection dangling detection. Grouping is a first-class M2 feature and every test fixture keeps groups at world `(0,0)` or never groups the operated node, so the suite is systematically blind to all of them.

Plus three further material defects: the M2 **group/ungroup and basic delete operations have no built-in UI affordance and no keyboard shortcuts**; **group ids use `Date.now()` with no collision guard** (the sibling paste path deliberately uses a monotonic counter to avoid exactly this); and **z-order undo entries are O(n) full-array replaces**, contradicting the R4 "incremental-only, no full snapshot" hard constraint that E8/E10 certified PASS.

---

## P0 findings

None. No global contract break, data loss, or security violation was confirmed. The data-integrity candidates (group-id collision, NaN-on-degenerate-junction) are scoped to specific reachable scenarios rather than global failures.

---

## P1 findings

### [P1] Session/undo-stack mutations never re-render the panels (Undo/Redo enablement + inspector validation go stale)

**[P1] — incorrect behavior / React anti-pattern: `handleSessionChange` only dispatches a schema event and calls no `setState`; the canvas re-renders solely on `status`/`errorInfo`/`selection`. Therefore every session-derived UI surface (Undo/Redo `disabled`, inspector `fieldErrors`, clipboard-count-derived buttons) is computed from a stale render until an unrelated selection change happens.**

- **Where**:
  - `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:135-150` — `handleSessionChange` calls `dispatchEvent(...)` and nothing else (no `setState`).
  - `scada-editor-canvas.tsx:68-70` — the only React state in the renderer is `status` / `errorInfo` / `selection`. grep confirms no session-version bump exists.
  - `toolbox/toolbox-panel.tsx:152-153` — `disabled={!runtime.session.undoStack.canUndo}` / `canRedo` read at render time from the mutable, ref-held `session` object.
  - `inspector/inspector-panel.tsx:40-44` — `fieldErrors = useMemo(() => validateScadaConfig(runtime.session.workingConfig), [runtime, selectedNodeId])`; `runtime` is identity-stable (set once at mount), so this recomputes **only** when `selectedNodeId` changes.
- **What**: The editor reads `runtime.session.*` (a mutable, ref-held, non-React-observable object — `INV-4`) directly in render/`useMemo`. Nothing subscribes to it. `notifySession()` (fired by every mutator) reaches `handleSessionChange`, which dispatches a flux schema event but triggers no React re-render. `selection` is the one exception because `onSelectionChange → setSelection`.
- **Why care (concrete reachable failures)**:
  1. **Property edit via inspector → Undo button stays disabled.** `handleFieldChange` → `updateWorkingNode` → `pushOperation` → `notifySession` (no `setState`). The inspector edit produces a real undo entry, but the toolbox never re-renders, so the Undo button (disabled before the edit) stays disabled. The user's only recourse is to reselect the node to force a render.
  2. **Undo spammed past empty → button stays enabled, clicks silently no-op.** Clicking Undo → `applyUndoRedoDiff` → `notifySession` (no `setState`). After the stack drains, `canUndo` is false but the button keeps its old enabled state; subsequent clicks call `undo()` which returns `undefined` and silently does nothing.
  3. **Inspector validation never refreshes live.** Editing an invalid value does not re-run `validateScadaConfig` in the inspector (deps unchanged); cross-field/cross-node errors appear only after reselecting.
- **Root cause / pattern**: This is the canonical "reading external mutable state in render without `useSyncExternalStore`/subscription" anti-pattern that `docs/skills/react19-best-practices-review.md` warns against. It is the **root** of which the companion multi-audit's [P1-07] (the `session.selection` ↔ React `useState` divergence on 5 mutation paths) is one leaf. Fixing [P1-07] alone (routing selection through a sync helper) would **not** fix items 1–3, because the non-selection session state (undo stack, working copy) still has no reactive channel.
- **Recommendation**: Introduce a session-version counter in the canvas (`const [, bumpSession] = useReducer(x => x + 1, 0)`) bumped from `handleSessionChange`, or have panels subscribe to the session via a small `useSyncExternalStore` adapter over `notifySession`. Either makes `canUndo`/`canRedo`/`fieldErrors` reactive. Add a regression test: edit a property via the inspector, assert the Undo button enables without a selection change; drain the stack via Undo, assert the button disables.
- **Confidence**: 确定 (re-verified `scada-editor-canvas.tsx` state set + `handleSessionChange` body + `useEditorEngine` `notifySession` call sites).
- **Ref docs**: `docs/skills/react19-best-practices-review.md`, `docs/components/industrial-hmi-editor/design-renderer.md` §4.1/§8.1 (`onSessionChange` contract).

### [P1] group / ungroup / delete have no built-in UI affordance and there are zero keyboard shortcuts

**[P1] — absent production wire / accessibility: the default-rendered editor provides palette / inspector / toolbox panels covering align, distribute, z-order, copy/cut/paste, undo/redo, import/export — but NO button and NO keyboard shortcut for delete, group, or ungroup. These M2 operations are reachable only via `component:*` handles (host must wire its own button) or the e2e test handle.**

- **Where**:
  - `scada-editor-canvas.tsx:218-253` — the default layout renders `EditorPalettePanel`, the canvas drop-target, `EditorInspectorPanel`, `EditorToolboxPanel`, status bar. None emits a delete/group/ungroup affordance.
  - `toolbox/toolbox-panel.tsx:119-162` — the default toolbox ships 7 button-groups (view, align/distribute, z-order, clipboard, undo/redo, import/export). No group/ungroup/delete button.
  - `inspector/inspector-panel.tsx:46-82` — property fields only; no delete/group action.
  - `renderer/hooks/use-editor-handles.ts:12-22,72-130` — `removeSymbol`/`group`/`ungroup` ARE registered as `component:*` handles, so a host _can_ wire them; the default panels do not.
  - grep `keydown|keyup|ctrlKey|metaKey` across `src/editor/` → **0 hits** (only `delete window[...]` in test-handle teardown). No Delete, no Ctrl+Z/Y, no Ctrl+C/V, no Ctrl+G, no arrow-nudge.
- **What**: Out of the box, a user of `scada-editor-canvas` cannot delete a placed symbol, nor group/ungroup a selection. The advanced M3 ops (align/distribute/z-order) ship default buttons; the more basic M2 delete/group/ungroup do not — an internal inconsistency strongly suggesting omission rather than intentional host-only boundary.
- **Why care**: This is the **same defect shape as the historical E8 M-1** (connection state machine fully implemented + unit-tested but with zero production callers) and the companion multi-audit's cross-dimension pattern #1 ("declared contract, missing wire") — here applied to the handle→UI button pipeline. Every group/ungroup/delete unit/e2e test passes because it drives the operation through the test handle, masking the absence of a production trigger. Combined with the absent keyboard layer, a keyboard-only user cannot operate this editor beyond clicking buttons.
- **Recommendation**: Add Delete / Group / Ungroup buttons to the default toolbox (they are already on `runtime`), and wire a keyboard layer on the canvas container (Delete → `removeWorkingSymbol(selection)`, Ctrl+Z/Y → undo/redo, Ctrl+G/Ctrl+Shift+G → group/ungroup, arrows → nudge). Add an e2e that drives delete/group from the default UI (not the test handle).
- **Confidence**: 确定 (read all three default panels + handle registry; grep confirms no keyboard handlers).
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §3/§8.5.2 (handle surface), `AGENTS.md` (a11y expectations).

### [P1] `scada-group` nesting breaks 4 editor paths the multi-audit did not enumerate (grouping-blindness cluster)

**[P1] — incorrect behavior: the editor assumes a flat top-level symbol array (and/or world-space child coords) in ≥4 distinct code paths beyond the companion multi-audit's [P1-02] connection-coords instance. Each silently misbehaves when a selection or target is inside a `scada-group`. Grouping is a first-class M2 feature; every test fixture keeps groups at world (0,0) or never groups the operated node, so all four are untested.**

Tracking the full impact radius of the grouping assumption (open-ended prompt rule 9):

- **[P1] — C1: linkage-recompute junction discovery is flat (nested pipe-junctions never recomputed).**
  `editor-working-helpers.ts:60` — `for (const node of symbols)` collects pipe-junctions whose `connection.target === movedNodeId` from **top-level only**; it does not recurse into `node.children`. The moved-node detection (`findNodeInWorking`, line 54) and the junction-node resolution (line 69) ARE recursive, so the bug is specifically the junction-discovery loop. Effect: a pipe-junction nested in a group whose target device moves → its connection x/y is **never recomputed** (stub endpoint drifts). This is a _different root cause_ than multi-audit [P1-02] (which is coordinate _values_ being local); here the nested junction is not even reached. Confidence: 很可能.

- **[P1] — C2: `selectionNodes()` filters top-level only → align/distribute/copy/cut silently drop grouped selection.**
  `use-editor-engine.ts:417-420` — `selectionNodes` = `session.workingConfig.symbols.filter(s => set.has(s.id))` (top-level only). `alignSelectionFn`/`distributeSelectionFn`/`copySelectionFn`/`cutSelectionFn` all consume it. Effect: select group children → align/copy/cut operate on an empty (or partial) node set and silently no-op or misbehave. The align path even returns `insufficient-selection` for a legitimate multi-selection just because all members are nested. Confidence: 确定.

- **[P1] — C3: `computeBounds()` (fit/center) is top-level + groups carry no dimensions → fit/center broken for grouped scenes.**
  `use-editor-engine.ts:372-391` — iterates top-level `symbols`, reads `node.width/height`. But `groupSymbols` creates groups with `x:0, y:0` and **no width/height** (`use-editor-engine.ts:336-343`), and grouped children's world extent is ignored. Effect: after "select all → group", `computeBounds` returns `{0,0,0,0}`; `engine.fit({width:0,height:0})` produces a degenerate viewport. Even mixed scenes hide grouped children from fit. Confidence: 确定 (verified group node shape + `computeBounds` body).

- **[P2] — C4: `listAllConnections` dangling detection uses top-level ids only → grouped targets falsely flagged dangling.**
  `connection/connection-adapter.ts:263` — `const ids = new Set(args.symbols.map(s => s.id))` builds the existing-id set from top-level only, while the `walk` (line 265) recurses into children to find junctions. Effect: a connection whose `target` is a group child is reported `dangling: true` even though the child exists. Diagnostic-only (no data corruption), so P2; still a contract break of §4.4 dangling semantics and visible via the test handle `listConnections`. Confidence: 确定.

- **(Relation to multi-audit)**: Multi-audit [P1-02] covers `collectSymbolBounds` / `containsPoint` / `recomputeJunctionAfterMove` treating local child coords as world. The four items above are **different code locations with different root causes** (flat discovery loop, top-level-only selection filter, dimensionless group bounds, top-level-only id set), not restatements of [P1-02].
- **Recommendation**: Introduce shared recursive walkers (`collectAllSymbols`, `collectWorldBounds(ox,oy)`) and route all four paths through them; add grouped-child regression tests for align, copy, fit/center, and nested-junction linkage. The coordinate fix from multi-audit [P1-02] and C1/C3 here should be landed together (same `collectWorldBounds` walker serves both).
- **Confidence**: C1 很可能 / C2 确定 / C3 确定 / C4 确定.

### [P1] Group id uses `Date.now()` with no collision guard (duplicate node ids on rapid/programmatic group)

**[P1] — data integrity: `groupSymbols` mints `groupId = \`scada-group-${Date.now()}\``with no existence check and no monotonic counter. Two group operations in the same millisecond (rapid UI, keyboard-repeat, host action bound to`component:group`, or automation) produce identical ids → duplicate top-level ids in `workingConfig`, which breaks the `nodeById` O(1) index invariant and the serialize round-trip.**

- **Where**: `use-editor-engine.ts:336` — `const groupId = \`scada-group-${Date.now()}\``; no guard that the id is unused.
- **Contrast (why this is a real defect, not theoretical)**: the sibling clipboard path deliberately avoids this exact failure — `buildClipboardPaste` (`toolbox/clipboard.ts:64-91`) uses a session-maintained `pasteCounter` to mint `${node.id}-copy-${counter}`, and `generateConnectionId` (`connection/anchor-snap.ts:144-153`) loops to dodge existing ids. Group id generation is the one minting site that skipped the discipline.
- **Effect**: duplicate `scada-group-<ms>` ids → `TreeRegistry.add` second-entry overwrites the first in its id→leaf map; `diffScadaConfig`/`applyDiffToConfig` and `serializeScadaConfig` emit a config with duplicate ids; on reload the nodeById index silently drops one branch. `addSymbol`'s own `duplicate-id` guard (`use-editor-handles.ts:65-68`) is bypassed because group goes through `groupSymbols`, not `addSymbol`.
- **Recommendation**: Reuse the paste-counter pattern — keep a `groupCounter` (or a shared symbol-id counter) and mint `scada-group-${++groupCounter}`, or check `workingConfig` for an existing id and increment until free.
- **Confidence**: 确定 (single minting site, no guard, contrast with two guarded siblings).

### [P1] z-order undo entries are O(n) full-array replaces, violating the R4 "incremental-only" invariant E8/E10 certified PASS

**[P1] — contract drift / memory: `reorderZOrderFn` builds the forward diff as `removed: prevSnapshot.symbols.map(s => s.id)` (ALL top-level ids) + `added: res.newOrder.map(n => ({...n}))` (ALL top-level nodes), and `computeInverse` copies all prevSnapshot nodes into `inverse.added`. So a single "move up one position" on a 1k-symbol config records ~2× the full symbol set on the undo stack. The R4 invariant ("栈元素只持 forward+inverse 增量，无全量快照") that E8/E10 marked PASS is contradicted for every z-order op.**

- **Where**:
  - `use-editor-engine.ts:451-469` — `forward = { added: res.newOrder.map(n => ({...n})), removed: prevSnapshot.symbols.map(s => s.id), updated: [] }`; comment self-documents it as "结构 diff（full-replace）".
  - `undo-redo/compute-inverse.ts:60-63` — for `forward.removed` (here = all ids), `inverse.added.push(prevNode)` for every id (no clone), so the inverse also carries the full set.
  - `undo-redo/undo-redo-adapter.ts:196-212` — `cloneConfig`/`structuredCloneSafe` deep-clones the prevSnapshot used for inverse extraction.
- **Why the E-gate R4 check missed it**: the entry-level R4 assertion (E8 n-4) verifies a `UndoStackEntry` does not carry a separate `prevSnapshot` field. z-order entries satisfy that — they hold no `prevSnapshot` _field_; instead the full array is encoded _inside_ `forward.added`/`inverse.added`. The assertion checks shape, not the O(n) content, so R4's _intent_ (bounded memory per entry) is violated while the letter of the check passes.
- **Effect**: memory grows by O(n) per z-order op (not per changed position). On a large config with many z-order operations the stack holds many full-array copies. No correctness break (undo/redo round-trip is fine), but the documented hard constraint is not actually met for this operation kind.
- **Recommendation**: Represent z-order as an _incremental_ diff — emit `updated` patches only for the symbols whose array position changed (the `movedIds` are already computed at `z-order.ts:73`), and have `engine.applyDiff` reorder by those (or add an explicit `reordered` op kind). If full-replace is retained by design, correct the R4 doc claim and the E-gate checklist to scope R4 to non-z-order ops.
- **Confidence**: 很可能 (re-verified `reorderZOrderFn` forward construction + `computeInverse` removed→added copy).

---

## P2 findings

Each is tagged with a one-line justification; these are real but do not by themselves drive a remediation plan.

- **[P2] Connection drag `pointermove` does not `preventDefault` → possible viewport-pan conflict.** `use-editor-engine.ts:628-631` — only `pointerdown` calls `e.preventDefault()` (line 626). During an active connection drag, leafer's `tree: { move: { drag: 'auto' } }` may also interpret the move as a canvas pan (the `connectionDragActiveRef` suppresses only the transform _write-back_, not leafer's own pan gesture). _Needs browser verification_; flagged not confirmed. Confidence: 有趣的猜测.

- **[P2] `recomputeConnectionAnchor` divides by `junction.width`/`height` with no zero-guard → Infinity/NaN written to connections for a degenerate (zero-size) pipe-junction, and `JSON.stringify(Infinity)`→`null` corrupts the serialize round-trip.** `connection/connection-link.ts:44-49` (reached via `recomputeJunctionConnections` → live move-linkage path and `programmaticConnect`). `worldToNormalized` has the same divide but is only exercised by its own test (not production). Confidence: 很可能.

- **[P2] `SnapHighlightMark.tooltip` is a dead, non-i18n field.** `connection/connection-overlay.ts:61` hardcodes a Chinese string `吸附到 ${nodeId}`; `connection-overlay-renderer.ts:35-49` consumes only `highlight.world` and never reads `tooltip`. Dead data + missing i18n. Confidence: 确定.

- **[P2] `cloneNode` in `editor-session.ts:123-127` and `clipboard.ts:105-109` shallow-copies `custom` (`{...node}` only).** Nested `custom` sub-objects are shared between working copy / committedBaseline / clipboard. Current mutators happen to replace `custom` wholesale (`{...junctionNode.custom, connections}`), so no live corruption today, but it is a latent aliasing trap for any future field-level `custom` mutation. Confidence: 很可能.

- **[P2] `alignSelection`/`distributeSelection` use top-level bounds and ignore group-relative coords (documented T1, but compounds the [P1-C] cluster).** `toolbox/align-distribute.ts:6-13,38-46` explicitly accepts the flat algorithm for M3. If a grouped child is in the selection it is silently dropped by C2 before reaching here anyway; if groups themselves are selected, their bounds are `{0,0,0,0}`. Record; resolves naturally with the C2/C3 fix. Confidence: 确定.

- **[P2] Inspector `json-editor` writes a raw string to `workingConfig` on every invalid keystroke.** `inspector/inspector-field.tsx:42-48` — mid-typed JSON falls back to `onChange(e.target.value)`, so a half-typed object field is written as a string into the node, then re-validated. Confusing for the user and can surface spurious cross-field errors. Confidence: 确定.

- **[P2] `extractNodeIds` falls back to `leaf.name`/`id` when registry lookup misses — for a group container whose `name === node.id`, a transform on the group could double-resolve.** `editor-adapter.ts:118-143`. Low risk (registry lookup should hit first), but the fallback chain is unguarded against a node whose `name` collides with another id. Confidence: 有趣的猜测.

---

## Cross-cutting patterns

1. **"Session is not reactive" is the single highest-leverage root.** [P1-A] (panel re-render gap) is the upstream of the companion multi-audit's [P1-07] (selection mirror) and also explains the stale Undo/Redo/validation surfaces. A single reactive channel over `notifySession` would close [P1-A], shrink [P1-07]'s fix, and make future session-derived UI correct by default.
2. **"`scada-group` is a second-class citizen across the editor."** Counting the companion multi-audit's [P1-01] (shallow clone → grouped-child undo loss), [P1-02] (connection local-coords), and this audit's [P1-C1..C4], there are **≥7 independent grouping-blind code paths**. The common fix (shared recursive `collectAllSymbols` + `collectWorldBounds(ox,oy)` walkers + grouped regression fixtures) would retire most of them at once. The test suite's universal avoidance of nested/offset groups is the reason all seven slipped through every gate.
3. **"Mint site discipline is inconsistent."** [P1-D] (group id via `Date.now()`) vs the guarded paste/connection id sites shows the same id-uniqueness lesson learned in two of three places. A shared `mintNodeId(prefix)` helper would prevent recurrence.

## Overall assessment (top 1–3 directions)

1. **Make the editor reactive before any more UI is built on it.** Until `onSessionChange` drives a render, every new panel/button that reads `runtime.session.*` will ship stale. This is the cheapest, highest-leverage fix and unblocks trustworthy Undo/Redo/validation UX.
2. **Treat `scada-group` as a first-class shape and add one shared recursive-walker layer + grouped fixtures.** The grouping-blindness cluster is the mission's largest latent-correctness surface; it will keep regenerating (next milestone, next feature) as long as each new path hand-walks the symbol tree.
3. **Close the "implemented-but-unreachable" gap for delete/group/ungroup + add the keyboard layer.** The default editor currently cannot perform three core M2/M1 operations without the host building its own buttons; combined with zero keyboard support this is both a usability and an accessibility hole.

## Blind-spot self-assessment

This round was code-led and skewed toward the editing/undo/selection/grouping surface. Likely under-covered for a next round:

- **Leafer runtime interaction fidelity** — gesture arbitration between connection-drag, Editor transform, and viewport pan under real pointer sequences (the [P2] preventDefault item is the tip; needs browser/Playwright verification, which I did not run).
- **`serialization/{diff,validate,serialize,parse}` correctness at edge cases** (large/deeply-nested configs, `variables` diff round-trip, custom-field serialization) — read only superficially.
- **The runtime `scada-canvas` reuse surface** (`engine/`, `binding/`) — the editor reuses 10 touchpoints; I did not re-audit the runtime side for editor-induced regressions.
- **Concurrency/timing**: coalesce timing windows under real `Date.now()` were flagged by the multi-audit; I did not re-probe other timing-sensitive paths (transaction `pointerup` window listener, ResizeObserver rAF teardown).
- Best next entry point: a **browser-driven Playwright pass** over the default UI (no test handle) for delete/group/ungroup/undo/redo and a grouped-scene sweep — this would convert several "很可能/有趣的猜测" items here into confirmed/refuted findings.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
