/**
 * Notion-style multi-view database replica — view-payload builders (plan
 * 2026-08-30-0614-1 P5b Phase 1 module split, antdpro/linear entity-module
 * precedent).
 *
 * Board (group-property kanban BoardData + Count/Percent aggregates) and
 * calendar (6-week × 7-day vertical month grid) payloads are pure functions
 * over the caller-owned record array; session overrides choose the board
 * group property at read time.
 */

import {
  NOTION_BOARD_COLUMNS,
  NOTION_CATEGORY_LABELS,
  NOTION_PALETTE,
  NOTION_PEOPLE,
  NOTION_STATUS_META,
  type NotionGroupProperty,
  type NotionRecord,
} from './mock-backend-notion-types';
import { notionChipClass } from './mock-backend-notion-records';

export interface NotionBoardPayload {
  board: Record<string, unknown>;
  columns: Array<{ id: string; title: string; count: number }>;
  aggregates: Array<{ columnId: string; label: string; count: number; percent: number }>;
}

export interface NotionGroupColumn {
  id: string;
  title: string;
  /** property value this column collects (status enum / category label / person name) */
  value: string;
  color: string;
}

/** Column registry per group property (board 列集随分组属性变化，I11). */
export function notionGroupColumns(property: NotionGroupProperty): NotionGroupColumn[] {
  if (property === 'category') {
    return NOTION_CATEGORY_LABELS.map((c) => ({ id: `col-${c.label}`, title: c.label, value: c.label, color: NOTION_PALETTE[c.color].icon }));
  }
  if (property === 'person') {
    return NOTION_PEOPLE.map((p) => ({ id: `col-${p.name}`, title: p.name, value: p.name, color: NOTION_PALETTE[p.hue].icon }));
  }
  return NOTION_BOARD_COLUMNS.map((c) => ({ id: `col-${c.id}`, title: c.title, value: c.id, color: NOTION_PALETTE[NOTION_STATUS_META[c.id].color].icon }));
}

export function recordGroupValue(record: NotionRecord, property: NotionGroupProperty): string {
  if (property === 'category') return record.category;
  if (property === 'person') return record.person.name;
  return record.status;
}

/** Board payload: group-property kanban BoardData + Count/Percent aggregates
 * per column (group property switchable via session view-config, I11). */
export function buildNotionBoardData(
  rows: NotionRecord[],
  property: NotionGroupProperty = 'status',
): NotionBoardPayload {
  const board: Record<string, unknown> = {};
  const columns: NotionBoardPayload['columns'] = [];
  const aggregates: NotionBoardPayload['aggregates'] = [];
  const rootChildren: string[] = [];
  const total = Math.max(1, rows.length);
  const groupColumns = notionGroupColumns(property);

  for (const col of groupColumns) {
    const cards = rows.filter((r) => recordGroupValue(r, property) === col.value);
    const cardIds: string[] = [];
    for (const record of cards) {
      const cardId = `card-${record.id}`;
      board[cardId] = {
        id: cardId,
        type: 'card',
        parentId: col.id,
        children: [],
        data: {
          title: `${record.emoji} ${record.title}`,
          description: `${record.id} · ${record.number} pt`,
        },
        meta: {
          color: col.color,
          tags: record.tags.map((tag) => ({ id: `${record.id}-tag-${tag}`, text: tag })),
          members: [{ id: `${record.id}-person`, name: record.person.name }],
        },
      };
      cardIds.push(cardId);
    }
    board[col.id] = {
      id: col.id,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: { title: col.title },
      meta: {},
    };
    rootChildren.push(col.id);
    columns.push({ id: col.id, title: col.title, count: cardIds.length });
    aggregates.push({
      columnId: col.id,
      label: col.title,
      count: cardIds.length,
      percent: Math.round((cardIds.length / total) * 100),
    });
  }

  board['root'] = { id: 'root', type: 'root', children: rootChildren, data: {}, meta: {} };
  return { board, columns, aggregates };
}

export interface NotionCalendarDay {
  date: string;
  day: number;
  inMonth: boolean;
  isToday: boolean;
  records: Array<{ id: string; title: string; emoji: string; chipClass: string }>;
}

export interface NotionCalendarPayload {
  monthLabel: string;
  today: string;
  weekdays: string[];
  weeks: NotionCalendarDay[][];
}

/** Calendar payload: Notion-style 6-week × 7-day vertical month grid
 * (Monday first), fixed sample month 2026-08 + fixed today 2026-08-30 for
 * deterministic e2e; records land on their day cell as chip cards. */
export function buildNotionCalendarGrid(rows: NotionRecord[]): NotionCalendarPayload {
  const today = '2026-08-30';
  const toISO = (d: Date) => d.toISOString().slice(0, 10);
  const anchor = new Date('2026-08-15T00:00:00Z');
  const start = new Date(anchor);
  start.setUTCDate(anchor.getUTCDate() - ((anchor.getUTCDay() + 6) % 7) - 14);

  const byDate = new Map<string, NotionCalendarDay['records']>();
  for (const record of rows) {
    if (record.date < toISO(start) || record.date > '2026-09-06') continue;
    const list = byDate.get(record.date) ?? [];
    list.push({
      id: record.id,
      title: record.title,
      emoji: record.emoji,
      chipClass: notionChipClass(NOTION_STATUS_META[record.status].color),
    });
    byDate.set(record.date, list);
  }

  const weeks: NotionCalendarDay[][] = [];
  for (let w = 0; w < 6; w += 1) {
    const week: NotionCalendarDay[] = [];
    for (let d = 0; d < 7; d += 1) {
      const current = new Date(start);
      current.setUTCDate(start.getUTCDate() + w * 7 + d);
      const date = toISO(current);
      week.push({
        date,
        day: current.getUTCDate(),
        inMonth: current.getUTCMonth() === 7,
        isToday: date === today,
        records: byDate.get(date) ?? [],
      });
    }
    weeks.push(week);
  }
  return {
    monthLabel: '2026年8月',
    today,
    weekdays: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    weeks,
  };
}

