import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ScadaConfig, ScadaPrimitive, ScadaSymbolNode } from '../../serialization/config-types.js';
import { PreviewDataInjector, type PreviewInjectionSurface } from './preview-data-injector.js';

/**
 * preview 注入通道 focused 单测（plan 522 / L5.5，design-renderer.md §13.2/§13.4）。
 * 引擎以最小结构面 fake（PreviewInjectionSurface），断言 applyDiff updated patch 通道
 * 与 touched 还原语义（R5 不泄漏验证 #5）。
 */

const VARIABLES = [
  { id: 'temp', source: 'static' as const, init: 50 },
  { id: 'run', source: 'static' as const, init: true },
  { id: 'label', source: 'static' as const, init: 'idle' },
];

const SYMBOLS: ScadaSymbolNode[] = [
  {
    id: 'tank',
    type: 'scada-rect',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    fill: '#000000',
    opacity: 1,
    bindings: {
      fill: { point: 'temp', scale: { k: 2 } },
      opacity: { point: 'temp' },
    },
  },
  {
    id: 'text',
    type: 'scada-text',
    x: 0,
    y: 0,
    text: 'static',
    bindings: {
      text: { point: 'label', format: '%s!' },
      // 未声明点：store 有值前 resolver 返回 undefined → 不产 patch。
      visible: { expression: 'run' },
    },
  },
];

class FakeEngine implements PreviewInjectionSurface {
  currentMode: 'edit' | 'preview' = 'edit';
  config: ScadaConfig | null = {
    version: 1,
    variables: VARIABLES,
    symbols: SYMBOLS.map((s) => ({ ...s, bindings: s.bindings ? { ...s.bindings } : undefined })),
  };
  props = new Map<string, Record<string, unknown>>([
    ['tank', { fill: '#000000', opacity: 1 }],
    ['text', { text: 'static', visible: false }],
  ]);
  appliedPatches: Array<{ id: string; patch: Record<string, unknown> }> = [];

  getCurrentConfig(): ScadaConfig | null {
    return this.config;
  }

  getSymbolProps(id: string): Record<string, unknown> | undefined {
    return this.props.get(id);
  }

  applyDiff(diff: { added: unknown[]; removed: unknown[]; updated: Array<{ id: string; patch: Record<string, unknown> }> }): void {
    for (const { id, patch } of diff.updated) {
      this.appliedPatches.push({ id, patch });
      const current = this.props.get(id) ?? {};
      this.props.set(id, { ...current, ...patch });
    }
  }

  reset(): void {
    this.appliedPatches = [];
  }
}

function makeInjector(engine: FakeEngine, evaluate?: (expression: string) => ScadaPrimitive | undefined) {
  return new PreviewDataInjector(engine, { evaluate });
}

describe('PreviewDataInjector (plan 522 / L5.5)', () => {
  let engine: FakeEngine;

  beforeEach(() => {
    engine = new FakeEngine();
  });

  it('edit mode: inject is a gated no-op (R5 不泄漏 #5)', () => {
    const injector = makeInjector(engine);
    expect(injector.inject({ temp: 10 })).toBe(0);
    expect(engine.appliedPatches).toHaveLength(0);
  });

  it('preview mode: point + scale/format bindings resolve and apply to the scene only', () => {
    engine.currentMode = 'preview';
    const injector = makeInjector(engine);
    const applied = injector.inject({ temp: 10, label: 'run' });
    // fill: 10*2=20; opacity: 10; text: 'run!'（format 仅文本属性）; visible: expression 无 evaluate → 跳过。
    expect(applied).toBe(3);
    expect(engine.props.get('tank')).toMatchObject({ fill: 20, opacity: 10 });
    expect(engine.props.get('text')).toMatchObject({ text: 'run!' });
    // working copy 不被触碰（引擎 config 模型引用未换）。
    expect(engine.config?.symbols[0].fill).toBe('#000000');
  });

  it('no-op when value unchanged (props equality short-circuit)', () => {
    engine.currentMode = 'preview';
    const injector = makeInjector(engine);
    injector.inject({ temp: 10, label: 'run' });
    engine.reset();
    expect(injector.inject({ temp: 10, label: 'run' })).toBe(0);
    expect(engine.appliedPatches).toHaveLength(0);
  });

  it('clear() restores original props snapshot (touched 首触记录)', () => {
    engine.currentMode = 'preview';
    const injector = makeInjector(engine);
    injector.inject({ temp: 10, label: 'run' });
    injector.clear();
    expect(engine.props.get('tank')).toMatchObject({ fill: '#000000', opacity: 1 });
    expect(engine.props.get('text')).toMatchObject({ text: 'static' });
  });

  it('expression bindings evaluate via injected callback and are skipped without one', () => {
    engine.currentMode = 'preview';
    const withEval = makeInjector(engine, (expression) => (expression === 'run' ? true : undefined));
    expect(withEval.inject({ temp: 10, label: 'run' })).toBe(4);
    expect(engine.props.get('text')).toMatchObject({ visible: true });
    withEval.clear();

    const fresh = new FakeEngine();
    fresh.currentMode = 'preview';
    const withoutEval = makeInjector(fresh);
    expect(withoutEval.inject({ temp: 10, label: 'run' })).toBe(3);
  });

  it('undeclared point ids are stored harmlessly; declared inits already resolve on first inject', () => {
    engine.currentMode = 'preview';
    const injector = makeInjector(engine);
    // 声明 static 源的 init 值在 loadDeclarations 时即生效（与运行态同语义）——首注入即便只带
    // 未声明点，绑定也按 init 值解析（fill=100/opacity=50/text='idle!'）。
    expect(injector.inject({ ghost: 1 })).toBe(3);
    // 未声明点被 store 丢弃（PointStore 只收已声明 id，design-renderer.md §13.2「无害」语义）。
    expect(injector.getInjectedPointValue('ghost')).toBeUndefined();
  });

  it('onModeChange(preview→edit) stops mock and restores the scene', () => {
    vi.useFakeTimers();
    try {
      engine.currentMode = 'preview';
      const injector = makeInjector(engine);
      injector.mockAutoStart = true;
      injector.onModeChange('preview');
      expect(injector.isMockRunning()).toBe(true);
      vi.advanceTimersByTime(2100);
      expect(engine.props.get('tank')).toMatchObject({ opacity: expect.any(Number) });

      // 模式翻转本身由 runtime-mutators.switchMode 负责；注入器只联动清理。
      engine.currentMode = 'edit';
      injector.onModeChange('edit');
      expect(injector.isMockRunning()).toBe(false);
      // 场景还原（fill/opacity 回原值；visible 未注入过则保持）。
      expect(engine.props.get('tank')).toMatchObject({ fill: '#000000', opacity: 1 });
    } finally {
      vi.useRealTimers();
    }
  });

  it('mock interval honors mockIntervalMs; destroys cleanly', () => {
    vi.useFakeTimers();
    try {
      engine.currentMode = 'preview';
      const injector = makeInjector(engine);
      injector.mockIntervalMs = 500;
      injector.mockAutoStart = true;
      injector.onModeChange('preview');
      expect(injector.isMockRunning()).toBe(true);
      vi.advanceTimersByTime(600);
      expect(engine.appliedPatches.length).toBeGreaterThan(0);
      injector.destroy();
      expect(injector.isMockRunning()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('inject is a no-op returning 0 when the engine has no current config (R5 防御)', () => {
    engine.currentMode = 'preview';
    engine.config = null;
    const injector = makeInjector(engine);
    expect(injector.inject({ temp: 10 })).toBe(0);
    expect(engine.appliedPatches).toHaveLength(0);
  });

  it('startMock is idempotent and skips scheduling when no declarable numeric/boolean points exist', () => {
    vi.useFakeTimers();
    try {
      engine.currentMode = 'preview';
      const injector = makeInjector(engine);
      injector.syncDeclarations();
      injector.startMock();
      expect(injector.isMockRunning()).toBe(true);
      vi.advanceTimersByTime(1100);
      const firstWindow = engine.appliedPatches.length;
      vi.advanceTimersByTime(1000);
      const secondWindow = engine.appliedPatches.length;
      injector.startMock();
      vi.advanceTimersByTime(1000);
      // 双 startMock 不叠加定时器（第三窗 tick 速率与第二窗一致）。
      expect(engine.appliedPatches.length - secondWindow).toBe(secondWindow - firstWindow);
      injector.stopMock();
      injector.stopMock();
      expect(injector.isMockRunning()).toBe(false);

      // 无数值/布尔声明点（label 是 string，被过滤）→ 不启动。
      const empty = new FakeEngine();
      empty.config = { version: 1, variables: [VARIABLES[2]], symbols: [] };
      empty.currentMode = 'preview';
      const emptyInjector = makeInjector(empty);
      emptyInjector.syncDeclarations();
      emptyInjector.startMock();
      expect(emptyInjector.isMockRunning()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('mock ticks inject numeric random-walk and boolean alternation; unknown explicit ids are skipped', () => {
    vi.useFakeTimers();
    try {
      engine.currentMode = 'preview';
      const injector = makeInjector(engine);
      injector.syncDeclarations();
      // 显式传入未声明 id：tick 时被 getPointState 缺失分支跳过（无害）。
      injector.startMock(['temp', 'run', 'ghost']);
      vi.advanceTimersByTime(1100);
      const numeric = injector.getInjectedPointValue('temp');
      expect(typeof numeric).toBe('number');
      expect(numeric).not.toBe(50);
      expect(injector.getInjectedPointValue('ghost')).toBeUndefined();
      // 布尔点随 tick 奇偶交替（确定性模拟，design-renderer.md §13.5）。
      const first = injector.getInjectedPointValue('run');
      expect(typeof first).toBe('boolean');
      vi.advanceTimersByTime(1000);
      expect(injector.getInjectedPointValue('run')).toBe(!(first as boolean));
      injector.stopMock();
    } finally {
      vi.useRealTimers();
    }
  });

  it('explicit unknown-only point ids boot the timer; ticks skip missing declarations without error', () => {
    vi.useFakeTimers();
    try {
      // 无 bindings 的场景：tick 注入不会产生任何 patch（纯 store 通道验证）。
      const plain = new FakeEngine();
      plain.config = { version: 1, variables: [VARIABLES[0]], symbols: [] };
      plain.currentMode = 'preview';
      const injector = makeInjector(plain);
      // store 尚未同步声明 → getPointState('ghost') 缺失 → tick 跳过（line 152 防御分支）。
      injector.startMock(['ghost']);
      expect(injector.isMockRunning()).toBe(true);
      vi.advanceTimersByTime(1100);
      expect(plain.appliedPatches).toHaveLength(0);
      expect(injector.getInjectedPointValue('ghost')).toBeUndefined();
      injector.stopMock();
    } finally {
      vi.useRealTimers();
    }
  });
});
