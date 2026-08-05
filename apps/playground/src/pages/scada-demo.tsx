import { useEffect, useMemo, useState } from 'react';
import { createFormulaCompiler } from '@nop-chaos/flux-formula';
import { createSchemaRenderer, createDefaultRegistry } from '@nop-chaos/flux-react';
import type { ExecutableApiRequest, RendererEnv } from '@nop-chaos/flux-core';
import { registerBasicRenderers } from '@nop-chaos/flux-renderers-basic';
import { registerFormRenderers } from '@nop-chaos/flux-renderers-form';
import { registerDataRenderers } from '@nop-chaos/flux-renderers-data';
import { registerScadaRenderers } from '@nop-chaos/flux-renderers-industrial';
import { Button } from '@nop-chaos/ui';

// I13.1 scada-demo 正式演示页（取代 I11 临时验证页，三链路场景并入本页）：
// 工艺流程组态画面（设备图元 + 管道 + 仪表）+ 点表模拟数据定时刷新 + 点击设备弹出详情。
//
// 点表刷新双轨演示（I13 plan Phase 1 Decision 裁定）：
// - flux 轨（定时器）：tankLevel/flow/temp/flowOn 声明为 `source: 'flux'`，页面组件 setInterval
//   生成模拟数据 → SchemaRenderer `data` prop 注入 page scope → useScadaPointsBridge（useScopeSelector）
//   → point store → 刷新流水线合帧（I10.3 双轨中的 flux 桥接轨，平台能力复用）。
// - static 轨（句柄）：motorState/pumpState/valveOpen/fanState/alarm 声明为 `source: 'static'`，
//   由下方 schema 按钮经 `component:setPointValue` 派发（I10.2 组件句柄轨，组态内点表自包含）。
const initialSim = { tankLevel: 55, flow: 48, temp: 50, flowOn: 1 };

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
          className: 'flex-wrap items-center gap-2',
          body: [
            { type: 'button', label: '电机启动', testid: 'scada-btn-motor-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 1 } } },
            { type: 'button', label: '电机停止', testid: 'scada-btn-motor-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 0 } } },
            { type: 'button', label: '电机故障', testid: 'scada-btn-motor-fault', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'motorState', value: 2 } } },
            { type: 'button', label: '泵启动', testid: 'scada-btn-pump-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'pumpState', value: 1 } } },
            { type: 'button', label: '泵停止', testid: 'scada-btn-pump-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'pumpState', value: 0 } } },
            { type: 'button', label: '阀门开', testid: 'scada-btn-valve-open', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'valveOpen', value: 1 } } },
            { type: 'button', label: '阀门关', testid: 'scada-btn-valve-close', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'valveOpen', value: 0 } } },
            { type: 'button', label: '风机启动', testid: 'scada-btn-fan-start', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'fanState', value: 1 } } },
            { type: 'button', label: '风机停止', testid: 'scada-btn-fan-stop', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'fanState', value: 0 } } },
            { type: 'button', label: '报警触发', testid: 'scada-btn-alarm-on', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'alarm', value: 1 } } },
            { type: 'button', label: '报警复位', testid: 'scada-btn-alarm-off', onClick: { action: 'component:setPointValue', componentId: 'scada-demo-canvas', args: { pointId: 'alarm', value: 0 } } },
            { type: 'button', label: 'Fit', testid: 'scada-btn-fit', onClick: { action: 'component:fit', componentId: 'scada-demo-canvas' } },
            { type: 'button', label: 'Center', testid: 'scada-btn-center', onClick: { action: 'component:center', componentId: 'scada-demo-canvas' } },
          ],
        },
        {
          type: 'scada-canvas',
          id: 'scada-demo-canvas',
          width: 900,
          height: 480,
          viewport: { fit: 'contain' },
          config: {
            version: 1,
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
              { id: 'pipe-in-1', type: 'scada-pipe', x: 0, y: 180, width: 60, height: 0 },
              {
                id: 'level-1',
                type: 'scada-instrument-level',
                x: 60,
                y: 110,
                width: 60,
                height: 140,
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
              { id: 'pipe-level-pump', type: 'scada-pipe', x: 120, y: 245, width: 90, height: 0 },
              {
                id: 'pump-1',
                type: 'scada-device-pump',
                x: 210,
                y: 210,
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
              { id: 'pipe-pump-valve', type: 'scada-pipe', x: 274, y: 226, width: 100, height: 0 },
              {
                id: 'valve-1',
                type: 'scada-device-valve',
                x: 374,
                y: 210,
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
              { id: 'pipe-valve-junc', type: 'scada-pipe', x: 438, y: 222, width: 90, height: 0 },
              {
                id: 'junction-1',
                type: 'scada-pipe-junction',
                x: 528,
                y: 206,
                width: 80,
                height: 40,
                flow: { enabled: true, speed: 2 },
                custom: { connections: [{ id: 'out1', x: 1, y: 0.5, direction: 'out', target: 'gauge-1' }] },
                bindings: { fill: { point: 'flowOn' } },
                states: { states: {}, valueMap: { '1': 'run', '0': 'stop' } },
              },
              { id: 'pipe-junc-gauge', type: 'scada-pipe', x: 608, y: 222, width: 70, height: 0 },
              {
                id: 'gauge-1',
                type: 'scada-instrument-gauge',
                x: 678,
                y: 120,
                width: 120,
                height: 120,
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
                x: 370,
                y: 40,
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
                x: 560,
                y: 30,
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
                x: 610,
                y: 300,
                width: 40,
                height: 140,
                bindings: { height: { point: 'temp', scale: { k: 1.2 } }, text: { point: 'temp', format: '%d °C' } },
              },
              {
                id: 'indicator-1',
                type: 'scada-sensor-control-indicator',
                x: 740,
                y: 320,
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
                x: 60,
                y: 360,
                width: 56,
                height: 28,
                events: [{ on: 'click', action: { action: 'ajax', args: { url: '/api/scada-demo/points', method: 'get' } } }],
              },
              { id: 'text-title', type: 'scada-text', x: 40, y: 20, text: '工艺流程组态演示（I13.1）', textSize: 18, textColor: '#0d47a1' },
              { id: 'text-level', type: 'scada-text', x: 55, y: 255, text: '储水罐 LT-101', textSize: 11, textColor: '#37474f' },
              { id: 'text-pump', type: 'scada-text', x: 205, y: 262, text: '给水泵 P-101', textSize: 11, textColor: '#37474f' },
              { id: 'text-valve', type: 'scada-text', x: 368, y: 246, text: '调节阀 V-101', textSize: 11, textColor: '#37474f' },
              { id: 'text-gauge', type: 'scada-text', x: 690, y: 245, text: '流量计 FI-201', textSize: 11, textColor: '#37474f' },
              { id: 'text-motor', type: 'scada-text', x: 366, y: 92, text: '搅拌电机 M-101', textSize: 11, textColor: '#37474f' },
              { id: 'text-fan', type: 'scada-text', x: 552, y: 82, text: '冷却风机 F-101', textSize: 11, textColor: '#37474f' },
              { id: 'text-temp', type: 'scada-text', x: 600, y: 444, text: '温度 TE-201', textSize: 11, textColor: '#37474f' },
              { id: 'text-tip', type: 'scada-text', x: 40, y: 400, text: '单击设备 → 详情；双击电机 → 跳转 flux-basic；单击按钮 → 数据请求', textSize: 11, textColor: '#546e7a' },
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
