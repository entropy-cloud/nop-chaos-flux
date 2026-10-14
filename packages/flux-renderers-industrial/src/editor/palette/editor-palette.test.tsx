import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { resetLeaferMock } from '../../test-support/leafer-ui-mock.js';
import {
  clearScadaSymbolRegistry,
  registerScadaSymbol,
} from '../../symbols/symbol-registry.js';
import { registerBuiltinScadaSymbols } from '../../symbols/register-builtin.js';
import type { ScadaSymbolDefinition } from '../../symbols/symbol-types.js';
import type { EditorEngineRuntime } from '../renderer/hooks/use-editor-engine.js';
import { EditorPalettePanel } from './editor-palette.js';

vi.mock('leafer-ui', () => import('../../test-support/leafer-ui-mock.js'));
vi.mock('@leafer-in/viewport', () => ({}));
vi.mock('@leafer-in/editor', () => ({}));

function makeRuntime(): EditorEngineRuntime {
  return { addWorkingSymbol: () => undefined } as unknown as EditorEngineRuntime;
}

beforeEach(() => {
  resetLeaferMock();
  clearScadaSymbolRegistry();
  registerBuiltinScadaSymbols();
  // plan 2026-08-09-0648-2 Phase 2：palette i18n 用例需确定 i18n 状态——重置后以默认 zh-CN 初始化，
  // 使 `t()` 解析到 symbol 名称键（'矩形' 等），断言「解析后文案」而非 not-throw。
  resetFluxI18n();
  initFluxI18n();
});

afterEach(() => {
  resetFluxI18n();
  clearScadaSymbolRegistry();
  document
    .querySelectorAll('[data-testid="scada-editor-drag-ghost"]')
    .forEach((el) => el.remove());
  cleanup();
});

function findButtonByText(container: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
}

describe('EditorPalettePanel i18n (plan 2026-08-09-0648-2 Phase 2)', () => {
  it('renders resolved localized symbol names (zh-CN, not raw key)', () => {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    // scada-rect → '矩形'（zh-CN locale 已注入），证明 `t()` 解析命中、未渲染 raw key 'industrial.scada.symbol.scada-rect'。
    expect(findButtonByText(container, '矩形')).toBeDefined();
    // 多类型抽样：scada-instrument-thermometer → '温度计'。
    expect(findButtonByText(container, '温度计')).toBeDefined();
    // 断言 raw key 未泄漏到可见文本（i18next 未命中才返回 key 串；命中则不应出现）。
    expect(findButtonByText(container, 'industrial.scada.symbol.scada-rect')).toBeUndefined();
  });

  it('renders localized name plus category in title attribute (plan 531 S2: 条目元信息)', () => {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    // plan 531 S2 Phase 1：title 由「仅名称」升级为「名称 · 分类」（分组头承载分组元信息、title 承载条目级元信息）。
    expect(rectBtn?.getAttribute('title')).toBe('矩形 · 形状');
  });

  it('falls back to def.name (English) on locale miss via explicit miss-detection (D5)', () => {
    // 注册一个无 locale 键的自定义图元 → `t(key) === key` 触发显式未命中检测 → 回退 def.name 'FallbackWidget'。
    // 守护：若误用 `||` 短路 fallback（i18next 未命中返回 key 串，非 falsy），此处会渲染 raw key 而非 'FallbackWidget' → 断言转红。
    const custom: ScadaSymbolDefinition = {
      type: 'scada-test-fallback-no-key',
      name: 'FallbackWidget',
      props: {},
      create: () => ({}) as never,
    };
    registerScadaSymbol(custom);
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    expect(findButtonByText(container, 'FallbackWidget')).toBeDefined();
    expect(
      findButtonByText(container, 'industrial.scada.symbol.scada-test-fallback-no-key'),
    ).toBeUndefined();
  });
});

// [G5-R4-视角11-01] 图元库"点击添加"固定落点 (50,50)：连续点击产生完全重叠的图元栈，与已修复的
// "拖拽落点在指针处"（scada-editor-canvas.tsx drop 路径）同源不同路径。点击路径无指针目标，
// 最小修复为级联落点：连续点击的落点坐标必须互不重合。
describe('[G5-R4-视角11-01] palette click-add placement cascade', () => {
  function recordingRuntime(calls: Array<{ id: string; x: number; y: number }>): EditorEngineRuntime {
    return {
      addWorkingSymbol: (symbol: { id: string; x: number; y: number }) => {
        calls.push({ id: symbol.id, x: symbol.x, y: symbol.y });
      },
    } as unknown as EditorEngineRuntime;
  }

  it('consecutive click-adds of the same type land at distinct coordinates (no stacked duplicates)', () => {
    const calls: Array<{ id: string; x: number; y: number }> = [];
    const { container } = render(<EditorPalettePanel runtime={recordingRuntime(calls)} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    expect(rectBtn).toBeDefined();
    fireEvent.click(rectBtn!);
    fireEvent.click(rectBtn!);
    fireEvent.click(rectBtn!);
    expect(calls).toHaveLength(3);
    const distinctPlacements = new Set(calls.map((c) => `${c.x},${c.y}`));
    expect(distinctPlacements.size).toBe(3);
  });

  it('click-add ids stay unique across consecutive adds', () => {
    const calls: Array<{ id: string; x: number; y: number }> = [];
    const { container } = render(<EditorPalettePanel runtime={recordingRuntime(calls)} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    fireEvent.click(rectBtn!);
    fireEvent.click(rectBtn!);
    expect(new Set(calls.map((c) => c.id)).size).toBe(2);
  });
});

// plan 597 CX-17：palette 拖入 ghost 消费位映射钉（原 palette-drag-ghost.ts 的
// setScadaPaletteDragGhost 已收敛为 ui setDragGhost 共享原语，C 面参数=testid/
// 解析名 label/hsl+surface cssText[无 gap]/offsets 14,10）。cssText 经 createElement
// 拦截捕获赋值原串做逐字节保形核对（happy-dom 解析器丢弃 hsl(var()) 声明，live
// style 只钉幸存属性）；统一防御（throw 环境=无 uncaught+ghost 同步移除；OLD=
// 裸调用 .toThrow+ghost 残留，Phase 1 红腿记录在案）。
describe('EditorPalettePanel drag ghost (plan 597 CX-17 consumer mapping)', () => {
  const GHOST_INVARIANT_CSS_TEXT =
    'position:fixed;top:-200px;left:-200px;z-index:-1;pointer-events:none;display:inline-flex;align-items:center;white-space:nowrap';
  const GHOST_CONSUMER_CSS_TEXT = [
    'padding:4px 10px',
    'border-radius:6px',
    'border:1px solid hsl(var(--primary))',
    'background:var(--nop-surface)',
    'color:hsl(var(--primary))',
    'font-size:12px',
    'font-weight:500',
  ].join(';');

  function captureGhostCssText(): string[] {
    const assigned: string[] = [];
    const createElement = document.createElement.bind(document);
    const originalDescriptor = Object.getOwnPropertyDescriptor(
      window.CSSStyleDeclaration.prototype,
      'cssText',
    );
    vi.spyOn(document, 'createElement').mockImplementation(((tagName: string) => {
      const el = createElement(tagName) as HTMLElement;
      if (originalDescriptor?.get && originalDescriptor.set) {
        Object.defineProperty(el.style, 'cssText', {
          get() {
            return originalDescriptor.get!.call(el.style);
          },
          set(value: string) {
            assigned.push(value);
            originalDescriptor.set!.call(el.style, value);
          },
          configurable: true,
        });
      }
      return el;
    }) as typeof document.createElement);
    return assigned;
  }

  // RTL fireEvent 在 window.DataTransfer 可构造时（happy-dom）恒以真实 DataTransfer
  // 为底拷贝 mock 自有属性——原型 setDragImage 恒在，feature-detect guard 经 fireEvent
  // 不可达；guard 钉须走原生 Event + dataTransfer defineProperty（A 面既有 degrade 钉同法）。
  function fireRawRectDragStart(dataTransfer: unknown): void {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    expect(rectBtn).toBeDefined();
    const fired = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(fired, 'dataTransfer', { value: dataTransfer });
    rectBtn!.dispatchEvent(fired);
  }

  function fireRectDragStart(setDragImage?: (...args: unknown[]) => void): void {
    const { container } = render(<EditorPalettePanel runtime={makeRuntime()} onError={() => undefined} />);
    const rectBtn = findButtonByText(container, '矩形');
    expect(rectBtn).toBeDefined();
    const dt = {
      setData: vi.fn(),
      effectAllowed: '',
      ...(setDragImage ? { setDragImage } : {}),
    } as unknown as DataTransfer;
    fireEvent.dragStart(rectBtn!, { dataTransfer: dt });
  }

  it('appends the offscreen ghost with testid, resolved label, byte-shape hsl+surface cssText (no gap) and hands it to setDragImage at (14,10) with timer cleanup', () => {
    vi.useFakeTimers();
    try {
      const assignedCssTexts = captureGhostCssText();
      const setDragImage = vi.fn();
      fireRectDragStart(setDragImage);
      expect(setDragImage).toHaveBeenCalledTimes(1);
      const [ghostArg, offsetX, offsetY] = setDragImage.mock.calls[0] as unknown as [
        Element,
        number,
        number,
      ];
      expect(offsetX).toBe(14);
      expect(offsetY).toBe(10);
      const ghost = document.body.querySelector('[data-testid="scada-editor-drag-ghost"]') as HTMLElement | null;
      expect(ghost).not.toBeNull();
      expect(ghost).toBe(ghostArg);
      expect(ghost?.textContent).toBe('矩形');
      // 逐字节保形：共享不变式 + 消费方 hsl+surface cssText（无 gap——C 面漂移维度）
      expect(assignedCssTexts).toContain(`${GHOST_INVARIANT_CSS_TEXT};${GHOST_CONSUMER_CSS_TEXT}`);
      expect(ghost?.style.position).toBe('fixed');
      expect(ghost?.style.pointerEvents).toBe('none');
      expect(ghost?.style.background).toBe('var(--nop-surface)');
      expect(ghost?.style.padding).toBe('4px 10px');
      expect(ghost?.style.getPropertyValue('gap')).toBe('');
      vi.runAllTimers();
      expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('no-ops without a ghost when dataTransfer lacks setDragImage (feature-detect guard)', () => {
    expect(() => fireRawRectDragStart({ setData: vi.fn(), effectAllowed: '' })).not.toThrow();
    expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
  });

  it('degrades without uncaught throw and removes the ghost synchronously when setDragImage rejects (unified defense, B-derived catch semantics)', () => {
    vi.useFakeTimers();
    try {
      const errors: ErrorEvent[] = [];
      const onError = (event: Event): void => {
        errors.push(event as ErrorEvent);
      };
      window.addEventListener('error', onError);
      try {
        const setDragImage = vi.fn(() => {
          throw new Error('Not implemented');
        });
        expect(() => fireRectDragStart(setDragImage)).not.toThrow();
        expect(setDragImage).toHaveBeenCalledTimes(1);
        expect(errors).toHaveLength(0);
        expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
      } finally {
        window.removeEventListener('error', onError);
      }
    } finally {
      vi.useRealTimers();
    }
  });
});
