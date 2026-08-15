import { useEffect, useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv, SchemaValue } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I13.1 scada-demo 正式演示页（取代 I11 临时验证页，三链路场景并入本页）：
// 工艺流程组态画面（设备图元 + 管道 + 仪表）+ 点表模拟数据定时刷新 + 点击设备弹出详情。
// 2026-08-15 商业级视觉刷新：暗色控制室工况屏主题（深海军蓝底 + 钢青管路 + 表盘刻度），
// 控制按钮按工位分组（电机/泵阀/风机/报警/视口）。
//
// 点表刷新双轨演示（I13 plan Phase 1 Decision 裁定）：
// - flux 轨（定时器）：tankLevel/flow/temp/flowOn 声明为 `source: 'flux'`，页面组件 setInterval
//   生成模拟数据 → SchemaRenderer `data` prop 注入 page scope → useScadaPointsBridge（useScopeSelector）
//   → point store → 刷新流水线合帧（I10.3 双轨中的 flux 桥接轨，平台能力复用）。
// - static 轨（句柄）：motorState/pumpState/valveOpen/fanState/alarm 声明为 `source: 'static'`，
//   由下方 schema 按钮经 `component:setPointValue` 派发（I10.2 组件句柄轨，组态内点表自包含）。
const initialSim = { tankLevel: 55, flow: 48, temp: 50, flowOn: 1 };

// 暗色工况屏主题 token（与 symbols/visuals.ts 视觉语言同族）。
const theme = {
  bg: '#0e1729',
  grid: '#1b2b45',
  titleBar: '#0a1322',
  accent: '#2dd4bf',
  zoneFill: '#152238',
  zoneStroke: '#2a3b58',
  pipe: '#41618c',
  arrow: '#8aa3c4',
  textTitle: '#f1f6fd',
  textZone: '#8098b8',
  textLabel: '#c5d3e8',
  textTip: '#64789a',
  gaugeFace: '#9fb2cf',
  gaugeStroke: '#22304a',
  tankFill: '#0f1c31',
  tankStroke: '#3d5a80',
  textColor: '#eaf1fb',
};

const schema = {
  type: 'page',
  body: [
    {
      type: 'flex',
      direction: 'col',
      className: 'gap-3',
      body: [
        {
          type: 'flex',
          direction: 'row',
          className: 'flex-wrap items-start gap-x-5 gap-y-3',
          body: [
            controlGroup('电机 M-101', [
              { type: 'button', label: '启动', variant: 'outline', size: 'sm', testid: 'scada-btn-motor-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 1 } } },
              { type: 'button', label: '停止', variant: 'outline', size: 'sm', testid: 'scada-btn-motor-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 0 } } },
              { type: 'button', label: '故障', variant: 'destructive', size: 'sm', testid: 'scada-btn-motor-fault', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 2 } } },
            ]),
            controlGroup('泵 P-101', [
              { type: 'button', label: '启动', variant: 'outline', size: 'sm', testid: 'scada-btn-pump-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'pumpState', value: 1 } } },
              { type: 'button', label: '停止', variant: 'outline', size: 'sm', testid: 'scada-btn-pump-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'pumpState', value: 0 } } },
            ]),
            controlGroup('阀 V-101', [
              { type: 'button', label: '开', variant: 'outline', size: 'sm', testid: 'scada-btn-valve-open', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'valveOpen', value: 1 } } },
              { type: 'button', label: '关', variant: 'outline', size: 'sm', testid: 'scada-btn-valve-close', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'valveOpen', value: 0 } } },
            ]),
            controlGroup('风机 F-101', [
              { type: 'button', label: '启动', variant: 'outline', size: 'sm', testid: 'scada-btn-fan-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'fanState', value: 1 } } },
              { type: 'button', label: '停止', variant: 'outline', size: 'sm', testid: 'scada-btn-fan-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'fanState', value: 0 } } },
            ]),
            controlGroup('报警', [
              { type: 'button', label: '触发', variant: 'destructive', size: 'sm', testid: 'scada-btn-alarm-on', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'alarm', value: 1 } } },
              { type: 'button', label: '复位', variant: 'outline', size: 'sm', testid: 'scada-btn-alarm-off', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'alarm', value: 0 } } },
            ]),
            controlGroup('视口', [
              { type: 'button', label: 'Fit', variant: 'secondary', size: 'sm', testid: 'scada-btn-fit', onClick: { action: 'component:fit', componentId: 'scada-demo-canvas' } },
              { type: 'button', label: 'Center', variant: 'secondary', size: 'sm', testid: 'scada-btn-center', onClick: { action: 'component:center', componentId: 'scada-demo-canvas' } },
            ]),
          ],
        },
        {
          type: 'scada-canvas',
          id: 'scada-demo-canvas',
          width: 960,
          height: 520,
          viewport: { fit: 'contain' },
          config: {
            version: 1,
            background: { color: theme.bg, grid: { size: 24, color: theme.grid } },
            variables: [
              { id: 'tankLevel', source: 'flux', flux: 'tankLevel' },
              { id: 'flow', source: 'flux', flux: 'flow' },
              { id: 'temp', source: 'flux', flux: 'temp' },
              { id: 'flowOn', source: 'flux', flux: 'flowOn' },
              { id: 'motorState', source: 'static', value: 1 },
              { id: 'pumpState', source: 'static', value: 1 },
              { id: 'valveOpen', source: 'static', value: 1 },
              { id: 'fanState', source: 'static', value: 1 },
              { id: 'alarm', source: 'static', value: 0 },
            ],
            symbols: [
              { id: 'title-bar', type: 'scada-round-rect', x: 0, y: 0, width: 960, height: 48, cornerRadius: 0, fill: theme.titleBar },
              { id: 'title-accent', type: 'scada-round-rect', x: 0, y: 45, width: 960, height: 3, cornerRadius: 0, fill: theme.accent },
              { id: 'zone-1-bg', type: 'scada-round-rect', x: 16, y: 64, width: 240, height: 384, fill: theme.zoneFill, stroke: theme.zoneStroke, strokeWidth: 1 },
              { id: 'zone-2-bg', type: 'scada-round-rect', x: 272, y: 64, width: 284, height: 384, fill: theme.zoneFill, stroke: theme.zoneStroke, strokeWidth: 1 },
              { id: 'zone-3-bg', type: 'scada-round-rect', x: 572, y: 64, width: 372, height: 384, fill: theme.zoneFill, stroke: theme.zoneStroke, strokeWidth: 1 },
              { id: 'pipe-in-1', type: 'scada-pipe', x: 0, y: 280, width: 104, height: 0, fill: theme.pipe, stroke: theme.pipe, strokeWidth: 7 },
              {
                id: 'level-1',
                type: 'scada-instrument-level',
                x: 104,
                y: 192,
                width: 64,
                height: 140,
                fill: theme.tankFill,
                stroke: theme.tankStroke,
                textColor: theme.textColor,
                custom: { min: 0, max: 100, unit: '%' },
                bindings: { height: { point: 'tankLevel', scale: { k: 1.4 } }, text: { point: 'tankLevel', format: '%d %%' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '储水罐 LT-101 详情',
                        body: [{ type: 'text', text: '液位由 flux 点 tankLevel（定时器模拟）驱动液柱高度。' }],
                      },
                    },
                  },
                ],
              },
              { id: 'pipe-level-pump', type: 'scada-pipe', x: 168, y: 280, width: 152, height: 0, fill: theme.pipe, stroke: theme.pipe, strokeWidth: 7 },
              {
                id: 'pump-1',
                type: 'scada-device-pump',
                x: 320,
                y: 248,
                width: 60,
                height: 60,
                bindings: { fill: { point: 'pumpState' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '给水泵 P-101 详情',
                        body: [{ type: 'text', text: '泵的运行/停止由 static 点 pumpState 驱动，run 态叶轮旋转动画（I9.1）。' }],
                      },
                    },
                  },
                ],
              },
              { id: 'pipe-pump-valve', type: 'scada-pipe', x: 380, y: 280, width: 60, height: 0, fill: theme.pipe, stroke: theme.pipe, strokeWidth: 7 },
              {
                id: 'valve-1',
                type: 'scada-device-valve',
                x: 440,
                y: 250,
                width: 60,
                height: 56,
                custom: { openRatio: 1 },
                bindings: { fill: { point: 'valveOpen' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '调节阀 V-101 详情',
                        body: [{ type: 'text', text: '阀门开度形态由 custom.openRatio 控制，开关状态由 static 点 valveOpen 驱动。' }],
                      },
                    },
                  },
                ],
              },
              { id: 'pipe-valve-junc', type: 'scada-pipe', x: 500, y: 280, width: 76, height: 0, fill: theme.pipe, stroke: theme.pipe, strokeWidth: 7 },
              {
                id: 'junction-1',
                type: 'scada-pipe-junction',
                x: 576,
                y: 260,
                width: 80,
                height: 40,
                flow: { enabled: true, speed: 2 },
                custom: { connections: [{ id: 'out1', x: 1, y: 0.5, direction: 'out', target: 'gauge-1' }] },
                bindings: { fill: { point: 'flowOn' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
              },
              { id: 'pipe-junc-gauge', type: 'scada-pipe', x: 656, y: 280, width: 16, height: 0, fill: theme.pipe, stroke: theme.pipe, strokeWidth: 7 },
              {
                id: 'gauge-1',
                type: 'scada-instrument-gauge',
                x: 672,
                y: 200,
                width: 120,
                height: 120,
                fill: theme.gaugeFace,
                stroke: theme.gaugeStroke,
                textColor: theme.textColor,
                custom: { min: 0, max: 100, unit: 'L/min' },
                bindings: { rotation: { point: 'flow', scale: { k: 2.7, b: -135 } }, text: { point: 'flow', format: '%d L/min' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '流量计 FI-201 详情',
                        body: [{ type: 'text', text: '仪表指针由 flux 点 flow（定时器模拟）经量程换算驱动（bindings.rotation scale）。' }],
                      },
                    },
                  },
                ],
              },
              {
                id: 'motor-1',
                type: 'scada-device-motor',
                x: 96,
                y: 104,
                width: 80,
                height: 60,
                bindings: { fill: { point: 'motorState' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop', '2': 'fault' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '搅拌电机 M-101 详情',
                        body: [{ type: 'text', text: '电机运行状态由 static 点 motorState 驱动（1=run / 0=stop / 2=fault）。' }],
                      },
                    },
                  },
                  { on: 'dblclick', action: { action: 'navigate', args: { url: '#/flux-basic' } } },
                ],
              },
              {
                id: 'fan-1',
                type: 'scada-device-fan',
                x: 640,
                y: 104,
                width: 80,
                height: 60,
                bindings: { fill: { point: 'fanState' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '冷却风机 F-101 详情',
                        body: [{ type: 'text', text: '风机由 static 点 fanState 驱动，run 态扇叶旋转动画。' }],
                      },
                    },
                  },
                ],
              },
              {
                id: 'thermometer-1',
                type: 'scada-instrument-thermometer',
                x: 840,
                y: 180,
                width: 40,
                height: 140,
                fill: theme.tankFill,
                stroke: theme.tankStroke,
                textColor: theme.textColor,
                bindings: { height: { point: 'temp', scale: { k: 1.2 } }, text: { point: 'temp', format: '%d °C' } },
              },
              { id: 'arrow-1', type: 'scada-arrow', x: 40, y: 270, width: 24, height: 0, stroke: theme.arrow, strokeWidth: 2 },
              { id: 'arrow-2', type: 'scada-arrow', x: 232, y: 270, width: 24, height: 0, stroke: theme.arrow, strokeWidth: 2 },
              { id: 'arrow-3', type: 'scada-arrow', x: 398, y: 270, width: 24, height: 0, stroke: theme.arrow, strokeWidth: 2 },
              { id: 'arrow-4', type: 'scada-arrow', x: 526, y: 270, width: 24, height: 0, stroke: theme.arrow, strokeWidth: 2 },
              {
                id: 'indicator-1',
                type: 'scada-sensor-control-indicator',
                x: 64,
                y: 464,
                width: 56,
                height: 32,
                bindings: { fill: { point: 'alarm' } },
                states: { states: {}, valueMap: { '1': 'fault', '0': 'stop' } },
                events: [
                  {
                    on: 'click',
                    action: {
                      action: 'openDialog',
                      args: {
                        title: '报警指示',
                        body: [{ type: 'text', text: '报警指示灯由 static 点 alarm 驱动，1=红灯闪烁（fault 状态动画）。' }],
                      },
                    },
                  },
                ],
              },
              {
                id: 'button-1',
                type: 'scada-sensor-control-button',
                x: 160,
                y: 466,
                width: 56,
                height: 28,
                events: [{ on: 'click', action: { action: 'ajax', args: { url: '/api/scada-demo/points', method: 'get' } } }],
              },
              { id: 'text-title', type: 'scada-text', x: 480, y: 13, text: '反应釜工艺流程演示', textSize: 20, textColor: theme.textTitle, fontWeight: 'bold', align: 'center' },
              { id: 'zone-1-label', type: 'scada-text', x: 136, y: 72, text: '储水区', textSize: 13, textColor: theme.textZone, align: 'center' },
              { id: 'zone-2-label', type: 'scada-text', x: 414, y: 72, text: '泵阀区', textSize: 13, textColor: theme.textZone, align: 'center' },
              { id: 'zone-3-label', type: 'scada-text', x: 758, y: 72, text: '仪表 / 冷却区', textSize: 13, textColor: theme.textZone, align: 'center' },
              { id: 'text-motor', type: 'scada-text', x: 136, y: 172, text: '搅拌电机 M-101', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-level', type: 'scada-text', x: 136, y: 340, text: '储水罐 LT-101', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-pump', type: 'scada-text', x: 350, y: 316, text: '给水泵 P-101', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-valve', type: 'scada-text', x: 470, y: 316, text: '调节阀 V-101', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-fan', type: 'scada-text', x: 680, y: 172, text: '冷却风机 F-101', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-gauge', type: 'scada-text', x: 732, y: 328, text: '流量计 FI-201', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-temp', type: 'scada-text', x: 860, y: 328, text: '温度 TE-201', textSize: 11, textColor: theme.textLabel, align: 'center' },
              { id: 'text-tip', type: 'scada-text', x: 280, y: 484, text: '单击设备 → 详情；双击电机 → 跳转 flux-basic；单击按钮 → 数据请求', textSize: 11, textColor: theme.textTip },
            ],
          },
          loading: { type: 'text', text: 'scada 场景加载中…' },
          empty: { type: 'text', text: 'scada 场景构建失败（config 非法）' },
          events: {
            onReady: { action: 'showToast', args: { message: 'scada-demo 场景就绪' } },
          },
        },
        {
          type: 'flex',
          direction: 'row',
          className: 'flex-wrap gap-2',
          body: [
            { type: 'text', text: 'flux 轨（定时器模拟数据）：tankLevel / flow / temp / flowOn' },
            { type: 'text', text: 'static 轨（component:setPointValue 句柄）：motorState / pumpState / valveOpen / fanState / alarm' },
          ],
        },
      ],
    },
  ],
};

function controlGroup(title: string, buttons: SchemaValue[]) {
  return {
    type: 'flex',
    direction: 'col',
    className: 'gap-1',
    body: [{ type: 'text', tag: 'label', text: title }, { type: 'flex', direction: 'row', className: 'flex-wrap gap-1.5', body: buttons }],
  };
}

const registry = createDefaultRegistry();
registerBasicRenderers(registry);
registerFormRenderers(registry);
registerDataRenderers(registry);
registerScadaRenderers(registry);

const SchemaRenderer = createSchemaRenderer();
const formulaCompiler = createFormulaCompiler();

function makeDemoEnv(): RendererEnv {
  return {
    fetcher: async <T,>(api: ExecutableApiRequest) => {
      console.log('[scada-demo] ajax', api.method ?? 'GET', api.url);
      return {
        ok: true,
        status: 200,
        data: { value: 42 } as T,
      };
    },
    notify: (level, message) => {
      console.log('[scada-demo] notify', level, message);
    },
    navigate: (to) => {
      if (typeof to === 'string') window.location.hash = to;
      else window.history.back();
    },
  };
}

interface ScadaDemoPageProps {
  onBack: () => void;
}

export function ScadaDemoPage({ onBack }: ScadaDemoPageProps) {
  const env = useMemo(() => makeDemoEnv(), []);
  const [sim, setSim] = useState(initialSim);

  // 点表模拟数据定时刷新（flux 轨）：每秒生成一组模拟数据注入 page scope，
  // 经 useScadaPointsBridge（useScopeSelector）桥接进 point store（不逐点 setState 直刷 React）。
  useEffect(() => {
    const timer = setInterval(() => {
      const t = Date.now() / 1000;
      setSim({
        tankLevel: 50 + Math.round(30 * Math.sin(t / 4)),
        flow: 45 + Math.round(25 * Math.sin(t / 3)),
        temp: 48 + Math.round(10 * Math.sin(t / 5)),
        flowOn: t % 8 < 6 ? 1 : 0,
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <section className="max-w-[1100px] w-full p-10 rounded-3xl bg-[var(--nop-hero-bg)] border border-[var(--nop-hero-border)] shadow-[var(--nop-hero-shadow)]">
        <Button
          variant="outline"
          className="mb-[18px] px-3.5 py-2.5 rounded-full border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] text-[var(--nop-text-strong)] font-sans text-[13px] font-bold cursor-pointer transition-[transform,box-shadow,border-color] duration-160 hover:-translate-y-px hover:shadow-[var(--nop-nav-shadow-active)] hover:border-[var(--nop-nav-hover-border)]"
          onClick={onBack}
        >
          Back to Home
        </Button>
        <p className="mb-3 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
          Industrial HMI · I13.1
        </p>
        <h1 className="m-0 mb-2">scada-demo 工艺流程组态演示页</h1>
        <p className="text-lg leading-relaxed text-[var(--nop-body-copy)]">
          设备图元（motor/pump/valve/fan）+ 管道 + 仪表（gauge/level/thermometer）组态画面；点表模拟数据
          定时刷新（flux 桥接轨 + component:setPointValue 句柄轨双演示）；单击设备弹出详情、双击电机跳转、
          按钮图元触发数据请求（I11 三链路并入）。画布支持平移/缩放（滚轮）与 hover 高亮反馈。
        </p>
        <div className="mt-8">
          <SchemaRenderer
            schemaUrl="playground://pages/scada-demo"
            schema={schema}
            data={sim}
            env={env}
            registry={registry as never}
            formulaCompiler={formulaCompiler}
          />
        </div>
      </section>
    </main>
  );
}
