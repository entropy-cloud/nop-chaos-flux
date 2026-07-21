# Bundle Analysis: `@nop-chaos/flux-renderers-scheduling`

> Date: 2026-07-21
> Method: `vite build --mode analyze` (rollup-plugin-visualizer)
> Source: `apps/playground`

## Summary

The scheduling package (`@nop-chaos/flux-renderers-scheduling`) contributes **285.1 KB** to the main playground bundle. It is not manually code-split (falls into the default `index-*.js` chunk). Total rendered bundle is 15.07 MB (4.42 MB gzip).

## Per-Component Breakdown

| Component | Size (KB)    | % of Scheduling |
| --------- | ------------ | --------------- |
| Calendar  | 89.4 KB      | 31.4%           |
| Gantt     | 88.8 KB      | 31.1%           |
| Kanban    | 60.1 KB      | 21.1%           |
| Barcode   | 38.8 KB      | 13.6%           |
| Shared    | 7.9 KB       | 2.8%            |
| **Total** | **285.1 KB** | **100%**        |

## Largest Modules (top 10)

| Module                                            | Size (bytes) |
| ------------------------------------------------- | ------------ |
| `src/calendar/calendar.tsx`                       | 19,799       |
| `src/barcode-input/barcode-scanner-overlay.tsx`   | 15,025       |
| `src/gantt/gantt-store.ts`                        | 13,487       |
| `src/kanban/kanban-board.tsx`                     | 12,926       |
| `src/calendar/components/calendar-month-view.tsx` | 12,561       |
| `src/gantt/gantt.tsx`                             | 11,159       |
| `src/barcode-input/barcode-input-renderer.tsx`    | 11,117       |
| `src/gantt/gantt-editor.tsx`                      | 9,983        |
| `src/scheduling-renderer-definitions.ts`          | 7,932        |
| `src/calendar/components/calendar-week-view.tsx`  | 7,777        |

## Key Dependencies (shared and scheduling-specific)

| Dependency                             | Size (KB) | Scheduling-specific?     |
| -------------------------------------- | --------- | ------------------------ |
| lucide-react                           | 946.3 KB  | No (shared icons)        |
| @dnd-kit (core+sortable+utilities)     | 92.9 KB   | No (form/data renderers) |
| date-fns                               | 56.0 KB   | No                       |
| @atlaskit/pragmatic-drag-and-drop      | 38.4 KB   | Yes (Kanban DnD)         |
| @tanstack/react-virtual + virtual-core | 27.5 KB   | Yes (virtualized lists)  |
| zustand                                | 4.5 KB    | Yes (Gantt store)        |

## Tree-Shaking Assessment

- **All scheduling-specific dependencies fully utilized**: `@tanstack/react-virtual`, `@atlaskit/pragmatic-drag-and-drop`, `zustand` — no dead imports found.
- **Optional peer dependencies tree-shaken out**: `html2canvas`, `ical.js`, `jspdf`, `xlsx` are declared optional and NOT bundled because they are imported only via dynamic `import()` inside export handlers.
- **lucide-react** is the largest single dependency at 946 KB (all icons). Only a subset is used by scheduling components; but since lucide-react is shared across the app, no tree-shaking issue exists at the schedule-package level.
- **No barrel-export over-inclusion** detected: the package's `index.ts` exports only types and the `registerSchedulingRenderers` function. Individual components are referenced by the `schedulingRendererDefinitions` array.

## Observations

1. Scheduling is not manually chunked — it falls into the main `index-*.js` bundle. If tree-shaking isolation by page is desired, it should be split into its own chunk via the playground's `build.rollupOptions.output.manualChunks` config.
2. Barcode scanner overlay is the single largest renderer component at 15 KB. It includes WASM decode integration code which is inherently larger.
3. Calendar and Gantt are roughly equal in size (~89 KB each). Kanban is about a third smaller (60 KB).
