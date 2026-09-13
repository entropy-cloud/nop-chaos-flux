export interface ReconnectionManagerConfig {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  onReconnect: () => void;
  /** 耗尽诊断（缺省无通道时静默停摆） */
  onGiveUp?: (code: string, message: string) => void;
  /** timer 注入（测试；缺省 setTimeout） */
  timer?: (cb: () => void, ms: number) => unknown;
  /** 随机源注入（抖动；测试确定性） */
  random?: () => number;
}

const DEFAULTS = {
  maxRetries: 10,
  baseDelay: 500, // 保证「断开检测→首试启动 <1s」（±25% 抖动上界 625ms）
  maxDelay: 30000,
};

/**
 * 指数退避重连管理器（design-protocol.md §3，I3.1）：
 * baseDelay×2^n ±25% 抖动（防惊群）、clamp maxDelay、scheduleReconnect pending 幂等
 * （onerror+onclose 双触发只产生一次重连）、cancel() 幂等、reset() 归零、
 * 耗尽后 onGiveUp('reconnect-give-up') 且不再调度。
 */
export class ReconnectionManager {
  private retryCount = 0;
  private pendingTimer: unknown = null;
  private cancelled = false;
  private gaveUp = false;
  private readonly maxRetries: number;
  private readonly baseDelay: number;
  private readonly maxDelay: number;
  private readonly timer: (cb: () => void, ms: number) => unknown;
  private readonly random: () => number;

  constructor(private config: ReconnectionManagerConfig) {
    this.maxRetries = config.maxRetries ?? DEFAULTS.maxRetries;
    this.baseDelay = config.baseDelay ?? DEFAULTS.baseDelay;
    this.maxDelay = config.maxDelay ?? DEFAULTS.maxDelay;
    this.timer = config.timer ?? ((cb, ms) => setTimeout(cb, ms));
    this.random = config.random ?? Math.random;
  }

  /** 指数退避调度；pending 幂等（已有待触发 timer 时不重复调度）。 */
  scheduleReconnect(): void {
    if (this.cancelled || this.pendingTimer !== null) return;
    if (this.retryCount >= this.maxRetries) {
      if (!this.gaveUp) {
        this.gaveUp = true;
        this.config.onGiveUp?.('reconnect-give-up', `Reconnection gave up after ${this.retryCount} retries`);
      }
      return;
    }
    const exponential = this.baseDelay * Math.pow(2, this.retryCount);
    const jitter = exponential * 0.25 * (this.random() * 2 - 1);
    const delay = Math.min(exponential + jitter, this.maxDelay);
    this.pendingTimer = this.timer(() => {
      this.pendingTimer = null;
      this.retryCount++;
      this.config.onReconnect();
    }, delay);
  }

  /** 取消 pending（幂等）；cancelled 后不再调度（重连耗尽/主动废弃语义）。 */
  cancel(): void {
    this.cancelled = true;
    if (this.pendingTimer !== null) {
      clearTimeout(this.pendingTimer as ReturnType<typeof setTimeout>);
      this.pendingTimer = null;
    }
  }

  /** 连接成功后调用：retryCount 归零、恢复可调度。 */
  reset(): void {
    this.retryCount = 0;
    this.gaveUp = false;
    this.cancelled = false;
  }
}
