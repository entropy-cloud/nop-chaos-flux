# Gantt Responsive/Fullscreen Design

> Part of S3 Gantt advanced features.
> Source: `docs/components/gantt/design.md` §12 (S3.8)

## Purpose

Provide responsive layout adaptation and fullscreen mode for the Gantt chart, enabling usability on narrow viewports and presentation scenarios.

## Compact Mode

### Trigger

- `compactMode?: boolean | number` — if `true` (default width < 768px), if `number` as custom breakpoint
- Auto-detection: `ResizeObserver` on container, compare width against `compactBreakpoint`
- Configurable: `compactBreakpoint: number` (default 768)

### Behavior

When compact mode is active:

- Grid panel is hidden (only timeline visible)
- Grid column headers move to a compact overlay accessible via a toggle button
- Timeline takes full width
- A "Show grid" button appears in toolbar to temporarily reveal the grid as an overlay panel
- Row height reduced (from 40px to 32px) to fit more tasks on screen
- Task bar labels truncated earlier

### Implementation

```typescript
interface CompactModeConfig {
  enabled: boolean;
  breakpoint: number;
  showGridOverlay: boolean;
}
```

File: `packages/flux-renderers-scheduling/src/gantt/components/gantt-compact.tsx`

## Fullscreen

### Fullscreen API Integration

- `fullscreenable?: boolean` (default `false`) — enables fullscreen button in toolbar
- Uses `Element.requestFullscreen()` / `document.exitFullscreen()`
- `fullscreenchange` event listener to update internal state
- Escape key exits fullscreen (browser default behavior)

### Fallback

When Fullscreen API is unavailable:

- Hide fullscreen button if API not supported (`!document.fullscreenEnabled`)
- CSS fallback: expand container to `100vw x 100vh` with `position: fixed; inset: 0; z-index: 9999`

### Error Handling

| Scenario                       | Behavior                                                            |
| ------------------------------ | ------------------------------------------------------------------- |
| Fullscreen API not supported   | Hide fullscreen button; compactMode still works via width detection |
| User rejects fullscreen prompt | Fall back to CSS-based full-viewport expansion                      |

## Layout Breakpoints

| Breakpoint | Behavior                                                  |
| ---------- | --------------------------------------------------------- |
| > 768px    | Normal dual-pane layout                                   |
| 480–768px  | Compact mode: grid hidden, compact overlay button visible |
| < 480px    | Mobile: timeline only, no grid toggle, row height 32px    |

## Implementation

Fullscreen state and compact mode detection live in the main Gantt component (`gantt.tsx`), consuming `ResizeObserver` on the container ref. The compact/fullscreen UI elements are rendered in `GanttHeader` when corresponding schema fields are present.
