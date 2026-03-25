import { BaseSchema, SchemaApi, SchemaClassName, SchemaTpl } from './common';

/**
 * TabsSchema 标签页
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/tabs
 */
export interface TabsSchema extends BaseSchema {
  /** 指定为 tabs 渲染器 */
  type: 'tabs';
  /** 标签页集合 */
  tabs?: TabSchema[];
  /** 默认激活的标签页 */
  defaultKey?: number | string;
  /** 激活的标签页 */
  activeKey?: number | string;
  /** 标签页模式 */
  mode?: '' | 'line' | 'card' | 'radio' | 'vertical' | 'chrome' | 'simple' | 'strong' | 'tiled' | 'sidebar';
  /** 是否显示增减按钮 */
  showTip?: boolean;
  /** 增加按钮文案 */
  addBtnText?: string;
  /** 是否可新增 */
  addable?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 是否可拖拽 */
  draggable?: boolean;
  /** 是否可编辑 */
  editable?: boolean;
  /** 工具栏 */
  toolbar?: unknown;
  /** Tab CSS 类名 */
  tabsClassName?: SchemaClassName;
  /** 内容 CSS 类名 */
  contentClassName?: SchemaClassName;
  /** 链接样式 */
  linksClassName?: SchemaClassName;
}

/**
 * TabSchema 标签页项
 */
export interface TabSchema {
  /** 标签标题 */
  title: SchemaTpl;
  /** 标签内容 */
  body?: unknown;
  /** 标签 key */
  key?: string | number;
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否可关闭 */
  closable?: boolean;
  /** 图标 */
  icon?: string;
  /** Tab CSS 类名 */
  tabClassName?: SchemaClassName;
  /** 事件配置 */
  [key: string]: unknown;
}

/**
 * CollapseSchema 折叠面板
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/collapse
 */
export interface CollapseSchema extends BaseSchema {
  /** 指定为 collapse 渲染器 */
  type: 'collapse';
  /** 面板标题 */
  header?: SchemaTpl;
  /** 面板内容 */
  body?: unknown;
  /** 是否展开 */
  collapsed?: boolean;
  /** 是否可折叠 */
  collapsable?: boolean;
  /** 展开图标位置 */
  expandIconPosition?: 'left' | 'right';
  /** 展开图标 */
  expandIcon?: string;
  /** Header CSS 类名 */
  headerClassName?: SchemaClassName;
  /** Body CSS 类名 */
  bodyClassName?: SchemaClassName;
}

/**
 * CollapseGroupSchema 折叠面板组
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/collapse-group
 */
export interface CollapseGroupSchema extends BaseSchema {
  /** 指定为 collapse-group 渲染器 */
  type: 'collapse-group';
  /** 面板集合 */
  body?: unknown;
  /** 手风琴模式 */
  accordion?: boolean;
  /** 是否展开 */
  expandIconPosition?: 'left' | 'right';
  /** 展开图标 */
  expandIcon?: string;
}

/**
 * StepsSchema 步骤条
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/steps
 */
export interface StepsSchema extends BaseSchema {
  /** 指定为 steps 渲染器 */
  type: 'steps';
  /** 步骤集合 */
  steps?: StepSchema[];
  /** 当前步骤 */
  current?: number;
  /** 步骤状态 */
  status?: 'wait' | 'process' | 'finish' | 'error';
  /** 步骤模式 */
  mode?: 'horizontal' | 'vertical';
  /** 标签位置 */
  labelPlacement?: 'horizontal' | 'vertical';
  /** 步骤大小 */
  size?: 'sm' | 'md' | 'lg';
  /** 进度百分比 */
  progressDot?: boolean;
}

/**
 * StepSchema 步骤项
 */
export interface StepSchema {
  /** 步骤标题 */
  title: SchemaTpl;
  /** 步骤描述 */
  subtitle?: SchemaTpl;
  /** 步骤图标 */
  icon?: string;
  /** 步骤状态 */
  status?: 'wait' | 'process' | 'finish' | 'error';
  /** 步骤内容 */
  body?: unknown;
}

/**
 * TimelineSchema 时间线
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/timeline
 */
export interface TimelineSchema extends BaseSchema {
  /** 指定为 timeline 渲染器 */
  type: 'timeline';
  /** 时间线集合 */
  items?: TimelineItemSchema[];
  /** 时间线模式 */
  mode?: 'left' | 'right' | 'alternate';
  /** 时间线方向 */
  direction?: 'horizontal' | 'vertical';
  /** 是否反转 */
  reverse?: boolean;
}

/**
 * TimelineItemSchema 时间线项
 */
export interface TimelineItemSchema {
  /** 时间 */
  time?: SchemaTpl;
  /** 标题 */
  title?: SchemaTpl;
  /** 内容 */
  detail?: SchemaTpl;
  /** 图标 */
  icon?: string;
  /** 颜色 */
  color?: string;
  /** 节点类型 */
  type?: 'dot' | 'solid';
}

/**
 * AnchorNavSchema 锚点导航
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/anchor-nav
 */
export interface AnchorNavSchema extends BaseSchema {
  /** 指定为 anchor-nav 渲染器 */
  type: 'anchor-nav';
  /** 锚点区域集合 */
  links?: AnchorNavSectionSchema[];
  /** 导航位置 */
  direction?: 'horizontal' | 'vertical';
  /** 默认激活区域 */
  active?: string;
}

/**
 * AnchorNavSectionSchema 锚点区域
 */
export interface AnchorNavSectionSchema {
  /** 区域标题 */
  title: SchemaTpl;
  /** 区域锚点 */
  href?: string;
  /** 区域内容 */
  body?: unknown;
}

/**
 * PortletSchema 窗口标签页
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/portlet
 */
export interface PortletSchema extends BaseSchema {
  /** 指定为 portlet 渲染器 */
  type: 'portlet';
  /** 标签页集合 */
  tabs?: TabSchema[];
  /** 标题 */
  title?: SchemaTpl;
  /** 是否显示标题 */
  showHeader?: boolean;
  /** 工具栏 */
  toolbar?: unknown;
  /** Tab CSS 类名 */
  tabsClassName?: SchemaClassName;
}

/**
 * WizardSchema 向导
 * 文档: https://aisuda.bce.baidu.com/amis/zh-CN/components/wizard
 */
export interface WizardSchema extends BaseSchema {
  /** 指定为 wizard 渲染器 */
  type: 'wizard';
  /** 步骤集合 */
  steps?: WizardStepSchema[];
  /** 初始化 API */
  initApi?: SchemaApi;
  /** 提交 API */
  api?: SchemaApi;
  /** 异步提交 API */
  asyncApi?: SchemaApi;
  /** 步骤模式 */
  mode?: 'horizontal' | 'vertical';
  /** 是否可回退 */
  actionPrevLabel?: string;
  /** 下一步按钮文案 */
  actionNextLabel?: string;
  /** 完成按钮文案 */
  actionFinishLabel?: string;
  /** 是否立即跳转 */
  redirect?: string;
}

/**
 * WizardStepSchema 向导步骤
 */
export interface WizardStepSchema {
  /** 步骤标题 */
  title?: SchemaTpl;
  /** 步骤内容 */
  body?: unknown;
  /** 步骤 API */
  api?: SchemaApi;
  /** 表单模式 */
  mode?: 'normal' | 'horizontal' | 'inline';
}


