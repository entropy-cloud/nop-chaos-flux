import { Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaInstrumentProgressType = 'scada-instrument-progress';

/**
 * 进度指示（I9.2）：轨道/进度条/百分比文本复合；进度条宽度 = 绑定值经量程换算
 * （bindings.width 的 scale）驱动，label 经 formatValue 消费。
 */
export const scadaInstrumentProgressDefinition = createInstrumentSymbol({
  type: scadaInstrumentProgressType,
  name: 'Progress',
  defaults: {
    x: 0,
    y: 0,
    width: 200,
    height: 24,
    fill: '#eceff1',
    stroke: '#37474f',
    strokeWidth: 1,
    textColor: '#212121',
    custom: { min: 0, max: 100, unit: '%' },
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const track = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: height / 2,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const bar = new Rect({
      name: 'bar',
      x: 2,
      y: 2,
      width: 0,
      height: height - 4,
      cornerRadius: (height - 4) / 2,
      fill: '#26a69a',
    }) as LeafNode;
    const label = new Text({
      name: 'label',
      x: width + 8,
      y: height / 2 - 8,
      text: props.text ?? '',
      fontSize: 12,
      fill: props.textColor,
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: track },
      { name: 'bar', node: bar },
      { name: 'label', node: label },
    ]);
  },
});
