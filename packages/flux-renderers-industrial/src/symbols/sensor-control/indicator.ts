import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, createSensorControlSymbol } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaSensorControlIndicatorType = 'scada-sensor-control-indicator';

/**
 * 指示灯（I9.3）：灯体/灯罩复合——state 样式落到灯罩（body），
 * run/stop/fault 状态色 + fault 闪烁联动（animator blink 消费，样式经 applyProps 路由）。
 */
export const scadaSensorControlIndicatorDefinition = createSensorControlSymbol({
  type: scadaSensorControlIndicatorType,
  name: 'Indicator',
  defaults: {
    width: 56,
    height: 32,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const lamp = new Ellipse({
      name: 'body',
      x: width / 2,
      y: height / 2,
      width: height * 0.72,
      height: height * 0.72,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const housing = new Rect({
      name: 'housing',
      x: 0,
      y: 0,
      width,
      height,
      cornerRadius: 6,
      fill: '#455a64',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    return createCompositeGroup(props, [
      { name: 'body', node: lamp },
      { name: 'housing', node: housing },
    ]);
  },
});
