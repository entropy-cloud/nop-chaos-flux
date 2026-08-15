import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { hubPaint, INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceMotorType = 'scada-device-motor';

/**
 * 电机（I9.1，2026-08-15 商业级视觉刷新）：机座/转轴复合 + 端盖环/顶部接线盒/右侧轴伸，
 * run 态转子旋转（animator rotate 驱动），run/stop/fault 状态色落在 body（机座）。
 */
export const scadaDeviceMotorDefinition = createDeviceSymbol({
  type: scadaDeviceMotorType,
  name: 'Motor',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 48,
    animations: [deviceRunRotateAnimation],
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
      cornerRadius: 8,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const endPaint = linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
      { offset: 0, color: INDUSTRIAL_TOKENS.steelLight },
      { offset: 1, color: INDUSTRIAL_TOKENS.steelMid },
    ]);
    const endL = new Rect({
      name: 'endbell-left',
      x: 0,
      y: 0,
      width: Math.max(5, width * 0.1),
      height,
      cornerRadius: 8,
      fill: endPaint,
      opacity: 0.9,
    }) as LeafNode;
    const endR = new Rect({
      name: 'endbell-right',
      x: width - Math.max(5, width * 0.1),
      y: 0,
      width: Math.max(5, width * 0.1),
      height,
      cornerRadius: 8,
      fill: endPaint,
      opacity: 0.9,
    }) as LeafNode;
    const terminal = new Rect({
      name: 'terminal-box',
      x: width / 2 - width * 0.14,
      y: 0,
      width: width * 0.28,
      height: height * 0.16,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelDark,
      stroke: '#263238',
      strokeWidth: 1,
    }) as LeafNode;
    const shaft = new Rect({
      name: 'shaft',
      x: width - width * 0.08,
      y: height / 2 - height * 0.07,
      width: width * 0.08,
      height: height * 0.14,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelLight,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.3;
    const rotor = new Ellipse({
      name: 'rotor',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 2,
      height: radius * 2,
      fill: INDUSTRIAL_TOKENS.steelLight,
      stroke: INDUSTRIAL_TOKENS.steelMid,
      strokeWidth: 2,
    }) as LeafNode;
    const hub = new Ellipse({
      name: 'hub',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 0.62,
      height: radius * 0.62,
      fill: hubPaint(),
      stroke: '#37474f',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'endbell-left', node: endL },
      { name: 'endbell-right', node: endR },
      { name: 'terminal-box', node: terminal },
      { name: 'shaft', node: shaft },
      { name: 'rotor', node: rotor },
      { name: 'hub', node: hub },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器
    // + 装饰件（端盖/接线盒/轴伸）+ rotor 中心/半径 + hub。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const bell = Math.max(5, w * 0.1);
      const r = Math.min(w, h) * 0.3;
      setAttrs(endL, { width: bell, height: h });
      setAttrs(endR, { x: w - bell, y: 0, width: bell, height: h });
      setAttrs(terminal, { x: w / 2 - w * 0.14, y: 0, width: w * 0.28, height: h * 0.16 });
      setAttrs(shaft, { x: w - w * 0.08, y: h / 2 - h * 0.07, width: w * 0.08, height: h * 0.14 });
      setAttrs(rotor, { x: w / 2, y: h / 2, width: r * 2, height: r * 2 });
      setAttrs(hub, { x: w / 2, y: h / 2, width: r * 0.62, height: r * 0.62 });
    };
    return { root, parts };
  },
});
