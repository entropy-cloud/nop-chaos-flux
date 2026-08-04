import { Line } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';

export const scadaArrowType = 'scada-arrow';

/** arrow 默认宽/高（create 与 defaultGeometryPoints 共用，保持渲染几何与 bounds 同源）。 */
const ARROW_DEFAULT_WIDTH = 100;
const ARROW_DEFAULT_HEIGHT = 0;

export const scadaArrowDefinition: ScadaSymbolDefinition = {
  type: scadaArrowType,
  name: 'Arrow',
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
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
    strokeDash: { type: 'array' },
    dashOffset: { type: 'number' },
    shadow: { type: 'object' },
  },
  defaults: { x: 0, y: 0, width: ARROW_DEFAULT_WIDTH, height: ARROW_DEFAULT_HEIGHT, stroke: '#000000', strokeWidth: 1 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const width = (attrs.width as number | undefined) ?? ARROW_DEFAULT_WIDTH;
    const height = (attrs.height as number | undefined) ?? ARROW_DEFAULT_HEIGHT;
    delete attrs.width;
    delete attrs.height;
    attrs.points = [0, 0, width, height];
    attrs.endArrow = true;
    return new Line(attrs);
  },
  // plan 2026-08-04-2243-2 D1：arrow 渲染几何 = [0,0,width,height]（与 line 同构，仅多 endArrow 头）。
  defaultGeometryPoints: (node) => {
    const w = node.width ?? ARROW_DEFAULT_WIDTH;
    const h = node.height ?? ARROW_DEFAULT_HEIGHT;
    return [0, 0, w, h];
  },
};
