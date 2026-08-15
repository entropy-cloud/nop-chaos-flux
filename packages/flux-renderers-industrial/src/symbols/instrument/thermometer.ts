import { Ellipse, Line, Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS, liquidPaint } from '../visuals.js';

export const scadaInstrumentThermometerType = 'scada-instrument-thermometer';

/**
 * 液柱 y 锚定感温泡顶的预留常量（plan 2026-08-06-0900-2 P2-9）：
 * create 与 applyProps 共用此单一常量，消除原 create `-24` vs applyProps `-16` 的 8px 首帧跳变。
 * 语义对齐 sibling `level`（液柱锚定罐底，reserve=0）；thermometer 液柱锚定感温泡顶，reserve 为泡高预留（负值向上偏移）。
 */
const BULB_RESERVE = -24;

/**
 * 温度计（I9.2，2026-08-15 商业级视觉刷新）：液柱管/感温泡/渐变液柱（暖橙）/泡高光/
 * 右侧刻度线复合；液柱高度 = 绑定值经量程换算（bindings.height 的 scale）驱动，
 * y 锚定感温泡顶；label 经 formatValue 消费。
 */
export const scadaInstrumentThermometerDefinition = createInstrumentSymbol({
  type: scadaInstrumentThermometerType,
  name: 'Thermometer',
  defaults: {
    x: 0,
    y: 0,
    width: 40,
    height: 140,
    fill: '#ffffff',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#212121',
    custom: { min: -20, max: 120, unit: '°C' },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const tube = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: width / 2,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const liquid = new Rect({
      name: 'liquid',
      x: 4,
      y: height + BULB_RESERVE,
      width: width - 8,
      height: 0,
      fill: liquidPaint(INDUSTRIAL_TOKENS.thermTop, INDUSTRIAL_TOKENS.thermBottom),
      cornerRadius: (width - 8) / 2,
    }) as LeafNode;
    const bulb = new Ellipse({
      name: 'bulb',
      x: width / 2,
      y: height - 8,
      around: 'center',
      width: width - 6,
      height: width - 6,
      fill: liquidPaint(INDUSTRIAL_TOKENS.thermTop, INDUSTRIAL_TOKENS.thermBottom),
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const bulbShine = new Ellipse({
      name: 'bulb-shine',
      x: width / 2 - (width - 6) * 0.18,
      y: height - 8 - (width - 6) * 0.18,
      around: 'center',
      width: (width - 6) * 0.3,
      height: (width - 6) * 0.3,
      fill: 'rgba(255,255,255,0.45)',
    }) as LeafNode;
    const ticks: LeafNode[] = [];
    for (let i = 0; i <= 4; i++) {
      const y = 6 + (height + BULB_RESERVE - 6) * (1 - i / 4);
      ticks.push(
        new Line({
          name: `grad-tick-${i}`,
          points: [width - 9, y, width - 3, y],
          stroke: '#b0bec5',
          strokeWidth: 1,
        }) as LeafNode,
      );
    }
    const label = new Text({
      name: 'label',
      x: 0,
      y: height + 4,
      width,
      text: props.text ?? '',
      fontSize: 12,
      fontWeight: 'bold',
      fontFamily: 'sans-serif',
      fill: props.textColor,
      textAlign: 'center',
    }) as LeafNode;
    const result = createCompositeGroup(props, [
      { name: 'body', node: tube },
      { name: 'liquid', node: liquid },
      { name: 'bulb', node: bulb },
      { name: 'bulb-shine', node: bulbShine },
      ...ticks.map((node, index) => ({ name: `grad-tick-${index}`, node })),
      { name: 'label', node: label },
    ]);
    // plan 2026-08-08-1910-1 Phase 2（A11）：width 几何变更重算 tube 宽度/cornerRadius + liquid 宽度/cornerRadius
    // + bulb 中心 x/尺寸（around:'center' 语义下 x=中心）。height 是 binding 驱动的液位（extent 长度），不 resize 容器。
    result.parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(tube, { width: value, cornerRadius: value / 2 });
      setAttrs(liquid, { width: value - 8, cornerRadius: (value - 8) / 2 });
      setAttrs(bulb, { x: value / 2, width: value - 6, height: value - 6 });
      setAttrs(bulbShine, { x: value / 2 - (value - 6) * 0.18, y: height - 8 - (value - 6) * 0.18, width: (value - 6) * 0.3, height: (value - 6) * 0.3 });
      ticks.forEach((tick, i) => {
        const y = 6 + (height + BULB_RESERVE - 6) * (1 - i / 4);
        tick.set({ points: [value - 9, y, value - 3, y] });
      });
      setAttrs(label, { width: value });
    };
    return result;
  },
  applyProps: (node, parts, props) => {
    if (typeof props.height !== 'number' || !parts.extent) return;
    const tubeHeight = (parts.body as unknown as { height: number }).height;
    parts.extent.set({ y: tubeHeight + BULB_RESERVE - props.height });
  },
});
