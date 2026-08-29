/**
 * Notion-style multi-view database replica mock data + fetcher branch
 * (plan 2026-08-30-0040-2 P5a; get-only — interaction wiring belongs to P5b).
 * Branch-sink precedent (`mock-backend-linear.ts`): showcase-env delegates
 * `/r/Notion__` here. Read endpoints: `Notion__records` (`view=` five shapes;
 * unknown view → table shape nt-view-unknown; zero-match keyword → empty
 * array nt-records-miss), `Notion__record?id=` (miss → placeholder
 * nt-peek-miss), `Notion__viewConfigs` (per-view filter/sort/group/layout
 * parameter objects — the G-C config-set data carrier). Posts rejected.
 *
 * Dataset: 32 records covering the trimmed property-type list, the 10-color
 * palette triplets, hover/conditional samples; deterministic index arithmetic
 * only; all copy self-authored Chinese, zero trademark/brand assets.
 */

export type NotionColor =
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow'
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export type NotionViewType = 'table' | 'board' | 'gallery' | 'calendar' | 'list';
export type NotionStatus = 'not_started' | 'in_progress' | 'review' | 'done';

export interface NotionPerson {
  name: string;
  initials: string;
  hue: NotionColor;
}

export interface NotionRecord {
  id: string;
  emoji: string;
  title: string;
  number: number;
  category: string;
  categoryColor: NotionColor;
  status: NotionStatus;
  tags: string[];
  tagColors: NotionColor[];
  date: string;
  person: NotionPerson;
  files: string[];
  coverEmoji: string;
  coverTone: NotionColor;
  hasCover: boolean;
  done: boolean;
  url: string;
  email: string;
  phone: string;
  createdTime: string;
  editedTime: string;
}
/** Row projection with precomputed `nt-*` chip/dot/conditional classes. */
export interface NotionRecordRow extends NotionRecord {
  categoryChipClass: string;
  statusLabel: string;
  statusChipClass: string;
  statusDotClass: string;
  tagChips: Array<{ text: string; chipClass: string }>;
  condRowClass: string;
  personInitials: string;
  personChipClass: string;
}
export interface NotionViewRule {
  property: string;
  op: string;
  value?: string;
}
export interface NotionViewConfig {
  viewId: NotionViewType;
  type: NotionViewType;
  name: string;
  icon: string;
  display: 'both' | 'icon' | 'name';
  layout: { cardSize?: string; cover?: boolean; rowHeight?: string; dateProperty?: string };
  propVisibility: Array<{ property: string; visible: boolean }>;
  filter: { conjunction: 'and' | 'or'; rules: NotionViewRule[] };
  sorts: Array<{ property: string; dir: 'asc' | 'desc' }>;
  group?: { property: string; colorColumns: boolean };
}
export interface NotionDatabase {
  records: NotionRecord[];
  viewConfigs: NotionViewConfig[];
}
/** 10-color semantic palette, three sets per color (text/bg/icon). */
export const NOTION_PALETTE: Record<NotionColor, { text: string; bg: string; icon: string }> = {
  default: { text: '#37352F', bg: '#F1F1EF', icon: '#37352F' },
  gray: { text: '#787774', bg: '#F1F1EF', icon: '#9B9A97' },
  brown: { text: '#9F6B53', bg: '#F4EEEE', icon: '#A97D61' },
  orange: { text: '#CC782F', bg: '#F8ECDF', icon: '#D87620' },
  yellow: { text: '#CB912F', bg: '#FBF3DB', icon: '#DFAB01' },
  green: { text: '#548164', bg: '#EEF3ED', icon: '#448361' },
  blue: { text: '#487CA5', bg: '#E9F3F7', icon: '#337EA9' },
  purple: { text: '#9065B0', bg: '#F6F3F9', icon: '#8A67AB' },
  pink: { text: '#C14C8A', bg: '#FAF1F5', icon: '#C14C8A' },
  red: { text: '#C4554D', bg: '#FAECEC', icon: '#D44C47' },
};
const NOTION_STATUS_META: Record<NotionStatus, { label: string; color: NotionColor }> = {
  not_started: { label: '未开始', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  review: { label: '评审中', color: 'yellow' },
  done: { label: '已完成', color: 'green' },
};
export const NOTION_PEOPLE: NotionPerson[] = [
  { name: '文清鹤', initials: '文', hue: 'blue' },
  { name: '韩知序', initials: '韩', hue: 'green' },
  { name: '陆明澈', initials: '陆', hue: 'purple' },
  { name: '姚霏然', initials: '姚', hue: 'orange' },
  { name: '程以宁', initials: '程', hue: 'pink' },
];
export const NOTION_BOARD_COLUMNS: Array<{ id: NotionStatus; title: string }> = [
  { id: 'not_started', title: '未开始' },
  { id: 'in_progress', title: '进行中' },
  { id: 'review', title: '评审中' },
  { id: 'done', title: '已完成' },
];

const NOTION_TITLES = [
  '首页信息流卡片支持双列布局切换',
  '深色模式下侧栏对比度不足',
  '附件预览支持 PDF 多页缩略图',
  '搜索结果按相关度加权排序',
  '移动端手势返回与滑出菜单冲突',
  '表格批量导出支持自定义列集',
  '通知中心支持按项目分组折叠',
  '表单校验错误提示支持锚点定位',
  '看板视图支持按人员分组',
  '日历视图支持周起始日设置',
  '权限面板支持按角色继承',
  '图片上传失败后的断点续传',
  '模板中心支持关键词收藏',
  '回收站支持批量恢复与彻底删除',
  '团队空间配额用量可视化',
  '快捷键面板支持自定义映射',
  '引用块支持跨页定位跳转',
  '评论支持 @ 提及与已读回执',
  '数据字典支持版本对比',
  '多级审批流支持条件分支',
  '页面性能预算与告警阈值',
  '离线模式的本地变更队列',
  '任务依赖关系图自动布局',
  'API 开放平台的限流策略',
  '审计日志支持按操作者筛选',
  '单点登录支持企业 IdP 元数据',
  '消息推送的免打扰时段',
  '知识库目录拖拽排序持久化',
  '富文本表格支持合并单元格',
  '移动端离线缓存的清理策略',
  '视频课程进度记忆与续播',
  '多语言内容的翻译状态追踪',
];

const NOTION_CATEGORIES: Array<{ label: string; color: NotionColor }> = [
  { label: '产品需求', color: 'blue' },
  { label: '技术优化', color: 'purple' },
  { label: '体验改进', color: 'green' },
  { label: '调研探索', color: 'orange' },
];

const NOTION_TAGS: Array<{ label: string; color: NotionColor }> = [
  { label: '前端', color: 'gray' },
  { label: '后端', color: 'brown' },
  { label: '设计', color: 'pink' },
  { label: '性能', color: 'orange' },
  { label: '文档', color: 'blue' },
  { label: '安全', color: 'red' },
];

const NOTION_EMOJIS = ['📌', '🧭', '🛠️', '📊', '✨', '🔍'];
const NOTION_COVER_EMOJIS = ['📐', '🌄', '🧩', '🗃️', '🪄', '🛰️'];
const NOTION_COVER_TONES: NotionColor[] = ['blue', 'green', 'purple', 'orange', 'pink', 'yellow'];
const NOTION_NUMBERS = [1, 2, 3, 5, 8, 13];
const NOTION_STATUSES: NotionStatus[] = [
  'in_progress', 'not_started', 'done', 'in_progress', 'review', 'not_started',
  'done', 'in_progress', 'not_started', 'review', 'done', 'in_progress',
  'not_started', 'done', 'review', 'in_progress', 'not_started', 'done',
  'in_progress', 'review', 'not_started', 'done', 'in_progress', 'not_started',
  'review', 'done', 'in_progress', 'not_started', 'done', 'review',
  'in_progress', 'not_started',
];

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}
function notionStamp(day: number, hour: number, minute: number): string {
  return `2026-08-${pad(day)} ${pad(hour)}:${pad(minute)}`;
}

export function createNotionRecords(): NotionRecord[] {
  const rows: NotionRecord[] = [];
  for (let i = 0; i < 32; i += 1) {
    const category = NOTION_CATEGORIES[i % NOTION_CATEGORIES.length];
    const primaryTag = NOTION_TAGS[i % NOTION_TAGS.length];
    const tags = i % 4 === 0 ? [primaryTag] : [primaryTag, NOTION_TAGS[(i + 2) % NOTION_TAGS.length]];
    rows.push({
      id: `REC-${101 + i}`,
      emoji: NOTION_EMOJIS[i % NOTION_EMOJIS.length],
      title: NOTION_TITLES[i],
      number: NOTION_NUMBERS[i % NOTION_NUMBERS.length],
      category: category.label,
      categoryColor: category.color,
      status: NOTION_STATUSES[i],
      tags: tags.map((t) => t.label),
      tagColors: tags.map((t) => t.color),
      date: i % 3 === 0 ? `2026-08-${pad(3 + ((i * 5) % 27))}` : `2026-09-${pad(1 + ((i * 3) % 25))}`,
      person: NOTION_PEOPLE[i % NOTION_PEOPLE.length],
      files: i % 2 === 0 ? ['需求附件.pdf'] : [],
      coverEmoji: NOTION_COVER_EMOJIS[i % NOTION_COVER_EMOJIS.length],
      coverTone: NOTION_COVER_TONES[i % NOTION_COVER_TONES.length],
      hasCover: i % 16 !== 15,
      done: i % 3 === 0,
      url: `https://wiki.demo/req/rec-${101 + i}`,
      email: `owner${i + 1}@demo.example`,
      phone: `138${pad(1000 + i * 7, 8)}`,
      createdTime: notionStamp(1 + (i % 20), 9 + (i % 8), (i * 13) % 60),
      editedTime: notionStamp(20 + (i % 10), 10 + (i % 7), (i * 29) % 60),
    });
  }
  return rows;
}

export function notionChipClass(color: NotionColor): string {
  return `nt-chip nt-chip-${color}`;
}

export function toNotionRecordRow(record: NotionRecord): NotionRecordRow {
  const meta = NOTION_STATUS_META[record.status];
  return {
    ...record,
    categoryChipClass: notionChipClass(record.categoryColor),
    statusLabel: meta.label,
    statusChipClass: notionChipClass(meta.color),
    statusDotClass: `nt-dot nt-dot-${meta.color}`,
    tagChips: record.tags.map((text, ti) => ({
      text,
      chipClass: notionChipClass(record.tagColors[ti] ?? 'gray'),
    })),
    condRowClass:
      record.number >= 8 ? 'nt-cond-red' : record.status === 'review' ? 'nt-cond-yellow' : '',
    personInitials: record.person.initials,
    personChipClass: `nt-avatar nt-avatar-${record.person.hue}`,
  };
}

export function filterNotionRecords(rows: NotionRecord[], keyword?: string): NotionRecord[] {
  const needle = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';
  if (!needle) return rows.slice();
  return rows.filter(
    (r) => r.title.toLowerCase().includes(needle) || r.id.toLowerCase().includes(needle),
  );
}

export function paginateNotion<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, pageSize);
  const start = (safePage - 1) * safeSize;
  return {
    items: rows.slice(start, start + safeSize),
    total: rows.length,
    page: safePage,
    pageSize: safeSize,
    pages: Math.max(1, Math.ceil(rows.length / safeSize)),
  };
}

export interface NotionBoardPayload {
  board: Record<string, unknown>;
  columns: Array<{ id: string; title: string; count: number }>;
  aggregates: Array<{ columnId: string; label: string; count: number; percent: number }>;
}

/** Board payload: status-grouped kanban BoardData + mock-precomputed
 * Count/Percent aggregates per column (analysis §7 candidate carrier). */
export function buildNotionBoardData(rows: NotionRecord[]): NotionBoardPayload {
  const board: Record<string, unknown> = {};
  const columns: NotionBoardPayload['columns'] = [];
  const aggregates: NotionBoardPayload['aggregates'] = [];
  const rootChildren: string[] = [];
  const total = Math.max(1, rows.length);

  for (const col of NOTION_BOARD_COLUMNS) {
    const colId = `col-${col.id}`;
    const cards = rows.filter((r) => r.status === col.id);
    const cardIds: string[] = [];
    for (const record of cards) {
      const cardId = `card-${record.id}`;
      board[cardId] = {
        id: cardId,
        type: 'card',
        parentId: colId,
        children: [],
        data: {
          title: `${record.emoji} ${record.title}`,
          description: `${record.id} · ${record.number} pt`,
        },
        meta: {
          color: NOTION_PALETTE[NOTION_STATUS_META[record.status].color].icon,
          tags: record.tags.map((tag) => ({ id: `${record.id}-tag-${tag}`, text: tag })),
          members: [{ id: `${record.id}-person`, name: record.person.name }],
        },
      };
      cardIds.push(cardId);
    }
    board[colId] = {
      id: colId,
      type: 'column',
      parentId: 'root',
      children: cardIds,
      data: { title: col.title },
      meta: {},
    };
    rootChildren.push(colId);
    columns.push({ id: colId, title: col.title, count: cardIds.length });
    aggregates.push({
      columnId: colId,
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

export function createNotionViewConfigs(): NotionViewConfig[] {
  const visibility = (names: string[]) => names.map((property) => ({ property, visible: true }));
  return [
    {
      viewId: 'table', type: 'table', name: '全部记录', icon: 'table', display: 'both',
      layout: { rowHeight: 'short' },
      propVisibility: visibility(['title', 'category', 'status', 'person', 'number', 'tags', 'date', 'done', 'url']),
      filter: { conjunction: 'and', rules: [{ property: 'category', op: 'is-not', value: '归档' }] },
      sorts: [{ property: 'editedTime', dir: 'desc' }],
    },
    {
      viewId: 'board', type: 'board', name: '状态看板', icon: 'kanban', display: 'both',
      layout: { cardSize: 'medium' },
      propVisibility: visibility(['title', 'tags', 'person']),
      filter: { conjunction: 'and', rules: [{ property: 'status', op: 'is-not', value: 'cancelled' }] },
      sorts: [{ property: 'number', dir: 'desc' }],
      group: { property: 'status', colorColumns: true },
    },
    {
      viewId: 'gallery', type: 'gallery', name: '封面墙', icon: 'layout-grid', display: 'both',
      layout: { cardSize: 'small', cover: true },
      propVisibility: visibility(['title', 'category', 'tags']),
      filter: { conjunction: 'and', rules: [{ property: 'hasCover', op: 'is', value: 'true' }] },
      sorts: [{ property: 'date', dir: 'asc' }],
    },
    {
      viewId: 'calendar', type: 'calendar', name: '排期月历', icon: 'calendar', display: 'both',
      layout: { dateProperty: 'date' },
      propVisibility: visibility(['title', 'status']),
      filter: { conjunction: 'and', rules: [] },
      sorts: [],
    },
    {
      viewId: 'list', type: 'list', name: '进行清单', icon: 'list', display: 'both',
      layout: { rowHeight: 'short' },
      propVisibility: visibility(['title', 'category', 'person']),
      filter: { conjunction: 'and', rules: [{ property: 'status', op: 'is-not', value: 'done' }] },
      sorts: [{ property: 'title', dir: 'asc' }],
    },
  ];
}

export function createNotionDatabase(): NotionDatabase {
  return { records: createNotionRecords(), viewConfigs: createNotionViewConfigs() };
}

export interface NotionFetcherBranchInput {
  url: string;
  method: string;
  params: Record<string, unknown>;
  body: Record<string, unknown>;
}

/**
 * Full `/r/Notion__*` fetcher branch (get-only). Returns null when the
 * request is not a Notion endpoint. Unknown `view` → table shape
 * (nt-view-unknown); record miss → placeholder (nt-peek-miss); zero-match
 * keyword → empty items array (nt-records-miss).
 */
export function createNotionFetcherBranch(db: NotionDatabase, clone: <T>(value: T) => T) {
  return function handleNotionBranch<T>(input: NotionFetcherBranchInput): { status: number; data: T } | null {
    const { url, method, params, body } = input;
    if (!url.includes('/r/Notion__')) {
      return null;
    }
    const normalizedMethod = method.toLowerCase();
    if (normalizedMethod !== 'get') {
      return { status: 1, data: clone({ ok: false, error: 'mock is read-only in P5a' }) as T };
    }
    const qs = url.includes('?') ? new URLSearchParams(url.split('?')[1]) : new URLSearchParams();
    const read = (key: string): string | undefined => {
      const value = params[key] ?? body[key] ?? qs.get(key);
      return value === undefined || value === null ? undefined : String(value);
    };

    if (url.includes('/r/Notion__viewConfigs')) {
      return { status: 0, data: clone({ items: db.viewConfigs, total: db.viewConfigs.length }) as T };
    }
    if (url.includes('/r/Notion__records')) {
      const rows = filterNotionRecords(db.records, read('keyword')).map(toNotionRecordRow);
      const viewRaw = read('view') ?? 'table';
      const view: NotionViewType = (['table', 'board', 'gallery', 'calendar', 'list'] as const).includes(viewRaw as NotionViewType)
        ? (viewRaw as NotionViewType)
        : 'table';
      if (view === 'board') {
        return { status: 0, data: clone(buildNotionBoardData(rows)) as T };
      }
      if (view === 'gallery') {
        const items = rows.filter((r) => r.hasCover);
        return { status: 0, data: clone({ items, total: items.length }) as T };
      }
      if (view === 'calendar') {
        return { status: 0, data: clone(buildNotionCalendarGrid(rows)) as T };
      }
      if (view === 'list') {
        const items = rows
          .filter((r) => r.status !== 'done')
          .sort((a, b) => a.title.localeCompare(b.title, 'zh'));
        return { status: 0, data: clone({ items, total: items.length }) as T };
      }
      const paged = paginateNotion(rows, Number(read('page') ?? 1) || 1, Number(read('perPage') ?? 10) || 10);
      return { status: 0, data: clone(paged) as T };
    }
    if (url.includes('/r/Notion__record')) {
      const id = (read('id') ?? '').replace(/^card-/, '');
      const found = db.records.find((r) => r.id === id);
      const record = found ?? { ...db.records[0], id, title: '未找到记录（占位样本）' };
      return { status: 0, data: clone(toNotionRecordRow(record)) as T };
    }
    return { status: 0, data: clone({ ok: false, error: 'unknown replica endpoint' }) as T };
  };
}
