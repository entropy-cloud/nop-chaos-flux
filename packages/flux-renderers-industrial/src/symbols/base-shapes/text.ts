import { Text } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaTextType = 'scada-text';

/**
 * 文本宽度测量（plan 2026-08-04-2243-2 D2）：浏览器用 canvas 2d `measureText`，无 canvas 环境
 * （happy-dom/jsdom 单测）回退到按字号 × 字数的确定性启发式（≈0.6em/char）。返回值用于在自动宽
 * Text 上设置显式 `width`，使 leafer `textAlign` 有 layoutWidth 产生有效偏移（autoSizeAlign 在
 * 无 layoutWidth 时不生效，已核实 leafer-ui@2.2.9）。真实浏览器的字体度量/加载时机差异属渲染观察项
 * （watch-only residual，本 plan Deferred），契约面（width 按内容测量设置）由确定性 fallback 兜底。
 */
export function measureTextWidth(
  text: string,
  fontSize: number,
  fontFamily?: string,
  fontWeight?: string,
): number {
  if (typeof document !== 'undefined') {
    try {
      const ctx = document.createElement('canvas').getContext('2d');
      if (ctx) {
        const weight = fontWeight ? `${fontWeight} ` : '';
        ctx.font = `${weight}${fontSize}px ${fontFamily ?? 'sans-serif'}`;
        const metrics = ctx.measureText(text);
        if (typeof metrics?.width === 'number' && Number.isFinite(metrics.width) && metrics.width > 0) {
          return metrics.width;
        }
      }
    } catch {
      // canvas 不可用（如 happy-dom）→ 落到 fallback
    }
  }
  return Math.max(0, text.length) * fontSize * 0.6;
}

export const scadaTextDefinition: ScadaSymbolDefinition = {
  type: scadaTextType,
  name: 'Text',
  category: 'shape',
  props: {
    x: { type: 'number' },
    y: { type: 'number' },
    width: { type: 'number' },
    height: { type: 'number' },
    rotation: { type: 'number' },
    scale: { type: 'number' },
    visible: { type: 'boolean' },
    opacity: { type: 'number' },
    text: { type: 'string' },
    textColor: { type: 'string' },
    textSize: { type: 'number' },
    fontFamily: { type: 'string' },
    fontWeight: { type: 'string' },
    align: { type: 'string' },
  },
  defaults: { x: 0, y: 0, text: '', textColor: '#000000', textSize: 14 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (props.textSize !== undefined) attrs.fontSize = props.textSize;
    if (props.align !== undefined) attrs.textAlign = props.align;
    if (props.fontFamily !== undefined) attrs.fontFamily = props.fontFamily;
    if (props.fontWeight !== undefined) attrs.fontWeight = props.fontWeight;
    if (attrs.fill === undefined && props.textColor !== undefined) attrs.fill = props.textColor;
    if (attrs.text === undefined) attrs.text = '';
    // plan 2026-08-04-2243-2 D2：自动宽（无显式 width）下 center/right 对齐需 layoutWidth 才生效。
    // 按内容测量设置 width，并把图元原点平移到对齐锚（center→文本中心、right→文本右缘落在 node.x），
    // 使「居中/右对齐在自动宽下生效」与 instrument 路径（显式 width）语义一致。
    const align = props.align;
    if ((align === 'center' || align === 'right') && props.width === undefined) {
      const text = typeof attrs.text === 'string' ? attrs.text : '';
      const fontSize = typeof attrs.fontSize === 'number' ? attrs.fontSize : 14;
      const measured = measureTextWidth(
        text,
        fontSize,
        typeof attrs.fontFamily === 'string' ? attrs.fontFamily : undefined,
        typeof attrs.fontWeight === 'string' ? attrs.fontWeight : undefined,
      );
      attrs.width = measured;
      const origin = typeof attrs.x === 'number' ? attrs.x : 0;
      attrs.x = align === 'center' ? origin - measured / 2 : origin - measured;
    }
    return new Text(attrs);
  },
};
