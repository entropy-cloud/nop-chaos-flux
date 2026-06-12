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

- `docs/archive/analysis/2026-03-21-framework-debugger-design.md`
- `docs/archive/plans/20-nop-debugger-implementation-plan.md`
- `docs/archive/plans/22-debugger-node-inspector-enhancement-plan.md`

## Current Code Anchors

- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/nop-debugger/src/automation.ts`
- `packages/nop-debugger/src/panel.tsx`
- `packages/nop-debugger/src/panel/use-inspect-mode.ts`
- `apps/playground/src/App.tsx`
- `apps/playground/src/pages/flux-basic-page.tsx`
- `apps/playground/src/pages/debugger-lab-page.tsx`
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

Current enablement baseline:

- `enabled: false` means the debugger controller remains a bounded no-op surface for automation/query APIs, but it must not enable component-registry debug capture or append debugger events.
- performance-oriented render capture may be controlled separately from general debugger enablement through an explicit host gate such as `capturePerformance`; hosts that only want launcher/panel availability do not need to pay render-event collection cost.

Current panel baseline:

- built-in panel chrome, launcher labels, tooltips, placeholders, and JSON-viewer disclosure labels resolve through the `flux.debugger` locale namespace rather than hardcoded English
- debugger disclosure and selection triggers use shared `@nop-chaos/ui` button semantics with native button behavior plus `aria-expanded`/content relationships instead of hand-authored `role="button"` widgets
- debugger-owned visuals read `var(--nop-debugger-*, fallback)` at `.nop-debugger` / `.nop-debugger-launcher` surfaces instead of publishing defaults onto `.nop-theme-root`, so host token overrides remain stable even though debugger CSS is injected at runtime
- runtime-injected stylesheet selectors for debugger internals stay anchored under debugger-owned roots (`.nop-debugger`, `.nop-debugger-launcher`) rather than exposing bare global `.ndbg-*` hooks

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

Current error-event baseline:

- debugger `error` events keep a short text `detail` summary for the timeline, but they should also expose a structured redacted payload through `exportedData`
- for monitor-driven error events, that structured payload should include the normalized error shape plus nested `Error.cause` and monitor `details` when available
- debugger formatting may collapse the human-readable timeline string, but it must not drop already-preserved `cause` / `details` from the machine-readable event payload

Current async-governance diagnostics baseline:

- runtime-owned async owners now expose a bounded shared snapshot surface via runtime inspection APIs rather than by emitting a separate unbounded event stream for every settle
- the shared fields are `ownerKind`, `ownerId`, `scopeId`, `runId`, `cause`, `startedAt`, `settledAt`, `outcome`, `supersededBy`, `cancelled`, `timedOut`, and optional error summary
- current runtime exposes this additive surface through `getAsyncOwnerDebugSnapshot()`, and `nop-debugger` automation now forwards that same bounded snapshot through `getAsyncOwnerDebugSnapshot()` rather than inventing a second event channel
- source/reaction snapshots also embed owner-local async summaries relevant to those registries
- current in-scope owners are action-backed remote `data-source`, async `reaction` dispatch, and async validation runs; plain action/request execution still primarily reports execution-control and monitor metadata rather than becoming a first-class async owner epoch model
- this keeps debugger/automation able to answer “why did this async result not publish?” without inflating the hot event stream with deep per-run payloads
- debugger abort/cancelled presentation is downstream of runtime semantics: debugger adapters may classify `api:abort` or render `cancelled` / `timedOut` badges, but they should follow the same shared abort-like result vocabulary already used by runtime/action execution rather than maintaining a narrower debugger-only interpretation

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
- render/update diagnostics are hint-only: authoritative counts come from explicit focused measurement surfaces, while debugger overview/node diagnostics expose bounded churn hints such as render commit count, render burst count, and unique-node fanout derived from the bounded ring

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
- overview/report/node-diagnostics render counters must not overclaim benchmark authority when they are derived from throttled `render:start` plus unthrottled `render:end`; these surfaces should be labeled as churn hints unless a narrower authoritative contract is separately proven

## Inspection Model

### DOM Inspect Rule

- mounted inspectable nodes expose `data-cid`
- `inspectByElement()` climbs to the nearest inspectable owner marker rather than requiring the clicked descendant itself to carry `data-cid`
- `inspectByCid()` returns the live node inspect payload and may include `instancePath`
- DOM presence is supplemental metadata for tag/class correlation, not the primary truth source for mounted state
- when DOM correlation is needed, lookup must first narrow to the mounted runtime root (for example `[data-runtime-id="..."]`) before resolving `[data-cid="..."]`; `cid` is only runtime-local, so page-global DOM queries are not a supported inspect path on multi-runtime pages
- if a clicked element belongs to a different runtime root, `inspectByElement()` must return no result rather than resolve the naked `cid` against the current controller's registry

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
- `explainNodeValue()`
- `explainNodeMeta()`
- `explainNodeFailure()`
- `explainNodeAsync()`

Current store-diagnostics routing baseline:

- form-store commit diagnostics are runtime-owned and specified by `docs/architecture/form-store-diagnostics.md`
- debugger-side consumption of that bounded snapshot surface is a downstream bridge concern, not a debugger-owned capture mechanism
- successor bridge ownership currently lives in `docs/plans/446-form-store-debugger-bridge-plan.md`

AI/E2E should prefer these APIs over panel DOM inspection.

### AI-First Explanation Contracts

The debugger now exposes explanation-oriented automation contracts in addition to raw inspect and event APIs.

- `explainNodeValue({ cid, field })` answers where a node value currently comes from using bounded evidence such as form state, scope snapshots, resolved props, or resolved meta.
- `explainNodeMeta({ cid, field })` answers why a key meta field such as `visible`, `hidden`, `disabled`, `label`, `title`, or `className` currently resolves the way it does.
- `explainNodeFailure({ cid | nodeId | path })` answers the latest node-scoped failure using bounded related events instead of forcing automation to manually join request, error, and interaction traces.
- `explainNodeAsync({ cid | nodeId | path })` answers which async owners are directly attributable to the current node from the bounded runtime async snapshot.

Each explanation result is machine-oriented and bounded. The stable output shape includes:

- `kind`
- `subject`
- `answer`
- `confidence`
- `limitations`
- `evidenceRefs`
- `related`
- `truncated`
- `data`

Contract rules:

- explanation payloads must stay bounded; evidence, dependency paths, related events, and async owners are capped rather than returned as unbounded runtime objects
- explanations may use current inspect snapshots, recent events, and async owner snapshots as evidence, but they must not expose raw runtime-private objects as the public contract
- explanations must include `limitations` whenever the debugger can only give a conservative snapshot-based answer rather than a full causal proof
- explanation values must obey the same redaction boundary as session export data

AI/E2E should use explanation methods as the preferred entry point for “why” questions and fall back to lower-level inspect/trace methods only when explanation limitations make that necessary.

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
- E2E coverage for launcher/panel behavior, automation API access, and explanation-contract semantics on deterministic fixtures
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
- `docs/architecture/performance-diagnostics-and-e2e-design.md`
- `docs/archive/analysis/2026-03-21-framework-debugger-design.md`
