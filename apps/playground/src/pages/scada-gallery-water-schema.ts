import type { ScadaConfig } from '@nop-chaos/flux-renderers-industrial';
import {
  controlGroup,
  galleryNumeric,
  galleryTitle,
  galleryZone,
  galleryTheme,
  galleryPageSchema,
  setPointButton,
} from './scada-gallery-shared.js';

/**
 * 水处理泵房场景（559 Phase 3 画廊场景一，对标 ThingsBoard 游泳池/水处理 SCADA 用例）：
 * 集水井/清水池双储罐（device-tank 液位绑定）+ 双泵站（pump run/stop/fault）+
 * 闸阀/止回阀（gate-valve/check-valve）+ 弯头/三通管件（pipe-elbow/tee）+
 * LED 数值/趋势图（numeric/trend）+ 声光警灯（alarm-light）。
 * 全部工艺量为 flux 轨模拟器驱动；泵阀为 static 轨句柄驱动。
 */

const CANVAS_ID = 'scada-gallery-water-canvas';

const config: ScadaConfig = {
  version: 1,
  background: { color: galleryTheme.bg, grid: { size: 24, color: galleryTheme.grid } },
  variables: [
    { id: 'wetWellLevel', source: 'flux', flux: 'wetWellLevel' },
    { id: 'outTankLevel', source: 'flux', flux: 'outTankLevel' },
    { id: 'flowRate', source: 'flux', flux: 'flowRate' },
    { id: 'pressure', source: 'flux', flux: 'pressure' },
    { id: 'alarmActive', source: 'flux', flux: 'alarmActive' },
    { id: 'pumpA', source: 'static', value: 1 },
    { id: 'pumpB', source: 'static', value: 0 },
    { id: 'drainValve', source: 'static', value: 1 },
  ],
  symbols: [
    ...galleryTitle('water-title', '水处理泵房 · 泵站监控'),
    ...galleryZone('water-zone-1', 16, 64, 250, 384, '集水井区'),
    ...galleryZone('water-zone-2', 282, 64, 300, 384, '泵房区'),
    ...galleryZone('water-zone-3', 598, 64, 346, 384, '清水池 · 仪表区'),
    // 集水井（湿井）储罐：液位绑定 wetWellLevel（0..100 → 液柱像素）
    {
      id: 'water-wet-tank',
      type: 'scada-device-tank',
      x: 48,
      y: 150,
      width: 90,
      height: 150,
      fill: '#546e7a',
      stroke: galleryTheme.panelStroke,
      strokeWidth: 2,
      bindings: { height: { point: 'wetWellLevel', scale: { k: 1.36 } }, text: { point: 'wetWellLevel', format: '%d %%' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '集水井 T-101', body: [{ type: 'text', text: 'device-tank 新图元：液柱高度由 wetWellLevel 液位绑定（height scale 换算）驱动。' }] } } }],
    },
    // 吸水干管 + 弯头（新管件）+ 三通（新管件）分双泵
    { id: 'water-pipe-suction', type: 'scada-pipe', x: 93, y: 320, width: 130, height: 0, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8, flow: { enabled: true, speed: 2 }, states: { states: { run: {} }, booleanMap: { true: 'run', false: 'stop' } } as const },
    { id: 'water-elbow-in', type: 'scada-pipe-elbow', x: 63, y: 290, width: 60, height: 60, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8 },
    { id: 'water-tee-split', type: 'scada-pipe-tee', x: 223, y: 300, width: 80, height: 60, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8, flow: { enabled: true, speed: 2 }, states: { states: { run: {} }, booleanMap: { true: 'run', false: 'stop' } } as const },
    // 泵 A（运行）+ 止回阀 + 闸阀（排水）
    {
      id: 'water-pump-a',
      type: 'scada-device-pump',
      x: 316,
      y: 150,
      width: 60,
      height: 60,
      bindings: { fill: { point: 'pumpA' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop', '2': 'fault' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '供水泵 P-101A', body: [{ type: 'text', text: 'run 态叶轮旋转（默认 run 动画）；启停/故障由句柄轨 setPointValue 驱动。' }] } } }],
    },
    {
      id: 'water-check-valve-a',
      type: 'scada-device-check-valve',
      x: 396,
      y: 162,
      width: 56,
      height: 36,
      custom: { openRatio: 1 },
      bindings: { fill: { point: 'pumpA' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop', '2': 'fault' } },
    },
    {
      id: 'water-pump-b',
      type: 'scada-device-pump',
      x: 316,
      y: 260,
      width: 60,
      height: 60,
      bindings: { fill: { point: 'pumpB' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop', '2': 'fault' } },
    },
    {
      id: 'water-gate-valve-b',
      type: 'scada-device-gate-valve',
      x: 396,
      y: 262,
      width: 60,
      height: 52,
      custom: { openRatio: 1 },
      bindings: { fill: { point: 'pumpB' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop', '2': 'fault' } },
    },
    {
      id: 'water-drain-valve',
      type: 'scada-device-gate-valve',
      x: 316,
      y: 372,
      width: 60,
      height: 52,
      custom: { openRatio: 0 },
      bindings: { fill: { point: 'drainValve' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '排水阀 DV-101', body: [{ type: 'text', text: 'gate-valve 新图元：闸板开度 custom.openRatio（0=落座关闭/1=升入阀盖），状态色由 drainValve 点驱动。' }] } } }],
    },
    // 排水联络管（弯头向下）
    { id: 'water-elbow-drain', type: 'scada-pipe-elbow', x: 380, y: 396, width: 60, height: 44, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8 },
    // 清水池 + 出水管
    {
      id: 'water-out-tank',
      type: 'scada-device-tank',
      x: 640,
      y: 150,
      width: 90,
      height: 150,
      fill: '#546e7a',
      stroke: galleryTheme.panelStroke,
      strokeWidth: 2,
      bindings: { height: { point: 'outTankLevel', scale: { k: 1.36 } }, text: { point: 'outTankLevel', format: '%d %%' } },
    },
    { id: 'water-pipe-out', type: 'scada-pipe', x: 470, y: 240, width: 150, height: 0, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8, flow: { enabled: true, speed: 2 }, states: { states: { run: {} }, booleanMap: { true: 'run', false: 'stop' } } as const },
    { id: 'water-elbow-out', type: 'scada-pipe-elbow', x: 655, y: 300, width: 60, height: 60, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8 },
    // 仪表区：压力表 + LED 数值 ×2 + 趋势图 + 声光警灯
    {
      id: 'water-pressure-gauge',
      type: 'scada-instrument-gauge',
      x: 770,
      y: 110,
      width: 120,
      height: 120,
      stroke: galleryTheme.panelStroke,
      textColor: galleryTheme.textColor,
      custom: { min: 0, max: 100, unit: 'kPa' },
      bindings: { rotation: { point: 'pressure', scale: { k: 2.7, b: -135 } }, text: { point: 'pressure', format: '%d kPa' } },
    },
    ...galleryNumeric('water-flow-numeric', 620, 300, 140, '出水流量 FI-201', 'flowRate', '%d', 'm³/h'),
    ...galleryNumeric('water-ph-numeric', 790, 300, 120, '出水 pH', 'phValue', '%.1f', 'pH'),
    {
      id: 'water-flow-trend',
      type: 'scada-instrument-trend',
      x: 620,
      y: 372,
      width: 290,
      height: 72,
      stroke: galleryTheme.panelStroke,
      textColor: '#7ee787',
      bindings: { height: { point: 'flowRate', scale: { k: 0.62 } }, text: { point: 'flowRate', format: '%d m³/h' } },
    },
    {
      id: 'water-alarm-light',
      type: 'scada-sensor-control-alarm-light',
      x: 560,
      y: 120,
      width: 44,
      height: 64,
      bindings: { fill: { point: 'alarmActive' } },
      states: { states: {}, booleanMap: { true: 'alarm', false: 'off' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '泵房声光报警', body: [{ type: 'text', text: 'alarm-light 新图元：alarm 态红罩闪烁（blink 400ms）。本场景由压力越限（>88 kPa）联动触发。' }] } } }],
    },
    // 标注文本
    { id: 'water-txt-wet', type: 'scada-text', x: 93, y: 310, text: '集水井 T-101', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'water-txt-pump-a', type: 'scada-text', x: 346, y: 216, text: '供水泵 P-101A', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'water-txt-pump-b', type: 'scada-text', x: 346, y: 326, text: '供水泵 P-101B', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'water-txt-out', type: 'scada-text', x: 685, y: 310, text: '清水池 T-102', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'water-txt-trend', type: 'scada-text', x: 765, y: 452, text: '流量趋势（trend 图元，height 绑定环形缓冲）', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'water-txt-tip', type: 'scada-text', x: 480, y: 470, text: '压力 > 88 kPa 联动警灯闪烁；单击设备/警灯查看详情', textSize: 11, textColor: galleryTheme.textTip },
  ],
};

export function buildWaterGallerySchema() {
  return galleryPageSchema(CANVAS_ID, [
    controlGroup('泵 P-101A', [
      setPointButton('启动', 'scada-gallery-water-pump-a-start', CANVAS_ID, 'pumpA', 1),
      setPointButton('停止', 'scada-gallery-water-pump-a-stop', CANVAS_ID, 'pumpA', 0),
      setPointButton('故障', 'scada-gallery-water-pump-a-fault', CANVAS_ID, 'pumpA', 2, 'destructive'),
    ]),
    controlGroup('泵 P-101B', [
      setPointButton('启动', 'scada-gallery-water-pump-b-start', CANVAS_ID, 'pumpB', 1),
      setPointButton('停止', 'scada-gallery-water-pump-b-stop', CANVAS_ID, 'pumpB', 0),
    ]),
    controlGroup('排水阀 DV-101', [
      setPointButton('开', 'scada-gallery-water-drain-open', CANVAS_ID, 'drainValve', 1),
      setPointButton('关', 'scada-gallery-water-drain-close', CANVAS_ID, 'drainValve', 0),
    ]),
    controlGroup('视口', [
      { type: 'button', label: 'Fit', variant: 'secondary', size: 'sm', testid: 'scada-gallery-water-fit', onClick: { action: 'component:fit', componentId: CANVAS_ID } },
    ]),
  ], config as unknown as Record<string, unknown>);
}

export const WATER_CANVAS_ID = CANVAS_ID;
