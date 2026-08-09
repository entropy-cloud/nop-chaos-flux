import type { ScadaConfig, ScadaConfigDiff, ScadaPointDeclaration, ScadaSymbolNode } from './config-types.js';
import { deepEqual } from './equality.js';

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
  // plan 2026-08-09-0121-2 Workstream B 本轮-6：cornerRadius（round-rect per-instance 角半径）。
  'cornerRadius',
  'fillStyle',
  'shadow',
  'text',
  'textColor',
  'textSize',
  // plan 2026-08-08-0748-1 HCA5 Phase 2（P1-1 跨层 drift）：补 fontFamily/fontWeight/align
  // （文本样式三字段）。ScadaSymbolProps（symbol-types.ts:34,36,38）已声明、scada-text create 消费、
  // validate.ts:287 校验 fontFamily/fontWeight，config-types.ts ScadaSymbolNode 已补声明；此前机械遗漏
  // 使 diff 路径对三字段产出空 patch，host 同版本 config 改文本对齐/字体时 applyDiff 收不到 patch
  // （Failure Paths `text-style-ignored`，prior P1-1 `flow` 同类）。机械 lint 守卫 scripts/check-scada-symbol-keys.mjs
  // 防同类复发（断言 ScadaSymbolNode 字段 ∪ ScadaSymbolProps 字段 ⊆ SYMBOL_KEYS）。
  'fontFamily',
  'fontWeight',
  'align',
  // plan 2026-08-05-0653-2 Phase 2 (open P1-1)：补 'flow'（管道流动参数）。
  // 声明在 config-types.ts:78、validate.ts 校验、pipe-junction.ts create+applyProps 消费；
  // 此前机械遗漏导致 host 同版本 config 改 flow 时 diff 路径产出空 patch（Failure Paths `flow-toggle-ignored`）。
  'flow',
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
  // plan 2026-08-05-0653-4 C2：与 `compound.deepEquals` 共享 `serialization/equality.ts deepEqual`
  // （从本函数提取）。原 W5 修复（own-keys 递归 stable deep-equal，key 序不影响判等）行为不变；
  // 共享消除 compound 路径的同类隐患（第三方 registerScadaSymbol object-typed defaults key 序不同时
  // diffInstanceProps 产冗余 override，见 compound.test.ts Proof-C2）。详见 `equality.ts` 文档。
  return deepEqual(a, b);
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
