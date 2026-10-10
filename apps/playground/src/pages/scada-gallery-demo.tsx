import { useEffect, useMemo, useRef, useState } from 'react';
import type { RendererEnv } from '@nop-chaos/flux-core';
import { Button } from '@nop-chaos/ui';
import type { SignalSimulator } from './scada-industrial-simulator.js';
import { createSignalSimulator } from './scada-industrial-simulator.js';
import {
  GallerySchemaRenderer,
  galleryFormulaCompiler,
  galleryRegistry,
  makeGalleryEnv,
} from './scada-gallery-shared.js';
import { buildWaterGallerySchema } from './scada-gallery-water-schema.js';
import { buildPowerGallerySchema } from './scada-gallery-power-schema.js';
import { buildFillingGallerySchema } from './scada-gallery-filling-schema.js';

/**
 * SCADA 场景画廊（559 Phase 3）：水处理泵房 / 配电监控 / 灌装产线三行业场景。
 * 对标开源组件库「每个能力点一个可跑示例」的 gallery 形态——每个场景展示一批新图元
 * （tank/heat-exchanger 族、gate/check-valve、elbow/tee/cross、breaker/transformer、
 * trend/numeric、alarm-light）在真实组态画面中的用法，全部工艺量由共享信号模拟器实时驱动。
 */

type GalleryScene = 'water' | 'power' | 'filling';

const SCENES: Array<{ id: GalleryScene; label: string; description: string; testid: string }> = [
  { id: 'water', label: '水处理泵房', testid: 'scada-gallery-scene-water', description: '储罐液位 + 双泵站 + 闸阀/止回阀 + 弯头三通管件 + 流量趋势 + 压力越限声光报警' },
  { id: 'power', label: '配电监控', testid: 'scada-gallery-scene-power', description: '变压器单线图 + 母线 + 三回馈线断路器分合闸 + 馈线负荷 + 绕组温度趋势' },
  { id: 'filling', label: '灌装产线', testid: 'scada-gallery-scene-filling', description: '供料罐液位循环 + 灌装阀 + 传送带滚筒旋转 + 光电计数 + 低液位报警' },
];

function createWaterSimulator(): SignalSimulator {
  return createSignalSimulator([
    { tag: 'wetWellLevel', kind: 'sine', base: 58, amplitude: 22, periodSec: 16, min: 10, max: 96 },
    { tag: 'outTankLevel', kind: 'randomWalk', base: 62, amplitude: 6, periodSec: 4, min: 25, max: 90 },
    { tag: 'flowRate', kind: 'sine', base: 78, amplitude: 26, periodSec: 12, min: 0, max: 120 },
    { tag: 'pressure', kind: 'randomWalk', base: 64, amplitude: 14, periodSec: 5, min: 40, max: 96 },
    { tag: 'phValue', kind: 'sine', base: 7.2, amplitude: 0.5, periodSec: 20, min: 6, max: 8, decimals: 1 },
  ]);
}

function createPowerSimulator(): SignalSimulator {
  return createSignalSimulator([
    { tag: 'busVoltage', kind: 'sine', base: 10.3, amplitude: 0.25, periodSec: 18, min: 9.5, max: 11, decimals: 2 },
    { tag: 'loadKW', kind: 'randomWalk', base: 320, amplitude: 30, periodSec: 5, min: 180, max: 460 },
    { tag: 'xfmrTemp', kind: 'sine', base: 62, amplitude: 9, periodSec: 30, min: 40, max: 85 },
    { tag: 'freq', kind: 'randomWalk', base: 50, amplitude: 0.05, periodSec: 3, min: 49.8, max: 50.2, decimals: 2 },
    { tag: 'f1KW', kind: 'sine', base: 140, amplitude: 30, periodSec: 14 },
    { tag: 'f2KW', kind: 'sine', base: 110, amplitude: 24, periodSec: 11 },
    { tag: 'f3KW', kind: 'sine', base: 70, amplitude: 18, periodSec: 9 },
  ]);
}

interface FillingRuntime {
  level: number;
  count: number;
  refilling: boolean;
  /** 低液位报警锁存：≤20% 置位，补料回升到 80% 复位（演示告警横幅/警灯联动） */
  alarm: boolean;
}

function createFillingSimulator(): SignalSimulator {
  const runtime: FillingRuntime = { level: 78, count: 0, refilling: false, alarm: false };
  const sim = createSignalSimulator([
    { tag: 'lineSpeed', kind: 'sine', base: 120, amplitude: 14, periodSec: 10 },
    { tag: 'fillPressure', kind: 'sine', base: 55, amplitude: 12, periodSec: 8, min: 0, max: 100 },
  ]);
  let timer: ReturnType<typeof setInterval> | null = null;
  return {
    start(onTick) {
      sim.start(onTick);
      timer = setInterval(() => {
        // 灌装消耗 → 低液位报警锁存 → 补料回升（回升到 80% 解锁）；每 tick 光电计数 +1
        if (runtime.level <= 20) runtime.alarm = true;
        if (!runtime.refilling && runtime.level > 0) runtime.level = Math.max(6, runtime.level - 3);
        if (runtime.level <= 20) runtime.refilling = true;
        if (runtime.refilling) {
          runtime.level = Math.min(85, runtime.level + 6);
          if (runtime.level >= 80) {
            runtime.refilling = false;
            runtime.alarm = false;
          }
        }
        runtime.count += 1;
        onTick({
          ...sim.current(),
          tankLevel: Math.round(runtime.level),
          bottleCount: runtime.count,
          lowTank: runtime.alarm ? 1 : 0,
        });
      }, 1000);
    },
    stop() {
      sim.stop();
      if (timer) clearInterval(timer);
      timer = null;
    },
    set(tag, value) {
      sim.set(tag, value);
      if (tag === 'tankLevel') {
        runtime.level = value;
        if (value <= 20) runtime.alarm = true;
      }
    },
    current() {
      return { ...sim.current(), tankLevel: Math.round(runtime.level), bottleCount: runtime.count, lowTank: runtime.alarm ? 1 : 0 };
    },
  };
}

export function buildGallerySimulator(scene: GalleryScene): SignalSimulator {
  switch (scene) {
    case 'water':
      return createWaterSimulator();
    case 'power':
      return createPowerSimulator();
    default:
      return createFillingSimulator();
  }
}

interface ScadaGalleryDemoPageProps {
  onBack: () => void;
}

export function ScadaGalleryDemoPage({ onBack }: ScadaGalleryDemoPageProps) {
  const env = useMemo<RendererEnv>(() => makeGalleryEnv(), []);
  const [scene, setScene] = useState<GalleryScene>('water');
  const [sim, setSim] = useState<Record<string, number>>({});
  const simulatorRef = useRef<SignalSimulator | null>(null);

  useEffect(() => {
    const simulator = buildGallerySimulator(scene);
    simulatorRef.current = simulator;
    // e2e 测试钩子（perf-scale 页 __scadaPerfScale 同法）：直接注入信号值加速告警联动观测
    (window as unknown as Record<string, unknown>).__scadaGallery = {
      set: (tag: string, value: number) => simulator.set(tag, value),
    };
    simulator.start((values) => setSim(values));
    return () => {
      simulator.stop();
      simulatorRef.current = null;
      delete (window as unknown as Record<string, unknown>).__scadaGallery;
    };
  }, [scene]);

  const schema = useMemo(() => {
    switch (scene) {
      case 'water':
        return buildWaterGallerySchema();
      case 'power':
        return buildPowerGallerySchema();
      default:
        return buildFillingGallerySchema();
    }
  }, [scene]);

  const active = SCENES.find((item) => item.id === scene)!;
  const alarmActive = scene === 'water' && sim.pressure !== undefined && sim.pressure > 88;
  const lowTank = scene === 'filling' && sim.lowTank === 1;

  return (
    <main className="min-h-screen flex flex-col p-4 gap-3">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} data-testid="scada-gallery-back">
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">Industrial HMI · 559 Gallery</p>
          <h1 className="m-0 text-xl font-bold">scada-gallery 场景画廊（水处理 / 配电 / 产线）</h1>
        </div>
      </header>
      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-3">
        <div className="flex gap-2">
          {SCENES.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={scene === item.id ? 'default' : 'outline'}
              size="sm"
              data-testid={item.testid}
              onClick={() => setScene(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto text-sm text-[var(--nop-body-copy)]">
          当前场景：{active.label} —— {active.description}
        </div>
      </div>
      {(alarmActive || lowTank) && (
        <div
          data-testid="scada-gallery-alarm-banner"
          className="rounded-lg border border-red-500/60 bg-red-500/15 px-4 py-2 text-sm text-red-400"
        >
          {alarmActive ? '⚠ 泵房出口压力越限（> 88 kPa）——声光警灯已联动闪烁' : '⚠ 供料罐液位低（< 20%）——已触发补料与警灯'}
        </div>
      )}
      <div className="flex-1 min-h-0 rounded-xl border border-[var(--nop-nav-border)] bg-[#0b1220] overflow-hidden flex flex-col p-3">
        <GallerySchemaRenderer
          key={scene}
          schemaUrl="playground://pages/scada-gallery"
          schema={schema as never}
          data={sim}
          env={env}
          registry={galleryRegistry as never}
          formulaCompiler={galleryFormulaCompiler}
        />
      </div>
    </main>
  );
}
