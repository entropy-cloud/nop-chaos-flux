import type { PrintPageSchema } from './schemas.js';

export const MM_PER_INCH = 25.4;
export const PX_PER_INCH = 96;
export const PT_PER_INCH = 72;

export const PX_PER_MM = PX_PER_INCH / MM_PER_INCH;
export const PT_PER_MM = PT_PER_INCH / MM_PER_INCH;

export function mmToPx(mm: number): number {
  return mm * PX_PER_MM;
}

export function pxToMm(px: number): number {
  return px / PX_PER_MM;
}

export function mmToPt(mm: number): number {
  return mm * PT_PER_MM;
}

export function ptToMm(pt: number): number {
  return pt / PT_PER_MM;
}

export interface PrintRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * body 内容区（mm，页面坐标）：由四边 margin 划定，再扣除页眉/页脚高度。
 * 页眉区 = [margin.top, margin.top + headerHeight)；页脚区对称。
 */
export function getContentRect(page: PrintPageSchema): PrintRect {
  const [marginTop, marginRight, marginBottom, marginLeft] = page.paper.margins;
  const headerHeight = page.headerHeight ?? 0;
  const footerHeight = page.footerHeight ?? 0;
  const left = marginLeft;
  const top = marginTop + headerHeight;
  return {
    left,
    top,
    width: Math.max(0, page.paper.width - marginLeft - marginRight),
    height: Math.max(0, page.paper.height - marginTop - marginBottom - headerHeight - footerHeight),
  };
}

/** 区域矩形（mm，页面坐标）：header 在内容区上方、footer 在下方，body 即 getContentRect。 */
export function getRegionRect(page: PrintPageSchema, region: 'header' | 'body' | 'footer'): PrintRect {
  const [marginTop, marginRight, marginBottom, marginLeft] = page.paper.margins;
  const headerHeight = page.headerHeight ?? 0;
  const footerHeight = page.footerHeight ?? 0;
  if (region === 'header') {
    return {
      left: marginLeft,
      top: marginTop,
      width: Math.max(0, page.paper.width - marginLeft - marginRight),
      height: headerHeight,
    };
  }
  if (region === 'footer') {
    return {
      left: marginLeft,
      top: Math.max(0, page.paper.height - marginBottom - footerHeight),
      width: Math.max(0, page.paper.width - marginLeft - marginRight),
      height: footerHeight,
    };
  }
  return getContentRect(page);
}
