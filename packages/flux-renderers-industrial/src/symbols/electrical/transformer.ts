import { Ellipse, Line, Rect } from 'leafer-ui';
import { createCompositeGroup, createElectricalSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaElecTransformerType = 'scada-elec-transformer';

/**
 * 双绕组变压器（559 Phase 1，对标 FUXA Electrical / 电力单线图惯例）：
 * 铁芯底板（body，状态色）+ 一次/二次绕组双圆 + 绕组间铁芯柱 + 四侧接线端子。
 */
export const scadaElecTransformerDefinition = createElectricalSymbol({
  type: scadaElecTransformerType,
  name: 'Transformer',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 88,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
      name: 'body',
      x: width * 0.16,
      y: height * 0.12,
      width: width * 0.68,
      height: height * 0.76,
      cornerRadius: 4,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const windingR = width * 0.26;
    const windingP = new Ellipse({
      name: 'winding-primary',
      x: width / 2,
      y: height * 0.33,
      around: 'center',
      width: windingR * 2,
      height: windingR * 2,
      fill: '#ffb300',
      stroke: '#263238',
      strokeWidth: 2,
    }) as LeafNode;
    const windingS = new Ellipse({
      name: 'winding-secondary',
      x: width / 2,
      y: height * 0.67,
      around: 'center',
      width: windingR * 2,
      height: windingR * 2,
      fill: '#42a5f5',
      stroke: '#263238',
      strokeWidth: 2,
    }) as LeafNode;
    const coreL = new Line({
      name: 'core-left',
      points: [width / 2 - width * 0.06, height * 0.4, width / 2 - width * 0.06, height * 0.6],
      stroke: '#263238',
      strokeWidth: 3,
    }) as LeafNode;
    const coreR = new Line({
      name: 'core-right',
      points: [width / 2 + width * 0.06, height * 0.4, width / 2 + width * 0.06, height * 0.6],
      stroke: '#263238',
      strokeWidth: 3,
    }) as LeafNode;
    const terminalTop = new Rect({
      name: 'terminal-top',
      x: width / 2 - width * 0.04,
      y: 0,
      width: width * 0.08,
      height: height * 0.12,
      fill: '#ffb300',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const terminalBottom = new Rect({
      name: 'terminal-bottom',
      x: width / 2 - width * 0.04,
      y: height * 0.88,
      width: width * 0.08,
      height: height * 0.12,
      fill: '#42a5f5',
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'winding-primary', node: windingP },
      { name: 'winding-secondary', node: windingS },
      { name: 'core-left', node: coreL },
      { name: 'core-right', node: coreR },
      { name: 'terminal-top', node: terminalTop },
      { name: 'terminal-bottom', node: terminalBottom },
    ]);
    parts.resize = (key, value) => {
      if (key === 'width') {
        setAttrs(body, { x: value * 0.16, width: value * 0.68 });
        const r = value * 0.26;
        setAttrs(windingP, { x: value / 2, width: r * 2, height: r * 2 });
        setAttrs(windingS, { x: value / 2, width: r * 2, height: r * 2 });
        setAttrs(coreL, { points: [value / 2 - value * 0.06, height * 0.4, value / 2 - value * 0.06, height * 0.6] });
        setAttrs(coreR, { points: [value / 2 + value * 0.06, height * 0.4, value / 2 + value * 0.06, height * 0.6] });
        setAttrs(terminalTop, { x: value / 2 - value * 0.04, width: value * 0.08 });
        setAttrs(terminalBottom, { x: value / 2 - value * 0.04, width: value * 0.08 });
        return;
      }
      setAttrs(body, { y: value * 0.12, height: value * 0.76 });
      setAttrs(windingP, { y: value * 0.33 });
      setAttrs(windingS, { y: value * 0.67 });
      setAttrs(coreL, { points: [width / 2 - width * 0.06, value * 0.4, width / 2 - width * 0.06, value * 0.6] });
      setAttrs(coreR, { points: [width / 2 + width * 0.06, value * 0.4, width / 2 + width * 0.06, value * 0.6] });
      setAttrs(terminalTop, { y: 0, height: value * 0.12 });
      setAttrs(terminalBottom, { y: value * 0.88, height: value * 0.12 });
    };
    return { root, parts };
  },
});
