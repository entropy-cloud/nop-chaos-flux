import type {
  ActionSchema,
  BaseSchema,
  DynamicRendererSchema,
  SchemaInput,
  SchemaObject,
  SchemaValue,
} from '@nop-chaos/flux-core';

export type SurfaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export type ContainerDirection = 'row' | 'column';

export type ResponsiveBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | '2xl';

export type ResponsiveFlexDirection = Partial<Record<ResponsiveBreakpoint, FlexDirection>>;

export type ResponsiveContainerDirection = Partial<Record<ResponsiveBreakpoint, ContainerDirection>>;

export type ResponsiveWrap = Partial<Record<ResponsiveBreakpoint, boolean>>;

export interface PageSchema extends BaseSchema {
  type: 'page';
  title?: string;
  subTitle?: string;
  remark?: string;
  data?: SchemaValue;
  statusPath?: string;
  body?: BaseSchema[];
  header?: BaseSchema[];
  footer?: BaseSchema[];
  aside?: BaseSchema[];
  asidePosition?: 'left' | 'right';
  modalContainer?: string;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  asideClassName?: string;
  toolbarClassName?: string;
}

export interface DialogSchema extends BaseSchema {
  type: 'dialog';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: SchemaValue;
  open?: boolean;
  defaultOpen?: boolean;
  statusPath?: string;
  closeOnOutsideClick?: boolean;
  container?: string;
  showMask?: boolean;
  closeOnEsc?: boolean;
  size?: SurfaceSize;
  width?: number | string;
  height?: number | string;
  showCloseButton?: boolean;
  header?: BaseSchema[];
  footer?: BaseSchema[];
  confirm?: boolean | string;
  onConfirm?: ActionSchema | ActionSchema[];
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

export interface DrawerSchema extends BaseSchema {
  type: 'drawer';
  title?: string;
  body?: BaseSchema[];
  actions?: BaseSchema[];
  data?: SchemaValue;
  open?: boolean;
  defaultOpen?: boolean;
  side?: 'left' | 'right' | 'top' | 'bottom';
  statusPath?: string;
  container?: string;
  showMask?: boolean;
  closeOnOutside?: boolean;
  closeOnEsc?: boolean;
  size?: SurfaceSize;
  width?: number | string;
  height?: number | string;
  showCloseButton?: boolean;
  header?: BaseSchema[];
  footer?: BaseSchema[];
  confirm?: boolean | string;
  onConfirm?: ActionSchema | ActionSchema[];
  resizable?: boolean;
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
}

export interface TabsItemSchema extends SchemaObject {
  key?: string | number;
  value?: string | number;
  title?: string;
  label?: string;
  disabled?: boolean | string;
  badge?: string | number;
  icon?: string;
  mountOnEnter?: boolean;
  unmountOnExit?: boolean;
  titleRegionKey?: string;
  bodyRegionKey?: string;
  toolbarRegionKey?: string;
}

export type TabsMode =
  | ''
  | 'line'
  | 'card'
  | 'radio'
  | 'vertical'
  | 'chrome'
  | 'simple'
  | 'strong'
  | 'tiled'
  | 'sidebar';

export interface TabsSchema extends BaseSchema {
  type: 'tabs';
  items?: TabsItemSchema[];
  value?: string | number;
  defaultValue?: string | number;
  valueOwnership?: 'local' | 'controlled' | 'scope';
  valueStatePath?: string;
  statusPath?: string;
  toolbar?: BaseSchema | BaseSchema[];
  orientation?: 'horizontal' | 'vertical';
  variant?: 'default' | 'line';
  tabsMode?: TabsMode;
  sidePosition?: 'left' | 'right';
  contentClassName?: string;
  toolbarClassName?: string;
}

export interface ContainerSchema extends BaseSchema {
  type: 'container';
  direction?: ContainerDirection;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: number | string;
  body?: BaseSchema[];
  header?: BaseSchema[];
  footer?: BaseSchema[];
  bodyClassName?: string;
  headerClassName?: string;
  footerClassName?: string;
  responsiveDirection?: ResponsiveContainerDirection;
  responsiveWrap?: ResponsiveWrap;
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

export type IconSize = number | 'sm' | 'md' | 'lg';

export interface TextSchema extends BaseSchema {
  type: 'text';
  text?: string;
  body?: string;
  tag?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div';
  copyable?: boolean;
  maxLine?: number;
  maxLineToggle?: boolean;
}

export interface ButtonSchema extends BaseSchema {
  type: 'button';
  label?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  disabled?: boolean | string;
  icon?: string;
  rightIcon?: string;
  loading?: boolean | string;
  tooltip?: string;
  disabledTip?: string;
  block?: boolean;
  active?: boolean | string;
}

export interface IconSchema extends BaseSchema {
  type: 'icon';
  /** 图标名称（kebab-case） */
  icon?: string;
  /** 图标像素尺寸或 token（`sm`/`md`/`lg` 映射 `{ sm: 12, md: 16, lg: 20 }`）；缺省回退 16 */
  size?: IconSize;
  /** CSS color 值，映射到 inline style color（lucide 走 currentColor） */
  color?: string;
}

export interface BadgeSchema extends BaseSchema {
  type: 'badge';
  text?: string;
  level?: 'info' | 'success' | 'warning' | 'danger';
}

export interface FlexSchema extends BaseSchema {
  type: 'flex';
  direction?: FlexDirection;
  wrap?: boolean;
  align?: 'start' | 'center' | 'end' | 'stretch' | 'baseline';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  alignContent?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly' | 'stretch';
  /** 间距：命名 token ('none'|'xs'|'sm'|'md'|'lg'|'xl')、数字(px) 或 CSS 值 (如 '1rem') */
  gap?: number | string;
  className?: string;
  responsiveDirection?: ResponsiveFlexDirection;
  responsiveWrap?: ResponsiveWrap;
}

export interface ScopeDebugSchema extends BaseSchema {
  type: 'scope-debug';
  title?: string;
  defaultExpand?: boolean;
  dataPaths?: string[];
}
export type { DynamicRendererSchema };
