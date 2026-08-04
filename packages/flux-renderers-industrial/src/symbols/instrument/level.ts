import { Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaInstrumentLevelType = 'scada-instrument-level';

/**
 * 液位计（I9.2）：罐体/液柱/数值文本复合；液柱高度 = 绑定值经量程换算
 * （bindings.height 的 scale）驱动，y 锚定罐底；label 经 formatValue 消费。
 */
export const scadaInstrumentLevelDefinition = createInstrumentSymbol({
  type: scadaInstrumentLevelType,
  name: 'Level',
  defaults: {
    x: 0,
    y: 0,
    width: 60,
    height: 140,
    fill: '#ffffff',
    stroke: '#37474f',
    strokeWidth: 2,
    textColor: '#212121',
    custom: { min: 0, max: 100, unit: '' },
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
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const liquid = new Rect({
      name: 'liquid',
      x: 2,
      y: height,
      width: width - 4,
      height: 0,
      fill: '#4fc3f7',
      opacity: 0.85,
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
      { name: 'body', node: body },
      { name: 'liquid', node: liquid },
      { name: 'label', node: label },
    ]);
  },
  applyProps: (node, parts, props) => {
    if (typeof props.height !== 'number' || !parts.extent) return;
    const tankHeight = (parts.body as unknown as { height: number }).height;
    parts.extent.set({ y: tankHeight - props.height });
  },
});
