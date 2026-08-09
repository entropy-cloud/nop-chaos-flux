import { Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';

export const scadaDeviceValveType = 'scada-device-valve';

/**
 * 阀门（I9.1）：阀体/阀芯开合形态，开度参数 `custom.openRatio`（0=关闭 90°，1=全开 0°，缺省全开）；
 * run/stop/fault 状态色；symbol 级 rotation 旋转整机（rotationTarget root）。
 */
export const scadaDeviceValveDefinition = createDeviceSymbol({
  type: scadaDeviceValveType,
  name: 'Valve',
  defaults: {
    x: 0,
    y: 0,
    width: 64,
    height: 32,
    custom: { openRatio: 1 },
  },
  applyOptions: { rotationTarget: 'root' },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const body = new Rect({
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
    const openRatio = typeof props.custom?.openRatio === 'number' ? props.custom.openRatio : 1;
    const core = new Rect({
      name: 'core',
      x: width / 2 - height * 0.22,
      y: height / 2 - height * 0.22,
      width: height * 0.44,
      height: height * 0.44,
      fill: '#26a69a',
      stroke: '#00695c',
      strokeWidth: 2,
      rotation: (1 - openRatio) * 90,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'core', node: core },
    ]);
    // plan 2026-08-06-0900-2 P2-4：width/height 经 applyProps 回落此 hook，重算 body 容器 + core 相对锚点（保留 openRatio rotation）。
    parts.resize = (key, value) => {
      setAttrs(body, { [key]: value });
      const w = (body as unknown as { width: number }).width;
      const h = (body as unknown as { height: number }).height;
      setAttrs(core, {
        x: w / 2 - h * 0.22,
        y: h / 2 - h * 0.22,
        width: h * 0.44,
        height: h * 0.44,
      });
    };
    return { root, parts };
  },
  applyProps: (node, parts, props) => {
    const ratio = props.custom?.openRatio;
    if (typeof ratio === 'number' && parts.core) parts.core.set({ rotation: (1 - ratio) * 90 });
  },
});
