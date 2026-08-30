import type {
  ActionSchema,
  BaseSchema,
  DynamicRendererSchema,
  ResponsiveBreakpoint,
  SchemaInput,
  SchemaObject,
  SchemaValue,
} from '@nop-chaos/flux-core';

export type SurfaceSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'full';

export type FlexDirection = 'row' | 'column' | 'row-reverse' | 'column-reverse';

export type ContainerDirection = 'row' | 'column';

/** Re-exported from @nop-chaos/flux-core (kept for backward compatibility). */
export type { ResponsiveBreakpoint } from '@nop-chaos/flux-core';

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
  /** Draggable aside resizer (pointer events). amis: asideResizor. */
  asideResizable?: boolean;
  /** Minimum aside width in px (default 200). */
  asideMinWidth?: number | string;
  /** Maximum aside width in px (default 600). */
  asideMaxWidth?: number | string;
  /** Sticky aside (position: sticky; top: 0; max-height: 100vh; overflow-y: auto). */
  asideSticky?: boolean;
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
  isolate?: boolean;
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
  /** Whether the dialog window can be dragged by its header. amis draggable. */
  draggable?: boolean;
  /** Whether the dialog supports a fullscreen toggle. amis allowFullscreen. */
  allowFullscreen?: boolean;
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
  isolate?: boolean;
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
  /** Whether this tab can be closed (removed). amis closable. */
  closable?: boolean;
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
  /** Whether tabs can be closed (removed). amis closable. */
  closable?: boolean;
  /** Whether tabs can be reordered via drag. amis draggable. */
  draggable?: boolean;
  /** Whether new tabs can be added. amis addable. */
  addable?: boolean;
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
  /** Click action run when the container root is activated. */
  onClick?: ActionSchema | ActionSchema[];
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

/**
 * Optional host-injected persistence adapter for button countdown state
 * (INV-1: renderers must not touch localStorage directly). When absent the
 * countdown is session-only. Key format is renderer-owned
 * (`flux-countdown-${pathname}-${id|name}`); values are `endsAt` timestamps.
 */
export interface CountDownStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

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
  variant?: 'default' | 'primary' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-xs' | 'icon-sm' | 'icon-lg';
  disabled?: boolean | string;
  icon?: string;
  rightIcon?: string;
  loading?: boolean | string;
  tooltip?: string;
  disabledTip?: string;
  /** Tooltip placement. `side` defaults to 'top'. */
  tooltipPlacement?: {
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
  };
  block?: boolean;
  active?: boolean | string;
  /** Countdown seconds started after the onClick action succeeds. amis: countDown. */
  countDown?: number;
  /** Countdown label template (supports `{timeLeft}` token); defaults to "{timeLeft}s". amis: countDownTpl. */
  countDownTpl?: string;
  /**
   * Host-injected persistence adapter (INV-1). Without it the countdown is
   * session-only; with it the in-flight countdown survives refreshes when the
   * author supplies an explicit `id` or `name`. Typed as SchemaValue because
   * host-built objects cannot satisfy the SchemaObject index signature (same
   * pattern as `ai-chat.engine`); the renderer casts to CountDownStorage.
   */
  countDownStorage?: SchemaValue;
  /** When set, renders an `<a href>` instead of a `<button>`. */
  href?: string;
  /** Anchor target attribute (used with `href`). */
  target?: string;
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
  /** Click action run when the flex root is activated. */
  onClick?: ActionSchema | ActionSchema[];
}

export interface CommandPaletteItemSchema extends SchemaObject {
  id?: string;
  label?: string;
  description?: string;
  /** Lucide icon name rendered before the label. */
  icon?: string;
  /** Keyboard hint rendered on the right edge (e.g. "⌘N"). */
  shortcut?: string;
  /** Group heading; flat items sharing a group cluster under one heading. */
  group?: string;
  disabled?: boolean | string;
  /** Static execution track: dispatched after the palette closes (close-then-dispatch). */
  action?: ActionSchema | ActionSchema[];
}

export interface CommandPaletteGroupSchema extends SchemaObject {
  label?: string;
  items?: CommandPaletteItemSchema[];
}

export interface CommandPaletteSchema extends BaseSchema {
  type: 'command-palette';
  /** Flat static command items (expression-capable). */
  items?: SchemaValue;
  /** Explicit labelled sections, rendered before flat `items` (expression-capable). */
  groups?: SchemaValue;
  /** Dynamic items track: SourceSchema (fetched) or expression/array. Appended after static sections. */
  source?: SchemaValue;
  /** Search input placeholder. Defaults to the i18n "search" message. */
  placeholder?: string;
  /** cmdk built-in filtering. Disable to drive items with schema expressions (external filtering). */
  shouldFilter?: boolean | string;
  /** Empty state copy. Defaults to the i18n "no results" message. */
  emptyText?: string;
  /**
   * Local invocation key binding (e.g. "mod+k"). Renderer-scoped window keydown
   * listener with unmount cleanup. No-op on controlled palettes (`open` prop).
   * No conflict arbitration — global keybindings are G-B2 scope.
   */
  hotkey?: string;
  /**
   * Controlled open. A simple `${path}` expression is written back to `false`
   * on user-initiated closes (dialog plan-459 parity) so idempotent
   * setValue(path, true) can reopen; other expressions keep pure-latch semantics.
   */
  open?: boolean | string;
  defaultOpen?: boolean | string;
  /** Publishes `{ id, kind: 'command-palette', open }` into the owner scope. */
  statusPath?: string;
  container?: string;
  closeOnEsc?: boolean | string;
  closeOnOutsideClick?: boolean | string;
  showMask?: boolean | string;
  onOpen?: ActionSchema | ActionSchema[];
  onClose?: ActionSchema | ActionSchema[];
  /** Fired on command execution with payload `{ id, item, groupId }` (after close). */
  onCommand?: ActionSchema | ActionSchema[];
}

export interface ScopeDebugSchema extends BaseSchema {
  type: 'scope-debug';
  title?: string;
  defaultExpand?: boolean;
  dataPaths?: string[];
}
export type { DynamicRendererSchema };
