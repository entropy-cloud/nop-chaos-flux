import { Rect, Text } from 'leafer-ui';
import { createCompositeGroup, createInstrumentSymbol, setAttrs } from './common.js';
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
    const result = createCompositeGroup(props, [
      { name: 'body', node: track },
      { name: 'bar', node: bar },
      { name: 'label', node: label },
    ]);
    // plan 2026-08-08-1910-1 Phase 2（A11）：height 几何变更重算 track 高度/cornerRadius + bar 高度/cornerRadius
    // + label y 锚点。width 是 binding 驱动的 bar 长度（extent 宽度），不 resize 容器。
    result.parts.resize = (key, value) => {
      if (key !== 'height') return;
      setAttrs(track, { height: value, cornerRadius: value / 2 });
      setAttrs(bar, { height: value - 4, cornerRadius: (value - 4) / 2 });
      setAttrs(label, { y: value / 2 - 8 });
    };
    return result;
  },
});
