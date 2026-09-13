# three-canvas 渲染器设计（v5）

> 分册：`docs/components/threejs-integration/design.md` §5 索引 | 版本 5.0（2026-09-13）
> 消费者：I2.1。API 事实来源 three r186 + `@types/three@0.186.0`；平台契约以 live code 为准。

## 1. Schema 类型

```typescript
// schemas.ts
import type { BaseSchema, SchemaInput, ActionSchema } from '@nop-chaos/flux-core';

export interface ThreeCanvasSchema extends BaseSchema {
  type: 'three-canvas';
  scene: ThreeSceneConfig;
  bindings?: DataBinding[];
  animations?: AnimationConfig[];
  /** events 对象整体作为 prop（design.md D3），渲染器内经 helpers.dispatch 桥接 */
  events?: ThreeCanvasEvents;
  loading?: SchemaInput;
  empty?: SchemaInput;
}

export interface ThreeSceneConfig {
  camera: {
    position: [number, number, number];
    fov?: number; // 默认 75
    near?: number; // 默认 0.1
    far?: number; // 默认 1000
  };
  lights: LightConfig[];
  environment?: {
    background?: string;
    fog?: { color: string; near: number; far: number };
  };
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string; // 唯一，绑定引用键
  url: string; // GLTF/GLB
  position?: [number, number, number];
  rotation?: [number, number, number]; // 弧度；Euler.set 要求三元（z 必填）
  scale?: [number, number, number];
  interactive?: boolean;
  initialAnimation?: string;
}

export interface LightConfig {
  type: 'ambient' | 'directional' | 'point' | 'spot' | 'hemisphere';
  color?: string;
  intensity?: number;
  position?: [number, number, number];
  target?: [number, number, number]; // directional 专用；target 需 scene.add(light.target)
  groundColor?: string; // hemisphere 专用：地面色（I2.1 实现回写）
  castShadow?: boolean;
}

export interface ThreeCanvasEvents {
  onObjectClick?: ActionSchema; // payload: { modelId, point: {x,y,z} }
  onObjectHover?: ActionSchema; // payload: { modelId, hovered }
  onReady?: ActionSchema;
  onError?: ActionSchema; // payload: { code, message }
}
```

`AnimationConfig` 见 design-data-binding.md §6。

## 2. RendererDefinition

```typescript
// renderer-definitions.ts
export const threeCanvasRendererDefinition: RendererDefinition = {
  type: 'three-canvas',
  component: ThreeCanvasRenderer,
  propContracts: {
    /* scene/bindings/animations/events 各自的 FluxValueShape 声明, editorType: 'code' */
  },
  fields: [
    { key: 'scene', kind: 'prop' },
    { key: 'bindings', kind: 'prop' },
    { key: 'animations', kind: 'prop' },
    // events 整体 prop：classifyField 仅顶层 key 精确匹配、无点号路径（design.md D3，
    // 证据 renderer-definitions.ts(industrial):37-38,201）
    { key: 'events', kind: 'prop' },
    { key: 'loading', kind: 'region', regionKey: 'loading' },
    { key: 'empty', kind: 'region', regionKey: 'empty' },
  ],
};
```

## 3. 组件形态（React 壳 + 命令式引擎）

```tsx
export function ThreeCanvasRenderer(props: RendererComponentProps<ThreeCanvasSchema>) {
  const { scene, events } = props.props;
  const { visible, className, testid } = props.meta;
  const runtime = useRendererRuntime();
  const scope = useRenderScope();
  const env = useRendererEnv();
  const expressionCompiler = runtime.expressionCompiler;
  const helpers = props.helpers;

  // 引擎实例（scene 变更 → 重建，generation bump）
  const sceneManager = useSceneManager(scene, containerRef, visible); // visible 入参驱动引擎生命周期（§7）

  // 绑定桥接（design-data-binding.md §4）
  useBindingBridge({
    scope,
    expressionCompiler,
    env,
    bindings: props.props.bindings,
    sceneManager,
  });

  // 事件桥接（对齐 use-scada-events 模式：ActionSchema + helpers.dispatch）
  const eventApi = useThreeEvents({ events, helpers, scope, sceneManager });

  if (!visible) return null;
  return (
    <div
      ref={containerRef}
      className={cn('three-canvas', className)}
      data-testid={testid}
      style={{ width: '100%', height: '400px' }}
    />
  );
}
```

要点：

- **无 R3F**（design.md D1）。组件渲染唯一 DOM 容器；three 的 `WebGLRenderer` 由 `useSceneManager` 创建并 append 到容器，`ResizeObserver` 驱动 `renderer.setSize` + `camera.aspect` + `updateProjectionMatrix`。
- **rAF 循环**由 `SceneManager` 持有：每帧 `controls.update()` → mixers `update(delta)` → flush pendingUpdates → `renderer.render(scene, camera)`；卸载时 cancelAnimationFrame + dispose 链。
- `props.helpers` 提供 `dispatch`/`evaluate`，`useRendererEnv` 提供协议与 IO 能力。

## 4. 事件桥接

对齐 `use-scada-events.ts` 模式：

```typescript
const dispatchEvent = (type: string, payload: Record<string, unknown>, action: unknown) => {
  if (!action || typeof action !== 'object') return undefined;
  const normalized = createNormalizedActionEvent({ type, ...payload });
  return helpers.dispatch(action as ActionSchema, { event: normalized, scope });
};
// 对象点击 → dispatchEvent('object:click', { modelId, point }, events.onObjectClick)
// hover    → dispatchEvent('object:hover', { modelId, hovered }, events.onObjectHover)
```

射线拾取：`renderer.domElement` pointer 事件 → `Raycaster.intersectObjects(models, true)` → 命中回溯到 modelId（`object.userData.modelId` 或向上遍历至 `mesh.name === config.id` 的注册根）。`interactive: false` 的模型不参与拾取。

## 5. SceneManager（引擎核心）

职责与契约：

| 方法                                                                                                | 契约                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init(container)`                                                                                   | 创建 `WebGLRenderer({ antialias, alpha })` / `PerspectiveCamera` / `Scene`；按 `LightConfig` 组装灯光（五类映射见调研文档 §9.4）；`environment.background` → `scene.background = new THREE.Color(...)`；`environment.fog` → `new THREE.Fog(color, near, far)`；启动 rAF                                                                                                                                                     |
| `loadModels()`                                                                                      | 逐个 `ModelConfig` 经 `model-loader` 加载（generation-guard，见 §6）；加载完成后 `mesh.name = config.id`、应用 position/rotation/scale（`.set(...arr)`，数组须三元）、注册进 `models: Map<id, ManagedModel>`；`initialAnimation` 命中 `gltf.animations` 则 `mixer.clipAction(clip).play()`                                                                                                                                  |
| `updateProperty(modelId, path, value)`                                                              | 点分路径导航（如 `position`、`material.color`、`visible`）；末段属性若带 `.set()`（Vector3/Euler/Color）按类型调用（数组 spread 或单值），否则直接赋值；**模型未就绪时进入 pending buffer（键为 `modelId::path`，同键后写覆盖先写，按首次写入的插入序回放）**——保证绑定初值不因 GLTF 异步加载而丢失；`model-load-failed` 或模型被移除时丢弃该 modelId 的全部 buffer 条目（经 onError 去重通道上报），回放仅在模型注册时发生 |
| `setFrameUpdateQueue(queue: { drain(): Array<{ modelId: string; path: string; value: unknown }> })` | hook ↔ engine 接线：`useBindingBridge` 把 pendingUpdates 队列句柄注册进引擎，rAF 循环每帧 `drain()` 后批量应用；注册 effect 以 **bindings 与 sceneManager 实例 identity** 为依赖（引擎重建后新实例必须重新注册，否则更新滞留 hook 队列不被 drain）；引擎重建时 hook 同步丢弃 pendingUpdatesRef 与 lastValues（防对已删模型的 stale 写入）                                                                                   |
| `onPick(cb: (e: { modelId: string; point: THREE.Vector3 }) => void): () => void`                    | 射线拾取点击回调订阅（返回退订函数）；`useThreeEvents` 据此派发 `object:click`                                                                                                                                                                                                                                                                                                                                              |
| `onHover(cb: (e: { modelId: string; hovered: boolean }) => void): () => void`                       | hover 进/出回调订阅；`useThreeEvents` 据此派发 `object:hover` 并驱动光标态                                                                                                                                                                                                                                                                                                                                                  |
| `updateAnimations(delta)`                                                                           | 遍历 `AnimationMixer` 更新                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dispose()`                                                                                         | 取消 rAF → generation bump（丢弃在途加载）→ traverse `geometry.dispose()` + 材质（单/数组）`dispose()` → mixers `stopAllAction()` + `uncacheRoot` → `controls.dispose()` → `renderer.dispose()` + domElement 移除                                                                                                                                                                                                           |

OrbitControls：`three/examples/jsm/controls/OrbitControls.js`；`enableDamping = true` 时每帧必须 `controls.update()`；相机配置来自 `scene.camera`。

## 6. 模型加载器（generation-guard 取消）

```typescript
// engine/model-loader.ts
export class ModelLoader {
  private generation = 0;
  async load(config: ModelConfig, onLoaded: (gltf: GLTF) => void): Promise<void> {
    const gen = this.generation; // 只读当前代，不自增
    const gltf = await new GLTFLoader().loadAsync(config.url); // 仅 2 参，无 signal
    if (gen !== this.generation) return; // 场景已重建/卸载，迟到结果判弃
    onLoaded(gltf); // loadModels 并行或顺序发起均安全
  }
  cancel(): void {
    this.generation++;
  } // 仅重建/卸载路径 bump（D5 语义）
}
```

加载失败：`console.error` + `events.onError` 可选派发（`{ code: 'model-load-failed', message }`），不中断其余模型。

## 7. 加载/空态与 meta 契约

- `loading` / `empty` region：`props.regions.loading?.render()`；模型全部就绪前若声明了 loading region 则渲染之（默认占位 `data-testid="three-canvas-loading"`）。
- `meta.visible === false` 时不挂容器、不创建 WebGL 上下文；`visible` 作为 `useSceneManager` 的参数参与引擎生命周期：true→false 走完整 `dispose()`，false→true 重新 init（ref 赋值不触发 effect，故 visible 必须显式入参）。
- 诊断埋点：`data-three-scene-state`（`empty | loading | ready | error`）供 e2e 断言。

## 8. 与 v4 差异清单

| #   | v4                                                             | v5                                                                                                                                                           | 依据                       |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| 1   | R3F `Canvas`/`useFrame`/`useThree`                             | 裸 three + 自管 rAF                                                                                                                                          | D1                         |
| 2   | `useCallback` 桥接事件进 Canvas                                | `useThreeEvents` + `helpers.dispatch` + 射线拾取                                                                                                             | D3、scada 先例             |
| 3   | `loadAsync` 4 参 signal                                        | 2 参 + generation-guard                                                                                                                                      | D5、`Loader.js:91`         |
| 4   | `evaluateWithState(compiledExpression)`                        | `compileValue`/`evaluateValue`                                                                                                                               | D4、design-data-binding.md |
| 5   | `sceneManager.getLights()` 渲染期反射 `<primitive>`            | 灯光/模型全部命令式 add，React 不渲染 three 对象                                                                                                             | D1                         |
| 6   | `environment.skybox`、`postProcessing`（PostProcessingConfig） | **v5 砍除**：首版无消费场景，效果栈（EffectComposer）引入面大；需要时经 backlog 新立工作项                                                                   | 记录惯例（本表）           |
| 7   | `render-optimizer`（脏标记）、`memory-manager`（WeakRef 跟踪） | **被吸收**：前者由「精确订阅 + 合帧 flush（每帧至多一次写入）+ 常渲染循环」覆盖，后者由 `dispose()` 链覆盖（three 资源无 GC 回调可用，WeakRef 统计无行动点） | design-data-binding.md §7  |
