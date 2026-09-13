import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModelLoader, type LoadedModel, type LoaderFactory } from './model-loader.js';
import type { LightConfig, ModelConfig, ThreeSceneConfig } from '../schemas.js';

export interface FrameUpdate {
  modelId: string;
  path: string;
  value: unknown;
}

export interface FrameUpdateQueue {
  drain(): FrameUpdate[];
}

export interface PickEvent {
  modelId: string;
  point: THREE.Vector3;
}

export interface HoverEvent {
  modelId: string;
  hovered: boolean;
}

export interface DiagnosticEvent {
  code: string;
  message: string;
  error?: unknown;
}

export type RendererFactory = () => THREE.WebGLRenderer;
export type ControlsFactory = (camera: THREE.Camera, domElement: HTMLElement) => Pick<OrbitControls, 'update' | 'dispose'>;
export type ScheduleFrame = (cb: () => void) => () => void;

export interface SceneManagerOptions {
  rendererFactory?: RendererFactory;
  controlsFactory?: ControlsFactory;
  loaderFactory?: LoaderFactory;
  scheduleFrame?: ScheduleFrame;
}

interface ManagedModel {
  config: ModelConfig;
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  actions: THREE.AnimationAction[];
}

/* v8 ignore next */
const DEFAULT_SCHEDULE_FRAME: ScheduleFrame = (cb) => {
  const handle = requestAnimationFrame(cb);
  return () => cancelAnimationFrame(handle);
};

/**
 * three 引擎核心（design-renderer.md §5，D1：裸 three 命令式引擎 + React 壳）。
 *
 * hook ↔ engine 接线：`setFrameUpdateQueue` 注册 hook 侧 pendingUpdates 队列（rAF 帧边界
 * drain 批量应用）；`updateProperty` 对未注册模型进 pending buffer（键 `modelId::path`，
 * 同键后写覆盖、按插入序回放）——绑定初值不因 GLTF 异步加载丢失；`model-load-failed`/模型
 * 移除时丢弃该 modelId 的 buffer 并经 onError 去重通道上报。
 */
export class SceneManager {
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private controls: Pick<OrbitControls, 'update' | 'dispose'> | null = null;
  private models = new Map<string, ManagedModel>();
  private pendingByModel = new Map<string, Map<string, { path: string; value: unknown; order: number }>>();
  private pendingOrder = 0;
  private queue: FrameUpdateQueue | null = null;
  private pickListeners = new Set<(e: PickEvent) => void>();
  private loadSettlers: Array<() => void> = [];
  private hoverListeners = new Set<(e: HoverEvent) => void>();
  private readyListeners = new Set<() => void>();
  private downPoint: { x: number; y: number } | null = null;
  private lastHovered: string | null = null;
  private raycaster = new THREE.Raycaster();
  private frameHandle: (() => void) | null = null;
  private disposed = false;
  private loader: ModelLoader;
  private lastFrameTime = 0;
  container: HTMLElement | null;
  private readonly rendererFactory: RendererFactory;
  private readonly controlsFactory: ControlsFactory;
  private readonly scheduleFrame: ScheduleFrame;

  constructor(
    private config: ThreeSceneConfig,
    options: SceneManagerOptions = {},
  ) {
    // 默认工厂构造真实 WebGL/OrbitControls——headless 测试环境不可达（真实 GL 上下文），
    // 覆盖率豁免（plan 465 Phase 5 政策：显式列名，不降阈值）。
    /* v8 ignore next */
    this.rendererFactory = options.rendererFactory ?? (() => new THREE.WebGLRenderer({ antialias: true, alpha: true }));
    /* v8 ignore next */
    this.controlsFactory =
      options.controlsFactory ??
      ((camera, domElement) => {
        const controls = new OrbitControls(camera, domElement);
        controls.enableDamping = true;
        return controls;
      });
    this.loader = new ModelLoader(options.loaderFactory);
    this.scheduleFrame = options.scheduleFrame ?? DEFAULT_SCHEDULE_FRAME;
    this.container = null;
  }

  /** 挂载容器（组件壳在 DOM 就绪后调用；渲染器 domElement append 到此容器）。 */
  attach(container: HTMLElement): void {
    this.container = container;
  }

  init(onError?: (e: DiagnosticEvent) => void): void {
    if (this.disposed) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = this.rendererFactory();
    } catch (error) {
      onError?.({ code: 'webgl-unavailable', message: 'WebGL renderer creation failed', error });
      return;
    }
    this.renderer = renderer;
    if (this.container && renderer.domElement && typeof this.container.appendChild === 'function') {
      this.container.appendChild(renderer.domElement as unknown as HTMLElement);
    }
    const aspect = 800 / 600;
    const camera = new THREE.PerspectiveCamera(this.config.camera.fov ?? 75, aspect, this.config.camera.near ?? 0.1, this.config.camera.far ?? 1000);
    camera.position.set(...this.config.camera.position);
    camera.updateMatrixWorld();
    this.camera = camera;
    const scene = new THREE.Scene();
    this.scene = scene;
    this.assembleEnvironment(scene);
    for (const light of this.config.lights) {
      scene.add(this.createLight(light));
    }
    this.controls = this.controlsFactory(camera, renderer.domElement as unknown as HTMLElement);
    this.bindPointerHandlers(renderer.domElement as unknown as HTMLElement);
    this.resizeToContainer();
    this.lastFrameTime = typeof performance !== 'undefined' ? performance.now() : Date.now();
    this.scheduleTick();
  }

  private assembleEnvironment(scene: THREE.Scene): void {
    const { environment } = this.config;
    if (!environment) return;
    if (environment.background) scene.background = new THREE.Color(environment.background);
    if (environment.fog) scene.fog = new THREE.Fog(environment.fog.color, environment.fog.near, environment.fog.far);
  }

  private createLight(config: LightConfig): THREE.Light {
    const color = config.color ?? '#ffffff';
    const intensity = config.intensity ?? 1;
    switch (config.type) {
      case 'ambient':
        return new THREE.AmbientLight(color, intensity);
      case 'directional': {
        const light = new THREE.DirectionalLight(color, intensity);
        if (config.position) light.position.set(...config.position);
        if (config.target) light.target.position.set(...config.target);
        if (config.castShadow) light.castShadow = true;
        return light;
      }
      case 'point': {
        const light = new THREE.PointLight(color, intensity);
        if (config.position) light.position.set(...config.position);
        return light;
      }
      case 'spot': {
        const light = new THREE.SpotLight(color, intensity);
        if (config.position) light.position.set(...config.position);
        return light;
      }
      case 'hemisphere':
        return new THREE.HemisphereLight(color, config.groundColor ?? '#404040', intensity);
      default:
        return new THREE.AmbientLight(color, intensity);
    }
  }

  loadModels(onError?: (e: DiagnosticEvent) => void): Promise<void> {
    if (this.disposed) return Promise.resolve();
    const pending = [...this.config.models];
    if (pending.length === 0) {
      this.emitReady();
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      this.loadSettlers.push(resolve);
      let settled = 0;
      const settle = () => {
        settled++;
        if (settled === pending.length) {
          this.emitReady();
          resolve();
        }
      };
      for (const modelConfig of pending) {
        void this.loader.load(
          modelConfig,
          (gltf) => {
            if (this.disposed) return resolve();
            this.registerModel(modelConfig, gltf);
            settle();
          },
          (error) => {
            if (this.disposed) return resolve();
            this.dropPendingForModel(modelConfig.id);
            onError?.({ code: 'model-load-failed', message: `Failed to load model ${modelConfig.url}`, error });
            settle();
          },
        );
      }
    });
  }

  private registerModel(config: ModelConfig, gltf: LoadedModel): void {
    if (!this.scene) return;
    const root = gltf.scene;
    root.name = config.id;
    if (config.position) root.position.set(...config.position);
    if (config.rotation) root.rotation.set(...config.rotation);
    if (config.scale) root.scale.set(...config.scale);
    this.scene.add(root);
    let mixer: THREE.AnimationMixer | null = null;
    const actions: THREE.AnimationAction[] = [];
    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(root);
      const clip = config.initialAnimation
        ? gltf.animations.find((a) => a.name === config.initialAnimation) ?? gltf.animations[0]
        : null;
      if (clip) actions.push(mixer.clipAction(clip));
      for (const action of actions) action.play();
    }
    this.models.set(config.id, { config, root, mixer, actions });
    this.replayPendingForModel(config.id, root);
  }

  private replayPendingForModel(modelId: string, root: THREE.Group): void {
    const buffer = this.pendingByModel.get(modelId);
    if (!buffer) return;
    this.pendingByModel.delete(modelId);
    const entries = [...buffer.entries()].sort((a, b) => a[1].order - b[1].order);
    for (const [, entry] of entries) {
      this.applyUpdate(root, entry.path, entry.value);
    }
  }

  private dropPendingForModel(modelId: string): void {
    this.pendingByModel.delete(modelId);
  }

  setFrameUpdateQueue(queue: FrameUpdateQueue): void {
    this.queue = queue;
  }

  onPick(listener: (e: PickEvent) => void): () => void {
    this.pickListeners.add(listener);
    return () => this.pickListeners.delete(listener);
  }

  onHover(listener: (e: HoverEvent) => void): () => void {
    this.hoverListeners.add(listener);
    return () => this.hoverListeners.delete(listener);
  }

  onReady(listener: () => void): () => void {
    this.readyListeners.add(listener);
    return () => this.readyListeners.delete(listener);
  }

  private emitReady(): void {
    for (const listener of [...this.readyListeners]) listener();
  }

  /**
   * 绑定引擎写入入口（design-renderer.md §5）：点分路径导航 + `.set()` 类型分派；
   * 模型未就绪进 pending buffer（`modelId::path` 键），注册时按插入序回放。
   */
  updateProperty(modelId: string, path: string, value: unknown): void {
    if (this.disposed) return;
    const model = this.models.get(modelId);
    if (!model) {
      const buffer = this.pendingByModel.get(modelId) ?? new Map<string, { path: string; value: unknown; order: number }>();
      buffer.set(`${modelId}::${path}`, { path, value, order: this.pendingOrder++ });
      this.pendingByModel.set(modelId, buffer);
      return;
    }
    this.applyUpdate(model.root, path, value);
  }

  private applyUpdate(root: THREE.Object3D, path: string, value: unknown): void {
    const parts = path.split('.');
    let target: unknown = root;
    for (let i = 0; i < parts.length - 1; i++) {
      if (target === null || typeof target !== 'object') return;
      target = (target as Record<string, unknown>)[parts[i]];
    }
    if (target === null || typeof target !== 'object') return;
    const container = target as Record<string, unknown>;
    const leaf = parts[parts.length - 1];
    const current = container[leaf];
    if (current && typeof current === 'object' && typeof (current as { set?: unknown }).set === 'function') {
      const setter = (current as { set: (...args: unknown[]) => unknown }).set;
      if (Array.isArray(value)) setter.call(current, ...value);
      else setter.call(current, value);
      return;
    }
    container[leaf] = value;
  }

  getScene(): THREE.Scene {
    if (!this.scene) throw new Error('SceneManager not initialized');
    return this.scene;
  }

  getModel(id: string): { config: ModelConfig; root: THREE.Group } | undefined {
    const model = this.models.get(id);
    return model ? { config: model.config, root: model.root } : undefined;
  }

  private scheduleTick(): void {
    if (this.disposed || this.frameHandle) return;
    this.frameHandle = this.scheduleFrame(() => {
      this.frameHandle = null;
      this.frame();
    });
  }

  /** 单帧：controls → drain 队列 → mixers → render（design-data-binding.md §4 帧边界批量应用）。 */
  private frame(): void {
    if (this.disposed || !this.renderer || !this.scene || !this.camera) return;
    this.controls?.update();
    if (this.queue) {
      for (const update of this.queue.drain()) {
        this.updateProperty(update.modelId, update.path, update.value);
      }
    }
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const delta = Math.max(0, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;
    for (const model of this.models.values()) {
      model.mixer?.update(delta);
    }
    this.renderer.render(this.scene, this.camera);
    this.scheduleTick();
  }

  private bindPointerHandlers(domElement: HTMLElement): void {
    const listeners = domElement as unknown as {
      addEventListener?: (type: string, cb: (e: unknown) => void) => void;
      removeEventListener?: (type: string, cb: (e: unknown) => void) => void;
    };
    if (typeof listeners.addEventListener !== 'function') return;
    const pointerHandler = (type: 'down' | 'up') => (rawEvent: unknown) => {
      const event = rawEvent as { clientX: number; clientY: number };
      const rect = (domElement as unknown as { getBoundingClientRect?: () => DOMRect }).getBoundingClientRect?.();
      const width = rect?.width ?? 1;
      const height = rect?.height ?? 1;
      const left = rect?.left ?? 0;
      const top = rect?.top ?? 0;
      const ndcX = ((event.clientX - left) / width) * 2 - 1;
      const ndcY = -((event.clientY - top) / height) * 2 + 1;
      if (type === 'down') {
        this.downPoint = { x: ndcX, y: ndcY };
        this.emitHoverAt(ndcX, ndcY, true);
        return;
      }
      const start = this.downPoint;
      this.downPoint = null;
      this.emitHoverAt(ndcX, ndcY, false);
      if (!start) return;
      const dx = ndcX - start.x;
      const dy = ndcY - start.y;
      if (dx * dx + dy * dy > 0.000625) return; // 拖拽（>2.5% 视口位移）不算点击
      this.emitPickAt(ndcX, ndcY);
    };
    const downHandler = pointerHandler('down');
    const upHandler = pointerHandler('up');
    listeners.addEventListener('pointerdown', downHandler);
    listeners.addEventListener('pointerup', upHandler);
    this.pointerCleanup = () => {
      listeners.removeEventListener?.('pointerdown', downHandler);
      listeners.removeEventListener?.('pointerup', upHandler);
    };
  }

  private pointerCleanup: (() => void) | null = null;

  private pickAt(ndcX: number, ndcY: number): { modelId: string; point: THREE.Vector3 } | undefined {
    if (!this.camera) return undefined;
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
    for (const [modelId, model] of this.models) {
      if (!model.config.interactive) continue;
      const hits = this.raycaster.intersectObject(model.root, true);
      if (hits.length > 0) return { modelId, point: hits[0].point };
    }
    return undefined;
  }

  private emitPickAt(ndcX: number, ndcY: number): void {
    const hit = this.pickAt(ndcX, ndcY);
    if (!hit) return;
    for (const listener of [...this.pickListeners]) listener(hit);
  }

  private emitHoverAt(ndcX: number, ndcY: number, entered: boolean): void {
    const hit = this.pickAt(ndcX, ndcY);
    const modelId = hit?.modelId ?? null;
    if (modelId === this.lastHovered) return;
    if (this.lastHovered) {
      for (const listener of [...this.hoverListeners]) listener({ modelId: this.lastHovered, hovered: false });
    }
    this.lastHovered = modelId;
    if (modelId && entered) {
      for (const listener of [...this.hoverListeners]) listener({ modelId, hovered: true });
    }
  }

  private resizeToContainer(): void {
    if (!this.renderer || !this.camera || !this.container) return;
    const width = this.container.clientWidth || 800;
    const height = this.container.clientHeight || 400;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  resize(): void {
    this.resizeToContainer();
  }

  /** 全链 dispose（design-renderer.md §5）：rAF → 在途加载 → 资源 → controls → renderer。 */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.frameHandle?.();
    this.frameHandle = null;
    this.loader.cancel();
    // 在途 loadModels 承诺落定（dispose 竞态下悬挂即泄漏）
    const settlers = this.loadSettlers.splice(0);
    for (const settle of settlers) settle();
    this.pointerCleanup?.();
    this.pointerCleanup = null;
    for (const model of this.models.values()) {
      model.actions.forEach((action) => action.stop());
      model.mixer?.uncacheRoot(model.mixer.getRoot());
      model.root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      });
    }
    this.models.clear();
    this.pendingByModel.clear();
    this.pickListeners.clear();
    this.hoverListeners.clear();
    this.readyListeners.clear();
    this.controls?.dispose();
    this.controls = null;
    this.renderer?.dispose();
    const domElement = this.renderer?.domElement as unknown as { parentNode?: { removeChild: (c: unknown) => void } } | undefined;
    if (domElement?.parentNode) {
      domElement.parentNode.removeChild(domElement);
    }
    this.renderer = null;
    this.scene = null;
    this.camera = null;
  }
}
