import { Rect } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaVideoType = 'scada-video';

export const SCADA_VIDEO_PLACEHOLDER = '#2b2f36';

function urlOf(custom: Record<string, unknown> | undefined): string | undefined {
  const url = custom?.url;
  return typeof url === 'string' && url.trim() !== '' ? url : undefined;
}

export const scadaVideoDefinition: ScadaSymbolDefinition = {
  type: scadaVideoType,
  name: 'Video',
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
    custom: { type: 'object' },
  },
  defaults: { x: 0, y: 0, width: 160, height: 90, fill: SCADA_VIDEO_PLACEHOLDER },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (attrs.width === undefined) attrs.width = 160;
    if (attrs.height === undefined) attrs.height = 90;
    if (attrs.fill === undefined) attrs.fill = SCADA_VIDEO_PLACEHOLDER;
    // plan 2026-08-06-0900-2 P2-7：stroke/strokeWidth 改 guarded（与上方 fill 行对称），author 声明不被覆盖。
    if (attrs.stroke === undefined) attrs.stroke = '#4b5563';
    if (attrs.strokeWidth === undefined) attrs.strokeWidth = 1;
    // 静态占位帧：真实视频解码/播放接线归 I10（renderer 桥接层）；URL 暂存节点属性
    const url = urlOf(props.custom);
    const node = new Rect(attrs);
    if (url) node.set({ url });
    return node;
  },
};
