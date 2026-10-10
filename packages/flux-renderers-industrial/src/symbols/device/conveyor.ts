import { Ellipse, Line, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, deviceRunRotateAnimation, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS } from '../visuals.js';

export const scadaDeviceConveyorType = 'scada-device-conveyor';

/**
 * 传送带（559 Phase 1，对标 FUXA 流程/产线族）：带面（暗色胶面 + 中央虚线走带线）+
 * 首尾滚筒（右滚筒为 rotor，run 态旋转）+ 支撑腿 + 物料端标记；run/stop/fault 状态色落在带面。
 */
export const scadaDeviceConveyorDefinition = createDeviceSymbol({
  type: scadaDeviceConveyorType,
  name: 'Conveyor',
  defaults: {
    x: 0,
    y: 0,
    width: 120,
    height: 64,
    animations: [{ ...deviceRunRotateAnimation, period: 1200 }],
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const beltY = height * 0.34;
    const beltH = height * 0.24;
    const body = new Rect({
      name: 'body',
      x: 0,
      y: beltY,
      width,
      height: beltH,
      cornerRadius: beltH / 2,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const beltDash = new Line({
      name: 'belt-dash',
      points: [width * 0.06, beltY + beltH / 2, width * 0.94, beltY + beltH / 2],
      stroke: 'rgba(255,255,255,0.55)',
      strokeWidth: 2,
      dashPattern: [10, 8],
    }) as LeafNode;
    const rollerR = beltH * 1.15;
    const rollerLeft = new Ellipse({
      name: 'roller-left',
      x: width * 0.08,
      y: beltY + beltH / 2,
      around: 'center',
      width: rollerR,
      height: rollerR,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1.5,
    }) as LeafNode;
    const rollerRight = new Ellipse({
      name: 'roller-right',
      x: width * 0.92,
      y: beltY + beltH / 2,
      around: 'center',
      width: rollerR,
      height: rollerR,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1.5,
    }) as LeafNode;
    const hubRight = new Ellipse({
      name: 'rotor',
      x: width * 0.92,
      y: beltY + beltH / 2,
      around: 'center',
      width: rollerR * 0.4,
      height: rollerR * 0.4,
      fill: INDUSTRIAL_TOKENS.steelDark,
    }) as LeafNode;
    const legL = new Rect({
      name: 'leg-left',
      x: width * 0.16,
      y: beltY + beltH,
      width: width * 0.05,
      height: height - beltY - beltH,
      fill: INDUSTRIAL_TOKENS.steelDark,
    }) as LeafNode;
    const legR = new Rect({
      name: 'leg-right',
      x: width * 0.79,
      y: beltY + beltH,
      width: width * 0.05,
      height: height - beltY - beltH,
      fill: INDUSTRIAL_TOKENS.steelDark,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'belt-dash', node: beltDash },
      { name: 'roller-left', node: rollerLeft },
      { name: 'roller-right', node: rollerRight },
      { name: 'rotor', node: hubRight },
      { name: 'leg-left', node: legL },
      { name: 'leg-right', node: legR },
    ]);
    parts.resize = (key, value) => {
      if (key !== 'width') return;
      setAttrs(body, { width: value });
      setAttrs(beltDash, { points: [value * 0.06, beltY + beltH / 2, value * 0.94, beltY + beltH / 2] });
      setAttrs(rollerLeft, { x: value * 0.08 });
      setAttrs(rollerRight, { x: value * 0.92 });
      setAttrs(hubRight, { x: value * 0.92 });
      setAttrs(legL, { x: value * 0.16 });
      setAttrs(legR, { x: value * 0.79 });
    };
    return { root, parts };
  },
});
