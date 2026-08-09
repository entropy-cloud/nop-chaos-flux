import { Rect } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaRoundRectType = 'scada-round-rect';

export const scadaRoundRectDefinition: ScadaSymbolDefinition = {
  type: scadaRoundRectType,
  name: 'Round Rectangle',
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
    fill: { type: 'string' },
    fillStyle: { type: 'any' },
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
    strokeDash: { type: 'array' },
    dashOffset: { type: 'number' },
    shadow: { type: 'object' },
    // plan 2026-08-09-0121-2 Workstream B 本轮-6：per-instance cornerRadius 覆盖（缺省按尺寸缩放）。
    cornerRadius: { type: 'number' },
  },
  defaults: { x: 0, y: 0, width: 100, height: 100, fill: '#ffffff' },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    if (attrs.width === undefined) attrs.width = 100;
    if (attrs.height === undefined) attrs.height = 100;
    // plan 2026-08-09-0121-2 Workstream B 本轮-6：cornerRadius 从固定 8 改为按尺寸缩放——
    // 缺省 = min(width,height) * 0.08（100×100 仍得 8，向后兼容），并钳到 min(w,h)/2 防极小尺寸过度圆化；
    // 显式 props.cornerRadius 提供时优先（仍钳到 min(w,h)/2 防退化）。
    const minSide = Math.min(attrs.width as number, attrs.height as number);
    const explicit = typeof props.cornerRadius === 'number' ? props.cornerRadius : undefined;
    const raw = explicit !== undefined ? explicit : minSide * 0.08;
    attrs.cornerRadius = Math.min(raw, minSide / 2);
    return new Rect(attrs);
  },
};
