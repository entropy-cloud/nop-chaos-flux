# Performance Diagnostics And E2E Measurement Design

## Purpose

本文档回答三个问题：

- `apps/playground` 的 performance test 页面现在到底测了什么
- 如何利用 `@nop-chaos/nop-debugger` 监控控件更新和局部刷新
- E2E 测试能不能做性能诊断，哪些指标可以作为回归门禁，哪些只能作为人工分析线索

本文档是性能诊断设计文档，不替代：

- `docs/architecture/performance-design-requirements.md` 的全局性能红线
- `docs/architecture/table-row-identity-and-scope-performance.md` 的 table row-scope 规则
- `docs/architecture/debugger-runtime.md` 的 debugger API 和事件模型
- `docs/testing/e2e-standards.md` 的 E2E 稳定性基线

## Short Answer

当前 `performance-table` 页面仍保留 React `Profiler` 的同环境对比测量，但现在也支持显式 diagnostics mode。它记录 `SchemaRenderer` 子树在 React commit 中的 `actualDuration`、commit 次数、批量 host mutation 的排队时间和静默等待时间，同时在 diagnostics mode 下暴露 table/array 的结构化 locality session summary。它不是跨机器 benchmark。

当前 `performance-table` 路由已经接入 playground 的 `debuggerController`，但仍保持普通模式 lightweight：只有在 `/?diagnostics=1#/performance-table` 下才会把 decorated `env`、debugger plugin、runtime/component-registry/action-scope callbacks、以及 page-local probes 接到 `SchemaRenderer`。因此 `window.__NOP_DEBUGGER_API__` 和 `window.__NOP_PERF_DIAGNOSTICS__` 现在都可以作为该页面 diagnostics mode 的自动化诊断入口，而普通 `#/performance-table` 仍不支付这些默认成本。

playground 顶层 `createNopDebugger({ capturePerformance: false })` 也明确关闭了高频 render 捕获。即使后续把 performance 页面接入 debugger，默认状态也不能直接通过 `window.__NOP_DEBUGGER_API__` 得到控件级 render 事件。

`nop-debugger` 已经适合作为结构化诊断入口：它有 automation API、node inspect、node diagnostics、event query、recent failures 和 expression explanation。controller 层还有 component tree 能力，但当前 window automation API 不直接暴露 `getComponentTree()`。现有 `render:start` / `render:end` 来自 renderer monitor 的 effect lifecycle，应该标注为 churn hints，而不是 React commit 级权威计数。

“array 中或 table 中单个 item 改变只应该局部刷新”不能用纯耗时断言证明。应使用确定性指标证明：变更的 owner scope 数、受影响 row/item key 数、row/item scope publish 数、render-probe 计数、remount 数、sibling 更新数、debugger failure/error 数。耗时只能作为同机同页的参考信号。

E2E 可以做性能诊断，但应做 count-based locality diagnostics 和 regression gates，不应做绝对耗时 benchmark。Playwright 可以读取已接线页面的 `window.__NOP_DEBUGGER_API__`、页面内 diagnostic probe、React Profiler 汇总和 DOM/MutationObserver 辅助数据；它不能可靠判断“本次 CI 比上次快 10ms”。

## Current Code Anchors

- `apps/playground/src/pages/performance-table-page.tsx`
- `apps/playground/src/pages/performance-table/schema.ts`
- `apps/playground/src/pages/performance-table/measurement.ts`
- `apps/playground/src/App.tsx`
- `tests/e2e/performance-table.spec.ts`
- `tests/e2e/exploratory/performance-table-deep-state.spec.ts`
- `packages/nop-debugger/src/types.ts`
- `packages/nop-debugger/src/controller.ts`
- `packages/nop-debugger/src/adapters.ts`
- `packages/nop-debugger/src/diagnostics.ts`
- `packages/flux-react/src/node-renderer-effects.ts`
- `packages/flux-react/src/use-node-debug-data.ts`
- `packages/flux-renderers-data/src/table-renderer/use-table-row-scope-cache.ts`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field.tsx`
- `packages/flux-renderers-form-advanced/src/composite-field/array-field-runtime.ts`

## Current Performance Page Behavior

### What The Page Measures

`PerformanceTablePage` renders one `SchemaRenderer` inside React `Profiler`:

```tsx
<Profiler id="performance-table-page" onRender={handleProfilerRender}>
  <SchemaRenderer ... />
</Profiler>
```

The live metrics are updated by `recordProfilerCommit()`:

| Metric                  | Meaning                                           | Current source      |
| ----------------------- | ------------------------------------------------- | ------------------- |
| `commitCount`           | React commits observed by the page-level Profiler | `Profiler.onRender` |
| `lastActualDuration`    | Latest Profiler `actualDuration`                  | `Profiler.onRender` |
| `averageActualDuration` | Average Profiler `actualDuration` across commits  | page state          |
| `maxActualDuration`     | Max Profiler `actualDuration` seen so far         | page state          |
| `totalActualDuration`   | Sum of Profiler `actualDuration`                  | page state          |
| `commitRevision`        | Internal revision used by quiescence wait         | page state          |

`Run 20 Host Mutations` performs repeated host-owned `setPerfRows()` updates through `requestAnimationFrame()` plus `startTransition()` and then waits for commit quiescence:

| Batch metric           | Meaning                                                           | Interpretation                                           |
| ---------------------- | ----------------------------------------------------------------- | -------------------------------------------------------- |
| `schedulingDurationMs` | Time spent scheduling the requested update turns                  | Includes queueing/scheduling, not pure render cost       |
| `quiescenceWaitMs`     | Time after scheduling until metrics stop changing for idle frames | Settling signal, not pure render cost                    |
| `totalDurationMs`      | Scheduling plus settle                                            | Same-page comparative signal only                        |
| `commitsDelta`         | Profiler commit count delta during the batch                      | Good same-page count metric                              |
| `totalCommitMs`        | Profiler actualDuration delta                                     | Best current page-local render-cost signal               |
| `avgCommitMs`          | `totalCommitMs / commitsDelta`                                    | Comparative only                                         |
| `maxCommitMs`          | Max commit duration observed after batch                          | Comparative only; current helper uses page aggregate max |

### Scenario Modes

The page exposes three modes:

| Mode                | What it stresses                                                                                           | What it does not prove                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `table-only`        | 1000 source rows through a paged visible table, mixed cell renderers, selection, pagination, expanded rows | Not a 1000-visible-row benchmark             |
| `scope-read-stress` | Table plus broad aggregate formulas and `scope-debug` full-scope serialization                             | Not representative of narrow row-local reads |
| `full-stress`       | Table plus aggregate formulas, nested loop cards, scope-owned table state, editable array/form subset      | Not an isolated table-only measurement       |

The page is designed for same-environment comparison. A valid manual workflow today is:

1. Open `#/performance-table`.
2. Keep `Table Only`, click `Reset Metrics`, then click `Run 20 Host Mutations`.
3. Record `commitsDelta`, `totalCommitMs`, `avgCommitMs`, and `maxCommitMs`.
4. Switch to `Scope Read Stress`, reset, run the same batch, compare the delta to `Table Only`.
5. Switch to `Full Stress`, reset, run the same batch, compare the delta to both smaller scenarios.
6. Treat `Scheduling + settle` as interaction-level timing, not render-only timing.

### Existing E2E Coverage

`tests/e2e/performance-table.spec.ts` 当前已覆盖：

- the page enters cleanly with zero tracked `console.error` / `pageerror`
- scenario mode switching shows the expected stress blocks
- `Run 20 Host Mutations` eventually produces a measurement panel
- supported cell types render correct row-bound values across pagination
- the covered tag-list interaction does not surface a global validation error
- supported table single-row locality diagnostics gate
- supported array item visible locality diagnostics gate

`tests/e2e/exploratory/performance-table-deep-state.spec.ts` 仍额外检查 scope-owned selection、pagination、sorting、row action behavior、以及 debugger failure cleanliness。supported locality gates 已经迁入 `tests/e2e/performance-table.spec.ts`，所以 exploratory spec 现在是补充性的 deep-state surface，而不是 locality 真相来源。

These tests are correctness and stability tests with diagnostic value, and the supported locality scenarios now also act as local-refresh regression gates for changed-row keys, probe deltas, and unchanged-row unmount stability.

## Current `nop-debugger` Capability Boundary

### Existing Useful APIs

Automation should use `window.__NOP_DEBUGGER_API__` or `getNopDebuggerAutomationApi()` instead of scraping the panel DOM.

This section describes the debugger package's current capability surface. It applies to pages that are actually wired to the controller through decorated `env`, plugins, and root lifecycle callbacks. `performance-table` diagnostics mode now follows that integration path.

Useful existing methods include:

- `getSnapshot()`
- `getOverview()`
- `queryEvents()`
- `getNodeDiagnostics()`
- `inspectByCid()`
- `inspectByElement()`
- `evaluateNodeExpression()`
- `explainNodeValue()`
- `explainNodeMeta()`
- `explainNodeFailure()`
- `getRecentFailures()`
- `getLatestError()`

Useful existing inspect data includes:

- `cid`
- `nodeId`
- `path`
- `rendererType`
- `instancePath`
- `scopeData`
- `scopeChain`
- `metaSummary`
- `propsSummary`
- `debugData.nodeState.*DependencyPaths`
- `debugData.sourceHints`

This is already enough to answer many “这个节点当前为什么是这个值/状态” questions and to assert that a scenario has no structured debugger failures.

`NopDebuggerController.getComponentTree()` exists on the controller surface. It is not currently part of `NopDebuggerAutomationApi`, so browser automation that only has `window.__NOP_DEBUGGER_API__` should use `inspectByCid()` / `inspectByElement()` or a future explicit automation method rather than assuming component-tree access.

### Render Events Are Currently Hints

`nop-debugger` can append `render:start` and `render:end` when `capturePerformance` is enabled. The events come from `RendererEnv.monitor`, and the React side calls the monitor from `useRenderMonitor()`.

Important limitation:

- `useRenderMonitor()` is effect-based, so the event pair tracks mounted visible node lifecycle/update effect turns, not exact React render function invocation counts
- `render:end` is emitted from effect cleanup, so it may be delayed until dependencies change or the node unmounts; it is not guaranteed to appear immediately after the corresponding commit
- `durationMs` is measured with `Date.now()` around effect start and cleanup, not the React Profiler `actualDuration`
- `getOverview().renderCommitCount`, `renderBurstCount`, `renderUniqueNodeCount`, and `getNodeDiagnostics().renderCommitCount` are useful churn hints, but they are not authoritative benchmark counters

This matches `docs/architecture/debugger-runtime.md`, which already says render/update diagnostics are hint-only unless a narrower measurement surface proves a stronger contract.

### Playground Currently Disables Debugger Render Capture

`apps/playground/src/App.tsx` creates the main controller with:

```ts
const debuggerController = createNopDebugger({
  id: 'playground-main',
  capturePerformance: false,
});
```

For pages that are wired to this controller, the default playground debugger can still expose actions, APIs, inspect data, errors, and failures, but it intentionally does not append high-frequency render events. `performance-table` diagnostics mode now uses this controller wiring while still keeping `capturePerformance: false`; render/remount locality authority comes from page-local probes, not high-frequency debugger render capture.

This is correct for ordinary playground use. Performance capture must remain host-controlled because enabling it for every node on every page would itself become a performance cost.

## What “Local Refresh” Means

Local refresh is not one thing. It is a stack of related but distinct effects.

| Layer              | Meaning                                         | Should be measured how                              |
| ------------------ | ----------------------------------------------- | --------------------------------------------------- |
| data change        | Which logical row/item value changed            | host mutation payload or owner write path           |
| scope publish      | Which scope published which changed paths       | scope/debug event or owner instrumentation          |
| subscriber wake-up | Which subscriptions were notified               | low-level diagnostic instrumentation only           |
| render evaluation  | Which React components or schema nodes rendered | render probes or React Profiler subtree counters    |
| commit             | What React committed                            | React Profiler and optional DOM observation         |
| remount            | Which logical row/item lost continuity          | `instancePath`, `cid`, mount/unmount probe counters |
| DOM mutation       | Which DOM nodes changed                         | MutationObserver as a noisy supplement              |

The product claim “single item change only does local refresh” should be translated into explicit invariants at these layers. A timing improvement without locality invariants is not enough proof.

## Table Locality Baseline

`table` is the strongest current locality baseline.

Current architecture requires:

- stable, non-null, non-empty `rowKey`
- no duplicate `rowKey` values in the diagnostic dataset; duplicate-key diagnostics must fail the locality gate rather than being treated as a valid locality proof
- no index-derived row identity for performance-sensitive locality gates
- one isolated row scope per materialized row
- row scope cache keyed by owner-qualified table identity and `rowKey`
- `RendererRuntime.runtimeId` included where remounted runtimes can reuse stable page/root ids
- row-scope publication only when row-local roots change
- unchanged rows should not republish just because the parent array reference changed
- row-local descendants should read `$slot.record` / row-local roots, not broad parent scope snapshots

For one immutable row update in a table:

| Invariant                  | Expected result                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Changed row keys           | exactly the target `rowKey`                                                                                                                                  |
| Row scope publish          | target row publishes `record`; `index` only if position changes                                                                                              |
| Sibling row scope publish  | zero                                                                                                                                                         |
| Row scope remount          | zero for unchanged materialized rows                                                                                                                         |
| Changed row remount        | normally zero; update should not require remount                                                                                                             |
| Table shell render         | allowed, because collection owner may reconcile                                                                                                              |
| Sibling row subtree render | zero for unrelated siblings; exceptions must be limited to documented features that intentionally change sibling-visible data such as `index` or `viewIndex` |
| Debugger failures/errors   | zero                                                                                                                                                         |

Row-root invalidation is the current supported minimum. The table does not need to publish `record.name` as a distinct field-level change to satisfy the baseline. Finer row-field publication is a future optimization.

## Array Field Locality Baseline

`array-field` currently has a weaker locality proof surface than `table`.

Current implementation facts:

- object items can use `itemKey`, with fallback identity for compatibility
- scalar items expose the `value` alias and currently use implementation-local compatibility keys for React item continuity; this is not yet an architecture-level scalar identity contract
- each item creates a projected scope with `value`, `index`, and `readOnly`
- each item can create a projected form proxy that maps relative item paths back to the parent form path
- validation and writeback remain parent-owner and index-addressed

Current limitation:

- item projected scope store is built on top of the parent scope store
- parent store changes can wake item projected stores even when selector equality prevents visible rerender
- this means current E2E can prove output correctness, item identity, and absence of visible sibling rerenders if probes are added, but it cannot honestly prove O(1) internal subscriber wake-up without extra instrumentation or implementation changes

Target array-field locality should mirror table where the editing semantics need it:

| Target invariant           | Expected result                                                                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Changed item keys          | exactly the target object `itemKey`; scalar-item identity gates require a separately documented scalar identity contract                                  |
| Item scope publish         | target item publishes `value` or a documented item-local root                                                                                             |
| Sibling item scope publish | zero                                                                                                                                                      |
| Item remount               | zero for unchanged keyed items                                                                                                                            |
| Parent array owner update  | allowed, because parent value path remains index-addressed                                                                                                |
| Sibling field rerender     | zero when the sibling field reads only its own item path                                                                                                  |
| Validation remap           | remains index-addressed and correct after add/remove; reorder diagnostics are future/sortable-gated because `sortable` is not a landed default capability |

If this stricter target becomes required, `array-field` needs either keyed item-scope reconciliation or exact path-based projection subscriptions rather than forwarding every parent store update to every item projected scope.

## Metrics To Track

### Existing Metrics That Can Be Used Now

| Metric                         | Source                                                                      | Use                                                        |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Profiler `commitCount`         | `PerformanceTablePage`                                                      | Same-page commit count comparison                          |
| Profiler `totalActualDuration` | `PerformanceTablePage`                                                      | Same-page render-cost comparison                           |
| Batch `schedulingDurationMs`   | `PerformanceTablePage`                                                      | Interaction-level queueing signal                          |
| Batch `quiescenceWaitMs`       | `PerformanceTablePage`                                                      | Settling signal                                            |
| Debugger recent failures       | `window.__NOP_DEBUGGER_API__.getRecentFailures()` on wired pages            | Hard correctness gate for pages attached to the controller |
| Debugger latest errors         | `getLatestError()` / `queryEvents({ kind: 'error' })` on wired pages        | Hard correctness gate for pages attached to the controller |
| Node inspect dependency paths  | `inspectByCid()` debug data on wired pages                                  | Explains broad vs narrow dependency reads                  |
| Mounted identity probes        | `inspectByCid()` / `inspectByElement()` or target component-tree automation | Detects gross remount or missing-node behavior             |

### Metrics Needed For Authoritative Locality Proofs

| Metric                                            | Proposed source                                                                      | Gate example                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `scopePublishCountByScopeId`                      | gated scope/debug instrumentation                                                    | target row/item scope publishes once                     |
| `scopePublishPathsByScopeId`                      | gated scope/debug instrumentation                                                    | table row publishes `record`, not whole collection       |
| `affectedRowKeys` / `affectedItemKeys`            | collection owner diagnostic event                                                    | exactly one key for single-item update                   |
| `renderCountByProbeKey`                           | diagnostic probe renderer                                                            | target row/item changed, siblings unchanged              |
| `mountCountByProbeKey` / `unmountCountByProbeKey` | diagnostic probe renderer                                                            | no remount for unchanged keys                            |
| `cidByInstancePath` before/after                  | `inspectByCid()` / `inspectByElement()` or future explicit component-tree automation | stable mounted identity for unchanged materialized nodes |
| `subscriberWakeupCount`                           | temporary low-level instrumentation                                                  | optional, used only when optimizing subscription fanout  |
| DOM mutation summary                              | optional MutationObserver                                                            | secondary sanity check, not primary proof                |

Current form-store diagnostics baseline:

- runtime-owned form-store diagnostics now provide an explicitly gated bounded session surface for `commitCount`, `changedPaths`, `changedKinds`, and `droppedCommitCount`
- focused tests and future diagnostics pages should prefer that runtime-owned surface over ad-hoc store subscriptions when they need normalized commit truth
- debugger integration is wired through the runtime-owned `FormStoreDiagnosticsBridge` exposed by `RendererRuntime.getFormStoreDiagnosticsBridge()`; the runtime diagnostics contract itself is owned by `docs/architecture/form-store-diagnostics.md`

### Metrics That Should Not Be Hard Gates

| Metric                               | Reason                                              |
| ------------------------------------ | --------------------------------------------------- |
| absolute `totalDurationMs`           | CI/browser scheduling noise                         |
| absolute `actualDuration` thresholds | React/dev/prod/CPU variance                         |
| browser long task count alone        | useful signal, not a Flux locality proof            |
| screenshot visual diffs              | not suitable for performance diagnosis in this repo |
| debugger panel DOM contents          | automation API is the supported surface             |

## Debugger Integration Design

### Design Principle

`nop-debugger` should aggregate bounded diagnostics. It should not silently turn every renderer into a high-frequency tracing source in ordinary playground usage.

Performance diagnostics must be:

- host-controlled
- explicitly enabled
- bounded by event caps
- grouped by interaction/session id
- queryable through automation APIs
- honest about which counters are authoritative and which are hints

### Diagnostic Session Model

Target session shape:

```ts
interface PerformanceDiagnosticSession {
  id: string;
  scenario: string;
  startedAt: number;
  endedAt?: number;
  capture: {
    profiler: boolean;
    debuggerRenderHints: boolean;
    scopePublish: boolean;
    collectionReconcile: boolean;
    renderProbes: boolean;
  };
}
```

Each user action such as “mutate one table row” or “edit one array item” should run under one session id. E2E should query only events/counters for that session id.

### Existing Debugger Events

The debugger-wide event stream should continue to support the full event model from `docs/architecture/debugger-runtime.md`, including compile, render, action, API, notify, error, and snapshot events. The perf-diagnostics subset most relevant to this document is:

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

For performance diagnostics, existing `render:*` events remain `debuggerRenderHints`. They should not be renamed into benchmark counters.

### Proposed Bounded Diagnostic Events

Future implementation can extend `NopDebugEventKind` or add a generic diagnostic event domain with these bounded payloads:

| Event                  | Payload summary                                                       | Purpose                                  |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------- |
| `perf:session:start`   | session id, scenario, mode                                            | bracket one diagnostic run               |
| `perf:session:end`     | session id, summary counters                                          | stable E2E wait target                   |
| `scope:publish`        | scope id, owner kind, paths, source scope id, reason                  | prove row/item-local publication         |
| `collection:reconcile` | owner id, changed keys, created keys, disposed keys, republished keys | prove collection-to-row/item translation |
| `component:probe`      | probe key, phase, render count, mount count, unmount count            | prove render/remount locality            |

Rules:

- all payloads must be shallow and capped
- no raw deep scope snapshots in high-frequency events
- events must be disabled unless the host enables performance diagnostics
- session summaries may keep aggregate counts even if individual events are sampled
- ordinary debugger enabled mode must not imply `scope:publish` or `component:probe` capture

### Playground Probe Design

The performance page should add a diagnostic mode rather than overloading the current human-facing metrics.

The live page now accepts the playground `debuggerController` and wires `SchemaRenderer` consistently with other debugger-enabled pages. The root callbacks are `SchemaRenderer` props; their job is to call the canonical controller methods documented in `debugger-runtime.md`:

- pass a decorated `env` returned by `debuggerController.decorateEnv(env)`
- pass `plugins={[debuggerController.plugin]}`
- forward `onRuntimeChange` to `debuggerController.setRuntime()`
- forward `onComponentRegistryChange` to `debuggerController.setComponentRegistry()`
- forward `onActionScopeChange` to `debuggerController.setActionScope()`
- forward `onActionError` to `debuggerController.onActionError()`
- decide whether a diagnostic run temporarily enables render capture or uses a separate page-local probe path while keeping ordinary page load cheap

Live page additions:

- diagnostics URL gate via `/?diagnostics=1#/performance-table`
- `Run Single Row Locality Diagnostic` control with deterministic visible target row `user-25`
- `Run Array Item Locality Diagnostic` control in a diagnostics-only object-array scenario
- page-local `window.__NOP_PERF_DIAGNOSTICS__` only when diagnostics are enabled
- debugger-backed coverage evidence plus page-local probe/session summary

Target diagnostic renderer:

```ts
interface PerfProbeEvent {
  sessionId?: string;
  probeKey: string;
  kind: 'render' | 'mount' | 'unmount';
  instancePath?: readonly unknown[];
  cid?: number;
}
```

The probe renderer should be used only inside diagnostics scenarios. It provides authoritative render/mount counters for the selected row/item subtree without forcing every production renderer to emit high-frequency events.

### Table Diagnostic Flow

For a single-row update:

1. Baseline current diagnostic counters.
2. Mutate exactly one row by immutable replacement while preserving sibling row object references.
3. Wait for page-local quiescence and `perf:session:end`.
4. Assert collection reconcile summary reports one changed `rowKey`.
5. Assert row-scope publish summary reports only the target row scope.
6. Assert target probe render count is greater than zero.
7. Assert sibling probe render counts are zero for representative visible siblings.
8. Assert mount/unmount delta is zero for unchanged rows.
9. Assert debugger failures/errors are zero.

### Array Field Diagnostic Flow

For a single object item update:

1. Use a deterministic `itemKey` field.
2. Baseline counters for at least three visible item probes: previous sibling, target, next sibling.
3. Update one nested field such as `lineItems.7.qty` through the supported form path.
4. Wait for field value to reflect the update.
5. Assert target item probe render count changes.
6. Assert sibling item probe render counts remain zero or within a documented exception.
7. Assert target item identity remains stable.
8. Assert validation state remains attached to the correct index-addressed field path.
9. If internal item-scope instrumentation is enabled, assert sibling item scope publish count is zero.

Until array-field gets a stronger item-scope publication substrate, E2E should phrase this as visible render/remount locality, not as a full O(1) subscriber-wakeup proof.

## E2E Performance Diagnostics

### What E2E Can Reliably Do

Playwright can reliably perform deterministic diagnostics when the scenario exposes structured counters:

- import `test`, `expect`, and `assertTrackedPageErrors` from `tests/e2e/fixtures.ts`
- use the fixture-managed `page`, not an untracked extra page, for supported diagnostics
- enter the page and enforce zero `console.error` / `pageerror`
- call `assertTrackedPageErrors(page)` only after the page-specific ready signal is visible
- prefer session-id or timestamp-filtered debugger queries over global debugger-state mutation
- trigger deterministic mutations
- wait for a stable UI or diagnostic session end marker
- read `window.__NOP_DEBUGGER_API__` when the scenario is wired to the debugger controller
- read page-local diagnostic counters with `page.evaluate()`
- assert count-based invariants
- attach diagnostic JSON to test artifacts for later inspection

### What E2E Should Not Claim

E2E should not claim:

- “this table renders under 20ms on every machine”
- “this commit was faster than last week by 15%”
- “no sibling React function ever ran” unless a probe is installed at the exact boundary being claimed
- “debugger render count equals React commit count”
- “DOM mutation count equals renderer update count”

E2E timeouts are allowed as liveness guards. They are not performance budgets.

### Target Playwright Pattern

The following pattern is now the supported baseline. The router still does not parse `#/performance-table?diagnostics=1`, so diagnostics mode uses query-before-hash: `/?diagnostics=1#/performance-table`.

```ts
await page.goto('/?diagnostics=1#/performance-table', { waitUntil: 'commit' });
await expect(page.getByRole('heading', { name: 'Table Performance Playground' })).toBeVisible();
await assertTrackedPageErrors(page);

await page.evaluate(() => {
  window.__NOP_PERF_DIAGNOSTICS__?.clear();
});

await page.getByRole('button', { name: 'Run Single Row Locality Diagnostic' }).click();

await expect
  .poll(() => page.evaluate(() => window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession()?.status))
  .toBe('completed');

const report = await page.evaluate(() => ({
  perf: window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession(),
  debuggerFailures: window.__NOP_DEBUGGER_API__?.getRecentFailures({
    sinceTimestamp: window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession()?.startedAt,
    limit: 10,
  }),
  debuggerErrors: window.__NOP_DEBUGGER_API__?.queryEvents({
    kind: 'error',
    interactionId: window.__NOP_PERF_DIAGNOSTICS__?.getLatestSession()?.id,
  }),
}));

expect(report.debuggerFailures).toHaveLength(0);
expect(report.debuggerErrors).toHaveLength(0);
expect(report.perf.changedRowKeys).toEqual(['user-25']);
expect(report.perf.siblingProbeDelta.render).toBe(0);
expect(report.perf.unchangedRowUnmountDelta).toBe(0);
```

The important rule is that E2E reads structured diagnostic data, not screenshots or debugger panel DOM.

## Test Tiering

| Tier             | Tool                                            | What it should prove                                                                        |
| ---------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Unit             | Vitest                                          | row/item key resolution, row-scope cache reconciliation, measurement summarization          |
| React component  | happy-dom / Testing Library                     | local render probes, StrictMode remount behavior, zero console errors for focused scenarios |
| E2E diagnostics  | Playwright                                      | browser integration, debugger API availability, count-based locality invariants             |
| Manual profiling | browser DevTools / React Profiler               | exploratory timing and flamegraph investigation                                             |
| Benchmark        | separate production benchmark harness if needed | cross-run timing claims under controlled environment                                        |

Most regressions should be caught before E2E. E2E is the integration proof that the browser, runtime, debugger API, and page probes agree.

## Implementation Roadmap

### Phase 1: Document The Contract

Status: this document.

Deliverables:

- clarify current performance page metrics
- clarify debugger capability boundary
- define local-refresh metric vocabulary
- define E2E feasibility boundary

### Phase 2: Add Page-Local Diagnostic Harness

Deliverables:

- gated diagnostics mode on `performance-table` via `/?diagnostics=1#/performance-table`
- debugger-controller wiring for the performance page, or an explicitly documented page-local-only diagnostic path
- page-local `window.__NOP_PERF_DIAGNOSTICS__`
- deterministic single-row mutation action
- render/mount probe renderer for selected visible rows
- summary UI that separates commit metrics from locality counters

Exit criteria:

- manual user can run a single-row locality diagnostic and see changed key, sibling render delta, remount delta, commit delta, and debugger failure count

### Phase 3: Add Debugger Diagnostic Event Support

Deliverables:

- bounded diagnostic session events
- optional scope publish capture
- optional collection reconcile capture from table owner
- automation API query examples
- decide whether component-tree access should be exposed through `NopDebuggerAutomationApi` or remain controller-only
- event caps and payload caps documented in `debugger-runtime.md`

Exit criteria:

- diagnostics can be queried by session id without panel DOM scraping
- ordinary playground usage still avoids high-frequency capture by default

### Phase 4: Gate Table Locality

Deliverables:

- focused unit tests for row-scope publication summaries
- React-level probe tests for single-row update locality
- Playwright diagnostic spec for single-row table locality

Exit criteria:

- one-row immutable update proves target row update, sibling probe delta zero, unchanged row remount zero, debugger failures zero

### Phase 5: Gate Array Item Locality

Deliverables:

- decide whether current projected scope implementation is sufficient for the desired claim
- if O(1) item subscriber wake-up is required, implement keyed item-scope reconciliation or exact path subscriptions
- add object item and scalar item diagnostic scenarios
- add Playwright diagnostic spec for visible item update locality

Exit criteria:

- array-field documentation can honestly claim either visible render/remount locality or stronger item-scope publish locality, backed by diagnostics

### Phase 6: Optional Benchmark Harness

Deliverables only if cross-run timing claims become necessary:

- production build based harness
- controlled browser launch options
- repeated warm-up and sample collection
- percentile reporting
- environment metadata capture

This phase should stay separate from supported E2E regression tests.

## Acceptance Checklist

A performance locality claim is acceptable only when all relevant items are true:

- the scenario defines the exact mutation payload
- the scenario states whether it measures table, array-field, or generic collection behavior
- row/item identity is stable and visible in the report
- expected affected row/item keys are explicit
- sibling render/remount expectations are explicit
- debugger failures/errors are asserted as zero
- timing metrics are labeled as comparative signals unless a benchmark harness owns them
- E2E reads structured diagnostics through automation APIs or page-local counters
- `nop-debugger` high-frequency capture is explicitly enabled and bounded
- current implementation gaps are documented instead of hidden behind weak timing claims

## Related Documents

- `docs/architecture/performance-design-requirements.md`
- `docs/architecture/debugger-runtime.md`
- `docs/architecture/playground-experience.md`
- `docs/architecture/table-row-identity-and-scope-performance.md`
- `docs/architecture/dependency-tracking.md`
- `docs/architecture/array-field.md`
- `docs/testing/e2e-standards.md`
