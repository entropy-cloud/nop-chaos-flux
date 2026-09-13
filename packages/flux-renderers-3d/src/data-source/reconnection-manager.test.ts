import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReconnectionManager } from './reconnection-manager.js';

describe('ReconnectionManager (plan 467 Phase 1)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeManager(overrides: Partial<ConstructorParameters<typeof ReconnectionManager>[0]> = {}) {
    const onReconnect = vi.fn();
    const onGiveUp = vi.fn();
    const manager = new ReconnectionManager({
      maxRetries: 3,
      baseDelay: 500,
      maxDelay: 5000,
      onReconnect,
      onGiveUp,
      random: () => 1, // 确定性 +25% 抖动：序列 625/1250/2500 可逐点断言
      ...overrides,
    });
    return { manager, onReconnect, onGiveUp };
  }

  it('schedules exponential backoff: 500 → 1000 → 2000 (jitter clamped to ±25%)', () => {
    const { manager, onReconnect } = makeManager();
    manager.scheduleReconnect();
    vi.advanceTimersByTime(624); // 625 前不触发
    expect(onReconnect).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onReconnect).toHaveBeenCalledTimes(1);

    manager.scheduleReconnect();
    vi.advanceTimersByTime(1249); // 1250 前不触发
    vi.advanceTimersByTime(1);
    expect(onReconnect).toHaveBeenCalledTimes(2);

    manager.scheduleReconnect();
    vi.advanceTimersByTime(2499);
    expect(onReconnect).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(1); // 2500
    expect(onReconnect).toHaveBeenCalledTimes(3);
  });

  it('repeated scheduleReconnect keeps a single pending timer', () => {
    const { manager, onReconnect } = makeManager();
    manager.scheduleReconnect();
    manager.scheduleReconnect();
    manager.scheduleReconnect();
    vi.advanceTimersByTime(625);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    // 后续无第二个 pending 触发
    vi.advanceTimersByTime(10000);
    expect(onReconnect).toHaveBeenCalledTimes(1);
  });

  it('clamps delay to maxDelay', () => {
    // random=1 → 无 clamp 序列为 625/1250/2500/…；maxDelay 800 把 ≥800 的档位压到 800
    const { manager, onReconnect } = makeManager({ maxRetries: 20, maxDelay: 800 });
    manager.scheduleReconnect();
    vi.advanceTimersByTime(625);
    expect(onReconnect).toHaveBeenCalledTimes(1); // 625（未触 clamp）
    manager.scheduleReconnect();
    vi.advanceTimersByTime(799); // 1250 被 clamp 到 800：799 处不触发
    expect(onReconnect).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1);
    expect(onReconnect).toHaveBeenCalledTimes(2);
    manager.scheduleReconnect();
    vi.advanceTimersByTime(800);
    expect(onReconnect).toHaveBeenCalledTimes(3);
  });

  it('gives up after maxRetries with a diagnostic and stops scheduling', () => {
    const { manager, onReconnect, onGiveUp } = makeManager({ maxRetries: 2 });
    manager.scheduleReconnect();
    vi.advanceTimersByTime(625);
    manager.scheduleReconnect();
    vi.advanceTimersByTime(1250);
    manager.scheduleReconnect();
    vi.advanceTimersByTime(100000);
    expect(onReconnect).toHaveBeenCalledTimes(2);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
    // 耗尽后再调度无效
    manager.scheduleReconnect();
    vi.advanceTimersByTime(100000);
    expect(onReconnect).toHaveBeenCalledTimes(2);
    expect(onGiveUp).toHaveBeenCalledTimes(1);
  });

  it('cancel is idempotent and suppresses the pending reconnect', () => {
    const { manager, onReconnect } = makeManager();
    manager.scheduleReconnect();
    manager.cancel();
    manager.cancel();
    vi.advanceTimersByTime(100000);
    expect(onReconnect).not.toHaveBeenCalled();
  });

  it('reset zeroes the retry count so the next schedule starts from baseDelay', () => {
    const { manager, onReconnect } = makeManager({ random: () => 1 });
    manager.scheduleReconnect();
    vi.advanceTimersByTime(625);
    expect(onReconnect).toHaveBeenCalledTimes(1);
    manager.scheduleReconnect();
    vi.advanceTimersByTime(1250);
    manager.reset();
    manager.scheduleReconnect();
    vi.advanceTimersByTime(625);
    expect(onReconnect).toHaveBeenCalledTimes(3); // baseDelay 档位（500-625ms 内）
  });
});
