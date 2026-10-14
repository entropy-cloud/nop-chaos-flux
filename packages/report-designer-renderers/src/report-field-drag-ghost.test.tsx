import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { initFluxI18n, resetFluxI18n } from '@nop-chaos/flux-i18n';
import { ReportFieldPanel } from './report-field-panel.js';

// plan 597 CX-17：setFieldDragGhost 特征化钉（原 ghost 单测为零——本文件即首覆盖），
// 消费位已收敛为 ui setDragGhost 共享原语，B 面映射=testid/`fieldType · label` 组合终串
// （消费侧组参）/缺省 style=hsl-vars 体/offsets 缺省 12,12。cssText 经 createElement
// 拦截捕获赋值原串做逐字节保形核对（happy-dom 解析器在 cssText 赋值时静默丢弃
// hsl(var(--x)) 声明，live style 对象只钉幸存属性）；统一防御钉（throw 环境=无
// uncaught+ghost 同步移除=catch 分支，全仓该分支首覆盖在本文件）。

const fieldSources = [
  {
    id: 'orders',
    label: 'Orders',
    groups: [
      {
        id: 'basic',
        label: 'Basic',
        expanded: true,
        fields: [{ id: 'orderId', label: 'Order ID', path: 'orders.orderId', fieldType: 'number' }],
      },
    ],
  },
] as any;

function queryGhost(): Element | null {
  return document.querySelector('[data-testid="report-field-drag-ghost"]');
}

const GHOST_INVARIANT_CSS_TEXT =
  'position:fixed;top:-200px;left:-200px;z-index:-1;pointer-events:none;display:inline-flex;align-items:center;white-space:nowrap';
const GHOST_DEFAULT_CSS_TEXT = [
  'gap:6px',
  'padding:6px 12px',
  'border-radius:8px',
  'border:1px solid hsl(var(--primary))',
  'background:hsl(var(--secondary))',
  'box-shadow:0 4px 12px rgba(15,23,42,0.16)',
  'font-size:13px',
  'font-weight:500',
].join(';');

describe('ReportFieldPanel drag ghost (plan 597 CX-17 characterization)', () => {
  afterEach(() => {
    document
      .querySelectorAll('[data-testid="report-field-drag-ghost"]')
      .forEach((el) => el.remove());
    cleanup();
  });

  function renderPanel(): void {
    render(
      <ReportFieldPanel
        fieldSources={fieldSources}
        onFieldDragStart={vi.fn()}
        onFieldInsert={vi.fn()}
        canInsertField={() => true}
      />,
    );
  }

  function fireDragStart(dataTransfer: unknown): void {
    const dragHandle = document.querySelector('[data-slot="report-field-panel-drag-handle"]');
    fireEvent.dragStart(dragHandle as Element, { dataTransfer });
  }

  // RTL fireEvent 在 window.DataTransfer 可构造时（happy-dom）恒以真实 DataTransfer
  // 为底拷贝 mock 自有属性——原型 setDragImage 恒在，feature-detect guard 经 fireEvent
  // 不可达；guard 钉须走原生 Event + dataTransfer defineProperty（A 面 palette-panel
  // 既有 degrade 钉同法）。
  function fireRawDragStart(dataTransfer: unknown): void {
    const dragHandle = document.querySelector('[data-slot="report-field-panel-drag-handle"]');
    const fired = new Event('dragstart', { bubbles: true, cancelable: true });
    Object.defineProperty(fired, 'dataTransfer', { value: dataTransfer });
    (dragHandle as Element).dispatchEvent(fired);
  }

  function captureGhostCssText(): string[] {
    const assigned: string[] = [];
    const createElement = document.createElement.bind(document);
    const prototype = window.CSSStyleDeclaration.prototype;
    const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, 'cssText');
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

  function initI18nAndFakeTimers(): void {
    resetFluxI18n();
    initFluxI18n();
    vi.useFakeTimers();
  }

  it('appends the offscreen ghost with testid, `fieldType · label` composition and hsl-vars cssText, handing it to setDragImage at (12,12) with setTimeout(0) cleanup', () => {
    initI18nAndFakeTimers();
    try {
      renderPanel();
      const assignedCssTexts = captureGhostCssText();
      const setDragImage = vi.fn();
      fireDragStart({ setData: vi.fn(), effectAllowed: '', setDragImage });
      expect(setDragImage).toHaveBeenCalledTimes(1);
      const [ghostArg, offsetX, offsetY] = setDragImage.mock.calls[0] as unknown as [
        Element,
        number,
        number,
      ];
      expect(offsetX).toBe(12);
      expect(offsetY).toBe(12);
      const ghost = queryGhost();
      expect(ghost).not.toBeNull();
      expect(ghost).toBe(ghostArg);
      expect(ghost?.textContent).toBe('number · Order ID');
      // 逐字节保形：共享不变式 + 缺省 hsl-vars 体（B 面=零 style 参数，原语缺省承载）
      expect(assignedCssTexts).toContain(
        `${GHOST_INVARIANT_CSS_TEXT};${GHOST_DEFAULT_CSS_TEXT}`,
      );
      const style = (ghost as HTMLElement).style;
      expect(style.position).toBe('fixed');
      expect(Number.parseInt(style.top, 10)).toBeLessThan(0);
      expect(style.pointerEvents).toBe('none');
      expect(style.getPropertyValue('gap')).toBe('6px');
      expect(style.whiteSpace).toBe('nowrap');
      vi.runAllTimers();
      expect(queryGhost()).toBeNull();
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
    }
  });

  it('removes the ghost synchronously without any uncaught throw when setDragImage rejects (try-catch catch branch, first coverage in repo)', () => {
    initI18nAndFakeTimers();
    try {
      renderPanel();
      const errors: ErrorEvent[] = [];
      const onError = (event: Event): void => {
        errors.push(event as ErrorEvent);
      };
      window.addEventListener('error', onError);
      try {
        const setDragImage = vi.fn(() => {
          throw new Error('Not implemented');
        });
        expect(() => fireDragStart({ setData: vi.fn(), effectAllowed: '', setDragImage })).not.toThrow();
        expect(setDragImage).toHaveBeenCalledTimes(1);
        expect(errors).toHaveLength(0);
        // 同步移除语义：fake timers 未跑，ghost 已不在 body（catch 分支 ghost.remove()）
        expect(queryGhost()).toBeNull();
      } finally {
        window.removeEventListener('error', onError);
      }
    } finally {
      vi.useRealTimers();
    }
  });

  it('no-ops without mounting a ghost when dataTransfer lacks setDragImage (feature-detect guard)', () => {
    resetFluxI18n();
    initFluxI18n();
    renderPanel();
    expect(() => fireRawDragStart({ setData: vi.fn(), effectAllowed: '' })).not.toThrow();
    expect(queryGhost()).toBeNull();
  });
});
