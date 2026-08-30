/**
 * Notion-style multi-view database replica — shared types + registries (plan
 * 2026-08-30-0614-1 P5b Phase 1 module split, antdpro/linear entity-module
 * precedent).
 *
 * Property/model types, the 10-color semantic palette (text/bg/icon
 * triplets), status metadata, people/board-column/category registries. Pure
 * declarations + deterministic registries only; datasets, builders, and
 * write cores live in the sibling `mock-backend-notion-*` modules.
 */

export type NotionColor =
  | 'default' | 'gray' | 'brown' | 'orange' | 'yellow'
  | 'green' | 'blue' | 'purple' | 'pink' | 'red';

export type NotionViewType = 'table' | 'board' | 'gallery' | 'calendar' | 'list';
export type NotionStatus = 'not_started' | 'in_progress' | 'review' | 'done';
export type NotionGroupProperty = 'status' | 'category' | 'person';

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
export const NOTION_STATUS_META: Record<NotionStatus, { label: string; color: NotionColor }> = {
  not_started: { label: '未开始', color: 'gray' },
  in_progress: { label: '进行中', color: 'blue' },
  review: { label: '评审中', color: 'yellow' },
  done: { label: '已完成', color: 'green' },
};
export const NOTION_STATUS_ORDER: NotionStatus[] = ['not_started', 'in_progress', 'review', 'done'];
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
export const NOTION_CATEGORY_LABELS: Array<{ label: string; color: NotionColor }> = [
  { label: '产品需求', color: 'blue' },
  { label: '技术优化', color: 'purple' },
  { label: '体验改进', color: 'green' },
  { label: '调研探索', color: 'orange' },
];
