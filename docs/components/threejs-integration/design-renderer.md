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
  /**
   * 声明式工业数据源（design-protocol.md §4）：条目与 IndustrialAdapter.connect(cfg) 一一对应，
   * 静态配置面（url/tags 不走 ${} 求值）；渲染器经 useDataSources 接线 env.openSocket。
   */
  dataSources?: IndustrialTagConfig[];
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

export interface PrimitiveGeometryConfig {
  type: 'box' | 'sphere' | 'cylinder' | 'plane' | 'cone' | 'torus';
  args?: Record<string, number>; // 按 type 约定（box width/height/depth；sphere radius/... ）
}

export type PrimitiveMaterialType = 'standard' | 'basic' | 'lambert' | 'phong';

export interface PrimitiveMaterialConfig {
  type?: PrimitiveMaterialType;
  color?: string;
  opacity?: number;
  transparent?: boolean;
  wireframe?: boolean;
  flatShading?: boolean;
}

export interface PrimitiveModelConfig {
  geometry: PrimitiveGeometryConfig;
  material?: PrimitiveMaterialConfig; // 缺省 MeshStandardMaterial
}

export interface ModelConfig {
  id: string; // 唯一，绑定引用键
  url?: string; // GLTF/GLB（与 primitive 互斥：url XOR primitive，双源 primitive 优先；I2.2 实现回写）
  primitive?: PrimitiveModelConfig; // 声明式图元：同步注册、即时就绪（I2.2 实现回写）
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

export interface ModelShadowFlags {
  /** plan 473 (V3-F2)：模型级阴影标记，应用到全部子 mesh。 */
  castShadow?: boolean;
  receiveShadow?: boolean;
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
//             plan 473: pointermove（rAF 节流）驱动连续 hover 进入/离开；pointerdown 强制 enter（触屏无 move）；hover 高亮 = MeshStandardMaterial emissive 临时提亮（按材质记录原始值，离开/卸载还原；MeshBasicMaterial 无 emissive 跳过）；非 interactive 模型不参与（勘误 2026-10-06：plan 533 D1 起 MeshBasicMaterial 白提亮通道默认启用——反馈与材质类型解耦，见下方 §视口质感契约）
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

- `loading` / `empty` region：`props.regions.loading?.render()`；模型全部就绪前若声明了 loading region 则渲染之。**宿主 region 缺省时渲染内建 UI（plan 473 V3-F4）**：loading = spinner + 进度文本（GLTF 场景经 `loadModels(onError, onProgress)` 透传 three `ProgressEvent`，rAF 合流后显示百分比；图元/无 total 为不确定态；`onProgress` 经 ModelLoader generation guard——cancel 后迟到进度丢弃）、error = `data-slot="three-canvas-error"`（文案 + Retry 按钮触发 `reloadKey` 重建引擎）、empty = `data-slot="three-canvas-empty"`。宿主 region 永远优先于内建 UI。
- **容器高度（plan 473 V3-F4）**：schema `height`（CSS 值，默认 `'400px'` 向后兼容）；demo 场景以 `min(62vh, 560px)` 撑满可用区。
- **观测句柄（plan 473 V3-F4）**：schema `testid` 非空时引擎实例挂 `window.__flux_three_handles[testid]`（`getScene()`/`getRenderer()`），卸载时清理；testid 非空即注册（生产构建同样存在），仅供 e2e/调试程序化断言，勿放敏感数据。
- `meta.visible === false` 时不挂容器、不创建 WebGL 上下文；`visible` 作为 `useSceneManager` 的参数参与引擎生命周期：true→false 走完整 `dispose()`，false→true 重新 init（ref 赋值不触发 effect，故 visible 必须显式入参）。
- 诊断埋点：`data-three-scene-state`（`empty | loading | ready | error`）供 e2e 断言。
- **ready 闩语义（plan 469 Fix）**：`emitReady` 为一次性闩（`readyEmitted` 置位），晚于发射的 `onReady` 订阅立即重放。纯图元场景 `loadModels` 在挂载 effect 内**同步**完成注册并 emitReady，而 React 壳的 onReady 订阅 effect 晚一个 render——不重放则 ready 事件被确定性错过，场景已渲染但状态永久停留 loading。

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

## 视口质感契约（plan 533 D1，2026-10-06 落地）

- **常量单一事实源**：`engine/three-defaults.ts`——`DEFAULT_ASPECT`（800/600 回退）、`FALLBACK_WIDTH/HEIGHT`（800/400）、`DEFAULT_LIGHT_COLOR`（#ffffff）、`DEFAULT_GROUND_COLOR`（#404040）、`DEFAULT_COMPONENT_HEIGHT`（400px）、`DEFAULT_HOVER_EMISSIVE`（0x2b4c7e）/`DEFAULT_HOVER_INTENSITY`（0.9）、`HOVER_BASIC_LIFT`（0.25）、`MAX_PIXEL_RATIO`（2）。
- **HiDPI**：init 时 `setPixelRatio(min(devicePixelRatio, MAX_PIXEL_RATIO))`（真实 renderer 恒有该方法；headless stub 缺失静默跳过）。初始 aspect 用容器真实尺寸（零尺寸回退 `DEFAULT_ASPECT`；init 末尾 resizeToContainer 以容器覆盖）。
- **hover 双通道**（`SceneManagerOptions.hoverHighlight?: { emissive?, intensity? }` 可配，缺省 = 内置常量）：Standard 系 emissive 提升通道 + MeshBasicMaterial 白提亮通道（color 向白 lerp 0.25，tracked/restore）——**白提亮默认启用**，反馈与材质类型解耦（roadmap「默认与材质解耦」子句交付形态；emissive 默认色值保留现值可配，色值属美学而非耦合）。
- **指针反馈**：hoverable 图元悬停 → 容器 `cursor: pointer`；OrbitControls 拖拽期间 hover 不清除（cursor 恒 pointer，拖拽结束恢复——外观 nit）。
- **canvas a11y 契约**：domElement = `role="application"` + `tabindex=0`（engine init 侧）+ `aria-label`（组件侧经 `getRenderer().domElement` 后置设置，i18n `flux.three.canvasLabel`）；容器 div 无 role，仅 `aria-busy`（loading 态）。
- **错误差异化**：`webgl-unavailable` 独立图标（MonitorX）+ `flux.three.errorWebgl` 文案 + **无重试入口**（不可重试）；其余错误维持通用文案 + 重试（retry 同步清理 errorCode）。
- **加载骨架**：默认 loading slot = Spinner + pulse 骨架条（进度确定时宽度同步）+ 文案；`aria-busy` 双置（容器 + loading slot）。
- **降级族**：headless stub 缺 `style`/`setPixelRatio`/`setAttribute` 时静默跳过（真实 DOM 恒有）。

## 句柄暴露与覆盖方式裁定（plan 534 D2，2026-10-06 落地）

### D-534-1 `__flux_three_handles` 生产暴露裁定

**裁定 = 保留现状**。证据与边界：

- 挂载条件：仅当渲染器 `meta.testid`（→ `debugHandleKey`）存在时挂载 `window.__flux_three_handles[key]`（`use-scene-manager.ts:54-58`），内容为 `getScene()/getRenderer()` **只读**面（无写通道）。
- 消费方：`three-canvas-visual.spec.ts` L4 观测层（程序化断言，2026-08-28 政策）与 e2e/自动化诊断。
- 风险与边界：生产构建同样存在（非 dev-only）——但暴露面为只读场景树/渲染器引用，不含用户数据；有 testid 的生产组态本就是诊断意图。**不做**环境 gating（为 e2e 简单性牺牲的复杂度不值得）。
- 措辞调和：spec 头注「dev-only」与 hook 注「生产构建同样存在」——统一口径为「**testid-gated 只读诊断面**（dev/prod 一致）」。

### D-534-2 深色模式/视觉回归覆盖方式裁定

**裁定 = 维持程序化断言，不引入截图基线**（2026-08-28 政策对齐）：

- 现状即合规：`three-canvas-visual.spec.ts` 为 L1 DOM（lifecycle UI）/ L2 geometry（height prop）/ L4 handles（场景树/shadowMap）三层程序化断言，无 `toHaveScreenshot` 判据。
- 深色模式覆盖：demo 页/测试当前未覆盖 `data-mode` 翻转——补强方式 = 程序化断言（`data-mode='dark'` 翻转后 `scene.background`/DOM 令牌的 computed 断言），**不引入**截图对比；是否为 demo 页加 dark 开关 = 独立 UX 打磨项（非本 plan）。
- 3D 渲染为 WebGL 画布——截图对比天然受 GL 实现差异影响，程序化断言是该域的正确形态（与 Spline 锚点的「质感」靠 D1 契约保障，非回归截图）。

## scene 双形态与契约扩充（plan 559 Phase 2，2026-10-10 落地）

薄桥接取向（用户 2026-10-10 指示）：three 原生能力直接进，flux 只做数据驱动注入。

### scene 双形态

- `{ models: [...] }`：既有自定义声明式图元（兼容保留），`models` 由必填改为 optional。
- `{ json: <SceneJSON> }`：three.js 原生 SceneJSON（`Object3D.toJSON()` / three 编辑器导出）经 `THREE.ObjectLoader().parse` 同步装配（`scene-manager.ts loadSceneJson`）。**json 存在时优先**，`loadModels` 直接 emitReady（同步装配、无 loader 往返）。
- 绑定寻址：装配后 traverse 注册带 `name` 的对象进 models Map（`config = { id: name, interactive }`），bindings/events/pending 回放/tween/clip 全管线与 models 形态共用。首名注册；重名诊断 `scene-json-duplicate-name`（first-wins）。解析失败诊断 `scene-json-invalid`，画布空置不崩溃。
- 交互门控：json 形态对象缺省 `interactive: false`（与既有拾取门控一致），`scene.interactiveObjects: [name…]` 点名开启。
- 空态判别：`three-canvas.tsx` 以 `json != null` 判非空（否则按 models 数组）；`data-three-scene-state` 语义不变。
- SceneJSON 自带相机/动画不单独消费：视图相机恒由 `camera` 配置驱动；时间线动画走 GLTF clip 或 flux clip。

### 契约扩充（全部缺省保持既有视觉）

| 字段                                                 | 形态                   | 说明                                                                                                                                        |
| ---------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------- |
| `camera.controls`                                    | 通用                   | OrbitControls 可配面：`autoRotate/autoRotateSpeed/minDistance/maxDistance/maxPolarAngle/enablePan`；缺省字段不触碰（damping 恒开）          |
| `environment.toneMapping`                            | 通用                   | `'none'（缺省，NoToneMapping）                                                                                                              | 'aces' | 'reinhard'` |
| `PrimitiveMaterialConfig.metalness/roughness`        | standard               | PBR 通道；按材质能力守卫（basic 等无该字段时忽略）                                                                                          |
| `PrimitiveMaterialConfig.emissive/emissiveIntensity` | standard/lambert/phong | 自发光（告警变色通道）                                                                                                                      |
| `PrimitiveGeometryType` `tube`                       | primitive              | `path: [[x,y,z]…]` CatmullRom 样条 + `args.radius/tubularSegments/radialSegments/closed`（管道布线）                                        |
| `PrimitiveGeometryType` `capsule`                    | primitive              | `args.radius/length/capSegments/radialSegments`                                                                                             |
| `ModelConfig.label` / `labelOffset`                  | 通用                   | CanvasTexture Sprite 标注（`engine/label-sprite.ts`）；缺省锚定包围盒上方，Sprite 材质/贴图随 dispose 链回收（Sprite 共享几何体不 dispose） |

### 自研动画体系删除（559 后记，2026-10-10 用户裁定）

原 559 Phase 2 的「能力冻结」裁定升级为**整体删除**（用户明确指示：薄桥接不做二次发明，不用的部分删除）：

- **已删除**：`engine/tween-registry.ts`（tween/spring/step 绑定过渡）、`binding/keyframes.ts`（time/state/event 关键帧 clip）、`renderer/hooks/use-animation-clips.ts`、`schemas.ts` 的 `AnimationConfig`/`AnimationKeyframe`/`BindingAnimationConfig`/`TransformConfig.animation`/`ThreeCanvasSchema.animations`、SceneManager 的 `registerClips`/`startClip`/`notifyEvent`/tween 帧推进、AI 校验 schema 对应节。
- **替代路径**：时间线/插值动画走 three 原生体系——GLTF clip（`ModelConfig.initialAnimation` 自动播放）、SceneJSON 自带动画资产；「数据/事件触发的场景反应」用纯数据映射绑定（range/convert/condition，即时写）表达。
- **保留**：`TransformEngine` 的 range/convert/condition（纯数据映射，桥接胶水）、`DataBinding.condition`、事件桥接（onObjectClick/Hover/Ready/Error）。

### 演示面（plan 559 Phase 4）

playground `#/three-gallery` 六示例画廊：图元材质 / 灯光阴影 / 原生 SceneJSON /
GLTFExporter 导出-加载全链路 / 关键帧交互 / 数字孪生泵站（IndustrialAdapter 标签帧 →
flux 绑定端到端）；`#/three-industrial-demo` 保持数据源独立演示。
