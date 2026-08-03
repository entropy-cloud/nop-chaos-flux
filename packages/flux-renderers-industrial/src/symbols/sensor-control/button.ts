import { Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlButtonType = 'scada-sensor-control-button';

/** 按钮（I9.3）：底座/按键复合——静态交互外观（事件联动归 I11.1）+ run/stop/fault 状态色。 */
export const scadaSensorControlButtonDefinition = createSensorControlSymbol({
  type: scadaSensorControlButtonType,
  name: 'Button',
  defaults: {
    width: 56,
    height: 28,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const base = new Rect({
      name: 'body',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const cap = new Rect({
      name: 'cap',
      x: 4,
      y: 3,
      width: width - 8,
      height: height - 6,
      cornerRadius: 4,
      fill: '#eceff1',
      stroke: '#90a4ae',
      strokeWidth: 1,
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: base },
      { name: 'cap', node: cap },
    ]);
  },
});
