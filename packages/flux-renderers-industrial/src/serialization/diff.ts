import type { ScadaConfig, ScadaConfigDiff, ScadaPointDeclaration, ScadaSymbolNode } from './config-types.js';

const SYMBOL_KEYS: Array<keyof ScadaSymbolNode> = [
  'id',
  'type',
  'x',
  'y',
  'width',
  'height',
  'rotation',
  'scale',
  'visible',
  'opacity',
  'fill',
  'stroke',
  'strokeWidth',
  'strokeDash',
  'dashOffset',
  'fillStyle',
  'shadow',
  'text',
  'textColor',
  'textSize',
  'custom',
  'bindings',
  'states',
  'animations',
  'events',
  'children',
];

const POINT_KEYS: Array<keyof ScadaPointDeclaration> = [
  'id',
  'source',
  'value',
  'expression',
  'flux',
  'scale',
  'deadband',
  'unit',
  'format',
  'init',
];

function valuesEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return a === b;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

export function diffScadaConfig(prev: ScadaConfig, next: ScadaConfig): ScadaConfigDiff {
  const prevById = new Map(prev.symbols.map((node) => [node.id, node]));
  const nextById = new Map(next.symbols.map((node) => [node.id, node]));

  const added: ScadaSymbolNode[] = [];
  const removed: string[] = [];
  const updated: Array<{ id: string; patch: Partial<ScadaSymbolNode> }> = [];

  for (const node of next.symbols) {
    if (!prevById.has(node.id)) added.push(node);
  }
  for (const node of prev.symbols) {
    if (!nextById.has(node.id)) removed.push(node.id);
  }
  for (const node of next.symbols) {
    const prevNode = prevById.get(node.id);
    if (!prevNode) continue;
    // 图元 type 变更（如 rect→ellipse 换形）：不产出 updated patch（applyUpdate 只能 set 旧 leafer 节点），
    // 改为 removed（旧 id）+ added（新节点），让 applyDiff 走 remove-then-rebuild 路径。
    if (prevNode.type !== node.type) {
      removed.push(node.id);
      added.push(node);
      continue;
    }
    const patch = {} as Record<string, unknown>;
    for (const key of SYMBOL_KEYS) {
      if (key === 'id' || key === 'type') continue;
      if (!valuesEqual(prevNode[key], node[key])) {
        // children 差异为 undefined（group 变叶子/子树删除）时产出显式空数组 patch，
        // 使 applyUpdate 走"移除全部子树"分支而非被 `!== undefined` 守卫跳过。
        patch[key] = key === 'children' && node[key] === undefined ? [] : node[key];
      }
    }
    if (Object.keys(patch).length > 0) updated.push({ id: node.id, patch: patch as Partial<ScadaSymbolNode> });
  }

  let variables: ScadaConfigDiff['variables'];
  if (prev.variables !== undefined || next.variables !== undefined) {
    const prevVars = prev.variables ?? [];
    const nextVars = next.variables ?? [];
    const prevVarById = new Map(prevVars.map((decl) => [decl.id, decl]));
    const nextVarById = new Map(nextVars.map((decl) => [decl.id, decl]));
    const varAdded: ScadaPointDeclaration[] = [];
    const varRemoved: string[] = [];
    const varUpdated: Array<{ id: string; patch: Partial<ScadaPointDeclaration> }> = [];
    for (const decl of nextVars) {
      if (!prevVarById.has(decl.id)) varAdded.push(decl);
    }
    for (const decl of prevVars) {
      if (!nextVarById.has(decl.id)) varRemoved.push(decl.id);
    }
    for (const decl of nextVars) {
      const prevDecl = prevVarById.get(decl.id);
      if (!prevDecl) continue;
      const patch = {} as Record<string, unknown>;
      for (const key of POINT_KEYS) {
        if (key === 'id') continue;
        if (!valuesEqual(prevDecl[key], decl[key])) {
          patch[key] = decl[key];
        }
      }
      if (Object.keys(patch).length > 0) {
        varUpdated.push({ id: decl.id, patch: patch as Partial<ScadaPointDeclaration> });
      }
    }
    if (varAdded.length > 0 || varRemoved.length > 0 || varUpdated.length > 0) {
      variables = { added: varAdded, removed: varRemoved, updated: varUpdated };
    }
  }

  return { added, removed, updated, variables };
}
