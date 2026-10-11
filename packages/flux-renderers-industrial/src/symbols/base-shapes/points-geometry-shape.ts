import { Line } from 'leafer-ui';
import type { GeometryLeaf, ScadaSymbolDefinition, ScadaSymbolPropSchema } from '../symbol-types.js';
import { toShapeAttrs } from './common.js';
import { toNodePatch } from '../symbol-factory.js';

/**
 * WA-industrial-004 (plan 569): shared factory for the zero-height straight
 * segment shapes (line/arrow/pipe — rendering geometry is `[0,0,w,h]`
 * derived from width/height, was a verbatim ×3 skeleton across applyProps /
 * defaultGeometryPoints / create). Extra per-shape create-time attrs go
 * through `decorateAttrs` (arrow's endArrow head, pipe's round cap +
 * fill→stroke propagation).
 */
interface PointsGeometryShapeOptions {
  type: string;
  name: string;
  defaultWidth: number;
  defaultHeight: number;
  /** Prop declarations appended after the shared geometry set (fill/fillStyle…). */
  extraProps?: ScadaSymbolPropSchema;
  /** Defaults appended after the shared geometry defaults (fill/stroke…). */
  extraDefaults?: Record<string, unknown>;
  /** Extra create-time attrs applied after points assignment. */
  decorateAttrs?: (attrs: Record<string, unknown>) => void;
}

export function createPointsGeometryShape(opts: PointsGeometryShapeOptions): ScadaSymbolDefinition {
  const points = (width: number, height: number): number[] => [0, 0, width, height];
  return {
    type: opts.type,
    name: opts.name,
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
      ...opts.extraProps,
      stroke: { type: 'string' },
      strokeWidth: { type: 'number' },
      strokeDash: { type: 'array' },
      dashOffset: { type: 'number' },
      shadow: { type: 'object' },
    },
    defaults: {
      x: 0,
      y: 0,
      width: opts.defaultWidth,
      height: opts.defaultHeight,
      stroke: '#000000',
      strokeWidth: 1,
      ...opts.extraDefaults,
    },
    create: ({ props }) => {
      const attrs = toShapeAttrs(props);
      const width = (attrs.width as number | undefined) ?? opts.defaultWidth;
      const height = (attrs.height as number | undefined) ?? opts.defaultHeight;
      delete attrs.width;
      delete attrs.height;
      attrs.points = points(width, height);
      opts.decorateAttrs?.(attrs);
      return new Line(attrs);
    },
    // plan 2026-08-05-0653-3 B2：width/height 经 applyProps/绑定变更后重算 points，使绑定产出可见几何响应。
    applyProps: (node, props) => {
      const { width, height, ...rest } = props;
      if (width !== undefined || height !== undefined) {
        const currentPoints = (node as GeometryLeaf).points;
        const w = width ?? currentPoints?.[2] ?? opts.defaultWidth;
        const h = height ?? currentPoints?.[3] ?? opts.defaultHeight;
        node.set({ points: points(w, h) });
      }
      const patch = toNodePatch(node, rest);
      if (Object.keys(patch).length > 0) node.set(patch);
    },
    // plan 2026-08-04-2243-2 D1：渲染几何 = [0,0,width,height]；bounds 路径按节点
    // width/height（或缺省值）算包围盒，使零高线段 fit 不退化为 0 尺寸。
    defaultGeometryPoints: (node) => {
      const w = node.width ?? opts.defaultWidth;
      const h = node.height ?? opts.defaultHeight;
      return [0, 0, w, h];
    },
  };
}
