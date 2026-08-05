import { Line } from 'leafer-ui';
import type { ScadaSymbolDefinition } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';
import { toNodePatch } from '../symbol-factory.js';

export const scadaPipeType = 'scada-pipe';

/** pipe 默认宽/高（create 与 defaultGeometryPoints 共用，保持渲染几何与 bounds 同源）。 */
const PIPE_DEFAULT_WIDTH = 100;
const PIPE_DEFAULT_HEIGHT = 0;

function pipePoints(width: number, height: number): number[] {
  return [0, 0, width, height];
}

export const scadaPipeDefinition: ScadaSymbolDefinition = {
  type: scadaPipeType,
  name: 'Pipe',
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
  },
  defaults: { x: 0, y: 0, width: PIPE_DEFAULT_WIDTH, height: PIPE_DEFAULT_HEIGHT, fill: '#3f7b5a', stroke: '#3f7b5a', strokeWidth: 6 },
  create: ({ props }) => {
    const attrs = toShapeAttrs(props);
    const width = (attrs.width as number | undefined) ?? PIPE_DEFAULT_WIDTH;
    const height = (attrs.height as number | undefined) ?? PIPE_DEFAULT_HEIGHT;
    delete attrs.width;
    delete attrs.height;
    attrs.points = pipePoints(width, height);
    attrs.strokeCap = 'round';
    if (attrs.fill !== undefined && attrs.stroke === undefined) {
      attrs.stroke = attrs.fill;
    }
    return new Line(attrs);
  },
  // plan 2026-08-05-0653-3 B2：width/height 经 applyProps/绑定变更后重算 points，使绑定产出可见几何响应。
  applyProps: (node, props) => {
    const { width, height, ...rest } = props;
    if (width !== undefined || height !== undefined) {
      const currentPoints = (node as unknown as { points?: number[] }).points;
      const w = width ?? currentPoints?.[2] ?? PIPE_DEFAULT_WIDTH;
      const h = height ?? currentPoints?.[3] ?? PIPE_DEFAULT_HEIGHT;
      node.set({ points: pipePoints(w, h) });
    }
    const patch = toNodePatch(node, rest);
    if (Object.keys(patch).length > 0) node.set(patch);
  },
  // plan 2026-08-05-0653-3 B2：与 line/arrow 同构，bounds 路径按节点 width/height 算包围盒。
  defaultGeometryPoints: (node) => {
    const w = node.width ?? PIPE_DEFAULT_WIDTH;
    const h = node.height ?? PIPE_DEFAULT_HEIGHT;
    return [0, 0, w, h];
  },
};
