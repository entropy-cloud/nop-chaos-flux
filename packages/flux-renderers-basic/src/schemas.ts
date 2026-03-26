import type { BaseSchema, DynamicRendererSchema } from '@nop-chaos/flux-core';

export interface PageSchema extends BaseSchema {
  type: 'page';
  title?: string;
  body?: BaseSchema[];
}

export interface ContainerSchema extends BaseSchema {
  type: 'container';
  /** 布局方向：row（默认）| column */
  direction?: 'row' | 'column';
  /** 是否换行（仅 row 方向有效） */
  wrap?: boolean;
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 间距 */
  gap?: number | string;
  body?: BaseSchema[];
}

export interface TextSchema extends BaseSchema {
  type: 'text';
  /** 文本内容，支持 ${expression} 表达式 */
  text?: string;
  /** HTML 标签，默认 span */
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
}

export interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
  /** 按钮样式变体 */
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  /** 按钮尺寸 */
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean | string;
}

export interface IconSchema extends BaseSchema {
  type: 'icon';
  /** 图标名称（kebab-case） */
  icon?: string;
}

export interface BadgeSchema extends BaseSchema {
  type: 'badge';
  text?: string;
  level?: 'info' | 'success' | 'warning' | 'danger';
}

export type { DynamicRendererSchema };
