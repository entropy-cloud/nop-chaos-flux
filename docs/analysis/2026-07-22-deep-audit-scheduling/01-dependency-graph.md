# Dimension 01: Dependency Graph & Package Boundaries

## Baseline Verification

- **package.json dependencies**: `@nop-chaos/flux-core`, `@nop-chaos/flux-i18n`, `@nop-chaos/flux-react`, `@nop-chaos/ui` -- all 4 used.
- **External deps**: `@atlaskit/pragmatic-drag-and-drop` (used in kanban DnD hooks), `@tanstack/react-virtual` (used in calendar/kanban virtualizers), `zustand` (used in gantt-store and barcode-queue).
- **No direct imports** of `flux-runtime`, `flux-formula`, `flux-compiler`, or `flux-action-core`.
- **No cross-renderer package imports** (nothing from `flux-renderers-*`).
- **All `@nop-chaos/*` import paths** use public package names; no deep internal paths.
- **All internal imports** use relative paths with `.js` extensions (ESM compliant).
- **4 renderer definitions** (gantt, kanban, calendar, barcode-input) all have `sourcePackage`.

## Findings

### [D01-01] Unused optional peer dependency `ical.js`

- **File**: `packages/flux-renderers-scheduling/package.json:31`
- **Severity**: P3
- **Evidence**: `"ical.js": "^2.2.1"` declared as optional peer. Zero imports found in `src/`.
- **Current State**: No code path ever imports or calls the library.
- **Risk**: Low — adds noise, signals support that does not exist.
- **Recommendation**: Remove until actual iCal import/export features are implemented.

### [D01-02] Dead code: Deprecated `GanttTask`/`GanttLink` interfaces in `schemas.ts`

- **File**: `packages/flux-renderers-scheduling/src/schemas.ts:5-27`
- **Severity**: P3
- **Evidence**: Both marked `@deprecated` with migration instructions to `GanttTaskData`/`GanttLinkData`. Not re-exported from `src/index.ts`. Not imported by any other file.
- **Current State**: Dead interfaces retained in source.
- **Recommendation**: Remove from `schemas.ts`.

### [D01-03] Dead variable assignments for deprecated gantt props

- **File**: `packages/flux-renderers-scheduling/src/gantt/gantt.tsx:235-240`
- **Severity**: P2
- **Evidence**: `_progressBarHeight`, `_childrenField`, `_initiallyExpanded`, `_calendar`, `_startDate`, `_endDate` — 6 variables assigned from resolved props, never used.
- **Current State**: Component resolves deprecated props only to discard them. Field definitions claim props are active.
- **Risk**: Runtime contract is misleading. Props declared but silently discarded.
- **Recommendation**: Remove deprecated field entries from definitions and remove dead assignments.

### [D01-04] Inconsistent `html2canvas` loading (global vs dynamic import)

- **File**: `packages/flux-renderers-scheduling/src/calendar/hooks/use-calendar-export.ts:34`
- **Severity**: P2
- **Evidence**: **Calendar**: `(window as any).html2canvas` (global access). **Gantt/Kanban**: `await import('html2canvas')` (dynamic import).
- **Current State**: Calendar uses fragile global pattern; will fail under bundlers where npm-installed html2canvas does not set a global.
- **Risk**: Calendar PNG export silently fails while Gantt/Kanban export works correctly.
- **Recommendation**: Replace with `await import('html2canvas')`. Add mock in test.

### [D01-05] Inconsistent `RenderRegionHandle` type import source

- **File**: Calendar sub-renderers from `@nop-chaos/flux-core`, Gantt sub-renderers from `@nop-chaos/flux-react`
- **Severity**: P3
- **Current State**: Inconsistent import source for the same conceptual type across sub-renderers.
- **Recommendation**: Standardize on `@nop-chaos/flux-react` for React renderer code.

### [D01-06] Deprecated gantt field definitions still listed as active

- **File**: `packages/flux-renderers-scheduling/src/scheduling-renderer-definitions.ts:23,27-28,30,36,52-53`
- **Severity**: P2
- **Evidence**: 7 fields marked `@deprecated` but still `kind: 'prop'` — `scales`, `startDate`, `endDate`, `progressBarHeight`, `calendar`, `childrenField`, `initiallyExpanded`. None consumed in `gantt.tsx`.
- **Current State**: Public API surface claims support for props that are never used.
- **Risk**: Consumer confusion, wasted support effort.
- **Recommendation**: Remove these 7 deprecated field entries.

### [D01-07] Build copies sub-CSS files not exposed in package exports

- **File**: `package.json:58` vs exports field
- **Severity**: P3 (informational)
- **Current State**: Functionally correct — all CSS accessible via barrel. Individual sub-CSS files built but not explicitly exported.
- **Recommendation**: No change needed, or add explicit exports for sub-CSS files.

### [D01-08] Missing barrel `index.ts` for `barcode-input`

- **File**: `packages/flux-renderers-scheduling/src/barcode-input/` (no `index.ts`)
- **Severity**: P3 (informational)
- **Current State**: `barcode-input/` lacks barrel pattern that gantt/kanban/calendar have.
- **Recommendation**: Add barrel `index.ts` for consistency.

## Summary

| ID     | Finding                                                     | Severity |
| ------ | ----------------------------------------------------------- | -------- |
| D01-01 | Unused optional peer dependency `ical.js`                   | P3       |
| D01-02 | Dead code: Deprecated GanttTask/GanttLink                   | P3       |
| D01-03 | Dead variable assignments for deprecated gantt props        | P2       |
| D01-04 | Inconsistent html2canvas loading (global vs dynamic import) | P2       |
| D01-05 | Inconsistent RenderRegionHandle type import source          | P3       |
| D01-06 | Deprecated gantt field definitions still listed as active   | P2       |
| D01-07 | Build copies sub-CSS files not exposed in package exports   | P3       |
| D01-08 | Missing barrel `index.ts` for barcode-input                 | P3       |

## Deep Dive Round 2

No high-value additional findings discovered. The 8 findings above cover all boundary concerns.
