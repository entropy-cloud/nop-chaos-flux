import type { BaseSchema, SchemaInput } from '@nop-chaos/flux-core';
import type { ActionSchema } from '@nop-chaos/flux-core';

export interface PullRefreshSchema extends BaseSchema {
  type: 'pull-refresh';
  /** 子内容 region */
  body?: SchemaInput;
  /**
   * 刷新方向。OA-14: 仅 `'down'`（下拉刷新）受支持；上拉加载使用
   * `infinite-scroll`（见 design.md §8）。保留字段以兼容现有 `direction:'down'`
   * schema；`'up'` 已从类型中移除，传 `'up'` 会触发编译期 TS 错误。
   */
  direction?: 'down';
  /** 触发刷新的下拉距离阈值，默认 60px */
  threshold?: number;
  /** 加载中提示文本 */
  loadingText?: string;
  /** 下拉提示文本 */
  pullingText?: string;
  /** 到达释放阈值时提示文本 */
  loosingText?: string;
  /** 成功提示文本，默认 '刷新成功' */
  successText?: string;
  /** 成功提示持续时间 ms，默认 500 */
  successDuration?: number;
  /** 动画持续时间 ms，默认 300 */
  animationDuration?: number;
  /** 禁用下拉刷新 */
  disabled?: boolean;
  onRefresh?: ActionSchema | ActionSchema[];
}

export interface InfiniteScrollSchema extends BaseSchema {
  type: 'infinite-scroll';
  /** 列表内容 region */
  body?: SchemaInput;
  /** 加载更多触发距离（px），默认 200px */
  distance?: number;
  /** 是否禁用滚动加载 */
  disabled?: boolean;
  /** 加载中提示文本 */
  loadingText?: string;
  /** 加载完成文本（所有数据已加载） */
  finishedText?: string;
  /** 加载出错文本 */
  errorText?: string;
  /** 是否立即检查加载，默认 true（内容不足一屏时自动加载） */
  immediateCheck?: boolean;
  /** 是否还有更多数据（host 运行时受控值）。`hasMore === false` 表示已全部加载 */
  hasMore?: boolean;
  /** host 是否正在加载（运行时受控值），为 true 时暂停自动触发 */
  loading?: boolean;
  /** host 错误状态（运行时受控值）。`true` 或错误字符串将暂停自动加载并显示重试 */
  error?: boolean | string;
  onLoadMore?: ActionSchema | ActionSchema[];
}

export interface SwipeCellSchema extends BaseSchema {
  type: 'swipe-cell';
  /** 主体内容 region */
  body?: SchemaInput;
  /** 左滑露出的操作区 region */
  left?: SchemaInput;
  /** 右滑露出的操作区 region */
  right?: SchemaInput;
  /** 滑动触发阈值（px），默认 30 */
  threshold?: number;
  /** 限制滑动方向 */
  direction?: 'left' | 'right' | 'both';
  /** 禁用滑动交互 */
  disabled?: boolean;
  /** 点击外部区域自动关闭，默认 true */
  closeOnOutside?: boolean;
  onAction?: ActionSchema | ActionSchema[];
  onOpen?: ActionSchema | ActionSchema[];
  onClose?: ActionSchema | ActionSchema[];
}

export interface CountdownSchema extends BaseSchema {
  type: 'countdown';
  time?: number;
  targetTime?: number;
  /** 格式化模板，默认 'HH:mm:ss'。支持占位符：DD HH mm ss SSS；其它字符按字面输出 */
  format?: string;
  millisecond?: boolean;
  paused?: boolean;
  autoStart?: boolean;
  prefix?: string;
  suffix?: string;
  onFinish?: ActionSchema | ActionSchema[];
}

export type NoticeBarVariant = 'info' | 'warning' | 'success' | 'error';

export interface NoticeBarSchema extends BaseSchema {
  type: 'notice-bar';
  text?: string | string[];
  scrollable?: boolean;
  speed?: number;
  direction?: 'left' | 'right';
  loop?: boolean;
  closable?: boolean;
  icon?: string;
  variant?: NoticeBarVariant;
  onClick?: ActionSchema | ActionSchema[];
  onClose?: ActionSchema | ActionSchema[];
}

export interface WheelPickerOption {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string | number;
}

export interface PickerViewSchema extends BaseSchema {
  type: 'picker-view';
  /** 滚轮列配置；多列为并列独立内核 */
  columns?: WheelPickerOption[][];
  /** 受控选中值（按列）。拖拽/惯性进行中的外部写入被抑制，落定后以落点为准 */
  value?: (string | number)[];
  /** 行高 px，默认 44（M0 触摸目标基线） */
  rowHeight?: number;
  /** 可视行数，默认 5 */
  visibleRows?: number;
  disabled?: boolean;
  /** 单列落定派发。payload: { type:'change', column, index, value, label } */
  onChange?: ActionSchema | ActionSchema[];
}

export interface WheelPickerSchema extends BaseSchema {
  type: 'wheel-picker';
  /** 字段标签（FieldFrame 包裹） */
  label?: string;
  /** 表单字段名（经 flux-react form hooks 写值） */
  name?: string;
  columns?: WheelPickerOption[][];
  /** 受控选中值（按列） */
  value?: (string | number)[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  /** 确认时派发。payload: { type:'confirm', value: (string|number)[], labels: string[] } */
  onConfirm?: ActionSchema | ActionSchema[];
  onCancel?: ActionSchema | ActionSchema[];
}

type WheelDateValue = string;

export interface WheelDatePickerSchema extends BaseSchema {
  type: 'wheel-date-picker';
  label?: string;
  name?: string;
  /** 最小日期（YYYY-MM-DD），默认 1900-01-01 */
  min?: WheelDateValue;
  /** 最大日期（YYYY-MM-DD），默认 2100-12-31 */
  max?: WheelDateValue;
  value?: WheelDateValue;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onConfirm?: ActionSchema | ActionSchema[];
  onCancel?: ActionSchema | ActionSchema[];
}

export interface WheelTimePickerSchema extends BaseSchema {
  type: 'wheel-time-picker';
  label?: string;
  name?: string;
  /** 分钟步进，默认 1 */
  minuteStep?: number;
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onConfirm?: ActionSchema | ActionSchema[];
  onCancel?: ActionSchema | ActionSchema[];
}

export interface WheelCascaderOption {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string | number;
  children?: WheelCascaderOption[];
}

export interface WheelCascaderSchema extends BaseSchema {
  type: 'wheel-cascader';
  label?: string;
  name?: string;
  options?: WheelCascaderOption[];
  /** 级联选中值（自根到叶） */
  value?: (string | number)[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onConfirm?: ActionSchema | ActionSchema[];
  onCancel?: ActionSchema | ActionSchema[];
}

export interface FloatingPanelSchema extends BaseSchema {
  type: 'floating-panel';
  /** 锚点高度数组（px，升序）；面板拖拽后吸附最近锚点 */
  anchors?: number[];
  /** 初始高度（px），默认吸附到第一个锚点 */
  defaultHeight?: number;
  /** 面板内容 region（满屏后可滚动） */
  body?: SchemaInput;
  disabled?: boolean;
  /** 面板落定新锚点。payload: { type: 'anchor', index, height } */
  onChange?: ActionSchema | ActionSchema[];
}

export interface FloatingBubbleSchema extends BaseSchema {
  type: 'floating-bubble';
  /** 初始 X（px，相对容器左缘），默认右缘 */
  initialX?: number;
  /** 初始 Y（px，相对容器上缘），默认底部 */
  initialY?: number;
  /** 磁吸开关，默认 true（松手吸附最近左右边缘） */
  magnetic?: boolean;
  disabled?: boolean;
  /** 位移 <6px 视为点击。payload: { type: 'click' } */
  onClick?: ActionSchema | ActionSchema[];
}

export interface ActionSheetItem {
  [key: string]: import('@nop-chaos/flux-core').SchemaValue;
  label: string;
  value: string | number;
  disabled?: boolean;
}

export interface ActionSheetSchema extends BaseSchema {
  type: 'action-sheet';
  /** 触发器文案 */
  triggerText?: string;
  /** 弹层标题 */
  title?: string;
  items?: ActionSheetItem[];
  /** 展示形态，默认 list */
  display?: 'list' | 'grid';
  /** 关闭按钮文案，默认 i18n 取消 */
  cancelText?: string;
  /** 点击遮罩关闭，默认 true */
  closeOnMask?: boolean;
  disabled?: boolean;
  /** 选中条目。payload: { type: 'select', index, value, label } */
  onSelect?: ActionSchema | ActionSchema[];
  onCancel?: ActionSchema | ActionSchema[];
}

export interface ImageViewerSchema extends BaseSchema {
  type: 'image-viewer';
  /** 图片 URL 列表 */
  images?: string[];
  /** 受控打开 */
  open?: boolean;
  /** 打开时定位的页（0 基），越界钳制 */
  initialIndex?: number;
  disabled?: boolean;
  /** 关闭（下滑超阈值/遮罩）。payload: { type:'close', index } */
  onClose?: ActionSchema | ActionSchema[];
  /** 页码变更。payload: { type:'change', index } */
  onChange?: ActionSchema | ActionSchema[];
}
