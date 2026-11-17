import type { ScreenshotResultWire } from '../protocol/types.js';

export class CaptureError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'CaptureError';
    this.code = code;
  }
}

interface CaptureMaskResult {
  maskedCount: number;
}

interface CaptureRedactionRule {
  matches(element: Element): boolean;
}

export const MASK_COLOR = 'rgba(17, 17, 17, 1)';
export const MASK_LABEL = '已脱敏';

/** Mask sensitive elements on the CLONE only — the live DOM must stay untouched. */
export function applyRedactionMask(clone: Element, rules: CaptureRedactionRule[]): CaptureMaskResult {
  let maskedCount = 0;
  const candidates = clone.querySelectorAll('[type="password"], [data-nop-sensitive]');
  candidates.forEach((element) => {
    maskElement(element as HTMLElement);
    maskedCount += 1;
  });
  for (const rule of rules) {
    clone.querySelectorAll('*').forEach((element) => {
      if (element.hasAttribute('data-nop-masked')) return;
      if (rule.matches(element)) {
        maskElement(element as HTMLElement);
        maskedCount += 1;
      }
    });
  }
  return { maskedCount };
}

function maskElement(element: HTMLElement): void {
  element.setAttribute('data-nop-masked', '');
  element.style.backgroundColor = MASK_COLOR;
  element.style.color = 'transparent';
  element.style.textShadow = 'none';
  const text = element.ownerDocument.createElement('span');
  text.textContent = MASK_LABEL;
  Array.from(element.childNodes).forEach((node) => node.remove());
  element.appendChild(text);
}

/** Lightweight structural signature: tag + cid + class + text length, ignores pure styling. */
export function computeDomSignature(root: Element): string {
  const parts: string[] = [];
  const walk = (element: Element) => {
    const cid = element.getAttribute('data-cid') ?? '';
    const classes = element.getAttribute('class') ?? '';
    let textLength = 0;
    for (const child of element.childNodes) {
      if (child.nodeType === 3) textLength += (child.textContent ?? '').trim().length;
    }
    parts.push(`${element.tagName}.${cid}.${classes}#${textLength}`);
    if (element.children.length > 0) Array.from(element.children).forEach(walk);
  };
  walk(root);
  return parts.join('|');
}

async function digestHash(bytes: Uint8Array): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes as never);
    return Array.from(new Uint8Array(digest).slice(0, 8))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  let hash = 5381;
  for (const byte of bytes) hash = ((hash << 5) + hash + byte) | 0;
  return `fnv-${(hash >>> 0).toString(16)}`;
}

type Rasterizer = (svg: string, width: number, height: number, mime: string) => Promise<Uint8Array>;

let rasterizationCount = 0;
export function getRasterizationCount(): number {
  return rasterizationCount;
}
export function resetRasterizationCount(): void {
  rasterizationCount = 0;
}

function defaultRasterizer(svg: string, width: number, height: number, mime: string): Promise<Uint8Array> {
  return new Promise<Uint8Array>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new CaptureError('canvas-unavailable', '2d context unavailable'));
          return;
        }
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new CaptureError('canvas-taint', 'canvas produced empty blob (possibly tainted)'));
              return;
            }
            void blob
              .arrayBuffer()
              .then((buffer) => resolve(new Uint8Array(buffer)));
          },
          mime,
        );
      } catch (error) {
        reject(new CaptureError('canvas-taint', error instanceof Error ? error.message : String(error)));
      }
    };
    image.onerror = () => reject(new CaptureError('svg-raster-failed', 'svg image failed to load'));
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

function toXhtml(element: Element): string {
  const Serializer = element.ownerDocument?.defaultView?.XMLSerializer ?? globalThis.XMLSerializer;
  return new Serializer().serializeToString(element);
}

function wrapSvg(xhtml: string, width: number, height: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
}

interface CaptureScreenshotInput {
  root: Element;
  width: number;
  height: number;
  degradedReasons?: string[];
  format?: 'png' | 'webp';
  scale?: number;
  redactionRules?: CaptureRedactionRule[];
  maskSensitive?: boolean;
  rasterizer?: Rasterizer;
  now?: () => number;
  idPrefix?: string;
  refs?: { epoch?: number; cid?: string; interactionId?: string; tag?: string };
}

export async function captureScreenshotFromClone(input: CaptureScreenshotInput): Promise<ScreenshotResultWire> {
  if (input.width <= 0 || input.height <= 0) {
    throw new CaptureError('capture-zero-size', `invalid target size ${input.width}x${input.height}`);
  }
  const scale = input.scale ?? 1;
  const mime = input.format === 'png' ? 'image/png' : 'image/webp';
  const clone = input.root.cloneNode(true) as Element;
  clone.querySelectorAll('script').forEach((node) => node.remove());
  if (input.maskSensitive !== false && input.redactionRules?.length) {
    applyRedactionMask(clone, input.redactionRules);
  }
  const degradedReasons = input.degradedReasons ?? [];
  // cross-origin <img> pre-check: non-CORS images would taint the canvas —
  // replace them with placeholders and mark the capture degraded
  clone.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') ?? '';
    const crossOrigin = img.getAttribute('crossorigin');
    const sameOrigin = typeof location !== 'undefined' ? src.startsWith('/') || src.startsWith(location.origin) : true;
    if (src && !crossOrigin && !sameOrigin) {
      const placeholder = input.root.ownerDocument!.createElement('div');
      placeholder.setAttribute('data-nop-image-placeholder', '');
      placeholder.setAttribute('style', `width:${img.getAttribute('width') ?? '100px'};height:${img.getAttribute('height') ?? '100px'};display:inline-block;background:#333;color:#ccc;`);
      placeholder.textContent = 'image';
      img.replaceWith(placeholder);
      if (!degradedReasons.includes('cross-origin image replaced')) {
        degradedReasons.push('cross-origin image replaced');
      }
    }
  });
  const xhtml = toXhtml(clone);
  const svg = wrapSvg(xhtml, input.width, input.height);
  rasterizationCount += 1;
  const bytes = await (input.rasterizer ?? defaultRasterizer)(svg, Math.round(input.width * scale), Math.round(input.height * scale), mime);
  const hash = await digestHash(bytes);
  return {
    id: `${input.idPrefix ?? 'shot'}-${hash}`,
    backend: 'foreign-object',
    ...(degradedReasons.length > 0 ? { degraded: { reasons: degradedReasons } } : {}),
    width: Math.round(input.width * scale),
    height: Math.round(input.height * scale),
    encoding: 'base64',
    bytes: bytesToBase64(bytes),
    mime,
    hash,
    createdAt: input.now?.() ?? Date.now(),
    ...(input.refs ? { refs: input.refs } : {}),
  };
}

interface IncrementalCaptureState {
  lastSignature: string | null;
  lastResult: ScreenshotResultWire | null;
}

export function createIncrementalCapturer() {
  const state: IncrementalCaptureState = { lastSignature: null, lastResult: null };
  return {
    state,
    async capture(input: CaptureScreenshotInput): Promise<{ result: ScreenshotResultWire; reused: boolean }> {
      const signature = computeDomSignature(input.root);
      if (state.lastSignature === signature && state.lastResult) {
        return { result: state.lastResult, reused: true };
      }
      const result = await captureScreenshotFromClone(input);
      state.lastSignature = signature;
      state.lastResult = result;
      return { result, reused: false };
    },
  };
}

/** Browser-only: decode base64 image bytes to RGBA pixels (for visual diff). */
export async function decodeImageBytesToRgba(bytes: string, width: number, height: number): Promise<Uint8ClampedArray> {
  if (typeof document === 'undefined') {
    throw new CaptureError('capture-unavailable', 'image decoding requires a browser document');
  }
  const image = new Image();
  image.src = `data:image/png;base64,${bytes}`;
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new CaptureError('decode-failed', 'image failed to decode'));
  });
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new CaptureError('canvas-unavailable', '2d context unavailable');
  context.drawImage(image, 0, 0, width, height);
  return context.getImageData(0, 0, width, height).data;
}
