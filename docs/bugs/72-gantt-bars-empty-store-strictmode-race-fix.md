# 72 Gantt Bars Empty / Drag Snap-Back & Interaction Fixes

## Problems

1. **Bars empty**: Gantt bars rendered 0 children even though grid showed 14 task rows. Bars container had `height: 1px`.

2. **Drag snap-back**: Bar drag ghost moved and drop indicator appeared, but bar snapped to original position on release. `store.tasks.get(taskId)` returned `undefined`.

3. **Bar click no selection**: Clicking a bar fired `onTaskClick` event but did NOT call `store.selectTask()`, so `aria-selected` was never set on the grid row. Serial test group blocked drag/link tests.

4. **Bar resize blocked by link polylines**: Link click-target polylines (invisible, `strokeWidth=10`, `pointer-events: auto`) intercepted pointerdown at bar edges. SVG children with `pointer-events: auto` use `visiblePainted` semantics, so transparent strokes are skipped by hit-testing — the bars div was found instead. `pointer-events: all` was required.

5. **Link delete button not clickable**: Delete button inside SVG `foreignObject` inherited `pointer-events: none` from the outer SVG container.

## Root Causes & Fixes

### 1. Strict Mode Store Lifecycle (`gantt.tsx`)

React 19 Strict Mode double-invokes `useState` initializers and double-mounts effects. With `useState(() => createGanttStore(...))`:

1. Store created + parsed (14 tasks)
2. Second Store created + parsed (used for state)
3. Component renders (14 tasks)
4. Effect mount fires
5. Strict Mode cleanup → `store.destroy()` clears tasks in the ACTIVE store
6. Remount → no re-parse, store has 0 tasks

`destroy()` didn't bump revision counters, so `useSyncExternalStore` didn't re-render. DOM held zombie bars.

**Fix**: Changed `useState` to `useRef` for store creation. Removed `store.destroy()` from cleanup.

### 2. Bar Click Selection (`gantt.tsx`)

`handleTaskClick` only fired `onTaskClick` event but did not call `store.selectTask()`.

**Fix**: Added `store.selectTask(taskId)` at the start of `handleTaskClick`.

### 3. SVG `pointer-events: auto` vs `all` (`gantt-links.tsx`)

On SVG elements, CSS `pointer-events: auto` is equivalent to `visiblePainted`, which excludes transparent strokes from hit-testing. The invisible link polyline (`stroke="transparent"`) with `pointer-events: auto` was skipped by `elementFromPoint`, so the bars div was found instead.

**Fix**: Changed to `pointer-events: all` on the invisible polyline and `pointer-events: auto` on the HTML div inside the delete button foreignObject.

### 4. Link Area Intercepting Bar Drag/Resize (`gantt-links.tsx`)

The invisible link polyline (10px stroke, covering bar edges) intercepted `pointerdown` events intended for bars. A synthetic `PointerEvent` dispatch redirected bar-area events while preserving link click/hover.

**Fix**: Added `onPointerDown` handler to the invisible polyline that temporarily disables its own `pointer-events`, calls `elementFromPoint` to detect a bar underneath, and dispatches a new `pointerdown` event on the bar element if found.

## Tests

- **gantt-bars-and-links.spec.ts**: 15/15 pass (previously 5/15).
  - Bars render, milestones, positions, progress, text
  - Click selects task, drag move, resize-right
  - Link handles, link lines, link hover, link click, delete link
  - Project bars, Enter key opens editor

- **gantt-demo.spec.ts**: 9/20 pass, 1 failure (collapse/expand — pre-existing).
- **gantt-editor-and-keyboard.spec.ts**: 2/12 pass, 1 failure (dialog save — pre-existing).

## Affected Files

- `packages/flux-renderers-scheduling/src/gantt/gantt.tsx` — store lifecycle fix, bar click selection
- `packages/flux-renderers-scheduling/src/gantt/gantt-links.tsx` — pointer-events fixes, bar interaction delegation

## Notes

- `pointer-events: auto` on SVG elements = `visiblePainted`. Use `pointer-events: all` for SVG elements that need to be targets regardless of fill/stroke visibility.
- HTML elements inside SVG `foreignObject` need explicit `pointer-events: auto` to override inherited SVG `pointer-events`.
- Events on sibling SVG elements don't bubble to the bars container. Use synthetic event dispatching for cross-container interaction.
