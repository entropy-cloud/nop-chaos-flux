# Form Store Diagnostics Design

## Purpose

This document defines the normative architecture contract for form-store commit diagnostics.

It covers:

- how Flux should observe form store commits without confusing diagnostics with runtime truth
- where store diagnostics belong relative to `RendererMonitor`, `FormStoreApi`, and `nop-debugger`
- which metrics are authoritative versus hint-only
- how automation and focused tests should consume store diagnostics

This document does not replace:

- `docs/architecture/form-validation.md` for form store behavior and validation ownership
- `docs/architecture/debugger-runtime.md` for debugger event and automation contracts
- `docs/architecture/performance-design-requirements.md` for hot-path and instrumentation gating rules
- `docs/architecture/performance-diagnostics-and-e2e-design.md` for page-level comparative measurement strategy

## Current Problem

The current diagnostics stack can answer many render, action, API, and node-inspection questions, but it does not expose an authoritative store-level account of:

- how many form store commits happened during one interaction
- which paths each commit touched
- whether a visible "slow" interaction came from logic/state propagation or only from visual styling

Recent debugging of `condition-builder` conjunction toggles exposed the gap clearly:

- debugger render events were available only as churn hints
- focused tests could subscribe to the form store directly, but there is no shared diagnostics contract for that measurement
- the observed symptom looked like state latency, but the root cause was visual-state styling

The design goal is to add a first-class diagnostics surface for store commit analysis without turning the hot path into a permanent logging pipeline.

## Owner And Precedence

This document is the normative owner for form-store commit diagnostics.

- use this file for commit-capture ownership, session semantics, bounded retention rules, and debugger/automation consumption boundaries
- use `docs/architecture/form-validation.md` for broader form store and validation behavior
- use `docs/architecture/debugger-runtime.md` for debugger event/query surfaces that consume this contract

## Design Position

Form store diagnostics are runtime-owned diagnostics infrastructure.

They are:

- not part of ordinary renderer business logic
- not equivalent to debugger timeline events
- not a replacement for per-path store subscriptions used by production hooks
- not an always-on append-only log

The core rule is:

`store diagnostics must be explicit, bounded, and owner-controlled; disabled mode must stay close to zero-cost.`

## Scope Boundary

### In Scope

- diagnostics for `FormStoreApi` commits and publishing behavior
- commit-count and touched-path visibility for focused tests, automation, and debugging
- a bridge from runtime-owned store diagnostics into debugger/automation when explicitly enabled

### Out Of Scope

- replacing React Profiler or page-level commit measurement
- deep snapshot export on every commit
- generic diagnostics for every Zustand store in the repo
- using store diagnostics as the source of truth for field validation semantics

## Terminology

### Store Commit

A store commit is one observable publish of `FormStoreState` caused by a form-store write path such as `setValue`, `setFieldState`, or `batchUpdate`.

### Commit Diagnostics Sample

A commit diagnostics sample is a bounded record describing one store commit for diagnostic purposes.

### Diagnostics Session

A diagnostics session is a bounded capture window created explicitly by a host, test, or automation entrypoint to inspect store commits around one scenario.

## Why Existing Surfaces Are Not Enough

### `RendererMonitor`

`RendererMonitor` currently owns render, action, and API events. It is suitable for renderer-lifecycle churn hints, but store commits sit below renderer boundaries and need different semantics:

- one store commit may wake zero, one, or many subscribers
- one interaction may produce multiple store commits before or after any visible rerender
- render events do not tell us which form paths changed

Therefore store diagnostics must not be modeled as synthetic render events.

### Direct Test Subscription

Focused tests can subscribe to `form.store` directly today, which is good for local diagnosis. It is not sufficient as the long-term framework contract because:

- every test reinvents measurement shape and retention rules
- browser automation cannot rely on ad-hoc test-only probes
- debugger and diagnostics pages cannot query those probes consistently

### `nop-debugger`

`nop-debugger` is the right structured diagnostics consumer, but not the primary owner of store commits. The debugger should ingest normalized store diagnostics from runtime-owned sources instead of inventing a parallel observer with different truth semantics.

## Ownership Model

### Runtime Owns Capture

Store commit diagnostics belong at the `flux-runtime` layer, next to form-store update and publication code.

The owner boundary is:

- `packages/flux-runtime/src/form-store.ts` and related projected-store helpers own capture points
- `packages/flux-core` owns the exported contract types
- `packages/nop-debugger` may consume the normalized diagnostics surface, but does not define store semantics

### Host Owns Enablement

Diagnostics capture must be host-controlled.

That means:

- default runtime operation does not capture commit samples
- tests, diagnostics pages, or debugger-enabled hosts may opt in explicitly
- opt-in may be separate from general debugger enablement and separate from render-performance capture

This follows `docs/architecture/performance-design-requirements.md` requirements that debug/perf instrumentation stay explicitly gated.

## Required Diagnostic Questions

The surface must answer these questions directly:

1. How many form store commits occurred during one interaction?
2. Which logical paths were touched by each commit?
3. Was the commit value-oriented, field-state-oriented, submitting-oriented, or mixed?
4. Did one user gesture trigger a suspicious burst of commits?
5. Can automation read the bounded session without scraping UI or injecting ad-hoc probes?

It should also support secondary analysis:

- correlating a debugger `interactionId` with form store commit bursts when the host wires both surfaces
- comparing store commit count against render-churn hints and page-local probes

## Event And Snapshot Model

### Authoritative Metric Surface

The authoritative metrics for store diagnostics are:

- `commitCount`
- per-commit `timestamp`
- changed `paths`
- changed `kinds`

Where `kinds` classifies the commit at a coarse level, such as:

- `values`
- `fieldStates`
- `submitting`
- `submitAttempted`

This is intentionally narrower than deep state snapshots.

### Hint-Only Versus Authoritative

- store commit count and changed-path metadata are authoritative within the enabled diagnostics session
- any derived "burst", "fanout", or "possible over-render" summaries are hint-only
- debugger render events remain hint-only and must not be re-labeled as commit authority

## Capture Contract

The store diagnostics surface exposes a bounded contract shaped like:

```ts
interface FormStoreCommitDiagnostic {
  timestamp: number;
  sequence: number;
  ownerId: string;
  changedPaths: readonly string[];
  changedKinds: readonly ('values' | 'fieldStates' | 'submitting' | 'submitAttempted')[];
}

interface FormStoreDiagnosticsSnapshot {
  enabled: boolean;
  commitCount: number;
  recentCommits: readonly FormStoreCommitDiagnostic[];
  droppedCommitCount: number;
}
```

The semantic contract must preserve:

- bounded retention
- explicit path-level metadata
- explicit drop accounting when the buffer truncates

## Buffering Rules

Store diagnostics must obey the same bounded-diagnostics discipline as debugger events.

Required rules:

- capture uses a fixed-size recent-commit buffer
- append remains O(1) relative to retained history size
- truncation increments an explicit `droppedCommitCount`
- disabled mode must skip equivalent shaping work instead of capturing then discarding

The design must not require deep-cloning `values` or `fieldStates` on every commit.

## Path Semantics

Changed-path metadata must stay coarse and truthful.

Rules:

- when the write path knows exact paths, diagnostics should retain those exact paths
- wildcard or whole-form updates may use `'*'` when exact path enumeration is unavailable or too expensive
- projected/prefixed stores must report paths in the public owner-relative coordinate space their consumers already use
- diagnostics must not claim field-level precision that the underlying write path did not actually compute

## Session Model

Long-running always-on capture is not the default contract.

The v1 contract requires explicit diagnostics session control. A host, test harness, or automation client must be able to:

- start capture
- clear previous retained samples
- read a bounded snapshot/report
- stop capture

The design may expose those capabilities as explicit runtime methods rather than as free-form mutable state, but v1 must not fall back to an always-on implicit ring buffer as the only contract.

This fits focused tests, diagnostics pages, and debugger automation better than a permanent global log.

### Minimum V1 Session Capabilities

The minimum supported session semantics are:

- `start` enables commit capture for that store owner
- `clear` resets retained samples and counters for the current diagnostics session
- `snapshot` returns the bounded retained state
- `stop` disables further capture without requiring runtime disposal

Current live baseline:

- `FormStoreApi` now exposes `startDiagnosticsSession(options?)`, `stopDiagnosticsSession()`, `clearDiagnosticsSession()`, and `getDiagnosticsSnapshot()` as the runtime-owned v1 session surface
- `packages/flux-runtime/src/form-store.ts` captures authoritative bounded commit diagnostics at runtime store commit/publication boundaries
- projected/public wrappers such as `createProjectedFormStore(...)` and `createOwnedFormStore(...)` translate diagnostics snapshots into their consumer-visible coordinate space instead of leaking parent absolute paths
- `stopDiagnosticsSession()` stops further capture but preserves the current bounded snapshot; `clearDiagnosticsSession()` owns counter and retained-history reset semantics

If a host wants a persistent diagnostics mode, it may keep the session enabled across multiple interactions. The contract still remains explicit session ownership rather than implicit always-on capture.

## Integration With `RendererMonitor`

Store diagnostics should not be forced directly into `RendererMonitor` because that API is renderer-centric today.

The contract split is:

- keep `RendererMonitor` for render/action/API surfaces
- add a parallel runtime-level diagnostics hook for form-store commits
- allow hosts or debugger adapters to correlate both surfaces when needed

The implementation must not satisfy this contract by adding a debugger-side observer or a new generic full-store diagnostics subscriber above runtime ownership. Capture belongs at runtime-owned commit/publication boundaries.

If future ergonomics require one host configuration object for all diagnostics gates, configuration may be shared. The event semantics should still remain split by owner.

## Integration With `nop-debugger`

`nop-debugger` should consume store diagnostics through an explicit runtime-owned bridge.

V1 behavior:

- debugger overview may expose bounded commit counts or recent commit summaries when the host enables store diagnostics
- debugger automation may query store diagnostics without DOM scraping
- debugger timeline may show summarized store commit entries only when explicitly enabled and only with bounded payloads

Current live boundary:

- the runtime-owned diagnostics surface is landed
- debugger automation wiring remains explicit successor work owned by `docs/plans/446-form-store-debugger-bridge-plan.md`
- no current live contract should imply that the debugger bridge already exists merely because the runtime diagnostics surface now does

The debugger must not become the only way to access store diagnostics. Focused tests and diagnostics pages should be able to query runtime-owned data directly.

## Testing And Automation Contract

### Focused Unit Tests

Focused tests should be able to assert:

- one interaction produces at most N commits
- the last commit touched expected paths
- no unexpected extra commit burst happened

### E2E And Diagnostics Pages

Automation should be able to assert:

- zero or bounded commit bursts for a specific scenario
- expected changed paths for localized interactions
- no mismatch between visible interaction and underlying commit activity

As with existing performance diagnostics, these are count-based locality and truthfulness gates, not cross-machine timing benchmarks.

## Rejected Misreadings

- Store diagnostics are not a license to add permanent console logging in hot paths.
- Store diagnostics are not equivalent to React commit measurement.
- Store diagnostics are not a substitute for per-path subscription correctness.
- Store diagnostics are not a deep session replay format.

## Documentation And Routing Requirements

When this design lands in code, related docs should stay aligned:

- `docs/architecture/debugger-runtime.md`
- `docs/architecture/performance-diagnostics-and-e2e-design.md`
- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/form-validation.md`
- `docs/references/form-validation-runtime-types.md`

## Implementation Direction

Implementation follows these rules:

1. add a runtime-owned, explicitly gated, bounded form-store diagnostics surface
2. keep it separate from `RendererMonitor` event semantics even if host configuration is shared
3. let debugger and automation consume the normalized runtime-owned snapshot instead of ad-hoc probes
4. use count/path-based diagnostics as the main regression gate, not absolute timing claims
