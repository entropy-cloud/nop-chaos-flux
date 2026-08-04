import { Group, type IGroup } from 'leafer-ui';
import type { ScadaCanvasEngine } from './scada-engine.js';
import type { TreeRegistry } from './tree-registry.js';
import { getScadaSymbolDefinition } from '../symbols/symbol-registry.js';
import { instantiateSymbol, toNodePatch } from '../symbols/symbol-factory.js';
import { resolveSymbolStyle } from '../symbols/style-resolver.js';
import type { LeafNode, ScadaSymbolProps } from '../symbols/symbol-types.js';
import type { ScadaConfig, ScadaConfigDiff, ScadaSymbolNode } from '../serialization/config-types.js';

const GROUP_CONTAINER_TYPE = 'scada-group';

export class ConfigAdapter {
  private root: Group | null = null;
  private config: ScadaConfig | null = null;
  /** id → 组态图元节点索引（构建时增量维护；getNode O(1)，I14.2 热路径优化——原线性扫描在 1 万点刷新场景每帧 10k 次全量遍历）。 */
  private nodeById = new Map<string, ScadaSymbolNode>();

  constructor(
    private readonly engine: ScadaCanvasEngine,
    private readonly registry: TreeRegistry,
  ) {}

  get currentConfig(): ScadaConfig | null {
    return this.config;
  }

  /** 按 id 递归查找配置图元节点（含 group 子树；供 I8.2 视觉状态应用的实例属性解析）。O(1) 索引命中，未命中回退线性扫描。 */
  getNode(id: string): ScadaSymbolNode | undefined {
    const hit = this.nodeById.get(id);
    if (hit !== undefined) return hit;
    if (!this.config) return undefined;
    return findNodeById(this.config.symbols, id);
  }

  build(config: ScadaConfig): void {
    this.destroy();
    this.config = config;
    this.root = new Group({ name: 'scada-config-tree' });
    for (const node of config.symbols) {
      this.buildNode(node, this.root, undefined);
    }
    this.engine.tree.add(this.root);
  }

  destroy(): void {
    this.registry.clear();
    this.nodeById.clear();
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }
    this.config = null;
  }

  applyDiff(diff: ScadaConfigDiff, nextConfig?: ScadaConfig): void {
    if (!this.root) {
      throw new Error('config adapter is not built');
    }
    // 处理顺序 removed → added → updated：同 id 图元若同时出现在 added 与 removed
    // （type 变更的 remove+add 语义），必须先销毁旧节点再构建新节点，否则 removeSymbol
    // 删除的是刚构建的新节点、旧 leafer 节点残留舞台。
    for (const id of diff.removed) {
      this.removeSymbol(id);
    }
    for (const node of diff.added) {
      this.buildNode(node, this.root, undefined);
    }
    for (const update of diff.updated) {
      this.applyUpdate(update.id, update.patch, nextConfig);
    }
    if (nextConfig) {
      this.config = nextConfig;
      // nodeById 校准：added 图元索引指向新 config 的节点对象（updated 由 applyUpdate 校准），
      // 保证 getNode/getSymbolDeclarations 与 nextConfig 单一事实源一致。
      for (const node of diff.added) {
        const fresh = findNodeById(nextConfig.symbols, node.id);
        if (fresh) this.nodeById.set(node.id, fresh);
      }
    }
  }

  private buildNode(node: ScadaSymbolNode, parent: IGroup, parentId?: string): void {
    this.nodeById.set(node.id, node);
    const isContainer = node.type === GROUP_CONTAINER_TYPE || (node.children?.length ?? 0) > 0;
    if (isContainer) {
      const group = new Group({
        name: node.id,
        // plan 2026-08-04-2242-2 Fix-4：省略 x/y 时默认 0（与 boundsOfNode/interaction-overlay 一致），
        // 避免 undefined 原样透传 leafer Group transform（与 bounds consumer 同型 NaN 源）。
        x: node.x ?? 0,
        y: node.y ?? 0,
        rotation: node.rotation,
        visible: node.visible,
        opacity: node.opacity,
        ...(node.scale !== undefined ? { scaleX: node.scale, scaleY: node.scale } : {}),
      });
      this.registry.add({ id: node.id, node: group, parentId });
      for (const child of node.children ?? []) {
        this.buildNode(child, group, node.id);
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
      engine: this.engine,
      config: { world: this.engine.getViewport() },
    });
    this.registry.add({ id: node.id, node: leafNode, parentId, definition });
    parent.add(leafNode);
  }

  private removeSymbol(id: string): void {
    const leaf = this.registry.get(id);
    if (!leaf) return;
    const parentNode = leaf.parentId ? this.registry.get(leaf.parentId)?.node : this.root;
    if (parentNode) (parentNode as IGroup).remove(leaf.node);
    this.nodeById.delete(id);
    for (const subtreeId of this.registry.subtreeIds(id)) {
      this.registry.remove(subtreeId);
      this.nodeById.delete(subtreeId);
    }
  }

  private applyUpdate(id: string, patch: Partial<ScadaSymbolNode>, nextConfig?: ScadaConfig): void {
    const leaf = this.registry.get(id);
    if (!leaf) return;
    const node = leaf.node as LeafNode;
    if (patch.children !== undefined) {
      for (const subtreeId of this.registry.subtreeIds(id)) {
        if (subtreeId === id) continue;
        const child = this.registry.get(subtreeId);
        if (child) {
          (node as IGroup).remove(child.node);
          this.registry.remove(subtreeId);
        }
        this.nodeById.delete(subtreeId);
      }
      for (const child of patch.children) {
        this.buildNode(child, node as IGroup, id);
      }
    }
    const attrPatch: Partial<ScadaSymbolProps> = { ...patch };
    delete (attrPatch as Partial<ScadaSymbolNode>).children;
    if (leaf.definition?.applyProps) {
      leaf.definition.applyProps(node, attrPatch as ScadaSymbolProps);
    } else {
      node.set(toNodePatch(node, attrPatch));
    }
    // nodeById 收敛：diff 应用后索引必须指向新 config 的节点（含 group 自身；重建的子树
    // 已由 buildNode 注册），否则 getNode/getSymbolDeclarations 读到过期声明（multi-audit P1-4）。
    if (nextConfig) {
      const fresh = findNodeById(nextConfig.symbols, id);
      if (fresh) this.nodeById.set(id, fresh);
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
