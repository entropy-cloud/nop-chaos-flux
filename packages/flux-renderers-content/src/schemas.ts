import type { ActionSchema, BaseSchema, SchemaInput, SchemaValue } from '@nop-chaos/flux-core';

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
