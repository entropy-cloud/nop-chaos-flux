import { useEffect, useRef } from 'react';
import { App, Ellipse, Group, Leafer, Line, Rect, Text } from 'leafer-ui';
import '@leafer-in/view';
import '@leafer-in/animate';
import { Button } from '@nop-chaos/ui';

// I17.3 playground LeaferJS 官方示例对照页（独立路由 #/leafer-examples，不进 home 卡片，对齐 #/scada-perf-scale 先例）。
//
// 价值（roadmap I17.3）：① 团队学习 LeaferJS 原生能力；② 编辑器后继 mission 立项前对照 LeaferJS 官方
// Editor / Flow 插件能力（评估「直接复用 leafer-editor vs 自研编辑器」决策）；③ 长期作为 LeaferJS 升级
// 版本（如未来 v3）的回归对照基线。
//
// 本页直接跑 LeaferJS 官方基础示例代码（创建 App / Rect 等基础元素 / 动画 / 视口缩放平移 / Group 组合），
// leafer-ui 依赖作为 playground 直接依赖引入（v2.2.9，对齐 flux-renderers-industrial 包锁定版本）。
// Editor / Flow 插件需额外 @leafer-in/editor、@leafer-in/flow，属编辑器后继 mission 评估范围，此处仅标注。

const EXAMPLE_WIDTH = 420;
const EXAMPLE_HEIGHT = 200;

/** 示例 1：创建 Leafer + 基础元素（Rect / Ellipse / Line / Text）。 */
function useBasicShapesExample() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const leafer = new Leafer({ view: el, width: EXAMPLE_WIDTH, height: EXAMPLE_HEIGHT });
    leafer.add(new Rect({ x: 24, y: 40, width: 96, height: 96, fill: '#1565c0', cornerRadius: 8 }));
    leafer.add(new Ellipse({ x: 160, y: 40, width: 96, height: 96, fill: '#2e7d32' }));
    leafer.add(
      new Line({
        points: [280, 88, 380, 88],
        stroke: '#e65100',
        strokeWidth: 6,
        strokeCap: 'round',
      }),
    );
    leafer.add(new Text({ x: 24, y: 152, text: 'Rect / Ellipse / Line', fontSize: 13, fill: '#37474f' }));
    return () => {
      leafer.destroy();
    };
  }, []);
  return ref;
}

/** 示例 2：App 三图层（ground/tree/sky）+ sky 层覆盖物。 */
function useAppLayersExample() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const app = new App({
      view: el,
      width: EXAMPLE_WIDTH,
      height: EXAMPLE_HEIGHT,
      ground: { fill: '#0b1220' },
      tree: {},
      sky: {},
    });
    app.tree.add(new Rect({ x: 40, y: 40, width: 120, height: 80, fill: '#00838f', cornerRadius: 6 }));
    app.tree.add(new Ellipse({ x: 220, y: 50, width: 80, height: 80, fill: '#6a1b9a' }));
    app.sky.add(
      new Rect({
        x: 36,
        y: 36,
        width: 128,
        height: 88,
        stroke: '#ffb300',
        strokeWidth: 2,
        dashPattern: [6, 4],
        fill: 'rgba(255,179,0,0.06)',
      }),
    );
    app.tree.add(new Text({ x: 40, y: 140, text: 'ground + tree + sky 三图层', fontSize: 12, fill: '#cfd8dc' }));
    return () => {
      app.destroy();
    };
  }, []);
  return ref;
}

/** 示例 3：动画（animate 旋转 / 循环）。 */
function useAnimationExample() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const leafer = new Leafer({ view: el, width: EXAMPLE_WIDTH, height: EXAMPLE_HEIGHT });
    const fan = new Group({});
    const hub = new Ellipse({ x: 190, y: 80, width: 24, height: 24, fill: '#37474f' });
    fan.add(new Rect({ x: 198, y: 60, width: 12, height: 48, fill: '#546e7a', cornerRadius: 4 }));
    fan.add(new Rect({ x: 178, y: 80, width: 48, height: 12, fill: '#546e7a', cornerRadius: 4 }));
    fan.add(hub);
    leafer.add(fan);
    leafer.add(new Text({ x: 130, y: 150, text: 'animate（rotation loop）', fontSize: 13, fill: '#37474f' }));
    fan.animate([{ rotation: 0 }, { rotation: 360 }], { duration: 3, loop: true });
    return () => {
      leafer.destroy();
    };
  }, []);
  return ref;
}

/** 示例 4：视口缩放 / 平移（Leafer zoom / move 命令式 API）—— 自包含组件避免从 hook 返回 ref。 */
function ViewportExample() {
  const ref = useRef<HTMLDivElement>(null);
  const leaferRef = useRef<Leafer | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const leafer = new Leafer({ view: el, width: EXAMPLE_WIDTH, height: EXAMPLE_HEIGHT });
    leaferRef.current = leafer;
    for (let i = 0; i < 6; i++) {
      leafer.add(
        new Rect({
          x: 24 + i * 64,
          y: 40 + (i % 2) * 56,
          width: 48,
          height: 48,
          fill: ['#1565c0', '#2e7d32', '#e65100', '#6a1b9a', '#00838f', '#c62828'][i],
          cornerRadius: 6,
        }),
      );
    }
    leafer.add(new Text({ x: 24, y: 160, text: 'zoom / move 视口命令', fontSize: 13, fill: '#37474f' }));
    return () => {
      leafer.destroy();
      leaferRef.current = null;
    };
  }, []);
  return (
    <>
      <div ref={ref} data-testid="leafer-example-canvas" className="rounded-lg overflow-hidden" />
      <div className="flex items-center gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={() => leaferRef.current?.zoom(1.2)}>
          Zoom In
        </Button>
        <Button variant="outline" size="sm" onClick={() => leaferRef.current?.zoom(0.8)}>
          Zoom Out
        </Button>
        <Button variant="outline" size="sm" onClick={() => leaferRef.current?.move(20, 0)}>
          →
        </Button>
        <Button variant="outline" size="sm" onClick={() => leaferRef.current?.move(-20, 0)}>
          ←
        </Button>
        <Button variant="outline" size="sm" onClick={() => leaferRef.current?.zoom('fit')}>
          Reset
        </Button>
      </div>
    </>
  );
}

interface ExampleCardProps {
  title: string;
  caption: string;
  children: React.ReactNode;
}

function ExampleCard({ title, caption, children }: ExampleCardProps) {
  return (
    <div className="rounded-xl border border-[var(--nop-nav-border)] bg-[var(--nop-nav-surface)] p-4">
      <h3 className="m-0 mb-1 text-sm font-bold text-[var(--nop-text-strong)]">{title}</h3>
      <p className="m-0 mb-3 text-xs text-[var(--nop-body-copy)]">{caption}</p>
      {children}
    </div>
  );
}

interface LeaferExamplesDemoPageProps {
  onBack: () => void;
}

export function LeaferExamplesDemoPage({ onBack }: LeaferExamplesDemoPageProps) {
  const basicRef = useBasicShapesExample();
  const appRef = useAppLayersExample();
  const animRef = useAnimationExample();

  return (
    <main className="min-h-screen flex flex-col p-4 gap-4">
      <header className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Home
        </Button>
        <div>
          <p className="mb-1 uppercase tracking-[0.16em] text-xs text-[var(--nop-eyebrow)]">
            Industrial HMI · I17.3 · Reference
          </p>
          <h1 className="m-0 text-xl font-bold">LeaferJS 官方示例对照页</h1>
        </div>
      </header>
      <p className="text-sm text-[var(--nop-body-copy)] max-w-[920px]">
        直接跑 LeaferJS（v2.2.9）官方基础示例代码：创建 Leafer/App、Rect/Ellipse/Line/Text 基础元素、animate
        动画、Group 组合、视口缩放/平移。团队学习 LeaferJS 原生能力 + 编辑器后继 mission（leafer-editor vs
        自研）决策对照 + 未来 v3 升级回归基线。Editor / Flow 插件需额外 @leafer-in/editor、@leafer-in/flow，属编辑器 mission 评估范围。
      </p>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <ExampleCard title="创建 Leafer + 基础元素" caption="Rect / Ellipse / Line / Text —— LeaferJS 快速入门">
          <div ref={basicRef} data-testid="leafer-example-canvas" className="rounded-lg overflow-hidden" />
        </ExampleCard>
        <ExampleCard title="App 三图层" caption="ground（背景）+ tree（图元）+ sky（覆盖物）">
          <div ref={appRef} data-testid="leafer-example-canvas" className="rounded-lg overflow-hidden" />
        </ExampleCard>
        <ExampleCard title="动画 animate" caption="fan.animate(rotation, { loop }) 循环旋转">
          <div ref={animRef} data-testid="leafer-example-canvas" className="rounded-lg overflow-hidden" />
        </ExampleCard>
        <ExampleCard title="视口缩放 / 平移" caption="Leafer.zoom() / move() 命令式 API">
          <ViewportExample />
        </ExampleCard>
      </div>
    </main>
  );
}
