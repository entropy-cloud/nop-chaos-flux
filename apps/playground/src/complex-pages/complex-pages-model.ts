export type ComplexPageCategory =
  | 'data-lists'
  | 'master-detail'
  | 'complex-forms'
  | 'visualization'
  | 'content-showcase'
  | 'app-replica'
  | 'business-replication';

export interface ComplexPageCategoryMeta {
  id: ComplexPageCategory;
  label: string;
  blurb: string;
}

export const COMPLEX_PAGE_CATEGORY_ORDER: ComplexPageCategory[] = [
  'data-lists',
  'master-detail',
  'complex-forms',
  'visualization',
  'content-showcase',
  'app-replica',
  'business-replication',
];

export const COMPLEX_PAGE_CATEGORY_META: Record<ComplexPageCategory, ComplexPageCategoryMeta> = {
  'data-lists': {
    id: 'data-lists',
    label: '数据列表',
    blurb: '增删改查、树形导航、行内编辑、复杂查询 —— 列表类业务页面的典型形态。',
  },
  'master-detail': {
    id: 'master-detail',
    label: '主从详情',
    blurb: '左列表右详情、主记录 + 多个子表（Tab 与非 Tab 多种形式）联动。',
  },
  'complex-forms': {
    id: 'complex-forms',
    label: '复杂表单',
    blurb: '分步向导、多 fieldset 分组、字段间大量联动显隐 / 联动取数。',
  },
  visualization: {
    id: 'visualization',
    label: '数据可视化',
    blurb: '统计卡片 + 图表 + 明细表格组合的概览仪表盘。',
  },
  'content-showcase': {
    id: 'content-showcase',
    label: '内容门户',
    blurb:
      '营销 landing、文档站与门户首页——41 页型审计未覆盖的内容型页面，验证 content / layout 渲染器族在营销审美下的承载力。',
  },
  'app-replica': {
    id: 'app-replica',
    label: '外部应用复刻',
    blurb:
      '用 schema + 自定义 CSS 复刻真实外部应用（Sundial 待办）的界面，验证 flux 对外部设计系统的还原能力。',
  },
  'business-replication': {
    id: 'business-replication',
    label: '业务页面复刻',
    blurb:
      '复刻 ERP/AI/MES/商城/单据/IoT 真实业务页型（roadmap 21 页，D1-D4 分域设计），每页配套域 mock 后端与 focused e2e 三支柱验收。',
  },
};

export { COMPLEX_PAGE_ENTRIES, type ComplexPageEntry } from './complex-pages-entries';
