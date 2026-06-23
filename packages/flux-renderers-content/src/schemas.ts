import type { ActionSchema, BaseSchema, SchemaInput } from '@nop-chaos/flux-core';

export interface SeparatorSchema extends BaseSchema {
  type: 'separator';
  /** 分隔方向，默认 'horizontal' */
  orientation?: 'horizontal' | 'vertical';
  /** 纯装饰性分隔（无语义），透传 ui Separator */
  decorative?: boolean;
  // `label` 继承 BaseSchema（string）。renderer definition 用 value-or-region 规则，
  // 使其既可写纯文本也可写受限 schema（与 field renderer 的 label 约定一致）。
}

export type SpinnerSize = 'sm' | 'md' | 'lg';

export interface SpinnerSchema extends BaseSchema {
  type: 'spinner';
  // `label` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
  /** 指示符尺寸，默认 'md' */
  size?: SpinnerSize;
  /** 节点可见性由 meta.visible 承载（frozen META_FIELDS）；为 false 时整节点不渲染 */
}

export type ProgressVariant = 'default' | 'success' | 'warning' | 'danger';

export interface ProgressSchema extends BaseSchema {
  type: 'progress';
  /** 当前进度值 */
  value?: number;
  /** 最大值，默认 100 */
  max?: number;
  // `label` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
  /** 视觉变体，默认 'default' */
  variant?: ProgressVariant;
  /** 是否显示数值，默认 false */
  showValue?: boolean;
}

export interface EmptySchema extends BaseSchema {
  type: 'empty';
  /** 空态标题（value-or-region） */
  title?: SchemaInput;
  /** 空态描述（value-or-region） */
  description?: SchemaInput;
  /** 空态插图资源标识（lucide 图标名或图片 URL） */
  image?: string;
  /** 空态 CTA 操作区 region */
  actions?: SchemaInput;
}

export type CardVariant = 'default' | 'sm';

export interface CardSchema extends BaseSchema {
  type: 'card';
  /** 卡片标题（value-or-region） */
  title?: SchemaInput;
  /** 顶部壳 region */
  header?: SchemaInput;
  /** 主内容 region */
  body?: SchemaInput;
  /** 尾部 region */
  footer?: SchemaInput;
  /** 操作区 region（渲染到 footer 区域的 CTA 行） */
  actions?: SchemaInput;
  /** 顶部图片 URL */
  image?: string;
  /** 视觉变体，默认 'default'（映射 ui Card size） */
  variant?: CardVariant;
  onClick?: ActionSchema;
}
