import { BaseSchema, SchemaClassName } from './common';

/**
 * GridColumn 列配置
 */
export interface GridColumn {
  /** 列宽度 (1-12) */
  columnClassName?: SchemaClassName;
  /** 子内容 */
  body?: unknown;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否隐藏表达式 */
  hiddenOn?: string;
  /** 是否显示 */
  visible?: boolean;
  /** 是否显示表达式 */
  visibleOn?: string;
}

/**
 * GridSchema 格子布局
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/grid
 */
export interface GridSchema extends BaseSchema {
  /** 指定为 grid 渲染器 */
  type: 'grid';
  /** 列集合 */
  columns: GridColumn[];
  /** 水平间距 */
  gap?: 'xs' | 'sm' | 'base' | 'none' | 'md' | 'lg';
  /** 垂直对齐方式 */
  valign?: 'top' | 'middle' | 'bottom' | 'between';
  /** 水平对齐方式 */
  align?: 'left' | 'right' | 'between' | 'center';
}

/**
 * HBoxColumn 水平布局列配置
 */
export interface HBoxColumn {
  /** 列宽度 */
  columnClassName?: SchemaClassName;
  /** 子内容 */
  body?: unknown;
  /** 宽度 */
  width?: number | string;
  /** 自适应拉伸 */
  valine?: boolean;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否隐藏表达式 */
  hiddenOn?: string;
  /** 是否显示 */
  visible?: boolean;
  /** 是否显示表达式 */
  visibleOn?: string;
}

/**
 * HBoxSchema 水平布局
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/hbox
 */
export interface HBoxSchema extends BaseSchema {
  /** 指定为 hbox 渲染器 */
  type: 'hbox';
  /** 列集合 */
  columns: HBoxColumn[];
  /** 配置子表单项默认的展示方式 */
  subFormMode?: 'normal' | 'inline' | 'horizontal';
  /** 水平排版的左右宽度占比 */
  subFormHorizontal?: {
    left?: number;
    right?: number;
    leftFixed?: 'xs' | 'sm' | 'md' | 'lg' | number;
  };
  /** 水平间距 */
  gap?: 'xs' | 'sm' | 'base' | 'none' | 'md' | 'lg';
  /** 垂直对齐方式 */
  valign?: 'top' | 'middle' | 'bottom' | 'between';
  /** 水平对齐方式 */
  align?: 'left' | 'right' | 'between' | 'center';
}

/**
 * HboxRow 垂直布局行配置
 */
export interface HboxRow {
  /** 行 CSS 类名 */
  rowClassName?: SchemaClassName;
  /** 子内容 */
  body?: unknown;
  /** 是否隐藏 */
  hidden?: boolean;
  /** 是否隐藏表达式 */
  hiddenOn?: string;
  /** 是否显示 */
  visible?: boolean;
  /** 是否显示表达式 */
  visibleOn?: string;
}

/**
 * VBoxSchema 垂直布局
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/vbox
 */
export interface VBoxSchema extends BaseSchema {
  /** 指定为 vbox 渲染器 */
  type: 'vbox';
  /** 行集合 */
  rows?: HboxRow[];
}
