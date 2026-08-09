import { getScadaSymbolDefinition } from '../symbols/symbol-registry.js';
import { diffInstanceProps } from '../symbols/compound.js';
import type { ScadaConfig, ScadaSymbolNode } from './config-types.js';

/**
 * 序列化（I8.3 协同）：instance 节点输出实例属性覆盖集（diff 于 defaults，
 * design-symbols.md §4.3 最小覆盖集）；group 子树递归；type 未注册/无 defaults 的节点原样输出。
 */
export function serializeScadaConfig(config: ScadaConfig): string {
  const out: ScadaConfig = { ...config, version: 1, symbols: config.symbols.map(pruneInstanceNode) };
  return JSON.stringify(out, null, 2);
}

export function pruneInstanceNode(node: ScadaSymbolNode): ScadaSymbolNode {
  const children = node.children ? node.children.map(pruneInstanceNode) : undefined;
  if (node.type === 'scada-group') {
    return children ? { ...node, children } : node;
  }
  const definition = getScadaSymbolDefinition(node.type);
  if (!definition?.defaults) {
    return children ? { ...node, children } : node;
  }
  const overrides = diffInstanceProps(node, definition);
  const pruned: Partial<ScadaSymbolNode> = { id: node.id, type: node.type };
  if (children) pruned.children = children;
  return { ...pruned, ...overrides } as ScadaSymbolNode;
}
