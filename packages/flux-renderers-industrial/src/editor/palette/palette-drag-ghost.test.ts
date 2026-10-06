import { describe, it, expect, vi, afterEach } from 'vitest';
import { setScadaPaletteDragGhost } from './palette-drag-ghost.js';

function makeDataTransfer(withSetDragImage: boolean): { dataTransfer: DataTransfer } {
  const dt = {
    setData: vi.fn(),
    effectAllowed: '',
  } as unknown as DataTransfer;
  if (withSetDragImage) {
    (dt as unknown as { setDragImage: ReturnType<typeof vi.fn> }).setDragImage = vi.fn();
  }
  return { dataTransfer: dt };
}

afterEach(() => {
  document.body.querySelectorAll('[data-testid="scada-editor-drag-ghost"]').forEach((el) => el.remove());
});

describe('setScadaPaletteDragGhost (plan 531 S2 Phase 1, 527 双守卫移植)', () => {
  it('appends an offscreen ghost with testid and hands it to setDragImage', () => {
    vi.useFakeTimers();
    try {
      const { dataTransfer } = makeDataTransfer(true);
      const spy = (dataTransfer as unknown as { setDragImage: ReturnType<typeof vi.fn> }).setDragImage;
      setScadaPaletteDragGhost({ dataTransfer }, '矩形');
      const ghost = document.body.querySelector('[data-testid="scada-editor-drag-ghost"]');
      expect(ghost).not.toBeNull();
      expect(ghost?.textContent).toBe('矩形');
      const style = (ghost as HTMLElement).style;
      expect(style.pointerEvents).toBe('none');
      expect(style.position).toBe('fixed');
      expect(Number.parseInt(style.top, 10)).toBeLessThan(0);
      expect(spy).toHaveBeenCalledTimes(1);
      // setDragImage 后即刻移除（timeout 0 兜底 cleanup，527 同款）。
      vi.runAllTimers();
      expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('no-ops without mounting a ghost when setDragImage is missing (feature-detect guard)', () => {
    const { dataTransfer } = makeDataTransfer(false);
    expect(() => setScadaPaletteDragGhost({ dataTransfer }, '矩形')).not.toThrow();
    expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
  });

  it('no-ops when dataTransfer is null', () => {
    expect(() => setScadaPaletteDragGhost({ dataTransfer: null }, '矩形')).not.toThrow();
    expect(document.body.querySelector('[data-testid="scada-editor-drag-ghost"]')).toBeNull();
  });
});
