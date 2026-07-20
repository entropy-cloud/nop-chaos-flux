import type { SplitEventBlock } from './calendar-layout-utils.js';

export interface CrossDayLine {
  eventId: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  color: string;
}

export interface CellPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeCrossDayLines(
  splitEvents: SplitEventBlock[],
  cellPositions: Map<string, CellPosition>,
): CrossDayLine[] {
  const lines: CrossDayLine[] = [];
  const grouped = new Map<string, SplitEventBlock[]>();

  for (const block of splitEvents) {
    if (!block.isSplit) continue;
    if (!grouped.has(block.eventId)) {
      grouped.set(block.eventId, []);
    }
    grouped.get(block.eventId)!.push(block);
  }

  for (const [, blocks] of grouped) {
    blocks.sort((a, b) => a.dayIndex - b.dayIndex);

    for (let i = 0; i < blocks.length - 1; i++) {
      const from = blocks[i];
      const to = blocks[i + 1];
      const fromKey = `${from.resourceId}:${from.date}`;
      const toKey = `${to.resourceId}:${to.date}`;
      const fromPos = cellPositions.get(fromKey);
      const toPos = cellPositions.get(toKey);

      if (!fromPos || !toPos) continue;

      const color = from.originalEvent.color || '#94a3b8';

      lines.push({
        eventId: from.eventId,
        fromX: fromPos.x + fromPos.width,
        fromY: fromPos.y + fromPos.height / 2,
        toX: toPos.x,
        toY: toPos.y + toPos.height / 2,
        color,
      });
    }
  }

  return lines;
}

export function createSVGPath(line: CrossDayLine): string {
  const midX = (line.fromX + line.toX) / 2;
  return `M ${line.fromX} ${line.fromY} Q ${midX} ${line.fromY}, ${midX} ${(line.fromY + line.toY) / 2} Q ${midX} ${line.toY}, ${line.toX} ${line.toY}`;
}
