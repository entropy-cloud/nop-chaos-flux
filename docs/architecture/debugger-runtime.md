# Debugger Runtime Design

## Purpose

This document defines the target runtime contract for `@nop-chaos/nop-debugger`.

It covers:

- debugger host integration points
- the unified event model
- mounted-node inspection
- automation-facing APIs
- the role of the debugger as framework diagnostics infrastructure rather than only a human-facing panel

Historical exploration, earlier proposals, and execution notes live in:

- `docs/analysis/2026-03-21-framework-debugger-design.md`
- `docs/plans/20-nop-debugger-implementation-plan.md`
- `docs/plans/22-debugger-node-inspector-enhancement-plan.md`

## Current Code Anchors

- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/use-inspect-mode.ts`
- `apps/playground/src/app.tsx`
- `apps/playground/src/pages/FluxBasicPage.tsx`
- `apps/playground/src/pages/DebuggerLabPage.tsx`
- `tests/e2e/debugger.spec.ts`

## Design Position

`nop-debugger` is not a playground-only log panel.

It is:

- a framework-level diagnostics package
- a unified event collection and normalization layer
- a floating developer-facing panel
- an automation-facing structured diagnostics API

Compared with AMIS, the key design difference is that Flux explicitly treats the debugger as both a human tool and an automation substrate.

## Core Rules

1. The debugger must expose structured data without requiring panel DOM scraping.
2. Mounted-node inspection must center on live `cid`.
3. `NodeLocator` must not remain in debugger contracts.
4. Repeated-aware inspection may additionally expose `instancePath` context.
5. Runtime/registry data is the primary source of mounted inspect state; DOM metadata is supplemental.

## Identity Contract

- `cid` is the canonical mounted-node identity for debugger events, traces, inspect payloads, and anomaly grouping
- `nodeId` and `path` may remain as human-oriented summaries
- repeated nodes may additionally expose `instancePath` in inspect/debug payloads when repeated-safe context is needed
- any serialized/debug-session use of `cid` outside the immediate mounted runtime should pair it with `runtimeId`

Target event shape:

```ts
interface DebuggerEvent {
  kind: string;
  summary: string;
  runtimeId?: string;
  cid?: number;
  instancePath?: readonly InstanceFrame[];
  nodeId?: string;
  path?: string;
  rendererType?: string;
  interactionId?: string;
  requestKey?: string;
}
```

## Host Integration

Hosts obtain a controller through `createNopDebugger()` and integrate it at the renderer root through:

- `decorateEnv(env)`
- `plugin`
- `onActionError`
- `setComponentRegistry()`
- `setActionScope()`

This keeps debugger attachment at the framework host boundary rather than inside individual renderers.

## Unified Event Model

The debugger event stream includes at least:

- `compile:start`
- `compile:end`
- `render:start`
- `render:end`
- `action:start`
- `action:end`
- `api:start`
- `api:end`
- `api:abort`
- `notify`
- `error`
- `state:snapshot`

Shared event concepts include:

- `requestKey`
- `requestInstanceId`
- `interactionId`
- `scopeChain`
- inspect payloads keyed by `cid`

Current async-governance diagnostics baseline:

- runtime-owned async owners now expose a bounded shared snapshot surface via runtime inspection APIs rather than by emitting a separate unbounded event stream for every settle
- the shared fields are `ownerKind`, `ownerId`, `scopeId`, `runId`, `cause`, `startedAt`, `settledAt`, `outcome`, `supersededBy`, `cancelled`, `timedOut`, and optional error summary
- current runtime exposes this additive surface through `getAsyncOwnerDebugSnapshot()`, and `nop-debugger` automation now forwards that same bounded snapshot through `getAsyncOwnerDebugSnapshot()` rather than inventing a second event channel
- source/reaction snapshots also embed owner-local async summaries relevant to those registries
- current in-scope owners are API-backed `data-source`, async `reaction` dispatch, and async validation runs; plain action/request execution still primarily reports execution-control and monitor metadata rather than becoming a first-class async owner epoch model
- this keeps debugger/automation able to answer “why did this async result not publish?” without inflating the hot event stream with deep per-run payloads

### Event Budget And Retention Rules

The debugger is framework diagnostics infrastructure, but it must still obey the performance baseline in `docs/architecture/performance-design-requirements.md`.

Required budget rules:

- debugger collection must stay bounded by a configured event cap rather than grow without limit
- event append paths must remain O(1) relative to stored history size
- the default interactive panel should operate on recent snapshots/history windows, not on an unbounded full-session event list
- pause/resume must stop or resume event collection deterministically rather than leaving partially applied buffering behavior

Current code-aligned baseline:

- controller creation already uses a bounded `maxEvents` ring-style retention budget
- pinned error buffers keep only a small earliest/latest slice rather than full historical duplication
- panel timeline virtualization activates for larger event lists instead of rendering the full list eagerly
- search uses deferred input and filtered projections rather than re-running heavy UI work on every keystroke synchronously

### Snapshot And Payload Discipline

`state:snapshot` is useful, but it must be treated as a bounded diagnostics payload rather than an always-on deep export stream.

Recommended rules:

- emit snapshots only at explicit boundary events where the debugger needs a coarse-grained state picture
- do not emit deep snapshot payloads on every render tick or every local interaction by default
- large exported payloads should prefer summarized/debug-safe shapes over raw deep runtime objects when equivalent diagnostics value can be preserved
- diagnostic export/session APIs may materialize larger payloads on demand, but the hot event stream should stay lighter-weight

### Sampling And UI Work Rules

The debugger UI is allowed to do richer grouping/search/trace work, but it should keep that work out of the event append hot path.

Required direction:

- expensive grouping, merging, formatting, or trace derivation should happen in panel/automation query code, not during low-level event append
- slow-path analysis should prefer memoized derived views over eagerly attaching large formatted blobs to every event
- if future high-frequency event kinds are added, sampling or coalescing rules must be defined at the same time

### Export And Automation Boundary

Automation/export APIs may expose more history or richer payloads than the live floating panel, but they should still stay explicit and bounded.

Recommended rules:

- `createDiagnosticReport()` and `exportSession()` should take explicit event limits or query filters for larger exports
- redaction stays on the export/automation boundary, not as ad-hoc panel-only masking
- the live panel should not implicitly pay the full cost of “maximum export fidelity” for every captured event

## Inspection Model

### DOM Inspect Rule

- mounted inspectable nodes expose `data-cid`
- `inspectByElement()` climbs to the nearest inspectable owner marker rather than requiring the clicked descendant itself to carry `data-cid`
- `inspectByCid()` returns the live node inspect payload and may include `instancePath`
- DOM presence is supplemental metadata for tag/class correlation, not the primary truth source for mounted state

### Mounted-State Truth Source

The runtime/component registry is the primary truth source for live inspect state.

That means:

- `inspectByCid()` should trust runtime/registry inspect payloads first
- DOM lookup helps with tag/class correlation and nearest-element targeting
- lack of a matching DOM element should not by itself erase a still-live runtime inspect result

### Result Categories

Debugger-facing inspection must distinguish:

- `resolved`
- `notMaterialized`
- `notFound`

Target inspect contract:

```ts
type InspectResult =
  | { kind: 'resolved'; payload: NodeInspectPayload }
  | { kind: 'notMaterialized'; instancePath?: readonly InstanceFrame[] }
  | { kind: 'notFound' };
```

## Automation API

Stable automation-facing methods include:

- `getSnapshot()`
- `getOverview()`
- `queryEvents()`
- `getLatestEvent()`
- `getLatestError()`
- `getPinnedErrors()`
- `getNodeDiagnostics()`
- `getInteractionTrace()`
- `createDiagnosticReport()`
- `exportSession()`
- `waitForEvent()`
- `inspectByCid()`
- `inspectByElement()`
- `getLatestFailedRequest()`
- `getLatestFailedAction()`
- `getRecentFailures()`
- `getNodeAnomalies()`
- `evaluateNodeExpression()`

AI/E2E should prefer these APIs over panel DOM inspection.

## Developer-Facing UI

The panel is a developer-facing product surface layered onto the automation substrate.

Expected stable UI pieces include:

- launcher
- floating panel
- minimize bar
- Overview / Timeline / Network / Node tabs
- search, filter, pause, clear
- error aggregation
- inspect mode and overlay
- Node tab inspection of form/scope data

## Verification Baseline

The debugger should be protected by:

- unit tests for controller / automation / diagnostics / inspect / panel
- E2E coverage for launcher/panel behavior and automation API access
- a debugger lab page suitable for both manual and automated use

Performance-sensitive debugger behavior should also be protected by focused regression checks such as:

- bounded event retention
- pause/resume determinism
- virtualization thresholds for larger timelines
- deferred search/filter behavior for larger event sets

## Remaining Gaps

The main remaining quality issue in the documentation area is not architecture direction but document quality: earlier versions of this file suffered heavy encoding corruption. This file should now act as the clean baseline and must not drift back into mixed current/target wording.

## Related Documents

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/playground-experience.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
