import { Ellipse, Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaInstrumentThermometerType = 'scada-instrument-thermometer';

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
      y: height - 24,
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
    parts.extent.set({ y: tubeHeight - 16 - props.height });
  },
});
