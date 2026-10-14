import { afterEach, describe, expect, it, vi } from 'vitest';
import { setDragGhost } from './drag-ghost.js';

// plan 597 CX-17：共享拖拽 ghost 原语单测。原语持有=共享不变式 cssText+guard+统一
// try/catch（catch=同步 remove+B 派语义）+setTimeout(0) cleanup；style/offsets 为
// 消费方参数（A=PD cssText 含 gap/C=hsl+surface+14,10/B=缺省）。

function makeDataTransfer(
  setDragImage?: (...args: unknown[]) => void,
): { dataTransfer: DataTransfer } {
  const dt = {
    setData: vi.fn(),
    effectAllowed: '',
  } as unknown as DataTransfer;
  if (setDragImage) {
    (dt as unknown as { setDragImage: (...args: unknown[]) => void }).setDragImage = setDragImage;
  }
  return { dataTransfer: dt };
}

function queryGhost(testid: string): Element | null {
  return document.querySelector(`[data-testid="${testid}"]`);
}

afterEach(() => {
  document.body.querySelectorAll('[data-testid]').forEach((el) => {
    const testid = el.getAttribute('data-testid');
    if (testid?.endsWith('-drag-ghost')) el.remove();
  });
});

describe('setDragGhost (plan 597 CX-17 shared primitive)', () => {
  it('appends an offscreen ghost with testid and label, default hsl-vars style and offsets (12,12), cleaning up on timer', () => {
    vi.useFakeTimers();
    try {
      const setDragImage = vi.fn();
      setDragGhost(makeDataTransfer(setDragImage), { testid: 'x-drag-ghost', label: '矩形' });
      expect(setDragImage).toHaveBeenCalledTimes(1);
      const [ghostArg, offsetX, offsetY] = setDragImage.mock.calls[0] as unknown as [
        Element,
        number,
        number,
      ];
      expect(offsetX).toBe(12);
      expect(offsetY).toBe(12);
      const ghost = queryGhost('x-drag-ghost');
      expect(ghost).not.toBeNull();
      expect(ghost).toBe(ghostArg);
      expect(ghost?.textContent).toBe('矩形');
      const style = (ghost as HTMLElement).style;
      expect(style.position).toBe('fixed');
      expect(Number.parseInt(style.top, 10)).toBeLessThan(0);
      expect(style.pointerEvents).toBe('none');
      expect(style.whiteSpace).toBe('nowrap');
      // 缺省 style=hsl-vars 体（B 面零 style 参数时的原语缺省；C 面自传 hsl+surface）
      expect(style.getPropertyValue('gap')).toBe('6px');
      expect(style.fontSize).toBe('13px');
      expect(style.padding).toBe('6px 12px');
      vi.runAllTimers();
      expect(queryGhost('x-drag-ghost')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('appends consumer cssText after the shared invariants and honors offset overrides', () => {
    vi.useFakeTimers();
    try {
      const setDragImage = vi.fn();
      setDragGhost(makeDataTransfer(setDragImage), {
        testid: 'y-drag-ghost',
        label: '阀',
        style: 'background:var(--nop-surface);color:hsl(var(--primary))',
        offsetX: 14,
        offsetY: 10,
      });
      const [ghostArg, offsetX, offsetY] = setDragImage.mock.calls[0] as unknown as [
        Element,
        number,
        number,
      ];
      expect(offsetX).toBe(14);
      expect(offsetY).toBe(10);
      const ghost = queryGhost('y-drag-ghost') as HTMLElement;
      expect(ghost).toBe(ghostArg);
      expect(ghost.style.background).toBe('var(--nop-surface)');
      expect(ghost.style.position).toBe('fixed');
    } finally {
      vi.useRealTimers();
    }
  });

  it('no-ops without mounting a ghost when setDragImage is missing (feature-detect guard)', () => {
    expect(() => setDragGhost(makeDataTransfer(), { testid: 'z-drag-ghost', label: 'x' })).not.toThrow();
    expect(queryGhost('z-drag-ghost')).toBeNull();
  });

  it('no-ops when dataTransfer is null', () => {
    expect(() =>
      setDragGhost({ dataTransfer: null }, { testid: 'z-drag-ghost', label: 'x' }),
    ).not.toThrow();
    expect(queryGhost('z-drag-ghost')).toBeNull();
  });

  it('removes the ghost synchronously without throwing when setDragImage rejects (unified defense, B-derived semantics)', () => {
    vi.useFakeTimers();
    try {
      const setDragImage = vi.fn(() => {
        throw new Error('Not implemented');
      });
      expect(() =>
        setDragGhost(makeDataTransfer(setDragImage), { testid: 'w-drag-ghost', label: 'x' }),
      ).not.toThrow();
      expect(setDragImage).toHaveBeenCalledTimes(1);
      // 同步移除语义：fake timers 未跑，ghost 已不在 body（catch 分支 ghost.remove()）
      expect(queryGhost('w-drag-ghost')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
