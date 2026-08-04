import { App, type IAppConfig } from 'leafer-ui';
import '@leafer-in/viewport';
import { ConfigAdapter } from './config-adapter.js';
import {
  mountScadaTestHandle,
  removeScadaTestHandle,
  type ScadaTestHandle,
} from './test-handle.js';
import { measureAddStrategies } from './batch-add-probe.js';
import { TreeRegistry, type RegistryLeaf } from './tree-registry.js';
import {
  center,
  clampScale,
  clampViewport,
  fit,
  setViewport as setViewportState,
  viewportToWorld,
  worldToViewport,
  zoomAt as zoomAtState,
  type Bounds,
  type Point,
  type Size,
  type ViewportState,
} from './viewport.js';
import { toNodePatch } from '../symbols/symbol-factory.js';
import { deepMergeInstanceProps } from '../symbols/compound.js';
import type { ScadaSymbolProps } from '../symbols/symbol-types.js';
import type { PointStore } from '../binding/point-store.js';
import type { ScadaAnimation, ScadaStateDeclaration } from '../serialization/config-types.js';
import {
  EventBridge,
  type ScadaSymbolEventName,
  type ScadaSymbolEventPayload,
} from './event-bridge.js';
import { HitResolver } from './hit.js';
import { validateScadaConfig } from '../serialization/validate.js';
import { parseScadaConfig } from '../serialization/parse.js';
import { InteractionOverlay } from './interaction-overlay.js';
import type {
  ScadaConfig,
  ScadaConfigDiff,
  ScadaSymbolNode,
} from '../serialization/config-types.js';

export interface ScadaEnginePerformanceOptions {
  usePartRender?: boolean;
  ceilPartPixel?: boolean;
  usePartLayout?: boolean;
  lazySpeard?: number;
  changedThreshold?: number;
}

export interface ScadaEngineOptions {
  container: HTMLElement;
  width?: number;
  height?: number;
  pixelRatio?: number;
  performance?: ScadaEnginePerformanceOptions;
  background?: { color?: string; grid?: { size: number; color: string } };
  interactionLayer?: boolean; // reserved：sky 交互覆盖物接线归 I8.2/I11.2（gate-3-review m-7）
  exposeTestHandle?: boolean;
  cid?: number;
  onRender?: (info: { frame: number; dirtyBlocks: number }) => void;
  pointStore?: PointStore;
  /** 图元事件回调（symbol:click/dblclick/hover，design-engine.md §8.1）。 */
  onSymbolEvent?: (name: ScadaSymbolEventName, payload: ScadaSymbolEventPayload) => void;
  /** 命中的绑定点值快照投影（只读；renderer 桥接层装配，经 point-store 投影）。 */
  getPointValuesFor?: (symbolId: string) => Record<string, unknown> | undefined;
}

export interface ScadaRenderFrameInfo {
  frame: number;
  dirtyBlocks: number;
}

export class ScadaCanvasEngine {
  readonly app: App;
  readonly registry = new TreeRegistry();
  /** 图片缓存（I8.1，INV-1）：桥接层 env.fetcher 加载结果经 `cacheImage` 注入（I10.1），`resolveImageUrl` 供图元 create 归位；缺省直通 leafer 原生加载。 */
  readonly imageCache = new Map<string, string>();
  private readonly cid: number;
  private adapter: ConfigAdapter;
  private viewport: ViewportState = { x: 0, y: 0, scale: 1 };
  private size: Size;
  private frameCount = 0;
  private destroyed = false;
  private eventBridge: EventBridge | undefined;
  private interaction: InteractionOverlay | undefined;
  private static nextCid = 1;

  private constructor(private readonly options: ScadaEngineOptions) {
    this.cid = options.cid ?? ScadaCanvasEngine.nextCid++;
    const width = options.width ?? options.container.clientWidth ?? 0;
    const height = options.height ?? options.container.clientHeight ?? 0;
    this.size = { width, height };
    const performanceDefaults = {
      usePartRender: true,
      ceilPartPixel: true,
      usePartLayout: true,
      lazySpeard: 100,
      changedThreshold: 100,
    };
    const appConfig: IAppConfig = {
      view: options.container,
      width: options.width,
      height: options.height,
      pixelRatio: options.pixelRatio,
      // leafer App 三层模型（design-engine.md §6）：仅当 config 含对应 key 时才创建该层
      // （web.module.js App.init: `if (ground) ... if (tree || editor) ... if (sky || editor)`）——
      // ground 背景层 + tree 图元层 + sky 交互覆盖层全部显式创建，防 mock 掩蔽真实层缺失
      // （gate-3 类 mock↔真实漂移：InteractionOverlay 构造读 app.sky，sky 缺失即 hover 崩溃）。
      // `move: { drag: 'auto', dragEmpty: true }`：I14.1 拖动 fps 测量口径对齐（spike 工程同配置）——
      // viewport 插件默认不开启指针拖动平移（仅 wheel/pinch），验收包络含「10 万图元拖动」，
      // drag:'auto' 在图元非 draggable 时让位给画布平移、dragEmpty 覆盖空白区拖动。
      ground: {},
      tree: { type: 'viewport', move: { drag: 'auto' as const, dragEmpty: true } },
      sky: {},
      ...performanceDefaults,
      ...options.performance,
    };
    this.app = new App(appConfig);
    this.adapter = new ConfigAdapter(this, this.registry);
    this.app.tree.on('render', this.handleRender);
    if (options.background?.color) {
      this.app.ground.fill = options.background.color;
    }
    if (options.exposeTestHandle) {
      this.installTestHandle();
    }
    this.installEventBridge();
    this.installPluginInteractionSync();
  }

  static create(options: ScadaEngineOptions): ScadaCanvasEngine {
    return new ScadaCanvasEngine(options);
  }

  get tree() {
    return this.app.tree;
  }

  get ground() {
    return this.app.ground;
  }

  get sky() {
    return this.app.sky;
  }

  /** 交互覆盖层（I8.2，sky 层 hover/selected 等反馈）：`interactionLayer` 选项开启时惰性可用。 */
  get interactionOverlay(): InteractionOverlay | undefined {
    if (!this.options.interactionLayer) return undefined;
    this.interaction ??= new InteractionOverlay(this);
    return this.interaction;
  }

  private handleRender = (): void => {
    this.frameCount++;
    // dirtyBlocks 预留字段恒 0：leafer render 事件未暴露脏块计数，I14 固化口径（gate-3-review m-1）
    this.options.onRender?.({ frame: this.frameCount, dirtyBlocks: 0 });
  };

  /** 销毁状态（I10.2 句柄 not-mounted 判定）：destroy 幂等调用后为 true，后续句柄命令返回 not-mounted。 */
  isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.eventBridge?.destroy();
    this.eventBridge = undefined;
    this.interaction?.destroy();
    this.interaction = undefined;
    this.app.tree.off('render', this.handleRender);
    this.app.tree.off('zoom', this.handlePluginZoom);
    this.app.tree.off('move', this.handlePluginMove);
    this.adapter.destroy();
    this.registry.clear();
    this.app.destroy();
    if (this.options.exposeTestHandle) {
      removeScadaTestHandle(this.cid);
    }
  }

  reset(config: ScadaConfig): void {
    // 组态 JSON `background.color` 接线（open-audit P1-A）：reset 期应用 ground 层填充，
    // 与构造期 `ScadaEngineOptions.background` 同口径（config 经 props 到达，mount 期不可用）。
    // `background.grid` 为 watch-only（validate 接受但无 runtime 消费面，design-renderer.md §4.2）。
    if (config.background?.color) {
      this.app.ground.fill = config.background.color;
    }
    this.adapter.build(config);
  }

  applyAttrs(attrsBySymbolId: Record<string, Partial<ScadaSymbolProps>>): void {
    for (const [id, patch] of Object.entries(attrsBySymbolId)) {
      const leaf = this.registry.get(id);
      if (!leaf) continue;
      if (leaf.definition?.applyProps) {
        leaf.definition.applyProps(leaf.node, patch);
      } else {
        leaf.node.set(toNodePatch(leaf.node, patch));
      }
    }
  }

  getSymbol(id: string): RegistryLeaf | undefined {
    return this.registry.get(id);
  }

  /** 配置图元节点按 id 查找（含 group 子树；I8.2 视觉状态应用实例属性解析）。 */
  getConfigNode(id: string): ScadaSymbolNode | undefined {
    return this.adapter.getNode(id);
  }

  /**
   * 图元级声明查询（I9 图元装配）：states/animations 经 `defaults ∪ 实例` 深合并返回，
   * 使符号定义自带的状态/动画默认声明对 I6.3 联动层可见（实例声明覆盖 defaults）。
   * I14.2 热路径优化：无声明快路径——实例与 defaults 均无 states/animations 时直接
   * 返回 undefined（跳过 deepMerge），避免 1 万点刷新场景每帧 10k 次深合并。
   */
  getSymbolDeclarations(
    id: string,
  ): { states?: ScadaStateDeclaration; animations?: ScadaAnimation[] } | undefined {
    const leaf = this.registry.get(id);
    if (!leaf?.definition) return undefined;
    const node = this.adapter.getNode(id);
    const defaults = leaf.definition.defaults;
    const nodeHasDecls =
      node !== undefined && (node.states !== undefined || node.animations !== undefined);
    const defaultsHasDecls =
      defaults !== undefined &&
      (defaults.states !== undefined || defaults.animations !== undefined);
    if (!nodeHasDecls && !defaultsHasDecls) return undefined;
    const merged = deepMergeInstanceProps(
      defaults ?? ({} as ScadaSymbolProps),
      (node ?? {}) as unknown as ScadaSymbolProps,
    );
    return { states: merged.states, animations: merged.animations };
  }

  getSymbols(): RegistryLeaf[] {
    return this.registry.getSymbols();
  }

  getSymbolProps(id: string): ScadaSymbolProps | undefined {
    const leaf = this.registry.get(id);
    if (!leaf) return undefined;
    // 返回 leafer 节点属性面（toNodePatch 映射后键名，如 fontSize 非 textSize）——e2e 断言指南 I15.1 知悉（gate-3-review m-6）
    return leaf.node.get() as ScadaSymbolProps;
  }

  setSymbolProps(id: string, patch: Partial<ScadaSymbolProps>): void {
    this.applyAttrs({ [id]: patch });
  }

  fit(bounds: Bounds, padding = 0): ViewportState {
    const next = fit(bounds, this.size, padding);
    this.applyViewportState(next);
    return next;
  }

  center(bounds: Bounds): ViewportState {
    const next = center(this.viewport, bounds, this.size);
    this.applyViewportState(next);
    return next;
  }

  setViewport(state: ViewportState): ViewportState {
    const next = setViewportState(this.viewport, state);
    this.applyViewportState(next);
    return next;
  }

  zoomAt(worldPoint: Point, factor: number): ViewportState {
    const next = zoomAtState(this.viewport, worldPoint, factor);
    this.applyViewportState(next);
    return next;
  }

  setSize(width: number, height: number): void {
    this.size = { width, height };
    this.app.resize({ width, height });
  }

  getSize(): Size {
    return { ...this.size };
  }

  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  getWorldPoint(viewportPoint: Point): Point {
    return viewportToWorld(this.viewport, viewportPoint);
  }

  getViewportPoint(worldPoint: Point): Point {
    return worldToViewport(this.viewport, worldPoint);
  }

  applyDiff(diff: ScadaConfigDiff, nextConfig?: ScadaConfig): void {
    this.adapter.applyDiff(diff, nextConfig);
    // 交互覆盖物随图元增删/移动同步（I11.2，applyDiff 增删同步）：移除图元清其覆盖物，更新图元重定位
    if (this.interaction) {
      for (const id of diff.removed) {
        this.interaction.clear(id);
      }
      for (const update of diff.updated) {
        if (this.interaction.hasActive(update.id)) {
          this.interaction.highlight(update.id);
        }
      }
    }
  }

  resolveImageUrl = (url: string): string => {
    return this.imageCache.get(url) ?? url;
  };

  cacheImage(url: string, resolved: string): void {
    this.imageCache.set(url, resolved);
  }

  exportConfig(): ScadaConfig | undefined {
    const config = this.adapter.currentConfig;
    if (!config) return undefined;
    return structuredClone(config);
  }

  importConfig(json: string | object): void {
    const config = parseScadaConfig(json);
    const result = validateScadaConfig(config);
    if (!result.ok) {
      throw new Error(`invalid scada config: ${result.errors.join('; ')}`);
    }
    this.adapter.build(config);
  }

  forceRender(): void {
    this.app.tree.forceRender();
  }

  private applyViewportState(next: ViewportState): void {
    const cur = this.viewport;
    const clamped = clampViewport(next);
    if (clamped.scale !== cur.scale) {
      const anchor = viewportToWorld(cur, { x: 0, y: 0 });
      this.app.tree.zoomLayer.scaleOfWorld(anchor, clamped.scale / cur.scale);
    }
    if (clamped.x !== cur.x || clamped.y !== cur.y) {
      // 屏幕映射 zoomLayer.x = -viewport.x * scale：平移量须为 -(Δx)*scale（gate-3-review §5 M-3 符号推导）
      this.app.tree.zoomLayer.move({
        x: -(clamped.x - cur.x) * clamped.scale,
        y: -(clamped.y - cur.y) * clamped.scale,
      });
    }
    this.viewport = clamped;
  }

  private installTestHandle(): void {
    const handle: ScadaTestHandle = {
      engine: this,
      tree: this.app.tree,
      app: this.app,
      getSymbol: (id) => this.registry.get(id)?.node,
      getPointValue: (pointId) => this.options.pointStore?.getPointValue(pointId),
      getViewport: () => this.getViewport(),
      forceRender: () => this.forceRender(),
      // I14.1 batch.add 对照探针（gate-3-review §10 m-8）：dev/test 专用投影，非公共契约
      measureAddStrategies: (count) => measureAddStrategies(count),
    };
    mountScadaTestHandle(this.cid, handle);
  }

  /** 事件桥接线（I6.4）：onSymbolEvent 提供时挂接 tree 层 tap/double_tap/pointer.move → 命中解析 → 事件发射。 */
  private installEventBridge(): void {
    const onSymbolEvent = this.options.onSymbolEvent;
    if (!onSymbolEvent) return;
    const resolver = new HitResolver({
      getByPoint: (point, padding) => this.app.tree.selector?.getByPoint(point, padding ?? 0),
      idOf: (leaf) => this.registry.findByNode(leaf as object),
      getSize: () => this.size,
    });
    this.eventBridge = new EventBridge({
      tree: this.app.tree,
      // pointer.move 挂 App 视图面（I15.1 live defect 修复）：真实 leafer 空白区命中路径为空，
      // tree 层收不到 pointer.move → hover-miss 永不发射（实测 probe 佐证）；app 面对画布内任意位置恒发射
      moveTarget: this.app,
      resolver,
      viewportToWorld: (point) => viewportToWorld(this.viewport, point),
      getSymbolType: (symbolId) => this.registry.get(symbolId)?.definition?.type,
      getPointValues: this.options.getPointValuesFor,
      onSymbolEvent,
    });
    this.eventBridge.attach();
  }

  /**
   * 插件交互状态同步 + 缩放钳制兜底（I11.2，gate-3-review §10 归属）：
   * viewport 插件 wheel/pinch 直改 zoomLayer 矩阵（`type/viewport.ts` BEFORE_ZOOM → `zoomLayer.scaleOfWorld`），
   * 且 `getValidScale` 原样返回无 min/max 钳制（display Leafer.ts:405）→ 绕过引擎 `clampViewport`
   * （Failure Paths `viewport-interaction-drift`）。兜底：订阅 tree `zoom`/`move` 事件（ZoomEvent.ZOOM/
   * MoveEvent.MOVE）——越界缩放重钳制回 MIN_SCALE/MAX_SCALE，并把 zoomLayer 矩阵状态同步回引擎视口
   * 状态（zoomLayer.x = -viewport.x * scale，gate-3-review §5 M-3 推导）。
   */
  private installPluginInteractionSync(): void {
    this.app.tree.on('zoom', this.handlePluginZoom);
    this.app.tree.on('move', this.handlePluginMove);
  }

  private readonly handlePluginZoom = (): void => {
    const zoomLayer = this.app.tree.zoomLayer as unknown as {
      x?: number;
      y?: number;
      scaleX?: number;
    };
    const rawScale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale);
    const clamped = clampScale(rawScale);
    if (clamped !== rawScale) {
      const anchor = viewportToWorld(this.viewport, { x: 0, y: 0 });
      this.app.tree.zoomLayer.scaleOfWorld(anchor, clamped / rawScale);
    }
    this.syncViewportFromZoomLayer();
  };

  private readonly handlePluginMove = (): void => {
    this.syncViewportFromZoomLayer();
  };

  private syncViewportFromZoomLayer(): void {
    const zoomLayer = this.app.tree.zoomLayer as unknown as {
      x?: number;
      y?: number;
      scaleX?: number;
    };
    const scale = readZoomLayerScale(zoomLayer.scaleX, this.viewport.scale);
    const zoomX = readZoomLayerPosition(zoomLayer.x, -this.viewport.x * scale);
    const zoomY = readZoomLayerPosition(zoomLayer.y, -this.viewport.y * scale);
    this.viewport = { x: -zoomX / scale || 0, y: -zoomY / scale || 0, scale };
  }
}

function readZoomLayerScale(scaleX: unknown, fallback: number): number {
  return typeof scaleX === 'number' && Number.isFinite(scaleX) ? scaleX : fallback;
}

function readZoomLayerPosition(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}
