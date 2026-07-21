> Audit Status: planned
> Audit Type: open-ended
> Mission: scheduling

# Open-Ended Adversarial Audit — Scheduling

**Execution date**: 2026-07-21
**Protocol**: `docs/skills/open-ended-adversarial-review-prompt.md`
**Existing context**: Prior audit session (`docs/analysis/2026-07-20-2157-open-audit-scheduling/` rounds 1-4, 38 findings) and multi-audit (`docs/audits/2026-07-20-2157-multi-audit-scheduling.md`, 14 findings) reviewed for dedup.

**Perspectives this session**: Contract archaeologist, lifecycle tracker, React Compiler enforcer, build-time investigator

## State of Previous Findings

Of the 52 previously aggregated findings:

- **17 verified fixed** (including the most critical F-31 revision bug, F-33 document.getElementById, F-35 double-fire events, F-38 coverage enforcement)
- **28 either lower priority or already addressed by remediation plans**
- **7 remain open and unfixed** — notably the deprecated type exports (03-01) and the empty scheduling-utils/ directory (02-03)

## Round 1 — Novel Findings (this session: 7 new issues)

Individual round results saved at:
`docs/analysis/2026-07-21-001-open-audit-scheduling/round-01.md`

---

### F-39: Gantt `AddLinkCommand.redo()` creates orphan link — undo/redo identity broken [P0]

`packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:89-104`

`redo()` calls `store.addLink()` which generates a new link ID, but `this.linkId` is never updated. After undo → redo, the stored ID points to the old (deleted) link. Subsequent `undo()` calls `removeLink(this.linkId)` with the stale ID, missing the redo-created link. The redo-created link becomes an orphan.

**Fix**: `this.linkId = link.id` after `store.addLink()` in `redo()`.

---

### F-40: Gantt `UpdateTaskCommand` passes `as any` on core execution path [P2]

`packages/flux-renderers-scheduling/src/gantt/undo-stack.ts:28,32,36`

Three `as any` casts on the command execution path. `before`/`after` typed as `Record<string, unknown>` instead of `Partial<GanttTaskData>`. Any property — including misspelled or non-existent fields — passes through unchecked to `Object.assign` inside `updateTask`.

---

### F-41: Kanban `filterText` prop is one-time initializer, not reactive [P2]

`packages/flux-renderers-scheduling/src/kanban/hooks/use-kanban-filter.ts:10`

Unlike Calendar (which syncs `resolved.date`/`resolved.view` via effects), Kanban uses `externalFilterText` only for initial `useState` initialization. Schema changes to `filterText` are silently ignored. Contract drift: the field is declared as `kind: 'prop'` but behaves as a one-time initializer.

---

### F-42: Calendar `useCalendarState` offers dual controlled-mode surfaces — hook dead code path [P2]

`packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-state.ts:12-13` vs `calendar.tsx:246-256,274-296`

The hook accepts `controlledDate`/`controlledView` but the Calendar component never passes them, instead implementing its own ref+effect based sync. Two controlled-mode code paths coexist: one dead (hook interface), one redundant (component bypassing the hook it calls).

---

### F-43: Calendar print CSS import test is a false-positive no-op assertion [P2]

`packages/flux-renderers-scheduling/src/calendar/calendar.test.tsx:140`

`expect(() => import('./utils/calendar-print.css')).not.toThrow()` — `import()` never throws synchronously. The test passes trivially regardless of whether the CSS file is loadable or even exists.

---

### F-44: Widespread `useCallback`/`useMemo` redundant with React Compiler [P3]

45+ instances across `gantt/`, `calendar/`, `kanban/` source files.

AGENTS.md and `docs/skills/react19-best-practices-review.md` explicitly prohibit hand-written memoization without `eslint-disable-next-line react-compiler/react-compiler` annotation. Only ONE file in the entire package has such annotation (with a legitimate reason). 44+ remaining wrappers (including empty-deps `useCallback` like `cancelSwap`) are redundant — React Compiler auto-memoizes.

---

### F-45: Deprecated `GanttTask`/`GanttLink` types still exported from public API without replacement [P2]

`packages/flux-renderers-scheduling/src/index.ts:6-7`, `schemas.ts:4-26`

JSDoc directs consumers to replace with types from `./gantt/gantt.types.js`, but those types (`GanttTaskData`, `GanttLinkData`) are NOT exported from the public barrel. Consumers cannot follow the deprecation instruction.

---

## Cross-Round Context

### Most impactful remaining issue

**F-39** (P0 — AddLinkCommand redo identity broken) is a functional correctness bug on the undo/redo path. It affects the command-based undo system used by Gantt's link creation. The bug makes the third invocation of undo on link operations silently fail, leaving orphan links in the store.

### Reactivity model

The earlier rounds' primary concerns (F-31 revision bumping, F-32 EventEmitter dead code, F-05 subscription granularity) have been largely fixed. The GanttStore now correctly bumps per-domain revisions and supports per-path subscriptions. The remaining reactivity gap is architectural: the store is still a vanilla class with EventEmitter heritage, not a proper Zustand store — creating a maintenance divergence from project conventions.

### Test quality

F-36 (zero-assertion lifecycle test, round 4) and F-43 (false-positive CSS import test, this round) suggest a pattern of test-file growth without corresponding assertion coverage. The coverage thresholds in `vitest.config.ts` (branches 50%, functions 60%, lines 63%, statements 60%) are realistic but potentially too low to catch this pattern.

## Summary

| Metric                               | Count                            |
| ------------------------------------ | -------------------------------- |
| Total findings this session          | 7                                |
| P0                                   | 1 (F-39)                         |
| P2                                   | 5 (F-40, F-41, F-42, F-43, F-45) |
| P3                                   | 1 (F-44)                         |
| Previously fixed (verified)          | 17                               |
| Previously unfixed (carried forward) | 7                                |

### 1-3 Most Important Directions

1. **Undo/redo identity correctness (F-39)**: P0 bug that affects the Gantt's command-based undo for link operations. Fix is a one-line addition.
2. **React Compiler convention enforcement (F-44)**: 45+ instances of hand-written memoization contradict the project's explicit React 19 rules. This is a repo-wide pattern — the scheduling package is just one manifestation. A lint rule should catch this.
3. **Controlled mode consistency (F-41, F-42)**: Two different sub-modules (Calendar, Kanban) handle the controlled-vs-uncontrolled pattern differently, and Calendar has both a dead and a redundant implementation of the same feature. This suggests the scheduling package lacks a shared controlled-state pattern.

### Blindness Self-Assessment

This round likely missed:

- **Actual test failures**: Did not run `pnpm test` to identify flaky or failing tests
- **Bundle size / tree-shaking**: Did not verify that dead code paths (deprecated type re-exports, unused `controlledDate`/`controlledView`) are eliminated from production bundles
- **Performance profiling**: Did not measure render cost under load (500+ tasks, 20+ columns)
- **Security**: Did not probe for XSS in task/event text rendering or prototype pollution in schema data
- **E2E integration**: Did not verify that the scheduling package actually renders correctly inside the playground app

Best starting point for the next round: run the test suite, profile the Gantt render with realistic data volumes, and audit the `as any` cast inventory across all scheduling sub-modules for tightenable type boundaries.

<AI_STEP_RESULT>issues</AI_STEP_RESULT>
