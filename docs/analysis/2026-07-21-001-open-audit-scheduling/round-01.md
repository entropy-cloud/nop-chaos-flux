> Audit Status: open
> Audit Type: open-ended (Round 1)
> Mission: scheduling
> Date: 2026-07-21
> Source perspective: Contract archaeologist + lifecycle tracker + React Compiler enforcer

## Pre-check: Previously Reported Issues Status

Verified the current HEAD against all 38 findings from the prior audit execution (`docs/analysis/2026-07-20-2157-open-audit-scheduling/` rounds 1-4) and the 14-dimension multi-audit (`docs/audits/2026-07-20-2157-multi-audit-scheduling.md`).

| Fixed | Previous ID | Issue                                                     | Evidence                                                                                            |
| ----- | ----------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| ✓     | F-31        | Revision not bumped on parse/setZoom/recalcLayout         | `gantt-store.ts:170-173,265-268` — now correctly bumps `revision` + `taskRevision`/`layoutRevision` |
| ✓     | F-32        | EventEmitter dead code (8 events, 0 subscribers)          | EventEmitter pattern removed from `gantt-store.ts` entirely                                         |
| ✓     | F-33        | `document.getElementById()` hardcoded IDs                 | `gantt-editor.tsx:63-79` — now uses `useId()` + `${instanceId}-` prefix                             |
| ✓     | F-34        | calendar-print.css never imported                         | `calendar.tsx:17` — now imports `./utils/calendar-print.css`                                        |
| ✓     | F-35        | onEventCreate + onEventChange double fire                 | `calendar.tsx:126-127` — only `onEventCreate` fired; comment confirms sole creation channel         |
| ✓     | F-38        | Coverage thresholds declared but not enforced             | `package.json:58` — test script now includes `--coverage` flag                                      |
| △     | F-36        | Lifecycle test has zero assertions                        | `calendar.test.tsx:118-125` — still has zero assertions (see F-43 below)                            |
| ✗     | 03-01       | Deprecated GanttTask/GanttLink still exported             | `src/index.ts:6-7` — unchanged                                                                      |
| ✗     | 04-01       | BarcodeInput dual-state (inputValue not synced from form) | `barcode-input-renderer.tsx:16-22` — unchanged                                                      |
| ✗     | 02-03       | Empty scheduling-utils/ directory                         | Still contains zero files                                                                           |

12 of 26 actionable findings resolved. The remaining 14 are either lower-priority or not yet addressed.

---

## F-39: Gantt `AddLinkCommand.redo()` creates orphan link — undo/redo identity broken

**Location**: `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:89-104`

**What**: After `undo()` removes the originally-created link, `redo()` (line 100-103) calls `store.addLink()` which generates a _new_ link with a _new_ ID (via `Date.now()` in gantt-store.ts:487). But `this.linkId` still holds the old link ID from the first `execute()`. A subsequent `undo()` calls `removeLink(this.linkId)` with the stale ID, targeting a link that was already deleted. The redo-created link becomes an orphan — invisible to undo/redo.

```typescript
// undo-stack.ts:89-104
execute(): void {
  const link = this.store.addLink(this.source, this.target, this.linkType);
  this.linkId = link.id;     // stores ID = "link_src_tgt_1742000000000"
}

undo(): void {
  if (this.linkId != null) {
    this.store.removeLink(this.linkId);  // removes link by stored ID — correct
  }
}

redo(): void {
  if (this.linkId != null) {
    this.store.addLink(this.source, this.target, this.linkType);
    // creates NEW link with ID = "link_src_tgt_1742000000001"
    // but this.linkId is never updated — still "link_src_tgt_1742000000000"
  }
}
```

**Concrete impact**: User adds a link, undoes it (link disappears), redoes it (link appears), then undoes again. The second undo silently fails: it tries to remove a link ID that no longer exists. The redo-created link persists as an orphan. The user sees an undo failure with no error indication.

**Compare with `RemoveLinkCommand`**: The `RemoveLinkCommand.redo()` (line 136-138) correctly refers to `this.linkId` which was stored from the store at construction time — it works because `removeLink` doesn't generate new IDs. But `AddLinkCommand` stores an ID on `execute()` and then naively re-uses it on `redo()` without considering that `redo()` re-executes the creation.

**Fix**: `AddLinkCommand.redo()` must update `this.linkId` with the result of `store.addLink()`:

```typescript
redo(): void {
  if (this.linkId != null) {
    const link = this.store.addLink(this.source, this.target, this.linkType);
    this.linkId = link.id; // ← missing line
  }
}
```

**Confidence**: Certain

---

## F-40: Gantt `UpdateTaskCommand` bypasses type safety via `as any` on core execution path

**Location**: `packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:28,32,36`

**What**: Three `as any` casts in the command execution path:

```typescript
execute(): void {
  this.store.updateTask(this.taskId, this.after as any);
}

undo(): void {
  this.store.updateTask(this.taskId, this.before as any);
}

redo(): void {
  this.store.updateTask(this.taskId, this.after as any);
}
```

`before` and `after` are typed as `Record<string, unknown>`. `updateTask` expects `Partial<GanttTaskData>`. The cast silences the type mismatch entirely — any property (including misspelled or non-existent ones) passes through unchecked.

**Why care**: This is the undo/redo core execution path. If a command stores invalid fields (typo, wrong shape), the cast silently passes them to `updateTask`, which does `Object.assign(task, partial)` — corrupting task data silently. The `merge()` method (line 43-46) creates new commands by combining `this.before` with `other.after`, which doubles the risk of propagating bad data.

**Contrast with `AddLinkCommand`**: That command uses concrete types (`GanttId`, `GanttLinkType`) with zero casts — demonstrating that command typing without `any` is achievable.

**Fix**: Type `before` and `after` as `Partial<GanttTaskData>` instead of `Record<string, unknown>`.

**Confidence**: Certain

---

## F-41: Kanban `filterText` prop is one-time initializer, not reactive to schema changes

**Location**: `packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts:10`

**What**: The Kanban filter hook uses `filterText` only for initial state initialization:

```typescript
const [localText, setLocalText] = useState(externalFilterText ?? '');
```

When the parent schema updates `resolved.filterText`, the `externalFilterText` parameter changes but `localText` never syncs. The Calendar renderer handles the same pattern correctly — it uses `useEffect` with ref-based comparison to sync `resolved.date` and `resolved.view` into internal state (calendar.tsx:274-296).

**Why care**: The scheduling-renderer-definitions.ts declares `filterText` as `kind: 'prop'` (line 83), meaning it should be a reactive schema-driven value. But the runtime treats it as a one-time initializer. If a parent component or action programmatically updates `filterText`, the Kanban filter ignores the update. This is a contract drift between schema declaration and runtime behavior.

**Severity**: P2 — predictable behavior for controlled-mode consumers is broken.

**Fix**: Add a `useEffect` that syncs `externalFilterText` to `localText` when it changes:

```typescript
const prevFilterTextRef = useRef(externalFilterText);
useEffect(() => {
  if (externalFilterText !== prevFilterTextRef.current) {
    prevFilterTextRef.current = externalFilterText;
    setLocalText(externalFilterText ?? '');
  }
}, [externalFilterText]);
```

**Confidence**: Certain

---

## F-42: Calendar `useCalendarState` offers dual controlled-mode surfaces — hook dead code path

**Location**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-state.ts:12-13` vs `calendar.tsx:246-256,274-296`

**What**: The `useCalendarState` hook exposes `controlledDate` and `controlledView` parameters (lines 12-13) and correctly implements the fallback pattern (lines 38-39):

```typescript
const currentDate = controlledDate ?? internalDate;
const activeView = controlledView ?? internalView;
```

But the Calendar component never passes these parameters (calendar.tsx:246-256):

```typescript
const { currentDate, dateRange, setCurrentDate, setActiveView } = useCalendarState({
  initialDate,
  initialView: activeView,
  firstDayOfWeek,
  onDateChange: ...,
  onViewChange: ...,
  // No controlledDate, no controlledView — even though schema declares dateOwnership/viewOwnership
});
```

Instead, the Calendar implements its OWN controlled-mode sync via refs + effects (calendar.tsx:274-296):

```typescript
useEffect(() => {
  const dateStr = resolved.date as string | undefined;
  if (dateStr && dateStr !== prevDateRef.current) {
    prevDateRef.current = dateStr;
    const parsed = parseISODate(dateStr);
    if (parsed && parsed.getTime() !== currentDateRef.current.getTime()) {
      setCurrentDate(parsed);
    }
  }
}, [resolved.date, setCurrentDate]);
```

This means there are TWO controlled-mode code paths that both go unused:

1. The hook's `controlledDate`/`controlledView` — dead code in the hook interface
2. The component's ref+effect sync — actually used, but reinventing what the hook already provides

**Why care**: Design inconsistency creates maintenance risk. A future developer might:

- Start using `controlledDate`/`controlledView` expecting them to work (they would be ignored by the Calendar component)
- Try to remove what looks like "duplicate" sync code in the Calendar component (breaking controlled mode)
- Add a new controlled-state hook that competes with the existing patterns

**Severity**: P2 — no current functional impact, but the dead interface surface and redundant implementation increase maintenance surface area.

**Fix**: Either:

- Pass `controlledDate={...}` and `controlledView={...}` to `useCalendarState` and remove the effect-based sync in calendar.tsx, OR
- Remove `controlledDate`/`controlledView` from `useCalendarState`'s interface since the component handles controlled mode differently

**Confidence**: Certain

---

## F-43: Calendar print CSS import test is a false-positive no-op assertion

**Location**: `packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx:140`

**What**: The test for calendar-print.css loading wraps an async import in a synchronous throw expectation:

```typescript
expect(() => import('./utils/calendar-print.css')).not.toThrow();
```

`import()` is a Promise-returning function. It NEVER throws synchronously — it returns a Promise that may reject asynchronously. The `expect(() => fn).not.toThrow()` pattern only catches synchronous throws. This test passes trivially regardless of whether:

- The CSS file exists
- The CSS file is loadable
- The CSS file has correct syntax
- The test runner supports CSS imports

**Why care**: This is a false-positive test that creates the illusion of coverage. The scheduling package's test suite includes this test, and it always passes. Combined with vitest's `--passWithNoTests` flag, there's no automated guardrail against a broken CSS import.

**Severity**: P2 — no functional impact, but erodes trust in test coverage data.

**Fix**: Either remove the test (it adds no value) or use a real integration test that verifies CSS loading at the E2E level. For unit tests, CSS import testing is better handled by build-time checks.

**Confidence**: Certain

---

## F-44: Widespread `useCallback`/`useMemo` redundant with React Compiler

**Location**: Across gantt/, calendar/, kanban/ — 30+ useCallback and 15+ useMemo wrappers.

**What**: The scheduling package uses `useCallback` and `useMemo` extensively — over 45 instances across ~68 source files. The project's React 19 baseline (AGENTS.md, docs/skills/react19-best-practices-review.md) explicitly states:

- "React Compiler automatically handles memoization"
- "Do **not** add `useCallback` or `useMemo` by default"
- "Hand-written memoization is redundant unless accompanied by `eslint-disable-next-line react-compiler/react-compiler`"

Only ONE file in the entire scheduling package has an `eslint-disable react-compiler` annotation (`use-barcode-camera.ts:69` with a legitimate reason). The remaining 45+ `useCallback`/`useMemo` instances have no such annotation.

Representative examples of clearly redundant wrappers:

```typescript
// calendar.tsx:106 — empty deps, only calls setConfirmDialog(null)
const cancelSwap = useCallback(() => {
  setConfirmDialog(null);
}, []);

// calendar.tsx:53-54 — trivial fallback creation
const eventsData = useMemo(
  () => (resolved.events as CalendarSchema['events']) ?? [],
  [resolved.events],
);
```

**Why care**: This violates the project's explicit React 19 coding conventions. While functionally harmless (React Compiler treats redundant wrappers as identity-stable no-ops), it:

1. Contradicts the project's published coding standards
2. Creates confusion about when hand-written memo is intentional vs. cargo-culted
3. Misleads future developers into believing this pattern is required

**Severity**: P3 — no runtime correctness impact, but a convention enforcement gap.

**Fix**: The project should either:

- Enforce removal via lint rule (preferable)
- Or accept the inconsistency and update AGENTS.md to allow hand-written memo

**Confidence**: Certain

---

## F-45: Deprecated `GanttTask`/`GanttLink` types still exported from public API surface

**Location**: `packages/flux-renderers-scheduling/src/index.ts:6-7`
**Also**: `packages/flux-renderers-scheduling/src/schemas.ts:4-26`

**What**: Two deprecated type aliases are re-exported from the package's public barrel:

```typescript
// src/index.ts:6-7
export type {
  GanttTask,    // @deprecated — use from ./gantt/gantt.types.js
  GanttLink,    // @deprecated — use from ./gantt/gantt.types.js
  ...
} from './schemas.js';
```

The JSDoc on the source types (schemas.ts:4,19) tells consumers to use the types from `./gantt/gantt.types.js`, but those types (`GanttTaskData`, `GanttLinkData`) are NOT exported from the public barrel. A consumer who follows the deprecation instruction hits a dead end — the replacement types aren't accessible from the package entry point.

**Why care**: This was flagged in the multi-audit (03-01) but remains unfixed. The public API surface directs consumers to types that don't exist in the public barrel — creating an impossible migration path.

**Severity**: P2 — API contract drift between deprecation notice and actual exports.

**Fix**: Either:

- Remove the deprecated re-exports from `src/index.ts`
- Export the runtime types (`GanttTaskData`/`GanttLinkData`) from the public barrel so consumers can migrate

**Confidence**: Certain

---

## Summary of Round 1 Findings

| ID   | Severity | File                                                             | Issue                                                                       |
| ---- | -------- | ---------------------------------------------------------------- | --------------------------------------------------------------------------- |
| F-39 | P0       | gantt/undo-stack.ts:100-103                                      | AddLinkCommand.redo() creates orphan link — stale `this.linkId` after redo  |
| F-40 | P2       | gantt/undo-stack.ts:28,32,36                                     | UpdateTaskCommand passes `as any` to updateTask — type safety bypass        |
| F-41 | P2       | kanban/hooks/use-kanban-filter.ts:10                             | filterText prop is one-time initializer, not reactive                       |
| F-42 | P2       | calendar/hooks/use-calendar-state.ts:12-13, calendar.tsx:274-296 | Dual controlled-mode surfaces — hook dead code path                         |
| F-43 | P2       | calendar/calendar.test.tsx:140                                   | CSS import test wraps async Promise in sync throw expectation               |
| F-44 | P3       | Multiple files (gantt/, calendar/, kanban/)                      | 45+ useCallback/useMemo redundant with React Compiler                       |
| F-45 | P2       | src/index.ts:6-7, schemas.ts:4-26                                | Deprecated GanttTask/GanttLink exported without replacement types in barrel |

**Total this round**: 7 new findings (1 P0, 4 P2, 1 P3)

### Blindness Self-Assessment

This round focused on the three sub-modules that the previous audits covered least thoroughly: the command undo system (gantt/undo-stack.ts), controlled-mode consistency (calendar + kanban), and React 19 compliance. What this round likely missed:

1. **Test suite execution**: Did not run `pnpm test` to verify which tests flake or fail
2. **Bundle size analysis**: Did not measure whether tree-shaking correctly removes dead code paths
3. **Accessibility audit**: Did not test keyboard navigation or screen reader behavior
4. **Performance benchmarks**: Did not profile render performance under load
5. **Security audit**: Did not probe for XSS in task/event text rendering, or prototype pollution in schema data
6. **i18n completeness**: Did not verify all `t('scheduling.*')` keys exist in locale files

Best starting point for round 2: run the actual test suite and look for flaky or failing tests, then audit i18n key coverage.
