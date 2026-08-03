import { Line, Rect } from 'leafer-ui';
import { applyCompositeProps, compositePropSchema, createCompositeGroup } from '../composite.js';
import type { LeafNode, ScadaSymbolDefinition, ScadaSymbolProps } from '../symbol-types.js';

export const scadaPipeJunctionType = 'scada-pipe-junction';

/** 连接点声明（端点语义）：归一化坐标（0..1 相对图元尺寸）、流向（in/out/bidirectional）、连接目标设备 id（声明结构，编辑器连线交互后置 I16）。 */
export interface ScadaPipeConnection {
  id: string;
  x: number;
  y: number;
  direction: 'in' | 'out' | 'bidirectional';
  target?: string;
}

interface JunctionState {
  body: LeafNode;
  stubs: LeafNode[];
}

const junctionState = new WeakMap<LeafNode, JunctionState>();

const FLOW_DASH_FALLBACK = [10, 6];

/** flow 参数 → stub 增量 patch（enabled/dash 消费，gate-3-review §10 归属兑现）。 */
function flowPatch(flow: ScadaSymbolProps['flow'] | undefined, strokeDash: number[] | undefined): Record<string, unknown> {
  if (flow?.enabled !== true) return { dashPattern: [] };
  const dash = flow.dash ?? strokeDash;
  return { dashPattern: dash && dash.length > 0 ? dash : FLOW_DASH_FALLBACK };
}

/**
 * 管道连接点（I9.4，gate-3-review §10 归属兑现）：
 * - 连接点语义：`custom.connections` 端点声明（归一化坐标 + 流向 + 目标设备），create 时渲染为管段；
 * - 流动方向动画：flow 参数（enabled/speed/dash）与 dashOffset 经 applyProps 增量消费
 *   （区别于基础 scada-pipe 的直写路径）；I6.3 animator flow kind 写 dashOffset 驱动 dash 位移；
 * - 与设备连接语义：connections[].target 连接关系声明结构，序列化经 custom 透传（编辑器连线后置 I16）。
 */
export const scadaPipeJunctionDefinition: ScadaSymbolDefinition = {
  type: scadaPipeJunctionType,
  name: 'Pipe Junction',
  category: 'pipe',
  props: compositePropSchema,
  defaults: {
    x: 0,
    y: 0,
    width: 80,
    height: 40,
    fill: '#3f7b5a',
    stroke: '#3f7b5a',
    strokeWidth: 6,
    custom: { connections: [] },
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
      cornerRadius: 8,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const connections: ScadaPipeConnection[] = Array.isArray(props.custom?.connections)
      ? (props.custom.connections as ScadaPipeConnection[])
      : [];
    const centerX = width / 2;
    const centerY = height / 2;
    const stubs = connections.map((connection, index) =>
      new Line({
        name: `stub-${connection.id ?? index}`,
        x: centerX,
        y: centerY,
        points: [0, 0, connection.x * width - centerX, connection.y * height - centerY],
        stroke: props.stroke ?? props.fill,
        strokeWidth: 4,
        strokeCap: 'round',
        ...(connection.direction === 'in' ? {} : { endArrow: true }),
      }) as LeafNode,
    );
    if (props.flow?.enabled === true) {
      for (const stub of stubs) {
        stub.set({ ...flowPatch(props.flow, props.strokeDash), dashOffset: props.dashOffset ?? 0 });
      }
    }
    const { root } = createCompositeGroup(props, [
      { name: 'body', node: body },
      ...stubs.map((stub, index) => ({ name: `stub-${index}`, node: stub })),
    ]);
    junctionState.set(root, { body, stubs });
    return root;
  },
  applyProps: (node, props) => {
    const state = junctionState.get(node);
    if (!state) return;
    const patch: Record<string, unknown> = {};
    if (props.flow !== undefined) {
      Object.assign(patch, flowPatch(props.flow, props.strokeDash));
      if (props.flow.enabled === true && props.dashOffset === undefined) patch.dashOffset = 0;
    }
    if (props.dashOffset !== undefined) patch.dashOffset = props.dashOffset;
    if (Object.keys(patch).length > 0) {
      for (const stub of state.stubs) stub.set(patch);
    }
    applyCompositeProps(node, { root: node, body: state.body }, props);
  },
};
