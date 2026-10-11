import { Line, Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import type { GeometryLeaf, LeafNode } from '../symbol-types.js';

export const scadaInstrumentTrendType = 'scada-instrument-trend';

interface TrendState {
  samples: number[];
  capacity: number;
  polyline: LeafNode;
  grid: LeafNode[];
  label: LeafNode;
}

const trendStates = new WeakMap<LeafNode, TrendState>();

/**
 * 迷你趋势图（559 Phase 1，对标 RapidSCADA 图表 / ThingsBoard 时序刻度）：
 * 暗色图表框 + 网格 + 荧光趋势折线（内部环形缓冲）+ 当前值标签。
 * 数据通道 = `height` 绑定（量程换算结果为像素值，0..chartHeight，与 level/thermometer 的
 * height 绑定惯例一致）：每次 applyProps 收到 height 即推入缓冲并重绘折线；
 * `custom.capacity`（缺省 40）控制缓冲长度；`text` 绑定（带 format）驱动当前值标签。
 */
export const scadaInstrumentTrendDefinition = createInstrumentSymbol({
  type: scadaInstrumentTrendType,
  name: 'Trend',
  defaults: {
    x: 0,
    y: 0,
    width: 160,
    height: 80,
    fill: '#0c1424',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#7ee787',
    custom: { capacity: 40 },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 4,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const grid: LeafNode[] = [];
    for (let i = 1; i <= 3; i++) {
      grid.push(
        new Line({
          name: `grid-h-${i}`,
          points: [4, (height * i) / 4, width - 4, (height * i) / 4],
          stroke: 'rgba(139,160,189,0.25)',
          strokeWidth: 1,
        }) as LeafNode,
      );
    }
    for (let i = 1; i <= 5; i++) {
      grid.push(
        new Line({
          name: `grid-v-${i}`,
          points: [(width * i) / 6, 4, (width * i) / 6, height - 4],
          stroke: 'rgba(139,160,189,0.18)',
          strokeWidth: 1,
        }) as LeafNode,
      );
    }
    const polyline = new Line({
      name: 'trend-line',
      points: [],
      stroke: props.textColor,
      strokeWidth: 1.5,
      strokeCap: 'round',
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: width - 4,
      y: 2,
      width: width * 0.4,
      height: 16,
      text: props.text ?? '',
      fontSize: 11,
      fontFamily: 'monospace',
      fill: props.textColor,
      textAlign: 'right',
      verticalAlign: 'top',
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      ...grid.map((node, index) => ({ name: `grid-${index}`, node })),
      { name: 'trend-line', node: polyline },
      { name: 'label', node: label },
    ]);
    trendStates.set(root, {
      samples: [],
      capacity: typeof props.custom?.capacity === 'number' ? props.custom.capacity : 40,
      polyline,
      grid,
      label,
    });
    // width 变更重算图表框/网格/折线横向布局；height 是数据通道（绑定值），不做几何 resize。
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { width: value });
      const h = (body as GeometryLeaf).height!;
      grid.forEach((node, index) => {
        if (index < 3) {
          setAttrs(node, { points: [4, (h * (index + 1)) / 4, value - 4, (h * (index + 1)) / 4] });
        } else {
          setAttrs(node, { points: [(value * (index - 2)) / 6, 4, (value * (index - 2)) / 6, h - 4] });
        }
      });
      setAttrs(label, { x: value - 4, width: value * 0.4 });
      const state = trendStates.get(root);
      if (state) redraw(state, value, h);
    };
    return { root, parts };
  },
  applyProps: (node, parts, props) => {
    const state = trendStates.get(parts.root);
    if (!state) return;
    if (typeof props.custom?.capacity === 'number') {
      state.capacity = Math.max(2, props.custom.capacity);
      while (state.samples.length > state.capacity) state.samples.shift();
    }
    if (typeof props.height === 'number') {
      state.samples.push(props.height);
      while (state.samples.length > state.capacity) state.samples.shift();
      const w = (parts.body as GeometryLeaf).width!;
      const h = (parts.body as GeometryLeaf).height!;
      redraw(state, w, h);
    }
    if (props.textColor !== undefined && typeof props.textColor === 'string') {
      setAttrs(state.polyline, { stroke: props.textColor });
    }
  },
});

function redraw(state: TrendState, width: number, height: number): void {
  const plotW = width - 8;
  const plotH = height - 8;
  const points: number[] = [];
  const count = state.samples.length;
  for (let i = 0; i < count; i++) {
    const x = 4 + (count === 1 ? plotW : (plotW * i) / (count - 1));
    const y = 4 + plotH - Math.min(plotH, Math.max(0, state.samples[i]));
    points.push(x, y);
  }
  setAttrs(state.polyline, { points });
}
