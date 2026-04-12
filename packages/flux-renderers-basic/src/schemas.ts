import type { BaseSchema, DynamicRendererSchema, SchemaInput, SchemaValue } from '@nop-chaos/flux-core';

export interface PageSchema extends BaseSchema {
  type: 'page';
  title?: string;
   data?: Record<string, any>;
   statusPath?: string;
  body?: BaseSchema[];
   header?: BaseSchema[];
   footer?: BaseSchema[];
}

export interface DialogSchema extends BaseSchema {
  type: 'dialog';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  open?: boolean;
  defaultOpen?: boolean;
  statusPath?: string;
  closeOnOutsideClick?: boolean;
}

export interface DrawerSchema extends BaseSchema {
  type: 'drawer';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  open?: boolean;
  defaultOpen?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
  statusPath?: string;
}

export interface TabsItemSchema {
  key?: string | number;
  value?: string | number;
  title?: string;
  label?: string;
  disabled?: boolean | string;
  titleRegionKey?: string;
  bodyRegionKey?: string;
  toolbarRegionKey?: string;
}

export interface TabsSchema extends BaseSchema {
  type: 'tabs';
  items?: Array<Record<string, any>>;
  value?: string | number;
  defaultValue?: string | number;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  statusPath?: string;
  toolbar?: BaseSchema | BaseSchema[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'line';
}

export interface ContainerSchema extends BaseSchema {
  type: 'container';
  /** 布局方向：row（默认）| column */
  direction?: 'row' | 'column';
  /** 是否换行（仅 row 方向有效） */
  wrap?: boolean;
  /** 对齐方式 */
  align?: 'start' | 'center' | 'end' | 'stretch';
  /** 间距：命名 token ('none'|'xs'|'sm'|'md'|'lg'|'xl')、数字(px) 或 CSS 值 (如 '1rem') */
  gap?: number | string;
  body?: BaseSchema[];
}

export interface FragmentSchema extends BaseSchema {
  type: 'fragment';
  body?: SchemaInput;
  data?: Record<string, SchemaValue>;
  isolate?: boolean;
}

export interface LoopSchema extends BaseSchema {
  type: 'loop';
  items?: SchemaValue;
  body?: SchemaInput;
  empty?: SchemaInput;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
}

export interface RecurseSchema extends BaseSchema {
  type: 'recurse';
  items?: SchemaValue;
  itemName?: string;
  indexName?: string;
  keyName?: string;
  itemData?: Record<string, SchemaValue>;
  keyBy?: SchemaValue;
  maxDepth?: number;
}

export interface TextSchema extends BaseSchema {
  type: 'text';
  text?: string;
  body?: string;
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
}

export interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
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

export interface FlexSchema extends BaseSchema {
  type: 'flex';
  direction?: 'row' | 'column';
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  /** 间距：命名 token ('none'|'xs'|'sm'|'md'|'lg'|'xl')、数字(px) 或 CSS 值 (如 '1rem') */
  gap?: number | string;
  className?: string;
}
export type { DynamicRendererSchema };
