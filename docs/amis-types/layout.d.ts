import { BaseSchema, SchemaClassName, SchemaTpl } from './common';

/**
 * TplSchema 模板渲染器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/docs/concepts/template
 */
export interface TplSchema extends BaseSchema {
  /** 指定为 tpl/html 渲染器 */
  type: 'tpl' | 'html';
  /** 模板内容 */
  tpl?: SchemaTpl;
  /** HTML 内容 */
  html?: SchemaTpl;
  /** 文本内容 */
  text?: SchemaTpl;
  /** 原始 HTML */
  raw?: string;
  /** 是否内联 */
  inline?: boolean;
  /** 包裹组件 */
  wrapperComponent?: string;
  /** 角标配置 */
  badge?: unknown;
}

/**
 * PlainSchema 纯文本
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/plain
 */
export interface PlainSchema extends BaseSchema {
  /** 指定为 plain/text 渲染器 */
  type: 'plain' | 'text';
  /** 文本内容 */
  text?: SchemaTpl;
  /** 原始值 */
  value?: unknown;
  /** 占位符 */
  placeholder?: string;
  /** 是否内联 */
  inline?: boolean;
  /** 包裹组件 */
  wrapperComponent?: string;
}

/**
 * LinkSchema 链接
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/link
 */
export interface LinkSchema extends BaseSchema {
  /** 指定为 link 渲染器 */
  type: 'link';
  /** 链接地址 */
  href?: string;
  /** 链接文字 */
  body?: SchemaTpl;
  /** 链接文字 (别名) */
  label?: SchemaTpl;
  /** 链接标题 */
  title?: string;
  /** 链接级别 */
  level?: 'info' | 'success' | 'warning' | 'danger' | 'primary';
  /** 是否显示下划线 */
  underline?: boolean;
  /** 是否新窗口打开 */
  blank?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 图标 */
  icon?: string;
  /** 是否为外部链接 */
  htmlTarget?: string;
}

/**
 * DividerSchema 分隔线
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/divider
 */
export interface DividerSchema extends BaseSchema {
  /** 指定为 divider 渲染器 */
  type: 'divider';
  /** 分隔线样式 */
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  /** 分隔线颜色 */
  color?: string;
  /** 分隔线方向 */
  direction?: 'horizontal' | 'vertical';
  /** 分隔线宽度 */
  rotate?: number;
  /** 标题 */
  title?: string;
  /** 标题位置 */
  titlePosition?: 'left' | 'center' | 'right';
  /** 是否点状 */
  dashed?: boolean;
}

/**
 * ContainerSchema 容器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/container
 */
export interface ContainerSchema extends BaseSchema {
  /** 指定为 container 渲染器 */
  type: 'container';
  /** 子内容 */
  body?: unknown;
  /** 容器样式 */
  style?: React.CSSProperties;
  /** 容器包裹组件 */
  wrapperComponent?: string;
  /** 角标配置 */
  badge?: unknown;
}

/**
 * WrapperSchema 包裹容器
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/wrapper
 */
export interface WrapperSchema extends BaseSchema {
  /** 指定为 wrapper 渲染器 */
  type: 'wrapper';
  /** 子内容 */
  body?: unknown;
  /** 容器大小 */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  /** 包裹组件 */
  wrapperComponent?: string;
  /** 角标配置 */
  badge?: unknown;
}

/**
 * PanelSchema 面板
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/panel
 */
export interface PanelSchema extends BaseSchema {
  /** 指定为 panel 渲染器 */
  type: 'panel';
  /** 标题 */
  title?: SchemaTpl;
  /** 子内容 */
  body?: unknown;
  /** 底部 */
  footer?: unknown;
  /** 是否固定底部 */
  affixFooter?: boolean;
  /** 面板 CSS 类名 */
  panelClassName?: SchemaClassName;
  /** Header CSS 类名 */
  headerClassName?: SchemaClassName;
  /** Body CSS 类名 */
  bodyClassName?: SchemaClassName;
  /** Footer CSS 类名 */
  footerClassName?: SchemaClassName;
  /** 子模式 */
  subFormMode?: 'normal' | 'horizontal' | 'inline';
}

/**
 * FlexSchema 弹性布局
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/flex
 */
export interface FlexSchema extends BaseSchema {
  /** 指定为 flex 渲染器 */
  type: 'flex';
  /** 子元素 */
  items?: unknown[];
  /** 主轴方向 */
  direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
  /** 主轴对齐 */
  justify?: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
  /** 交叉轴对齐 */
  alignItems?: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
  /** 是否换行 */
  wrap?: 'nowrap' | 'wrap' | 'wrap-reverse';
  /** 间距 */
  gap?: number | string;
}

/**
 * EachSchema 循环渲染
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/each
 */
export interface EachSchema extends BaseSchema {
  /** 指定为 each 渲染器 */
  type: 'each';
  /** 数据源 */
  items?: unknown;
  /** 子节点 */
  itemSchema?: unknown;
  /** 占位符 */
  placeholder?: string;
}
