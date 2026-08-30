/**
 * Grid-tracker replica — shared types + registries (plan
 * 2026-08-30-0614-2 P6a Phase 1, notion/linear entity-module precedent).
 *
 * Field/model types, the 9-color field palette (text/bg/icon triplets), the
 * 20-field registry with self-drawn glyph specs, collaborator and single-select
 * registries. Pure declarations + deterministic registries only; datasets,
 * builders, and view computations live in the sibling `mock-backend-airtable-*`
 * modules.
 *
 * All copy is original self-authored Chinese; zero trademark/brand assets
 * (field-type glyphs are semantic characters on colored squares).
 */

export type AtColor =
  | 'gray' | 'red' | 'orange' | 'yellow' | 'green'
  | 'teal' | 'blue' | 'purple' | 'pink';

export interface AtCollaborator {
  name: string;
  initials: string;
  hue: AtColor;
}

/** One grid field: row key + label + self-drawn glyph spec + flags. */
export interface AtFieldMeta {
  name: string;
  label: string;
  /** 中文型别名（表头 tooltip / 型别清单 / hide-fields 面板共用） */
  typeLabel: string;
  /** 自绘型别 glyph：语义字符落在彩色小方块上（不复制原图） */
  glyph: string;
  hue: AtColor;
  /** 主字段不可隐藏（🌐 官方证实） */
  primary?: boolean;
  /** 自动字段只读灰显 */
  readonly?: boolean;
}

export interface AtRecord {
  id: string;
  autoNo: number;
  title: string;
  notes: string;
  category: string;
  tags: string[];
  date: string;
  amount: number;
  score: number;
  progress: number;
  done: boolean;
  attachmentTones: AtColor[];
  owner: AtCollaborator;
  email: string;
  site: string;
  phone: string;
  durationSeconds: number;
  rating: number;
  barcode: string;
  createdAt: string;
  modifiedAt: string;
}

/** Row projection with precomputed `at-*` chip/avatar/glyph classes and labels. */
export interface AtRecordRow extends AtRecord {
  categoryChipClass: string;
  tagChips: Array<{ text: string; chipClass: string }>;
  ownerAvatarClass: string;
  amountLabel: string;
  progressLabel: string;
  durationLabel: string;
  ratingStars: string;
  ratingOffStars: string;
  attachmentThumbs: Array<{ toneClass: string; index: number }>;
  attachmentExtra: number;
  createdLabel: string;
  modifiedLabel: string;
  dateLabel: string;
}

export interface AtSummary {
  count: number;
  amountSum: number;
  progressAvg: number;
  doneCount: number;
  ratingAvg: number;
  /** summary bar 预计算展示标签（货币/百分比/均值格式化服务端完成） */
  amountSumLabel: string;
  progressAvgLabel: string;
  ratingAvgLabel: string;
}

export interface AtGroup {
  key: string;
  label: string;
  chipClass: string;
  count: number;
  amountSum: number;
  doneCount: number;
  /** 组内金额预计算标签（组 summary 行直接消费） */
  amountSumLabel: string;
  /** 折叠为零动作静态形态：样本身 always-expanded + chevron 入口注记 */
  collapsed: boolean;
  /** 组内前几行样本（分组态样本不需要全量 30 行重复渲染） */
  sample: AtRecordRow[];
}

export interface AtGroupsPayload {
  groups: AtGroup[];
  total: number;
}

export interface AirtableDatabase {
  records: AtRecord[];
}

/** Field-metadata projection served alongside the grid payload (hide-fields
 *  panel + field-menu type lists consume it — mirrors Airtable's view payload
 *  carrying its field registry). */
export interface AtFieldMetaRow extends AtFieldMeta {
  glyphClass: string;
  /** 面板 toggle 形态样本：全部可见；隐藏生效归 P6b（D2② 注记） */
  visible: boolean;
  /** 主字段行注记：不可隐藏（🌐） */
  lockNote?: string;
}

/** 9-color field palette, three sets per color (text/bg/icon). */
export const AT_PALETTE: Record<AtColor, { text: string; bg: string; icon: string }> = {
  gray: { text: '#6b6967', bg: '#eeedec', icon: '#908e8b' },
  red: { text: '#cf2f2f', bg: '#fbe4e4', icon: '#d93a3a' },
  orange: { text: '#d75a00', bg: '#fee9d9', icon: '#ee6b00' },
  yellow: { text: '#9a7d00', bg: '#fdf6d8', icon: '#d9ae00' },
  green: { text: '#228e22', bg: '#dbeadb', icon: '#2d9f2d' },
  teal: { text: '#0a8f8f', bg: '#d6efee', icon: '#12a5a5' },
  blue: { text: '#1d6ff2', bg: '#dbe8fc', icon: '#2d7ff9' },
  purple: { text: '#7f35d0', bg: '#e9e1f9', icon: '#8f4be8' },
  pink: { text: '#d53ca8', bg: '#f9e3f2', icon: '#e041b0' },
};

/** 20-field registry — the trimmed 19-type-family coverage list (D3 裁剪清单终态). */
export const AT_FIELDS: AtFieldMeta[] = [
  { name: 'title', label: '任务名称', typeLabel: '单行文本', glyph: 'A', hue: 'gray', primary: true },
  { name: 'notes', label: '进展说明', typeLabel: '长文本', glyph: '≡', hue: 'teal' },
  { name: 'category', label: '阶段', typeLabel: '单选', glyph: '◉', hue: 'yellow' },
  { name: 'tags', label: '标签', typeLabel: '多选', glyph: '❰❱', hue: 'orange' },
  { name: 'date', label: '截止日期', typeLabel: '日期', glyph: '▦', hue: 'pink' },
  { name: 'amount', label: '预算', typeLabel: '货币', glyph: '¥', hue: 'green' },
  { name: 'score', label: '工作量', typeLabel: '数字', glyph: '#', hue: 'gray' },
  { name: 'progress', label: '完成度', typeLabel: '百分比', glyph: '%', hue: 'teal' },
  { name: 'done', label: '已交付', typeLabel: '复选框', glyph: '✓', hue: 'blue' },
  { name: 'attachments', label: '附件', typeLabel: '附件', glyph: '⌘', hue: 'purple' },
  { name: 'owner', label: '负责人', typeLabel: '协作人', glyph: '☺', hue: 'red' },
  { name: 'email', label: '联系邮箱', typeLabel: '邮箱', glyph: '@', hue: 'blue' },
  { name: 'site', label: '相关链接', typeLabel: 'URL', glyph: '⇗', hue: 'teal' },
  { name: 'phone', label: '联系电话', typeLabel: '电话', glyph: '☏', hue: 'green' },
  { name: 'duration', label: '累计工时', typeLabel: '时长', glyph: '⏱', hue: 'orange' },
  { name: 'rating', label: '优先评分', typeLabel: '评分（近似承载）', glyph: '★', hue: 'yellow' },
  { name: 'barcode', label: '资产条码', typeLabel: '条码', glyph: '⦀', hue: 'gray' },
  { name: 'autoNo', label: '自动编号', typeLabel: '自动编号', glyph: 'Nº', hue: 'gray', readonly: true },
  { name: 'createdAt', label: '创建时间', typeLabel: '创建时间', glyph: '◷', hue: 'gray', readonly: true },
  { name: 'modifiedAt', label: '最后修改', typeLabel: '最后修改时间', glyph: '🕥', hue: 'gray', readonly: true },
];

export const AT_PEOPLE: AtCollaborator[] = [
  { name: '文清鹤', initials: '文', hue: 'blue' },
  { name: '韩知序', initials: '韩', hue: 'green' },
  { name: '陆明澈', initials: '陆', hue: 'purple' },
  { name: '姚霏然', initials: '姚', hue: 'orange' },
  { name: '程以宁', initials: '程', hue: 'pink' },
];

export const AT_CATEGORY_LABELS: Array<{ label: string; hue: AtColor }> = [
  { label: '需求评审', hue: 'blue' },
  { label: '设计排期', hue: 'purple' },
  { label: '开发进行', hue: 'orange' },
  { label: '验收发布', hue: 'green' },
];

export const AT_TAG_LABELS: Array<{ label: string; hue: AtColor }> = [
  { label: '客户端', hue: 'teal' },
  { label: '服务端', hue: 'blue' },
  { label: '体验', hue: 'pink' },
  { label: '性能', hue: 'orange' },
  { label: '安全', hue: 'red' },
  { label: '文档', hue: 'gray' },
];

/** 分组端点唯一支持的分组字段（其余 → 平铺兜底 at-group-unknown）。 */
export const AT_GROUP_FIELDS = ['category'] as const;
export type AtGroupField = (typeof AT_GROUP_FIELDS)[number];
