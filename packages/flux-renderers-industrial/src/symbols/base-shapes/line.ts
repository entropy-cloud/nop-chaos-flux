import { Line } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';
import { toNodePatch } from '../symbol-factory.js';

export const scadaLineType = 'scada-line';

/** line 默认宽/高（create 与 defaultGeometryPoints 共用，保持渲染几何与 bounds 同源）。 */
const LINE_DEFAULT_WIDTH = 100;
const LINE_DEFAULT_HEIGHT = 0;

function linePoints(width: number, height: number): number[] {
  return [0, 0, width, height];
}

export const scadaLineDefinition: ScadaSymbolDefinition = {
  type: scadaLineType,
  name: 'Line',
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
    stroke: { type: 'string' },
    strokeWidth: { type: 'number' },
    strokeDash: { type: 'array' },
    dashOffset: { type: 'number' },
    shadow: { type: 'object' },
  },
  defaults: { x: 0, y: 0, width: LINE_DEFAULT_WIDTH, height: LINE_DEFAULT_HEIGHT, stroke: '#000000', strokeWidth: 1 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const width = (attrs.width as number | undefined) ?? LINE_DEFAULT_WIDTH;
    const height = (attrs.height as number | undefined) ?? LINE_DEFAULT_HEIGHT;
    delete attrs.width;
    delete attrs.height;
    attrs.points = linePoints(width, height);
    return new Line(attrs);
  },
  // plan 2026-08-05-0653-3 B2：width/height 经 applyProps/绑定变更后重算 points，使绑定产出可见几何响应。
  applyProps: (node, props) => {
    const { width, height, ...rest } = props;
    if (width !== undefined || height !== undefined) {
      const currentPoints = (node as unknown as { points?: number[] }).points;
      const w = width ?? currentPoints?.[2] ?? LINE_DEFAULT_WIDTH;
      const h = height ?? currentPoints?.[3] ?? LINE_DEFAULT_HEIGHT;
      node.set({ points: linePoints(w, h) });
    }
    const patch = toNodePatch(node, rest);
    if (Object.keys(patch).length > 0) node.set(patch);
  },
  // plan 2026-08-04-2243-2 D1：line 渲染几何 = [0,0,width,height]（运行时由 width/height 派生）。
  // bounds 路径在节点无 custom.points 时 consult 此 resolver，按节点 width/height（或缺省值）算包围盒，
  // 使零高线段（height=0）fit 不退化为 0 尺寸冲到 MAX_SCALE（width 仍贡献有效尺寸）。
  defaultGeometryPoints: (node) => {
    const w = node.width ?? LINE_DEFAULT_WIDTH;
    const h = node.height ?? LINE_DEFAULT_HEIGHT;
    return [0, 0, w, h];
  },
};
