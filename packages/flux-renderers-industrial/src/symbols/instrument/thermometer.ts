import { Ellipse, Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaInstrumentThermometerType = 'scada-instrument-thermometer';

/**
 * 液柱 y 锚定感温泡顶的预留常量（plan 2026-08-06-0900-2 P2-9）：
 * create 与 applyProps 共用此单一常量，消除原 create `-24` vs applyProps `-16` 的 8px 首帧跳变。
 * 语义对齐 sibling `level`（液柱锚定罐底，reserve=0）；thermometer 液柱锚定感温泡顶，reserve 为泡高预留（负值向上偏移）。
 */
const BULB_RESERVE = -24;

/**
 * 温度计（I9.2）：液柱管/感温泡/液柱/刻度文本复合；液柱高度 = 绑定值经量程换算
 * （bindings.height 的 scale）驱动，y 锚定感温泡顶；label 经 formatValue 消费。
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
      fill: '#e53935',
      cornerRadius: (width - 8) / 2,
    }) as LeafNode;
    const bulb = new Ellipse({
      name: 'bulb',
      x: width / 2,
      y: height - 8,
      width: width - 6,
      height: width - 6,
      fill: '#e53935',
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: 0,
      y: height + 4,
      width,
      text: props.text ?? '',
      fontSize: 12,
      fill: props.textColor,
      textAlign: 'center',
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: tube },
      { name: 'liquid', node: liquid },
      { name: 'bulb', node: bulb },
      { name: 'label', node: label },
    ]);
  },
  applyProps: (node, parts, props) => {
    if (typeof props.height !== 'number' || !parts.extent) return;
    const tubeHeight = (parts.body as unknown as { height: number }).height;
    parts.extent.set({ y: tubeHeight + BULB_RESERVE - props.height });
  },
});
