# Dimension 15: Security & Performance Red Lines

## Findings

### [D15-001] Gantt renders all tasks without virtualization

- **Files**: `gantt-bars.tsx:24`, `gantt-grid.tsx:34`, `gantt-cellgrid.tsx:16`, `gantt-links.tsx:17`, `gantt.tsx:281,320`
- **Severity**: P1
- **Category**: performance
- **Evidence**: All Gantt child components call `store.getVisibleTasks()` returning ALL visible tasks. `.map()` over every task to create DOM nodes. No `@tanstack/react-virtual` used. Contrast: Kanban and Calendar DO virtualize.
- **Risk**: With 1000+ tasks, multi-second layout/paint on each scroll.
- **Recommendation**: Introduce virtual scrolling for rows.

### [D15-002] Redundant `getVisibleTasks()` tree traversal 6x per render

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-tree-utils.ts:36-56` + 5 callsites
- **Severity**: P1
- **Category**: performance
- **Evidence**: Full recursive DFS traversal of task tree per call. Called 6 times per render (gantt.tsx ×2, bars, grid, cellgrid, links). O(6n) instead of O(n).
- **Risk**: With 10k tasks + frequent re-renders (drag, zoom), noticeable frame drops.
- **Recommendation**: Cache visible tasks list in GanttStore when treeRevision changes.

### [D15-003] GanttBars unnecessary snapshot subscription

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-bars.tsx:21-23`
- **Severity**: P2
- **Category**: performance
- **Evidence**: Subscribes to 3 snapshots (task, layout, tree) but only layout+tree affect output.
- **Recommendation**: Remove `useGanttTaskSnapshot()`.

### [D15-004] GanttTimeScale unnecessary subscription

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt-timescale.tsx:12-13`
- **Severity**: P2
- **Category**: performance
- **Evidence**: Subscribes to layout+tree snapshots but time scale depends only on zoom/cellWidth.
- **Recommendation**: Subscribe only to `store.revision`.

### [D15-005] Kanban helpers Object.assign on cloned objects

- **File**: `packages/flux-renderers-scheduling/src/kanban/kanban-helpers.ts:99-103`
- **Severity**: P3
- **Category**: performance
- **Evidence**: `Object.assign` on already-deep-cloned nested objects.
- **Recommendation**: Use spread-based immutable merge.

### [D15-006] No eval/new Function — PASS

- **Category**: security
- **Status**: Clean. All code uses compiled expression evaluator.

### [D15-007] No JSON.stringify change-detection — PASS

- **Category**: performance
- **Status**: All data fingerprint comparisons use reference equality.

### [D15-008] Camera resource management — PASS

- **Category**: security/performance
- **Status**: All tracks properly released, AbortController used.

### [D15-009] Timer/intervals cleanup — PASS

- **Category**: performance
- **Status**: All `setTimeout` properly cleaned in effects.

### [D15-010] Extensive manual useCallback/useMemo

- **Severity**: P3
- **Category**: performance
- **Evidence**: 43 manual memoization hooks across gantt (12 `useCallback`), kanban (6+4), calendar views.
- **Risk**: Redundant code, stale-closure risk when React Compiler enabled.
- **Recommendation**: Gradually remove for stable-ref dependencies.

## Summary

| ID      | Finding                                   | Severity |
| ------- | ----------------------------------------- | -------- |
| D15-001 | Gantt no virtualization                   | **P1**   |
| D15-002 | Redundant getVisibleTasks() 6x per render | **P1**   |
| D15-003 | GanttBars unnecessary subscription        | P2       |
| D15-004 | GanttTimeScale unnecessary subscription   | P2       |
| D15-005 | Object.assign on cloned objects           | P3       |
| D15-006 | No eval/new Function                      | PASS     |
| D15-007 | No JSON.stringify change-detection        | PASS     |
| D15-008 | Camera resource management                | PASS     |
| D15-009 | Timer/intervals cleanup                   | PASS     |
| D15-010 | Manual useCallback/useMemo                | P3       |
