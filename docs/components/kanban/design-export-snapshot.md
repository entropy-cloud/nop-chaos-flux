# Kanban Export/Snapshot Design

> Status: final
> Last Updated: 2026-07-20
> Source: `docs/components/kanban/design.md` §12 (P3 deferred), S7.7 plan item
> References: `packages/flux-renderers-scheduling/src/kanban/kanban.types.ts` (BoardData), `apps/playground/src/pages/kanban-demo.tsx`

## Purpose

Add PNG export and BoardData snapshot serialization/restore capabilities to the Kanban board.

## Export (PNG)

Uses `html2canvas` to capture the board DOM element as a canvas image, then triggers browser download.

```typescript
async function exportBoardToPng(boardElement: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(boardElement, {
    useCORS: true,
    allowTaint: false,
    scale: 2,
    backgroundColor: '#ffffff',
  });
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob!), 'image/png'));
}
```

**Loading state**: overlay with spinner + "正在导出看板..." during capture. On success, download via `<a download>`. On failure, toast "导出失败: 画布截图失败" and fall back to JSON export.

**Oversized board fallback**: If `boardElement.scrollWidth > 4096` or `scrollHeight > 4096`, skip html2canvas and offer JSON export with toast "看板过大,已切换为JSON导出".

## Snapshot (BoardData JSON)

```typescript
function boardDataToJson(board: BoardData): string {
  return JSON.stringify(board, null, 2);
}

function boardDataFromJson(json: string): BoardData {
  const parsed = JSON.parse(json);
  // Validate structure: must have 'root' key with BoardItem shape
  if (!parsed.root || typeof parsed.root !== 'object') {
    throw new Error('Invalid BoardData snapshot: missing root');
  }
  return parsed as BoardData;
}
```

**Imperative handles**:

- `component:saveSnapshot()` → serializes current BoardData to JSON and stores via scope/data-source
- `component:loadSnapshot(jsonString)` → deserializes and replaces board state

**Failure paths**:
| Scenario | Trigger | Expected Behavior | Retryable |
| -------------------- | ----------------------------------------- | ----------------------------------------------------- | --------- |
| `export-dom-fail` | html2canvas cannot capture (CORS/graphics) | Toast "导出失败: 画布截图失败"; JSON export remains | Yes |
| `export-oversized` | Board too large for canvas | Auto-switch to JSON export; warning toast | No |
| `snapshot-corrupt` | loadSnapshot receives malformed JSON | Catch parse error; toast "快照加载失败: 数据格式错误" | Yes |
