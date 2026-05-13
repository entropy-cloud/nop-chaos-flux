# Open-Ended Adversarial Review — Round 1

**Date**: 2026-05-13
**Perspective used**: Multiple — contract archaeologist, lifecycle tracker, 10x scaler, accessibility auditor
**De-duplication baseline**: Scanned all prior adversarial reviews in `docs/analysis/2026-05-0{5,6,7,8,11,12}-open-ended-adversarial-review-01/`

---

## Summary

Round 1 explored five code domains in parallel: scope/store lifecycle, dependency tracking/reactivity, action dispatch chain, compilation pipeline, and i18n/accessibility. The most impactful novel findings are: (1) a formula data source dead-lock bug where initial publish failure permanently disables scope-change reactivity, (2) a doc-code contract mismatch in `scopeChangeHitsDependencies` that makes the dead-lock invisible, (3) the `@nop-chaos/ui` package running its own English-only `t()` completely disconnected from the i18n system, and (4) action dispatch having no concurrency control — overlapping chains write to the same scope unpredictably.

---

## Finding 1: Formula Source Dead-Lock — Initial Publish Failure Permanently Disables Reactivity

**Where**: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:88-160`, `packages/flux-runtime/src/async-data/source-registry.ts:131, 216-262`

**What**: When a formula data source's first evaluation throws (e.g., a referenced scope variable doesn't exist yet), the `onDependenciesChange` callback is never invoked. The source's `dependencies` field in `source-registry.ts` remains `undefined`. Per the actual code behavior of `scopeChangeHitsDependencies(change, undefined)` (which returns `false` — see Finding 2), the source's scope-change subscription **permanently skips all future notifications**. The source never self-heals even after the scope data is corrected.

**Why it matters**: A formula source that fails once on initialization becomes a permanently stale zombie. This is a silent correctness bug — no error is surfaced, and the source simply stops responding to data changes. Only a manual `refreshDataSource()` call or a full runtime recreation can revive it. The same pattern exists for API data sources if `evaluateSingleAjaxAction` throws before calling `onDependenciesChange`.

**Confidence**: Certain

**Discovery source**: Dependency tracking audit, triggered by tracing what happens when `dependencies` stays `undefined`.

---

## Finding 2: Doc-Code Mismatch — `scopeChangeHitsDependencies(change, undefined)` Returns `false`, Doc Says `true`

**Where**:

- Code: `packages/flux-runtime/src/scope-change.ts:130-132`
- Doc: `docs/architecture/dependency-tracking.md:499`
- Test: `packages/flux-runtime/src/__tests__/scope-change.test.ts:45-52`

**What**: The doc states:

> Current `scopeChangeHitsDependencies(change, undefined) -> true` is correct for unknown dependencies.

The code returns `false`:

```typescript
if (!change || !dependencies) {
  return false; // undefined dependencies -> false
}
```

The test confirms the `false` behavior and was likely written to match the code, not the doc.

**Why it matters**: This doc-code mismatch masks the severity of Finding 1. The doc's claim that "undefined dependencies invalidate everything" is the conservative, safe behavior. The code's "undefined dependencies skip everything" is the dangerous behavior. If the doc were accurate, Finding 1 would not be a bug because `undefined` dependencies would still trigger refreshes.

**Confidence**: Certain

---

## Finding 3: `@nop-chaos/ui` Package Uses Its Own English-Only `t()` Function

**Where**: `packages/ui/src/lib/i18n.ts:1-17`

**What**: The `@nop-chaos/ui` package has a private `t()` function backed by a hardcoded English string map (`messages`), completely disconnected from `@nop-chaos/flux-i18n`. This `t()` is consumed by Dialog (close label), Pagination (prev/next aria-labels), Carousel (labels), Sidebar (toggle), and Breadcrumb ("More").

```typescript
const messages: Record<string, string> = {
  'flux.breadcrumb.more': 'More',
  'flux.common.close': 'Close',
  'flux.dialog.close': 'Close dialog',
  'flux.pagination.morePages': 'More pages',
  'flux.sidebar.toggle': 'Toggle sidebar',
  // ...
};
export function t(key: string) {
  return messages[key] ?? key;
}
```

**Why it matters**: Core UI components — Dialog close buttons, Pagination aria-labels, Carousel labels — will always render English text regardless of the configured language. This is a fundamental i18n gap that affects every user in a non-English locale. These are also ARIA labels, so screen reader users in other languages hear English. No previous adversarial review caught this because i18n was not a review axis.

**Confidence**: Certain

---

## Finding 4: No Concurrent Dispatch Serialization — Overlapping Chains Write to Same Scope Unpredictably

**Where**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:332-463`

**What**: The `dispatch()` function is fully async but has no mechanism to track, serialize, or cancel in-flight dispatch chains. If a user interaction triggers `dispatch(A → B → C)` where B is an async ajax action, and the user triggers the same dispatch again before B resolves, both chains execute concurrently on the same scope with no coordination. The `createActionDispatcher` returns a plain `{ dispatch, dispose }` object with no in-flight tracking.

The submit guard in `executeFormSubmit` prevents concurrent form submits, but this only covers the `submitForm` action path. Any other action chain (including `setValue` chains, navigation chains, or custom action chains) has no protection.

**Why it matters**: Rapid user interactions (double-clicking a button, typing in a search field with onchange) can trigger concurrent chains that write to the same scope state. Last-writer-wins semantics with no ordering guarantee produce inconsistent UI state. This is not a theoretical concern — any form with a "Save" button or any table with a "Delete" action is susceptible.

**Confidence**: Likely

**Discovery source**: Action dispatch chain audit, triggered by asking "what happens if a user clicks twice?"

---

## Finding 5: Action Cancellation Semantically Misclassified as Failure — Triggers `onError` for Intentional Cancellations

**Where**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:349-455`

**What**: When an action is cancelled (AbortSignal aborted, debounce replaced), `classifyActionResult()` classifies `{ ok: false, cancelled: true }` as `'failure'` because `!result.ok` is true. This means:

- `onError` handlers run for intentional cancellations
- `onSettled` handlers run for intentional cancellations
- There is no `onCancelled` branch or skip logic

Specifically for debounce: when `runActionWithDebounce` cancels a pending debounce, the cancelled result flows back through the dispatch chain and triggers `onError`/`onSettled` for the cancelled action. A schema with `{ debounce: 300, onError: [{ action: 'showToast', args: { message: 'Failed' } }] }` will show error toasts for every debounced cancellation.

**Why it matters**: Schema authors cannot distinguish "action was intentionally cancelled" from "action failed." Error recovery logic (showing messages, retrying, logging) fires for normal operational events. In a debounced search field, this means spurious error handling on every keystroke.

**Confidence**: Certain

---

## Finding 6: `onActionStart` Monitor Callback Outside try/catch — Buggy Monitoring Plugin Crashes Entire Dispatch Chain

**Where**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:84-85`

**What**: In `runSingleAction`, `onActionStart` is called at line 85, **before** the try/catch block that starts at line 87. If the monitoring callback throws (e.g., a third-party analytics plugin has a bug), the error propagates uncaught through `runSingleActionWithRetry` and into the dispatch chain.

Meanwhile, `onActionEnd` calls inside the try/catch (line 176) and via `finishAction` are properly protected. The `onSettled` dispatch is wrapped in try/catch (lines 404-454), but `onError` and `then` dispatch calls are not.

**Why it matters**: A monitoring/analytics plugin throwing in `onActionStart` will crash the entire dispatch chain as an unhandled rejection. Monitoring callbacks are typically cross-cutting concerns that should be fault-tolerant. The inconsistency (onActionEnd protected, onActionStart unprotected; onSettled protected, onError unprotected) suggests this is an oversight, not a design choice.

**Confidence**: Certain

---

## Finding 7: `useHostScope` Replaces Scope Without Disposing Previous — Listener Leak on Parent Store

**Where**: `packages/flux-react/src/workbench/hooks.ts:66-82`

**What**: When `parentScope`, `path`, or `scopeLabel` changes, `useHostScope` creates a new scope via `runtime.createHostProjectionScope()` and replaces the old one via `store.replace(next)`. The old scope's composite store subscription to the parent is never unsubscribed. Each replacement adds an orphaned composite store listener to the parent scope's store.

**Why it matters**: In a designer or workbench where the host scope might be replaced frequently (e.g., selecting different records, switching between designer panels), listener closures accumulate on the parent store. Each orphaned listener captures the old child scope and its store, preventing GC. This is a slow memory leak that worsens with interaction frequency.

**Confidence**: Likely

---

## Finding 8: `moduleCache` Not Cleared on Runtime Dispose

**Where**: `packages/flux-runtime/src/runtime-factory.ts:130, 473-512`

**What**: When `createRendererRuntime` creates its own module cache (line 130: `input.moduleCache ?? createModuleCache()`), the `dispose()` method (lines 473-512) never clears it. The `importStack` and `importManager` are disposed, but the `moduleCache` map persists with all loaded modules. Loaded modules may hold closures that reference scope objects from the runtime.

**Why it matters**: In applications that create/destroy runtimes (SPA route changes, HMR, dialog-based editing), the module cache retains modules with scope references from the destroyed runtime. Combined with Finding 7 (scope replacement without cleanup), this contributes to a pattern where disposed runtime resources are never fully reclaimed.

**Confidence**: Certain

---

## Finding 9: Formula Sources Always Write to Scope — No Value Deduplication, Amplifying Cascade Load

**Where**:

- Formula path: `packages/flux-runtime/src/async-data/formula-data-source-controller.ts:135-142` — always writes
- API path: `packages/flux-runtime/src/async-data/api-data-source-controller-state.ts:70-103` — skips unchanged writes via `structuralShareData`

**What**: API data sources use `structuralShareData` to skip no-op writes when the value hasn't changed. Formula data sources always call `writeDataToScope` regardless of whether the computed value changed. Since `scope.update()` always creates a new snapshot via `setIn()`, every formula write triggers Zustand subscriptions, which cascade through composite scope stores and trigger downstream source/reaction evaluations.

Combined with the absence of diamond dependency deduplication (fan-in sources refresh once per upstream change instead of batching), a diamond-shaped dependency graph with formula sources produces cascading no-op scope writes.

**Why it matters**: In schemas with derived values that frequently recompute to the same result (e.g., a `status` formula that stays "active" across many scope changes), the system performs unnecessary scope mutations, subscription notifications, and downstream re-evaluations. At 10x scale (dashboard with many computed indicators), this becomes measurable performance overhead.

**Confidence**: Certain

---

## Finding 10: No Pluralization in i18n — "1 conditions", "1 edges" in English

**Where**: `packages/flux-i18n/src/locales/en-US.ts` (lines 85, 306, 307, 431, 353)

**What**: The i18n system uses i18next but never leverages its pluralization features (suffix keys like `_one`/`_other`, `count` interpolation). All count-based strings are simple interpolation:

- `'{{count}} conditions'` → "1 conditions"
- `'{{count}} nodes'` → "1 nodes"
- `'{{count}} edges'` → "1 edges"
- `'{{count}} rows'` → "1 rows"

**Why it matters**: Produces grammatically incorrect strings in English. Adding languages with complex plural rules (Slavic: 3 forms; Arabic: 6 forms) requires refactoring every count key. This is a low-effort fix (add `_one`/`_other` suffix keys) that should be done before the first non-en/zh locale is added.

**Confidence**: Certain

---

## Finding 11: No RTL Support — Layout and Interaction Broken for Arabic/Hebrew

**Where**: System-wide

**What**: No `dir` attribute propagation through the renderer tree. No detection of RTL from configured language. No systematic reversal of left/right arrow key semantics in trees/tables. Left/right arrow handling in tree controls (`ArrowRight` = expand, `ArrowLeft` = collapse) is not reversed for RTL.

**Why it matters**: The entire UI is broken for RTL language users. Layout flows incorrectly, keyboard navigation is reversed, and interactive elements behave unpredictably. This is a prerequisite for any Arabic/Hebrew localization.

**Confidence**: Certain

---

## Finding 12: Tree and Table Keyboard Navigation Fundamentally Incomplete

**Where**:

- Tree: `packages/flux-renderers-data/src/tree-renderer.tsx:124-128`, `packages/flux-renderers-form-advanced/src/tree-control-controllers.ts:74-96`
- Table: `packages/flux-renderers-data/src/table-renderer/table-body-row-rendering.tsx:113-116`

**What**:

- **Tree**: Only supports ArrowLeft/ArrowRight (expand/collapse) and Enter/Space (select). Missing ArrowUp/ArrowDown (navigate between siblings), Home/End (first/last visible node), Asterisk (expand all siblings), and type-ahead (letter-key navigation). Per WAI-ARIA Tree View pattern, all of these are expected.
- **Table**: Interactive rows get `tabIndex={0}` but no ArrowUp/ArrowDown navigation. Users must Tab through every cell to reach a specific row.

**Why it matters**: Trees and tables with many items are completely unusable via keyboard. This is a WCAG 2.1 compliance issue (Level A for keyboard operability).

**Confidence**: Certain

---

## Finding 13: `onError` Dispatch Not Wrapped in try/catch (Unlike `onSettled`)

**Where**: `packages/flux-action-core/src/action-dispatcher/action-execution.ts:372-399` vs `:401-454`

**What**: The `onSettled` dispatch is wrapped in try/catch (lines 404-454) that captures errors as `settledError`. The `then` and `onError` dispatch calls are NOT wrapped in try/catch. This is an inconsistency — if an error occurs during `onError` dispatch coordination (not within individual action execution, which IS caught), it propagates as an unhandled rejection.

**Why it matters**: Combined with Finding 6 (onActionStart unprotected), this paints a picture of inconsistent error boundary coverage in the dispatch chain. Some paths are protected, others are not, with no clear design rationale for the difference.

**Confidence**: Certain
