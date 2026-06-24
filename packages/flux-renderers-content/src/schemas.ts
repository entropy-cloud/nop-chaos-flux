import type { ActionSchema, BaseSchema, SchemaInput, SchemaObject, SchemaValue } from '@nop-chaos/flux-core';

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

// ───────────────────────────── W1a 内容展示组 ─────────────────────────────

export interface LinkSchema extends BaseSchema {
  type: 'link';
  // `label` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
  /** 导航地址 */
  href?: string;
  /** 打开方式，如 '_blank' */
  target?: '_self' | '_blank' | '_parent' | '_top';
  /** rel 属性，缺省时 target=_blank 自动补 noopener/noreferrer */
  rel?: string;
  /** 禁用态（与 meta.disabled 语义一致） */
  disabled?: boolean | string;
  onClick?: ActionSchema;
}

export type ImageFit = 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';

export interface ImageSchema extends BaseSchema {
  type: 'image';
  /** 图片资源地址（可来自表达式/source） */
  src?: string;
  /** 替代文本 */
  alt?: string;
  /** title 属性 */
  title?: string;
  /** 点击放大预览开关 */
  preview?: boolean;
  /** object-fit，默认 'cover' */
  fit?: ImageFit;
  /** 宽度（数字 px 或字符串） */
  width?: number | string;
  /** 高度（数字 px 或字符串） */
  height?: number | string;
  /** 原生懒加载 loading="lazy"（旧浏览器 IntersectionObserver fallback） */
  lazy?: boolean;
  onClick?: ActionSchema;
  /** 加载失败回调（触发后显示回退占位） */
  onLoadError?: ActionSchema;
}

export interface JsonViewSchema extends BaseSchema {
  type: 'json-view';
  /** 待展示的 JSON 数据（任意可序列化值） */
  value?: SchemaValue;
  /** 折叠层级：true 全折叠 / false 全展开 / number 默认展开层级，默认展开 */
  collapsed?: boolean | number;
  /** 是否显示复制按钮 */
  showCopy?: boolean;
  /** 空态（value-or-region） */
  empty?: SchemaInput;
}

export interface MarkdownSchema extends BaseSchema {
  type: 'markdown';
  /** Markdown 源文本（可来自表达式/source） */
  content?: string;
  /** 是否允许内嵌 HTML（默认 false 转义；开启时同样过 sanitize 门禁） */
  allowHtml?: boolean;
  /** 空态（value-or-region） */
  empty?: SchemaInput;
}

export interface HtmlSchema extends BaseSchema {
  type: 'html';
  /** 原始 HTML 字符串（默认经 DOMPurify sanitize） */
  content?: string;
  /** 是否启用 sanitize，默认 true；false 为显式 trusted 逃生口（调用方自负） */
  sanitize?: boolean;
  /** 空态（value-or-region） */
  empty?: SchemaInput;
}

// ───────────────────────────── W2a 数据组合组 ─────────────────────────────

export type CardsSelectionMode = 'single' | 'multiple' | 'none';

export interface CardsSchema extends BaseSchema {
  type: 'cards';
  /** 唯一集合字段：卡片集合数据数组（表达式值绑定，从 scope 读取） */
  items?: SchemaValue;
  /** 单卡片模板 region（运行在每条记录的 item/index 作用域内） */
  card?: SchemaInput;
  /** 空态（value-or-region） */
  empty?: SchemaInput | string;
  /** 单项 key 字段，缺省按 index 派生 */
  keyField?: string;
  /** 选择模式：none 禁用、single 互斥、multiple 累积 */
  selectionMode?: CardsSelectionMode;
  /** 选择所有权：local controlled state（renderer 自维护） */
  selectionOwnership?: 'local' | 'controlled' | 'scope';
  /** 发布选择状态的 scope 路径 */
  selectionStatePath?: string;
  onItemClick?: ActionSchema;
  onSelectionChange?: ActionSchema;
  onPageChange?: ActionSchema;
}

export type AlertLevel = 'info' | 'success' | 'warning' | 'error';

export interface AlertSchema extends BaseSchema {
  type: 'alert';
  /** 反馈级别，映射视觉变体，默认 'info' */
  level?: AlertLevel;
  /** 自定义图标（lucide 图标名），缺省按 level 派生 */
  icon?: string;
  /** 是否可关闭，默认 false */
  closable?: boolean;
  /** 标题（value-or-region） */
  title?: SchemaInput;
  /** 主要反馈内容（value-or-region） */
  body?: SchemaInput;
  /** 可选操作区 region */
  actions?: SchemaInput;
  onClose?: ActionSchema;
}

// ───────────────────────────── W3c 值映射组 ─────────────────────────────

export interface MappingSchema extends BaseSchema {
  type: 'mapping';
  /** 待映射的值（可来自表达式/source） */
  value?: SchemaValue;
  /** 映射表：键为值的字符串形式，值为命中后的展示结果（文本/badge 片段） */
  map?: Record<string, SchemaValue>;
  /** 未命中时优先显示的默认标签 */
  defaultLabel?: string;
  /** 值为空或未命中且无 defaultLabel 时的占位文本 */
  placeholder?: string;
  /** 命中项的可选模板区（命中时经 item region 渲染，替代 map 查找的纯文本） */
  item?: SchemaInput;
}

export type StatusLevel =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  | 'processing'
  | 'pending'
  | 'inactive';

export interface StatusSchema extends BaseSchema {
  type: 'status';
  /** 业务状态值（可来自表达式/source） */
  value?: SchemaValue;
  /** 状态值→展示文本映射表 */
  labelMap?: Record<string, SchemaValue>;
  /** 状态值→语义级别映射表（投影到 Badge 语义色） */
  levelMap?: Record<string, SchemaValue>;
  /** 状态值→图标名映射表（lucide 图标名） */
  iconMap?: Record<string, SchemaValue>;
  /** 值为空或未命中时的占位文本 */
  placeholder?: string;
}

// ───────────────────────────── W4a 多媒体组 ─────────────────────────────

export interface AudioSchema extends BaseSchema {
  type: 'audio';
  /** 音频资源地址（可来自表达式/source） */
  src?: string;
  /** 封面地址（音频无视频帧，poster 作为视觉封面） */
  poster?: string;
  /** 自动播放（受浏览器自动播放策略约束） */
  autoPlay?: boolean;
  /** 循环播放 */
  loop?: boolean;
  /** 显示原生控件，默认 true */
  controls?: boolean;
  // `title` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
  onLoadError?: ActionSchema;
}

export interface VideoSchema extends BaseSchema {
  type: 'video';
  /** 视频资源地址（可来自表达式/source） */
  src?: string;
  /** 封面地址（播放前展示的预览帧） */
  poster?: string;
  /** 自动播放（受浏览器自动播放策略约束） */
  autoPlay?: boolean;
  /** 循环播放 */
  loop?: boolean;
  /** 显示原生控件，默认 true */
  controls?: boolean;
  /** 静音播放（仅 video：autoplay 场景常需 muted 才能生效） */
  muted?: boolean;
  // `title` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
  onLoadError?: ActionSchema;
}

export interface CarouselItemSchema extends SchemaObject {
  /** 轮播项媒体地址（图片/视频） */
  image?: string;
  /** 轮播项标题 */
  title?: string;
  /** 轮播项说明文字 */
  caption?: string;
  /** 轮播项自定义内容（受限 schema） */
  body?: SchemaInput;
}

export interface CarouselSchema extends BaseSchema {
  type: 'carousel';
  /** 轮播项集合（每项可带 body region / image / title） */
  items?: CarouselItemSchema[];
  /** 自动轮播 */
  autoPlay?: boolean;
  /** 自动轮播间隔（毫秒），默认 5000 */
  interval?: number;
  /** 循环（末尾回到开头） */
  loop?: boolean;
  /** 显示前后切换控件，默认 true */
  controls?: boolean;
  /** 显示底部指示点，默认 true */
  indicators?: boolean;
  onChange?: ActionSchema;
}

export type QrCodeLevel = 'L' | 'M' | 'Q' | 'H';

export interface QrCodeSchema extends BaseSchema {
  type: 'qrcode';
  /** 待编码的值（可来自表达式/source） */
  value?: SchemaValue;
  /** 二维码尺寸（px），默认 128 */
  size?: number;
  /** 纠错等级 L/M/Q/H，默认 M */
  level?: QrCodeLevel;
  /** 前景色（深色模块），默认 #000 */
  foreground?: string;
  /** 背景色（浅色模块），默认 #fff */
  background?: string;
  // `label` 继承 BaseSchema（string）；renderer definition 用 value-or-region 规则。
}
