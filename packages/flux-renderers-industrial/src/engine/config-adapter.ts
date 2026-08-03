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

  constructor(
    private readonly engine: ScadaCanvasEngine,
    private readonly registry: TreeRegistry,
  ) {}

  get currentConfig(): ScadaConfig | null {
    return this.config;
  }

  /** 按 id 递归查找配置图元节点（含 group 子树；供 I8.2 视觉状态应用的实例属性解析）。 */
  getNode(id: string): ScadaSymbolNode | undefined {
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

  setConfig(config: ScadaConfig): void {
    this.config = config;
  }

  destroy(): void {
    this.registry.clear();
    if (this.root) {
      this.root.destroy();
      this.root = null;
    }
    this.config = null;
  }

  applyDiff(diff: ScadaConfigDiff): void {
    if (!this.root) {
      throw new Error('config adapter is not built');
    }
    for (const node of diff.added) {
      this.buildNode(node, this.root, undefined);
    }
    for (const id of diff.removed) {
      this.removeSymbol(id);
    }
    for (const update of diff.updated) {
      this.applyUpdate(update.id, update.patch);
    }
  }

  private buildNode(node: ScadaSymbolNode, parent: IGroup, parentId?: string): void {
    const isContainer = node.type === GROUP_CONTAINER_TYPE || (node.children?.length ?? 0) > 0;
    if (isContainer) {
      const group = new Group({
        name: node.id,
        x: node.x,
        y: node.y,
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
    for (const subtreeId of this.registry.subtreeIds(id)) {
      this.registry.remove(subtreeId);
    }
  }

  private applyUpdate(id: string, patch: Partial<ScadaSymbolNode>): void {
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
