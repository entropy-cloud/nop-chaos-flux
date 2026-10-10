import { Line, Rect } from 'leafer-ui';
import { createCompositeGroup, createDeviceSymbol, setAttrs } from './common.js';
import type { LeafNode } from '../symbol-types.js';
import { INDUSTRIAL_TOKENS, linearPaint } from '../visuals.js';

export const scadaDeviceHeatExchangerType = 'scada-device-heat-exchanger';

/**
 * 壳管式换热器（559 Phase 1，对标 ThingsBoard fluid system 热交换器）：卧式壳体 + 管束 +
 * 端盖 + 上下接口短管；run/stop/fault 状态色落在壳体。
 */
export const scadaDeviceHeatExchangerDefinition = createDeviceSymbol({
  type: scadaDeviceHeatExchangerType,
  name: 'Heat Exchanger',
  defaults: {
    x: 0,
    y: 0,
    width: 96,
    height: 56,
  },
  build: ({ props }) => {
    const width = props.width as number;
    const height = props.height as number;
    const shellTop = height * 0.24;
    const shellHeight = height * 0.52;
    const shellPaint = linearPaint({ x: 0.5, y: 0 }, { x: 0.5, y: 1 }, [
      { offset: 0, color: INDUSTRIAL_TOKENS.steelLight },
      { offset: 0.5, color: props.fill as string },
      { offset: 1, color: INDUSTRIAL_TOKENS.steelDark },
    ]);
    const body = new Rect({
      name: 'body',
      x: width * 0.1,
      y: shellTop,
      width: width * 0.8,
      height: shellHeight,
      cornerRadius: shellHeight * 0.35,
      fill: shellPaint,
      stroke: props.stroke,
      strokeWidth: props.strokeWidth,
    }) as LeafNode;
    const capL = new Rect({
      name: 'cap-left',
      x: 0,
      y: shellTop + shellHeight * 0.14,
      width: width * 0.1,
      height: shellHeight * 0.72,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const capR = new Rect({
      name: 'cap-right',
      x: width * 0.9,
      y: shellTop + shellHeight * 0.14,
      width: width * 0.1,
      height: shellHeight * 0.72,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const tubes: LeafNode[] = [0.3, 0.5, 0.7].map((ratio, index) =>
      new Line({
        name: `tube-${index}`,
        points: [width * 0.13, shellTop + shellHeight * ratio, width * 0.87, shellTop + shellHeight * ratio],
        stroke: 'rgba(255,255,255,0.5)',
        strokeWidth: 1.5,
      }) as LeafNode,
    );
    const nozzleW = width * 0.14;
    const nozzleH = height * 0.22;
    const nozzleIn = new Rect({
      name: 'nozzle-in',
      x: width * 0.2 - nozzleW / 2,
      y: shellTop - nozzleH,
      width: nozzleW,
      height: nozzleH,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const nozzleOut = new Rect({
      name: 'nozzle-out',
      x: width * 0.8 - nozzleW / 2,
      y: shellTop - nozzleH,
      width: nozzleW,
      height: nozzleH,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const drainL = new Rect({
      name: 'drain-left',
      x: width * 0.22 - nozzleW / 2,
      y: shellTop + shellHeight,
      width: nozzleW,
      height: nozzleH,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const drainR = new Rect({
      name: 'drain-right',
      x: width * 0.78 - nozzleW / 2,
      y: shellTop + shellHeight,
      width: nozzleW,
      height: nozzleH,
      cornerRadius: 2,
      fill: INDUSTRIAL_TOKENS.steelMid,
      stroke: INDUSTRIAL_TOKENS.steelDark,
      strokeWidth: 1,
    }) as LeafNode;
    const { root, parts } = createCompositeGroup(props, [
      { name: 'body', node: body },
      { name: 'cap-left', node: capL },
      { name: 'cap-right', node: capR },
      ...tubes.map((node, index) => ({ name: `tube-${index}`, node })),
      { name: 'nozzle-in', node: nozzleIn },
      { name: 'nozzle-out', node: nozzleOut },
      { name: 'drain-left', node: drainL },
      { name: 'drain-right', node: drainR },
    ]);
    parts.resize = (key, value) => {
      if (key === 'width') {
        const shellW = value * 0.8;
        setAttrs(body, { x: value * 0.1, width: shellW });
        setAttrs(capL, { x: 0 });
        setAttrs(capR, { x: value * 0.9 });
        tubes.forEach((tube, index) => {
          const ratio = [0.3, 0.5, 0.7][index];
          setAttrs(tube, { points: [value * 0.13, shellTop + shellHeight * ratio, value * 0.87, shellTop + shellHeight * ratio] });
        });
        setAttrs(nozzleIn, { x: value * 0.2 - nozzleW / 2 });
        setAttrs(nozzleOut, { x: value * 0.8 - nozzleW / 2 });
        setAttrs(drainL, { x: value * 0.22 - nozzleW / 2 });
        setAttrs(drainR, { x: value * 0.78 - nozzleW / 2 });
        return;
      }
      const newShellTop = value * 0.24;
      const newShellHeight = value * 0.52;
      const w = (body as unknown as { width: number }).width + (body as unknown as { x: number }).x * 2;
      setAttrs(body, { y: newShellTop, height: newShellHeight });
      setAttrs(capL, { y: newShellTop + newShellHeight * 0.14, height: newShellHeight * 0.72 });
      setAttrs(capR, { y: newShellTop + newShellHeight * 0.14, height: newShellHeight * 0.72 });
      tubes.forEach((tube, index) => {
        const ratio = [0.3, 0.5, 0.7][index];
        setAttrs(tube, { points: [w * 0.13, newShellTop + newShellHeight * ratio, w * 0.87, newShellTop + newShellHeight * ratio] });
      });
      setAttrs(nozzleIn, { y: newShellTop - value * 0.22 });
      setAttrs(nozzleOut, { y: newShellTop - value * 0.22 });
      setAttrs(drainL, { y: newShellTop + newShellHeight });
      setAttrs(drainR, { y: newShellTop + newShellHeight });
    };
    return { root, parts };
  },
});
