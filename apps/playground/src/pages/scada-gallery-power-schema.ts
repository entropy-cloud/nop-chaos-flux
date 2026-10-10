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
 * 配电监控场景（559 Phase 3 画廊场景二，对标 ThingsBoard HP 通用件/FUXA Electrical）：
 * 进线变压器（elec-transformer）+ 母线 + 三回馈线断路器（elec-breaker 分合闸）+
 * 负荷 motor/fan + LED 数值（电压/功率/频率）+ 馈线负荷 progress + 绕组温度趋势。
 */
const CANVAS_ID = 'scada-gallery-power-canvas';

const breakerStates = { states: {}, valueMap: { '1': 'closed', '0': 'open', '2': 'trip' } };

const config: ScadaConfig = {
  version: 1,
  background: { color: galleryTheme.bg, grid: { size: 24, color: galleryTheme.grid } },
  variables: [
    { id: 'busVoltage', source: 'flux', flux: 'busVoltage' },
    { id: 'loadKW', source: 'flux', flux: 'loadKW' },
    { id: 'xfmrTemp', source: 'flux', flux: 'xfmrTemp' },
    { id: 'freq', source: 'flux', flux: 'freq' },
    { id: 'f1KW', source: 'flux', flux: 'f1KW' },
    { id: 'f2KW', source: 'flux', flux: 'f2KW' },
    { id: 'f3KW', source: 'flux', flux: 'f3KW' },
    { id: 'brkIn', source: 'static', value: 1 },
    { id: 'brkF1', source: 'static', value: 1 },
    { id: 'brkF2', source: 'static', value: 1 },
    { id: 'brkF3', source: 'static', value: 0 },
  ],
  symbols: [
    ...galleryTitle('power-title', '配电监控 · 单线图'),
    ...galleryZone('power-zone-1', 16, 64, 300, 384, '进线'),
    ...galleryZone('power-zone-2', 332, 64, 612, 384, '0.4kV 母线 · 馈线'),
    // 进线：电缆 → 进线断路器 → 变压器 → 母线
    { id: 'power-line-in', type: 'scada-line', x: 30, y: 200, width: 60, height: 0, stroke: '#ffb300', strokeWidth: 3 },
    {
      id: 'power-brk-in',
      type: 'scada-elec-breaker',
      x: 90,
      y: 178,
      width: 72,
      height: 44,
      bindings: { fill: { point: 'brkIn' } },
      states: breakerStates,
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '进线断路器 QF-100', body: [{ type: 'text', text: 'elec-breaker 新图元：合闸触桥水平/分闸翻转 -35°；trip 态红闪。' }] } } }],
    },
    { id: 'power-line-tfmr', type: 'scada-line', x: 162, y: 200, width: 50, height: 0, stroke: '#ffb300', strokeWidth: 3 },
    {
      id: 'power-transformer',
      type: 'scada-elec-transformer',
      x: 212,
      y: 130,
      width: 64,
      height: 140,
      bindings: { fill: { point: 'brkIn' } },
      states: { states: {}, valueMap: { '1': 'closed', '0': 'open' } },
      events: [{ on: 'click', action: { action: 'openDialog', args: { title: '变压器 T-100（10/0.4kV）', body: [{ type: 'text', text: 'elec-transformer 新图元：双绕组 + 铁芯柱；绕组温度趋势见右下 trend。' }] } } }],
    },
    { id: 'power-line-bus', type: 'scada-line', x: 276, y: 200, width: 90, height: 0, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-busbar', type: 'scada-round-rect', x: 366, y: 196, width: 550, height: 9, cornerRadius: 2, fill: galleryTheme.busbar, stroke: '#8d6e00', strokeWidth: 1 },
    // 三回馈线：断路器 → 电缆 → 负荷
    { id: 'power-drop-f1', type: 'scada-line', x: 420, y: 205, width: 0, height: 40, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-brk-f1', type: 'scada-elec-breaker', x: 384, y: 245, width: 72, height: 44, bindings: { fill: { point: 'brkF1' } }, states: breakerStates },
    { id: 'power-drop-f1b', type: 'scada-line', x: 420, y: 289, width: 0, height: 36, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-motor-f1', type: 'scada-device-motor', x: 384, y: 325, width: 72, height: 56, bindings: { fill: { point: 'brkF1' } }, states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } } },
    { id: 'power-drop-f2', type: 'scada-line', x: 610, y: 205, width: 0, height: 40, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-brk-f2', type: 'scada-elec-breaker', x: 574, y: 245, width: 72, height: 44, bindings: { fill: { point: 'brkF2' } }, states: breakerStates },
    { id: 'power-drop-f2b', type: 'scada-line', x: 610, y: 289, width: 0, height: 36, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-motor-f2', type: 'scada-device-motor', x: 574, y: 325, width: 72, height: 56, bindings: { fill: { point: 'brkF2' } }, states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } } },
    { id: 'power-drop-f3', type: 'scada-line', x: 800, y: 205, width: 0, height: 40, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-brk-f3', type: 'scada-elec-breaker', x: 764, y: 245, width: 72, height: 44, bindings: { fill: { point: 'brkF3' } }, states: breakerStates },
    { id: 'power-drop-f3b', type: 'scada-line', x: 800, y: 289, width: 0, height: 36, stroke: '#ffb300', strokeWidth: 3 },
    { id: 'power-fan-f3', type: 'scada-device-fan', x: 778, y: 325, width: 64, height: 56, bindings: { fill: { point: 'brkF3' } }, states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } } },
    // 仪表面板
    ...galleryNumeric('power-voltage-numeric', 348, 76, 130, '母线电压', 'busVoltage', '%.1f', 'kV'),
    ...galleryNumeric('power-load-numeric', 492, 76, 130, '总负荷', 'loadKW', '%d', 'kW'),
    ...galleryNumeric('power-freq-numeric', 636, 76, 130, '频率', 'freq', '%.2f', 'Hz'),
    // 馈线负荷 progress（复用 instrument-progress，宽度绑定）
    { id: 'power-load-f1', type: 'scada-instrument-progress', x: 348, y: 402, width: 150, height: 14, custom: { min: 0, max: 200 }, bindings: { width: { point: 'f1KW', scale: { k: 0.66 } } } },
    { id: 'power-load-f2', type: 'scada-instrument-progress', x: 512, y: 402, width: 150, height: 14, custom: { min: 0, max: 200 }, bindings: { width: { point: 'f2KW', scale: { k: 0.66 } } } },
    { id: 'power-load-f3', type: 'scada-instrument-progress', x: 676, y: 402, width: 150, height: 14, custom: { min: 0, max: 200 }, bindings: { width: { point: 'f3KW', scale: { k: 0.66 } } } },
    {
      id: 'power-temp-trend',
      type: 'scada-instrument-trend',
      x: 48,
      y: 300,
      width: 250,
      height: 90,
      stroke: galleryTheme.panelStroke,
      textColor: '#ff8f6b',
      bindings: { height: { point: 'xfmrTemp', scale: { k: 0.78 } }, text: { point: 'xfmrTemp', format: '%d °C' } },
    },
    // 标注
    { id: 'power-txt-brk-in', type: 'scada-text', x: 126, y: 240, text: 'QF-100 进线', textSize: 11, textColor: galleryTheme.textLabel, align: 'center' },
    { id: 'power-txt-trend', type: 'scada-text', x: 173, y: 396, text: 'T-100 绕组温度趋势', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'power-txt-f1', type: 'scada-text', x: 420, y: 390, text: 'F1 馈线负荷', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'power-txt-f2', type: 'scada-text', x: 584, y: 390, text: 'F2 馈线负荷', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'power-txt-f3', type: 'scada-text', x: 748, y: 390, text: 'F3 馈线负荷', textSize: 10, textColor: galleryTheme.textTip, align: 'center' },
    { id: 'power-txt-tip', type: 'scada-text', x: 480, y: 470, text: '点击断路器图元查看详情；分/合闸经句柄轨 setPointValue 驱动触桥形态与状态色', textSize: 11, textColor: galleryTheme.textTip },
  ],
};

export function buildPowerGallerySchema() {
  return galleryPageSchema(CANVAS_ID, [
    controlGroup('进线 QF-100', [
      setPointButton('合闸', 'scada-gallery-power-brk-in-close', CANVAS_ID, 'brkIn', 1),
      setPointButton('分闸', 'scada-gallery-power-brk-in-open', CANVAS_ID, 'brkIn', 0),
      setPointButton('跳闸', 'scada-gallery-power-brk-in-trip', CANVAS_ID, 'brkIn', 2, 'destructive'),
    ]),
    controlGroup('馈线 F1', [
      setPointButton('合', 'scada-gallery-power-brk-f1-close', CANVAS_ID, 'brkF1', 1),
      setPointButton('分', 'scada-gallery-power-brk-f1-open', CANVAS_ID, 'brkF1', 0),
    ]),
    controlGroup('馈线 F2', [
      setPointButton('合', 'scada-gallery-power-brk-f2-close', CANVAS_ID, 'brkF2', 1),
      setPointButton('分', 'scada-gallery-power-brk-f2-open', CANVAS_ID, 'brkF2', 0),
    ]),
    controlGroup('馈线 F3', [
      setPointButton('合', 'scada-gallery-power-brk-f3-close', CANVAS_ID, 'brkF3', 1),
      setPointButton('分', 'scada-gallery-power-brk-f3-open', CANVAS_ID, 'brkF3', 0),
    ]),
    controlGroup('视口', [
      { type: 'button', label: 'Fit', variant: 'secondary', size: 'sm', testid: 'scada-gallery-power-fit', onClick: { action: 'component:fit', componentId: CANVAS_ID } },
    ]),
  ], config as unknown as Record<string, unknown>);
}
