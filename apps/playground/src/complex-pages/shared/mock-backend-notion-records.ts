/**
 * Notion-style multi-view database replica — record dataset seed + row
 * projection + shared read helpers (plan 2026-08-30-0614-1 P5b Phase 1
 * module split, antdpro/linear entity-module precedent).
 *
 * Deterministic (index arithmetic only) dataset seed, the `nt-*` chip/dot
 * row projection, I5 keyword matching (title + 属性值), and pagination.
 * Registries live in `mock-backend-notion-types.ts`, view-payload builders
 * in `mock-backend-notion-views.ts`, and write-operation cores in
 * `mock-backend-notion-writes.ts`.
 *
 * All copy is original self-authored Chinese; no "Notion" name, trademark,
 * or brand asset appears in the datasets.
 */

import type { NotionColor, NotionRecord, NotionRecordRow, NotionStatus } from './mock-backend-notion-types';
import { NOTION_CATEGORY_LABELS, NOTION_PEOPLE, NOTION_STATUS_META } from './mock-backend-notion-types';

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

export function notionWriteStamp(): string {
  return '2026-08-30 12:00';
}

export function createNotionRecords(): NotionRecord[] {
  const rows: NotionRecord[] = [];
  for (let i = 0; i < 32; i += 1) {
    const category = NOTION_CATEGORY_LABELS[i % NOTION_CATEGORY_LABELS.length];
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

/** I5 keyword matching: title + 属性值（id/分类/状态标签/负责人/标签）. */
export function filterNotionRecords(rows: NotionRecord[], keyword?: string): NotionRecord[] {
  const needle = typeof keyword === 'string' ? keyword.trim().toLowerCase() : '';
  if (!needle) return rows.slice();
  return rows.filter((r) => {
    const haystack = [
      r.id,
      r.title,
      r.category,
      NOTION_STATUS_META[r.status].label,
      r.person.name,
      r.tags.join(' '),
      r.date,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(needle);
  });
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
/* ── View-config overrides (I3/I4/I11 session 态载体) ──────────────────── */
