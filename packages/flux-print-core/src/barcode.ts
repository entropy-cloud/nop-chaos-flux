import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import type { BarcodeType, QrcodeLevel } from './schemas.js';

export interface BarcodeSvgOptions {
  format?: BarcodeType;
  textVisible?: boolean;
}

/** 条码 → SVG 标记串（jsbarcode）。非法值/格式返回空串，不抛错。 */
export function createBarcodeSvg(value: string, options: BarcodeSvgOptions = {}): string {
  if (!value) return '';
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, value, {
      format: options.format ?? 'CODE128',
      displayValue: options.textVisible ?? false,
      height: 40,
      width: 2,
      margin: 0,
    });
    return svg.outerHTML;
  } catch {
    return '';
  }
}

export interface QrcodeSvgOptions {
  level?: QrcodeLevel;
  foreground?: string;
}

/** 二维码 → SVG 标记串（qrcode 包同步 create API）。非法值返回空串，不抛错。 */
export function createQrcodeSvg(value: string, options: QrcodeSvgOptions = {}): string {
  if (!value) return '';
  try {
    const qr = QRCode.create(value, { errorCorrectionLevel: options.level ?? 'M' });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const cell = 4;
    const total = size * cell;
    // 属性消毒（review D15-01）：前景色仅保留 CSS 颜色字符，阻断 fill 属性逃逸
    const darkColor = (options.foreground ?? '#000000').replace(/[^#a-zA-Z0-9(),.%\s-]/g, '');
    let rects = '';
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (data[row * size + col]) {
          rects += `<rect x="${col * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="${darkColor}"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">${rects}</svg>`;
  } catch {
    return '';
  }
}
