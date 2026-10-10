/**
 * SCADA 演示共享信号模拟器（559 Phase 3）：
 * tag 化信号源（sine / randomWalk / square）+ 周期 tick + 手动覆盖——
 * scada-gallery 三场景与 pressure-demo 大屏共用，替代各页散落的 setInterval 正弦公式。
 */
export interface SignalSpec {
  tag: string;
  kind: 'sine' | 'randomWalk' | 'square';
  /** 中心值/初值 */
  base: number;
  amplitude: number;
  /** 周期（秒）；square 为半周期宽度 */
  periodSec: number;
  min?: number;
  max?: number;
  decimals?: number;
}

export type SignalValues = Record<string, number>;

export interface SignalSimulator {
  start(onTick: (values: SignalValues) => void): void;
  stop(): void;
  /** 手动覆盖某 tag（故障注入/清零等），覆盖值参与后续 tick 输出。 */
  set(tag: string, value: number): void;
  current(): SignalValues;
}

export function createSignalSimulator(specs: SignalSpec[], intervalMs = 1000): SignalSimulator {
  const values: SignalValues = {};
  const walk: SignalValues = {};
  const overrides: SignalValues = {};
  for (const spec of specs) {
    values[spec.tag] = spec.base;
    walk[spec.tag] = spec.base;
  }
  let timer: ReturnType<typeof setInterval> | null = null;
  const sample = (spec: SignalSpec): number => {
    if (spec.tag in overrides) return overrides[spec.tag];
    const t = Date.now() / 1000;
    let value: number;
    switch (spec.kind) {
      case 'sine':
        value = spec.base + spec.amplitude * Math.sin((t * Math.PI * 2) / spec.periodSec);
        break;
      case 'square': {
        const phase = (t % spec.periodSec) / spec.periodSec;
        value = spec.base + (phase < 0.5 ? spec.amplitude : -spec.amplitude);
        break;
      }
      default: {
        const next = walk[spec.tag] + (Math.random() - 0.5) * spec.amplitude * 0.3;
        walk[spec.tag] = Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, next));
        value = walk[spec.tag];
      }
    }
    value = Math.min(spec.max ?? Infinity, Math.max(spec.min ?? -Infinity, value));
    const decimals = spec.decimals ?? 0;
    return Number(value.toFixed(decimals));
  };
  return {
    start(onTick) {
      if (timer) return;
      onTick({ ...values });
      timer = setInterval(() => {
        for (const spec of specs) values[spec.tag] = sample(spec);
        onTick({ ...values });
      }, intervalMs);
    },
    stop() {
      if (timer) clearInterval(timer);
      timer = null;
    },
    set(tag, value) {
      overrides[tag] = value;
      values[tag] = value;
    },
    current() {
      return { ...values };
    },
  };
}
