import { App, Group, type IGroup, type IAppConfig } from 'leafer-ui';
import '@leafer-in/viewport';
// 模块图隔离（design-architecture.md §4.4.1）：本 import 是 `@leafer-in/editor` 的**唯一消费侧**。
// import side-effect 注册 Editor 插件到 leafer-ui，使 `new App({ editor: {} })` 装配 Editor 实例
// （app.editor）。主入口 `src/index.ts` 不 import 本模块 → `@leafer-in/editor` 不进 runtime bundle。
import '@leafer-in/editor';
import { TreeRegistry, type RegistryLeaf } from '../../engine/tree-registry.js';
import {
  clampViewport,
  fit as fitViewport,
  center as centerViewport,
  setViewport as setViewportState,
  zoomAt as zoomAtState,
  viewportToWorld,
  worldToViewport,
  type Bounds,
  type Point,
  type Size,
  type ViewportState,
} from '../../engine/viewport.js';
import { getScadaSymbolDefinition } from '../../symbols/symbol-registry.js';
import { instantiateSymbol, toNodePatch } from '../../symbols/symbol-factory.js';
import { resolveSymbolStyle } from '../../symbols/style-resolver.js';
import type { LeafNode, ScadaSymbolProps } from '../../symbols/symbol-types.js';
import type {
  ScadaConfig,
  ScadaConfigDiff,
  ScadaSymbolNode,
} from '../../serialization/config-types.js';
import type { ScadaEditorMode } from '../editor-session.js';

const GROUP_CONTAINER_TYPE = 'scada-group';

/**
 * ScadaEditorEngine —— 编辑态画布引擎（design-architecture.md §4.3，方案 A）。
 *
 * **复用 runtime 面**（roadmap Cross-Cutting 平台能力复用，禁止重复实现）：
 * - 图元装配原语：`instantiateSymbol` + `resolveSymbolStyle` + `getScadaSymbolDefinition`（与 ConfigAdapter 同源）。
 * - 节点注册表：`TreeRegistry`（id→leaf 索引 + subtreeIds）。
 * - 视口数学：`viewport.ts` 函数族（fit/center/setViewport/zoomAt/clamp）。
 * - 序列化面：`serialization/{parse,validate,serialize,diff}.ts`（经 hooks 消费）。
 *
 * **编辑态专属**（不进 runtime）：
 * - leafer App 经 `new App({ editor: {} })` 装配 Editor 实例（app.editor，挂 sky 层独立 Group）。
 * - 图元 `editable:true` 注入（装配阶段，运行时态不入序列化——serialize.ts 恒不输出 editable）。
 * - 双态切换（edit ↔ preview：Editor 装配/卸载 + editable 注入/撤销）。
 */
export class ScadaEditorEngine {
  readonly app: App;
  readonly registry = new TreeRegistry();
  private readonly cid: number;
  private root: Group | null = null;
  private config: ScadaConfig | null = null;
  private viewport: ViewportState = { x: 0, y: 0, scale: 1 };
  private size: Size;
  private destroyed = false;
  private mode: ScadaEditorMode = 'edit';
  private static nextCid = 1;

  private constructor(private readonly options: {
    container: HTMLElement;
    width?: number;
    height?: number;
    cid?: number;
  }) {
    this.cid = options.cid ?? ScadaEditorEngine.nextCid++;
    const width = options.width ?? options.container.clientWidth ?? 0;
    const height = options.height ?? options.container.clientHeight ?? 0;
    this.size = { width, height };
    // leafer App 三层（design-architecture.md §4.3 + spike §1.3/§1.5）：
    // ground 背景 / tree 图元层（viewport 插件 + move:drag:'auto' + dragEmpty）/ sky 交互覆盖层。
    // `editor: {}` 装配 Editor 实例 → app.editor（挂 sky 层，方案 A：leafer Editor 内置 EditBox/EditSelect）。
    // M2 多选/框选（E7.2 Phase 3，spike 约束 #6）：selectArea 框选 + selectKeep 释放不清空选区。
    // `editor` 字段不在 leafer-ui IAppConfig 类型中（由 @leafer-in/editor 运行时注册），经类型断言透传。
    const appConfig = {
      view: options.container,
      width: options.width,
      height: options.height,
      ground: {},
      tree: { type: 'viewport', move: { drag: 'auto', dragEmpty: true } },
      sky: {},
      editor: { selectArea: true, selectKeep: true },
    } as unknown as IAppConfig;
    this.app = new App(appConfig);
  }

  static create(options: {
    container: HTMLElement;
    width?: number;
    height?: number;
    cid?: number;
  }): ScadaEditorEngine {
    return new ScadaEditorEngine(options);
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

  /** leafer Editor 实例（app.editor，由 `editor: {}` 装配）。 */
  get editor(): unknown {
    return (this.app as unknown as { editor?: unknown }).editor;
  }

  get currentMode(): ScadaEditorMode {
    return this.mode;
  }

  getCid(): number {
    return this.cid;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.registry.clear();
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }
    this.app.destroy();
    this.config = null;
  }

  getSize(): Size {
    return { ...this.size };
  }

  setSize(width: number, height: number): void {
    this.size = { width, height };
    this.app.resize({ width, height });
  }

  getViewport(): ViewportState {
    return { ...this.viewport };
  }

  setViewport(state: ViewportState): ViewportState {
    const next = clampViewport(setViewportState(this.viewport, state));
    this.applyViewportState(next);
    return next;
  }

  fit(bounds: Bounds, padding = 0): ViewportState {
    const next = fitViewport(bounds, this.size, padding);
    this.applyViewportState(next);
    return next;
  }

  center(bounds: Bounds): ViewportState {
    const next = centerViewport(this.viewport, bounds, this.size);
    this.applyViewportState(next);
    return next;
  }

  zoomAt(worldPoint: Point, factor: number): ViewportState {
    const next = zoomAtState(this.viewport, worldPoint, factor);
    this.applyViewportState(next);
    return next;
  }

  getWorldPoint(viewportPoint: Point): Point {
    return viewportToWorld(this.viewport, viewportPoint);
  }

  getViewportPoint(worldPoint: Point): Point {
    return worldToViewport(this.viewport, worldPoint);
  }

  private applyViewportState(next: ViewportState): void {
    const cur = this.viewport;
    const clamped = clampViewport(next);
    if (clamped.scale !== cur.scale) {
      this.app.tree.zoomLayer.scaleOfWorld({ x: 0, y: 0 }, clamped.scale / cur.scale);
    }
    if (clamped.x !== cur.x || clamped.y !== cur.y) {
      this.app.tree.zoomLayer.move({
        x: -(clamped.x - cur.x) * clamped.scale,
        y: -(clamped.y - cur.y) * clamped.scale,
      });
    }
    this.viewport = clamped;
  }

  /** 当前已装载的编辑态 config（working copy 投影；可能为空场景）。 */
  getCurrentConfig(): ScadaConfig | null {
    return this.config;
  }

  /**
   * 全量装载 config（编辑态构建，design-architecture.md §4.3）。
   *
   * 图元节点经 `editable:true` 注入（edit 模式，spike 约束 #1 + R5 Layer 1）。
   * preview 模式经 `setMode('preview')` 切换后 `editable:false`（无 Editor 装配）。
   */
  build(config: ScadaConfig): void {
    this.destroyRoot();
    this.registry.clear();
    this.config = config;
    this.root = new Group({ name: 'scada-editor-config-tree' });
    const editable = this.mode === 'edit';
    for (const node of config.symbols) {
      this.buildNode(node, this.root, undefined, editable);
    }
    this.app.tree.add(this.root);
  }

  /** 增量应用 diff（复用 serialization/diff 计算，engine 命令面 applyDiff 增量装配）。 */
  applyDiff(diff: ScadaConfigDiff, nextConfig?: ScadaConfig): void {
    if (!this.root) throw new Error('editor engine is not built');
    const editable = this.mode === 'edit';
    for (const id of diff.removed) {
      this.removeSymbol(id);
    }
    for (const node of diff.added) {
      this.buildNode(node, this.root, undefined, editable);
    }
    for (const update of diff.updated) {
      this.applyUpdate(update.id, update.patch);
    }
    if (nextConfig) this.config = nextConfig;
  }

  /** 按 id 获取图元节点（含 group 子树）。 */
  getConfigNode(id: string): ScadaSymbolNode | undefined {
    if (!this.config) return undefined;
    return findNodeById(this.config.symbols, id);
  }

  getSymbol(id: string): RegistryLeaf | undefined {
    return this.registry.get(id);
  }

  /** 经 leafer 节点反查 nodeId（与 runtime HitResolver 同模式——沿 parent 链上溯）。 */
  getSymbolByNode(node: object): string | undefined {
    return this.registry.findByNode(node);
  }

  getSymbols(): RegistryLeaf[] {
    return this.registry.getSymbols();
  }

  /** 读图元实例属性（与 runtime getSymbolProps 对称，经 fromNodeAttrs 反向映射）。 */
  getSymbolProps(id: string): Partial<ScadaSymbolProps> | undefined {
    const leaf = this.registry.get(id);
    if (!leaf) return undefined;
    const raw = leaf.node.get() as Record<string, unknown>;
    return raw as Partial<ScadaSymbolProps>;
  }

  /**
   * 切换编辑模式（design-architecture.md §4.2/§4.3，双态隔离 R5）。
   *
   * edit 模式：图元 editable:true 注入 + Editor 装配（app.editor.target 可选）。
   * preview 模式：图元 editable:false + Editor 清空选区（editor.cancel()，spike 约束 #4）+
   * InteractionOverlay 启用 → 等同运行态 scada-canvas（派发 symbol:* action 由适配层/hooks 装配）。
   */
  setMode(mode: ScadaEditorMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'preview') {
      this.clearEditorSelection();
      this.setSymbolsEditable(false);
    } else {
      this.setSymbolsEditable(true);
    }
  }

  /** 经 editor.cancel() 清空选区（spike 约束 #4，替代 editor.list = []）。 */
  clearEditorSelection(): void {
    const editor = this.editor as { cancel?: () => void; target?: unknown } | undefined;
    editor?.cancel?.();
  }

  /** 设置 Editor 选区目标（经 nodeId → leaf.node 解析）。 */
  setEditorTargets(nodes: LeafNode[]): void {
    const editor = this.editor as { target?: unknown; list?: unknown[] } | undefined;
    if (!editor) return;
    if (nodes.length === 0) {
      this.clearEditorSelection();
      return;
    }
    // editor.target = nodes 装配选区（leafer Editor API）。
    (editor as { target: unknown }).target = nodes.length === 1 ? nodes[0] : nodes;
  }

  private setSymbolsEditable(editable: boolean): void {
    for (const leaf of this.registry.getSymbols()) {
      const node = leaf.node as unknown as { editable?: boolean };
      // 仅叶子图元支持 editable（group 容器无编辑控制点）。
      if (leaf.definition) {
        node.editable = editable;
      }
    }
  }

  private destroyRoot(): void {
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }
  }

  private buildNode(
    node: ScadaSymbolNode,
    parent: IGroup,
    parentId: string | undefined,
    editable: boolean,
  ): void {
    const isContainer = node.type === GROUP_CONTAINER_TYPE;
    if (isContainer) {
      const group = new Group({
        name: node.id,
        x: node.x ?? 0,
        y: node.y ?? 0,
        rotation: node.rotation,
        visible: node.visible,
        opacity: node.opacity,
        ...(node.scale !== undefined ? { scaleX: node.scale, scaleY: node.scale } : {}),
      });
      this.registry.add({ id: node.id, node: group, parentId });
      for (const child of node.children ?? []) {
        this.buildNode(child, group, node.id, editable);
      }
      parent.add(group);
      return;
    }
    const definition = getScadaSymbolDefinition(node.type);
    if (!definition) {
      throw new Error(`unknown scada symbol type: ${node.type}`);
    }
    const props = resolveSymbolStyle(definition, node as ScadaSymbolProps);
    const leafNode = instantiateSymbol(node.type, {
      id: node.id,
      props,
      engine: this,
      config: { world: this.getViewport() },
    });
    // spike 约束 #1：edit 模式图元 editable:true 注入（运行时态，不入序列化）。
    (leafNode as unknown as { editable?: boolean }).editable = editable;
    this.registry.add({ id: node.id, node: leafNode, parentId, definition });
    parent.add(leafNode);
  }

  private removeSymbol(id: string): void {
    const leaf = this.registry.get(id);
    if (!leaf) return;
    const parentNode = leaf.parentId ? this.registry.get(leaf.parentId)?.node : this.root;
    if (parentNode) (parentNode as IGroup).remove(leaf.node);
    for (const subtreeId of this.registry.subtreeIds(id)) {
      this.registry.remove(subtreeId);
    }
  }

  private applyUpdate(id: string, patch: Partial<ScadaSymbolNode>): void {
    const leaf = this.registry.get(id);
    if (!leaf) return;
    const node = leaf.node as LeafNode;
    const attrPatch: Partial<ScadaSymbolProps> = { ...patch };
    delete (attrPatch as Partial<ScadaSymbolNode>).children;
    if (leaf.definition?.applyProps) {
      leaf.definition.applyProps(node, attrPatch as ScadaSymbolProps);
    } else {
      node.set(toNodePatch(node, attrPatch));
    }
  }
}

function findNodeById(nodes: ScadaSymbolNode[], id: string): ScadaSymbolNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return undefined;
}

export type { Bounds, Point, Size, ViewportState };
