import { describe, expect, it } from 'vitest';
import { PAPER_SIZE_PRESETS, type PrintPageSchema } from './schemas.js';
import {
  MM_PER_INCH,
  PT_PER_MM,
  PX_PER_MM,
  getContentRect,
  getRegionRect,
  mmToPt,
  mmToPx,
  ptToMm,
  pxToMm,
} from './unit.js';

describe('unit conversion', () => {
  it('converts mm to px at 96dpi', () => {
    expect(PX_PER_MM).toBeCloseTo(3.7795, 4);
    expect(mmToPx(100)).toBeCloseTo(377.95, 2);
    expect(pxToMm(mmToPx(42))).toBeCloseTo(42, 6);
  });

  it('converts mm to pt', () => {
    expect(PT_PER_MM).toBeCloseTo(2.8346, 4);
    expect(mmToPt(210)).toBeCloseTo(595.28, 1);
    expect(ptToMm(mmToPt(297))).toBeCloseTo(297, 6);
  });

  it('keeps inch anchor consistent', () => {
    expect(mmToPx(MM_PER_INCH)).toBeCloseTo(96, 6);
    expect(mmToPt(MM_PER_INCH)).toBeCloseTo(72, 6);
  });
});

describe('paper presets', () => {
  it('aligns physical paper sizes with word-editor pt presets', () => {
    // word-editor-core PAPER_SIZE_PRESETS.a4 = {595, 842}pt → 210×297mm
    expect(PAPER_SIZE_PRESETS.a4.width).toBeCloseTo(ptToMm(595), 0);
    expect(PAPER_SIZE_PRESETS.a4.height).toBeCloseTo(ptToMm(842), 0);
    expect(PAPER_SIZE_PRESETS.a4).toEqual({ width: 210, height: 297 });
    expect(PAPER_SIZE_PRESETS.a5).toEqual({ width: 148, height: 210 });
  });
});

describe('getContentRect', () => {
  it('insets page by margins and subtracts header/footer heights', () => {
    const page: PrintPageSchema = {
      paper: { width: 210, height: 297, direction: 'vertical', margins: [10, 15, 20, 25] },
      unit: 'mm' as const,
      headerHeight: 12,
      footerHeight: 8,
    };
    expect(getContentRect(page)).toEqual({
      left: 25,
      top: 22,
      width: 210 - 25 - 15,
      height: 297 - 10 - 20 - 12 - 8,
    });
  });

  it('clamps to zero when margins overflow the page', () => {
    const page: PrintPageSchema = {
      paper: { width: 50, height: 50, direction: 'vertical', margins: [30, 30, 30, 30] },
      unit: 'mm' as const,
      headerHeight: 10,
      footerHeight: 10,
    };
    const rect = getContentRect(page);
    expect(rect.width).toBe(0);
    expect(rect.height).toBe(0);
  });
});

describe('getRegionRect', () => {
  const page: PrintPageSchema = {
    paper: { width: 210, height: 297, direction: 'vertical', margins: [10, 15, 20, 25] },
    unit: 'mm' as const,
    headerHeight: 12,
    footerHeight: 8,
  };

  it('places header between top margin and header height', () => {
    expect(getRegionRect(page, 'header')).toEqual({ left: 25, top: 10, width: 170, height: 12 });
  });

  it('places footer above bottom margin', () => {
    expect(getRegionRect(page, 'footer')).toEqual({ left: 25, top: 269, width: 170, height: 8 });
  });

  it('returns body rect equal to content rect', () => {
    expect(getRegionRect(page, 'body')).toEqual(getContentRect(page));
  });
});
