import type { ThreeCanvasSchema } from '@nop-chaos/flux-renderers-3d';

// plan 469 演示场景（plan 465 Deferred「浏览器侧 fps e2e 基准」后继义务的演示面）：
// 纯声明式图元（I2.2 图元库，无外链 GLB）+ 表达式绑定（rotation/position/color/visible，
// 覆盖 tween 过渡、range 映射、condition 二选一）+ time 触发 loop 关键帧 + onObjectClick 事件。
// 场景数据由页面 setInterval 注入 page scope（spin 弧度 / heat 0-100 / heatColor），10Hz 绑定热路径负载。

export interface ThreeDemoSim {
  /** 立方体自旋角（弧度，页面积分） */
  spin: number;
  /** 热度 0-100（正弦摆动），驱动 orb 高度与 ring 显隐 */
  heat: number;
  /** 热度映射色（蓝→红），驱动立方体材质 */
  heatColor: string;
}

const RAD = Math.PI / 180;

export const threeCanvasDemoSchema = {
  type: 'page',
  className: 'flex-1 min-h-0 flex flex-col',
  bodyClassName: 'flex-1 min-h-0',
  body: [
    {
      type: 'three-canvas',
      testid: 'three-demo-canvas',
      className: 'flex-1 min-h-0 rounded-2xl overflow-hidden border border-[var(--nop-nav-border)]',
      scene: {
        camera: { position: [7, 5.5, 9], fov: 50 },
        environment: { background: '#0b1220' },
        lights: [
          { type: 'ambient', color: '#8aa3c4', intensity: 0.6 },
          { type: 'directional', color: '#ffffff', intensity: 1.4, position: [6, 10, 4] },
          { type: 'point', color: '#2dd4bf', intensity: 40, position: [-5, 4, -3] },
          { type: 'hemisphere', color: '#c5d3e8', groundColor: '#16233a', intensity: 0.5 },
        ],
        models: [
          {
            id: 'ground',
            primitive: { geometry: { type: 'plane', args: { width: 16, height: 16 } }, material: { type: 'standard', color: '#16233a' } },
            position: [0, -1.5, 0],
            rotation: [-90 * RAD, 0, 0],
          },
          {
            id: 'pedestal',
            primitive: { geometry: { type: 'cylinder', args: { radiusTop: 1.7, radiusBottom: 1.7, height: 0.4 } }, material: { type: 'standard', color: '#1b2b45' } },
            position: [0, -1.3, 0],
          },
          {
            id: 'cube',
            primitive: { geometry: { type: 'box', args: { width: 1.6, height: 1.6, depth: 1.6 } }, material: { type: 'standard', color: '#3d5a80' } },
            position: [-2.4, 0.7, 0],
            interactive: true,
          },
          {
            id: 'orb',
            primitive: { geometry: { type: 'sphere', args: { radius: 0.9 } }, material: { type: 'standard', color: '#2dd4bf' } },
            position: [2.4, 0.6, 0],
            interactive: true,
          },
          {
            id: 'pyramid',
            primitive: { geometry: { type: 'cone', args: { radius: 0.9, height: 1.8 } }, material: { type: 'standard', color: '#c5a15a' } },
            position: [0, 0.6, -2.4],
          },
          {
            id: 'ring',
            primitive: { geometry: { type: 'torus', args: { radius: 1.1, tube: 0.26 } }, material: { type: 'standard', color: '#e05252' } },
            position: [0, 2.6, 1.8],
            rotation: [55 * RAD, 0, 0],
          },
        ],
      } satisfies ThreeCanvasSchema['scene'],
      bindings: [
        {
          id: 'cube-spin',
          target: { modelId: 'cube', path: 'rotation.y', type: 'rotation' },
          source: { expression: '${spin}' },
          transform: { animation: { type: 'tween', duration: 450, easing: 'easeOut' } },
        },
        {
          id: 'orb-hover',
          target: { modelId: 'orb', path: 'position.y', type: 'position' },
          source: { expression: '${heat}' },
          transform: {
            range: { input: [0, 100], output: [-0.4, 2.4] },
            animation: { type: 'tween', duration: 400 },
          },
        },
        {
          id: 'cube-heat-color',
          target: { modelId: 'cube', path: 'material.color', type: 'material' },
          source: { expression: '${heatColor}' },
        },
        {
          id: 'ring-alarm',
          target: { modelId: 'ring', path: 'visible', type: 'visible' },
          source: { expression: '${heat}' },
          condition: { expression: 'value > 70', trueValue: true, falseValue: false },
        },
      ],
      animations: [
        {
          id: 'pyramid-bob',
          trigger: { type: 'time', source: 'auto' },
          target: { modelId: 'pyramid', property: 'position.y' },
          keyframes: [
            { time: 0, value: 0.6 },
            { time: 900, value: 1.6, easing: 'easeInOut' },
            { time: 1800, value: 0.6, easing: 'easeInOut' },
          ],
          loop: { type: 'loop' },
        },
      ],
      events: {
        onReady: { action: 'showToast', args: { message: 'three-canvas-demo 场景就绪' } },
        onError: { action: 'showToast', args: { message: 'three-canvas 场景错误（见 console）' } },
        onObjectClick: { action: 'showToast', args: { message: '点击了 3D 模型（cube/orb 可交互）' } },
      },
      loading: { type: 'text', text: '3D 场景加载中…' },
      empty: { type: 'text', text: '3D 场景为空' },
    },
    {
      type: 'flex',
      direction: 'row',
      className: 'flex-wrap gap-x-5 gap-y-1 text-sm text-[var(--nop-body-copy)]',
      body: [
        { type: 'text', text: '绑定负载：spin→cube.rotation.y（tween）· heat→orb.position.y（range+tween）· heatColor→cube 材质色 · heat>70→ring 显隐（condition）' },
        { type: 'text', text: '关键帧：pyramid position.y 循环浮动（time 触发）· 单击 cube/orb 触发 onObjectClick toast' },
      ],
    },
  ],
};
