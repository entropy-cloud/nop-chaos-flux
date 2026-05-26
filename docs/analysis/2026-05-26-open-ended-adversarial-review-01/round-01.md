# Open-Ended Adversarial Review — 2026-05-26 — Round 01

**Execution date**: 2026-05-26  
**Result directory**: `docs/analysis/2026-05-26-open-ended-adversarial-review-01/`  
**Exploration areas**: anonymous source execution, action adapter convergence, source-enabled props  
**Discovery source**: contract archaeology around the claim that action-backed anonymous sources reuse the unified action boundary

---

## Finding 1: Source-enabled prop execution cannot preserve the caller renderer's action context, so namespaced/imported/component sources can fail even when the renderer has those capabilities

- **Where**:
- `packages/flux-core/src/types/renderer-core.ts:75-86,154-172,291-295`
- `packages/flux-react/src/renderer-helpers.ts:74-106,159-164`
- `packages/flux-runtime/src/async-data/source-observer.ts:89-96`
- `packages/flux-runtime/src/async-data/source-executor.ts:13-35`
- `packages/flux-runtime/src/action-adapter.ts:349-448`
- `docs/architecture/api-data-source.md:280-316,730-789`
- `docs/architecture/renderer-runtime.md:150-160,220-224`
- **What**: `RendererHelpers.executeSource(...)` correctly preserves the current renderer action context by calling `mergeActionContext(input)` and passing it as `ctx`. But the main source-enabled prop path does not use that helper. `useNodeSourceProps()` / `SourceObserver.run(...)` call `runtime.executeSource({ source, scope, ctx: { signal } })`, and the public `SourceObserver.run` / `AnonymousSourceEntry` type has no place to carry `actionScope`, `componentRegistry`, `nodeInstance`, `form`, `page`, `surfaceRuntime`, or `evaluationBindings`. `createSourceExecutor()` then dispatches the action with only `{ runtime, scope, ...ctx }`. The action adapter requires `ctx.componentRegistry` for `component:<method>` and `ctx.actionScope` for namespaced/imported actions, so those source bodies fail as unavailable even though the rendered node already has those capabilities in `NodeRendererResolved`.
- **Why it matters**: active docs say anonymous `type: 'source'` is the shared source-enabled value carrier and that action-backed source bodies already reuse the unified built-in / component / namespaced `ActionRuntimeAdapter` boundary. That is true only for direct helper callers. A normal renderer-declared `allowSource` prop using `{ type: 'source', action: 'designer:getSelection' }`, `{ action: 'component:getValue', componentId: ... }`, or an imported namespace action executes later through a runtime-owned observer that lost the lexical action boundary. This turns source-enabled props into a narrower action dialect than ordinary events and `helpers.executeSource`, while the schema shape and docs present them as the same model.
- **Confidence**: Certain
- **Non-duplication note**: older anonymous-source findings covered React-owned lifecycle, signal forwarding, cancelled/timedOut result classification, and per-source rejected attribution. This is a distinct live context-preservation defect: the source observer path has no carrier for the current action scope / component registry, so the unified adapter boundary is reached without the data needed to invoke component or namespaced actions.

## Round Assessment

This round found a boundary split that is easy to miss because all paths eventually call `runtime.executeSource(...)`. The semantic difference is not in the executor itself; it is in which caller can supply a full `ActionContext`. Direct renderer helper calls can, but renderer-declared `allowSource` props cannot, even though they are the high-volume advertised source-enabled path.

Immediate improvement direction: extend the runtime source observer entry/run contract so the React host can pass the same merged action context it already builds for helpers and events, or provide a node-level source observer factory that is explicitly bound to the current renderer action context. Regression coverage should include at least one `allowSource` options/text prop backed by a namespaced action and one backed by `component:<method>`.

## Blind-Spot Self-Assessment

This round did not audit action-backed named `data-source` context fidelity. It likely has its own owner-local constraints because named sources are runtime-owned and scope-scoped, but that should be checked separately rather than assumed equivalent to source-enabled props.
