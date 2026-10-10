import { Line, Rect } from 'leafer-ui';
import { applyCompositeProps, compositePropSchema, createCompositeGroup, setAttrs } from '../composite.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps } from '../symbol-types.js';

/**
 * 管件族（559 Phase 1，对标 ThingsBoard 连接件族：弯头/三通/四通）：
 * 每个管件 = 2-3 条粗描边线段（strokeCap round），中心交叠处自然成弯/三通/四通形态；
 * 隐形 body Rect 承载声明尺寸（Group 不承接 width/height，pipe-junction 同因）；
 * flow 动画/dashOffset/strokeWidth/stroke/fill 增量路由到全部线段（pipe-junction 同法）。
 */

const FLOW_DASH_FALLBACK = [10, 6];

type Segments = Array<{ x1: number; y1: number; x2: number; y2: number }>;

interface FittingState {
  body: LeafNode;
  segments: LeafNode[];
  layout: (width: number, height: number) => Segments;
}

const stateOf = new WeakMap<LeafNode, FittingState>();

function flowPatch(flow: ScadaSymbolProps['flow'] | undefined, strokeDash: number[] | undefined): Record<string, unknown> {
  if (flow?.enabled !== true) return { dashPattern: [] };
  const dash = flow.dash ?? strokeDash;
  return { dashPattern: dash && dash.length > 0 ? dash : FLOW_DASH_FALLBACK };
}

function createPipeFitting(
  type: string,
  name: string,
  defaults: { width: number; height: number },
  layout: (width: number, height: number) => Segments,
): ScadaSymbolDefinition {
  return {
    type,
    name,
    category: 'pipe',
    props: compositePropSchema,
    defaults: {
      x: 0,
      y: 0,
      width: defaults.width,
      height: defaults.height,
      fill: '#3f7b5a',
      stroke: '#3f7b5a',
      strokeWidth: 8,
      states: {
        states: { run: {}, stop: {} },
        booleanMap: { true: 'run', false: 'stop' },
      },
      animations: [{ kind: 'flow', period: 1000, when: { state: 'run' } }],
    },
    create: ({ props }) => {
      const width = props.width as number;
      const height = props.height as number;
      const body = new Rect({
        name: 'body',
        x: 0,
        y: 0,
        width,
        height,
        visible: false,
      }) as LeafNode;
      const segmentNodes = layout(width, height).map((segment, index) =>
        new Line({
          name: `segment-${index}`,
          points: [segment.x1, segment.y1, segment.x2, segment.y2],
          stroke: props.stroke ?? props.fill,
          strokeWidth: props.strokeWidth ?? 8,
          strokeCap: 'round',
        }) as LeafNode,
      );
      if (props.flow?.enabled === true) {
        for (const segment of segmentNodes) {
          segment.set({ ...flowPatch(props.flow, props.strokeDash), dashOffset: props.dashOffset ?? 0 });
        }
      }
      const { root } = createCompositeGroup(props, [
        { name: 'body', node: body },
        ...segmentNodes.map((node, index) => ({ name: `segment-${index}`, node })),
      ]);
      stateOf.set(root, { body, segments: segmentNodes, layout });
      return root;
    },
    applyProps: (node, props) => {
      const state = stateOf.get(node);
      if (!state) return;
      if (props.width !== undefined || props.height !== undefined) {
        const width = props.width ?? (state.body as unknown as { width: number }).width;
        const height = props.height ?? (state.body as unknown as { height: number }).height;
        setAttrs(state.body, { width, height });
        state.segments.forEach((segment, index) => {
          const s = layout(width, height)[index];
          if (s) setAttrs(segment, { points: [s.x1, s.y1, s.x2, s.y2] });
        });
      }
      const patch: Record<string, unknown> = {};
      if (props.flow !== undefined) {
        Object.assign(patch, flowPatch(props.flow, props.strokeDash));
        if (props.flow.enabled === true && props.dashOffset === undefined) patch.dashOffset = 0;
      }
      if (props.dashOffset !== undefined) patch.dashOffset = props.dashOffset;
      if (props.strokeWidth !== undefined) patch.strokeWidth = props.strokeWidth;
      if (props.stroke !== undefined) patch.stroke = props.stroke;
      if (props.fill !== undefined) patch.fill = props.fill;
      if (Object.keys(patch).length > 0) {
        for (const segment of state.segments) segment.set(patch);
      }
      applyCompositeProps(node, { root: node, body: state.body }, props);
    },
  };
}

export const scadaPipeElbowType = 'scada-pipe-elbow';

/** 90° 弯头：水平段 + 竖直段在中心交汇。 */
export const scadaPipeElbowDefinition = createPipeFitting(scadaPipeElbowType, 'Pipe Elbow', { width: 60, height: 60 }, (w, h) => [
  { x1: 0, y1: h / 2, x2: w / 2, y2: h / 2 },
  { x1: w / 2, y1: h / 2, x2: w / 2, y2: h },
]);

export const scadaPipeTeeType = 'scada-pipe-tee';

/** 三通：贯通水平段 + 中心支路向上。 */
export const scadaPipeTeeDefinition = createPipeFitting(scadaPipeTeeType, 'Pipe Tee', { width: 80, height: 60 }, (w, h) => [
  { x1: 0, y1: h / 2, x2: w, y2: h / 2 },
  { x1: w / 2, y1: h / 2, x2: w / 2, y2: 0 },
]);

export const scadaPipeCrossType = 'scada-pipe-cross';

/** 四通：水平贯通 + 竖直贯通在中心交汇。 */
export const scadaPipeCrossDefinition = createPipeFitting(scadaPipeCrossType, 'Pipe Cross', { width: 80, height: 80 }, (w, h) => [
  { x1: 0, y1: h / 2, x2: w, y2: h / 2 },
  { x1: w / 2, y1: 0, x2: w / 2, y2: h },
]);
