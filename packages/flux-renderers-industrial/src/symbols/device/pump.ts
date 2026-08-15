import { Ellipse, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { hubPaint, INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDevicePumpType = 'scada-device-pump';

/**
 * 泵（I9.1，2026-08-15 商业级视觉刷新）：蜗壳泵体/叶轮复合，底部安装脚/吸入短管/
 * 顶部排出管/蜗壳内圈高光；开关状态形态切换（run 叶轮旋转 / stop 静止灰态），
 * run/stop/fault 状态色落在 body（泵体）。
 */
export const scadaDevicePumpDefinition = createDeviceSymbol({
  type: scadaDevicePumpType,
  name: 'Pump',
  defaults: {
    x: 0,
    y: 0,
    width: 56,
    height: 56,
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
      cornerRadius: width * 0.5,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const volute = new Ellipse({
      name: 'volute-ring',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: Math.min(width, height) * 0.84,
      height: Math.min(width, height) * 0.84,
      stroke: 'rgba(255,255,255,0.4)',
      strokeWidth: Math.max(1.5, Math.min(width, height) * 0.04),
    }) as LeafNode;
    const footPaint = linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
      { offset: 0, color: INDUSTRIAL_TOKENS.steelMid },
      { offset: 1, color: INDUSTRIAL_TOKENS.steelDark },
    ]);
    const footL = new Rect({
      name: 'foot-left',
      x: width * 0.08,
      y: height - height * 0.14,
      width: width * 0.18,
      height: height * 0.14,
      cornerRadius: 2,
      fill: footPaint,
    }) as LeafNode;
    const footR = new Rect({
      name: 'foot-right',
      x: width * 0.74,
      y: height - height * 0.14,
      width: width * 0.18,
      height: height * 0.14,
      cornerRadius: 2,
      fill: footPaint,
    }) as LeafNode;
    const suction = new Rect({
      name: 'suction',
      x: 0,
      y: height / 2 - height * 0.14,
      width: width * 0.12,
      height: height * 0.28,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const discharge = new Rect({
      name: 'discharge',
      x: width / 2 - width * 0.09,
      y: 0,
      width: width * 0.18,
      height: height * 0.13,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.32;
    const impeller = new Ellipse({
      name: 'impeller',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 2,
      height: radius * 2,
      fill: '#1273a0',
      stroke: '#0b4f66',
      strokeWidth: 2,
    }) as LeafNode;
    const hub = new Ellipse({
      name: 'hub',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 0.66,
      height: radius * 0.66,
      fill: hubPaint(),
      stroke: '#37474f',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'foot-left', node: footL },
      { name: 'foot-right', node: footR },
      { name: 'suction', node: suction },
      { name: 'discharge', node: discharge },
      { name: 'volute-ring', node: volute },
      { name: 'impeller', node: impeller },
      { name: 'hub', node: hub },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器（含 cornerRadius）
    // + 装饰件（脚/接管/蜗壳圈/hub）+ impeller 中心/半径。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      setAttrs(body, { cornerRadius: w * 0.5 });
      const min = Math.min(w, h);
      const r = min * 0.32;
      setAttrs(footL, { x: w * 0.08, y: h - h * 0.14, width: w * 0.18, height: h * 0.14 });
      setAttrs(footR, { x: w * 0.74, y: h - h * 0.14, width: w * 0.18, height: h * 0.14 });
      setAttrs(suction, { y: h / 2 - h * 0.14, width: w * 0.12, height: h * 0.28 });
      setAttrs(discharge, { x: w / 2 - w * 0.09, width: w * 0.18, height: h * 0.13 });
      setAttrs(volute, { x: w / 2, y: h / 2, width: min * 0.84, height: min * 0.84, strokeWidth: Math.max(1.5, min * 0.04) });
      setAttrs(impeller, { x: w / 2, y: h / 2, width: r * 2, height: r * 2 });
      setAttrs(hub, { x: w / 2, y: h / 2, width: r * 0.66, height: r * 0.66 });
    };
    return { root, parts };
  },
});
