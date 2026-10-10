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
 * 灌装产线场景（559 Phase 3 画廊场景三，对标 FUXA 流程/产线族）：
 * 供料罐（device-tank 液位循环）+ 灌装阀（valve）+ 传送带（conveyor run 滚筒旋转）+
 * 光电传感器（sensor）+ 计数/速度 LED 数值 + 低液位声光警灯（alarm-light）。
 */
const CANVAS_ID = 'scada-gallery-filling-canvas';

const config: ScadaConfig = {
  version: 1,
  background: { color: galleryTheme.bg, grid: { size: 24, color: galleryTheme.grid } },
  variables: [
    { id: 'tankLevel', source: 'flux', flux: 'tankLevel' },
    { id: 'bottleCount', source: 'flux', flux: 'bottleCount' },
    { id: 'lineSpeed', source: 'flux', flux: 'lineSpeed' },
    { id: 'fillPressure', source: 'flux', flux: 'fillPressure' },
    { id: 'lowTank', source: 'flux', flux: 'lowTank' },
    { id: 'conveyorRun', source: 'static', value: 1 },
    { id: 'fillerValve', source: 'static', value: 1 },
  ],
  symbols: [
    ...galleryTitle('filling-title', '灌装产线 · 生产线监控'),
    ...galleryZone('filling-zone-1', 16, 64, 280, 384, '供料区'),
    ...galleryZone('filling-zone-2', 312, 64, 420, 384, '灌装输送区'),
    ...galleryZone('filling-zone-3', 748, 64, 196, 384, '产线仪表'),
    // 供料罐 + 液位循环（下降/补料 sawtooth 由模拟器驱动）
    {
      id: 'filling-tank',
      type: 'scada-device-tank',
      x: 60,
      y: 130,
      width: 96,
      height: 160,
      fill: '#546e7a',
      stroke: galleryTheme.panelStroke,
      strokeWidth: 2,
      bindings: { height: { point: 'tankLevel', scale: { k: 1.44 } }, text: { point: 'tankLevel', format: '%d %%' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '供料罐 T-201', body: [{ type: 'text', text: '液位由模拟器锯齿循环驱动：灌装消耗下降，低于 20% 触发补料回升，并联动警灯。' }] } } }],
    },
    { id: 'filling-pipe-drop', type: 'scada-pipe', x: 108, y: 300, width: 0, height: 46, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8 },
    {
      id: 'filling-valve',
      type: 'scada-device-valve',
      x: 80,
      y: 346,
      width: 60,
      height: 52,
      custom: { openRatio: 1 },
      bindings: { fill: { point: 'fillerValve' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '灌装阀 V-201', body: [{ type: 'text', text: '旋转阀芯 openRatio 形态；启停由句柄轨驱动。' }] } } }],
    },
    { id: 'filling-pipe-nozzle', type: 'scada-pipe', x: 110, y: 398, width: 0, height: 30, fill: galleryTheme.pipeRun, stroke: galleryTheme.pipeRun, strokeWidth: 8 },
    // 传送带 + 光电传感器
    {
      id: 'filling-conveyor',
      type: 'scada-device-conveyor',
      x: 340,
      y: 380,
      width: 280,
      height: 64,
      bindings: { fill: { point: 'conveyorRun' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
    },
    {
      id: 'filling-sensor',
      type: 'scada-sensor-control-sensor',
      x: 470,
      y: 300,
      width: 52,
      height: 52,
      bindings: { fill: { point: 'conveyorRun' } },
      states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '光电传感器 S-201', body: [{ type: 'text', text: '瓶体检测计数源：每检测一瓶 bottleCount + 1（flux 轨模拟器）。' }] } } }],
    },
    { id: 'filling-drop-sensor', type: 'scada-line', x: 496, y: 352, width: 0, height: 30, stroke: galleryTheme.textLabel, strokeWidth: 2, strokeDash: [4, 4] },
    // 低液位警灯
    {
      id: 'filling-alarm-light',
      type: 'scada-sensor-control-alarm-light',
      x: 250,
      y: 140,
      width: 44,
      height: 64,
      bindings: { fill: { point: 'lowTank' } },
      states: { states: {}, booleanMap: { true: 'alarm', false: 'off' } },
    },
    // 仪表
    ...galleryNumeric('filling-count-numeric', 768, 110, 150, '班次计数', 'bottleCount', '%d', '件'),
    ...galleryNumeric('filling-speed-numeric', 768, 190, 150, '产线速度', 'lineSpeed', '%d', '瓶/分'),
    {
      id: 'filling-pressure-gauge',
      type: 'scada-instrument-gauge',
      x: 762,
      y: 268,
      width: 130,
      height: 130,
      stroke: galleryTheme.panelStroke,
      textColor: galleryTheme.textColor,
      custom: { min: 0, max: 100, unit: 'kPa' },
      bindings: { rotation: { point: 'fillPressure', scale: { k: 2.7, b: -135 } }, text: { point: 'fillPressure', format: '%d kPa' } },
    },
    // 标注
    { id: 'filling-txt-tank', type: 'scada-text', x: 108, y: 298, text: '供料罐 T-201', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'filling-txt-valve', type: 'scada-text', x: 110, y: 404, text: '灌装阀 V-201', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'filling-txt-conveyor', type: 'scada-text', x: 480, y: 452, text: '输送带 CV-201（run 态滚筒旋转）', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'filling-txt-tip', type: 'scada-text', x: 480, y: 470, text: '罐液位 < 20% 联动警灯闪烁并模拟补料回升；传送带/灌装阀经句柄轨启停', textSize: 11, textColor: galleryTheme.textTip },
  ],
};

export function buildFillingGallerySchema() {
  return galleryPageSchema(CANVAS_ID, [
    controlGroup('输送带 CV-201', [
      setPointButton('启动', 'scada-gallery-filling-conveyor-start', CANVAS_ID, 'conveyorRun', 1),
      setPointButton('停止', 'scada-gallery-filling-conveyor-stop', CANVAS_ID, 'conveyorRun', 0),
    ]),
    controlGroup('灌装阀 V-201', [
      setPointButton('开', 'scada-gallery-filling-valve-open', CANVAS_ID, 'fillerValve', 1),
      setPointButton('关', 'scada-gallery-filling-valve-close', CANVAS_ID, 'fillerValve', 0),
    ]),
    controlGroup('产线', [
      { type: 'button', label: 'Fit', variant: 'secondary', size: 'sm', testid: 'scada-gallery-filling-fit', onClick: { action: 'component:fit', componentId: CANVAS_ID } },
    ]),
  ], config as unknown as Record<string, unknown>);
}
