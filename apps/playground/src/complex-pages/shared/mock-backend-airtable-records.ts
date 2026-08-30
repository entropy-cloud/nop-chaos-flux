/**
 * Grid-tracker replica — record dataset factory + row projection + query
 * helpers (plan 2026-08-30-0614-2 P6a Phase 1, notion records-module
 * precedent).
 *
 * 33 deterministic records covering the trimmed 19-type-family list (D3
 * 裁剪清单终态): single/long text, single/multi select, date, number,
 * currency, percent, checkbox, attachment, collaborator, email, url, phone,
 * duration, rating (badge approximation), barcode, autonumber + created/
 * modified read-only fields. Pagination: default page size 10 → ≥3 pages.
 */

import {
  AT_CATEGORY_LABELS,
  AT_FIELDS,
  AT_PEOPLE,
  AT_TAG_LABELS,
  type AtColor,
  type AtFieldMetaRow,
  type AtRecord,
  type AtRecordRow,
  type AtSummary,
} from './mock-backend-airtable-types';

const TITLES = [
  '首页信息流卡片双列布局切换',
  '会员结算页金额精度对齐',
  '移动端启动骨架屏时长优化',
  '权限中心角色继承链路重构',
  '表格筛选条件持久化到视图',
  '通知中心未读红点去抖策略',
  '文档协作光标颜色区分成员',
  '上传组件断点续传能力',
  '搜索联想词服务端缓存',
  '图表主题令牌与暗色映射',
  '表单校验错误定位滚动',
  '移动端手势返回路径统一',
  '任务日历跨月拖拽落格',
  '看板列宽记忆与还原',
  '消息推送免打扰时段配置',
  '数据导出异步任务进度条',
  '多语言货币单位格式化',
  '键盘快捷键帮助面板聚合',
  '登录页图形验证码降级',
  '附件预览水印防截图',
  '审批流会签节点并行处理',
  '日志检索高亮分页优化',
  '布局栅格响应式断点校准',
  '组件库图标按需加载',
  '操作审计日志防篡改链',
  '邀请成员邮件模板美化',
  '空间配额用量预警通知',
  '客户端错误上报聚合去重',
  '分享链接访问密码增强',
  '模板中心行业分类重组',
  '回收站保留期策略调整',
  '国际化日期顺序区域化',
  '消息输入框草稿云端同步',
];

const NOTE_SENTENCES = [
  '已完成方案评审，等待排期确认；风险点集中在旧数据迁移与兼容读取，需要在灰度阶段双写观察一周。',
  '第一轮联调完成，剩余两处边界条件待修复；性能基线已采集，目标在本轮迭代内回落到阈值以内。',
  '设计稿已定稿并同步研发，组件拆分完成八成；缺失的高保真样本将在下个设计周补齐。',
  '已上线灰度 10%，核心指标平稳；继续观察两周后全量，期间保留一键回滚开关。',
  '技术方案评审通过，接口契约冻结；后续变更需要走变更评审流程并同步受影响方。',
  '待依赖方排期，当前阻塞在账号体系打通；建议本周对齐一次接口时间窗口。',
];

const BARCODES = [
  'AT-8801-00342',
  'AT-8802-00517',
  'AT-8803-00128',
  'AT-8804-00773',
  'AT-8805-00264',
  'AT-8806-00981',
];

function pick<T>(list: readonly T[], index: number): T {
  return list[index % list.length];
}

export function createAirtableRecords(): AtRecord[] {
  return TITLES.map((title, i) => {
    const seq = i + 101;
    const category = pick(AT_CATEGORY_LABELS, i);
    const tags = [pick(AT_TAG_LABELS, i), pick(AT_TAG_LABELS, i + 2)];
    if (i % 4 === 0) tags.push(pick(AT_TAG_LABELS, i + 4));
    const owner = pick(AT_PEOPLE, i);
    const day = 1 + ((i * 3) % 27);
    const month = i % 2 === 0 ? '08' : '09';
    const hour = String(8 + (i % 12)).padStart(2, '0');
    const minute = String((i * 7) % 60).padStart(2, '0');
    const createdDay = Math.max(1, day - 3 - (i % 4));
    const attachmentCount = i % 3;
    return {
      id: `AT-${seq}`,
      autoNo: i + 1,
      title,
      notes: pick(NOTE_SENTENCES, i),
      category: category.label,
      tags: tags.map((t) => t.label),
      date: `2026-${month}-${String(day).padStart(2, '0')}`,
      amount: 1200 + ((i * 761) % 18000),
      score: 1 + ((i * 3) % 9),
      progress: i % 5 === 0 ? 1 : Math.round((((i * 13) % 20) / 20) * 100) / 100,
      done: i % 6 === 0,
      attachmentTones: Array.from({ length: attachmentCount }, (_, k): AtColor =>
        pick(AT_TAG_LABELS, i + k).hue),
      owner,
      email: `${owner.name === '文清鹤' ? 'wen' : 'member'}${seq}@team.example.com`,
      site: `https://tracker.example.com/req/${seq}`,
      phone: `138${String(10000000 + i * 137).slice(0, 8)}`,
      durationSeconds: 3600 * (2 + (i % 20)) + 60 * ((i * 11) % 60) + (i * 17) % 60,
      rating: 1 + (i % 5),
      barcode: pick(BARCODES, i),
      createdAt: `2026-07-${String(createdDay).padStart(2, '0')} ${hour}:${minute}`,
      modifiedAt: `2026-${month}-${String(day).padStart(2, '0')} ${hour}:${minute}`,
    };
  });
}

function formatDuration(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatAmount(value: number): string {
  return `¥${value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatAirtableAmount(value: number): string {
  return formatAmount(value);
}

function formatProgress(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatDateLabel(value: string): string {
  const [y, m, d] = value.split('-');
  if (!y || !m || !d) return value;
  return `${y}年${Number(m)}月${Number(d)}日`;
}

function chipClassOf(label: string): string {
  const hue = AT_CATEGORY_LABELS.find((c) => c.label === label)?.hue ?? 'gray';
  return `at-chip at-chip-${hue}`;
}

export function toAirtableRecordRow(record: AtRecord): AtRecordRow {
  const thumbCount = record.attachmentTones.length;
  return {
    ...record,
    categoryChipClass: chipClassOf(record.category),
    tagChips: record.tags.map((text) => ({
      text,
      chipClass: `at-chip at-chip-${AT_TAG_LABELS.find((t) => t.label === text)?.hue ?? 'gray'}`,
    })),
    ownerAvatarClass: `at-avatar at-avatar-${record.owner.hue}`,
    amountLabel: formatAmount(record.amount),
    progressLabel: formatProgress(record.progress),
    durationLabel: formatDuration(record.durationSeconds),
    ratingStars: '★★★★★'.slice(0, record.rating),
    ratingOffStars: '☆☆☆☆☆'.slice(0, 5 - record.rating),
    attachmentThumbs: record.attachmentTones.map((tone, k) => ({
      toneClass: `at-thumb at-thumb-${tone}`,
      index: k,
    })),
    attachmentExtra: Math.max(0, thumbCount - 3),
    createdLabel: record.createdAt,
    modifiedLabel: record.modifiedAt,
    dateLabel: formatDateLabel(record.date),
  } as AtRecordRow;
}

export function toAirtableFieldRows(): AtFieldMetaRow[] {
  return AT_FIELDS.map((field) => ({
    ...field,
    glyphClass: `at-glyph at-glyph-${field.hue}`,
    visible: true,
    lockNote: field.primary ? '主字段不可隐藏' : undefined,
  }));
}

export function filterAirtableRecords(records: AtRecord[], keyword?: string): AtRecord[] {
  const key = keyword?.trim().toLowerCase() ?? '';
  if (!key) return records;
  return records.filter(
    (r) =>
      r.title.toLowerCase().includes(key) ||
      r.notes.toLowerCase().includes(key) ||
      r.category.toLowerCase().includes(key) ||
      r.id.toLowerCase().includes(key) ||
      r.owner.name.toLowerCase().includes(key),
  );
}

export function paginateAirtable(rows: AtRecord[], page: number, perPage: number): {
  items: AtRecordRow[];
  total: number;
  page: number;
  perPage: number;
  pages: number;
} {
  const size = Math.max(1, perPage);
  const current = Math.max(1, page);
  const start = (current - 1) * size;
  const items = rows.slice(start, start + size).map(toAirtableRecordRow);
  return { items, total: rows.length, page: current, perPage: size, pages: Math.ceil(rows.length / size) };
}

export function summarizeAirtable(rows: AtRecord[]): AtSummary {
  const count = rows.length;
  if (count === 0) {
    return {
      count: 0,
      amountSum: 0,
      progressAvg: 0,
      doneCount: 0,
      ratingAvg: 0,
      amountSumLabel: formatAmount(0),
      progressAvgLabel: formatProgress(0),
      ratingAvgLabel: '0',
    };
  }
  const amountSum = rows.reduce((sum, r) => sum + r.amount, 0);
  const progressAvg = rows.reduce((sum, r) => sum + r.progress, 0) / count;
  const doneCount = rows.filter((r) => r.done).length;
  const ratingAvg = rows.reduce((sum, r) => sum + r.rating, 0) / count;
  return {
    count,
    amountSum,
    progressAvg: Math.round(progressAvg * 100) / 100,
    doneCount,
    ratingAvg: Math.round(ratingAvg * 10) / 10,
    amountSumLabel: formatAmount(amountSum),
    progressAvgLabel: formatProgress(progressAvg),
    ratingAvgLabel: String(Math.round(ratingAvg * 10) / 10),
  };
}
