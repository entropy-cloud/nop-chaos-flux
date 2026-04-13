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
- `apps/playground/src/App.tsx`
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

## Remaining Gaps

The main remaining quality issue in the documentation area is not architecture direction but document quality: earlier versions of this file suffered heavy encoding corruption. This file should now act as the clean baseline and must not drift back into mixed current/target wording.

## Related Documents

- `docs/architecture/template-instantiation-and-node-identity.md`
- `docs/architecture/playground-experience.md`
- `docs/analysis/2026-03-21-framework-debugger-design.md`
