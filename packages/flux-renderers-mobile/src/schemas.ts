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
  onRefresh?: ActionSchema;
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
  onLoadMore?: ActionSchema;
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
  onAction?: ActionSchema;
  onOpen?: ActionSchema;
  onClose?: ActionSchema;
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
  onFinish?: ActionSchema;
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
  onClick?: ActionSchema;
  onClose?: ActionSchema;
}
