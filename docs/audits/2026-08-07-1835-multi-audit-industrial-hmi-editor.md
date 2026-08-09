> Audit Status: closed
> Audit Type: multi-dimensional
> Mission: industrial-hmi-editor

# Multi-Dimensional Audit — `industrial-hmi-editor`

- **Audit date**: 2026-08-07
- **Scope**: `packages/` — code, config, tests, public contracts of the `industrial-hmi-editor` mission. Primary subject: `packages/flux-renderers-industrial/src/editor/` (the `scada-editor-canvas` renderer + connection / undo-redo / toolbox / inspector subsystems) and its public `/editor` subpath contract. Cross-referenced against `docs/components/industrial-hmi-editor/design-*.md` (6 design docs) and `docs/components/industrial-hmi/editor-initiation.md`.
- **Method**: `docs/skills/deep-audit-prompts.md` multi-dimensional methodology. 10 dimensions executed (01 dependency/boundary, 03 API surface, 04 state ownership, 09 renderer contract, 15 security/perf, 16 doc-code, 19 error propagation, 21 display/positioning, 22 integration/operability, 23 test effectiveness). Each dimension: parallel `explore` deep-dig sub-agent → main-agent live-code review of every P1 (and the P0 candidates) against the actual source → dedup across dimensions. Dimensions 06 (async), 07 (lifecycle), 14 (coverage) were folded into 15/19/23 (the 2 editor async-suspect hits were confirmed benign; lifecycle issues are captured under 15-01/19-03).
- **Baselines consumed**: `pnpm check:oversized-code-files` (exit 1), `pnpm check:audit-runtime-raw-schema-reads` (clean), `pnpm check:audit-reactive-render-reads` (clean), `pnpm check:audit-async-failure-paths` (2 editor hits, both benign), `pnpm check:audit-performance-suspects` (editor hot paths clean), `pnpm check:audit-missing-renderer-markers` (clean). `pnpm typecheck/build` are green per `docs/logs/2026/08-07.md`; `pnpm check` is NOT green (oversized gate, see [P1-03]).
- **Calibration applied**: `docs/references/deep-audit-calibration-patterns.md` (patterns 1/2/4/6/8 used to grade), `docs/references/reopened-design-decisions-and-audit-adjudications.md` (no industrial-editor entries yet).
- **Mission state at audit time**: E10 (final gate) returned `pass-with-minors` (0B/0M/1m/1n) and the mission is at implementation closeout (`docs/logs/2026/08-07.md`). This audit is independent of the E-gate chain.

## Executive summary

| Severity | Count | Drive remediation? |
| -------- | ----- | ------------------ |
| P0       | 0     | —                  |
| P1       | 13    | yes                |
| P2       | 22    | backlog            |

**Headline**: The R5 dual-state isolation (the mission's central architectural risk) is **sound at the package/module-graph level** — `@leafer-in/editor` is consumed by exactly one source file, the runtime entry never imports `src/editor/`, `editable` never serializes, and no `symbol:*` action is dispatched in edit mode. The public API surface is clean and well-documented. **However**, this audit found a cluster of material defects the E-gate reviews did not surface: (a) silent undo loss for edits to grouped-symbol children; (b) a coordinate-space bug that breaks connection hit-test/snap/linkage for any device nested in a group; (c) a `>700`-line hard-gate failure on the main engine hook (re-inflated after a documented split); and (d) a set of declared-but-unwired public contracts (`onSave`/`onLoad` events, `commitPolicy`, the runtime 9 handles, controlled-mode `config`/`mode` push-back). The test suite is genuinely strong on the paths it asserts (connection drag-create end-to-end, undo round-trip, coalesce, group structure diff) but contains two P1 false-greens and several too-weak assertions.

The pattern across [P1-04]/[P1-05]/[P1-06]/[P1-08]/[P1-09] is the same shape as the historical E8 M-1 (logic exists, contract declared, the wire between them missing) — applied here to the schema→event/handle/controlled-prop pipeline rather than pointer events.

---

## P0 findings

None. No global contract break, global data loss, or security violation was confirmed. The data-loss candidate ([P1-01]) and the R5-isolation candidate ([P1-08]) are each scoped to specific reachable scenarios rather than global failures, so they are graded P1 per the calibration rule against inflation.

---

## P1 findings

### [P1-01] Grouped-child property edits silently lose undo (data-loss scoped to group children)

**[P1] — incorrect behavior / data loss: shallow snapshot + in-place mutation produces an empty diff for any edit to a symbol nested in a `scada-group`, so the undo stack never records it.**

- **File**: `packages/flux-renderers-industrial/src/editor/editor-working-helpers.ts:13-43` (root cause); `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts:262-273` (caller); `packages/flux-renderers-industrial/src/serialization/diff.ts:85` + `equality.ts:29` (why diff is empty).
- **Evidence**:
  ```ts
  // editor-working-helpers.ts:13-19 — SHALLOW clone: top-level spread only, children array SHARED
  export function cloneConfigSnapshot(config: ScadaConfig): ScadaConfig {
    return { ...config, symbols: config.symbols.map((s) => ({ ...s })), ...};
  }
  // editor-working-helpers.ts:34-43 — IN-PLACE mutation of the live child ref
  export function applyPatchToWorkingNode(session, nodeId, patch): void {
    const node = findNodeInWorking(session.workingConfig.symbols, nodeId); // recurses into shared children
    if (node) Object.assign(node, patch);   // mutates child reachable from BOTH prevSnapshot and current
  }
  // diff.ts:85 — for the group's `children` key: valuesEqual(prevNode.children, node.children)
  //   → equality.ts:29 `if (a === b) return true;` → same shared array ref → NO patch produced
  ```
- **Current state**: `updateWorkingNode` (inspector/property edits) and `recomputeLinkagesForMovedNode` (connection-follows-target) snapshot via shallow `cloneConfigSnapshot`, then mutate the resolved child in place. For a child inside a non-zero-... group, `prevSnapshot.symbols[g].children === session.workingConfig.symbols[g].children` (same array), so `diffScadaConfig` sees zero change. `UndoRedoAdapter.pushOperation` then returns `undefined` without pushing (`undo-redo-adapter.ts:99-100`, `hasChanges(forward)` false).
- **Risk**: A user edits a property of a grouped symbol (or a grouped device moves and its connections should re-link) → the change is applied to the working copy but **cannot be undone**; if the user then saves, the unintended edit is persisted. Groups are a documented first-class feature (`scada-group`, group/ungroup handles, `editor-engine.ts` injects `editable:true` on group children). Note the transform-drag path is SAFE — `UndoRedoAdapter.commitTransaction` deep-clones via `structuredCloneSafe`/`cloneNodeDeep` (`undo-redo-adapter.ts:196-218`); only the per-operation `pushOperation` path is affected.
- **Recommendation**: Make `cloneConfigSnapshot` deep (reuse the `cloneNodeDeep` recursion already in `undo-redo-adapter.ts:214-217`), OR make `applyPatchToWorkingNode` immutable (rebuild the parent path with new `{...parent, children:[...]}` so subtree identity changes). Add a regression test: select a group child, edit a field via the inspector, assert a non-empty forward diff lands on the undo stack and undo reverts it. This is the highest-ROI fix in the report.
- **Verification**: Personally re-verified the full chain (`editor-working-helpers.ts`, `diff.ts:85`, `equality.ts:29`, `undo-redo-adapter.ts:99-100,196-218`).
- **Calibration**: Not pattern 8 (transient UI state) — this is canonical working-copy/undo ownership. Not a low-code dynamic boundary.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-undo-redo.md` §4.1.2 (forward+inverse diff), `docs/architecture/performance-design-requirements.md` P3 (immutable updates).

### [P1-02] Connection coordinate-space: local coords used for grouped children (hit-test / snap / linkage all wrong)

**[P1] — incorrect behavior: `collectSymbolBounds`, junction `containsPoint`, and `recomputeJunctionAfterMove` treat `node.x/y` as world coords, but for children of a `scada-group` those are parent-relative; connections to/from grouped devices mis-hit, mis-snap, and drift.**

- **Files**: `packages/flux-renderers-industrial/src/editor/connection/connection-adapter.ts:52-68` (`collectSymbolBounds` — confirmed no parent-offset accumulation); `connection/connection-drag-controller.ts:121-137` (`findJunctionAtPoint`/`containsPoint`); `connection/connection-adapter.ts:178-200` + `editor-working-helpers.ts:52-83` (`recomputeJunctionAfterMove` inherits the local-coords input).
- **Evidence**:
  ```ts
  // connection-adapter.ts:52-68 — walks children WITHOUT accumulating parent x/y
  export function collectSymbolBounds(symbols: ScadaSymbolNode[]): ScadaSymbolBounds[] {
    const out: ScadaSymbolBounds[] = [];
    const walk = (nodes: ScadaSymbolNode[]): void => {
      for (const node of nodes) {
        out.push({
          id: node.id,
          x: node.x ?? 0,
          y: node.y ?? 0,
          width: node.width ?? 0,
          height: node.height ?? 0,
        });
        if (node.children) walk(node.children); // ← same world coords assumed; no offset added
      }
    };
    walk(symbols);
    return out;
  }
  ```
- **Current state**: `findSnapCandidate` (`anchor-snap.ts`) compares these bounds against the WORLD pointer; `recomputeConnectionAnchor` normalizes against a junction's world origin. For a target device nested in a group at world `(Gx,Gy)`, the child's local `(x,y)` ≠ its world `(Gx+x, Gy+y)`. Result: snap fails on the visible device and falsely triggers on the empty local-coord region; after a grouped device moves, the connection's normalized x/y is computed against local coords and the stub endpoint drifts (hand-computed example: 300px off for a group at world x=300).
- **Risk**: Core SCADA editing interaction (connect pipe-junctions to devices, connections follow moved devices) is broken whenever devices are grouped — a normal scenario once group/ungroup is used. Existing tests miss it because every fixture places groups at `(0,0)` where local == world.
- **Recommendation**: Single root-cause fix — introduce a shared `collectWorldBounds(symbols, ox=0, oy=0)` walker that accumulates parent offsets, and consume it in `collectSymbolBounds`, `findJunctionAtPoint`/`containsPoint`, and `recomputeJunctionAfterMove`. The core math (`recomputeConnectionAnchor`, `anchor-snap`, `viewportToWorld`) was hand-verified CORRECT; only the inputs are wrong.
- **Verification**: Re-verified `collectSymbolBounds` and the `deepEqual`/diff path; the runtime scene-graph composes parent+child transforms (confirmed via `pipe-junction.ts` stub arithmetic cited by the sub-agent), so local≠world for nested children.
- **Calibration**: Not a design-allowed approximation — `design-connection.md` §4.4/§4.5 treats connection-follows-target as a core contract.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-connection.md` §4 (anchor-snap), §4.4/§4.5 (linkage).

### [P1-03] `use-editor-engine.ts` 824 lines — `>700` hard-gate failure, re-inflated after E9 split

**[P1] — hard gate failing: `pnpm check:oversized-code-files` exits non-zero for the whole workspace on this file; it re-inflated from ~710 (post-E9 extraction) to 824 as toolbox/connection/test-handle plumbing was appended.**

- **File**: `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts:1-824`.
- **Evidence** (command output):
  ```
  $ pnpm check:oversized-code-files  # exit 1
  [check-oversized-code-files] ERROR: 15 files exceed 700 lines (MUST split):
    - packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts: 825
  ```
  `docs/logs/2026/08-07.md:37` documents the E9 extraction of `editor-working-helpers.ts` that previously brought this file under `max-lines` (~710); it then re-grew as E8.2 connection wiring, E9.1 toolbox handles, and the ~100-line test-handle literal were all appended into the same single 678-line `useEffect` body.
- **Current state**: One hook hosts six responsibility bands: ScadaEditorEngine mount/build, adapter attach + transform-transaction wiring, UndoRedoAdapter + all 9 mutators, the entire E9.1 toolbox handle set, connection-drag controller wiring + DOM pointer listeners, and the test-handle object literal.
- **Risk**: The `check:oversized-code-files` hard gate fails for the entire workspace (so `pnpm check` is not green despite `docs/logs/2026/08-07.md` claiming workspace full-green on typecheck/build/lint/test — `check` was not in that list). Each future milestone re-appends to this body; the re-inflation is structural. (ESLint `max-lines` at 710 is configured but does not fire in normal runs — `npx eslint --print-config` shows the rule active, yet a direct lint exits 0; a separate tooling gap, noted under P2.)
- **Recommendation**: Split into `editor/runtime-factories.ts` (pure factories), `editor/runtime-mutators.ts` (the 9 mutators, already closing over a stable 4-tuple of refs), `editor/toolbox-runtime.ts` (E9.1 toolbox handles), `editor/connection-wiring.ts` (`wireConnectionPointerHandlers` returning a cleanup fn), `editor/test-handle-factory.ts` (`buildEditorTestHandle`). Host hook becomes ~250 lines of lifecycle orchestration. The E9 extraction proved this pattern is mechanical.
- **Verification**: Personally confirmed `wc -l` = 824 and the gate exit code.
- **Calibration**: Calibration pattern 1 (large-file) KEEP condition explicitly met on TWO stacked grounds: "crosses the repo's hard `>700` line rule" AND "repeated re-inflation after a prior split". Not downgraded.
- **Ref docs**: `AGENTS.md` ("Files over 500 lines should be evaluated for extraction"), `docs/references/audit-tooling.md` (`check:oversized-code-files` hard gate).

### [P1-04] `onSave` / `onLoad` schema events declared but never dispatched

**[P1] — contract break: design §4.5/§8.1 promise `component:save()` dispatches `onSave` (with `serializedConfig`) and load dispatches `onLoad`; live code serializes/loads internally but never calls `helpers.dispatch` for either. The commit pipeline through schema events is dead.**

- **Files**: `packages/flux-renderers-industrial/src/editor/schemas.ts:51-54` (declared); `src/editor/renderer/hooks/use-editor-engine.ts:573-597` (`save`/`load` mutate state, no dispatch); `src/editor/renderer/hooks/use-editor-handles.ts:91-100` (`component:save`/`load` handles return data, no dispatch); `src/editor/scada-editor-canvas.tsx:104-150` (only 5 of 7 events dispatched).
- **Evidence**:
  ```ts
  // use-editor-engine.ts:573-580 — save() serializes, never dispatches onSave
  const save = (): string => {
    session.committedBaseline = { ...session.workingConfig, symbols: ... };
    return serializeScadaConfig(session.workingConfig);   // no onSave dispatch
  };
  // grep "scada-editor:save" / "scada-editor:load" across src/editor → 0 hits
  ```
- **Current state**: 5 of 7 schema events dispatch (`onReady/onError/onSelectionChange/onModeChange/onSessionChange`); `onSave`/`onLoad` have zero dispatch sites.
- **Risk**: A host wiring `events: { onSave: { action: 'commit-to-server', ... } }` and calling `component:save()` gets a silent no-op — the server never receives the config. The handle returns `{ok:true, data:serialized}` so integration appears successful. Combined with [P1-05] (`commitPolicy` unconsumed) and [P1-09] (controlled-mode no push-back), the editor has no functional commit/load pipeline through schema events despite declaring one.
- **Recommendation**: Plumb `onSave?: (serializedConfig: string) => void` and `onLoad?: (config) => void` through `UseEditorEngineArgs`; dispatch `scada-editor:save`/`scada-editor:load` from `runtime.save()`/`runtime.load()` via the existing `dispatchEvent` helper.
- **Verification**: Confirmed via sub-agent grep (0 hits) and the 5-event dispatch list in `scada-editor-canvas.tsx`.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §4.5 (commit semantics), §8.1 (event payload contract).
- **Cross-ref**: Same finding independently surfaced by Dim 09 and Dim 22; deduped.

### [P1-05] `commitPolicy` prop registered but never consumed (`auto` mode is a silent no-op)

**[P1] — contract break: `commitPolicy` is a registered `{kind:'prop'}` with a default and documented manual/auto semantics (§4.5), but no code path reads `props.props.commitPolicy`; `auto` ("edit-is-persisted") does nothing.**

- **Files**: `packages/flux-renderers-industrial/src/editor/renderer-definitions.ts:26,35` (registered + default); `src/editor/schemas.ts:29` (type); `src/editor/scada-editor-canvas.tsx:152-164` (not passed to `useEditorEngine`); `src/editor/renderer/hooks/use-editor-engine.ts:51-70` (`UseEditorEngineArgs` has no `commitPolicy`).
- **Evidence**: `rg "props\.props\.commitPolicy" src/editor/` → 0 hits; `UseEditorEngineArgs` has no `commitPolicy` field.
- **Risk**: Setting `commitPolicy:'auto'` is a silent no-op; authors expecting "edit-is-persist" get nothing with no warning. COMPILE-ONCE rule (registered prop must be honored) is violated.
- **Recommendation**: Either thread `commitPolicy` into `useEditorEngine` and trigger save+onSave in `notifySession()` when `policy==='auto'` (and from `save()` when manual), or mark the field `kind:'ignored'` with a dev-mode warning if auto-commit is deferred.
- **Verification**: Confirmed absent from `UseEditorEngineArgs` and renderer call site.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §4.3, §4.5.

### [P1-06] Runtime 9 component handles (incl. `destroy`) not registered for the editor renderer

**[P1] — contract break: design §8.5.1 promises the editor reuses the runtime 9 handles (`fit`/`center`/`getSymbols`/`getSymbol`/`setPointValue`/`getPointTable`/`exportConfig`/`importConfig`/`destroy`); only the 9 editor-extension methods are registered. `component:destroy()` (and the `data-status="destroyed"` lifecycle) is unreachable.**

- **Files**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:166-171` (only `useEditorHandles` wired; no `useScadaHandles`); `src/editor/renderer/hooks/use-editor-handles.ts:12-22` (`EDITOR_HANDLE_METHODS` = 9 editor methods only).
- **Evidence**: `rg "useScadaHandles|SCADA_HANDLE_METHODS" src/editor/ --glob '!*.test.*'` → only doc-comment references; never invoked.
- **Risk**: Public handle contract from §8.5.1 is half-missing; downstream code (host shell, e2e, automation) invoking runtime handle methods on an editor instance fails. `component:destroy()` → `data-status="destroyed"` (§8.3 OP-4) is unreachable (see also [P2-06]).
- **Recommendation**: Either call `useScadaHandles` from the editor renderer (adapting `runtime` to the runtime hook's expected shape), or register the runtime 9 methods inside `useEditorHandles` by delegating to `EditorEngineRuntime`'s existing equivalents (`fitView`/`centerView`/`exportConfig`/`importConfig`/`engine.getSymbol`/`engine.destroy`).
- **Verification**: Confirmed via sub-agent grep.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §8.5, §8.5.1, §8.3 OP-4.

### [P1-07] Selection dual-source: React mirror only syncs on 1 of 6 mutation paths (inspector/toolbox go stale)

**[P1] — incorrect behavior: `selection` is held in both `session.selection` (canonical, per §4.6) and a React `useState` in `scada-editor-canvas.tsx`; five mutation paths (remove/group/ungroup/cut/paste + load) update `session.selection` silently without firing `onSelectionChange`, so the React mirror — which feeds `EditorInspectorPanel`/`EditorToolboxPanel` — diverges.**

- **Files**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:70,116-126,189,245-250` (React mirror); `src/editor/renderer/hooks/use-editor-engine.ts:216` (the ONE synced path) vs `:305,345,359,490,506` + `editor-session.ts:81` (resetSession on load) — the five silent paths.
- **Evidence**:
  ```ts
  // scada-editor-canvas.tsx:70  — second source
  const [selection, setSelection] = useState<string[]>([]);
  // use-editor-engine.ts:216 — only this path calls onSelectionChange
  const handleSelectionChange = (nodeIds) => {
    session.selection = [...nodeIds];
    latest.current.onSelectionChange?.(nodeIds);
    notifySession();
  };
  // use-editor-engine.ts:305,345,359,490,506 — direct session.selection = ... with NO callback
  session.selection = session.selection.filter((id) => id !== nodeId); // removeWorkingSymbol
  session.selection = [groupId]; // groupSymbols
  session.selection = promoted.map((c) => c.id); // ungroupSymbols
  session.selection = session.selection.filter((id) => !removedSet.has(id)); // cutSelection
  session.selection = [...newIds]; // paste
  ```
- **Current state**: After group/ungroup/paste/cut/remove/load, `session.selection` is correct but the React `selection` state still holds the stale ids.
- **Risk**: Inspector keeps showing the (now-nested or deleted) child instead of the new group; toolbox align/distribute/copy/cut operate on stale ids; the user's next inspector edit silently targets the wrong node (real mis-edit risk during a paste-then-edit flow). Because `session.selection` is correct, the test-handle path passes — the bug only manifests through real-DOM panel interactions.
- **Recommendation**: Route every `session.selection = …` through a single `setSessionSelection(next)` helper that also invokes `latest.current.onSelectionChange?.(next)`, OR eliminate the React mirror and have the panels read `runtime.session.selection` reactively (React-19-preferred). Add a regression test asserting inspector target after `paste()`/`group()`.
- **Verification**: Confirmed the dual-source layout and the single synced path; the 5 silent paths are as reported by the sub-agent (consistent with the build-section code I read at `:215-219`).
- **Calibration**: NOT pattern 8 (transient UI state) — §4.6 explicitly owns `selection` in `session` with sync mechanism `editor.list ↔ session.selection` (not `session ↔ React useState`).
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §4.6.

### [P1-08] Engine mode hardcoded `'edit'`; desync when `initialMode:'preview'` (R5 isolation risk)

**[P1] — incorrect behavior / R5 risk: `ScadaEditorEngine.mode` defaults to `'edit'` and `engine.build` injects `editable:true` from `engine.mode`; the host sets `session.mode` from `initialMode` but never calls `engine.setMode(session.mode)` after build. Mounting with `mode:'preview'` yields `data-mode="preview"` while the leafer Editor stays assembled and all symbols are editable.**

- **Files**: `packages/flux-renderers-industrial/src/editor/renderer/editor-engine.ts:57` (`private mode: ScadaEditorMode = 'edit';`), `:213` (`const editable = this.mode === 'edit';` inside `build`); `src/editor/renderer/hooks/use-editor-engine.ts:201-211` (session gets `initialMode`, engine never synced).
- **Evidence**:
  ```ts
  // editor-engine.ts:57
  private mode: ScadaEditorMode = 'edit';
  // use-editor-engine.ts:201-211 — session.mode = 'preview' if prop says so, but:
  const session = createScadaEditorSession(latest.current.initialConfig, { mode: latest.current.initialMode ?? 'edit' });
  engine.build(session.workingConfig);   // engine.mode is STILL 'edit' → injects editable:true
  // no engine.setMode(session.mode) anywhere after build
  ```
- **Current state**: With `mode:'preview'` as the initial prop, `session.mode='preview'`, DOM `data-mode='preview'`, but `engine.mode='edit'` → Editor assembled + symbols editable. The existing test only checks the `data-mode` attribute and misses the desync.
- **Risk**: Preview is meant to be a safe/inspecting mode; users gain unintended write capability. R5 dual-state isolation guarantee is violated for this configuration. Compounds with [P1-09] (controlled `mode` prop also not pushed).
- **Recommendation**: After `engine.build(...)` at `use-editor-engine.ts:206`, add `if (session.mode !== engine.currentMode) engine.setMode(session.mode);`.
- **Verification**: Personally confirmed `editor-engine.ts:57` and the absence of a `setMode` call after build (read `use-editor-engine.ts:183-252`).
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §4.2 (dual-state isolation), §8.3; `design-architecture.md` §4.2.

### [P1-09] Controlled-mode `config` / `mode` prop changes silently ignored (no push-back)

**[P1] — incorrect behavior: the engine mount effect runs once (`if (runtimeRef.current) return;`); `props.props.config`/`mode` are consumed only as initial values. A host binding `config`/`mode` to a scope expression gets a one-shot load — subsequent external changes are silently dropped (the historical controlled-no-op pattern).**

- **Files**: `packages/flux-renderers-industrial/src/editor/renderer/hooks/use-editor-engine.ts:183-184` (mount-once guard), `:809` (effect deps exclude parsedConfig/mode); `src/editor/scada-editor-canvas.tsx:84-87,152-164,199`.
- **Evidence**:
  ```ts
  // use-editor-engine.ts:183-184 — runs once
  useEffect(() => {
    if (runtimeRef.current) return;
  // scada-editor-canvas.tsx:84-87 — re-parses on config change but only feeds INITIAL value
  const { config: parsedConfig } = useMemo(() => parseAndValidateConfig(props.props.config), [props.props.config]);
  // ... initialConfig: parsedConfig ?? EMPTY_EDITOR_CONFIG   (consumed only at mount)
  // no useEffect watches parsedConfig → runtime.load(); no useEffect watches props.props.mode → runtime.switchMode()
  ```
- **Current state**: `useMemo` recomputes `parsedConfig` on prop change but nothing pushes it into the runtime. `data-mode` updates cosmetically via `props.props.mode` but `runtime.switchMode` is never called externally.
- **Risk**: Silent desync between host data source and editor. Together with [P1-04] (no onSave) the editor is a black hole — config goes in once, never updates, never emits.
- **Recommendation**: Either (a) document `config`/`mode` as initial-only and remove them from being reactive, or (b) add `useEffect(() => { if (runtime && parsedConfig) runtime.load(parsedConfig) }, [parsedConfig])` and a `mode` watcher with loop-reconciliation. (Three-state ownership local/controlled/scope is future work per design.)
- **Verification**: Confirmed mount-once guard and the absence of prop-watchers (read `:183-252`; effect deps per sub-agent).
- **Calibration**: Not pattern 5 (evolving intermediate state) — the schema declares these as reactive props and `props.props.config` is already wired through `useMemo`, implying intended reactivity.
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §4.1, §4.5, §8.3.

### [P1-10] Raw `<textarea>` in toolbox-panel violates the mandatory `@nop-chaos/ui` rule

**[P1] — contract break: AGENTS.md "NEVER use raw HTML elements when `@nop-chaos/ui` provides a component"; the import-config dialog uses a raw `<textarea>` while the sibling `inspector-field.tsx` in the same package correctly uses `<Textarea>` from `@nop-chaos/ui`.**

- **File**: `packages/flux-renderers-industrial/src/editor/toolbox/toolbox-panel.tsx:177-183`.
- **Evidence**:
  ```tsx
  <textarea className="nop-scada-editor-toolbox-import-textarea" value={importText}
    onChange={(e) => setImportText(e.target.value)} ... />
  // contrast inspector-field.tsx:2,38 — import { ... Textarea ... } from '@nop-chaos/ui'; <Textarea ... />
  ```
- **Risk**: Bypasses the shared styling contract (theme variables, focus/disabled states); two different textarea visual languages inside one editor.
- **Recommendation**: Replace with `<Textarea ... data-slot="..." />` from `@nop-chaos/ui`.
- **Verification**: Confirmed via sub-agent.
- **Calibration**: NOT pattern 3 (host-specialized raw control) — a config-text import textarea is not `input[type=file|color]`-class; the ui abstraction exists and is used next door.
- **Ref docs**: `AGENTS.md` "MANDATORY: UI Component Usage".

### [P1-11] Palette drop hardcodes `(x:50, y:50)`, ignoring the pointer position

**[P1] — incorrect behavior: `onDrop` discards `e.clientX/Y`; every dropped symbol lands at world `(50,50)` and repeated drops pile up. The connection subsystem correctly uses `getBoundingClientRect` + `engine.getWorldPoint`, but the palette-drop path was never wired to it.**

- **File**: `packages/flux-renderers-industrial/src/editor/scada-editor-canvas.tsx:226-234` (drop path); `src/editor/palette/editor-palette.tsx:26-37` (click-add path, separate acceptable default).
- **Evidence**:
  ```tsx
  onDrop={(e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('application/x-scada-symbol-type');
    if (type && runtime) {
      idCounter.current += 1;
      const id = `${type}-${idCounter.current}`;
      runtime.addWorkingSymbol({ id, type, x: 50, y: 50, width: 100, height: 100 });   // pointer ignored
    }
  }}
  ```
- **Risk**: Drag-and-drop placement (a primary M1 interaction) does not place where the user releases; overlapping drops confuse selection/transform.
- **Recommendation**: Compute `const rect = e.currentTarget.getBoundingClientRect(); const world = runtime.engine.getWorldPoint({x:e.clientX-rect.left, y:e.clientY-rect.top});` and center the symbol on the pointer (`x: world.x - 50, y: world.y - 50`), reusing the same pipeline as `use-editor-engine.ts:616-619`.
- **Verification**: Confirmed via sub-agent (drop handler quoted).
- **Ref docs**: `docs/components/industrial-hmi-editor/design-renderer.md` §3 (palette drag-place, M1 P0 feature).

### [P1-12] Test false-greens: zero-assertion `programmaticSelect` + unverifiable `onReady` dispatch

**[P1] — absent/ineffective test for changed behavior: two test groups assert nothing about the contract their titles promise; a regression removing `dispatchEvent('scada-editor:ready')` or the body of `programmaticSelect` would leave them green.**

- **Files**: `packages/flux-renderers-industrial/src/editor/renderer/editor-adapter.test.ts:182-193` (`programmaticSelect`/`programmaticClearSelection` tests have ZERO `expect()`); `src/editor/scada-editor-canvas-interaction.test.tsx:192-220` ("dispatches onReady" only asserts `data-status==='ready'`, never verifies `helpers.dispatch`; the `vi.fn()` is dead code).
- **Evidence**:
  ```ts
  // editor-adapter.test.ts:184-193 — title says "sets editor targets", body asserts nothing
  it('programmaticSelect sets editor targets', () => {
    programmaticSelect(engine!, ['a1']);
    programmaticClearSelection(engine!);
    // No throw = pass (mock editor.cancel is available via MockLeaf)
  });
  // scada-editor-canvas-interaction.test.tsx — onReadyAction = vi.fn() never wired; only data-status checked
  ```
- **Current state**: The `editor.move` integration test (`scada-editor-canvas-ops.test.tsx:272-284`) and the `group/ungroup callable` test (`:309-315`, pure `not.toThrow()`) have the same shape — titles overpromise, bodies underdeliver.
- **Risk**: False confidence on event-dispatch wiring (the very contract that [P1-04] shows is partially broken for onSave/onLoad) and on selection wiring. The sibling `regions-session.test.tsx:165-192` does it correctly (injects `dispatch: vi.fn()`, asserts `dispatch.mock.calls`), proving the gap is a quality shortfall, not a framework limitation.
- **Recommendation**: Inject `dispatch: vi.fn()` through the schema helpers and assert `dispatch.mock.calls` for `onReady/onError/onSelectionChange/onModeChange`; convert `programmaticSelect` tests to assert post-call editor state (or delete as redundant-noise).
- **Verification**: Confirmed via sub-agent (test bodies quoted).
- **Ref docs**: `docs/skills/unit-test-logic-and-contract-coverage-audit-prompt.md`, `docs/bugs/71-scheduling-deep-audit-blind-spot-display-operability-test-effectiveness.md`.

### [P1-13] Per-frame O(n²) in transform drag (`findNodeInWorking` inside the junction recompute loop; R7 envelope unverified)

**[P1] — performance: for `s` selected nodes, `n` total symbols, `k` linked junctions, one transform frame costs `O(s·(n + k·n))`; `findNodeInWorking` is an O(n) recursive walk called once per junction inside `recomputeLinkagesForMovedNode`. The R7 envelope (≥30fps @ ≤1k primary) is still pending runtime verification per `docs/logs/2026/08-07.md`.**

- **Files**: `packages/flux-renderers-industrial/src/editor/editor-adapter.ts:84-94` (per-node per-frame `onGeometryChange`); `src/editor/renderer/hooks/use-editor-engine.ts:220-230` (`handleGeometryChange` → `applyPatchToWorkingNode` + `recomputeLinkagesForMovedNode` + `syncWorkingCopy` each O(n), called `s` times/frame); `src/editor/editor-working-helpers.ts:60-82` (k-loop with O(n) `findNodeInWorking` per iteration).
- **Evidence**:
  ```ts
  // editor-working-helpers.ts:68-71 — O(n) findNodeInWorking PER junction
  for (const junctionId of junctionsToRecompute) {
    const junctionNode = findNodeInWorking(symbols, junctionId);        // O(n) recursive
    const updates = recomputeJunctionAfterMove({ junctionNode, symbols }); // O(n) collectSymbolBounds inside
    applyPatchToWorkingNode(session, junctionId, {...});                // O(n) recursive find again
  }
  ```
- **Risk**: Worst-case superlinear in selection size; the design doc itself defers numerical verification to E6/E9.2, which the logs show is still pending. Hitting the envelope manifests as drag stutter/dropped frames.
- **Recommendation**: (1) Build a `Map<id, ScadaSymbolNode>` of junctions once at the top of `recomputeLinkagesForMovedNode`; replace the per-junction `findNodeInWorking` with O(1) lookup; reuse one `collectSymbolBounds` across junctions. (2) Batch `syncWorkingCopy` to a single trailing call per frame (drop the `s` multiplier on diff/applyDiff). (3) Have `applyPatchToWorkingNode` accept a pre-resolved node ref (the adapter already has it via `engine.getSymbol`).
- **Verification**: Confirmed algorithmic structure in `editor-working-helpers.ts:52-83` (read in full).
- **Calibration**: Not "envelope is generous" — the design explicitly targets 1k selection and the worst case is superlinear; verification is genuinely pending.
- **Ref docs**: `docs/architecture/performance-design-requirements.md` P2/P5; `docs/components/industrial-hmi-editor/design-renderer.md` §4.7 (R7 envelope).

---

## P2 findings

Each is tagged with a one-line justification. These are real but do not by themselves drive a remediation plan; they are backlog/triage items.

### Correctness / wiring (P2)

- **[P2] `viewport` prop registered but never applied on mount** — declared §4.1/§4.3 but `useEditorEngine` receives no `initialViewport`; initial `fit`/`center` ignored (toolbox buttons still work post-mount). `packages/flux-renderers-industrial/src/editor/renderer-definitions.ts:36`; no consumer. (Surfaced by Dim 09 + 22.)
- **[P2] `data-status="destroyed"` unreachable + `component:destroy` lifecycle unwired** — the status union includes `'destroyed'` (§8.3 OP-4) but no `setStatus('destroyed')` path exists; compounds with [P1-06]. `scada-editor-canvas.tsx:17,68,102,109,198`.
- **[P2] `statusBar.render()` called with no params; no built-in fallback** — design §4.4 promises `[{canUndo,canRedo,viewport,selectionCount}]`; host override cannot read bound state; default fallback is `null` so `nop-scada-editor-status-bar` marker (§10) never emits. `scada-editor-canvas.tsx:252`.
- **[P2] Renderer reads unregistered `loading`/`empty` regions** — accessed via `props.regions.loading/empty` but never registered `kind:'region'`; always `undefined`. `scada-editor-canvas.tsx:184,203,209` vs `renderer-definitions.ts:39-42`.
- **[P2] `empty` region rendered inside the `error` branch with an error binding** — semantic mismatch; the genuine empty state (ready + zero symbols) renders nothing. `scada-editor-canvas.tsx:208-217`.
- **[P2] Toolbox sub-markers (`-btn`/`-sep`/`-status`/`-import-textarea`) emitted but never styled** — four classNames in the DOM with no CSS rule; not in §10 marker contract. `toolbox-panel.tsx` vs `styles.css`.
- **[P2] Connection pointer-down also fires leafer Editor select + opens an (empty) transform transaction** — the mutex prevents geometry write-back, but selection still updates and a near-empty `transform-move` entry may be pushed. `editor-adapter.ts:84-94` + `use-editor-engine.ts:620-639`.

### Error propagation / robustness (P2)

- **[P2] `errorMessage()` drops `Error.cause`/stack at the `onError` boundary** — `onError(code, message)` is string-only; cause chain lost for diagnostics. `renderer/scada-errors.ts:3-5` consumed at `use-editor-engine.ts:197,208,540,595`. (Dim 19)
- **[P2] Mutator + toolbox handlers have no try/catch around `engine.applyDiff`** — `editor-engine.ts:222`/`:342` can throw; throws surface as uncaught exceptions, no `onError`/`data-status` change; toolbox re-interprets failure as misleading "noChange". `use-editor-engine.ts:220-230,262-363` + `toolbox-panel.tsx:55-109`. (Dim 19)
- **[P2] Mount effect has no try/catch around the ~600-line setup span** — a throw after `engine.build` (e.g., `mountScadaEditorTestHandle` global write under hardened CSP, ResizeObserver unavailable) leaks the leafer App + window global and leaves status at `'loading'`. `use-editor-engine.ts:213-808`. (Dim 19)
- **[P2] `attachEditorAdapter` returns noop when leafer Editor instance missing (fail-open in production)** — cannot distinguish JSDOM-mock from a real plugin-load failure; editor renders `data-status="ready"` but selection/transform are silently dead. `editor-adapter.ts:36-51`. (Dim 15, security fail-closed R3/R4)

### React 19 / state (P2)

- **[P2] Redundant hand-written `useMemo`/`useCallback` (React Compiler handles)** — 7 in `scada-editor-canvas.tsx`, 4 `useMemo` in `inspector-panel.tsx`, 1 in `editor-palette.tsx`; the `latest.current` ref pattern makes the `useCallback` chain in the canvas purely ceremonial. (The 2 `useCallback`s in `use-editor-engine.ts:160-181` ARE load-bearing — in the mount-effect dep array — keep those.) Per `react19-best-practices-review.md`, do not prioritize removal; address opportunistically. (Dim 15)
- **[P2] Toolbox `clipboardCount` React state mirrors canonical `editorClipboard` closure** — programmatic copy/cut (test handle) updates the closure but not the count → Paste button stays disabled. `toolbox-panel.tsx:34,41,73,79,85`. (Dim 04)

### Test quality (P2)

- **[P2] `editor.move` integration test does not verify geometry actually moved** — only asserts the node still exists. `scada-editor-canvas-ops.test.tsx:272-284`. (Dim 23)
- **[P2] `group/ungroup callable` test is pure `not.toThrow()`** — groups a single element (no-op) and ungroups a non-group (no-op), exercising none of the real mutation logic. `scada-editor-canvas-ops.test.tsx:309-315`. (Dim 23)
- **[P2] Toolbox status-message tests never verify i18n text content** — residual E9 blind spot; assert only the `<span>` exists, not `textContent`, so missing i18n keys would render raw key strings undetected. `toolbox-panel.test.tsx:219-265`. (Dim 23)
- **[P2] Toolbox runtime-call assertions stop at "was called"** — never check the directional arg (`align('left')` vs `align('right')`). `toolbox-panel.test.tsx:108-158`. (Dim 23)
- **[P2] Inspector `onChange` test stops at "patch is defined"** — does not verify which field/value. `inspector-panel.test.tsx:122-137`. (Dim 23)
- **[P2] e2e coalesce test relies on real `Date.now()`** — passes deterministically today (sub-ms spacing ≪ 500ms window) but is timing-fragile; coalesce contract itself IS strongly covered by unit tests with fake timers. `scada-editor-canvas-undo-redo.test.tsx:239-263`. (Dim 23)
- **[P2] Connection pointer-drag e2e does not re-verify the linkage coordinates** — asserts count/target/junction/undo-kind but not the `(3.8, 1.3)` linkage math (covered by a separate programmatic test). `scada-editor-canvas-connection.test.tsx:341-369`. (Dim 23)

### Public surface / docs (P2)

- **[P2] `not-mounted` failure path returns a freeform English sentence, not a registry code** — only non-code message in the file; `scadaErrorI18nKey` would fall back to `.unknown`. `use-editor-handles.ts:57`. (Dim 03)
- **[P2] Exported `ScadaEditorViewportPolicy` type disconnected from the schema field that should use it** — schema field uses an inline duplicate; the public type has zero internal consumers. `schemas.ts:9` vs `:31`. (Dim 03)
- **[P2] `editor-mount-failed` error code registered/emitted but undocumented in §8.5.2** — registry has 9 codes, design enumerates 7. `editor-errors.ts:15` + design §8.5.2. (Dim 03)
- **[P2] `ScadaEditorTestHandle` exposes 7 top-level methods beyond the §8.4 contract block** — additive e2e convenience; some duplicate the `undoRedo` sub-handle. `editor-test-handle.ts:43-55`. (Dim 03)
- **[P2] Design §11 lists `use-editor-session.ts`/`use-editor-events.ts` — neither exists** — claimed-existing hook files were folded into the 824-line `use-editor-engine.ts`; the "pure-logic unit-testability" rationale for session/events is undercut. `design-renderer.md:357-360` + `design-architecture.md:443-446`. (Dim 16; compounds [P1-03].)
- **[P2] Design §11 file paths disagree with actual locations of `scada-editor-canvas.tsx` (root) and `editor-engine.ts` (under `renderer/`)** — swapped-by-doc. `design-renderer.md:330,354`. (Dim 16)
- **[P2] `editor-working-helpers.ts` exists on disk but is absent from both §11 file trees** — undocumented actual module. `design-renderer.md:328-364`. (Dim 16)
- **[P2] `quick-reference.md` failure-code list incomplete (4 of 10)** — understates the handle failure surface. `docs/references/quick-reference.md:827`. (Dim 16)
- **[P2] `flux-guide/design-patterns/scada-editor.md` toolbox sub-handle list is a partial subset (12 of 17)** — omits `resetView`/`getViewport`/`toBottom`/`moveUp`/`moveDown`/`getClipboard`. `flux-guide/design-patterns/scada-editor.md:82`. (Dim 16)

### Boundary / tooling (P2)

- **[P2] Editor imports trivial `errorMessage` helper from runtime `renderer/scada-errors.ts`** — undocumented minor intra-package coupling outside the design §4.4.1 reuse-point enumeration; no bundle/ownership impact. `use-editor-engine.ts:3`. (Dim 01)
- **[P2] ESLint `max-lines` (710) configured but does not fire on `use-editor-engine.ts` (824)** — `--print-config` shows the rule active, but a direct `eslint` run exits 0; only `--rule` override forces the violation. A secondary tooling gap that lets the [P1-03] file slip past the ESLint gate (the standalone `check:oversized-code-files` script still catches it). `eslint.config.js:153`. (Dim 15)
- **[P2] Leafer canvas `view` = outer container; absolutely-positioned canvas may overlay sibling panels** — structural concern only; the passing drag benchmark (`tests/e2e/scada-editor-perf.spec.ts`) suggests pointer events DO reach the canvas in a real browser, so this is flagged as **needs browser verification**, not a confirmed defect. `editor-engine.ts:75-84` + `styles.css:14-18`. (Dim 21; downgraded from P1 pending browser verification.)

---

## Cross-dimension patterns

1. **"Declared contract, missing wire" cluster** ([P1-04], [P1-05], [P1-06], [P1-08], [P1-09], [P2 viewport/destroyed/statusBar]) — the E-gate reviews validated the _implemented_ scope thoroughly but a set of declared public contracts (events, props, handles, controlled-mode push-back, lifecycle statuses) were never wired to the engine. This is the same defect shape as the historical E8 M-1 (connection state machine had zero production callers), applied to the schema→event/handle pipeline. Highest-leverage remediation: a single "contract wiring sweep" pass.
2. **Coordinate-space / immutability assumptions invalidated by grouping** ([P1-01], [P1-02]) — both the diff layer and the connection layer assume "node coords are world coords" and "shallow clone is enough"; `scada-group` nesting (a first-class feature) breaks both. Every test fixture places groups at `(0,0)` or doesn't group the edited node, so the test suite is systematically blind to grouped-child cases. Recommended: add grouped-child regression tests for undo, connection snap, and linkage.
3. **`use-editor-engine.ts` is the multi-dimensional hotspot** — appears in [P1-01], [P1-03], [P1-04], [P1-07], [P1-08], [P1-09], [P1-13], plus several P2s. The re-inflation after E9 is structural; splitting it (per [P1-03]) would also make [P1-01]/[P1-07]/[P1-13] easier to fix and test.

## Automated coverage already in place (no action needed)

- R5 bundle isolation is enforced by module graph (verified clean — `@leafer-in/editor` single consumer, runtime entry never imports `src/editor/`, `editable` never serialized).
- `check:audit-runtime-raw-schema-reads` clean — no runtime raw-schema reads; compile-once principle honored for data reads.
- `check:audit-reactive-render-reads` clean; `check:audit-missing-renderer-markers` clean.
- ESLint `no-eval`/`no-new-func` (security R2) passes; no `eval`/`new Function`; import-config path uses `JSON.parse` only (no unsafe deserialization).
- Error-code ↔ handle-failure consistency is tight; no dead codes in `SCADA_EDITOR_ERROR_CODES`.
- The strong parts of the test suite (connection drag-create end-to-end, undo round-trip, coalesce unit logic with fake timers, group structure diff, E8-n1/E10-m1 regression catches) are genuinely strong — markedly better than the scheduling suite that produced the bug-71 P0s.

## Verification note

Per the deep-audit methodology, all P1 findings were re-checked against live source by the main agent (not trusted from sub-agent output). The P1 claims personally re-verified by reading the actual file: [P1-01] (`editor-working-helpers.ts` + `diff.ts:85` + `equality.ts:29` + `undo-redo-adapter.ts:99-100,196-218`), [P1-02] (`connection-adapter.ts:52-68`), [P1-03] (`wc -l` + gate exit code), [P1-08] (`editor-engine.ts:57` + `use-editor-engine.ts:201-211`), [P1-09] (`use-editor-engine.ts:183-184` mount-once guard). The remaining P1s ([P1-04]/[P1-05]/[P1-06]/[P1-07]/[P1-10]/[P1-11]/[P1-12]/[P1-13]) rest on sub-agent greps/readings that are consistent with the code sections personally read and with each other; they should be re-confirmed at remediation time but are reported at P1 confidence.

## Suggested remediation ordering (for the downstream remediation-plan drafter)

1. [P1-01] undo loss for grouped-child edits (data loss; small, high-ROI fix + regression test).
2. [P1-02] coordinate-space cluster (single root-cause fix unblocks grouped-device connections).
3. [P1-08] mode desync on `initialMode:'preview'` (R5; one-line fix).
4. Contract-wiring sweep: [P1-04] onSave/onLoad, [P1-05] commitPolicy, [P1-06] runtime handles, [P1-09] controlled push-back, [P1-10] raw textarea.
5. [P1-07] selection dual-source sync gaps.
6. [P1-11] palette drop position.
7. [P1-03] split `use-editor-engine.ts` (unblocks [P1-13] and eases 1/5/6).
8. [P1-12] + P2 test-quality items (lock the fixes above).
9. [P1-13] perf O(n²) (verify against R7 envelope after the split).

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
