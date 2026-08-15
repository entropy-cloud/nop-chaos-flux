import { Ellipse, Group, Line, Rect } from 'leafer-ui';
import { createCompositeGroup, deviceRunRotateAnimation, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { hubPaint, INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceFanType = 'scada-device-fan';

/**
 * 风机（I9.1，2026-08-15 商业级视觉刷新）：防护罩圈 + 十字护网 + 扇叶复合 + 中心 hub +
 * 底部支架，run 态扇叶旋转（animator rotate 驱动），run/stop/fault 状态色落在 body（面板）。
 */
export const scadaDeviceFanDefinition = createDeviceSymbol({
  type: scadaDeviceFanType,
  name: 'Fan',
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
      cornerRadius: 8,
      fill: props.fill,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
      opacity: 0.35,
    }) as LeafNode;
    const base = new Rect({
      name: 'base',
      x: width * 0.25,
      y: height - height * 0.12,
      width: width * 0.5,
      height: height * 0.12,
      cornerRadius: 2,
      fill: linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
        { offset: 0, color: INDUSTRIAL_TOKENS.steelMid },
        { offset: 1, color: INDUSTRIAL_TOKENS.steelDark },
      ]),
    }) as LeafNode;
    const guardR = Math.min(width, height) * 0.46;
    const guard = new Ellipse({
      name: 'guard-ring',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: guardR * 2,
      height: guardR * 2,
      stroke: INDUSTRIAL_TOKENS.steelLight,
      strokeWidth: Math.max(1.5, Math.min(width, height) * 0.035),
    }) as LeafNode;
    const hbar = new Line({
      name: 'guard-hbar',
      x: width / 2,
      y: height / 2,
      points: [-guardR, 0, guardR, 0],
      stroke: INDUSTRIAL_TOKENS.steelLight,
      strokeWidth: Math.max(1, Math.min(width, height) * 0.02),
      opacity: 0.75,
    }) as LeafNode;
    const vbar = new Line({
      name: 'guard-vbar',
      x: width / 2,
      y: height / 2,
      points: [0, -guardR, 0, guardR],
      stroke: INDUSTRIAL_TOKENS.steelLight,
      strokeWidth: Math.max(1, Math.min(width, height) * 0.02),
      opacity: 0.75,
    }) as LeafNode;
    const radius = Math.min(width, height) * 0.32;
    const blades = new Group({ name: 'blades', x: width / 2, y: height / 2, around: 'center' }) as LeafNode;
    const bladeColors = [INDUSTRIAL_TOKENS.steelLight, INDUSTRIAL_TOKENS.steelMid, INDUSTRIAL_TOKENS.steelLight, INDUSTRIAL_TOKENS.steelMid];
    const bladeNodes: LeafNode[] = [];
    for (let index = 0; index < 4; index++) {
      const blade = new Ellipse({
        name: `blade-${index + 1}`,
        x: radius * 0.45,
        y: 0,
        width: radius * 1.1,
        height: radius * 0.55,
        fill: bladeColors[index],
        stroke: INDUSTRIAL_TOKENS.steelDark,
        strokeWidth: 1,
        rotation: index * 90,
      }) as LeafNode;
      (blades as unknown as { add: (node: LeafNode) => void }).add(blade);
      bladeNodes.push(blade);
    }
    const hub = new Ellipse({
      name: 'hub',
      x: width / 2,
      y: height / 2,
      around: 'center',
      width: radius * 0.7,
      height: radius * 0.7,
      fill: hubPaint(),
      stroke: '#37474f',
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'base', node: base },
      { name: 'guard-ring', node: guard },
      { name: 'guard-hbar', node: hbar },
      { name: 'guard-vbar', node: vbar },
      { name: 'blades', node: blades },
      { name: 'hub', node: hub },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器 +
    // 支架/护罩圈/护网 + blades 中心 + 各扇叶尺寸 + hub。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      const min = Math.min(w, h);
      const r = min * 0.32;
      const gr = min * 0.46;
      setAttrs(base, { x: w * 0.25, y: h - h * 0.12, width: w * 0.5, height: h * 0.12 });
      setAttrs(guard, { x: w / 2, y: h / 2, width: gr * 2, height: gr * 2, strokeWidth: Math.max(1.5, min * 0.035) });
      setAttrs(hbar, { x: w / 2, y: h / 2, points: [-gr, 0, gr, 0], strokeWidth: Math.max(1, min * 0.02) });
      setAttrs(vbar, { x: w / 2, y: h / 2, points: [0, -gr, 0, gr], strokeWidth: Math.max(1, min * 0.02) });
      setAttrs(blades, { x: w / 2, y: h / 2 });
      for (const blade of bladeNodes) {
        setAttrs(blade, { x: r * 0.45, width: r * 1.1, height: r * 0.55 });
      }
      setAttrs(hub, { x: w / 2, y: h / 2, width: r * 0.7, height: r * 0.7 });
    };
    return { root, parts };
  },
});
